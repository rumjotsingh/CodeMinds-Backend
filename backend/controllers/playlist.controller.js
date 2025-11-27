import Playlist from "../models/playlist.model.js";
import Problem from "../models/problem.model.js";
import redisClient from "../config/redis.js";

// ✅ Create new playlist
export const createPlaylist = async (req, res) => {
  const { title, description, tags, difficulty } = req.body;
  const userId = req.user._id;

  try {
    const playlist = await Playlist.create({
      title,
      description,
      userId,
      tags: tags || [],
      difficulty: difficulty || "MIXED",
    });

    // Clear user playlists cache
    await redisClient.delPattern(`playlists:user:${userId}:*`);

    res
      .status(201)
      .json({ message: "Playlist created successfully", playlist });
  } catch (err) {
    res.status(500).json({
      message: "Failed to create playlist",
      error: err.message,
    });
  }
};

// ✅ Get all playlists for logged-in user
export const getUserPlaylists = async (req, res) => {
  const userId = req.user._id;
  const cacheKey = `playlists:user:${userId}`;

  try {
    // Check cache first
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      console.log("Cache hit");
      return res.json({ playlists: cached, source: "cache" });
    }

    const playlists = await Playlist.find({ userId })
      .select(
        "title description problemCount isPublic tags difficulty createdAt updatedAt"
      )
      .sort({ updatedAt: -1 });

    // Cache for 5 minutes
    await redisClient.set(cacheKey, playlists, 300);

    res.json({ playlists, source: "database" });
  } catch (err) {
    res.status(500).json({
      message: "Error fetching playlists",
      error: err.message,
    });
  }
};

// ✅ Get a single playlist with problems
export const getPlaylist = async (req, res) => {
  const playlistId = req.params.id;
  const cacheKey = `playlist:${playlistId}:details`;

  try {
    // Check cache first
    const cached = await upstashRedisClient.get(cacheKey);
    if (cached) {
      return res.json({ ...cached, source: "cache" });
    }

    const playlist = await Playlist.findById(playlistId)
      .populate({
        path: "problems",
        select: "title description difficulty tags createdAt",
      })
      .populate({
        path: "userId",
        select: "username profilePicture",
      });

    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found" });
    }

    // Check if user has access (owner or public playlist)
    if (
      !playlist.isPublic &&
      playlist.userId._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Cache for 5 minutes
    await upstashRedisClient.set(cacheKey, playlist, 300);

    res.json({ playlist, source: "database" });
  } catch (err) {
    res.status(500).json({
      message: "Error fetching playlist",
      error: err.message,
    });
  }
};

// ✅ Update playlist title/description
export const updatePlaylist = async (req, res) => {
  const playlistId = req.params.id;
  const { title, description, tags, difficulty, isPublic } = req.body;

  try {
    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found" });
    }

    // Check ownership
    if (playlist.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Update fields
    if (title !== undefined) playlist.title = title;
    if (description !== undefined) playlist.description = description;
    if (tags !== undefined) playlist.tags = tags;
    if (difficulty !== undefined) playlist.difficulty = difficulty;
    if (isPublic !== undefined) playlist.isPublic = isPublic;

    await playlist.save();

    // Clear related caches
    await upstashRedisClient.del(`playlist:${playlistId}:details`);
    await upstashRedisClient.delPattern(`playlists:user:${req.user._id}:*`);

    res.json({ message: "Playlist updated successfully", playlist });
  } catch (err) {
    res.status(500).json({
      message: "Failed to update playlist",
      error: err.message,
    });
  }
};

// ✅ Delete playlist
export const deletePlaylist = async (req, res) => {
  const playlistId = req.params.id;

  try {
    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found" });
    }

    // Check ownership
    if (playlist.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Access denied" });
    }

    await Playlist.findByIdAndDelete(playlistId);

    // Clear related caches
    await upstashRedisClient.del(`playlist:${playlistId}:details`);
    await upstashRedisClient.delPattern(`playlists:user:${req.user._id}:*`);

    res.json({ message: "Playlist deleted successfully" });
  } catch (err) {
    res.status(500).json({
      message: "Failed to delete playlist",
      error: err.message,
    });
  }
};

// ✅ Add problem to playlist
export const addProblemToPlaylist = async (req, res) => {
  const { problemId } = req.body;
  const playlistId = req.params.id;

  try {
    // Validate problem exists
    const problem = await Problem.findById(problemId);
    if (!problem) {
      return res.status(404).json({ message: "Problem not found" });
    }

    // Find the playlist
    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found" });
    }

    // Check ownership
    if (playlist.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Check if problem already exists in playlist
    const problemExists = playlist.problems.some(
      (pid) => pid.toString() === problemId
    );

    if (problemExists) {
      return res.status(400).json({
        message: "Problem already exists in this playlist",
      });
    }

    // Add problem to playlist
    playlist.problems.push(problemId);
    await playlist.save(); // This will trigger the pre-save hook to update problemCount

    // Clear related caches
    await upstashRedisClient.del(`playlist:${playlistId}:details`);

    // Populate the newly added problem for response
    await playlist.populate({
      path: "problems",
      select: "title description difficulty tags",
    });

    res.json({
      message: "Problem added successfully",
      playlist,
      addedProblem: problem,
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to add problem",
      error: err.message,
    });
  }
};

// ✅ Remove problem from playlist
export const removeProblemFromPlaylist = async (req, res) => {
  const { problemId } = req.body;
  const playlistId = req.params.id;

  try {
    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found" });
    }

    // Check ownership
    if (playlist.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Check if problem exists in playlist
    const problemIndex = playlist.problems.findIndex(
      (pid) => pid.toString() === problemId
    );

    if (problemIndex === -1) {
      return res.status(404).json({
        message: "Problem not found in this playlist",
      });
    }

    // Remove problem from playlist
    playlist.problems.splice(problemIndex, 1);
    await playlist.save(); // This will trigger the pre-save hook to update problemCount

    // Clear related caches
    await upstashRedisClient.del(`playlist:${playlistId}:details`);
    await upstashRedisClient.delPattern(`playlists:user:${req.user._id}:*`);

    res.json({
      message: "Problem removed successfully",
      playlist,
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to remove problem",
      error: err.message,
    });
  }
};

// ✅ Get public playlists
export const getPublicPlaylists = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const cacheKey = `playlists:public:page:${page}:limit:${limit}`;

  try {
    // Check cache first
    const cached = await upstashRedisClient.get(cacheKey);
    if (cached) {
      return res.json({ ...cached, source: "cache" });
    }

    const [playlists, total] = await Promise.all([
      Playlist.find({ isPublic: true })
        .populate({
          path: "userId",
          select: "username profilePicture",
        })
        .select(
          "title description problemCount tags difficulty createdAt updatedAt"
        )
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit),
      Playlist.countDocuments({ isPublic: true }),
    ]);

    const result = {
      playlists,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };

    // Cache for 5 minutes
    await upstashRedisClient.set(cacheKey, result, 300);

    res.json({ ...result, source: "database" });
  } catch (err) {
    res.status(500).json({
      message: "Error fetching public playlists",
      error: err.message,
    });
  }
};

// ✅ Search playlists
export const searchPlaylists = async (req, res) => {
  const { query, difficulty, tags } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  try {
    const searchFilter = { isPublic: true };

    if (query) {
      searchFilter.$or = [
        { title: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } },
      ];
    }

    if (difficulty && difficulty !== "ALL") {
      searchFilter.difficulty = difficulty;
    }

    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      searchFilter.tags = { $in: tagArray };
    }

    const [playlists, total] = await Promise.all([
      Playlist.find(searchFilter)
        .populate({
          path: "userId",
          select: "username profilePicture",
        })
        .select(
          "title description problemCount tags difficulty createdAt updatedAt"
        )
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit),
      Playlist.countDocuments(searchFilter),
    ]);

    res.json({
      playlists,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      searchCriteria: { query, difficulty, tags },
    });
  } catch (err) {
    res.status(500).json({
      message: "Error searching playlists",
      error: err.message,
    });
  }
};
