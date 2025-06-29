import Submission from "../models/submission.model";
export const getLeaderboard = async (req, res) => {
  try {
    const leaderboard = await Submission.aggregate([
      // Only correct submissions
      { $match: { isCorrect: true } },

      // Group by userId and problemId to ensure unique problem solves
      {
        $group: {
          _id: { userId: "$userId", problemId: "$problemId" },
        },
      },

      // Re-group by userId to count how many unique problems they solved
      {
        $group: {
          _id: "$_id.userId",
          problemsSolved: { $sum: 1 },
        },
      },

      // Sort by most solved
      { $sort: { problemsSolved: -1 } },

      // Join with user collection
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },

      { $unwind: "$user" },

      // Project desired fields
      {
        $project: {
          _id: 0,
          userId: "$user._id",
          name: "$user.name",
          email: "$user.email",
          problemsSolved: 1,
        },
      },
    ]);

    res.json(leaderboard);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to get leaderboard", error: err.message });
  }
};
