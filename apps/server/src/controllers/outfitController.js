import { generatedOutfits } from "../data/mockData.js";
import { generateOutfits } from "../services/aiService.js";
import { getWeatherStylingContext } from "../services/weatherService.js";

export async function getSavedOutfits(req, res) {
  return res.json({ outfits: generatedOutfits });
}

export async function generateOutfitRecommendations(req, res) {
  const outfits = await generateOutfits(req.body);
  return res.json({ outfits });
}

export async function styleSingleItem(req, res) {
  const { itemName = "selected item" } = req.body;

  return res.json({
    itemName,
    looks: [
      { aesthetic: "Casual", explanation: `${itemName} works with soft denim and low-profile sneakers.` },
      { aesthetic: "Elegant", explanation: `${itemName} pairs well with luminous basics and refined accessories.` },
      { aesthetic: "Office", explanation: `${itemName} anchors a smart silhouette when balanced with tailoring.` },
      { aesthetic: "Party", explanation: `${itemName} gains energy with shine, contrast, and sharper accessories.` },
    ],
  });
}

export async function getWeatherStyling(req, res) {
  const context = await getWeatherStylingContext(req.query.city);
  return res.json(context);
}

