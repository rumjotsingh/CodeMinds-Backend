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
  const { contestId } = req.params;
  const { problemId, sourceCode, languageId } = req.body;

  // 1️⃣ Check contest exists
  const contest = await Contest.findById(contestId).lean();
  if (!contest) {
    return res.status(404).json({ message: "Contest not found" });
  }

  // 2️⃣ Verify that the problemId is in contest.problems
  const isValidProblem = contest.problems.some(
    (p) => p.toString() === problemId
  );
  if (!isValidProblem) {
    return res
      .status(400)
      .json({ message: "Problem does not belong to contest" });
  }

  // 3️⃣ Find problem and pick visible testcase
  const problem = await Problem.findById(problemId);
  if (!problem) {
    return res.status(404).json({ message: "Problem not found" });
  }

  const visibleTestcase = problem.testcases.find((tc) => !tc.isHidden);
  if (!visibleTestcase) {
    return res.status(400).json({ message: "No visible testcase to run" });
  }

  // 4️⃣ Send to Judge0
  const token = await createSubmission(
    languageId,
    sourceCode,
    visibleTestcase.input
  );
  const result = await getSubmissionResult(token);

  const expected = visibleTestcase.output.trim();
  const actual = (result.stdout || "").trim();
  const isCorrect = actual === expected;

  res.json({
    stdout: result.stdout,
    stderr: result.stderr,
    expected,
    actual,
    isCorrect,
    status: result.status,
  });
};

export const submitCodeToContest = async (req, res) => {
  const { contestId } = req.params;
  const { problemId, sourceCode, languageId } = req.body;
  const userId = req.user._id;

  const problem = await Problem.findById(problemId);
  if (!problem) return res.status(404).json({ message: "Problem not found" });

  let allPassed = true;
  let totalScore = 0;

  for (const tc of problem.testcases) {
    const token = await createSubmission(languageId, sourceCode, tc.input);
    const result = await getSubmissionResult(token);
    const actual = (result.stdout || "").trim();
    const passed = actual === tc.output.trim();

    if (!passed && tc.isHidden) allPassed = false;
    if (passed) totalScore += 10; // Example: +10 per passed testcase
  }

  await ContestSubmission.create({
    userId,
    contestId,
    problemId,
    languageId,
    sourceCode,
    totalScore,
    passedAll: allPassed,
  });

  res.json({ message: "Submitted", totalScore, passedAll: allPassed });
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
