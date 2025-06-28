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

dotenv.config();

const app = express();
app.use(express.json());

app.use(cors());
app.use(express.urlencoded({ extended: true }));
main()
  .then(() => {
    console.log("Connected to Database");
  })
  .catch((err) => {
    console.log(err);
  });
async function main() {
  await mongoose.connect(process.env.MONGO_URL);
}
app.listen(process.env.PORT, (req, res) => {
  console.log("the sever is listening up port ", process.env.PORT);
});
app.use("/api/v1", UserRoutes);
app.use("/api/v1", problemRoute);
app.use("/api/v1", submissionRoutes);
app.use("/api/v1", commentRoutes);

app.use("/api/v1", announcementRoutes);
app.use("/api/v1", leaderboardRoutes);
app.use("/api/v1", playlistRoutes);
app.use("/api/v1", contestRoutes);
