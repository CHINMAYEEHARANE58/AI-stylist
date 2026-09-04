import { Router } from "express";

import {
  generateOutfitRecommendations,
  getSavedOutfits,
  getWeatherStyling,
  styleSingleItem,
} from "../controllers/outfitController.js";

const router = Router();

router.get("/", getSavedOutfits);
router.post("/generate", generateOutfitRecommendations);
router.post("/style-item", styleSingleItem);
router.get("/weather", getWeatherStyling);

export default router;

