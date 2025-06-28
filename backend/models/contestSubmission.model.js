import mongoose from "mongoose";

const contestSubmissionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    contestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contest",
      required: true,
    },
    problemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Problem",
      required: true,
    },
    languageId: { type: Number, required: true },
    sourceCode: { type: String, required: true },
    token: String, // Judge0 token
    status: Object,
    result: {
      stdout: String,
      stderr: String,
      time: String,
      memory: Number,
    },
    passedTestCases: [String], // array of testcase IDs passed
    isCorrect: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("ContestSubmission", contestSubmissionSchema);
