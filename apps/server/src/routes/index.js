import { Router } from "express";

import adminRoutes from "./adminRoutes.js";
import authRoutes from "./authRoutes.js";
import insightsRoutes from "./insightsRoutes.js";
import outfitRoutes from "./outfitRoutes.js";
import pinterestRoutes from "./pinterestRoutes.js";
import profileRoutes from "./profileRoutes.js";
import shoppingRoutes from "./shoppingRoutes.js";
import stylistRoutes from "./stylistRoutes.js";
import wardrobeRoutes from "./wardrobeRoutes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/wardrobe", wardrobeRoutes);
router.use("/outfits", outfitRoutes);
router.use("/stylist", stylistRoutes);
router.use("/pinterest", pinterestRoutes);
router.use("/shopping", shoppingRoutes);
router.use("/insights", insightsRoutes);
router.use("/profile", profileRoutes);
router.use("/admin", adminRoutes);

router.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "ClosetAI API" });
});

export default router;
