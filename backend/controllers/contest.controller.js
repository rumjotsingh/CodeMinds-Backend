import Contest from "../models/contest.model.js";
import contestSubmissionModel from "../models/contestSubmission.model.js";
import { HEADERS, JUDGE0_URL } from "../services/judge0.service.js";

import axios from "axios";

import User from "../models/user.model.js";
import Problem from "../models/problem.model.js";
import ContestSubmission from "../models/contestSubmission.model.js";

// POST /contest (Admin)
export const createContest = async (req, res) => {
  try {
    const { title, description, problems, startTime, endTime } = req.body;
    const createdBy = req.user._id;

    const contest = await Contest.create({
      title,
      description,
      problems,
      startTime,
      endTime,
      createdBy,
    });

    res.status(201).json({ message: "Contest created", contest });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to create contest", error: error.message });
  }
};

// GET /contest
export const getAllContests = async (req, res) => {
  try {
    const contests = await Contest.find()
      .sort({ startTime: -1 })
      .populate("problems");
    res.json(contests);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch contests", error: error.message });
  }
};

// GET /contest/:id
export const getContestById = async (req, res) => {
  try {
    const contest = await Contest.findById(req.params.id).populate("problems");
    if (!contest) return res.status(404).json({ message: "Contest not found" });
    res.json(contest);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch contest", error: error.message });
  }
};

export const getUserContests = async (req, res) => {
  try {
    const userId = req.user._id;

    // Find distinct contestIds where user has submissions
    const contests = await contestSubmissionModel
      .find({ userId })
      .distinct("contestId");

    // Fetch contest details
    const contestDetails = await Contest.find({ _id: { $in: contests } });

    res.json(contestDetails);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch user contests", error: error.message });
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
    await contestSubmissionModel.create({
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
