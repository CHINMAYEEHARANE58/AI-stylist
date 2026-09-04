import { Router } from "express";

import { chatWithStylist, rateOutfit, shareOutfit } from "../controllers/stylistController.js";

const router = Router();

router.post("/chat", chatWithStylist);
router.post("/rate-outfit", rateOutfit);
router.post("/share-outfit", shareOutfit);

export default router;

