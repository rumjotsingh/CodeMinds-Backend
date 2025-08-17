import Submission from "../models/submission.model.js";
import {
  getLanguages,
  HEADERS,
  JUDGE0_URL,
} from "../services/judge0.service.js";

import Problem from "../models/problem.model.js";
import axios from "axios";

// controllers/contestSubmission.controller.js

import User from "../models/user.model.js";

export const submitCode = async (req, res) => {
  try {
    const { problemId, languageId, sourceCode } = req.body;
    const userId = req.user._id;

    const problem = await Problem.findById(problemId);
    if (!problem) return res.status(404).json({ message: "Problem not found" });

    const testcases = problem.testcases || [];
    let passed = 0;
    const testResults = [];

    // 🧪 Run code on each testcase
    for (const testcase of testcases) {
      const submissionRes = await axios.post(
        `${JUDGE0_URL}/submissions?base64_encoded=false&wait=true`,
        {
          language_id: languageId,
          source_code: sourceCode,
          stdin: testcase.input,
        },
        { headers: HEADERS }
      );

      const result = submissionRes.data;
      const actual = (result.stdout || "").trim();
      const expected = (testcase.output || "").trim();

      const isPassed = actual === expected;

      if (isPassed) passed++;

      testResults.push({
        input: testcase.input,
        expectedOutput: expected,
        actualOutput: actual,
        passed: isPassed,
        time: result.time,
        memory: result.memory,
      });
    }

    const total = testcases.length;
    const isCorrect = passed === total;

    // 📝 Save submission
    const submission = await Submission.create({
      userId,
      problemId,
      languageId,
      sourceCode,
      passedTestCases: passed,
      totalTestCases: total,
      isCorrect,
      verdict: isCorrect ? "Accepted" : "Wrong Answer",
      testResults,
    });

    // 🔥 Update streak if all testcases passed
    if (isCorrect) {
      const user = await User.findById(userId);
      const today = new Date().toISOString().split("T")[0];
      const yesterday = new Date(Date.now() - 86400000)
        .toISOString()
        .split("T")[0];
      const last = user.lastSolvedDate?.toISOString().split("T")[0];

      if (last === yesterday) user.streak += 1;
      else if (last !== today) user.streak = 1;

      user.lastSolvedDate = new Date();
      if (!user.calendar) user.calendar = new Map();
      user.calendar.set(today, true);

      await user.save();
    }

    res.status(201).json({
      submissionId: submission._id,
      isCorrect,
      passedTestCases: passed,
      totalTestCases: total,
      testResults,
    });
  } catch (err) {
    console.error("❌ submitCode error:", err.message);
    res.status(500).json({ message: "Submission failed", error: err.message });
  }
};
export const runCode = async (req, res) => {
  try {
    const { problemId, languageId, sourceCode } = req.body;
    const problem = await Problem.findById(problemId);
    if (!problem) return res.status(404).json({ message: "Problem not found" });

    // Filter only visible testcases
    const visibleTestcases = (problem.testcases || []).filter(
      (tc) => !tc.isHidden
    );
    const testResults = [];

    for (const testcase of visibleTestcases) {
      const submissionRes = await axios.post(
        `${JUDGE0_URL}/submissions?base64_encoded=false&wait=true`,
        {
          language_id: languageId,
          source_code: sourceCode,
          stdin: testcase.input,
        },
        { headers: HEADERS }
      );

      const result = submissionRes.data;
      const actual = (result.stdout || "").trim();
      const expected = (testcase.output || "").trim();
      const isPassed = actual === expected;

      testResults.push({
        input: testcase.input,
        expectedOutput: expected,
        actualOutput: actual,
        passed: isPassed,
        time: result.time,
        memory: result.memory,
      });
    }

    res.json({
      totalTestcases: visibleTestcases.length,
      passedTestcases: testResults.filter((t) => t.passed).length,
      testResults,
    });
  } catch (err) {
    console.error("❌ runCode error:", err.message);
    res.status(500).json({ message: "Run failed", error: err.message });
  }
};

export const getSubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const submission = await Submission.findById(submissionId);
    if (!submission) return res.status(404).json({ message: "Not found" });

    res.json(submission);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching submission", error: err.message });
  }
};

export const getUserSubmissions = async (req, res) => {
  const submissions = await Submission.find({ userId: req.user._id }).sort({
    createdAt: -1,
  });
  res.json(submissions);
};

export const getProblemSubmissions = async (req, res) => {
  try {
    const { problemId } = req.params;
    const userId = req.user._id;

    // Get all submissions for this specific problem by the current user
    const submissions = await Submission.find({ 
      problemId, 
      userId 
    }).sort({
      createdAt: -1,
    });

    res.json(submissions);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching problem submissions", error: err.message });
  }
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
