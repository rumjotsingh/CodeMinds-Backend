import Announcement from "../models/announcement.model.js";
import User from "../models/user.model.js";
import mongoose from "mongoose";

// 🚀 BLAZING FAST: Optimized announcement creation with validation
export const createAnnouncement = async (req, res) => {
  try {
    const { title, message, priority = "normal", expiresAt } = req.body;
    const createdBy = req.user._id;

    // Enhanced validation
    if (!title || title.trim().length === 0) {
      return res.status(400).json({ message: "Title is required" });
    }

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ message: "Message is required" });
    }

    if (title.trim().length > 200) {
      return res
        .status(400)
        .json({ message: "Title too long (max 200 characters)" });
    }

    if (message.trim().length > 2000) {
      return res
        .status(400)
        .json({ message: "Message too long (max 2000 characters)" });
    }

    // Validate priority
    const validPriorities = ["low", "normal", "high", "urgent"];
    if (!validPriorities.includes(priority)) {
      return res.status(400).json({
        message: "Invalid priority. Must be: low, normal, high, or urgent",
      });
    }

    // Validate expiration date
    if (expiresAt && new Date(expiresAt) <= new Date()) {
      return res.status(400).json({
        message: "Expiration date must be in the future",
      });
    }

    // 🚀 Optimized creation with immediate statistics
    const announcement = await Announcement.create({
      title: title.trim(),
      message: message.trim(),
      createdBy,
      priority,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      createdAt: new Date(),
      isActive: true,
    });

    // 🚀 Efficient population with user details
    const populatedAnnouncement = await Announcement.findById(announcement._id)
      .populate("createdBy", "name email role")
      .lean();

    res.status(201).json({
      message: "Announcement created successfully",
      announcement: {
        ...populatedAnnouncement,
        wordCount: message.trim().split(/\s+/).length,
        estimatedReadTime: Math.ceil(message.trim().split(/\s+/).length / 200), // ~200 words per minute
      },
    });
  } catch (error) {
    console.error("❌ Error creating announcement:", error);
    res.status(500).json({
      message: "Error creating announcement",
      error: error.message,
    });
  }
};

// 🚀 BLAZING FAST: Ultra-optimized announcements with filtering and analytics
export const getAnnouncements = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      priority,
      isActive = "true",
      search,
      sortBy = "newest",
    } = req.query;
    const skip = (page - 1) * limit;

    // Build match conditions
    const matchConditions = {};

    // Filter by active status
    if (isActive !== "all") {
      matchConditions.isActive = isActive === "true";
    }

    // Filter by expiration
    if (isActive === "true") {
      matchConditions.$or = [
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } },
      ];
    }

    // Filter by priority
    if (priority) {
      const priorities = priority.split(",").map((p) => p.trim());
      matchConditions.priority = { $in: priorities };
    }

    // Search in title and message
    if (search) {
      matchConditions.$or = [
        { title: { $regex: search, $options: "i" } },
        { message: { $regex: search, $options: "i" } },
      ];
    }

    // Build sort options
    const sortOptions = {};
    switch (sortBy) {
      case "oldest":
        sortOptions.createdAt = 1;
        break;
      case "priority":
        sortOptions.priority = -1;
        sortOptions.createdAt = -1;
        break;
      case "title":
        sortOptions.title = 1;
        break;
      case "newest":
      default:
        sortOptions.createdAt = -1;
        break;
    }

    // 🚀 Advanced aggregation pipeline
    const pipeline = [
      { $match: matchConditions },
      {
        $lookup: {
          from: "users",
          localField: "createdBy",
          foreignField: "_id",
          as: "author",
          pipeline: [{ $project: { name: 1, email: 1, role: 1, avatar: 1 } }],
        },
      },
      {
        $addFields: {
          author: { $arrayElemAt: ["$author", 0] },
          wordCount: {
            $size: { $split: [{ $trim: { input: "$message" } }, " "] },
          },
          estimatedReadTime: {
            $ceil: {
              $divide: [
                { $size: { $split: [{ $trim: { input: "$message" } }, " "] } },
                200,
              ],
            },
          },
          isExpired: {
            $cond: [
              { $ne: ["$expiresAt", null] },
              { $lte: ["$expiresAt", new Date()] },
              false,
            ],
          },
          urgencyScore: {
            $switch: {
              branches: [
                { case: { $eq: ["$priority", "urgent"] }, then: 4 },
                { case: { $eq: ["$priority", "high"] }, then: 3 },
                { case: { $eq: ["$priority", "normal"] }, then: 2 },
                { case: { $eq: ["$priority", "low"] }, then: 1 },
              ],
              default: 2,
            },
          },
          daysRemaining: {
            $cond: [
              { $ne: ["$expiresAt", null] },
              {
                $ceil: {
                  $divide: [
                    { $subtract: ["$expiresAt", new Date()] },
                    1000 * 60 * 60 * 24,
                  ],
                },
              },
              null,
            ],
          },
        },
      },
      { $sort: sortOptions },
      { $skip: skip },
      { $limit: parseInt(limit) },
    ];

    const announcements = await Announcement.aggregate(pipeline);
    const total = await Announcement.countDocuments(matchConditions);

    // Get analytics
    const analytics = await Announcement.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          totalActive: { $sum: 1 },
          byPriority: {
            $push: "$priority",
          },
          averageWordCount: {
            $avg: {
              $size: { $split: [{ $trim: { input: "$message" } }, " "] },
            },
          },
          expiringSoon: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ["$expiresAt", null] },
                    {
                      $lte: [
                        "$expiresAt",
                        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                      ],
                    },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    const analyticsData = analytics[0] || {
      totalActive: 0,
      byPriority: [],
      averageWordCount: 0,
      expiringSoon: 0,
    };

    // Process priority distribution
    const priorityDistribution = {};
    analyticsData.byPriority.forEach((priority) => {
      priorityDistribution[priority] =
        (priorityDistribution[priority] || 0) + 1;
    });

    res.status(200).json({
      announcements,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
      analytics: {
        totalActive: analyticsData.totalActive,
        priorityDistribution,
        averageWordCount: Math.round(analyticsData.averageWordCount || 0),
        expiringSoon: analyticsData.expiringSoon,
      },
      filters: {
        priority,
        isActive,
        search,
        sortBy,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching announcements:", error);
    res.status(500).json({
      message: "Error fetching announcements",
      error: error.message,
    });
  }
};
// 🚀 BLAZING FAST: Optimized announcement update with validation
export const updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, message, priority, expiresAt, isActive } = req.body;

    // Build update object
    const updateData = {};

    if (title !== undefined) {
      if (!title || title.trim().length === 0) {
        return res.status(400).json({ message: "Title cannot be empty" });
      }
      if (title.trim().length > 200) {
        return res
          .status(400)
          .json({ message: "Title too long (max 200 characters)" });
      }
      updateData.title = title.trim();
    }

    if (message !== undefined) {
      if (!message || message.trim().length === 0) {
        return res.status(400).json({ message: "Message cannot be empty" });
      }
      if (message.trim().length > 2000) {
        return res
          .status(400)
          .json({ message: "Message too long (max 2000 characters)" });
      }
      updateData.message = message.trim();
    }

    if (priority !== undefined) {
      const validPriorities = ["low", "normal", "high", "urgent"];
      if (!validPriorities.includes(priority)) {
        return res.status(400).json({
          message: "Invalid priority. Must be: low, normal, high, or urgent",
        });
      }
      updateData.priority = priority;
    }

    if (expiresAt !== undefined) {
      if (expiresAt && new Date(expiresAt) <= new Date()) {
        return res.status(400).json({
          message: "Expiration date must be in the future",
        });
      }
      updateData.expiresAt = expiresAt ? new Date(expiresAt) : null;
    }

    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }

    updateData.updatedAt = new Date();

    // 🚀 Single optimized update with population
    const updated = await Announcement.findByIdAndUpdate(id, updateData, {
      new: true,
    })
      .populate("createdBy", "name email role")
      .lean();

    if (!updated) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    res.status(200).json({
      message: "Announcement updated successfully",
      announcement: {
        ...updated,
        wordCount: updated.message.trim().split(/\s+/).length,
        estimatedReadTime: Math.ceil(
          updated.message.trim().split(/\s+/).length / 200
        ),
      },
    });
  } catch (error) {
    console.error("❌ Error updating announcement:", error);
    res.status(500).json({
      message: "Failed to update announcement",
      error: error.message,
    });
  }
};
// 🚀 BLAZING FAST: Soft delete with analytics
export const deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const { permanent = false } = req.query;

    if (permanent === "true") {
      // Permanent deletion
      const deleted = await Announcement.findByIdAndDelete(id);

      if (!deleted) {
        return res.status(404).json({ message: "Announcement not found" });
      }

      res.status(200).json({
        message: "Announcement permanently deleted",
        deletedData: {
          title: deleted.title,
          createdAt: deleted.createdAt,
          wasActive: deleted.isActive,
        },
      });
    } else {
      // Soft delete (deactivate)
      const updated = await Announcement.findByIdAndUpdate(
        id,
        {
          isActive: false,
          deactivatedAt: new Date(),
        },
        { new: true }
      )
        .select("title isActive deactivatedAt")
        .lean();

      if (!updated) {
        return res.status(404).json({ message: "Announcement not found" });
      }

      res.status(200).json({
        message: "Announcement deactivated successfully",
        announcement: updated,
      });
    }
  } catch (error) {
    console.error("❌ Error deleting announcement:", error);
    res.status(500).json({
      message: "Failed to delete announcement",
      error: error.message,
    });
  }
};
export const getAnnouncementById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;

    // 🚀 Single aggregation for complete announcement data
    const pipeline = [
      { $match: { _id: new mongoose.Types.ObjectId(id) } },
      {
        $lookup: {
          from: "users",
          localField: "createdBy",
          foreignField: "_id",
          as: "author",
          pipeline: [{ $project: { name: 1, email: 1, role: 1, avatar: 1 } }],
        },
      },
      {
        $addFields: {
          author: { $arrayElemAt: ["$author", 0] },
          wordCount: {
            $size: { $split: [{ $trim: { input: "$message" } }, " "] },
          },
          estimatedReadTime: {
            $ceil: {
              $divide: [
                { $size: { $split: [{ $trim: { input: "$message" } }, " "] } },
                200,
              ],
            },
          },
          isExpired: {
            $cond: [
              { $ne: ["$expiresAt", null] },
              { $lte: ["$expiresAt", new Date()] },
              false,
            ],
          },
          daysRemaining: {
            $cond: [
              { $ne: ["$expiresAt", null] },
              {
                $ceil: {
                  $divide: [
                    { $subtract: ["$expiresAt", new Date()] },
                    1000 * 60 * 60 * 24,
                  ],
                },
              },
              null,
            ],
          },
          timeAgo: {
            $dateDiff: {
              startDate: "$createdAt",
              endDate: new Date(),
              unit: "hour",
            },
          },
        },
      },
    ];

    const [announcement] = await Announcement.aggregate(pipeline);

    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    res.status(200).json(announcement);
  } catch (error) {
    console.error("❌ Error fetching announcement:", error);
    res.status(500).json({
      message: "Error fetching announcement",
      error: error.message,
    });
  }
};

// 🚀 BLAZING FAST: Admin analytics for announcements
export const getAnnouncementAnalytics = async (req, res) => {
  try {
    const { period = "30d" } = req.query;

    // Calculate date range
    let dateFilter = {};
    const now = new Date();

    switch (period) {
      case "7d":
        dateFilter.createdAt = {
          $gte: new Date(now - 7 * 24 * 60 * 60 * 1000),
        };
        break;
      case "30d":
        dateFilter.createdAt = {
          $gte: new Date(now - 30 * 24 * 60 * 60 * 1000),
        };
        break;
      case "90d":
        dateFilter.createdAt = {
          $gte: new Date(now - 90 * 24 * 60 * 60 * 1000),
        };
        break;
      default:
        // All time
        break;
    }

    // 🚀 Comprehensive analytics aggregation
    const analytics = await Announcement.aggregate([
      { $match: dateFilter },
      {
        $facet: {
          overview: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                active: {
                  $sum: { $cond: ["$isActive", 1, 0] },
                },
                expired: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $ne: ["$expiresAt", null] },
                          { $lte: ["$expiresAt", now] },
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
                averageWordCount: {
                  $avg: {
                    $size: { $split: [{ $trim: { input: "$message" } }, " "] },
                  },
                },
              },
            },
          ],
          byPriority: [
            {
              $group: {
                _id: "$priority",
                count: { $sum: 1 },
                active: {
                  $sum: { $cond: ["$isActive", 1, 0] },
                },
              },
            },
            { $sort: { _id: 1 } },
          ],
          byAuthor: [
            {
              $group: {
                _id: "$createdBy",
                count: { $sum: 1 },
                active: {
                  $sum: { $cond: ["$isActive", 1, 0] },
                },
              },
            },
            {
              $lookup: {
                from: "users",
                localField: "_id",
                foreignField: "_id",
                as: "author",
                pipeline: [{ $project: { name: 1, email: 1 } }],
              },
            },
            {
              $addFields: {
                author: { $arrayElemAt: ["$author", 0] },
              },
            },
            { $sort: { count: -1 } },
            { $limit: 10 },
          ],
          timeline: [
            {
              $group: {
                _id: {
                  $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
                },
                count: { $sum: 1 },
                active: {
                  $sum: { $cond: ["$isActive", 1, 0] },
                },
              },
            },
            { $sort: { _id: 1 } },
          ],
        },
      },
    ]);

    const result = analytics[0];

    res.json({
      period,
      overview: result.overview[0] || {
        total: 0,
        active: 0,
        expired: 0,
        averageWordCount: 0,
      },
      byPriority: result.byPriority,
      byAuthor: result.byAuthor,
      timeline: result.timeline,
    });
  } catch (error) {
    console.error("❌ Error fetching announcement analytics:", error);
    res.status(500).json({
      message: "Error fetching analytics",
      error: error.message,
    });
  }
};
