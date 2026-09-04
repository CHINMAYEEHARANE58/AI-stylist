import { Router } from "express";

import { getNotifications, getTrendInsights, getWardrobeInsights } from "../controllers/insightsController.js";

const router = Router();

router.get("/wardrobe", getWardrobeInsights);
router.get("/trends", getTrendInsights);
router.get("/notifications", getNotifications);

export default router;

