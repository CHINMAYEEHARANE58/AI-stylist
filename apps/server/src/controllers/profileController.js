export async function getProfile(req, res) {
  return res.json({
    favoriteColors: ["Ivory", "Black", "Camel"],
    dominantAesthetics: ["Quiet luxury", "Minimal chic"],
    sizes: ["S", "28", "38"],
    preferredColorPalettes: ["Neutrals", "Warm monochrome"],
  });
}

export async function updateProfile(req, res) {
  return res.json({
    message: "Profile updated.",
    profile: req.body,
  });
}

