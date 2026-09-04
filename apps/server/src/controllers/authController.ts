import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import type { Request, Response } from 'express';
import { prisma } from '../config/db';
import { ApiResponse } from '../utils/ApiResponse';
import { AppError } from '../utils/AppError';
import {
  clearAuthCookies, createRefreshSession, hashOpaqueToken,
  REFRESH_COOKIE, setAuthCookies,
} from '../services/sessionService';

function presentUser(user: { id: string; email: string; role: 'USER' | 'ADMIN'; profile: { firstName: string; lastName: string | null; imageUrl: string | null } | null }) {
  return {
    id: user.id,
    email: user.email,
    role: user.role.toLowerCase(),
    name: [user.profile?.firstName, user.profile?.lastName].filter(Boolean).join(' ') || user.email,
    profile: user.profile,
  };
}

function userAgent(req: Request): string | undefined {
  return typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined;
}

export async function signup(req: Request, res: Response): Promise<void> {
  const { name, email, password, profile } = req.body as {
    name: string;
    email: string;
    password: string;
    profile?: Record<string, unknown>;
  };

  const normalizedEmail = email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail }, select: { id: true } });
  if (existing) throw new AppError('Unable to create this account.', 409);

  const [firstName, ...lastNameParts] = name.trim().split(/\s+/);
  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      passwordHash: await bcrypt.hash(password, 12),
      profile: {
        create: {
          firstName,
          lastName: lastNameParts.join(' ') || undefined,
          ...(profile ?? {}),
        },
      },
      preferences: { create: {} },
      wardrobe: { create: {} },
    },
    include: { profile: true },
  });
  const safeUser = presentUser(user);
  const session = await createRefreshSession({ ...safeUser, role: user.role }, userAgent(req), req.ip);
  setAuthCookies(res, { ...safeUser, role: user.role }, session.refreshToken, session.expiresAt);
  ApiResponse.created(res, { user: safeUser }, 'Account created successfully.');
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
  const safeUser = presentUser(user);
  const session = await createRefreshSession({ ...safeUser, role: user.role }, userAgent(req), req.ip);
  setAuthCookies(res, { ...safeUser, role: user.role }, session.refreshToken, session.expiresAt);
  ApiResponse.success(res, { user: safeUser }, 'Login successful.');
}

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  const { email } = req.body as { email: string };
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() }, select: { id: true } });
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
    // Email delivery belongs to a provider adapter. Never log or return resetToken.
  }
  ApiResponse.success(res, null, 'If an account exists, a password reset link has been sent.');
}

export async function googleAuth(_req: Request, res: Response): Promise<void> {
  ApiResponse.success(res, {
    googleConfigured: Boolean(process.env.GOOGLE_CLIENT_SECRET),
  }, 'Google auth placeholder — configure OAuth credentials to enable.');
}

export async function getMe(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new AppError('Not authenticated.', 401);
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: { profile: true },
  });
  if (!user) throw new AppError('Not authenticated.', 401);
  ApiResponse.success(res, { user: presentUser(user) }, 'Current user retrieved.');
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
  if (!token) throw new AppError('Session expired. Please log in again.', 401);
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
    const refreshed = await createRefreshSession({ ...safeUser, role: current.user.role }, userAgent(req), req.ip);
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
  if (!record || record.usedAt || record.expiresAt <= new Date()) throw new AppError('This password reset link is invalid or expired.', 400);
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash: await bcrypt.hash(password, 12) } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.refreshSession.updateMany({ where: { userId: record.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
  ]);
  clearAuthCookies(res);
  ApiResponse.success(res, null, 'Password reset successfully. Please log in.');
}
