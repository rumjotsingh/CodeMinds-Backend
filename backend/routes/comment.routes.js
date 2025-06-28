import express from "express";
import { addComment, getComments } from "../controllers/comment.controller.js";
import { authMiddleware } from "../middleware.js";

const router = express.Router();

router.post("/problems/:id/comments", authMiddleware, addComment);
router.get("/problems/:id/comments", getComments);

export default router;
