import Problem from "../models/problem.model.js";
import Submission from "../models/submission.model.js";

// 🚀 BLAZING FAST: Get All Problems with optimized aggregation pipeline
export const getAllProblems = async (req, res) => {
  try {
    const { page = 1, limit = 50, difficulty, tags } = req.query;
    const skip = (page - 1) * limit;

    // Build base match conditions
    const matchConditions = {};

    if (difficulty) {
      const difficultyArray = difficulty
        .split(",")
        .map((d) => d.trim().toUpperCase());
      matchConditions.difficulty = { $in: difficultyArray };
    }

    if (tags) {
      const tagArray = tags
        .split(",")
        .map((tag) => new RegExp(`^${tag.trim()}$`, "i"));
      matchConditions.tags = { $in: tagArray };
    }

    // 🚀 Optimized aggregation pipeline for authenticated users
    if (req.user) {
      const userId = req.user._id;

      const pipeline = [
        { $match: matchConditions },
        {
          $lookup: {
            from: "submissions",
            let: { problemId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$problemId", "$$problemId"] },
                      { $eq: ["$userId", userId] },
                      { $eq: ["$isCorrect", true] },
                      { $eq: ["$verdict", "Accepted"] },
                    ],
                  },
                },
              },
              { $limit: 1 },
            ],
            as: "userSolution",
          },
        },
        {
          $addFields: {
            solved: { $gt: [{ $size: "$userSolution" }, 0] },
            solvedAt: { $arrayElemAt: ["$userSolution.createdAt", 0] },
          },
        },
        { $project: { userSolution: 0 } },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: parseInt(limit) },
      ];

      const problems = await Problem.aggregate(pipeline);
      const total = await Problem.countDocuments(matchConditions);

      return res.status(200).json({
        problems,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      });
    }

    // 🚀 Optimized query for public access
    const problems = await Problem.find(matchConditions)
      .select("-testCases.hiddenTestCases") // Exclude hidden test cases for performance
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(); // Use lean() for better performance

    const total = await Problem.countDocuments(matchConditions);

    res.status(200).json({
      problems,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("❌ Error fetching problems:", err);
    res.status(500).json({ error: "Failed to fetch problems" });
  }
};

// 🚀 BLAZING FAST: Get Problem by ID with optimized lookup
import mongoose from "mongoose";
import Problem from "../models/problem.model.js";

export const getProblemById = async (req, res) => {
  try {
    const problemId = req.params.id;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(problemId)) {
      return res.status(400).json({ message: "Invalid problem ID" });
    }

    if (req.user) {
      const userId = req.user._id;

      const pipeline = [
        { $match: { _id: new mongoose.Types.ObjectId(problemId) } },
        {
          $lookup: {
            from: "submissions",
            let: { problemId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$problemId", "$$problemId"] },
                      { $eq: ["$userId", userId] },
                      { $eq: ["$isCorrect", true] },
                      { $eq: ["$verdict", "Accepted"] },
                    ],
                  },
                },
              },
              { $sort: { createdAt: 1 } },
              { $limit: 1 },
            ],
            as: "userSolution",
          },
        },
        {
          $lookup: {
            from: "submissions",
            let: { problemId: "$_id" },
            pipeline: [
              {
                $match: { $expr: { $eq: ["$problemId", "$$problemId"] } },
              },
              {
                $group: {
                  _id: null,
                  totalSubmissions: { $sum: 1 },
                  acceptedSubmissions: {
                    $sum: { $cond: [{ $eq: ["$verdict", "Accepted"] }, 1, 0] },
                  },
                },
              },
            ],
            as: "stats",
          },
        },
        {
          $addFields: {
            solved: { $gt: [{ $size: "$userSolution" }, 0] },
            solvedAt: { $arrayElemAt: ["$userSolution.createdAt", 0] },
            totalSubmissions: {
              $ifNull: [{ $arrayElemAt: ["$stats.totalSubmissions", 0] }, 0],
            },
            acceptanceRate: {
              $cond: [
                { $gt: [{ $arrayElemAt: ["$stats.totalSubmissions", 0] }, 0] },
                {
                  $multiply: [
                    {
                      $divide: [
                        { $arrayElemAt: ["$stats.acceptedSubmissions", 0] },
                        { $arrayElemAt: ["$stats.totalSubmissions", 0] },
                      ],
                    },
                    100,
                  ],
                },
                0,
              ],
            },
          },
        },
        { $project: { userSolution: 0, stats: 0 } },
      ];

      const [problem] = await Problem.aggregate(pipeline);

      if (!problem) {
        return res.status(404).json({ message: "Problem not found" });
      }

      return res.status(200).json(problem);
    }

    // ✅ For unauthenticated users
    const problem = await Problem.findById(problemId)
      .select("-testCases.hiddenTestCases")
      .lean();

    if (!problem) {
      return res.status(404).json({ message: "Problem not found" });
    }

    res.status(200).json(problem);
  } catch (err) {
    console.error("❌ Error fetching problem:", err);
    res.status(500).json({ error: "Failed to fetch problem" });
  }
};
``;
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
// 🚀 BLAZING FAST: Optimized tag filtering with aggregation
export const getProblemsByTags = async (req, res) => {
  try {
    const { tags, difficulty, page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    // 🚀 Build efficient aggregation pipeline
    const pipeline = [];
    const matchConditions = {};

    if (tags && tags.trim() !== "") {
      const tagArray = tags
        .split(",")
        .map((tag) => new RegExp(`^${tag.trim()}$`, "i"));
      matchConditions.tags = { $in: tagArray };
    }

    if (difficulty && difficulty.trim() !== "") {
      const difficultyArray = difficulty
        .split(",")
        .map((d) => d.trim().toUpperCase())
        .filter((d) => ["EASY", "MEDIUM", "HARD"].includes(d));
      if (difficultyArray.length > 0) {
        matchConditions.difficulty = { $in: difficultyArray };
      }
    }

    // Add match stage if there are conditions
    if (Object.keys(matchConditions).length > 0) {
      pipeline.push({ $match: matchConditions });
    }

    // Add pagination and sorting
    pipeline.push(
      { $sort: { difficulty: 1, createdAt: -1 } }, // Sort by difficulty first, then creation date
      { $skip: skip },
      { $limit: parseInt(limit) },
      { $project: { testCases: 0 } } // Exclude test cases for performance
    );

    const problems = await Problem.aggregate(pipeline);

    // Get total count
    const total = await Problem.countDocuments(matchConditions);

    res.status(200).json({
      problems,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
      filters: { tags, difficulty },
    });
  } catch (error) {
    console.error("❌ Error fetching problems by tags:", error);
    res.status(500).json({
      message: "Failed to fetch problems by tags",
      error: error.message,
    });
  }
};

// 🚀 BLAZING FAST: Cache-optimized tag retrieval
export const getAllTags = async (req, res) => {
  try {
    // 🚀 Use aggregation for better performance with tag statistics
    const pipeline = [
      { $unwind: "$tags" },
      {
        $group: {
          _id: "$tags",
          count: { $sum: 1 },
          difficulties: { $addToSet: "$difficulty" },
        },
      },
      {
        $project: {
          tag: "$_id",
          count: 1,
          difficulties: 1,
          _id: 0,
        },
      },
      { $sort: { count: -1, tag: 1 } },
    ];

    const tagStats = await Problem.aggregate(pipeline);

    // Extract just tag names for backward compatibility
    const tags = tagStats.map((stat) => stat.tag);

    res.status(200).json({
      tags,
      tagStats, // Include statistics for frontend optimization
      total: tags.length,
    });
  } catch (err) {
    console.error("❌ Error fetching tags:", err);
    res.status(500).json({
      message: "Failed to fetch tags",
      error: err.message,
    });
  }
};

// 🚀 BLAZING FAST: Optimized search with advanced text indexing
export const searchProblems = async (req, res) => {
  try {
    const { q, difficulty, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    if (!q || q.trim() === "") {
      return res.status(400).json({
        message: "Search query parameter 'q' is required",
      });
    }

    const searchTerm = q.trim();

    // 🚀 Advanced search pipeline with text scoring
    const pipeline = [
      {
        $match: {
          $and: [
            {
              $or: [
                { $text: { $search: searchTerm } }, // Use text index if available
                { title: { $regex: searchTerm, $options: "i" } },
                { description: { $regex: searchTerm, $options: "i" } },
                { tags: { $regex: searchTerm, $options: "i" } },
              ],
            },
            ...(difficulty
              ? [
                  {
                    difficulty: {
                      $in: difficulty
                        .split(",")
                        .map((d) => d.trim().toUpperCase()),
                    },
                  },
                ]
              : []),
          ],
        },
      },
      {
        $addFields: {
          relevanceScore: {
            $add: [
              // Title match gets highest score
              {
                $cond: [
                  {
                    $regexMatch: {
                      input: "$title",
                      regex: searchTerm,
                      options: "i",
                    },
                  },
                  10,
                  0,
                ],
              },
              // Tag match gets medium score
              {
                $cond: [
                  { $in: [{ $regex: [searchTerm, "i"] }, "$tags"] },
                  5,
                  0,
                ],
              },
              // Description match gets lower score
              {
                $cond: [
                  {
                    $regexMatch: {
                      input: "$description",
                      regex: searchTerm,
                      options: "i",
                    },
                  },
                  2,
                  0,
                ],
              },
            ],
          },
        },
      },
      { $sort: { relevanceScore: -1, createdAt: -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) },
      { $project: { relevanceScore: 0 } },
    ];

    const problems = await Problem.aggregate(pipeline);

    // Count total for pagination
    const countPipeline = [
      {
        $match: {
          $and: [
            {
              $or: [
                { title: { $regex: searchTerm, $options: "i" } },
                { description: { $regex: searchTerm, $options: "i" } },
                { tags: { $regex: searchTerm, $options: "i" } },
              ],
            },
            ...(difficulty
              ? [
                  {
                    difficulty: {
                      $in: difficulty
                        .split(",")
                        .map((d) => d.trim().toUpperCase()),
                    },
                  },
                ]
              : []),
          ],
        },
      },
      { $count: "total" },
    ];

    const [countResult] = await Problem.aggregate(countPipeline);
    const total = countResult?.total || 0;

    res.status(200).json({
      count: problems.length,
      total,
      searchTerm,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
      results: problems,
    });
  } catch (err) {
    console.error("❌ Error in global search:", err);
    res.status(500).json({
      message: "Failed to search problems",
      error: err.message,
    });
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
