import express from "express";
import {
  submitCode,
  runCode, // <-- ✅ new controller
  getSubmission,
  getUserSubmissions,
  getProblemSubmissions,
  getLanguagesController,
  checkProblemSolved,
  getSolvedProblems,
  getUserStats,
} from "../controllers/submission.controller.js";
import { authMiddleware } from "../middleware.js";
import { invalidateCache, cacheMiddleware } from "../middleware/cache.js";

const router = express.Router();

// 🧪 Run code on visible testcases only (for "Run" button)
router.post("/run", authMiddleware, runCode);

// 🏁 Submit code on all testcases (including hidden, for "Submit" button)
// Invalidate leaderboard and user stats cache when successful submission
router.post(
  "/submit",
  authMiddleware,
  invalidateCache(["leaderboard:*", "problems:*"]),
  submitCode
);

// 📦 Fetch single submission by ID
router.get("/submissions/:submissionId", authMiddleware, getSubmission);

// 📜 Get all submissions by the logged-in user
router.get(
  "/user/submissions",
  authMiddleware,
  cacheMiddleware(180, "usersubmissions:"),
  getUserSubmissions
);

// ✅ Check if user has solved a specific problem
router.get(
  "/problems/:problemId/solved",
  authMiddleware,
  cacheMiddleware(300, "solved:"),
  checkProblemSolved
);

// 🎯 Get all solved problems for the current user
router.get(
  "/user/solved-problems",
  authMiddleware,
  cacheMiddleware(300, "usersolved:"),
  getSolvedProblems
);

// 📊 Get user's problem-solving statistics
router.get(
  "/user/stats",
  authMiddleware,
  cacheMiddleware(300, "userstats:"),
  getUserStats
);

// 📋 Get submissions for a specific problem by the logged-in user
router.get(
  "/submissions/problem/:problemId",
  authMiddleware,
  cacheMiddleware(180, "problemsubs:"),
  getProblemSubmissions
);

// 🔧 Judge0 languages list
router.get(
  "/judge0/languages",
  cacheMiddleware(3600, "languages:"),
  getLanguagesController
);

export default router;
