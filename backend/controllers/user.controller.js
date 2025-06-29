import User from "../models/user.model.js";
import JWT from "jsonwebtoken";
import bcrypt from "bcryptjs";
import submissionModel from "../models/submission.model.js";

import Submission from "../models/submission.model.js";

import moment from "moment";
import { OAuth2Client } from "google-auth-library";
export const registerController = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // Basic field validation
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Please fill all the fields" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "User already exists" }); // 409 = Conflict
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const user = new User({ name, email, password: hashedPassword });
    await user.save();

    res.status(201).json({
      message: "User registered successfully",
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Register Error:", error);
    res.status(500).json({ message: "Server error during registration" });
  }
};
export const loginController = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Validate fields
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Find user
    const user = await User.findOne({ email }).select("+password"); // password is select: false
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials1" });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials2" });
    }

    // Generate JWT
    const token = JWT.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      {
        expiresIn: "10h",
      }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ error: "Server error during login" });
  }
};

export const GoogleLoginController = async (req, res) => {
  const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  try {
    const { id_token } = req.body;

    if (!id_token) {
      return res.status(400).json({ message: "Missing id_token" });
    }

    // Verify token with Google
    const ticket = await client.verifyIdToken({
      idToken: id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload(); // verified data from Google
    const { email, name, picture, sub } = payload;

    // Check if user already exists
    let user = await User.findOne({ email });

    if (!user) {
      user = new User({
        name,
        email,
        avatar: picture,
        googleId: sub, // Google's unique user ID
      });
      await user.save();
    }

    // Create JWT token
    const token = JWT.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "10h" }
    );

    return res.status(200).json({
      message: "Google login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Google login error:", err);
    return res
      .status(500)
      .json({ message: "Server error during Google login" });
  }
};

export const getUserProfile = async (req, res) => {
  try {
    const user = req.user;
    res.status(200).json({
      message: "User profile fetched successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching profile" });
  }
};
export const updateUserProfile = async (req, res) => {
  try {
    const user = req.user;
    const { name, password } = req.body;

    if (name) user.name = name;

    if (password) {
      if (password.length < 6) {
        return res
          .status(400)
          .json({ message: "Password must be at least 6 characters" });
      }
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    await user.save();

    res.status(200).json({
      message: "Profile updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Error updating profile" });
  }
};
export const getUserDashboard = async (req, res) => {
  try {
    const userId = req.user._id;

    const totalSubmissions = await submissionModel.countDocuments({ userId });
    const totalCorrect = await submissionModel.countDocuments({
      userId,
      isCorrect: true,
    });

    const totalProblemsSolved = await submissionModel.distinct("problemId", {
      userId,
      isCorrect: true,
    });

    const recentSubmissions = await submissionModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("problemId", "title");

    res.json({
      totalSubmissions,
      totalCorrect,
      totalProblemsSolved: totalProblemsSolved.length,
      recentSubmissions,
    });
  } catch (error) {
    console.error("❌ Error fetching dashboard:", error.message);
    res.status(500).json({ message: "Failed to fetch dashboard data" });
  }
};
export const getUserStreaks = async (req, res) => {
  try {
    const userId = req.user._id;

    const streaks = await submissionModel.aggregate([
      {
        $match: {
          userId,
          isCorrect: true,
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    const streakMap = {};
    streaks.forEach((entry) => {
      streakMap[entry._id] = entry.count;
    });

    res.json(streakMap);
  } catch (err) {
    console.error("Error in getUserStreaks:", err.message);
    res.status(500).json({ message: "Failed to fetch streaks" });
  }
};

export const getAdminStats = async (req, res) => {
  try {
    // Total Users
    const totalUsers = await User.countDocuments();

    // Total Submissions
    const totalSubmissions = await Submission.countDocuments();

    // Most Solved Problems (by correct submissions)
    const mostSolved = await Submission.aggregate([
      { $match: { isCorrect: true } },
      { $group: { _id: "$problemId", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "problems",
          localField: "_id",
          foreignField: "_id",
          as: "problem",
        },
      },
      { $unwind: "$problem" },
      {
        $project: {
          _id: 0,
          problemId: "$problem._id",
          title: "$problem.title",
          count: 1,
        },
      },
    ]);

    // Active Users This Week (who submitted in last 7 days)
    const sevenDaysAgo = moment().subtract(7, "days").toDate();
    const activeUsers = await Submission.distinct("userId", {
      createdAt: { $gte: sevenDaysAgo },
    });
    const activeUserCount = activeUsers.length;

    res.status(200).json({
      totalUsers,
      totalSubmissions,
      mostSolved,
      activeUserCount,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch stats", error: error.message });
  }
};
