import Problem from "../models/problem.model.js";

// Create Problem

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

/**
 * Update an existing problem by ID
 */
export const updateProblem = async (req, res) => {
  const { id } = req.params;
  try {
    const updatedProblem = await Problem.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updatedProblem) {
      return res.status(404).json({ error: "Problem not found" });
    }
    res.json({ message: "Problem updated", updatedProblem });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Problem update failed", details: err.message });
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
    const { tags, difficulty } = req.query;

    if (!tags || tags.trim() === "") {
      return res
        .status(400)
        .json({ message: "Tags query parameter is required" });
    }

    const tagArray = tags.split(",").map((tag) => tag.trim());

    // Build query conditions
    const query = {
      tags: { $in: tagArray.map((tag) => new RegExp(`^${tag}$`, "i")) },
    };

    // Add difficulty filter if provided
    if (difficulty) {
      const difficultyArray = difficulty
        .split(",")
        .map((d) => d.trim().toUpperCase())
        .filter((d) => ["EASY", "MEDIUM", "HARD"].includes(d));

      if (difficultyArray.length > 0) {
        query.difficulty = { $in: difficultyArray };
      }
    }

    const problems = await Problem.find(query).sort({ createdAt: -1 });

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

/**
 * Group all distinct tags into categories: companies, dataStructures, algorithms, topics
 */
export const getGroupedTags = async (req, res) => {
  try {
    const distinctTags = await Problem.distinct("tags");

    // Define known sets (normalized to lowercase for comparison)
    const companiesSet = new Set([
      "google",
      "amazon",
      "microsoft",
      "facebook",
      "meta",
      "apple",
      "netflix",
      "uber",
      "airbnb",
      "bloomberg",
      "goldman sachs",
      "jp morgan",
      "jpmorgan",
      "adobe",
      "oracle",
      "cisco",
      "vm ware",
      "vmware",
      "tcs",
      "infosys",
    ]);
    const dataStructuresSet = new Set([
      "array",
      "string",
      "linked list",
      "stack",
      "queue",
      "heap",
      "priority queue",
      "hash table",
      "hashmap",
      "set",
      "tree",
      "binary tree",
      "bst",
      "trie",
      "graph",
      "matrix",
      "bit manipulation",
    ]);
    const algorithmsSet = new Set([
      "two pointers",
      "greedy",
      "dynamic programming",
      "binary search",
      "dfs",
      "bfs",
      "backtracking",
      "divide and conquer",
      "sliding window",
      "kadane’s algorithm",
      "kadane's algorithm",
      "sorting",
      "recursion",
      "binary exponentiation",
    ]);

    const grouped = {
      companies: [],
      dataStructures: [],
      algorithms: [],
      topics: [], // everything else
    };

    for (const tag of distinctTags) {
      const norm = String(tag).toLowerCase();
      if (companiesSet.has(norm)) grouped.companies.push(tag);
      else if (dataStructuresSet.has(norm)) grouped.dataStructures.push(tag);
      else if (algorithmsSet.has(norm)) grouped.algorithms.push(tag);
      else grouped.topics.push(tag);
    }

    // Sort for stable output
    grouped.companies.sort((a, b) => a.localeCompare(b));
    grouped.dataStructures.sort((a, b) => a.localeCompare(b));
    grouped.algorithms.sort((a, b) => a.localeCompare(b));
    grouped.topics.sort((a, b) => a.localeCompare(b));

    res.status(200).json(grouped);
  } catch (err) {
    console.error("Error grouping tags:", err);
    res
      .status(500)
      .json({ message: "Failed to group tags", error: err.message });
  }
};

/**
 * Filter problems by category-based tags.
 * AND across categories, OR within the same category.
 * Query params:
 *  - companies: comma-separated list
 *  - dataStructures: comma-separated list
 *  - algorithms: comma-separated list
 *  - difficulty: comma-separated list (EASY, MEDIUM, HARD)
 * Example: /problems/filter?companies=Google,Amazon&algorithms=Greedy&difficulty=EASY,MEDIUM
 */
export const getProblemsByCategories = async (req, res) => {
  try {
    const { companies, dataStructures, algorithms, difficulty } = req.query;

    const conditions = [];
    const buildRegexArray = (csv) =>
      String(csv)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((t) => new RegExp(`^${t}$`, "i"));

    if (companies) {
      conditions.push({ tags: { $in: buildRegexArray(companies) } });
    }
    if (dataStructures) {
      conditions.push({ tags: { $in: buildRegexArray(dataStructures) } });
    }
    if (algorithms) {
      conditions.push({ tags: { $in: buildRegexArray(algorithms) } });
    }

    if (conditions.length === 0) {
      return res.status(400).json({
        message:
          "Provide at least one of: companies, dataStructures, algorithms",
      });
    }

    const query =
      conditions.length === 1 ? conditions[0] : { $and: conditions };

    // Add difficulty filter if provided
    if (difficulty) {
      const difficultyArray = difficulty
        .split(",")
        .map((d) => d.trim().toUpperCase())
        .filter((d) => ["EASY", "MEDIUM", "HARD"].includes(d));

      if (difficultyArray.length > 0) {
        query.difficulty = { $in: difficultyArray };
      }
    }

    const problems = await Problem.find(query).sort({ createdAt: -1 });
    res.status(200).json(problems);
  } catch (err) {
    console.error("Error fetching problems by categories:", err);
    res.status(500).json({
      message: "Failed to fetch problems by categories",
      error: err.message,
    });
  }
};
