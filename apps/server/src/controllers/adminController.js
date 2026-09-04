export async function getAdminOverview(req, res) {
  return res.json({
    users: 4281,
    dailyActiveUsers: 812,
    moderationFlags: 129,
    recommendationCTR: 67,
  });
}

