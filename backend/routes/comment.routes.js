import express from "express";
import {
  addComment,
  getComments,
  getReplies,
  upvoteComment,
  downvoteComment,
  updateComment,
  deleteComment,
  markAsRead,
  addReaction,
  getRecentDiscussions,
  togglePin,
  searchDiscussions,
  getUserActivity,
} from "../controllers/comment.controller.js";
import { authMiddleware } from "../middleware.js";

const router = express.Router();

// Discussion/Comment routes (LeetCode-style)
router.post("/problems/:id/comments", authMiddleware, addComment); // Create comment/reply
router.get("/problems/:id/comments", getComments); // Get all discussions for a problem
router.get("/comments/:commentId/replies", getReplies); // Get replies for a comment
router.post("/comments/:commentId/upvote", authMiddleware, upvoteComment); // Upvote
router.post("/comments/:commentId/downvote", authMiddleware, downvoteComment); // Downvote
router.put("/comments/:commentId", authMiddleware, updateComment); // Update comment
router.delete("/comments/:commentId", authMiddleware, deleteComment); // Delete comment

// 💬 Chat-like features
router.post("/comments/:commentId/read", authMiddleware, markAsRead); // Mark as read
router.post("/comments/:commentId/react", authMiddleware, addReaction); // Add emoji reaction
router.post("/comments/:commentId/pin", authMiddleware, togglePin); // Pin/unpin discussion
router.get("/discussions/recent", getRecentDiscussions); // Get recent activity feed
router.get("/discussions/search", searchDiscussions); // Search discussions
router.get("/users/:userId/activity", getUserActivity); // Get user's discussion activity

export default router;
