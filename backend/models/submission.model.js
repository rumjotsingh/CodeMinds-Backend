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
    sourceCode: { type: String, required: true },
    token: { type: String },
    result: {
      stdout: String,
      stderr: String,
      time: String,
      memory: Number,
    },
    status: Object,

    // ✅ New: Whether the submission passed all tests
    isCorrect: {
      type: Boolean,
      default: false,
    },

    // (Optional) performance benchmarks
    performance: [
      {
        inputSize: Number,
        time: String,
        memory: Number,
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("Submission", submissionSchema);
