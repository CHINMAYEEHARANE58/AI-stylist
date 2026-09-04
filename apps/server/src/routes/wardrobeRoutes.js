import { Router } from "express";

import { analyzeWardrobeImage, createWardrobeItem, getWardrobe } from "../controllers/wardrobeController.js";

const router = Router();

router.get("/", getWardrobe);
router.post("/", createWardrobeItem);
router.post("/analyze", analyzeWardrobeImage);

export default router;

