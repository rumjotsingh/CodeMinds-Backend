import express from "express";
import {
  submitCode,
  getSubmission,
  getUserSubmissions,
  getLanguagesController,
} from "../controllers/submission.controller.js";
import { authMiddleware } from "../middleware.js";

const router = express.Router();

router.post("/submissions", authMiddleware, submitCode);
router.get("/submissions/:submissionId", authMiddleware, getSubmission);
router.get("/user/submissions", authMiddleware, getUserSubmissions);

router.get("/judge0/languages", getLanguagesController);

export default router;
