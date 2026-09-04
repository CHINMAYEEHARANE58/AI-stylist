export type ClothingCategory =
  | "tops" | "shirts" | "t-shirts" | "jackets" | "blazers"
  | "jeans" | "trousers" | "skirts" | "dresses" | "shoes"
  | "sneakers" | "accessories" | "bags" | "outerwear";

export type Season = "Spring" | "Summer" | "Autumn" | "Winter" | "All season";
export type StyleAesthetic = "Minimal" | "Classic" | "Elegant" | "Casual" | "Streetwear" | "Romantic" | "Quiet luxury" | "Old money";

export interface ClothingItem {
  id: string;
  name: string;
  category: ClothingCategory;
  image: string;
  color: string;
  brand: string;
  style: StyleAesthetic | string;
  season: Season | string;
  occasion: string;
  pattern: string;
  fabric: string;
  favorite?: boolean;
  tags?: string[];
  addedAt?: string;
}

export interface OutfitSuggestion {
  id: string;
  title: string;
  mood: string;
  occasion: string;
  weather: string;
  items: string[];
  accent: string;
  notes: string;
  score: number;
  savedAt?: string;
}

export interface Testimonial {
  name: string;
  role: string;
  quote: string;
  avatar?: string;
  rating?: number;
}

export interface ShoppingRecommendation {
  id: string;
  title: string;
  price: number;
  originalPrice?: number;
  rating: number;
  reviewCount?: number;
  brand: string;
  store: string;
  similarity: number;
  image: string;
  url: string;
  category?: string;
  tags?: string[];
}

export interface PriceComparison {
  store: string;
  price: number;
  originalPrice?: number;
  rating: number;
  discount: number;
  availability: string;
  url?: string;
  deliveryDays?: number;
}

export interface WardrobeGap {
  title: string;
  priority: "High" | "Medium" | "Low";
  reason: string;
  suggestedBudget?: string;
}

export interface TrendInsight {
  title: string;
  detail: string;
  matchScore?: number;
}

export interface StyleLook {
  aesthetic: string;
  items: string[];
  why: string;
}

export interface AnalyticsEntry {
  label: string;
  value: number;
}

export interface Notification {
  id: string;
  message: string;
  type: "outfit" | "weather" | "sale" | "trend" | "system";
  read: boolean;
  time: string;
}

export interface UserProfile {
  name: string;
  email: string;
  pronouns?: string;
  stylePreference?: string;
  sizes?: string;
  aesthetics: string[];
  stylePersonality?: string;
  fashionHabits?: string;
  favoriteColors?: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface Feature {
  title: string;
  description: string;
  icon: string;
}
