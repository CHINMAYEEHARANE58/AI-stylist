import mongoose, { type Document, type Model, Schema, Types } from 'mongoose';

export interface IAiTags {
  clothingType?: string;
  colors: string[];
  patterns: string[];
  aesthetic?: string;
  formality?: string;
}

export interface IWardrobeItem extends Document {
  userId: Types.ObjectId;
  image: string;
  name: string;
  color?: string;
  type?: string;
  brand?: string;
  style?: string;
  season?: string;
  occasion?: string;
  pattern?: string;
  fabric?: string;
  favorite: boolean;
  archived: boolean;
  aiTags: IAiTags;
  createdAt: Date;
  updatedAt: Date;
}

const wardrobeItemSchema = new Schema<IWardrobeItem>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    image: { type: String, required: true },
    name: { type: String, required: true, trim: true },
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
      colors: { type: [String], default: [] },
      patterns: { type: [String], default: [] },
      aesthetic: String,
      formality: String,
    },
  },
  { timestamps: true },
);

wardrobeItemSchema.index({ userId: 1, archived: 1 });
wardrobeItemSchema.index({ userId: 1, favorite: 1 });

export const WardrobeItem: Model<IWardrobeItem> =
  mongoose.models.WardrobeItem ??
  mongoose.model<IWardrobeItem>('WardrobeItem', wardrobeItemSchema);
