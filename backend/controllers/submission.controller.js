import Submission from "../models/submission.model.js";
import {
  getLanguages,
  HEADERS,
  JUDGE0_URL,
} from "../services/judge0.service.js";

import axios from "axios";

import Problem from "../models/problem.model.js";

// controllers/contestSubmission.controller.js
import axios from "axios";

import { Problem } from "../models/Problem.js";
import { JUDGE0_URL, HEADERS } from "../services/judge0.js";
import contestSubmissionModel from "../models/contestSubmission.model.js";

export const runCodeInContest = async (req, res) => {
  try {
    const { contestId } = req.params;
    const { problemId, languageId, sourceCode } = req.body;

    const problem = await Problem.findById(problemId);
    if (!problem) return res.status(404).json({ message: "Problem not found" });

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
    console.error("❌ runCodeInContest error:", err.message);
    res.status(500).json({ message: "Run failed", error: err.message });
  }
};

export const submitCodeToContest = async (req, res) => {
  try {
    const { contestId } = req.params;
    const { problemId, languageId, sourceCode } = req.body;
    const userId = req.user._id;

    const problem = await Problem.findById(problemId);
    if (!problem) return res.status(404).json({ message: "Problem not found" });

    const testcases = problem.testcases || [];
    let passed = 0;
    const testResults = [];

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
    const scorePerTestcase = 100 / total;
    const totalScore = passed * scorePerTestcase;

    // Save to ContestSubmission
    await contestSubmissionModel.create({
      userId,
      contestId,
      problemId,
      languageId,
      sourceCode,
      passedTestcases: passed,
      totalTestcases: total,
      score: totalScore,
      testResults,
    });

    res.status(201).json({
      message: "Submitted",
      totalScore,
      passedAll: passed === total,
      passedTestcases: passed,
      totalTestcases: total,
      testResults,
    });
  } catch (err) {
    console.error("❌ submitCodeToContest error:", err.message);
    res.status(500).json({ message: "Submit failed", error: err.message });
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
