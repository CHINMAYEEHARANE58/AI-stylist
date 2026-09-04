import { shoppingSuggestions, wardrobeItems } from "../data/mockData.js";

export async function getWardrobeInsights(req, res) {
  return res.json({
    detectedTypes: ["Blouse", "Skirt", "Blazer", "Denim", "Sneakers", "Necklace"],
    colors: ["Ivory", "Black", "Camel", "Denim blue", "Cream", "Gold"],
    patterns: ["Solid"],
    dominantAesthetics: ["Quiet luxury", "Minimal chic", "Street polish"],
    wardrobeGaps: [
      "Missing neutral sneakers",
      "Need more formal tops",
      "Need versatile outerwear",
    ],
    usage: {
      mostWornColors: ["Ivory", "Black", "Camel"],
      favoriteCategories: ["Tops", "Accessories", "Bottoms"],
      outfitHistory: ["Office", "Brunch", "Date night"],
    },
    itemCount: wardrobeItems.length,
  });
}

export async function getTrendInsights(req, res) {
  return res.json({
    trends: [
      "Chocolate and ivory contrast",
      "Soft tailoring",
      "Metallic accents",
      "Neutral sneakers",
    ],
    seasonalRecommendations: [
      "Choose breathable layers during humid weather.",
      "Keep rain-friendly footwear in saved office looks.",
      "Use gold accents to refresh neutral outfits.",
    ],
    productRecommendations: shoppingSuggestions,
  });
}

export async function getNotifications(req, res) {
  return res.json({
    notifications: [
      "Daily outfit ready: rainy-day office look with camel blazer.",
      "Weather alert: carry lightweight outerwear for evening showers.",
      "New recommendation: neutral sneakers dropped 18% on Ajio.",
      "Trend alert: ivory layers and gold accents match your saved looks.",
    ],
  });
}

