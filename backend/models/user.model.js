import mongoose from "mongoose";

import bcrypt from "bcryptjs";
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: function () {
        return !this.googleId; // Password required only if googleId is not present
      },
      minlength: 6,
      select: false, // Hide password by default
    },
    googleId: {
      type: String,
      required: false,
      unique: true,
      sparse: true, // Allows multiple nulls but enforces uniqueness when present
    },
    avatar: {
      type: String,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    streak: {
      type: Number,
      default: 0,
    },
    lastSolvedDate: {
      type: Date,
    },
    calendar: {
      type: Map,
      of: Boolean, // key: YYYY-MM-DD, value: true
      default: {},
    },
  },

  {
    timestamps: true,
  }
);

// 🔐 Hash password before saving (only if modified)

// Method to compare raw password with hashed password

const User = mongoose.model("User", userSchema);
export default User;
