import bcrypt from 'bcryptjs';
import type { Request, Response } from 'express';
import { ApiResponse } from '../utils/ApiResponse';
import { signToken } from '../utils/token';

export async function signup(req: Request, res: Response): Promise<void> {
  const { name, email, password, profile } = req.body as {
    name: string;
    email: string;
    password: string;
    profile?: Record<string, unknown>;
  };

  const passwordHash = await bcrypt.hash(password, 12);

  const token = signToken({ id: 'demo-user', email, name, role: 'user' });

  ApiResponse.created(res, {
    token,
    user: { id: 'demo-user', name, email, passwordHash, profile },
  }, 'Account created successfully.');
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email } = req.body as { email: string; password: string };

  const token = signToken({ id: 'demo-user', email, name: 'ClosetAI User', role: 'user' });

  ApiResponse.success(res, {
    token,
    user: { id: 'demo-user', name: 'ClosetAI User', email },
  }, 'Login successful.');
}

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  const { email } = req.body as { email: string };
  ApiResponse.success(res, null, `Password reset link sent to ${email}.`);
}

export async function googleAuth(_req: Request, res: Response): Promise<void> {
  ApiResponse.success(res, {
    googleConfigured: Boolean(process.env.GOOGLE_CLIENT_SECRET),
  }, 'Google auth placeholder — configure OAuth credentials to enable.');
}

export async function getMe(req: Request, res: Response): Promise<void> {
  ApiResponse.success(res, req.user ?? null, 'Current user retrieved.');
}
