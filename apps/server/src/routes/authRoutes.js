import { Router } from "express";

import { forgotPassword, googleAuth, login, signup } from "../controllers/authController.js";

const router = Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/google", googleAuth);

export default router;

