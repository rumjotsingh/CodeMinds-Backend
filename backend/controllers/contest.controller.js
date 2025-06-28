import Contest from "../models/contest.model.js";
import contestSubmissionModel from "../models/contestSubmission.model.js";
import ContestSubmission from "../models/contestSubmission.model.js";
import {
  createSubmission,
  getSubmissionResult,
} from "../services/judge0.service.js";

import User from "../models/user.model.js";
import Problem from "../models/problem.model.js";

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
export const runCodeInContest = async (req, res) => {
  try {
    const { contestId } = req.params;
    const { problemId, languageId, sourceCode } = req.body;
    const userId = req.user._id;

    // Fetch problem & visible test cases
    const problem = await Problem.findById(problemId);
    if (!problem) return res.status(404).json({ message: "Problem not found" });

    const visibleCases = problem.testcases.filter((tc) => !tc.isHidden);

    // Run on each testcase via Judge0
    let passedTestCases = [];
    for (let testcase of visibleCases) {
      const token = await createSubmission(
        languageId,
        sourceCode,
        testcase.input
      );
      const result = await getSubmissionResult(token);

      const actual = (result.stdout || "").trim();
      const expected = (testcase.output || "").trim();
      if (actual === expected) passedTestCases.push(testcase._id.toString());
    }

    res.json({
      passed: passedTestCases.length,
      total: visibleCases.length,
      passedTestCases,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to run code", error: err.message });
  }
};

// ✅ /api/contests/:contestId/submit
export const submitCodeToContest = async (req, res) => {
  try {
    const { contestId } = req.params;
    const { problemId, languageId, sourceCode } = req.body;
    const userId = req.user._id;

    // Fetch problem & all test cases
    const problem = await Problem.findById(problemId);
    if (!problem) return res.status(404).json({ message: "Problem not found" });

    let passedTestCases = [];

    for (let testcase of problem.testcases) {
      const token = await createSubmission(
        languageId,
        sourceCode,
        testcase.input
      );
      const result = await getSubmissionResult(token);

      const actual = (result.stdout || "").trim();
      const expected = (testcase.output || "").trim();
      if (actual === expected) passedTestCases.push(testcase._id.toString());
    }

    const isCorrect = passedTestCases.length === problem.testcases.length;

    // Save submission
    const submission = await ContestSubmission.create({
      userId,
      contestId,
      problemId,
      languageId,
      sourceCode,
      passedTestCases,
      isCorrect,
    });

    res.status(201).json({
      submissionId: submission._id,
      passed: passedTestCases.length,
      total: problem.testcases.length,
      isCorrect,
    });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Failed to submit code", error: err.message });
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
