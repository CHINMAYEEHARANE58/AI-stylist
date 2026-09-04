import jwt from "jsonwebtoken";

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authorization token missing." });
  }

  try {
    const token = authHeader.replace("Bearer ", "");
    const secret = process.env.JWT_SECRET || "dev-secret";
    req.user = jwt.verify(token, secret);
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token.", error: error.message });
  }
}

