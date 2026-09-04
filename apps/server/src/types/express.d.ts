import type { JwtPayload } from 'jsonwebtoken';

export interface AuthPayload extends JwtPayload {
  id: string;
  email: string;
  name: string;
  role?: 'user' | 'admin';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}
