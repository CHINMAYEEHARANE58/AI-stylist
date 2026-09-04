import { Router } from "express";

import { analyzePinterestLook } from "../controllers/pinterestController.js";

const router = Router();

router.post("/analyze", analyzePinterestLook);

export default router;

