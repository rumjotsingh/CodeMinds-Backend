import { mongoose } from "mongoose";

const ContestSchema = new mongoose.Schema(
  {
    title: String,
    description: String,
    problems: [{ type: mongoose.Schema.Types.ObjectId, ref: "Problem" }],
    startTime: Date,
    endTime: Date,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model("Contest", ContestSchema);
