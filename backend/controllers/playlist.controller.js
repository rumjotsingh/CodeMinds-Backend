import Playlist from "../models/playlist.model.js";
import Problem from "../models/problem.model.js";

import Submission from "../models/submission.model.js";
import mongoose from "mongoose";

// 🚀 BLAZING FAST: Optimized playlist creation with validation
export const createPlaylist = async (req, res) => {
  const { title, description, isPublic = false } = req.body;
  const userId = req.user._id;

  try {
    // Validate input
    if (!title || title.trim().length < 3) {
      return res.status(400).json({
        message: "Title must be at least 3 characters long",
      });
    }

    // Check for duplicate playlist name for this user
    const existingPlaylist = await Playlist.findOne({
      userId,
      title: title.trim(),
    })
      .select("_id")
      .lean();

    if (existingPlaylist) {
      return res.status(409).json({
        message: "Playlist with this title already exists",
      });
    }

    const playlist = await Playlist.create({
      title: title.trim(),
      description: description?.trim() || "",
      userId,
      isPublic,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    res.status(201).json({
      message: "Playlist created successfully",
      playlist: {
        ...playlist.toObject(),
        problemCount: 0,
        solvedCount: 0,
      },
    });
  } catch (err) {
    console.error("❌ Error creating playlist:", err);
    res.status(500).json({
      message: "Failed to create playlist",
      error: err.message,
    });
  }
};

// 🚀 BLAZING FAST: Ultra-optimized user playlists with comprehensive stats
export const getUserPlaylists = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 20, search, sortBy = "updatedAt" } = req.query;
    const skip = (page - 1) * limit;

    // Build match conditions
    const matchConditions = { userId };

    if (search) {
      matchConditions.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // 🚀 Single aggregation pipeline for all playlist data with stats
    const pipeline = [
      { $match: matchConditions },
      {
        $lookup: {
          from: "problems",
          localField: "problems",
          foreignField: "_id",
          as: "problemDetails",
          pipeline: [{ $project: { title: 1, difficulty: 1, tags: 1 } }],
        },
      },
      {
        $lookup: {
          from: "submissions",
          let: { problems: "$problems", userId: userId },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$userId", "$$userId"] },
                    { $in: ["$problemId", "$$problems"] },
                    { $eq: ["$isCorrect", true] },
                    { $eq: ["$verdict", "Accepted"] },
                  ],
                },
              },
            },
            { $group: { _id: "$problemId" } },
          ],
          as: "solvedProblems",
        },
      },
      {
        $addFields: {
          problemCount: { $size: "$problems" },
          solvedCount: { $size: "$solvedProblems" },
          progressPercentage: {
            $cond: [
              { $gt: [{ $size: "$problems" }, 0] },
              {
                $round: [
                  {
                    $multiply: [
                      {
                        $divide: [
                          { $size: "$solvedProblems" },
                          { $size: "$problems" },
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
          difficultyBreakdown: {
            easy: {
              $size: {
                $filter: {
                  input: "$problemDetails",
                  cond: { $eq: ["$$this.difficulty", "EASY"] },
                },
              },
            },
            medium: {
              $size: {
                $filter: {
                  input: "$problemDetails",
                  cond: { $eq: ["$$this.difficulty", "MEDIUM"] },
                },
              },
            },
            hard: {
              $size: {
                $filter: {
                  input: "$problemDetails",
                  cond: { $eq: ["$$this.difficulty", "HARD"] },
                },
              },
            },
          },
          lastActivity: "$updatedAt",
        },
      },
      {
        $project: {
          title: 1,
          description: 1,
          isPublic: 1,
          createdAt: 1,
          updatedAt: 1,
          problemCount: 1,
          solvedCount: 1,
          progressPercentage: 1,
          difficultyBreakdown: 1,
          lastActivity: 1,
          problemDetails: 0, // Remove detailed problem data for list view
          solvedProblems: 0,
        },
      },
    ];

    // Add sorting
    const sortOptions = {};
    switch (sortBy) {
      case "title":
        sortOptions.title = 1;
        break;
      case "created":
        sortOptions.createdAt = -1;
        break;
      case "progress":
        sortOptions.progressPercentage = -1;
        break;
      case "problems":
        sortOptions.problemCount = -1;
        break;
      default:
        sortOptions.updatedAt = -1;
    }

    pipeline.push(
      { $sort: sortOptions },
      { $skip: skip },
      { $limit: parseInt(limit) }
    );

    const playlists = await Playlist.aggregate(pipeline);
    const total = await Playlist.countDocuments(matchConditions);

    res.json({
      playlists,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
      summary: {
        total,
        averageProgress:
          playlists.length > 0
            ? Math.round(
                playlists.reduce((sum, p) => sum + p.progressPercentage, 0) /
                  playlists.length
              )
            : 0,
        totalProblems: playlists.reduce((sum, p) => sum + p.problemCount, 0),
        totalSolved: playlists.reduce((sum, p) => sum + p.solvedCount, 0),
      },
    });
  } catch (err) {
    console.error("❌ Error fetching user playlists:", err);
    res.status(500).json({
      message: "Error fetching playlists",
      error: err.message,
    });
  }
};

// 🚀 BLAZING FAST: Comprehensive playlist details with solve status
export const getPlaylist = async (req, res) => {
  try {
    const playlistId = req.params.id;
    const userId = req.user?._id;

    // 🚀 Single aggregation for complete playlist data
    const pipeline = [
      { $match: { _id: new mongoose.Types.ObjectId(playlistId) } },
      {
        $lookup: {
          from: "problems",
          localField: "problems",
          foreignField: "_id",
          as: "problemDetails",
          pipeline: [
            {
              $project: {
                title: 1,
                description: 1,
                difficulty: 1,
                tags: 1,
                testcases: {
                  $filter: {
                    input: "$testcases",
                    cond: { $ne: ["$$this.isHidden", true] },
                  },
                },
              },
            },
          ],
        },
      },
    ];

    // Add user solve status if authenticated
    if (userId) {
      pipeline.push({
        $lookup: {
          from: "submissions",
          let: { problems: "$problems", userId: userId },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$userId", "$$userId"] },
                    { $in: ["$problemId", "$$problems"] },
                    { $eq: ["$isCorrect", true] },
                    { $eq: ["$verdict", "Accepted"] },
                  ],
                },
              },
            },
            {
              $group: {
                _id: "$problemId",
                firstSolved: { $min: "$createdAt" },
                lastSubmission: { $max: "$createdAt" },
                attempts: { $sum: 1 },
              },
            },
          ],
          as: "userSolutions",
        },
      });
    }

    pipeline.push({
      $addFields: {
        problemsWithStatus: {
          $map: {
            input: "$problemDetails",
            as: "problem",
            in: {
              $mergeObjects: [
                "$$problem",
                {
                  solved: userId
                    ? {
                        $gt: [
                          {
                            $size: {
                              $filter: {
                                input: "$userSolutions",
                                cond: { $eq: ["$$this._id", "$$problem._id"] },
                              },
                            },
                          },
                          0,
                        ],
                      }
                    : false,
                  solveInfo: userId
                    ? {
                        $let: {
                          vars: {
                            solution: {
                              $arrayElemAt: [
                                {
                                  $filter: {
                                    input: "$userSolutions",
                                    cond: {
                                      $eq: ["$$this._id", "$$problem._id"],
                                    },
                                  },
                                },
                                0,
                              ],
                            },
                          },
                          in: {
                            firstSolved: "$$solution.firstSolved",
                            lastSubmission: "$$solution.lastSubmission",
                            attempts: "$$solution.attempts",
                          },
                        },
                      }
                    : null,
                },
              ],
            },
          },
        },
        statistics: {
          totalProblems: { $size: "$problems" },
          solvedProblems: userId ? { $size: "$userSolutions" } : 0,
          difficultyBreakdown: {
            easy: {
              $size: {
                $filter: {
                  input: "$problemDetails",
                  cond: { $eq: ["$$this.difficulty", "EASY"] },
                },
              },
            },
            medium: {
              $size: {
                $filter: {
                  input: "$problemDetails",
                  cond: { $eq: ["$$this.difficulty", "MEDIUM"] },
                },
              },
            },
            hard: {
              $size: {
                $filter: {
                  input: "$problemDetails",
                  cond: { $eq: ["$$this.difficulty", "HARD"] },
                },
              },
            },
          },
          progressPercentage: userId
            ? {
                $cond: [
                  { $gt: [{ $size: "$problems" }, 0] },
                  {
                    $round: [
                      {
                        $multiply: [
                          {
                            $divide: [
                              { $size: "$userSolutions" },
                              { $size: "$problems" },
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
              }
            : 0,
        },
      },
    });

    pipeline.push({
      $project: {
        userSolutions: 0,
        problemDetails: 0, // Use problemsWithStatus instead
      },
    });

    const [playlist] = await Playlist.aggregate(pipeline);

    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found" });
    }

    res.json(playlist);
  } catch (err) {
    console.error("❌ Error fetching playlist:", err);
    res.status(500).json({
      message: "Error fetching playlist",
      error: err.message,
    });
  }
};

// ✅ Update playlist title/description
export const updatePlaylist = async (req, res) => {
  try {
    const playlist = await Playlist.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.json({ message: "Playlist updated", playlist });
  } catch (err) {
    res.status(500).json({ message: "Failed to update", error: err.message });
  }
};

// ✅ Delete playlist
export const deletePlaylist = async (req, res) => {
  try {
    await Playlist.findByIdAndDelete(req.params.id);
    res.json({ message: "Playlist deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete", error: err.message });
  }
};

// 🚀 BLAZING FAST: Optimized bulk problem addition to playlist
export const addProblemToPlaylist = async (req, res) => {
  const { problemId, problemIds } = req.body;
  const playlistId = req.params.id;

  try {
    // Handle both single and bulk additions
    const problemsToAdd = problemIds || [problemId];

    if (!problemsToAdd || problemsToAdd.length === 0) {
      return res.status(400).json({ message: "No problems specified" });
    }

    // 🚀 Validate all problems exist in single query
    const validProblems = await Problem.find({
      _id: { $in: problemsToAdd },
    })
      .select("_id title difficulty")
      .lean();

    if (validProblems.length !== problemsToAdd.length) {
      return res.status(404).json({
        message: "One or more problems not found",
        validCount: validProblems.length,
        requestedCount: problemsToAdd.length,
      });
    }

    // 🚀 Optimized playlist update with single atomic operation
    const result = await Playlist.findByIdAndUpdate(
      playlistId,
      {
        $addToSet: { problems: { $each: problemsToAdd } }, // Prevents duplicates
        $set: { updatedAt: new Date() },
      },
      {
        new: true,
        select: "title problems updatedAt",
      }
    ).lean();

    if (!result) {
      return res.status(404).json({ message: "Playlist not found" });
    }

    // Calculate how many were actually added
    const addedCount = Math.min(validProblems.length, problemsToAdd.length);

    res.json({
      message: `${addedCount} problem(s) added to playlist`,
      playlist: {
        id: result._id,
        title: result.title,
        problemCount: result.problems.length,
        addedProblems: validProblems,
        updatedAt: result.updatedAt,
      },
    });
  } catch (err) {
    console.error("❌ Error adding problems to playlist:", err);
    res.status(500).json({
      message: "Failed to add problem(s)",
      error: err.message,
    });
  }
};

// 🚀 BLAZING FAST: Optimized bulk problem removal from playlist
export const removeProblemFromPlaylist = async (req, res) => {
  const { problemId, problemIds } = req.body;
  const playlistId = req.params.id;

  try {
    // Handle both single and bulk removals
    const problemsToRemove = problemIds || [problemId];

    if (!problemsToRemove || problemsToRemove.length === 0) {
      return res.status(400).json({ message: "No problems specified" });
    }

    // 🚀 Optimized playlist update with single atomic operation
    const result = await Playlist.findByIdAndUpdate(
      playlistId,
      {
        $pullAll: { problems: problemsToRemove },
        $set: { updatedAt: new Date() },
      },
      {
        new: true,
        select: "title problems updatedAt",
      }
    ).lean();

    if (!result) {
      return res.status(404).json({ message: "Playlist not found" });
    }

    res.json({
      message: `${problemsToRemove.length} problem(s) removed from playlist`,
      playlist: {
        id: result._id,
        title: result.title,
        problemCount: result.problems.length,
        removedCount: problemsToRemove.length,
        updatedAt: result.updatedAt,
      },
    });
  } catch (err) {
    console.error("❌ Error removing problems from playlist:", err);
    res.status(500).json({
      message: "Failed to remove problem(s)",
      error: err.message,
    });
  }
};
