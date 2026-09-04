import { Router } from "express";

import { getPriceComparisons, getShoppingRecommendations } from "../controllers/shoppingController.js";

const router = Router();

router.get("/recommendations", getShoppingRecommendations);
router.get("/compare", getPriceComparisons);

export default router;

