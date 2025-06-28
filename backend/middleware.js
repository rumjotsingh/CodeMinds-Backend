import jwt from "jsonwebtoken";
import User from "./models/user.model.js";
import Contest from "./models/contest.model.js";

export const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer "))
    return res.status(401).json({ message: "Unauthorized" });

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) return res.status(404).json({ message: "User not found" });

    req.user = user; // attach user to request
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};
export const isAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Access denied: Admins only" });
  }
  next();
};

export const checkContestActive = async (req, res, next) => {
  try {
    const contestId = req.params.contestId;
    const contest = await Contest.findById(contestId);
    if (!contest) return res.status(404).json({ message: "Contest not found" });

    const now = new Date();
    const istTime = now.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

    if (istTime < contest.startTime)
      return res.status(403).json({ message: "Contest has not started yet" });
    if (istTime > contest.endTime)
      return res.status(403).json({ message: "Contest has ended" });

    // all good
    next();
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Contest check failed", error: err.message });
  }
};
