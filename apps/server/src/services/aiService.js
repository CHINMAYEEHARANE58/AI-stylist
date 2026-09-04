import { generatedOutfits } from "../data/mockData.js";

export async function generateOutfits({ occasion, weather, anchorItem }) {
  return generatedOutfits.map((outfit) => ({
    ...outfit,
    notes: `${outfit.notes} Generated for ${occasion || "versatile styling"}${weather ? ` in ${weather}` : ""}${
      anchorItem ? ` using ${anchorItem}` : ""
    }.`,
  }));
}

export async function tagWardrobeItem(itemName) {
  return {
    clothingType: itemName?.toLowerCase().includes("skirt") ? "Skirt" : "Top",
    colors: ["Ivory", "Black"],
    patterns: ["Solid"],
    aesthetic: "Quiet luxury",
    formality: "Elegant",
  };
}

export async function recreatePinterestLook() {
  return {
    similarity: 87,
    matchedItems: ["Ivory Satin Blouse", "Black Tailored Skirt", "Cream Sneakers"],
    missingPieces: ["Beige trench coat", "Structured tote bag"],
  };
}

export async function recommendShoppingAdditions() {
  return [
    {
      reason: "You need neutral sneakers for stronger cross-occasion outfit compatibility.",
      category: "Shoes",
    },
    {
      reason: "A structured ivory base layer will boost Pinterest recreation accuracy.",
      category: "Top",
    },
  ];
}

