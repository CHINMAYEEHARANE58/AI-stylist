import { wardrobeItems } from "../data/mockData.js";
import { tagWardrobeItem } from "../services/aiService.js";

const sessionWardrobeItems = [...wardrobeItems];

export async function getWardrobe(req, res) {
  return res.json({
    items: sessionWardrobeItems,
    total: sessionWardrobeItems.length,
  });
}

export async function createWardrobeItem(req, res) {
  const aiTags = await tagWardrobeItem(req.body.name);
  const item = {
    id: `item-${Date.now()}`,
    image: "/wardrobe-item-1.svg",
    color: aiTags.colors[0],
    type: aiTags.clothingType,
    style: aiTags.aesthetic,
    ...req.body,
    aiTags,
  };

  sessionWardrobeItems.unshift(item);

  return res.status(201).json({
    message: "Wardrobe item created.",
    item,
  });
}

export async function analyzeWardrobeImage(req, res) {
  return res.json({
    message: "Image analyzed successfully.",
    detected: {
      clothingType: "Blazer",
      colors: ["Camel"],
      patterns: ["Solid"],
      aesthetic: "Minimal classic",
      category: "Formal",
    },
  });
}
