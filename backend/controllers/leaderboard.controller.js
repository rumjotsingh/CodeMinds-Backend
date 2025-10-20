import Submission from "../models/submission.model.js";
export const getLeaderboard = async (req, res) => {
  try {
    // Get all users
    const users = await (
      await import("../models/user.model.js")
    ).default.find(
      {},
      {
        _id: 1,
        name: 1,
        email: 1,
      }
    );

    // Get solved counts for each user
    const solvedCounts = await Submission.aggregate([
      { $match: { isCorrect: true } },
      { $group: { _id: { userId: "$userId", problemId: "$problemId" } } },
      { $group: { _id: "$_id.userId", problemsSolved: { $sum: 1 } } },
    ]);

    // Map userId to problemsSolved
    const solvedMap = new Map();
    solvedCounts.forEach((row) => {
      solvedMap.set(String(row._id), row.problemsSolved);
    });

    // Build leaderboard: all users, solved count or 0
    const leaderboard = users
      .map((user) => ({
        userId: user._id,
        name: user.name,
        email: user.email,
        problemsSolved: solvedMap.get(String(user._id)) || 0,
      }))
      .sort((a, b) => b.problemsSolved - a.problemsSolved);

    res.json(leaderboard);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to get leaderboard", error: err.message });
  }
};
