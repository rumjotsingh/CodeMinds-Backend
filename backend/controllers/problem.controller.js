import Problem from "../models/problem.model.js";

// Create Problem
export const createProblem = async (req, res) => {
  try {
    const problem = await Problem.create(req.body);
    res.status(201).json({ message: "Problem created", problem });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Problem creation failed", details: err.message });
  }
};

// Get All Problems
export const getAllProblems = async (req, res) => {
  try {
    const problems = await Problem.find().sort({ createdAt: -1 });
    res.status(200).json(problems);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch problems" });
  }
};

// Get Problem by ID
export const getProblemById = async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id);
    if (!problem) return res.status(404).json({ message: "Problem not found" });
    res.status(200).json(problem);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch problem" });
  }
};

// Update Problem
export const updateProblem = async (req, res) => {
  try {
    const updated = await Problem.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!updated) return res.status(404).json({ message: "Problem not found" });
    res.status(200).json({ message: "Problem updated", problem: updated });
  } catch (err) {
    res.status(500).json({ error: "Problem update failed" });
  }
};

// Delete Problem
export const deleteProblem = async (req, res) => {
  try {
    const deleted = await Problem.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Problem not found" });
    res.status(200).json({ message: "Problem deleted" });
  } catch (err) {
    res.status(500).json({ error: "Problem deletion failed" });
  }
};
export const getProblemsByTags = async (req, res) => {
  try {
    console.log("heloo");
    const { tags } = req.query;

    if (!tags || tags.trim() === "") {
      return res
        .status(400)
        .json({ message: "Tags query parameter is required" });
    }

    const tagArray = tags.split(",").map((tag) => tag.trim());

    const problems = await Problem.find({
      tags: { $in: tagArray.map((tag) => new RegExp(`^${tag}$`, "i")) },
    });

    res.status(200).json(problems);
  } catch (error) {
    console.error("❌ Error fetching problems by tags:", error);
    res.status(500).json({
      message: "Failed to fetch problems by tags",
      error: error.message,
    });
  }
};

export const getAllTags = async (req, res) => {
  try {
    const tags = await Problem.distinct("tags");
    res.status(200).json(tags);
  } catch (err) {
    console.error("Error fetching tags:", err);
    res
      .status(500)
      .json({ message: "Failed to fetch tags", error: err.message });
  }
};
