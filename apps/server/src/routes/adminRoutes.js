import { Router } from "express";

import { getAdminOverview } from "../controllers/adminController.js";

const router = Router();

router.get("/overview", getAdminOverview);

export default router;

