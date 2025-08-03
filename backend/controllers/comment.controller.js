import Comment from "../models/comment.model.js";

export const addComment = async (req, res) => {
  try {
    const { id: problemId } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    if (!content)
      return res.status(400).json({ message: "Comment cannot be empty" });

    let comment = await Comment.create({ content, problemId, userId });

    // Populate the userId with name and email
    comment = await comment.populate("userId", "name email");

    res.status(201).json({ message: "Comment added", comment });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to add comment", error: err.message });
  }
};

export const getComments = async (req, res) => {
  try {
    const { id: problemId } = req.params;

    const comments = await Comment.find({ problemId })
      .populate("userId", "name email")
      .sort({ createdAt: -1 });

    res.json(comments);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch comments", error: err.message });
  }
};
