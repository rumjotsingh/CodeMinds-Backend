import mongoose from "mongoose";
import dotenv from "dotenv";
import Comment from "../models/comment.model.js";
import Problem from "../models/problem.model.js";
import User from "../models/user.model.js";

dotenv.config();

const dummyDiscussions = [
  {
    content:
      "Here's an optimal O(n) solution using dynamic programming. The key insight is to maintain a running sum and handle edge cases properly.",
    tags: ["solution", "dynamic-programming"],
  },
  {
    content:
      "Can someone explain why the brute force approach times out for large inputs? I'm getting TLE on test case 45.",
    tags: ["help", "time-complexity"],
  },
  {
    content:
      "Amazing problem! This really helped me understand the two-pointer technique. Here's my implementation with detailed comments.",
    tags: ["solution", "two-pointers"],
  },
  {
    content:
      "I think there's a bug in test case 12. The expected output doesn't match the problem description. Can someone verify?",
    tags: ["bug", "clarification"],
  },
  {
    content:
      "For those struggling with this problem, try to solve it on paper first with a small example. Once you understand the pattern, the code writes itself.",
    tags: ["hint", "approach"],
  },
  {
    content:
      "Here's a Python solution with O(log n) time complexity using binary search. This is more efficient than the linear approach.",
    tags: ["solution", "binary-search", "python"],
  },
  {
    content:
      "Can someone clarify what 'optimal' means in this context? Are we optimizing for time or space complexity?",
    tags: ["clarification"],
  },
  {
    content:
      "This problem is similar to LeetCode 53 (Maximum Subarray). If you've solved that, this should be straightforward.",
    tags: ["similar-problem", "hint"],
  },
];

const replies = [
  {
    content:
      "Thanks for sharing! This approach worked perfectly. Can you explain why we need the edge case check at line 15?",
    parentIndex: 0,
  },
  {
    content:
      "The brute force is O(n²) which causes TLE. You need to optimize using memoization or tabulation to get it down to O(n).",
    parentIndex: 1,
  },
  {
    content:
      "I had the same issue! Make sure you're handling negative numbers correctly. That was my bug.",
    parentIndex: 1,
  },
  {
    content:
      "I checked test case 12 and it's correct. Make sure you're reading the input format properly - it's 0-indexed, not 1-indexed.",
    parentIndex: 3,
  },
  {
    content:
      "Great advice! I spent 30 minutes debugging before I realized I had the wrong approach.",
    parentIndex: 4,
  },
  {
    content:
      "Your binary search solution is brilliant! I didn't think of that approach. Here's a slight optimization...",
    parentIndex: 5,
  },
];

async function seedDiscussions() {
  try {
    console.log("🌱 Starting to seed discussion data...");

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URL);
    console.log("✅ Connected to MongoDB");

    // Get some users and problems
    const users = await User.find().limit(10);
    const problems = await Problem.find().limit(5);

    if (users.length === 0) {
      console.error("❌ No users found. Please create users first.");
      process.exit(1);
    }

    if (problems.length === 0) {
      console.error("❌ No problems found. Please seed problems first.");
      process.exit(1);
    }

    // Clear existing comments
    await Comment.deleteMany({});
    console.log("🗑️  Cleared existing discussions");

    // Create discussions for each problem
    for (const problem of problems) {
      console.log(`\n📝 Creating discussions for: ${problem.title}`);
      const topLevelComments = [];

      // Create top-level discussions
      for (let i = 0; i < Math.min(dummyDiscussions.length, 5); i++) {
        const discussion = dummyDiscussions[i];
        const randomUser = users[Math.floor(Math.random() * users.length)];

        // Random upvotes/downvotes
        const upvoterCount = Math.floor(Math.random() * 15);
        const downvoterCount = Math.floor(Math.random() * 3);
        const upvotes = [];
        const downvotes = [];

        for (let j = 0; j < upvoterCount; j++) {
          const voter = users[Math.floor(Math.random() * users.length)];
          if (!upvotes.includes(voter._id)) {
            upvotes.push(voter._id);
          }
        }

        for (let j = 0; j < downvoterCount; j++) {
          const voter = users[Math.floor(Math.random() * users.length)];
          if (!downvotes.includes(voter._id) && !upvotes.includes(voter._id)) {
            downvotes.push(voter._id);
          }
        }

        // 💬 Add chat features: reactions, read status
        const reactions = [];
        const readBy = [];
        const emojis = ["👍", "❤️", "😂", "🎉", "🚀", "💡"];

        // Random reactions
        const reactionCount = Math.floor(Math.random() * 5);
        for (let j = 0; j < reactionCount; j++) {
          const reactor = users[Math.floor(Math.random() * users.length)];
          const emoji = emojis[Math.floor(Math.random() * emojis.length)];
          reactions.push({ userId: reactor._id, emoji });
        }

        // Random read status
        const readCount = Math.floor(Math.random() * users.length);
        for (let j = 0; j < readCount; j++) {
          const reader = users[Math.floor(Math.random() * users.length)];
          if (
            !readBy.find((r) => r.userId.toString() === reader._id.toString())
          ) {
            readBy.push({
              userId: reader._id,
              readAt: new Date(
                Date.now() - Math.random() * 20 * 24 * 60 * 60 * 1000
              ),
            });
          }
        }

        const createdDate = new Date(
          Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
        );

        const comment = await Comment.create({
          content: discussion.content,
          problemId: problem._id,
          userId: randomUser._id,
          tags: discussion.tags,
          upvotes,
          downvotes,
          reactions,
          readBy,
          isPinned: i === 0, // Pin the first discussion
          lastActivity: createdDate,
          createdAt: createdDate,
        });

        topLevelComments.push(comment);
        console.log(
          `  ✓ Created discussion with ${upvotes.length} upvotes, ${reactions.length} reactions`
        );
      }

      // Create replies
      for (const reply of replies) {
        if (reply.parentIndex < topLevelComments.length) {
          const parentComment = topLevelComments[reply.parentIndex];
          const randomUser = users[Math.floor(Math.random() * users.length)];

          const upvoterCount = Math.floor(Math.random() * 8);
          const upvotes = [];

          for (let j = 0; j < upvoterCount; j++) {
            const voter = users[Math.floor(Math.random() * users.length)];
            if (!upvotes.includes(voter._id)) {
              upvotes.push(voter._id);
            }
          }

          await Comment.create({
            content: reply.content,
            problemId: problem._id,
            userId: randomUser._id,
            parentId: parentComment._id,
            upvotes,
            createdAt: new Date(
              parentComment.createdAt.getTime() +
                Math.random() * 5 * 24 * 60 * 60 * 1000
            ),
          });

          // Update parent reply count
          await Comment.findByIdAndUpdate(parentComment._id, {
            $inc: { replyCount: 1 },
          });
          console.log(`  ✓ Created reply to discussion`);
        }
      }
    }

    console.log("\n✅ Successfully seeded discussion data!");
    console.log(`📊 Created discussions for ${problems.length} problems`);

    const totalComments = await Comment.countDocuments();
    console.log(`💬 Total discussions and replies: ${totalComments}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding discussions:", error);
    process.exit(1);
  }
}

seedDiscussions();
