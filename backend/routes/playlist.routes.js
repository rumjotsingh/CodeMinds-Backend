import express from "express";
import {
  createPlaylist,
  getUserPlaylists,
  getPlaylist,
  updatePlaylist,
  deletePlaylist,
  addProblemToPlaylist,
  removeProblemFromPlaylist,
} from "../controllers/playlist.controller.js";
import { authMiddleware } from "../middleware.js";

const router = express.Router();

router.post("/playlists", authMiddleware, createPlaylist);
router.get("/playlists", authMiddleware, getUserPlaylists);
router.get("/playlists/:id", authMiddleware, getPlaylist);
router.put("/playlists/:id", authMiddleware, updatePlaylist);
router.delete("/playlists/:id", authMiddleware, deletePlaylist);
router.post("/playlists/:id/add", authMiddleware, addProblemToPlaylist);
router.post("/playlists/:id/remove", authMiddleware, removeProblemFromPlaylist);

export default router;
