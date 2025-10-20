import express from "express";
import {
  createProblem,
  getAllProblems,
  getProblemById,
  updateProblem,
  deleteProblem,
  getProblemsByTags,
  getAllTags,
  getGroupedTags,
  getProblemsByCategories,
  searchProblems,
} from "../controllers/problem.controller.js";
import { authMiddleware, isAdmin, optionalAuth } from "../middleware.js";

const router = express.Router();

// Public or Admin Dashboard (with optional auth to show solved status)
router.get("/problems", optionalAuth, getAllProblems);
router.get("/problems/search", optionalAuth, searchProblems);
router.get("/problems/by-tags", optionalAuth, getProblemsByTags);
router.get("/problems/tags", getAllTags);
router.get("/problems/tags/grouped", getGroupedTags);
router.get("/problems/filter", optionalAuth, getProblemsByCategories);

router.get("/problems/:id", optionalAuth, getProblemById); // ❗ Place dynamic last
// Okay here or top

// Admin only
router.post("/problems", authMiddleware, isAdmin, createProblem);
router.put("/problems/:id", authMiddleware, isAdmin, updateProblem);
router.delete("/problems/:id", authMiddleware, isAdmin, deleteProblem);

export default router;
