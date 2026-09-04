import { shoppingSuggestions } from "../data/mockData.js";
import { recommendShoppingAdditions } from "../services/aiService.js";

export async function getShoppingRecommendations(req, res) {
  const reasons = await recommendShoppingAdditions();
  return res.json({
    items: shoppingSuggestions,
    reasons,
  });
}

export async function getPriceComparisons(req, res) {
  return res.json({
    product: req.query.product || "Neutral Leather Sneakers",
    comparisons: [
      { store: "Amazon", price: 4199, discount: 22, rating: 4.3, availability: "In stock" },
      { store: "Myntra", price: 4399, discount: 18, rating: 4.6, availability: "In stock" },
      { store: "Ajio", price: 4099, discount: 26, rating: 4.2, availability: "Limited" },
      { store: "H&M", price: 4599, discount: 10, rating: 4.8, availability: "In stock" },
      { store: "Zara", price: 4299, discount: 14, rating: 4.7, availability: "In stock" },
    ],
  });
}

