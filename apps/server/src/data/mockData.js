export const wardrobeItems = [
  {
    id: "item-1",
    name: "Ivory Satin Blouse",
    image: "/wardrobe-item-1.svg",
    color: "Ivory",
    type: "tops",
    brand: "ClosetAI Edit",
    style: "Elegant",
    season: "All season",
    occasion: "Office",
    pattern: "Solid",
    fabric: "Satin",
    favorite: true,
    aiTags: {
      clothingType: "Blouse",
      colors: ["Ivory"],
      patterns: ["Solid"],
      aesthetic: "Quiet luxury",
      formality: "Elegant",
    },
  },
  {
    id: "item-2",
    name: "Black Tailored Skirt",
    image: "/wardrobe-item-2.svg",
    color: "Black",
    type: "skirts",
    brand: "Aure Studio",
    style: "Classic",
    season: "All season",
    occasion: "Date night",
    pattern: "Solid",
    fabric: "Wool blend",
    favorite: true,
    aiTags: {
      clothingType: "Skirt",
      colors: ["Black"],
      patterns: ["Solid"],
      aesthetic: "Minimal chic",
      formality: "Elegant",
    },
  },
];

export const generatedOutfits = [
  {
    id: "outfit-1",
    title: "Rainy Office Reset",
    occasion: "Office",
    weather: "18°C light rain",
    mood: "Quiet luxury",
    notes: "Sharp contrast with comfortable footwear for commuting.",
    itemIds: ["item-1", "item-2"],
    rating: 5,
  },
];

export const shoppingSuggestions = [
  {
    id: "shop-1",
    title: "Neutral Leather Sneakers",
    price: 4299,
    store: "Zara",
    rating: 4.7,
    similarity: 96,
  },
];

