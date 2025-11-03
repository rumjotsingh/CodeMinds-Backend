import mongoose from "mongoose";

const playlistSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
    },
    problems: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Problem",
      },
    ],
    isPublic: {
      type: Boolean,
      default: false,
    },
    tags: [String], // Optional: for categorizing playlists
    difficulty: {
      type: String,
      enum: ["EASY", "MEDIUM", "HARD", "MIXED"],
      default: "MIXED",
    },
    problemCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Middleware to update problemCount automatically
playlistSchema.pre("save", function (next) {
  this.problemCount = this.problems.length;
  next();
});

// Index for faster lookups
playlistSchema.index({ userId: 1 });
playlistSchema.index({ isPublic: 1 });
playlistSchema.index({ tags: 1 });

const Playlist = mongoose.model("Playlist", playlistSchema);
export default Playlist;
