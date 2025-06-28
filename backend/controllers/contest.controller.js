import Contest from "../models/contest.model.js";
import contestSubmissionModel from "../models/contestSubmission.model.js";
import ContestSubmission from "../models/contestSubmission.model.js";
import {
  createSubmission,
  getSubmissionResult,
} from "../services/judge0.service.js";

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

// POST /contest/:id/submit
export const submitToContest = async (req, res) => {
  try {
    const contestId = req.params.id;
    const { problemId, sourceCode, languageId } = req.body;
    const userId = req.user._id;

    // Create submission with Judge0
    const token = await createSubmission(languageId, sourceCode);

    const submission = await ContestSubmission.create({
      userId,
      contestId,
      problemId,
      languageId,
      sourceCode,
      token,
    });

    res
      .status(201)
      .json({
        message: "Submission created",
        submissionId: submission._id,
        token,
      });
  } catch (error) {
    res.status(500).json({ message: "Failed to submit", error: error.message });
  }
};

// GET /contest/:id/leaderboard
export const getContestLeaderboard = async (req, res) => {
  try {
    const contestId = req.params.id;

    // Find all submissions in this contest
    const submissions = await ContestSubmission.find({ contestId }).populate(
      "userId"
    );

    // Count how many unique problems each user solved (status accepted)
    const userStats = {};

    for (const sub of submissions) {
      const result = await getSubmissionResult(sub.token);
      if (result.status && result.status.description === "Accepted") {
        const uid = sub.userId._id.toString();
        if (!userStats[uid]) {
          userStats[uid] = {
            username: sub.userId.username || sub.userId.email,
            problemsSolved: new Set(),
            totalTime: 0, // you can calculate total time based on createdAt etc.
          };
        }
        userStats[uid].problemsSolved.add(sub.problemId.toString());
      }
    }

    // Convert to array & count unique problems
    const leaderboard = Object.values(userStats).map((user) => ({
      username: user.username,
      problemsSolved: user.problemsSolved.size,
      totalTime: user.totalTime,
    }));

    leaderboard.sort((a, b) => b.problemsSolved - a.problemsSolved);

    res.json(leaderboard);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch leaderboard", error: error.message });
  }
};

// GET /user/contests
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
