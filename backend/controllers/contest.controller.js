import Contest from "../models/contest.model.js";

import axios from "axios";

import User from "../models/user.model.js";
import Problem from "../models/problem.model.js";
import { HEADERS, JUDGE0_URL } from "../services/judge0.service.js";
import ContestSubmission from "../models/contestSubmission.model.js";
import mongoose from "mongoose";

// 🚀 BLAZING FAST: Optimized contest creation with validation
export const createContest = async (req, res) => {
  try {
    const { title, description, problems, startTime, endTime } = req.body;
    const createdBy = req.user._id;

    // Validate input
    if (!title || !startTime || !endTime || !problems?.length) {
      return res.status(400).json({
        message: "Title, start time, end time, and problems are required",
      });
    }

    // Validate time constraints
    const start = new Date(startTime);
    const end = new Date(endTime);
    const now = new Date();

    if (start >= end) {
      return res
        .status(400)
        .json({ message: "End time must be after start time" });
    }

    if (start < now) {
      return res
        .status(400)
        .json({ message: "Start time cannot be in the past" });
    }

    // 🚀 Validate problems exist in single query
    const validProblems = await Problem.find({
      _id: { $in: problems },
    })
      .select("_id title difficulty")
      .lean();

    if (validProblems.length !== problems.length) {
      return res
        .status(400)
        .json({ message: "One or more problems not found" });
    }

    const contest = await Contest.create({
      title: title.trim(),
      description: description?.trim(),
      problems,
      startTime: start,
      endTime: end,
      createdBy,
      status: start > now ? "upcoming" : "active",
    });

    res.status(201).json({
      message: "Contest created successfully",
      contest: {
        ...contest.toObject(),
        problemCount: problems.length,
        duration: Math.round((end - start) / (1000 * 60)), // Duration in minutes
        validProblems,
      },
    });
  } catch (error) {
    console.error("❌ Error creating contest:", error);
    res.status(500).json({
      message: "Failed to create contest",
      error: error.message,
    });
  }
};

// 🚀 BLAZING FAST: Ultra-optimized contest listing with pagination and status
export const getAllContests = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const skip = (page - 1) * limit;
    const now = new Date();

    // Build match conditions
    const matchConditions = {};

    if (status) {
      switch (status.toLowerCase()) {
        case "upcoming":
          matchConditions.startTime = { $gt: now };
          break;
        case "active":
          matchConditions.startTime = { $lte: now };
          matchConditions.endTime = { $gt: now };
          break;
        case "ended":
          matchConditions.endTime = { $lte: now };
          break;
      }
    }

    if (search) {
      matchConditions.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // 🚀 Optimized aggregation pipeline
    const pipeline = [
      { $match: matchConditions },
      {
        $lookup: {
          from: "problems",
          localField: "problems",
          foreignField: "_id",
          as: "problemDetails",
          pipeline: [{ $project: { title: 1, difficulty: 1 } }],
        },
      },
      {
        $lookup: {
          from: "contestsubmissions",
          localField: "_id",
          foreignField: "contestId",
          as: "submissions",
        },
      },
      {
        $addFields: {
          status: {
            $cond: [
              { $gt: ["$startTime", now] },
              "upcoming",
              {
                $cond: [{ $gt: ["$endTime", now] }, "active", "ended"],
              },
            ],
          },
          duration: {
            $divide: [
              { $subtract: ["$endTime", "$startTime"] },
              1000 * 60, // Convert to minutes
            ],
          },
          participantCount: {
            $size: { $setUnion: ["$submissions.userId", []] },
          },
          submissionCount: { $size: "$submissions" },
          problemCount: { $size: "$problems" },
        },
      },
      {
        $project: {
          title: 1,
          description: 1,
          startTime: 1,
          endTime: 1,
          status: 1,
          duration: 1,
          participantCount: 1,
          submissionCount: 1,
          problemCount: 1,
          problemDetails: 1,
          createdAt: 1,
        },
      },
      { $sort: { startTime: -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) },
    ];

    const contests = await Contest.aggregate(pipeline);
    const total = await Contest.countDocuments(matchConditions);

    res.json({
      contests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
      summary: {
        total,
        active: contests.filter((c) => c.status === "active").length,
        upcoming: contests.filter((c) => c.status === "upcoming").length,
        ended: contests.filter((c) => c.status === "ended").length,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching contests:", error);
    res.status(500).json({
      message: "Failed to fetch contests",
      error: error.message,
    });
  }
};

// 🚀 BLAZING FAST: Optimized contest details with comprehensive metrics
export const getContestById = async (req, res) => {
  try {
    const contestId = req.params.id;
    const userId = req.user?._id;
    const now = new Date();

    // 🚀 Single aggregation pipeline for all contest data
    const pipeline = [
      { $match: { _id: new mongoose.Types.ObjectId(contestId) } },
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
      {
        $lookup: {
          from: "contestsubmissions",
          localField: "_id",
          foreignField: "contestId",
          as: "allSubmissions",
        },
      },
    ];

    // Add user-specific data if authenticated
    if (userId) {
      pipeline.push({
        $lookup: {
          from: "contestsubmissions",
          let: { contestId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$contestId", "$$contestId"] },
                    { $eq: ["$userId", userId] },
                  ],
                },
              },
            },
            { $sort: { createdAt: -1 } },
          ],
          as: "userSubmissions",
        },
      });
    }

    pipeline.push({
      $addFields: {
        status: {
          $cond: [
            { $gt: ["$startTime", now] },
            "upcoming",
            {
              $cond: [{ $gt: ["$endTime", now] }, "active", "ended"],
            },
          ],
        },
        duration: {
          $divide: [
            { $subtract: ["$endTime", "$startTime"] },
            1000 * 60, // Minutes
          ],
        },
        timeRemaining: {
          $cond: [
            {
              $and: [{ $lte: ["$startTime", now] }, { $gt: ["$endTime", now] }],
            },
            { $divide: [{ $subtract: ["$endTime", now] }, 1000] }, // Seconds
            null,
          ],
        },
        leaderboard: {
          $slice: [
            {
              $map: {
                input: {
                  $slice: [
                    {
                      $sortArray: {
                        input: {
                          $reduce: {
                            input: "$allSubmissions",
                            initialValue: [],
                            in: {
                              $concatArrays: [
                                "$$value",
                                [
                                  {
                                    userId: "$$this.userId",
                                    score: {
                                      $cond: ["$$this.isCorrect", 1, 0],
                                    },
                                    submissionTime: "$$this.createdAt",
                                  },
                                ],
                              ],
                            },
                          },
                        },
                        sortBy: { score: -1, submissionTime: 1 },
                      },
                    },
                    10, // Top 10
                  ],
                },
                as: "entry",
                in: {
                  userId: "$$entry.userId",
                  score: "$$entry.score",
                  submissionTime: "$$entry.submissionTime",
                },
              },
            },
            10,
          ],
        },
        participantCount: {
          $size: { $setUnion: ["$allSubmissions.userId", []] },
        },
        totalSubmissions: { $size: "$allSubmissions" },
      },
    });

    const [contest] = await Contest.aggregate(pipeline);

    if (!contest) {
      return res.status(404).json({ message: "Contest not found" });
    }

    res.json(contest);
  } catch (error) {
    console.error("❌ Error fetching contest:", error);
    res.status(500).json({
      message: "Failed to fetch contest",
      error: error.message,
    });
  }
};

// 🚀 BLAZING FAST: Optimized user contests with participation stats
export const getUserContests = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 10, status } = req.query;
    const skip = (page - 1) * limit;
    const now = new Date();

    // 🚀 Optimized aggregation to get user's contest participation
    const pipeline = [
      { $match: { userId } },
      {
        $group: {
          _id: "$contestId",
          submissions: { $sum: 1 },
          correctSubmissions: {
            $sum: { $cond: ["$isCorrect", 1, 0] },
          },
          lastSubmission: { $max: "$createdAt" },
          bestScore: { $max: { $cond: ["$isCorrect", 1, 0] } },
        },
      },
      {
        $lookup: {
          from: "contests",
          localField: "_id",
          foreignField: "_id",
          as: "contest",
        },
      },
      { $unwind: "$contest" },
    ];

    // Add status filter if provided
    if (status) {
      const statusMatch = {};
      switch (status.toLowerCase()) {
        case "upcoming":
          statusMatch["contest.startTime"] = { $gt: now };
          break;
        case "active":
          statusMatch["contest.startTime"] = { $lte: now };
          statusMatch["contest.endTime"] = { $gt: now };
          break;
        case "ended":
          statusMatch["contest.endTime"] = { $lte: now };
          break;
      }
      pipeline.push({ $match: statusMatch });
    }

    pipeline.push(
      {
        $addFields: {
          "contest.status": {
            $cond: [
              { $gt: ["$contest.startTime", now] },
              "upcoming",
              {
                $cond: [{ $gt: ["$contest.endTime", now] }, "active", "ended"],
              },
            ],
          },
          "contest.userStats": {
            submissions: "$submissions",
            correctSubmissions: "$correctSubmissions",
            successRate: {
              $cond: [
                { $gt: ["$submissions", 0] },
                {
                  $multiply: [
                    { $divide: ["$correctSubmissions", "$submissions"] },
                    100,
                  ],
                },
                0,
              ],
            },
            lastSubmission: "$lastSubmission",
            bestScore: "$bestScore",
          },
        },
      },
      {
        $project: {
          contestId: "$contest._id",
          title: "$contest.title",
          description: "$contest.description",
          startTime: "$contest.startTime",
          endTime: "$contest.endTime",
          status: "$contest.status",
          userStats: "$contest.userStats",
        },
      },
      { $sort: { startTime: -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) }
    );

    const userContests = await ContestSubmission.aggregate(pipeline);

    // Get total count
    const totalCountPipeline = pipeline.slice(0, -3); // Remove sort, skip, limit
    totalCountPipeline.push({ $count: "total" });
    const [totalResult] = await ContestSubmission.aggregate(totalCountPipeline);
    const total = totalResult?.total || 0;

    res.json({
      contests: userContests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
      summary: {
        totalParticipated: total,
        active: userContests.filter((c) => c.status === "active").length,
        completed: userContests.filter((c) => c.status === "ended").length,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching user contests:", error);
    res.status(500).json({
      message: "Failed to fetch user contests",
      error: error.message,
    });
  }
};
// controllers/contestSubmission.controller.js

export const runCodeInContest = async (req, res) => {
  try {
    const { contestId } = req.params;
    const { problemId, languageId, sourceCode } = req.body;

    const problem = await Problem.findById(problemId);
    if (!problem) return res.status(404).json({ message: "Problem not found" });

    const visibleTestcases = (problem.testcases || []).filter(
      (tc) => !tc.isHidden
    );
    const testResults = [];

    for (const testcase of visibleTestcases) {
      const submissionRes = await axios.post(
        `${JUDGE0_URL}/submissions?base64_encoded=false&wait=true`,
        {
          language_id: languageId,
          source_code: sourceCode,
          stdin: testcase.input,
        },
        { headers: HEADERS }
      );

      const result = submissionRes.data;
      const actual = (result.stdout || "").trim();
      const expected = (testcase.output || "").trim();
      const isPassed = actual === expected;

      testResults.push({
        input: testcase.input,
        expectedOutput: expected,
        actualOutput: actual,
        passed: isPassed,
        time: result.time,
        memory: result.memory,
      });
    }

    res.json({
      totalTestcases: visibleTestcases.length,
      passedTestcases: testResults.filter((t) => t.passed).length,
      testResults,
    });
  } catch (err) {
    console.error("❌ runCodeInContest error:", err.message);
    res.status(500).json({ message: "Run failed", error: err.message });
  }
};

export const submitCodeToContest = async (req, res) => {
  try {
    const { contestId } = req.params;
    const { problemId, languageId, sourceCode } = req.body;
    const userId = req.user._id;

    const problem = await Problem.findById(problemId);
    if (!problem) return res.status(404).json({ message: "Problem not found" });

    const testcases = problem.testcases || [];
    let passed = 0;
    const testResults = [];

    for (const testcase of testcases) {
      const submissionRes = await axios.post(
        `${JUDGE0_URL}/submissions?base64_encoded=false&wait=true`,
        {
          language_id: languageId,
          source_code: sourceCode,
          stdin: testcase.input,
        },
        { headers: HEADERS }
      );

      const result = submissionRes.data;
      const actual = (result.stdout || "").trim();
      const expected = (testcase.output || "").trim();
      const isPassed = actual === expected;

      if (isPassed) passed++;

      testResults.push({
        input: testcase.input,
        expectedOutput: expected,
        actualOutput: actual,
        passed: isPassed,
        time: result.time,
        memory: result.memory,
      });
    }

    const total = testcases.length;
    const scorePerTestcase = 100 / total;
    const totalScore = passed * scorePerTestcase;

    // Save to ContestSubmission
    await ContestSubmission.create({
      userId,
      contestId,
      problemId,
      languageId,
      sourceCode,
      passedTestcases: passed,
      totalTestcases: total,
      score: totalScore,
      testResults,
    });

    res.status(201).json({
      message: "Submitted",
      totalScore,
      passedAll: passed === total,
      passedTestcases: passed,
      totalTestcases: total,
      testResults,
    });
  } catch (err) {
    console.error("❌ submitCodeToContest error:", err.message);
    res.status(500).json({ message: "Submit failed", error: err.message });
  }
};

// GET /api/contests/:contestId/leaderboard
export const getContestLeaderboard = async (req, res) => {
  try {
    const { contestId } = req.params;

    // Aggregate correct submissions per user
    const leaderboard = await ContestSubmission.aggregate([
      {
        $match: {
          contestId: new mongoose.Types.ObjectId(contestId),
          isCorrect: true,
        },
      },
      {
        $group: {
          _id: "$userId",
          solvedCount: { $sum: 1 },
          lastSubmissionTime: { $max: "$createdAt" },
        },
      },
      { $sort: { solvedCount: -1, lastSubmissionTime: 1 } },
    ]);

    // Populate usernames
    const withUsers = await Promise.all(
      leaderboard.map(async (item) => {
        const user = await User.findById(item._id, "username");
        return {
          userId: item._id,
          username: user?.username || "Unknown",
          solvedCount: item.solvedCount,
          lastSubmissionTime: item.lastSubmissionTime,
        };
      })
    );

    res.json(withUsers);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Failed to fetch leaderboard", error: err.message });
  }
};
export const getUserSubmissionsInContest = async (req, res) => {
  const submissions = await ContestSubmission.find({
    contestId: req.params.contestId,
    userId: req.user._id,
  });
  res.json(submissions);
};
