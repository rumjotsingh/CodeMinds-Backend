import Playlist from "../models/playlist.model.js";
import Problem from "../models/problem.model.js";

// ✅ Create new playlist
export const createPlaylist = async (req, res) => {
  const { title, description } = req.body;
  const userId = req.user._id;
  try {
    const playlist = await Playlist.create({ title, description, userId });
    res.status(201).json({ message: "Playlist created", playlist });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to create playlist", error: err.message });
  }
};

// ✅ Get all playlists for logged-in user
export const getUserPlaylists = async (req, res) => {
  try {
    const playlists = await Playlist.find({ userId: req.user._id });
    res.json(playlists);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching playlists", error: err.message });
  }
};

// ✅ Get a single playlist with problems
export const getPlaylist = async (req, res) => {
  try {
    const playlist = await Playlist.findById(req.params.id).populate(
      "problems"
    );
    if (!playlist)
      return res.status(404).json({ message: "Playlist not found" });
    res.json(playlist);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching playlist", error: err.message });
  }
};

// ✅ Update playlist title/description
export const updatePlaylist = async (req, res) => {
  try {
    const playlist = await Playlist.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.json({ message: "Playlist updated", playlist });
  } catch (err) {
    res.status(500).json({ message: "Failed to update", error: err.message });
  }
};

// ✅ Delete playlist
export const deletePlaylist = async (req, res) => {
  try {
    await Playlist.findByIdAndDelete(req.params.id);
    res.json({ message: "Playlist deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete", error: err.message });
  }
};

// ✅ Add problem to playlist
export const addProblemToPlaylist = async (req, res) => {
  const { problemId } = req.body;
  try {
    const playlist = await Playlist.findById(req.params.id);
    const problemToAdd = await Problem.findById(problemId);

    if (!problemToAdd) {
      return res.status(404).json({ message: "Problem not found" });
    }
    if (playlist.problems.includes(problemId)) {
      return res.status(400).json({ message: "Problem already in playlist" });
    }

    if (!playlist.problems.some(p => p.id === problemToAdd.id)) {
      playlist.problems.push(problemToAdd);
      await playlist.save();
    }
    res.json({ message: "Problem added", playlist });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to add problem", error: err.message });
  }
};

// ✅ Remove problem from playlist
export const removeProblemFromPlaylist = async (req, res) => {
  const { problemId } = req.body;
  try {
    const playlist = await Playlist.findById(req.params.id);
    playlist.problems = playlist.problems.filter(
      (p) => p.id.toString() !== problemId
    );
    await playlist.save();
    res.json({ message: "Problem removed", playlist });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to remove problem", error: err.message });
  }
};
