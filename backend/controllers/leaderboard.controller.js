import Submission from "../models/submission.model.js";
import User from "../models/user.model.js";

// 🚀 BLAZING FAST: Ultra-optimized leaderboard with comprehensive metrics
export const getLeaderboard = async (req, res) => {
  try {
    const { page = 1, limit = 50, period = "all", difficulty } = req.query;
    const skip = (page - 1) * limit;

    // Calculate time filter based on period
    let timeFilter = {};
    const now = new Date();

    switch (period) {
      case "week":
        timeFilter.createdAt = {
          $gte: new Date(now - 7 * 24 * 60 * 60 * 1000),
        };
        break;
      case "month":
        timeFilter.createdAt = {
          $gte: new Date(now - 30 * 24 * 60 * 60 * 1000),
        };
        break;
      case "year":
        timeFilter.createdAt = {
          $gte: new Date(now - 365 * 24 * 60 * 60 * 1000),
        };
        break;
      default:
        // 'all' - no time filter
        break;
    }

    // 🚀 Ultra-fast single aggregation pipeline for complete leaderboard
    const pipeline = [
      {
        $facet: {
          // User statistics from submissions
          userStats: [
            { $match: { isCorrect: true, ...timeFilter } },
            {
              $lookup: {
                from: "problems",
                localField: "problemId",
                foreignField: "_id",
                as: "problem",
                pipeline: [{ $project: { difficulty: 1 } }],
              },
            },
            {
              $addFields: {
                problemDifficulty: { $arrayElemAt: ["$problem.difficulty", 0] },
              },
            },
            // Filter by difficulty if specified
            ...(difficulty
              ? [
                  {
                    $match: {
                      problemDifficulty: {
                        $in: difficulty
                          .split(",")
                          .map((d) => d.trim().toUpperCase()),
                      },
                    },
                  },
                ]
              : []),
            {
              $group: {
                _id: {
                  userId: "$userId",
                  problemId: "$problemId",
                  difficulty: "$problemDifficulty",
                },
                firstSolved: { $min: "$createdAt" },
                submissions: { $sum: 1 },
              },
            },
            {
              $group: {
                _id: "$_id.userId",
                problemsSolved: { $sum: 1 },
                easyCount: {
                  $sum: { $cond: [{ $eq: ["$_id.difficulty", "EASY"] }, 1, 0] },
                },
                mediumCount: {
                  $sum: {
                    $cond: [{ $eq: ["$_id.difficulty", "MEDIUM"] }, 1, 0],
                  },
                },
                hardCount: {
                  $sum: { $cond: [{ $eq: ["$_id.difficulty", "HARD"] }, 1, 0] },
                },
                totalSubmissions: { $sum: "$submissions" },
                firstSolveDate: { $min: "$firstSolved" },
                lastSolveDate: { $max: "$firstSolved" },
              },
            },
            {
              $addFields: {
                score: {
                  $add: [
                    { $multiply: ["$easyCount", 1] }, // Easy: 1 point
                    { $multiply: ["$mediumCount", 3] }, // Medium: 3 points
                    { $multiply: ["$hardCount", 5] }, // Hard: 5 points
                  ],
                },
              },
            },
          ],
          // All users for complete leaderboard
          allUsers: [
            {
              $lookup: {
                from: "users",
                pipeline: [
                  {
                    $project: {
                      _id: 1,
                      name: 1,
                      email: 1,
                      avatar: 1,
                      streak: 1,
                      lastSolvedDate: 1,
                      createdAt: 1,
                    },
                  },
                ],
                as: "users",
              },
            },
            { $unwind: "$users" },
            { $replaceRoot: { newRoot: "$users" } },
          ],
        },
      },
      {
        $addFields: {
          // Merge user data with stats
          leaderboard: {
            $map: {
              input: "$allUsers",
              as: "user",
              in: {
                $let: {
                  vars: {
                    userStats: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: "$userStats",
                            cond: { $eq: ["$$this._id", "$$user._id"] },
                          },
                        },
                        0,
                      ],
                    },
                  },
                  in: {
                    userId: "$$user._id",
                    name: "$$user.name",
                    email: "$$user.email",
                    avatar: "$$user.avatar",
                    streak: "$$user.streak",
                    lastSolvedDate: "$$user.lastSolvedDate",
                    memberSince: "$$user.createdAt",
                    problemsSolved: {
                      $ifNull: ["$$userStats.problemsSolved", 0],
                    },
                    score: { $ifNull: ["$$userStats.score", 0] },
                    easyCount: { $ifNull: ["$$userStats.easyCount", 0] },
                    mediumCount: { $ifNull: ["$$userStats.mediumCount", 0] },
                    hardCount: { $ifNull: ["$$userStats.hardCount", 0] },
                    totalSubmissions: {
                      $ifNull: ["$$userStats.totalSubmissions", 0],
                    },
                    firstSolveDate: "$$userStats.firstSolveDate",
                    lastSolveDate: "$$userStats.lastSolveDate",
                    successRate: {
                      $cond: [
                        { $gt: ["$$userStats.totalSubmissions", 0] },
                        {
                          $round: [
                            {
                              $multiply: [
                                {
                                  $divide: [
                                    "$$userStats.problemsSolved",
                                    "$$userStats.totalSubmissions",
                                  ],
                                },
                                100,
                              ],
                            },
                            1,
                          ],
                        },
                        0,
                      ],
                    },
                  },
                },
              },
            },
          },
        },
      },
      // Sort and paginate
      { $unwind: "$leaderboard" },
      { $replaceRoot: { newRoot: "$leaderboard" } },
      {
        $sort: {
          score: -1,
          problemsSolved: -1,
          lastSolveDate: -1,
        },
      },
      {
        $addFields: {
          rank: { $add: [skip, { $indexOfArray: [[], null] }] },
        },
      },
      { $skip: skip },
      { $limit: parseInt(limit) },
    ];

    const leaderboard = await Submission.aggregate(pipeline);

    // Get total user count for pagination
    const totalUsers = await User.countDocuments();

    // Add ranking
    const rankedLeaderboard = leaderboard.map((user, index) => ({
      ...user,
      rank: skip + index + 1,
    }));

    res.json({
      leaderboard: rankedLeaderboard,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalUsers,
        pages: Math.ceil(totalUsers / limit),
      },
      filters: {
        period,
        difficulty: difficulty || "all",
      },
      summary: {
        totalUsers,
        activeUsers: leaderboard.filter((u) => u.problemsSolved > 0).length,
        topScore: leaderboard[0]?.score || 0,
        averageScore:
          leaderboard.length > 0
            ? Math.round(
                leaderboard.reduce((sum, u) => sum + u.score, 0) /
                  leaderboard.length
              )
            : 0,
      },
    });
  } catch (err) {
    console.error("❌ Error fetching leaderboard:", err);
    res.status(500).json({
      message: "Failed to get leaderboard",
      error: err.message,
    });
  }
};
