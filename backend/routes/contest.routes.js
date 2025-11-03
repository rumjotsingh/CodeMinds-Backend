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
import { invalidateCache, cacheMiddleware } from "../middleware/cache.js";

const router = express.Router();

// ✅ Admin routes
router.post(
  "/contest",
  authMiddleware,
  isAdmin,
  invalidateCache(["contests:*"]),
  createContest
);

// ✅ Public routes
router.get("/contest", cacheMiddleware(300, "contests:"), getAllContests);
router.get("/contest/:id", cacheMiddleware(300, "contest:"), getContestById);
router.get(
  "/contest/:id/leaderboard",
  cacheMiddleware(180, "contestleaderboard:"),
  getContestLeaderboard
);

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
  invalidateCache(["contestleaderboard:*"]),
  submitCodeToContest
);
router.get(
  "/user/contests",
  authMiddleware,
  cacheMiddleware(300, "usercontests:"),
  getUserContests
);
router.get(
  "/contest/:contestId/my-submissions",
  authMiddleware,
  cacheMiddleware(180, "contestsubs:"),
  getUserSubmissionsInContest
);

export default router;
