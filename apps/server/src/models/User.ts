import mongoose, { type Document, type Model, Schema } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash?: string;
  googleId?: string;
  role: 'user' | 'admin';
  profile: {
    pronouns?: string;
    stylePreference?: string;
    favoriteAesthetics: string[];
    clothingSizes: string[];
    preferredColorPalettes: string[];
    fashionHabits?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String },
    googleId: { type: String },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    profile: {
      pronouns: String,
      stylePreference: String,
      favoriteAesthetics: { type: [String], default: [] },
      clothingSizes: { type: [String], default: [] },
      preferredColorPalettes: { type: [String], default: [] },
      fashionHabits: String,
    },
  },
  { timestamps: true },
);

userSchema.index({ email: 1 });

export const User: Model<IUser> =
  mongoose.models.User ?? mongoose.model<IUser>('User', userSchema);
