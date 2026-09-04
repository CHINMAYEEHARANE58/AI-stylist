import "dotenv/config";

import { connectDatabase } from "../config/db.js";

async function seed() {
  await connectDatabase();
  console.log("Seed placeholder complete. Wire this file to create demo users, wardrobe items, and outfits.");
  process.exit(0);
}

seed();

