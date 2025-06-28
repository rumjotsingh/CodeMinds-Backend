import express from "express";
import {
  createContest,
  getAllContests,
  getContestById,
  getContestLeaderboard,
  getUserContests,
  runCodeInContest,
  submitCodeToContest,
} from "../controllers/contest.controller.js";
import { authMiddleware, checkContestActive, isAdmin } from "../middleware.js";

const router = express.Router();

// Admin-only
router.post("/contest", authMiddleware, isAdmin, createContest);

// Public
router.get("/contest", getAllContests);
router.get("/contest/:id", getContestById);
router.get("/contest/:id/leaderboard", getContestLeaderboard);

// User
router.post(
  "/:contestId/run",
  authMiddleware,
  checkContestActive,
  runCodeInContest
);
router.post(
  "/:contestId/submit",
  authMiddleware,
  checkContestActive,
  submitCodeToContest
);
router.get("/user/contests", authMiddleware, getUserContests);

export default router;
