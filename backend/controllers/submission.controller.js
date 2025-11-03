import Submission from "../models/submission.model.js";
import {
  getLanguages,
  HEADERS,
  JUDGE0_URL,
} from "../services/judge0.service.js";

import Problem from "../models/problem.model.js";
import axios from "axios";

// controllers/contestSubmission.controller.js

import User from "../models/user.model.js";

export const submitCode = async (req, res) => {
  try {
    const { problemId, languageId, sourceCode } = req.body;
    const userId = req.user._id;

    const problem = await Problem.findById(problemId);
    if (!problem) return res.status(404).json({ message: "Problem not found" });

    const testcases = problem.testcases || [];
    let passed = 0;
    const testResults = [];

    // 🧪 Run code on each testcase
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
    const isCorrect = passed === total;

    // 📝 Save submission
    const submission = await Submission.create({
      userId,
      problemId,
      languageId,
      sourceCode,
      passedTestCases: passed,
      totalTestCases: total,
      isCorrect,
      verdict: isCorrect ? "Accepted" : "Wrong Answer",
      testResults,
    });

    // 🔥 Update streak if all testcases passed
    if (isCorrect) {
      const user = await User.findById(userId);
      const today = new Date().toISOString().split("T")[0];
      const yesterday = new Date(Date.now() - 86400000)
        .toISOString()
        .split("T")[0];
      const last = user.lastSolvedDate?.toISOString().split("T")[0];

      if (last === yesterday) user.streak += 1;
      else if (last !== today) user.streak = 1;

      user.lastSolvedDate = new Date();
      if (!user.calendar) user.calendar = new Map();
      user.calendar.set(today, true);

      await user.save();
    }

    res.status(201).json({
      submissionId: submission._id,
      isCorrect,
      passedTestCases: passed,
      totalTestCases: total,
      testResults,
    });
  } catch (err) {
    console.error("❌ submitCode error:", err.message);
    res.status(500).json({ message: "Submission failed", error: err.message });
  }
};
export const runCode = async (req, res) => {
  try {
    const { problemId, languageId, sourceCode } = req.body;
    const problem = await Problem.findById(problemId);
    if (!problem) return res.status(404).json({ message: "Problem not found" });

    // Filter only visible testcases
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
    console.error("❌ runCode error:", err.message);
    res.status(500).json({ message: "Run failed", error: err.message });
  }
};

export const getSubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const submission = await Submission.findById(submissionId);
    if (!submission) return res.status(404).json({ message: "Not found" });

    res.json(submission);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching submission", error: err.message });
  }
};

// 🚀 BLAZING FAST: Optimized user submissions with aggregation
export const getUserSubmissions = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, problemId } = req.query;
    const skip = (page - 1) * limit;
    const userId = req.user._id;

    // Build match conditions
    const matchConditions = { userId };

    if (status) {
      matchConditions.verdict = status;
    }

    if (problemId) {
      matchConditions.problemId = problemId;
    }

    // 🚀 Optimized aggregation pipeline
    const pipeline = [
      { $match: matchConditions },
      {
        $lookup: {
          from: "problems",
          localField: "problemId",
          foreignField: "_id",
          as: "problem",
          pipeline: [{ $project: { title: 1, difficulty: 1, tags: 1 } }],
        },
      },
      {
        $addFields: {
          problem: { $arrayElemAt: ["$problem", 0] },
        },
      },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) },
      {
        $project: {
          sourceCode: 0, // Exclude source code for performance
          testResults: 0, // Exclude test results for list view
        },
      },
    ];

    const submissions = await Submission.aggregate(pipeline);
    const total = await Submission.countDocuments(matchConditions);

    res.json({
      submissions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("❌ Error fetching user submissions:", err);
    res.status(500).json({
      message: "Error fetching submissions",
      error: err.message,
    });
  }
};

// 🚀 BLAZING FAST: Optimized problem submissions with statistics
export const getProblemSubmissions = async (req, res) => {
  try {
    const { problemId } = req.params;
    const { page = 1, limit = 15 } = req.query;
    const skip = (page - 1) * limit;
    const userId = req.user._id;

    // 🚀 Get submissions with statistics in single aggregation
    const pipeline = [
      {
        $match: {
          problemId,
          userId,
        },
      },
      {
        $facet: {
          submissions: [
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: parseInt(limit) },
            {
              $project: {
                createdAt: 1,
                verdict: 1,
                passedTestCases: 1,
                totalTestCases: 1,
                languageId: 1,
                isCorrect: 1,
              },
            },
          ],
          stats: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                accepted: {
                  $sum: { $cond: [{ $eq: ["$verdict", "Accepted"] }, 1, 0] },
                },
                bestSubmission: {
                  $first: {
                    $cond: [
                      { $eq: ["$verdict", "Accepted"] },
                      { createdAt: "$createdAt", submissionId: "$_id" },
                      null,
                    ],
                  },
                },
              },
            },
          ],
        },
      },
    ];

    const [result] = await Submission.aggregate(pipeline);
    const submissions = result.submissions;
    const stats = result.stats[0] || {
      total: 0,
      accepted: 0,
      bestSubmission: null,
    };

    res.json({
      submissions,
      stats,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: stats.total,
        pages: Math.ceil(stats.total / limit),
      },
    });
  } catch (err) {
    console.error("❌ Error fetching problem submissions:", err);
    res.status(500).json({
      message: "Error fetching problem submissions",
      error: err.message,
    });
  }
};

// 🚀 BLAZING FAST: Lightning-fast problem solve check
export const checkProblemSolved = async (req, res) => {
  try {
    const { problemId } = req.params;
    const userId = req.user._id;

    // 🚀 Single optimized query with projection
    const solvedSubmission = await Submission.findOne({
      problemId,
      userId,
      isCorrect: true,
      verdict: "Accepted",
    })
      .select("createdAt languageId passedTestCases totalTestCases")
      .sort({ createdAt: 1 })
      .lean(); // Use lean for better performance

    if (solvedSubmission) {
      return res.json({
        solved: true,
        solvedAt: solvedSubmission.createdAt,
        submissionId: solvedSubmission._id,
        languageId: solvedSubmission.languageId,
        passedTestCases: solvedSubmission.passedTestCases,
        totalTestCases: solvedSubmission.totalTestCases,
      });
    }

    res.json({
      solved: false,
      message: "Problem not solved yet",
    });
  } catch (err) {
    console.error("❌ Error checking problem status:", err);
    res.status(500).json({
      message: "Error checking problem status",
      error: err.message,
    });
  }
};

// 🚀 BLAZING FAST: Optimized solved problems with single aggregation
export const getSolvedProblems = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 50, difficulty, tags } = req.query;
    const skip = (page - 1) * limit;

    // 🚀 Advanced aggregation pipeline for solved problems
    const pipeline = [
      {
        $match: {
          userId,
          isCorrect: true,
          verdict: "Accepted",
        },
      },
      {
        $group: {
          _id: "$problemId",
          firstSolvedAt: { $min: "$createdAt" },
          totalAttempts: { $sum: 1 },
          bestLanguage: { $first: "$languageId" },
          bestTime: { $min: "$createdAt" },
        },
      },
      {
        $lookup: {
          from: "problems",
          localField: "_id",
          foreignField: "_id",
          as: "problem",
          pipeline: [
            { $project: { title: 1, difficulty: 1, tags: 1, description: 1 } },
          ],
        },
      },
      {
        $unwind: "$problem",
      },
    ];

    // Add difficulty filter if provided
    if (difficulty) {
      const difficultyArray = difficulty
        .split(",")
        .map((d) => d.trim().toUpperCase());
      pipeline.push({
        $match: { "problem.difficulty": { $in: difficultyArray } },
      });
    }

    // Add tag filter if provided
    if (tags) {
      const tagArray = tags
        .split(",")
        .map((tag) => new RegExp(`^${tag.trim()}$`, "i"));
      pipeline.push({
        $match: { "problem.tags": { $in: tagArray } },
      });
    }

    // Add final projection, sort, and pagination
    pipeline.push(
      {
        $project: {
          problemId: "$_id",
          title: "$problem.title",
          difficulty: "$problem.difficulty",
          tags: "$problem.tags",
          firstSolvedAt: 1,
          totalAttempts: 1,
          bestLanguage: 1,
          _id: 0,
        },
      },
      { $sort: { firstSolvedAt: -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) }
    );

    const [solvedProblems, totalCount] = await Promise.all([
      Submission.aggregate(pipeline),
      Submission.aggregate([
        ...pipeline.slice(0, -3), // Remove sort, skip, limit
        { $count: "total" },
      ]),
    ]);

    const total = totalCount[0]?.total || 0;

    res.json({
      totalSolved: total,
      problems: solvedProblems,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("❌ Error fetching solved problems:", err);
    res.status(500).json({
      message: "Error fetching solved problems",
      error: err.message,
    });
  }
};

// 🚀 BLAZING FAST: Lightning-speed user statistics with comprehensive metrics
export const getUserStats = async (req, res) => {
  try {
    const userId = req.user._id;

    // 🚀 Single ultra-optimized aggregation pipeline for all stats
    const pipeline = [
      {
        $facet: {
          // Solved problems by difficulty
          solvedByDifficulty: [
            {
              $match: {
                userId,
                isCorrect: true,
                verdict: "Accepted",
              },
            },
            {
              $group: {
                _id: "$problemId",
                firstSolved: { $min: "$createdAt" },
              },
            },
            {
              $lookup: {
                from: "problems",
                localField: "_id",
                foreignField: "_id",
                as: "problem",
                pipeline: [{ $project: { difficulty: 1 } }],
              },
            },
            { $unwind: "$problem" },
            {
              $group: {
                _id: "$problem.difficulty",
                count: { $sum: 1 },
                firstSolvedDate: { $min: "$firstSolved" },
              },
            },
          ],
          // Total attempts and recent activity
          activityStats: [
            { $match: { userId } },
            {
              $group: {
                _id: null,
                totalAttempts: { $sum: 1 },
                acceptedSubmissions: {
                  $sum: { $cond: [{ $eq: ["$verdict", "Accepted"] }, 1, 0] },
                },
                recentActivity: {
                  $push: {
                    $cond: [
                      {
                        $gte: [
                          "$createdAt",
                          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                        ],
                      },
                      { createdAt: "$createdAt", verdict: "$verdict" },
                      "$$REMOVE",
                    ],
                  },
                },
                languages: { $addToSet: "$languageId" },
              },
            },
          ],
        },
      },
    ];

    const [result] = await Submission.aggregate(pipeline);
    const solvedByDifficulty = result.solvedByDifficulty || [];
    const activityStats = result.activityStats[0] || {};

    // Format difficulty stats
    const difficultyStats = {
      totalSolved: 0,
      easy: 0,
      medium: 0,
      hard: 0,
    };

    solvedByDifficulty.forEach((stat) => {
      const difficulty = stat._id?.toLowerCase();
      if (difficulty && difficultyStats.hasOwnProperty(difficulty)) {
        difficultyStats[difficulty] = stat.count;
        difficultyStats.totalSolved += stat.count;
      }
    });

    // Calculate acceptance rate
    const acceptanceRate =
      activityStats.totalAttempts > 0
        ? Math.round(
            (activityStats.acceptedSubmissions / activityStats.totalAttempts) *
              100
          )
        : 0;

    // Get user profile data
    const user = await User.findById(userId)
      .select("streak lastSolvedDate calendar")
      .lean();

    res.json({
      stats: difficultyStats,
      totalAttempts: activityStats.totalAttempts || 0,
      acceptanceRate,
      streak: user?.streak || 0,
      lastSolvedDate: user?.lastSolvedDate,
      recentActivity: activityStats.recentActivity || [],
      languagesUsed: (activityStats.languages || []).length,
      performance: {
        easy: difficultyStats.easy,
        medium: difficultyStats.medium,
        hard: difficultyStats.hard,
        total: difficultyStats.totalSolved,
      },
    });
  } catch (err) {
    console.error("❌ Error fetching user stats:", err);
    res.status(500).json({
      message: "Error fetching user statistics",
      error: err.message,
    });
  }
};

// 🚀 BLAZING FAST: Optimized languages controller
export const getLanguagesController = async (req, res) => {
  try {
    const languages = await getLanguages();

    // Optional: filter allowed language IDs for better performance
    const allowedIds = [71, 54, 62, 50, 51, 63]; // Python, C++, Java, C, C#, JavaScript
    const filtered = languages.filter((lang) => allowedIds.includes(lang.id));

    res.status(200).json(filtered);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch languages", error: err.message });
  }
};
