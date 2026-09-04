import mongoose, { type Document, type Model, Schema, Types } from 'mongoose';

export interface IOutfit extends Document {
  userId: Types.ObjectId;
  title: string;
  occasion?: string;
  weather?: string;
  mood?: string;
  itemIds: Types.ObjectId[];
  notes?: string;
  saved: boolean;
  rating?: number;
  createdAt: Date;
  updatedAt: Date;
}

const outfitSchema = new Schema<IOutfit>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    occasion: String,
    weather: String,
    mood: String,
    itemIds: [{ type: Schema.Types.ObjectId, ref: 'WardrobeItem' }],
    notes: String,
    saved: { type: Boolean, default: true },
    rating: { type: Number, min: 1, max: 5 },
  },
  { timestamps: true },
);

outfitSchema.index({ userId: 1, saved: 1 });

export const Outfit: Model<IOutfit> =
  mongoose.models.Outfit ?? mongoose.model<IOutfit>('Outfit', outfitSchema);
