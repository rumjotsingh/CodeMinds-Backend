import mongoose from "mongoose";

const submissionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    problemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Problem",
      required: true,
    },
    languageId: { type: Number, required: true },
    language: String, // Optional human-readable
    sourceCode: { type: String, required: true },
    token: String,
    result: {
      stdout: String,
      stderr: String,
      time: String,
      memory: Number,
    },
    verdict: {
      type: String,
      enum: [
        "Accepted",
        "Wrong Answer",
        "Time Limit Exceeded",
        "Runtime Error",
        "Compilation Error",
      ],
    },
    isCorrect: { type: Boolean, default: false },
    passedTestCases: { type: Number, default: 0 },
    totalTestCases: { type: Number, default: 0 },
    score: { type: Number, default: 0 },
    testResults: [
      {
        input: String,
        expectedOutput: String,
        actualOutput: String,
        passed: Boolean,
        time: String,
        memory: Number,
      },
    ],
    performance: [
      {
        inputSize: Number,
        time: String,
        memory: Number,
      },
    ],
    testResults: [
      {
        input: String,
        expectedOutput: String,
        actualOutput: String,
        passed: Boolean,
        time: String,
        memory: Number,
        isHidden: Boolean,
      },
    ],
    passedTestCases: Number,
    totalTestCases: Number,
    verdict: String,
  },
  { timestamps: true }
);

export default mongoose.model("Submission", submissionSchema);
