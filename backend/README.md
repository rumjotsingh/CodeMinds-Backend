# 🧠 LeetCode Clone – Full Stack Coding Platform

A fully-featured LeetCode-style coding platform built with **MERN + Next.js** stack that allows users to practice coding problems, submit code using **Judge0 API**, track performance, and more.

## 🔗 Live Demo

> 🚀 https://codeminds-backend.onrender.com
---

## 📌 Features

### 👨‍💻 User Features
- 🔐 Authentication (JWT-based)
- 🔎 Browse & Filter Problems by Tags/Difficulty
- 🧪 Submit Code (C++, Java, Python, JS, etc.)
- ✅ Get Instant Feedback (Accepted / Fail)
- 🕒 View Submission History
- 📊 Personal Streak & Activity Calendar
- 🗣️ Comment System for Problem Discussions
- 📁 Create Playlists & Add Problems

### 🛠️ Admin Features
- 🧩 Manage Problems (Create, Update, Delete)
- 📣 Publish Announcements
- 🏆 Access User Submissions & Leaderboard Stats

### 📊 Leaderboard & Dashboard
- 🥇 Most Solved Problems
- 🧑‍💻 Most Active Users (weekly)
- 🧾 User Analytics Dashboard

---

## 🛠 Tech Stack

### 💻 Frontend
- **Next.js 14 (App Router)**
- **Tailwind CSS + ShadCN UI**
- Axios, Zustand (for state), React Hook Form, Zod

### 🧠 Backend
- **Node.js + Express.js**
- **MongoDB + Mongoose**
- Judge0 API (for code execution)
- JWT Auth, Bcrypt, MVC Architecture

---

## 📁 Folder Structure
/backend
├── controllers/
├── models/
├── routes/
├── middleware.js
└── server.js

/frontend
├── app/
├── components/
├── lib/
└── utils/

yaml
Copy
Edit

---

## 🚀 How to Run Locally

### Backend

```bash
cd backend
npm install
npm run dev
Make sure to add your .env file:

ini
Copy
Edit
MONGO_URI=your_mongodb_url
JUDGE0_URL=https://judge0-ce.p.rapidapi.com
JUDGE0_KEY=your_api_key
JWT_SECRET=your_jwt
Frontend
bash
Copy
Edit
cd frontend
npm install
npm run dev
🧪 API Routes
🔹 Problem Routes
GET /problems

GET /problems/:id

GET /problems/by-tags

GET /problems/tags

POST /problems (Admin)

🔹 Submission Routes
POST /submissions

GET /submissions/:id

GET /user/submissions

🔹 Leaderboard & Analytics
GET /leaderboard

GET /user/streaks

GET /user/dashboard

🔹 Comments
POST /problems/:id/comments

GET /problems/:id/comments

🔹 Announcements (Admin)
GET /announcements

POST /announcements

DELETE /announcements/:id

🙌 Contributing
Pull requests are welcome! Feel free to open issues for feature suggestions or bug fixes.

