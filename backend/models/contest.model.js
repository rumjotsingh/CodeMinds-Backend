import mongoose from "mongoose";

const contestSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,
    problems: [{ type: mongoose.Schema.Types.ObjectId, ref: "Problem" }],
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model("Contest", contestSchema);
