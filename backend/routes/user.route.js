import express from "express";
import {
  getAdminStats,
  getUserDashboard,
  getUserProfile,
  getUserStreaks,
  GoogleLoginController,
  loginController,
  registerController,
  updateUserProfile,
} from "../controllers/user.controller.js";
import { authMiddleware, isAdmin } from "../middleware.js";
const router = express.Router();

router.post("/register", registerController);
router.post("/login", loginController);
router.post("/auth/google", GoogleLoginController);
router.get("/user/profile", authMiddleware, getUserProfile);
router.get("/user/streaks", authMiddleware, getUserStreaks);

router.get("/user/dashboard", authMiddleware, getUserDashboard);
router.put("/user/profile", authMiddleware, updateUserProfile);

router.get("/admin/stats", authMiddleware, isAdmin, getAdminStats);

export default router;
