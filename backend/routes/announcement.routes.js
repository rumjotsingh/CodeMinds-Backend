import express from "express";
import {
  createAnnouncement,
  deleteAnnouncement,
  getAnnouncements,
  updateAnnouncement,
} from "../controllers/announcement.controller.js";
import { authMiddleware, isAdmin } from "../middleware.js";

const router = express.Router();

// Admin only
router.post("/announcements", authMiddleware, isAdmin, createAnnouncement);

// Public/User
router.get("/announcements", authMiddleware, getAnnouncements);
router.put("/announcements/:id", authMiddleware, isAdmin, updateAnnouncement);
router.get("/announcements/:id", authMiddleware, isAdmin,getAnnouncements);
router.delete(
  "/announcements/:id",
  authMiddleware,
  isAdmin,
  deleteAnnouncement
);

export default router;
