import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    content: { type: String, required: true },
    problemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Problem",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null, // null means it's a top-level comment
    },
    upvotes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    downvotes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    isAccepted: { type: Boolean, default: false }, // For marking solution
    tags: [{ type: String }], // e.g., ["solution", "clarification", "bug"]
    replyCount: { type: Number, default: 0 },
    edited: { type: Boolean, default: false },
    lastEditedAt: { type: Date },

    // 💬 Chat-like features
    mentions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User", // Users mentioned in this comment (@username)
      },
    ],
    readBy: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        readAt: { type: Date, default: Date.now },
      },
    ],
    isPinned: { type: Boolean, default: false }, // Moderators can pin important discussions
    isReported: { type: Boolean, default: false }, // Flag for reported content
    reactions: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        emoji: { type: String }, // 👍 ❤️ 😂 🎉 etc.
      },
    ],
    lastActivity: { type: Date, default: Date.now }, // Updates when someone replies
  },
  { timestamps: true }
);

// Index for faster queries
commentSchema.index({ problemId: 1, createdAt: -1 });
commentSchema.index({ parentId: 1 });
commentSchema.index({ userId: 1 });

// Virtual for vote count
commentSchema.virtual("voteCount").get(function () {
  return this.upvotes.length - this.downvotes.length;
});

const Comment = mongoose.model("Comment", commentSchema);
export default Comment;
