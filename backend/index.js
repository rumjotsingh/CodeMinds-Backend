import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import UserRoutes from "./routes/user.route.js";
import problemRoute from "./routes/problem.routes.js";
import submissionRoutes from "./routes/submission.routes.js";
import commentRoutes from "./routes/comment.routes.js";
import leaderboardRoutes from "./routes/leaderboard.routes.js";
import playlistRoutes from "./routes/playlist.routes.js";
import announcementRoutes from "./routes/announcement.routes.js";
import contestRoutes from "./routes/contest.routes.js";
import cors from "cors";
import redisClient from "./config/redis.js";
import { rateLimiter } from "./middleware/cache.js";

dotenv.config();

const app = express();
app.use(express.json());

app.use(cors());
app.use(express.urlencoded({ extended: true }));

// Global rate limiting (100 requests per minute)
app.use(rateLimiter(100, 60000, "Too many requests, please try again later"));

// Initialize database and Redis connections
Promise.all([
  main(), // MongoDB connection
  redisClient.connect(), // Redis connection
])
  .then(() => {
    console.log("✅ All services connected successfully");
  })
  .catch((err) => {
    console.error("❌ Service connection error:", err);
  });

async function main() {
  await mongoose.connect(process.env.MONGO_URL);
  console.log("✅ Connected to MongoDB Database");
}
app.listen(process.env.PORT, (req, res) => {
  console.log("🚀 Server is listening on port", process.env.PORT);
});

// Routes
app.use("/api/v1", UserRoutes);
app.use("/api/v1", problemRoute);
app.use("/api/v1", submissionRoutes);
app.use("/api/v1", commentRoutes);
app.use("/api/v1", announcementRoutes);
app.use("/api/v1", leaderboardRoutes);
app.use("/api/v1", playlistRoutes);
app.use("/api/v1", contestRoutes);

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("🔄 SIGTERM received, shutting down gracefully...");
  await redisClient.disconnect();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("🔄 SIGINT received, shutting down gracefully...");
  await redisClient.disconnect();
  process.exit(0);
});
