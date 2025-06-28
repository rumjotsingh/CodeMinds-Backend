import Submission from "../models/submission.model.js";
import {
  createSubmission,
  getLanguages,
  getSubmissionResult,
  HEADERS,
  JUDGE0_URL,
} from "../services/judge0.service.js";
import Problem from "../models/problem.model.js";
import axios from "axios";
export const submitCode = async (req, res) => {
  try {
    const { problemId, languageId, sourceCode } = req.body;
    const userId = req.user._id;

    // Find the problem to get expected output
    const problem = await Problem.findById(problemId);
    if (!problem) {
      return res.status(404).json({ message: "Problem not found" });
    }

    // Send code to Judge0 with wait=true so we get the result immediately
    const submissionRes = await axios.post(
      `${JUDGE0_URL}/submissions?base64_encoded=false&wait=true`,
      {
        language_id: languageId,
        source_code: sourceCode,
      },
      { headers: HEADERS }
    );

    const result = submissionRes.data;
    console.log(result);

    // Compare actual stdout with expected output
    const expected = (problem.expectedOutput || "").trim();
    const actual = (result.stdout || "").trim();
    const isCorrect = actual === expected;

    // Save submission to DB
    const submission = await Submission.create({
      userId,
      problemId,
      languageId,
      sourceCode,
      token: result.token, // Judge0 will still return token even with wait=true
      status: result.status,
      result: {
        stdout: result.stdout,
        stderr: result.stderr,
        time: result.time,
        memory: result.memory,
      },
      isCorrect,
    });

    res.status(201).json({
      submissionId: submission._id,
      isCorrect,
      stdout: result.stdout,
      stderr: result.stderr,
      time: result.time,
      memory: result.memory,
      status: result.status,
    });
  } catch (err) {
    console.error("❌ Error in submitCode:", err.message);
    res.status(500).json({ message: "Submission failed", error: err.message });
  }
};
export const getSubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;

    const submission = await Submission.findById(submissionId);
    if (!submission) return res.status(404).json({ message: "Not found" });

    const result = await getSubmissionResult(submission.token);

    // Update submission fields
    submission.status = result.status;
    submission.result = {
      stdout: result.stdout,
      stderr: result.stderr,
      time: result.time,
      memory: result.memory,
    };

    // ✅ Mark as correct if accepted
    submission.isCorrect = result.status?.description === "Accepted";

    await submission.save();

    // 🔥 Update user streak/calendar if correct
    if (submission.isCorrect) {
      const user = await User.findById(submission.userId);
      const today = new Date().toISOString().split("T")[0];
      const yesterday = new Date(Date.now() - 86400000)
        .toISOString()
        .split("T")[0];
      const last = user.lastSolvedDate?.toISOString().split("T")[0];

      if (last === yesterday) {
        user.streak += 1;
      } else if (last !== today) {
        user.streak = 1;
      }

      user.lastSolvedDate = new Date();
      user.calendar.set(today, true); // assuming `calendar` is a Map

      await user.save();
    }

    res.json(submission);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching result", error: err.message });
  }
};

export const getUserSubmissions = async (req, res) => {
  const submissions = await Submission.find({ userId: req.user._id }).sort({
    createdAt: -1,
  });
  res.json(submissions);
};
// controllers/languageController.js

export const getLanguagesController = async (req, res) => {
  try {
    const languages = await getLanguages();

    // Optional: filter allowed language IDs
    const allowedIds = [71, 54, 62]; // Python, C++, Java
    const filtered = languages.filter((lang) => allowedIds.includes(lang.id));

    res.status(200).json(filtered);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch languages", error: err.message });
  }
};
