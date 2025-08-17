import Comment from "../models/comment.model.js";

// Adding a new comment
export const addComment = async (req, res) => {
  try {
    const { id: problemId } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    if (!content)
      return res.status(400).json({ message: "Comment cannot be empty" });

    const comment = await Comment.create({ content, problemId, userId });

    // Return minimal info, avoid unnecessary population here to save time
    res.status(201).json({ message: "Comment added", comment });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to add comment", error: err.message });
  }
};

// Fetch comments with pagination, lean query, and indexed fields
export const getComments = async (req, res) => {
  try {
    const { id: problemId } = req.params;

    // Pagination params (optional, default limit 20)
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const comments = await Comment.find({ problemId })
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.json(comments);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch comments", error: err.message });
  }
};
