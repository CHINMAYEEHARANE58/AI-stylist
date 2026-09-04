import type {
  ClothingItem, OutfitSuggestion, PriceComparison,
  ShoppingRecommendation, Testimonial, WardrobeGap,
  TrendInsight, StyleLook, Notification, FAQItem,
} from "@/lib/types";

export const navLinks = [
  { href: "#features",      label: "Features" },
  { href: "#how-it-works",  label: "How it works" },
  { href: "#testimonials",  label: "Reviews" },
];

export const wardrobeItems: ClothingItem[] = [
  {
    id: "item-1", name: "Ivory Satin Blouse", category: "tops",
    image: "https://images.unsplash.com/photo-1485462537746-965f33f7f6a7?w=600&q=80",
    color: "Ivory", brand: "ClosetAI Edit", style: "Elegant",
    season: "All season", occasion: "Office", pattern: "Solid", fabric: "Satin", favorite: true,
  },
  {
    id: "item-2", name: "Black Tailored Skirt", category: "skirts",
    image: "https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=600&q=80",
    color: "Black", brand: "Aure Studio", style: "Classic",
    season: "All season", occasion: "Date night", pattern: "Solid", fabric: "Wool blend", favorite: true,
  },
  {
    id: "item-3", name: "Camel Structured Blazer", category: "blazers",
    image: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600&q=80",
    color: "Camel", brand: "Maison Mode", style: "Minimal",
    season: "Autumn", occasion: "Office", pattern: "Solid", fabric: "Twill",
  },
  {
    id: "item-4", name: "Vintage Blue Denim", category: "jeans",
    image: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600&q=80",
    color: "Blue", brand: "North Thread", style: "Casual",
    season: "All season", occasion: "Brunch", pattern: "Solid", fabric: "Denim",
  },
  {
    id: "item-5", name: "Cream Leather Sneakers", category: "sneakers",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80",
    color: "Cream", brand: "Forma", style: "Streetwear",
    season: "All season", occasion: "Vacation", pattern: "Solid", fabric: "Leather",
  },
  {
    id: "item-6", name: "Gold Layered Necklace", category: "accessories",
    image: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&q=80",
    color: "Gold", brand: "Atelier Nine", style: "Elegant",
    season: "All season", occasion: "Party", pattern: "Solid", fabric: "Metal",
  },
  {
    id: "item-7", name: "White Linen Shirt", category: "shirts",
    image: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&q=80",
    color: "White", brand: "COS", style: "Minimal",
    season: "Summer", occasion: "Casual", pattern: "Solid", fabric: "Linen",
  },
  {
    id: "item-8", name: "Chocolate Trench Coat", category: "outerwear",
    image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&q=80",
    color: "Chocolate", brand: "Toteme Edit", style: "Quiet luxury",
    season: "Autumn", occasion: "Travel", pattern: "Solid", fabric: "Cotton blend",
  },
];

export const outfitSuggestions: OutfitSuggestion[] = [
  {
    id: "outfit-1", title: "Gallery Brunch", mood: "Soft minimal", occasion: "Brunch",
    weather: "24°C sunny", items: ["Ivory Satin Blouse", "Vintage Blue Denim", "Cream Leather Sneakers"],
    accent: "Gold Layered Necklace", notes: "Balanced textures with a polished casual silhouette.", score: 94,
  },
  {
    id: "outfit-2", title: "Rainy Office Reset", mood: "Quiet luxury", occasion: "Office",
    weather: "18°C light rain", items: ["Camel Structured Blazer", "Black Tailored Skirt", "Ivory Satin Blouse"],
    accent: "Gold Layered Necklace", notes: "Sharp tailoring softened with light neutrals.", score: 91,
  },
  {
    id: "outfit-3", title: "Evening Edit", mood: "Elegant", occasion: "Date night",
    weather: "21°C clear", items: ["Black Tailored Skirt", "Ivory Satin Blouse"],
    accent: "Gold Layered Necklace", notes: "High contrast and a luminous neckline. Refined yet memorable.", score: 97,
  },
  {
    id: "outfit-4", title: "Weekend Wanderer", mood: "Relaxed", occasion: "Travel",
    weather: "22°C partly cloudy", items: ["White Linen Shirt", "Vintage Blue Denim", "Cream Leather Sneakers"],
    accent: "Chocolate Trench Coat", notes: "Effortless layers built for long days and easy movement.", score: 89,
  },
];

export const testimonials: Testimonial[] = [
  {
    name: "Maya Kapoor", role: "Content strategist", rating: 5,
    quote: "ClosetAI made my wardrobe feel twice as big. The Pinterest recreation feature is genuinely wild.",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&q=80",
  },
  {
    name: "Nina Romero", role: "Product designer", rating: 5,
    quote: "It feels like a premium stylist app, but it uses what I already own first. That's the killer feature.",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&q=80",
  },
  {
    name: "Aarav Shah", role: "Consultant", rating: 5,
    quote: "Weather-based outfit suggestions and style insights are the features I open every single morning.",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&q=80",
  },
  {
    name: "Zoe Chen", role: "Fashion editor", rating: 5,
    quote: "The gap analysis told me exactly what one piece would unlock 15 new outfit combinations. Bought it instantly.",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&q=80",
  },
  {
    name: "Lucas Petit", role: "Architect", rating: 4,
    quote: "Minimal, fast, and it actually learns my taste. I stopped overthinking my outfits completely.",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&q=80",
  },
  {
    name: "Priya Nair", role: "Startup founder", rating: 5,
    quote: "I went from 20 minutes getting dressed to under 5. The AI genuinely understands personal style.",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=80&q=80",
  },
];

export const shoppingRecommendations: ShoppingRecommendation[] = [
  {
    id: "shop-1", title: "Neutral Leather Sneakers", price: 4299, originalPrice: 5499,
    rating: 4.7, reviewCount: 382, brand: "Zara", store: "Zara",
    similarity: 96, category: "shoes",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80", url: "#",
  },
  {
    id: "shop-2", title: "Relaxed Linen Trousers", price: 2599, originalPrice: 3199,
    rating: 4.5, reviewCount: 218, brand: "H&M", store: "H&M",
    similarity: 88, category: "trousers",
    image: "https://images.unsplash.com/photo-1594938298603-c8148c4b4e26?w=600&q=80", url: "#",
  },
  {
    id: "shop-3", title: "Structured Ivory Tank", price: 1899, originalPrice: 2399,
    rating: 4.4, reviewCount: 157, brand: "Myntra Luxe", store: "Myntra",
    similarity: 84, category: "tops",
    image: "https://images.unsplash.com/photo-1485462537746-965f33f7f6a7?w=600&q=80", url: "#",
  },
  {
    id: "shop-4", title: "Beige Wool Trench Coat", price: 8999, originalPrice: 11499,
    rating: 4.8, reviewCount: 94, brand: "Toteme", store: "ASOS",
    similarity: 91, category: "outerwear",
    image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&q=80", url: "#",
  },
  {
    id: "shop-5", title: "Gold Chain Bracelet", price: 1299,
    rating: 4.6, reviewCount: 203, brand: "Atelier Nine", store: "Nykaa Fashion",
    similarity: 79, category: "accessories",
    image: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&q=80", url: "#",
  },
  {
    id: "shop-6", title: "White Oversized Blazer", price: 5499, originalPrice: 6999,
    rating: 4.5, reviewCount: 166, brand: "COS", store: "COS",
    similarity: 87, category: "blazers",
    image: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600&q=80", url: "#",
  },
];

export const comparisonRows: PriceComparison[] = [
  { store: "Amazon", price: 4199, originalPrice: 5499, rating: 4.3, discount: 22, availability: "In stock",  deliveryDays: 2 },
  { store: "Myntra", price: 4399, originalPrice: 5399, rating: 4.6, discount: 18, availability: "In stock",  deliveryDays: 3 },
  { store: "Ajio",   price: 4099, originalPrice: 5499, rating: 4.2, discount: 26, availability: "Limited",   deliveryDays: 4 },
  { store: "H&M",    price: 4599, originalPrice: 5099, rating: 4.8, discount: 10, availability: "In stock",  deliveryDays: 5 },
  { store: "Zara",   price: 4299, originalPrice: 4999, rating: 4.7, discount: 14, availability: "In stock",  deliveryDays: 3 },
];

export const analytics = {
  favoriteColors: [
    { label: "Ivory",  value: 34 }, { label: "Black", value: 28 },
    { label: "Camel",  value: 19 }, { label: "Stone", value: 19 },
  ],
  aesthetics: [
    { label: "Quiet luxury",     value: 78 },
    { label: "Minimal classic",  value: 64 },
    { label: "Street polish",    value: 42 },
    { label: "Romantic neutral", value: 31 },
  ],
  habits: [
    "You repeat high-contrast outfits on weekdays.",
    "Soft neutrals dominate your saved looks.",
    "You underuse your statement accessories by 42%.",
    "Your most-worn category is tops — 38% of all outfits.",
  ],
  categories: [
    { label: "Tops",        value: 31 }, { label: "Bottoms",     value: 24 },
    { label: "Shoes",       value: 18 }, { label: "Accessories", value: 27 },
  ],
  usageHistory: [
    { label: "Weekday office",  value: 42 }, { label: "Weekend casual", value: 33 },
    { label: "Events",          value: 15 }, { label: "Travel",         value: 10 },
  ],
  monthlyOutfits: [
    { label: "Jan", value: 24 }, { label: "Feb", value: 31 }, { label: "Mar", value: 28 },
    { label: "Apr", value: 35 }, { label: "May", value: 42 }, { label: "Jun", value: 38 },
  ],
};

export const wardrobeGaps: WardrobeGap[] = [
  {
    title: "Neutral sneakers", priority: "High",
    reason: "They unlock office, brunch, vacation, and streetwear combinations.",
    suggestedBudget: "₹3,000–5,000",
  },
  {
    title: "Formal tops", priority: "Medium",
    reason: "Your skirts and blazer are strong — the formal top rotation is narrow.",
    suggestedBudget: "₹1,500–3,000",
  },
  {
    title: "Versatile outerwear", priority: "Medium",
    reason: "A beige trench improves rain, travel, and Pinterest recreation looks.",
    suggestedBudget: "₹6,000–10,000",
  },
  {
    title: "Statement bag", priority: "Low",
    reason: "A structured tote completes 8 of your 12 most-saved Pinterest inspirations.",
    suggestedBudget: "₹4,000–8,000",
  },
];

export const trendInsights: TrendInsight[] = [
  { title: "Chocolate & ivory contrast", matchScore: 91, detail: "Warm neutrals trending for polished day-to-night styling." },
  { title: "Soft tailoring",             matchScore: 84, detail: "Structured blazers with relaxed denim performing well for office and travel." },
  { title: "Metallic accents",           matchScore: 78, detail: "Gold jewelry is a lightweight way to refresh minimal outfits this season." },
  { title: "Quiet luxury fabrics",       matchScore: 88, detail: "Cashmere, wool, and satin continue to dominate editorial and street looks." },
];

export const styleAroundLooks: StyleLook[] = [
  {
    aesthetic: "Casual", items: ["Black Tailored Skirt", "Ivory Satin Blouse", "Cream Leather Sneakers"],
    why: "Sneakers relax the skirt while the blouse keeps the look intentional.",
  },
  {
    aesthetic: "Elegant", items: ["Black Tailored Skirt", "Ivory Satin Blouse", "Gold Layered Necklace"],
    why: "High contrast and warm metal accents make the outfit feel refined.",
  },
  {
    aesthetic: "Office", items: ["Black Tailored Skirt", "Camel Structured Blazer", "Ivory Satin Blouse"],
    why: "Tailoring creates authority while the ivory base softens the palette.",
  },
  {
    aesthetic: "Party", items: ["Black Tailored Skirt", "Gold Layered Necklace", "Cream Leather Sneakers"],
    why: "The mix of shine and clean footwear keeps it stylish without feeling overdone.",
  },
];

export const notifications: Notification[] = [
  { id: "n1", message: "Daily outfit ready: rainy-day office look with camel blazer.", type: "outfit",  read: false, time: "2 min ago" },
  { id: "n2", message: "Weather alert: carry lightweight outerwear for evening showers.", type: "weather", read: false, time: "1 hr ago" },
  { id: "n3", message: "Sale: neutral sneakers dropped 18% on Ajio.", type: "sale",    read: false, time: "3 hr ago" },
  { id: "n4", message: "Trend alert: ivory layers and gold accents match your saved looks.", type: "trend",   read: true,  time: "Yesterday" },
  { id: "n5", message: "Your wardrobe analysis is complete — 8 new combinations found.", type: "system",  read: true,  time: "2 days ago" },
];

export const occasions = [
  "Casual", "Formal", "Party", "Elegant", "Office", "Vacation",
  "Brunch", "Wedding", "Date night", "Streetwear", "Travel", "Custom",
];

export const moods = ["Minimal", "Bold", "Romantic", "Playful", "Polished", "Relaxed"];

export const weatherOptions = [
  "Hot & sunny (30°C+)", "Warm & clear (22–28°C)", "Mild (16–22°C)",
  "Cool & breezy (10–16°C)", "Cold (below 10°C)", "Rainy / overcast",
];

export const profileAesthetics = [
  "Quiet luxury", "Old money", "Minimal chic", "Streetwear",
  "Romantic neutral", "Scandinavian clean", "Y2K revival", "Coastal grandmother",
];

export const stylistPrompts = [
  "What should I wear today?",
  "Style this shirt for work.",
  "Create a brunch outfit.",
  "Suggest colors that match my blazer.",
];

export const stylistReplies = [
  {
    prompt: "What should I wear today?",
    reply: "Choose the camel blazer, ivory blouse, relaxed denim, and cream sneakers. Polished enough for meetings, comfortable in warm weather.",
  },
  {
    prompt: "Suggest colors that match my blazer.",
    reply: "Your strongest palette is ivory, black, camel, denim blue, and gold. Add sage or stone gray for softness without losing structure.",
  },
];

export const wardrobeAnalysis = [
  {
    label: "Clothing type detection",
    value: "6 categories mapped",
    detail: "Tops, skirts, jackets, denim, shoes, and accessories tagged from uploads.",
  },
  {
    label: "Colour & pattern detection",
    value: "92% confidence",
    detail: "Solid neutrals dominate — black, ivory, camel, denim blue, cream, and gold detected.",
  },
  {
    label: "Style & aesthetic analysis",
    value: "Quiet luxury",
    detail: "Your wardrobe leans minimal, elegant, office-ready, and neutral with streetwear accents.",
  },
];

export const faqs: FAQItem[] = [
  {
    question: "How does ClosetAI understand my style?",
    answer: "When you upload your wardrobe, our AI analyses colour palettes, silhouettes, fabrics, and occasion tags. Combined with your style profile — aesthetics, personality, and fashion habits — it builds a personal style fingerprint that improves with every outfit you rate or save.",
  },
  {
    question: "Does it work with a small wardrobe?",
    answer: "Absolutely. ClosetAI is most powerful with 10–30 items because it focuses on maximising combinations you already own, not encouraging you to buy more.",
  },
  {
    question: "How does the Pinterest recreation feature work?",
    answer: "Upload any outfit screenshot or paste a Pinterest board URL. Our visual AI breaks down the look by silhouette, colour story, and key pieces, then reconstructs it using the closest items in your wardrobe — with a similarity score.",
  },
  {
    question: "Is my wardrobe data private?",
    answer: "Yes. Your images and style data are stored securely and never shared. You control what you upload, and you can delete everything at any time.",
  },
  {
    question: "How accurate are the shopping recommendations?",
    answer: "Recommendations carry a match score based on how well a piece would integrate with your existing wardrobe and fill your identified gaps. We compare prices across multiple retailers in real time.",
  },
  {
    question: "Does ClosetAI work for all gender styles?",
    answer: "Yes. ClosetAI is style-preference driven, not gender-defined. You set your own aesthetic profile and the AI works entirely within that context.",
  },
];

export const howItWorksSteps = [
  {
    step: "01", title: "Upload your wardrobe",
    description: "Scan clothes with your camera or drag-and-drop images. AI tags each piece automatically — category, colour, fabric, and occasion.",
  },
  {
    step: "02", title: "Set your style profile",
    description: "Choose your aesthetics, favourite colour palettes, sizes, and styling goals. The more context you give, the sharper the suggestions.",
  },
  {
    step: "03", title: "Generate and save looks",
    description: "Get AI outfits by occasion, weather, mood, or one anchor piece. Rate what you love to improve future recommendations.",
  },
  {
    step: "04", title: "Shop with intelligence",
    description: "Close identified wardrobe gaps with targeted recommendations, real-time price comparisons across major retailers, and trend context.",
  },
];

export const features = [
  {
    title: "Digital wardrobe scan",
    description: "Upload or scan your closet with automatic AI tagging for category, colour, patterns, and aesthetic.",
  },
  {
    title: "Occasion-based outfit generator",
    description: "Generate complete looks for work, brunch, wedding season, vacations, and spontaneous date nights.",
  },
  {
    title: "Style this item",
    description: "Tap one piece and get multiple curated looks built only from the wardrobe you already own.",
  },
  {
    title: "Pinterest recreation",
    description: "Upload an inspiration image and ClosetAI reconstructs the closest version using your own wardrobe.",
  },
  {
    title: "Gap analysis shopping",
    description: "Targeted recommendations with similarity scores and price comparisons across top stores.",
  },
  {
    title: "Fashion insights",
    description: "Track dominant aesthetics, underused pieces, favourite colours, and outfit repeat patterns.",
  },
];

export const eventOccasions = ["Interview", "College", "Party", "Wedding", "Business meeting", "Travel"];

export const featureCoverage = [
  "Authentication, Google sign-in, onboarding, style preferences, and sizing",
  "Digital wardrobe uploads, camera scan entry, AI tagging, categories, search, filters, edit, archive, favorites",
  "AI wardrobe analysis, clothing detection, color and pattern detection, aesthetics, gaps, and insights",
  "AI outfit generation for casual, formal, party, elegant, office, vacation, wedding, date night, events, and custom occasions",
  "Style Around Item with multiple aesthetics using owned wardrobe pieces",
  "Pinterest recreation, uploaded screenshots, side-by-side similarity scoring, missing pieces, and completion suggestions",
  "AI stylist chat, weather-based styling, event styling, saved outfits, lookbooks, and moodboards",
  "Fashion analytics, shopping assistant, product recommendations, price comparison, trends, ratings, sharing, and notifications",
  "Style DNA profile, responsive light/dark UI, and admin management dashboard",
];
