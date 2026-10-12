import { createHmac, randomInt } from 'node:crypto';
import { prisma } from '../config/db';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';
import { sendEmailChangeCode } from './emailService';

const OTP_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

function hashEmailChangeCode(userId: string, email: string, code: string): string {
  return createHmac('sha256', env.JWT_SECRET).update(`email-change:${userId}:${email}:${code}`).digest('hex');
}

function createCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

export async function requestEmailChange(input: { userId: string; name: string; newEmail: string }): Promise<void> {
  const now = new Date();
  const latest = await prisma.emailChangeRequest.findFirst({
    where: { userId: input.userId, newEmail: input.newEmail, usedAt: null, supersededAt: null },
    orderBy: { createdAt: 'desc' },
  });
  if (latest && now.getTime() - latest.createdAt.getTime() < RESEND_COOLDOWN_MS) {
    throw new AppError('Please wait before requesting another verification code.', 429, true, 'EMAIL_CHANGE_COOLDOWN');
  }

  const code = createCode();
  await prisma.$transaction([
    prisma.emailChangeRequest.updateMany({
      where: { userId: input.userId, usedAt: null, supersededAt: null },
      data: { supersededAt: now },
    }),
    prisma.emailChangeRequest.create({
      data: {
        userId: input.userId,
        newEmail: input.newEmail,
        tokenHash: hashEmailChangeCode(input.userId, input.newEmail, code),
        expiresAt: new Date(now.getTime() + OTP_TTL_MS),
      },
    }),
  ]);
  await sendEmailChangeCode({ email: input.newEmail, name: input.name, code });
}

export async function verifyEmailChange(input: { userId: string; newEmail: string; code: string }): Promise<void> {
  const request = await prisma.emailChangeRequest.findFirst({
    where: { userId: input.userId, newEmail: input.newEmail, usedAt: null, supersededAt: null },
    orderBy: { createdAt: 'desc' },
  });
  if (!request || request.expiresAt <= new Date()) {
    throw new AppError('Your email-change code has expired. Request a new one.', 400, true, 'EMAIL_CHANGE_EXPIRED');
  }
  if (request.attemptCount >= MAX_ATTEMPTS) {
    throw new AppError('Too many invalid attempts. Request a new code.', 429, true, 'EMAIL_CHANGE_ATTEMPTS_EXCEEDED');
  }
  if (hashEmailChangeCode(input.userId, input.newEmail, input.code) !== request.tokenHash) {
    await prisma.emailChangeRequest.update({ where: { id: request.id }, data: { attemptCount: { increment: 1 } } });
    throw new AppError('Invalid email-change code.', 400, true, 'INVALID_EMAIL_CHANGE_CODE');
  }

  const existing = await prisma.user.findUnique({ where: { email: input.newEmail }, select: { id: true } });
  if (existing && existing.id !== input.userId) {
    throw new AppError('That email address is already in use.', 409, true, 'EMAIL_ALREADY_IN_USE');
  }
  const now = new Date();
  await prisma.$transaction([
    prisma.emailChangeRequest.update({ where: { id: request.id }, data: { usedAt: now } }),
    prisma.user.update({ where: { id: input.userId }, data: { email: input.newEmail, emailVerifiedAt: now } }),
    prisma.refreshSession.updateMany({ where: { userId: input.userId, revokedAt: null }, data: { revokedAt: now } }),
  ]);
}
