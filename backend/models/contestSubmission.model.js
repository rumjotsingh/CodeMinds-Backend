import mongoose from "mongoose";

// models/contestSubmission.model.js
const ContestSubmissionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  contestId: { type: mongoose.Schema.Types.ObjectId, ref: "Contest" },
  problemId: { type: mongoose.Schema.Types.ObjectId, ref: "Problem" },
  sourceCode: String,
  languageId: Number,
  token: String,
  result: Object,
  createdAt: { type: Date, default: Date.now },
});
export default mongoose.model("contestSubmission", ContestSubmissionSchema);
