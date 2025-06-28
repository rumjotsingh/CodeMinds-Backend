import express from "express";
import {
  submitCode,
  runCode, // <-- ✅ new controller
  getSubmission,
  getUserSubmissions,
  getLanguagesController,
} from "../controllers/submission.controller.js";
import { authMiddleware } from "../middleware.js";

const router = express.Router();

// 🧪 Run code on visible testcases only (for "Run" button)
router.post("/run", authMiddleware, runCode);

// 🏁 Submit code on all testcases (including hidden, for "Submit" button)
router.post("/submit", authMiddleware, submitCode);

// 📦 Fetch single submission by ID
router.get("/submissions/:submissionId", authMiddleware, getSubmission);

// 📜 Get all submissions by the logged-in user
router.get("/user/submissions", authMiddleware, getUserSubmissions);

// 🔧 Judge0 languages list
router.get("/judge0/languages", getLanguagesController);

export default router;
