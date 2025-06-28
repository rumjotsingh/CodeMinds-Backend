import mongoose from "mongoose";
import fs from "fs";
import Problem from "../models/problem.model.js"; // adjust if you named it differently

import dotenv from "dotenv";

dotenv.config();
// ✅ Your MongoDB connection URI

const MONGO_URL = process.env.MONGO_URL;
console.log(MONGO_URL);

// ✅ Read the local JSON file
const problems = JSON.parse(fs.readFileSync("./cleaned_problem.json", "utf-8"));

const seedProblems = async () => {
  try {
    await mongoose.connect(
      "mongodb+srv://rumjotsingh12345:LNF58lqEusDyaPvk@cluster0.llt1u2a.mongodb.net/"
    );
    console.log("✅ Connected to MongoDB");

    // Optional: clear old data
    await Problem.deleteMany({});
    console.log("🗑️ Old problems deleted");

    const inserted = await Problem.insertMany(problems);
    console.log(`✅ Inserted ${inserted.length} problems`);

    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  }
};

seedProblems();
