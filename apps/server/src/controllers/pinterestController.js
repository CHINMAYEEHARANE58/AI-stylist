import { recreatePinterestLook } from "../services/aiService.js";

export async function analyzePinterestLook(req, res) {
  const result = await recreatePinterestLook(req.body);
  return res.json(result);
}

