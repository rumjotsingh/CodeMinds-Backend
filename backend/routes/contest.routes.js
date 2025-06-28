import express from "express";
import {
  createContest,
  getAllContests,
  getContestById,
  submitToContest,
  getContestLeaderboard,
  getUserContests,
} from "../controllers/contest.controller.js";
import { authMiddleware, isAdmin } from "../middleware.js";

const router = express.Router();

// Admin-only
router.post("/contest", authMiddleware, isAdmin, createContest);

// Public
router.get("/contest", getAllContests);
router.get("/contest/:id", getContestById);
router.get("/contest/:id/leaderboard", getContestLeaderboard);

// User
router.post("/contest/:id/submit", authMiddleware, submitToContest);
router.get("/user/contests", authMiddleware, getUserContests);

export default router;
