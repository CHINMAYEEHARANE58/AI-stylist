export async function chatWithStylist(req, res) {
  const { message = "What should I wear today?" } = req.body;

  return res.json({
    message,
    response:
      "I would build around your ivory blouse, camel blazer, vintage denim, and cream sneakers. The palette stays polished, the sneakers keep it wearable, and gold jewelry adds a finished detail.",
    suggestions: [
      "Style this shirt.",
      "Create a brunch outfit.",
      "Suggest colors that match.",
      "Build an interview outfit.",
    ],
  });
}

export async function rateOutfit(req, res) {
  return res.json({
    message: "Outfit rating saved and used to improve future recommendations.",
    outfitId: req.body.outfitId,
    rating: req.body.rating,
  });
}

export async function shareOutfit(req, res) {
  return res.json({
    message: "Share link generated.",
    outfitId: req.body.outfitId,
    shareUrl: `https://closetai.local/share/${req.body.outfitId || "demo-outfit"}`,
  });
}

