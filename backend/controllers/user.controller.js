import User from "../models/user.model.js";
import JWT from "jsonwebtoken";
import bcrypt from "bcryptjs";
import submissionModel from "../models/submission.model.js";

import Submission from "../models/submission.model.js";

import moment from "moment";
import { OAuth2Client } from "google-auth-library";
// 🚀 BLAZING FAST: Ultra-optimized user registration with checks
export const registerController = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // Basic field validation
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Please fill all the fields" });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // Password strength validation
    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    // 🚀 Ultra-fast existence check with projection
    const existingUser = await User.findOne({ email }).select("_id").lean();
    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    // Hash password with optimal cost
    const salt = await bcrypt.genSalt(12); // Increased security
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user with optimized fields
    const user = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      createdAt: new Date(),
      streak: 0,
      calendar: new Map(),
    });

    await user.save();

    // Generate token immediately
    const token = JWT.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "10h" }
    );

    res.status(201).json({
      message: "User registered successfully",
      success: true,
      token, // Include token for immediate login
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        streak: user.streak,
      },
    });
  } catch (error) {
    console.error("❌ Register Error:", error);
    res.status(500).json({ message: "Server error during registration" });
  }
};
// 🚀 BLAZING FAST: Optimized login with efficient user lookup
export const loginController = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Validate fields
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // 🚀 Optimized user lookup with minimal projection
    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    })
      .select("+password name email role streak lastSolvedDate")
      .lean();

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Generate JWT with additional user info
    const token = JWT.sign(
      {
        userId: user._id,
        role: user.role,
        email: user.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "10h" }
    );

    // Update last login (background operation)
    User.findByIdAndUpdate(user._id, {
      lastLoginAt: new Date(),
    }).exec(); // Fire and forget

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        streak: user.streak || 0,
        lastSolvedDate: user.lastSolvedDate,
      },
    });
  } catch (err) {
    console.error("❌ Login Error:", err);
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
// 🚀 BLAZING FAST: Comprehensive optimized dashboard with single aggregation
export const getUserDashboard = async (req, res) => {
  try {
    const userId = req.user._id;

    // 🚀 Ultra-optimized single aggregation for all dashboard data
    const pipeline = [
      { $match: { userId } },
      {
        $facet: {
          // Overall statistics
          stats: [
            {
              $group: {
                _id: null,
                totalSubmissions: { $sum: 1 },
                totalCorrect: {
                  $sum: { $cond: [{ $eq: ["$isCorrect", true] }, 1, 0] },
                },
                uniqueProblems: { $addToSet: "$problemId" },
                lastSubmission: { $max: "$createdAt" },
                languages: { $addToSet: "$languageId" },
              },
            },
            {
              $addFields: {
                totalProblemsSolved: { $size: "$uniqueProblems" },
                successRate: {
                  $cond: [
                    { $gt: ["$totalSubmissions", 0] },
                    {
                      $multiply: [
                        { $divide: ["$totalCorrect", "$totalSubmissions"] },
                        100,
                      ],
                    },
                    0,
                  ],
                },
                languageCount: { $size: "$languages" },
              },
            },
          ],
          // Recent submissions with problem details
          recentSubmissions: [
            { $sort: { createdAt: -1 } },
            { $limit: 5 },
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
              },
            },
            {
              $project: {
                createdAt: 1,
                verdict: 1,
                isCorrect: 1,
                languageId: 1,
                passedTestCases: 1,
                totalTestCases: 1,
                problemTitle: "$problem.title",
                problemDifficulty: "$problem.difficulty",
              },
            },
          ],
          // Weekly activity
          weeklyActivity: [
            {
              $match: {
                createdAt: {
                  $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                },
              },
            },
            {
              $group: {
                _id: {
                  $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
                },
                submissions: { $sum: 1 },
                solved: {
                  $sum: { $cond: [{ $eq: ["$isCorrect", true] }, 1, 0] },
                },
              },
            },
            { $sort: { _id: 1 } },
          ],
        },
      },
    ];

    const [result] = await Submission.aggregate(pipeline);
    const stats = result.stats[0] || {
      totalSubmissions: 0,
      totalCorrect: 0,
      totalProblemsSolved: 0,
      successRate: 0,
      languageCount: 0,
      lastSubmission: null,
    };

    // Get user streak info
    const user = await User.findById(userId)
      .select("streak lastSolvedDate calendar")
      .lean();

    res.json({
      ...stats,
      streak: user?.streak || 0,
      lastSolvedDate: user?.lastSolvedDate,
      recentSubmissions: result.recentSubmissions || [],
      weeklyActivity: result.weeklyActivity || [],
      performance: {
        successRate: Math.round(stats.successRate || 0),
        totalLanguages: stats.languageCount || 0,
        averageSubmissionsPerDay:
          stats.totalSubmissions > 0
            ? Math.round(stats.totalSubmissions / 30) // Last 30 days estimate
            : 0,
      },
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

// 🚀 BLAZING FAST: Ultra-optimized admin statistics with comprehensive metrics
export const getAdminStats = async (req, res) => {
  try {
    // 🚀 Parallel execution for maximum speed
    const [userStats, submissionStats, problemStats, activityStats] =
      await Promise.all([
        // User statistics
        User.aggregate([
          {
            $facet: {
              total: [{ $count: "count" }],
              roleDistribution: [
                { $group: { _id: "$role", count: { $sum: 1 } } },
              ],
              recentUsers: [
                {
                  $match: {
                    createdAt: {
                      $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                    },
                  },
                },
                { $count: "count" },
              ],
            },
          },
        ]),

        // Submission statistics
        Submission.aggregate([
          {
            $facet: {
              total: [{ $count: "count" }],
              verdictDistribution: [
                { $group: { _id: "$verdict", count: { $sum: 1 } } },
              ],
              languageDistribution: [
                { $group: { _id: "$languageId", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 10 },
              ],
              dailySubmissions: [
                {
                  $match: {
                    createdAt: {
                      $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                    },
                  },
                },
                {
                  $group: {
                    _id: {
                      $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
                    },
                    count: { $sum: 1 },
                    accepted: {
                      $sum: {
                        $cond: [{ $eq: ["$verdict", "Accepted"] }, 1, 0],
                      },
                    },
                  },
                },
                { $sort: { _id: 1 } },
              ],
            },
          },
        ]),

        // Problem statistics
        Submission.aggregate([
          { $match: { isCorrect: true } },
          { $group: { _id: "$problemId", solveCount: { $sum: 1 } } },
          { $sort: { solveCount: -1 } },
          { $limit: 10 },
          {
            $lookup: {
              from: "problems",
              localField: "_id",
              foreignField: "_id",
              as: "problem",
              pipeline: [{ $project: { title: 1, difficulty: 1, tags: 1 } }],
            },
          },
          {
            $addFields: {
              problem: { $arrayElemAt: ["$problem", 0] },
            },
          },
          {
            $project: {
              problemId: "$_id",
              title: "$problem.title",
              difficulty: "$problem.difficulty",
              tags: "$problem.tags",
              solveCount: 1,
              _id: 0,
            },
          },
        ]),

        // Active users (last 7 days)
        Submission.aggregate([
          {
            $match: {
              createdAt: {
                $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
              },
            },
          },
          { $group: { _id: "$userId" } },
          { $count: "activeUsers" },
        ]),
      ]);

    // Process results
    const totalUsers = userStats[0]?.total[0]?.count || 0;
    const totalSubmissions = submissionStats[0]?.total[0]?.count || 0;
    const activeUserCount = activityStats[0]?.activeUsers || 0;
    const recentUserCount = userStats[0]?.recentUsers[0]?.count || 0;

    res.status(200).json({
      overview: {
        totalUsers,
        totalSubmissions,
        activeUserCount,
        recentUserCount,
        userGrowthRate:
          totalUsers > 0 ? Math.round((recentUserCount / totalUsers) * 100) : 0,
      },
      users: {
        total: totalUsers,
        roleDistribution: userStats[0]?.roleDistribution || [],
        recentSignups: recentUserCount,
      },
      submissions: {
        total: totalSubmissions,
        verdictDistribution: submissionStats[0]?.verdictDistribution || [],
        languageDistribution: submissionStats[0]?.languageDistribution || [],
        dailyActivity: submissionStats[0]?.dailySubmissions || [],
      },
      problems: {
        mostSolved: problemStats || [],
      },
      engagement: {
        activeUsers: activeUserCount,
        engagementRate:
          totalUsers > 0 ? Math.round((activeUserCount / totalUsers) * 100) : 0,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching admin stats:", error);
    res.status(500).json({
      message: "Failed to fetch admin statistics",
      error: error.message,
    });
  }
};
