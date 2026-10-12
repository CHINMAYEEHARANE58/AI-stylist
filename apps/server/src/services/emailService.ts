import { env } from '../config/env';
import { logger } from '../config/logger';
import { AppError } from '../utils/AppError';

interface VerificationEmailInput {
  email: string;
  name: string;
  code: string;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  })[character] ?? character);
}

function verificationEmailHtml(name: string, code: string): string {
  return `<!doctype html><html><body style="background:#fafafa;color:#111;font-family:Arial,sans-serif;padding:32px">
    <main style="max-width:480px;margin:auto;background:#fff;border:1px solid #e8e8e8;border-radius:20px;padding:32px">
      <p style="font-size:12px;letter-spacing:1.6px;text-transform:uppercase;color:#777">ClosetAI</p>
      <h1 style="font-size:28px;margin:8px 0 16px">Verify your email</h1>
      <p>Hello ${escapeHtml(name)}, use this verification code to finish creating your account.</p>
      <p style="font-size:32px;font-weight:700;letter-spacing:8px;margin:28px 0">${code}</p>
      <p style="color:#666">This code expires in 10 minutes. If you did not create a ClosetAI account, you can safely ignore this email.</p>
    </main></body></html>`;
}

async function deliverEmail(input: { to: string; subject: string; html: string; developmentLog: string }): Promise<void> {
  if (env.RESEND_API_KEY && env.EMAIL_FROM) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env.EMAIL_FROM, to: [input.to], subject: input.subject, html: input.html }),
      signal: AbortSignal.timeout(10_000),
    });
    if (response.ok) {
      return;
    }
    logger.error('Email provider rejected the request.', { status: response.status });
    throw new AppError('We could not send an email. Please try again shortly.', 503, true, 'EMAIL_UNAVAILABLE');
  }
  if (env.NODE_ENV === 'development') {
    logger.info(`[DEV ONLY] ${input.developmentLog}`);
    return;
  }
  throw new AppError('Email delivery is not configured.', 503, true, 'EMAIL_UNAVAILABLE');
}

export async function sendVerificationCode(input: VerificationEmailInput): Promise<void> {
  return deliverEmail({
    to: input.email,
    subject: 'Your ClosetAI verification code',
    html: verificationEmailHtml(input.name, input.code),
    developmentLog: `Verification code for ${input.email}: ${input.code}`,
  });
}

/** Sends a code to the proposed address only; it never changes an account by itself. */
export async function sendEmailChangeCode(input: VerificationEmailInput): Promise<void> {
  const html = `<!doctype html><html><body style="background:#fafafa;color:#111;font-family:Arial,sans-serif;padding:32px"><main style="max-width:480px;margin:auto;background:#fff;border:1px solid #e8e8e8;border-radius:20px;padding:32px"><p style="font-size:12px;letter-spacing:1.6px;text-transform:uppercase;color:#777">ClosetAI</p><h1 style="font-size:28px;margin:8px 0 16px">Verify your new email</h1><p>Hello ${escapeHtml(input.name)}, use this code to confirm that you own this email address for your ClosetAI account.</p><p style="font-size:32px;font-weight:700;letter-spacing:8px;margin:28px 0">${input.code}</p><p style="color:#666">This code expires in 10 minutes. If you did not request this change, you can safely ignore this email.</p></main></body></html>`;
  return deliverEmail({
    to: input.email,
    subject: 'Confirm your new ClosetAI email address',
    html,
    developmentLog: `Email change code for ${input.email}: ${input.code}`,
  });
}

export async function sendPasswordResetLink(input: { email: string; name: string; resetUrl: string }): Promise<void> {
  const html = `<!doctype html><html><body style="background:#fafafa;color:#111;font-family:Arial,sans-serif;padding:32px"><main style="max-width:480px;margin:auto;background:#fff;border:1px solid #e8e8e8;border-radius:20px;padding:32px"><p style="font-size:12px;letter-spacing:1.6px;text-transform:uppercase;color:#777">ClosetAI</p><h1 style="font-size:28px;margin:8px 0 16px">Reset your password</h1><p>Hello ${escapeHtml(input.name)}, use the button below to set a new password. This link expires in one hour.</p><p style="margin:28px 0"><a href="${escapeHtml(input.resetUrl)}" style="display:inline-block;background:#111;color:#fff;padding:13px 20px;border-radius:12px;text-decoration:none">Reset password</a></p><p style="color:#666">If you did not request this, you can safely ignore this email.</p></main></body></html>`;
  return deliverEmail({ to: input.email, subject: 'Reset your ClosetAI password', html, developmentLog: `Password reset link for ${input.email}: ${input.resetUrl}` });
}
