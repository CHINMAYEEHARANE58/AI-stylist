import mongoose from "mongoose";

const outfitSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    occasion: String,
    weather: String,
    mood: String,
    itemIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "WardrobeItem" }],
    notes: String,
    saved: { type: Boolean, default: true },
    rating: { type: Number, min: 1, max: 5 },
  },
  { timestamps: true },
);

export const Outfit = mongoose.models.Outfit || mongoose.model("Outfit", outfitSchema);

