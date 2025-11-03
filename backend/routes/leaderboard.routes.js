// routes/leaderboardRoutes.js
import express from "express";
import { getLeaderboard } from "../controllers/leaderboard.controller.js";
import { cacheMiddleware } from "../middleware/cache.js";

const router = express.Router();

router.get(
  "/leaderboard",
  cacheMiddleware(300, "leaderboard:"),
  getLeaderboard
);

export default router;
