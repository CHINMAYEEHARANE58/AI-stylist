import bcrypt from "bcryptjs";

import { signToken } from "../utils/token.js";

export async function signup(req, res) {
  const { name, email, password, profile } = req.body;
  const passwordHash = await bcrypt.hash(password, 10);

  return res.status(201).json({
    message: "User created successfully.",
    token: signToken({ email, name }),
    user: {
      id: "demo-user",
      name,
      email,
      passwordHash,
      profile,
    },
  });
}

export async function login(req, res) {
  const { email } = req.body;

  return res.json({
    message: "Login successful.",
    token: signToken({ email }),
    user: {
      id: "demo-user",
      name: "ClosetAI Demo User",
      email,
    },
  });
}

export async function forgotPassword(req, res) {
  return res.json({
    message: `Password reset link queued for ${req.body.email}.`,
  });
}

export async function googleAuth(req, res) {
  return res.json({
    message: "Google authentication placeholder endpoint.",
    googleClientIdConfigured: Boolean(process.env.GOOGLE_CLIENT_SECRET),
  });
}

