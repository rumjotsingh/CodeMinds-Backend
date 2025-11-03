import Comment from "../models/comment.model.js";

// 🚀 BLAZING FAST: Optimized comment creation with validation
export const addComment = async (req, res) => {
  try {
    const { id: problemId } = req.params;
    const { content, parentId } = req.body;
    const userId = req.user._id;

    // Enhanced validation
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: "Comment cannot be empty" });
    }

    if (content.trim().length > 1000) {
      return res
        .status(400)
        .json({ message: "Comment too long (max 1000 characters)" });
    }

    // 🚀 Single optimized creation with immediate population
    const comment = await Comment.create({
      content: content.trim(),
      problemId,
      userId,
      parentId: parentId || null,
      createdAt: new Date(),
    });

    // 🚀 Efficient population with lean query
    const populatedComment = await Comment.findById(comment._id)
      .populate("userId", "name email avatar")
      .populate("parentId", "content userId")
      .lean();

    res.status(201).json({
      message: "Comment added successfully",
      comment: {
        ...populatedComment,
        isReply: !!parentId,
        wordCount: content.trim().split(/\s+/).length,
      },
    });
  } catch (err) {
    console.error("❌ Error adding comment:", err);
    res.status(500).json({
      message: "Failed to add comment",
      error: err.message,
    });
  }
};

// 🚀 BLAZING FAST: Ultra-optimized comments with threading and analytics
export const getComments = async (req, res) => {
  try {
    const { id: problemId } = req.params;
    const {
      page = 1,
      limit = 20,
      sortBy = "newest",
      includeReplies = "true",
    } = req.query;
    const skip = (page - 1) * limit;

    // Build sort options
    const sortOptions = {};
    switch (sortBy) {
      case "oldest":
        sortOptions.createdAt = 1;
        break;
      case "newest":
      default:
        sortOptions.createdAt = -1;
        break;
    }

    // 🚀 Advanced aggregation pipeline for threaded comments
    const pipeline = [
      { $match: { problemId, parentId: null } }, // Top-level comments only
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
          pipeline: [{ $project: { name: 1, email: 1, avatar: 1 } }],
        },
      },
      {
        $addFields: {
          user: { $arrayElemAt: ["$user", 0] },
        },
      },
    ];

    // Add replies lookup if requested
    if (includeReplies === "true") {
      pipeline.push({
        $lookup: {
          from: "comments",
          let: { commentId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$parentId", "$$commentId"] },
              },
            },
            {
              $lookup: {
                from: "users",
                localField: "userId",
                foreignField: "_id",
                as: "user",
                pipeline: [{ $project: { name: 1, email: 1, avatar: 1 } }],
              },
            },
            {
              $addFields: {
                user: { $arrayElemAt: ["$user", 0] },
              },
            },
            { $sort: { createdAt: 1 } }, // Replies in chronological order
            { $limit: 10 }, // Limit replies per comment
          ],
          as: "replies",
        },
      });
    }

    // Add metrics and sorting
    pipeline.push(
      {
        $addFields: {
          replyCount: { $size: "$replies" },
          hasReplies: { $gt: [{ $size: "$replies" }, 0] },
          wordCount: {
            $size: { $split: [{ $trim: { input: "$content" } }, " "] },
          },
          timeAgo: {
            $dateDiff: {
              startDate: "$createdAt",
              endDate: new Date(),
              unit: "minute",
            },
          },
        },
      },
      { $sort: sortOptions },
      { $skip: skip },
      { $limit: parseInt(limit) }
    );

    const comments = await Comment.aggregate(pipeline);

    // Get total count for pagination
    const totalComments = await Comment.countDocuments({
      problemId,
      parentId: null,
    });

    // Calculate engagement metrics
    const totalAllComments = await Comment.countDocuments({ problemId });
    const avgRepliesPerComment =
      comments.length > 0
        ? Math.round(
            (comments.reduce((sum, c) => sum + c.replyCount, 0) /
              comments.length) *
              10
          ) / 10
        : 0;

    res.json({
      comments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalComments,
        pages: Math.ceil(totalComments / limit),
      },
      analytics: {
        totalComments: totalAllComments,
        topLevelComments: totalComments,
        averageRepliesPerComment: avgRepliesPerComment,
        engagementRate:
          totalComments > 0
            ? Math.round((totalAllComments / totalComments) * 100)
            : 0,
      },
      filters: {
        sortBy,
        includeReplies: includeReplies === "true",
      },
    });
  } catch (err) {
    console.error("❌ Error fetching comments:", err);
    res.status(500).json({
      message: "Failed to fetch comments",
      error: err.message,
    });
  }
};

// 🚀 BLAZING FAST: Optimized comment update with ownership validation
export const updateComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: "Comment cannot be empty" });
    }

    if (content.trim().length > 1000) {
      return res
        .status(400)
        .json({ message: "Comment too long (max 1000 characters)" });
    }

    // 🚀 Single atomic update with ownership check
    const updatedComment = await Comment.findOneAndUpdate(
      { _id: commentId, userId }, // Ensure user owns the comment
      {
        content: content.trim(),
        updatedAt: new Date(),
        isEdited: true,
      },
      { new: true }
    )
      .populate("userId", "name email avatar")
      .lean();

    if (!updatedComment) {
      return res.status(404).json({
        message: "Comment not found or you don't have permission to edit it",
      });
    }

    res.json({
      message: "Comment updated successfully",
      comment: {
        ...updatedComment,
        wordCount: content.trim().split(/\s+/).length,
      },
    });
  } catch (err) {
    console.error("❌ Error updating comment:", err);
    res.status(500).json({
      message: "Failed to update comment",
      error: err.message,
    });
  }
};

// 🚀 BLAZING FAST: Optimized comment deletion with cascade handling
export const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;

    // 🚀 Check ownership or admin privileges
    const comment = await Comment.findById(commentId)
      .select("userId parentId")
      .lean();

    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    const canDelete = comment.userId.equals(userId) || userRole === "admin";

    if (!canDelete) {
      return res.status(403).json({
        message: "You don't have permission to delete this comment",
      });
    }

    // 🚀 Efficient deletion with reply cascade handling
    if (comment.parentId) {
      // It's a reply - just delete it
      await Comment.findByIdAndDelete(commentId);
    } else {
      // It's a top-level comment - delete it and all replies
      await Comment.deleteMany({
        $or: [{ _id: commentId }, { parentId: commentId }],
      });
    }

    res.json({ message: "Comment deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting comment:", err);
    res.status(500).json({
      message: "Failed to delete comment",
      error: err.message,
    });
  }
};

// 🚀 BLAZING FAST: Get user's comment activity across all problems
export const getUserComments = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 20, problemId } = req.query;
    const skip = (page - 1) * limit;

    // Build match conditions
    const matchConditions = { userId };
    if (problemId) {
      matchConditions.problemId = problemId;
    }

    // 🚀 Optimized aggregation for user comment history
    const pipeline = [
      { $match: matchConditions },
      {
        $lookup: {
          from: "problems",
          localField: "problemId",
          foreignField: "_id",
          as: "problem",
          pipeline: [{ $project: { title: 1, difficulty: 1 } }],
        },
      },
      {
        $addFields: {
          problem: { $arrayElemAt: ["$problem", 0] },
          wordCount: {
            $size: { $split: [{ $trim: { input: "$content" } }, " "] },
          },
          isReply: { $ne: ["$parentId", null] },
        },
      },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) },
    ];

    const comments = await Comment.aggregate(pipeline);
    const total = await Comment.countDocuments(matchConditions);

    // Get user comment statistics
    const stats = await Comment.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: null,
          totalComments: { $sum: 1 },
          totalReplies: {
            $sum: { $cond: [{ $ne: ["$parentId", null] }, 1, 0] },
          },
          averageWordCount: {
            $avg: {
              $size: { $split: [{ $trim: { input: "$content" } }, " "] },
            },
          },
          firstComment: { $min: "$createdAt" },
          lastComment: { $max: "$createdAt" },
        },
      },
    ]);

    res.json({
      comments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
      statistics: stats[0] || {
        totalComments: 0,
        totalReplies: 0,
        averageWordCount: 0,
        firstComment: null,
        lastComment: null,
      },
    });
  } catch (err) {
    console.error("❌ Error fetching user comments:", err);
    res.status(500).json({
      message: "Failed to fetch user comments",
      error: err.message,
    });
  }
};
