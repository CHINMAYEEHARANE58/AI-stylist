import { createHmac, randomInt } from 'node:crypto';
import { prisma } from '../config/db';
import { AppError } from '../utils/AppError';
import { env } from '../config/env';
import { sendVerificationCode } from './emailService';

const OTP_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

function hashVerificationCode(userId: string, code: string): string {
  return createHmac('sha256', env.JWT_SECRET).update(`${userId}:${code}`).digest('hex');
}

function generateCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

export async function issueVerificationCode(user: { id: string; email: string; name: string }, enforceCooldown = true): Promise<void> {
  const now = new Date();
  const latest = await prisma.emailVerificationChallenge.findFirst({
    where: { userId: user.id, usedAt: null, supersededAt: null },
    orderBy: { createdAt: 'desc' },
  });
  if (enforceCooldown && latest && now.getTime() - latest.createdAt.getTime() < RESEND_COOLDOWN_MS) {
    throw new AppError('Please wait before requesting another verification code.', 429, true, 'VERIFICATION_COOLDOWN');
  }

  const code = generateCode();
  await prisma.$transaction([
    prisma.emailVerificationChallenge.updateMany({
      where: { userId: user.id, usedAt: null, supersededAt: null },
      data: { supersededAt: now },
    }),
    prisma.emailVerificationChallenge.create({
      data: {
        userId: user.id,
        tokenHash: hashVerificationCode(user.id, code),
        expiresAt: new Date(now.getTime() + OTP_TTL_MS),
      },
    }),
  ]);
  await sendVerificationCode({ email: user.email, name: user.name, code });
}

export async function verifyEmailCode(email: string, code: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    include: { profile: true },
  });
  if (!user || user.emailVerifiedAt) {
    throw new AppError('Invalid or expired verification code.', 400, true, 'INVALID_VERIFICATION_CODE');
  }

  const challenge = await prisma.emailVerificationChallenge.findFirst({
    where: { userId: user.id, usedAt: null, supersededAt: null },
    orderBy: { createdAt: 'desc' },
  });
  if (!challenge || challenge.expiresAt <= new Date()) {
    throw new AppError('Your verification code has expired. Request a new one.', 400, true, 'VERIFICATION_EXPIRED');
  }
  if (challenge.attemptCount >= MAX_ATTEMPTS) {
    throw new AppError('Too many invalid verification attempts. Request a new code.', 429, true, 'VERIFICATION_ATTEMPTS_EXCEEDED');
  }
  if (hashVerificationCode(user.id, code) !== challenge.tokenHash) {
    await prisma.emailVerificationChallenge.update({ where: { id: challenge.id }, data: { attemptCount: { increment: 1 } } });
    throw new AppError('Invalid verification code.', 400, true, 'INVALID_VERIFICATION_CODE');
  }

  const now = new Date();
  const [, verified] = await prisma.$transaction([
    prisma.emailVerificationChallenge.update({ where: { id: challenge.id }, data: { usedAt: now, verifiedAt: now } }),
    prisma.user.update({ where: { id: user.id }, data: { emailVerifiedAt: now }, include: { profile: true } }),
  ]);
  return verified;
}
