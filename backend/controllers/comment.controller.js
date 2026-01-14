import Comment from "../models/comment.model.js";
import Problem from "../models/problem.model.js";

// Add a new comment or reply
export const addComment = async (req, res) => {
  try {
    const { id: problemId } = req.params;
    const { content, parentId, tags } = req.body;
    const userId = req.user._id;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: "Comment cannot be empty" });
    }

    // Verify problem exists
    const problem = await Problem.findById(problemId);
    if (!problem) {
      return res.status(404).json({ message: "Problem not found" });
    }

    // If it's a reply, verify parent comment exists
    if (parentId) {
      const parentComment = await Comment.findById(parentId);
      if (!parentComment) {
        return res.status(404).json({ message: "Parent comment not found" });
      }
      // Increment reply count on parent
      await Comment.findByIdAndUpdate(parentId, { $inc: { replyCount: 1 } });
    }

    const comment = await Comment.create({
      content,
      problemId,
      userId,
      parentId: parentId || null,
      tags: tags || [],
    });

    const populatedComment = await Comment.findById(comment._id)
      .populate("userId", "name email")
      .lean();

    res.status(201).json({
      message: "Comment added successfully",
      comment: {
        ...populatedComment,
        voteCount:
          populatedComment.upvotes.length - populatedComment.downvotes.length,
      },
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to add comment", error: err.message });
  }
};

// Get all discussions for a problem (with pagination and sorting)
export const getComments = async (req, res) => {
  try {
    const { id: problemId } = req.params;
    const { page = 1, limit = 20, sortBy = "newest" } = req.query;

    // Only get top-level comments (parentId is null)
    let sortOption = {};
    switch (sortBy) {
      case "hot":
        sortOption = { voteCount: -1, createdAt: -1 };
        break;
      case "top":
        sortOption = { voteCount: -1 };
        break;
      case "oldest":
        sortOption = { createdAt: 1 };
        break;
      default: // newest
        sortOption = { createdAt: -1 };
    }

    const comments = await Comment.find({ problemId, parentId: null })
      .populate("userId", "name email")
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort(sortOption)
      .lean();

    const total = await Comment.countDocuments({ problemId, parentId: null });

    // Add vote count to each comment
    const commentsWithVotes = comments.map((comment) => ({
      ...comment,
      voteCount: comment.upvotes.length - comment.downvotes.length,
    }));

    res.json({
      comments: commentsWithVotes,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch comments", error: err.message });
  }
};

// Get replies for a specific comment
export const getReplies = async (req, res) => {
  try {
    const { commentId } = req.params;

    const replies = await Comment.find({ parentId: commentId })
      .populate("userId", "name email")
      .sort({ createdAt: 1 })
      .lean();

    const repliesWithVotes = replies.map((reply) => ({
      ...reply,
      voteCount: reply.upvotes.length - reply.downvotes.length,
    }));

    res.json({ replies: repliesWithVotes });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch replies", error: err.message });
  }
};

// Upvote a comment
export const upvoteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user._id;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // Remove from downvotes if present
    comment.downvotes = comment.downvotes.filter(
      (id) => id.toString() !== userId.toString()
    );

    // Toggle upvote
    const upvoteIndex = comment.upvotes.findIndex(
      (id) => id.toString() === userId.toString()
    );
    if (upvoteIndex > -1) {
      comment.upvotes.splice(upvoteIndex, 1);
    } else {
      comment.upvotes.push(userId);
    }

    await comment.save();

    res.json({
      message: "Vote updated",
      voteCount: comment.upvotes.length - comment.downvotes.length,
      upvoted: upvoteIndex === -1,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to upvote", error: err.message });
  }
};

// Downvote a comment
export const downvoteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user._id;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // Remove from upvotes if present
    comment.upvotes = comment.upvotes.filter(
      (id) => id.toString() !== userId.toString()
    );

    // Toggle downvote
    const downvoteIndex = comment.downvotes.findIndex(
      (id) => id.toString() === userId.toString()
    );
    if (downvoteIndex > -1) {
      comment.downvotes.splice(downvoteIndex, 1);
    } else {
      comment.downvotes.push(userId);
    }

    await comment.save();

    res.json({
      message: "Vote updated",
      voteCount: comment.upvotes.length - comment.downvotes.length,
      downvoted: downvoteIndex === -1,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to downvote", error: err.message });
  }
};

// Update a comment
export const updateComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    if (comment.userId.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorized to edit this comment" });
    }

    comment.content = content;
    comment.edited = true;
    comment.lastEditedAt = new Date();
    await comment.save();

    res.json({ message: "Comment updated successfully", comment });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to update comment", error: err.message });
  }
};

// Delete a comment
export const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user._id;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    if (comment.userId.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this comment" });
    }

    // If it has replies, just mark content as deleted
    if (comment.replyCount > 0) {
      comment.content = "[deleted]";
      await comment.save();
    } else {
      // Delete completely if no replies
      await Comment.findByIdAndDelete(commentId);

      // Update parent reply count if this was a reply
      if (comment.parentId) {
        await Comment.findByIdAndUpdate(comment.parentId, {
          $inc: { replyCount: -1 },
        });
      }
    }

    res.json({ message: "Comment deleted successfully" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to delete comment", error: err.message });
  }
};

// 💬 Mark comment as read (Chat feature)
export const markAsRead = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user._id;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // Check if already read by this user
    const alreadyRead = comment.readBy.some(
      (read) => read.userId.toString() === userId.toString()
    );

    if (!alreadyRead) {
      comment.readBy.push({ userId, readAt: new Date() });
      await comment.save();
    }

    res.json({ message: "Marked as read", readCount: comment.readBy.length });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to mark as read", error: err.message });
  }
};

// 💬 Add reaction (emoji) to comment
export const addReaction = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { emoji } = req.body;
    const userId = req.user._id;

    if (!emoji) {
      return res.status(400).json({ message: "Emoji is required" });
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // Remove existing reaction from this user if any
    comment.reactions = comment.reactions.filter(
      (r) => r.userId.toString() !== userId.toString()
    );

    // Add new reaction
    comment.reactions.push({ userId, emoji });
    await comment.save();

    res.json({
      message: "Reaction added",
      reactions: comment.reactions,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to add reaction", error: err.message });
  }
};

// 💬 Get recent chat/discussions (realtime feed)
export const getRecentDiscussions = async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    const recentDiscussions = await Comment.find({ parentId: null })
      .populate("userId", "name email")
      .populate("mentions", "name")
      .sort({ lastActivity: -1 })
      .limit(parseInt(limit))
      .lean();

    const discussionsWithData = recentDiscussions.map((disc) => ({
      ...disc,
      voteCount: disc.upvotes.length - disc.downvotes.length,
      reactionCount: disc.reactions?.length || 0,
      readCount: disc.readBy?.length || 0,
    }));

    res.json({ discussions: discussionsWithData });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch discussions", error: err.message });
  }
};

// 💬 Pin/Unpin a discussion (moderator feature)
export const togglePin = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user._id;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // Check if user is the comment owner (in production, check for moderator role)
    if (comment.userId.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Not authorized to pin" });
    }

    comment.isPinned = !comment.isPinned;
    await comment.save();

    res.json({
      message: comment.isPinned ? "Comment pinned" : "Comment unpinned",
      isPinned: comment.isPinned,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to toggle pin", error: err.message });
  }
};

// 💬 Search discussions (chat search)
export const searchDiscussions = async (req, res) => {
  try {
    const { query, problemId } = req.query;

    if (!query) {
      return res.status(400).json({ message: "Search query is required" });
    }

    const searchFilter = {
      content: { $regex: query, $options: "i" },
      parentId: null, // Only top-level discussions
    };

    if (problemId) {
      searchFilter.problemId = problemId;
    }

    const results = await Comment.find(searchFilter)
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    const resultsWithData = results.map((disc) => ({
      ...disc,
      voteCount: disc.upvotes.length - disc.downvotes.length,
    }));

    res.json({ results: resultsWithData, count: results.length });
  } catch (err) {
    res.status(500).json({ message: "Search failed", error: err.message });
  }
};

// 💬 Get user's discussion activity
export const getUserActivity = async (req, res) => {
  try {
    const { userId } = req.params;

    const comments = await Comment.find({ userId })
      .populate("problemId", "title")
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    const stats = {
      totalComments: comments.length,
      totalUpvotes: comments.reduce((sum, c) => sum + c.upvotes.length, 0),
      totalReplies: comments.reduce((sum, c) => sum + c.replyCount, 0),
      recentActivity: comments.slice(0, 10),
    };

    res.json(stats);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to get activity", error: err.message });
  }
};
