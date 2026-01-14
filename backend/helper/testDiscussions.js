import mongoose from "mongoose";
import dotenv from "dotenv";
import Problem from "../models/problem.model.js";
import Comment from "../models/comment.model.js";
import User from "../models/user.model.js";

dotenv.config();

async function testDiscussionAPI() {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log("✅ Connected to MongoDB\n");

    // Get a sample problem
    const problem = await Problem.findOne();
    if (!problem) {
      console.log("❌ No problems found. Please seed problems first.");
      process.exit(1);
    }

    console.log("📝 Sample Problem:");
    console.log(`   Title: ${problem.title}`);
    console.log(`   ID: ${problem._id}\n`);

    // Get discussions for this problem
    const discussions = await Comment.find({
      problemId: problem._id,
      parentId: null,
    })
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .limit(3)
      .lean();

    console.log(`💬 Found ${discussions.length} discussions:\n`);

    discussions.forEach((disc, index) => {
      const voteCount = disc.upvotes.length - disc.downvotes.length;
      console.log(`${index + 1}. ${disc.content.substring(0, 80)}...`);
      console.log(`   Author: ${disc.userId.name}`);
      console.log(`   Votes: ${voteCount} | Replies: ${disc.replyCount}`);
      console.log(`   Tags: ${disc.tags.join(", ")}`);
      console.log(`   ID: ${disc._id}\n`);
    });

    // Get replies for first discussion
    if (discussions.length > 0) {
      const replies = await Comment.find({ parentId: discussions[0]._id })
        .populate("userId", "name")
        .lean();

      if (replies.length > 0) {
        console.log(`💡 Replies to first discussion (${replies.length}):\n`);
        replies.forEach((reply, index) => {
          console.log(`   ${index + 1}. ${reply.content.substring(0, 60)}...`);
          console.log(`      By: ${reply.userId.name}\n`);
        });
      }
    }

    // Test URLs
    console.log("\n🧪 TEST THESE API ENDPOINTS:\n");
    console.log(`1. Get all discussions (sorted by hot):`);
    console.log(
      `   GET http://localhost:8080/api/v1/problems/${problem._id}/comments?sortBy=hot\n`
    );

    if (discussions.length > 0) {
      console.log(`2. Get replies for a comment:`);
      console.log(
        `   GET http://localhost:8080/api/v1/comments/${discussions[0]._id}/replies\n`
      );

      console.log(`3. Upvote a discussion (requires auth token):`);
      console.log(
        `   POST http://localhost:8080/api/v1/comments/${discussions[0]._id}/upvote`
      );
      console.log(`   Header: Authorization: Bearer YOUR_JWT_TOKEN\n`);
    }

    console.log(`4. Create a new discussion (requires auth token):`);
    console.log(
      `   POST http://localhost:8080/api/v1/problems/${problem._id}/comments`
    );
    console.log(`   Header: Authorization: Bearer YOUR_JWT_TOKEN`);
    console.log(
      `   Body: { "content": "Your discussion...", "tags": ["solution"] }\n`
    );

    const totalDiscussions = await Comment.countDocuments();
    console.log(`\n📊 Total discussions in database: ${totalDiscussions}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

testDiscussionAPI();
