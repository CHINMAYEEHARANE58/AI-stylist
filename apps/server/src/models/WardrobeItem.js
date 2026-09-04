import mongoose from "mongoose";

const wardrobeItemSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    image: { type: String, required: true },
    name: { type: String, required: true },
    color: String,
    type: String,
    brand: String,
    style: String,
    season: String,
    occasion: String,
    pattern: String,
    fabric: String,
    favorite: { type: Boolean, default: false },
    archived: { type: Boolean, default: false },
    aiTags: {
      clothingType: String,
      colors: [String],
      patterns: [String],
      aesthetic: String,
      formality: String,
    },
  },
  { timestamps: true },
);

export const WardrobeItem = mongoose.models.WardrobeItem || mongoose.model("WardrobeItem", wardrobeItemSchema);

