import mongoose from "mongoose";

export async function connectDatabase() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.warn("MONGODB_URI is not set. Starting server without a database connection.");
    return;
  }

  try {
    await mongoose.connect(uri);
    console.log("MongoDB connected");
  } catch (error) {
    console.warn("MongoDB connection failed. Continuing with mock-ready API responses.", error.message);
  }
}

