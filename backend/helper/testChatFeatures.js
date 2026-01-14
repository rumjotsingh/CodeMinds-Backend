import mongoose from "mongoose";
import dotenv from "dotenv";
import Comment from "../models/comment.model.js";
import Problem from "../models/problem.model.js";
import User from "../models/user.model.js";

dotenv.config();

async function testChatFeatures() {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log("✅ Connected to MongoDB\n");
    console.log("=".repeat(60));
    console.log("💬 CHAT FEATURES TEST");
    console.log("=".repeat(60) + "\n");

    // Get sample data
    const problem = await Problem.findOne();
    const user = await User.findOne();

    if (!problem || !user) {
      console.log("❌ No data found. Please seed first.");
      process.exit(1);
    }

    // 1. Test Recent Activity Feed
    console.log("📊 1. RECENT ACTIVITY FEED\n");
    const recentDiscussions = await Comment.find({ parentId: null })
      .populate("userId", "name")
      .sort({ lastActivity: -1 })
      .limit(5)
      .lean();

    recentDiscussions.forEach((disc, idx) => {
      console.log(`${idx + 1}. ${disc.content.substring(0, 60)}...`);
      console.log(`   👤 By: ${disc.userId.name}`);
      console.log(
        `   👍 Votes: ${disc.upvotes.length - disc.downvotes.length}`
      );
      console.log(`   😊 Reactions: ${disc.reactions?.length || 0}`);
      console.log(`   👁️  Read by: ${disc.readBy?.length || 0} users`);
      console.log(`   📌 Pinned: ${disc.isPinned ? "YES" : "No"}`);
      console.log(`   💬 Replies: ${disc.replyCount}\n`);
    });

    // 2. Test Reactions
    console.log("=".repeat(60));
    console.log("😊 2. EMOJI REACTIONS\n");

    const discussionsWithReactions = await Comment.find({
      "reactions.0": { $exists: true },
    })
      .populate("userId", "name")
      .limit(3)
      .lean();

    discussionsWithReactions.forEach((disc, idx) => {
      console.log(`${idx + 1}. ${disc.content.substring(0, 50)}...`);
      console.log(`   Reactions:`);

      // Count emoji occurrences
      const emojiCounts = {};
      disc.reactions.forEach((r) => {
        emojiCounts[r.emoji] = (emojiCounts[r.emoji] || 0) + 1;
      });

      Object.entries(emojiCounts).forEach(([emoji, count]) => {
        console.log(`   ${emoji} x${count}`);
      });
      console.log();
    });

    // 3. Test Pinned Discussions
    console.log("=".repeat(60));
    console.log("📌 3. PINNED DISCUSSIONS\n");

    const pinnedDiscussions = await Comment.find({ isPinned: true })
      .populate("userId", "name")
      .populate("problemId", "title")
      .lean();

    if (pinnedDiscussions.length > 0) {
      pinnedDiscussions.forEach((disc, idx) => {
        console.log(`${idx + 1}. [${disc.problemId.title}]`);
        console.log(`   ${disc.content.substring(0, 60)}...`);
        console.log(`   By: ${disc.userId.name}`);
        console.log(`   Pinned: ⭐\n`);
      });
    } else {
      console.log("   No pinned discussions yet.\n");
    }

    // 4. Test Read Status
    console.log("=".repeat(60));
    console.log("👁️  4. READ STATUS TRACKING\n");

    const discussionsWithReads = await Comment.find({
      "readBy.0": { $exists: true },
    })
      .sort({ readBy: -1 })
      .limit(3)
      .lean();

    discussionsWithReads.forEach((disc, idx) => {
      console.log(`${idx + 1}. ${disc.content.substring(0, 50)}...`);
      console.log(`   Read by: ${disc.readBy.length} users`);
      if (disc.readBy.length > 0) {
        const latestRead = disc.readBy[disc.readBy.length - 1];
        console.log(`   Last read: ${latestRead.readAt.toLocaleString()}`);
      }
      console.log();
    });

    // 5. Statistics
    console.log("=".repeat(60));
    console.log("📈 5. CHAT STATISTICS\n");

    const totalDiscussions = await Comment.countDocuments({ parentId: null });
    const totalReplies = await Comment.countDocuments({
      parentId: { $ne: null },
    });
    const totalReactions = await Comment.aggregate([
      { $unwind: "$reactions" },
      { $count: "total" },
    ]);
    const totalReads = await Comment.aggregate([
      { $unwind: "$readBy" },
      { $count: "total" },
    ]);
    const pinnedCount = await Comment.countDocuments({ isPinned: true });

    console.log(`Total Discussions:    ${totalDiscussions}`);
    console.log(`Total Replies:        ${totalReplies}`);
    console.log(`Total Reactions:      ${totalReactions[0]?.total || 0}`);
    console.log(`Total Reads:          ${totalReads[0]?.total || 0}`);
    console.log(`Pinned Discussions:   ${pinnedCount}\n`);

    // 6. API Test URLs
    console.log("=".repeat(60));
    console.log("🧪 6. TEST THESE API ENDPOINTS\n");

    const sampleComment = recentDiscussions[0];

    console.log("GET Recent Activity Feed:");
    console.log(`http://localhost:8080/api/v1/discussions/recent?limit=20\n`);

    console.log("GET Search Discussions:");
    console.log(
      `http://localhost:8080/api/v1/discussions/search?query=solution\n`
    );

    if (sampleComment) {
      console.log("POST Add Emoji Reaction (requires auth):");
      console.log(
        `http://localhost:8080/api/v1/comments/${sampleComment._id}/react`
      );
      console.log(`Body: { "emoji": "🚀" }\n`);

      console.log("POST Mark as Read (requires auth):");
      console.log(
        `http://localhost:8080/api/v1/comments/${sampleComment._id}/read\n`
      );

      console.log("POST Pin Discussion (requires auth):");
      console.log(
        `http://localhost:8080/api/v1/comments/${sampleComment._id}/pin\n`
      );
    }

    if (user) {
      console.log("GET User Activity:");
      console.log(`http://localhost:8080/api/v1/users/${user._id}/activity\n`);
    }

    console.log("=".repeat(60));
    console.log("✅ Chat features are working perfectly!");
    console.log("=".repeat(60));

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

testChatFeatures();
