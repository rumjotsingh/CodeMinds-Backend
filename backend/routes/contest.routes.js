import express from "express";
import {
  createContest,
  getAllContests,
  getContestById,
  getContestLeaderboard,
  getUserContests,
  getUserSubmissionsInContest,
  runCodeInContest,
  submitCodeToContest,
} from "../controllers/contest.controller.js";
import { authMiddleware, checkContestActive, isAdmin } from "../middleware.js";

const router = express.Router();

// ✅ Admin routes
router.post("/contest", authMiddleware, isAdmin, createContest);

// ✅ Public routes
router.get("/contest", getAllContests);
router.get("/contest/:id", getContestById);
router.get("/contest/:id/leaderboard", getContestLeaderboard);

// ✅ User routes
router.post(
  "/contest/:contestId/run",
  authMiddleware,
  checkContestActive,
  runCodeInContest
);
router.post(
  "/contest/:contestId/submit",
  authMiddleware,
  checkContestActive,
  submitCodeToContest
);
router.get("/user/contests", authMiddleware, getUserContests);
router.get(
  "/contest/:contestId/my-submissions",
  authMiddleware,
  getUserSubmissionsInContest
);

export default router;
