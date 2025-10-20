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
} from "../controllers/problem.controller.js";
import { authMiddleware, isAdmin } from "../middleware.js";

const router = express.Router();

// Public or Admin Dashboard
router.get("/problems", getAllProblems);
router.get("/problems/by-tags", getProblemsByTags);
router.get("/problems/tags", getAllTags);
router.get("/problems/tags/grouped", getGroupedTags);
router.get("/problems/filter", getProblemsByCategories);

router.get("/problems/:id", getProblemById); // ❗ Place dynamic last
// Okay here or top

// Admin only
router.post("/problems", authMiddleware, isAdmin, createProblem);
router.put("/problems/:id", authMiddleware, isAdmin, updateProblem);
router.delete("/problems/:id", authMiddleware, isAdmin, deleteProblem);

export default router;
