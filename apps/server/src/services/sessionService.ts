import { createHash, randomBytes } from 'node:crypto';
import type { Response } from 'express';
import type { Prisma, Role } from '@prisma/client';
import { env } from '../config/env';
import { prisma } from '../config/db';
import { signToken } from '../utils/token';

export const ACCESS_COOKIE = 'closetai_access';
export const REFRESH_COOKIE = 'closetai_refresh';
export const OAUTH_STATE_COOKIE = 'closetai_oauth_state';
export const OAUTH_VERIFIER_COOKIE = 'closetai_oauth_verifier';

type SessionUser = { id: string; email: string; name: string; role: Role };

function roleForJwt(role: Role): 'user' | 'admin' {
  return role === 'ADMIN' ? 'admin' : 'user';
}

export function authCookieOptions(httpOnly = true) {
  return {
    httpOnly,
    secure: env.NODE_ENV === 'production' || env.COOKIE_SECURE,
    sameSite: 'lax' as const,
    path: '/',
  };
}

export function hashOpaqueToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function createOpaqueToken(): string {
  return randomBytes(48).toString('base64url');
}

export async function createRefreshSession(
  user: SessionUser,
  userAgent?: string,
  ip?: string,
  client: Pick<Prisma.TransactionClient, 'refreshSession'> | typeof prisma = prisma,
) {
  const refreshToken = createOpaqueToken();
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);
  const session = await client.refreshSession.create({
    data: {
      userId: user.id,
      tokenHash: hashOpaqueToken(refreshToken),
      expiresAt,
      userAgent: userAgent?.slice(0, 512),
      ipHash: ip ? hashOpaqueToken(ip) : undefined,
    },
  });
  return { refreshToken, expiresAt, session };
}

export function setAuthCookies(res: Response, user: SessionUser, refreshToken: string, refreshExpiresAt: Date): void {
  const accessToken = signToken({ id: user.id, email: user.email, name: user.name, role: roleForJwt(user.role) });
  res.cookie(ACCESS_COOKIE, accessToken, { ...authCookieOptions(), maxAge: 15 * 60 * 1000 });
  res.cookie(REFRESH_COOKIE, refreshToken, {
    ...authCookieOptions(),
    maxAge: Math.max(0, refreshExpiresAt.getTime() - Date.now()),
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, authCookieOptions());
  res.clearCookie(REFRESH_COOKIE, authCookieOptions());
}

export function setOAuthStateCookie(res: Response, state: string, codeVerifier: string): void {
  res.cookie(OAUTH_STATE_COOKIE, state, { ...authCookieOptions(), maxAge: 10 * 60 * 1000 });
  res.cookie(OAUTH_VERIFIER_COOKIE, codeVerifier, { ...authCookieOptions(), maxAge: 10 * 60 * 1000 });
}

export function clearOAuthStateCookie(res: Response): void {
  res.clearCookie(OAUTH_STATE_COOKIE, authCookieOptions());
  res.clearCookie(OAUTH_VERIFIER_COOKIE, authCookieOptions());
}
