// routes/leaderboardRoutes.js
import express from "express";

import { getLeaderboard } from "../controllers/leaderboard.controller.js";

const router = express.Router();

router.get("/leaderboard", getLeaderboard);

export default router;
