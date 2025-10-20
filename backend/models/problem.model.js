import mongoose from "mongoose";

const exampleSchema = new mongoose.Schema({
  input: { type: String, required: true },
  output: { type: String, required: true },
  explanation: { type: String },
});

const testcaseSchema = new mongoose.Schema({
  input: { type: String, required: true },
  output: { type: String, required: true },
  isHidden: { type: Boolean, default: false },
});

const codeSnippetSchema = new mongoose.Schema({
  PYTHON: String,
  JAVASCRIPT: String,
  JAVA: String,
  "C++": String,
  GO: String,
});

const problemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true }, // markdown
    difficulty: {
      type: String,
      enum: ["EASY", "MEDIUM", "HARD"],
      required: true,
    },
    tags: [String],
    constraints: [String],
    examples: [exampleSchema],
    testcases: [testcaseSchema],
    hints: [String],
    editorial: { type: String }, // markdown
    codeSnippets: codeSnippetSchema, // starter code for user
    referenceSolutions: codeSnippetSchema, // hidden correct solutions
  },
  { timestamps: true }
);

// Index for faster tag lookups
problemSchema.index({ tags: 1 });

// optional: add pre-save hook to auto-update updatedAt

const Problem = mongoose.model("Problem", problemSchema);
export default Problem;
