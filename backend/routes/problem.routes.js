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
import { cacheMiddleware, invalidateCache } from "../middleware/cache.js";

const router = express.Router();

// Public or Admin Dashboard (with optional auth to show solved status)
router.get(
  "/problems",
  optionalAuth,
  cacheMiddleware(300, "problems:"),
  getAllProblems
);
router.get(
  "/problems/search",
  optionalAuth,
  cacheMiddleware(180, "search:"),
  searchProblems
);
router.get(
  "/problems/by-tags",
  optionalAuth,
  cacheMiddleware(300, "tags:"),
  getProblemsByTags
);
router.get("/problems/tags", cacheMiddleware(600, "alltags:"), getAllTags);
router.get(
  "/problems/tags/grouped",
  cacheMiddleware(600, "grouped:"),
  getGroupedTags
);
router.get(
  "/problems/filter",
  optionalAuth,
  cacheMiddleware(300, "filter:"),
  getProblemsByCategories
);

router.get(
  "/problems/:id",
  optionalAuth,
  cacheMiddleware(300, "problem:"),
  getProblemById
);

// Admin only (with cache invalidation)
router.post(
  "/problems",
  authMiddleware,
  isAdmin,
  invalidateCache([
    "problems:*",
    "tags:*",
    "alltags:*",
    "grouped:*",
    "filter:*",
  ]),
  createProblem
);
router.put(
  "/problems/:id",
  authMiddleware,
  isAdmin,
  invalidateCache(["problems:*", "tags:*", "problem:*", "filter:*"]),
  updateProblem
);
router.delete(
  "/problems/:id",
  authMiddleware,
  isAdmin,
  invalidateCache(["problems:*", "tags:*", "problem:*", "filter:*"]),
  deleteProblem
);

export default router;
