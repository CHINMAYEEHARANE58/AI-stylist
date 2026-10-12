import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import type { Request, Response } from 'express';
import { prisma } from '../config/db';
import { ApiResponse } from '../utils/ApiResponse';
import { AppError } from '../utils/AppError';
import {
  clearAuthCookies, createRefreshSession, hashOpaqueToken,
  clearOAuthStateCookie, OAUTH_STATE_COOKIE, OAUTH_VERIFIER_COOKIE, REFRESH_COOKIE, setAuthCookies, setOAuthStateCookie,
} from '../services/sessionService';
import { env } from '../config/env';
import { CodeChallengeMethod, OAuth2Client } from 'google-auth-library';
import { issueVerificationCode, verifyEmailCode } from '../services/verificationService';
import { sendPasswordResetLink } from '../services/emailService';

function presentUser(user: {
  id: string;
  email: string;
  role: 'USER' | 'ADMIN';
  emailVerifiedAt: Date | null;
  profile: { firstName: string; lastName: string | null; imageUrl: string | null } | null;
}) {
  return {
    id: user.id,
    email: user.email,
    role: user.role.toLowerCase(),
    name: [user.profile?.firstName, user.profile?.lastName].filter(Boolean).join(' ') || user.email,
    profile: user.profile,
    emailVerified: Boolean(user.emailVerifiedAt),
  };
}

function userAgent(req: Request): string | undefined {
  return typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined;
}

export async function signup(req: Request, res: Response): Promise<void> {
  const { name, email, password, aesthetics, sizes } = req.body as {
    name: string;
    email: string;
    password: string;
    aesthetics?: string[];
    sizes?: string;
  };

  const normalizedEmail = email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail }, select: { id: true } });
  if (existing) {
    throw new AppError('Unable to create this account.', 409);
  }

  const [firstName, ...lastNameParts] = name.trim().split(/\s+/);
  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      passwordHash: await bcrypt.hash(password, 12),
      profile: {
        create: {
          firstName,
          lastName: lastNameParts.join(' ') || undefined,
          clothingSizes: sizes ? { general: sizes } : undefined,
        },
      },
      preferences: { create: { preferredAesthetics: aesthetics ?? [] } },
      wardrobe: { create: {} },
    },
    include: { profile: true },
  });
  const safeUser = presentUser(user);
  await issueVerificationCode({ id: user.id, email: user.email, name: safeUser.name }, false);
  ApiResponse.created(res, { email: user.email, verificationRequired: true }, 'Verification code sent. Check your email to finish creating your account.');
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as { email: string; password: string };
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    include: { profile: true },
  });
  if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new AppError('Invalid email or password.', 401);
  }
  if (!user.emailVerifiedAt) {
    throw new AppError('Please verify your email before continuing.', 403, true, 'EMAIL_UNVERIFIED');
  }
  const safeUser = presentUser(user);
  const session = await createRefreshSession({ ...safeUser, role: user.role }, userAgent(req), req.ip);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  setAuthCookies(res, { ...safeUser, role: user.role }, session.refreshToken, session.expiresAt);
  ApiResponse.success(res, { user: safeUser }, 'Login successful.');
}

export async function verifyEmail(req: Request, res: Response): Promise<void> {
  const { email, code } = req.body as { email: string; code: string };
  const user = await verifyEmailCode(email, code);
  const safeUser = presentUser(user);
  const session = await createRefreshSession({ ...safeUser, role: user.role }, userAgent(req), req.ip);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  setAuthCookies(res, { ...safeUser, role: user.role }, session.refreshToken, session.expiresAt);
  ApiResponse.success(res, { user: safeUser }, 'Email verified successfully.');
}

export async function resendVerification(req: Request, res: Response): Promise<void> {
  const { email } = req.body as { email: string };
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    include: { profile: true },
  });
  if (user && !user.emailVerifiedAt) {
    const safeUser = presentUser(user);
    await issueVerificationCode({ id: user.id, email: user.email, name: safeUser.name });
  }
  ApiResponse.success(res, null, 'If an unverified account exists, a verification code has been sent.');
}

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  const { email } = req.body as { email: string };
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() }, include: { profile: true } });
  if (user) {
    const resetToken = randomBytes(32).toString('base64url');
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashOpaqueToken(resetToken),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    const safeUser = presentUser(user);
    await sendPasswordResetLink({
      email: user.email,
      name: safeUser.name,
      resetUrl: `${env.FRONTEND_URL}/reset-password?token=${encodeURIComponent(resetToken)}`,
    });
  }
  ApiResponse.success(res, null, 'If an account exists, a password reset link has been sent.');
}

export async function googleAuth(_req: Request, res: Response): Promise<void> {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_CALLBACK_URL) {
    throw new AppError('Google sign-in is not configured.', 503, true, 'GOOGLE_NOT_CONFIGURED');
  }
  const state = randomBytes(32).toString('base64url');
  const codeVerifier = randomBytes(64).toString('base64url');
  const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');
  setOAuthStateCookie(res, state, codeVerifier);
  const client = new OAuth2Client(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, env.GOOGLE_CALLBACK_URL);
  res.redirect(client.generateAuthUrl({
    access_type: 'offline',
    scope: ['openid', 'email', 'profile'],
    prompt: 'select_account',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: CodeChallengeMethod.S256,
  }));
}

export async function googleCallback(req: Request, res: Response): Promise<void> {
  const code = typeof req.query.code === 'string' ? req.query.code : undefined;
  const state = typeof req.query.state === 'string' ? req.query.state : undefined;
  const storedState = req.cookies?.[OAUTH_STATE_COOKIE] as string | undefined;
  const codeVerifier = req.cookies?.[OAUTH_VERIFIER_COOKIE] as string | undefined;
  clearOAuthStateCookie(res);
  if (!code || !state || !storedState || !codeVerifier || state !== storedState) {
    res.redirect(`${env.FRONTEND_URL}/login?error=google_signin_failed`);
    return;
  }
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_CALLBACK_URL) {
    res.redirect(`${env.FRONTEND_URL}/login?error=google_signin_unavailable`);
    return;
  }

  try {
    const client = new OAuth2Client(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, env.GOOGLE_CALLBACK_URL);
    const { tokens } = await client.getToken({ code, codeVerifier });
    if (!tokens.id_token) {
      throw new Error('Google did not return an ID token.');
    }
    const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: env.GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email || !payload.email_verified) {
      throw new Error('Google account email is not verified.');
    }

    const email = payload.email.trim().toLowerCase();
    const existingAccount = await prisma.authAccount.findUnique({
      where: { provider_providerAccountId: { provider: 'GOOGLE', providerAccountId: payload.sub } },
      include: { user: { include: { profile: true } } },
    });
    let user = existingAccount?.user;
    if (!user) {
      const byEmail = await prisma.user.findUnique({
        where: { email },
        include: {
          profile: true,
          authAccounts: { where: { provider: 'GOOGLE' }, select: { providerAccountId: true } },
        },
      });
      if (byEmail) {
        const linkedGoogleAccount = byEmail.authAccounts[0];
        if (
          (byEmail.googleSubject && byEmail.googleSubject !== payload.sub)
          || (linkedGoogleAccount && linkedGoogleAccount.providerAccountId !== payload.sub)
        ) {
          throw new Error('A different Google account is already linked to this email.');
        }
        user = await prisma.user.update({
          where: { id: byEmail.id },
          data: {
            emailVerifiedAt: byEmail.emailVerifiedAt ?? new Date(),
            googleSubject: byEmail.googleSubject ?? payload.sub,
            ...(linkedGoogleAccount
              ? {}
              : { authAccounts: { create: { provider: 'GOOGLE', providerAccountId: payload.sub } } }),
          },
          include: { profile: true },
        });
      } else {
        const [firstName, ...lastName] = (payload.name || email.split('@')[0]).trim().split(/\s+/);
        user = await prisma.user.create({
          data: {
            email,
            emailVerifiedAt: new Date(),
            googleSubject: payload.sub,
            profile: { create: { firstName, lastName: lastName.join(' ') || undefined, imageUrl: payload.picture } },
            preferences: { create: {} },
            wardrobe: { create: {} },
            authAccounts: { create: { provider: 'GOOGLE', providerAccountId: payload.sub } },
          },
          include: { profile: true },
        });
      }
    }
    const safeUser = presentUser(user);
    const session = await createRefreshSession({ ...safeUser, role: user.role }, userAgent(req), req.ip);
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    setAuthCookies(res, { ...safeUser, role: user.role }, session.refreshToken, session.expiresAt);
    res.redirect(`${env.FRONTEND_URL}/dashboard`);
  } catch {
    res.redirect(`${env.FRONTEND_URL}/login?error=google_signin_failed`);
  }
}

export async function getMe(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new AppError('Not authenticated.', 401);
  }
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: { profile: true },
  });
  if (!user) {
    throw new AppError('Not authenticated.', 401);
  }
  ApiResponse.success(res, { user: presentUser(user) }, 'Current user retrieved.');
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
  if (!token) {
    throw new AppError('Session expired. Please log in again.', 401);
  }
  const current = await prisma.refreshSession.findUnique({
    where: { tokenHash: hashOpaqueToken(token) },
    include: { user: { include: { profile: true } } },
  });
  if (!current || current.revokedAt || current.expiresAt <= new Date()) {
    clearAuthCookies(res);
    throw new AppError('Session expired. Please log in again.', 401);
  }
  const safeUser = presentUser(current.user);
  const next = await prisma.$transaction(async (tx) => {
    const refreshed = await createRefreshSession({ ...safeUser, role: current.user.role }, userAgent(req), req.ip, tx);
    await tx.refreshSession.update({ where: { id: current.id }, data: { revokedAt: new Date(), replacedBy: refreshed.session.id } });
    return refreshed;
  });
  setAuthCookies(res, { ...safeUser, role: current.user.role }, next.refreshToken, next.expiresAt);
  ApiResponse.success(res, { user: safeUser }, 'Session refreshed.');
}

export async function logout(req: Request, res: Response): Promise<void> {
  const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
  if (token) {
    await prisma.refreshSession.updateMany({ where: { tokenHash: hashOpaqueToken(token), revokedAt: null }, data: { revokedAt: new Date() } });
  }
  clearAuthCookies(res);
  ApiResponse.success(res, null, 'Logged out successfully.');
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  const { token, password } = req.body as { token: string; password: string };
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashOpaqueToken(token) } });
  if (!record || record.usedAt || record.expiresAt <= new Date()) {
    throw new AppError('This password reset link is invalid or expired.', 400);
  }
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash: await bcrypt.hash(password, 12) } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.refreshSession.updateMany({ where: { userId: record.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
  ]);
  clearAuthCookies(res);
  ApiResponse.success(res, null, 'Password reset successfully. Please log in.');
}
