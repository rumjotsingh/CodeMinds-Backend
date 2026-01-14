# 💬 Discussion/Chat API - Complete Frontend Integration

## 🔗 Base Configuration

```javascript
// config.js
export const API_CONFIG = {
  BASE_URL: 'http://localhost:8080/api/v1',
  
  // Get JWT token from localStorage
  getAuthHeaders: () => ({
    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
    'Content-Type': 'application/json'
  })
};
```

---

## 📡 All API Endpoints

### 1. **GET Discussions for a Problem**

```javascript
// Get all discussions with pagination and sorting
GET /problems/:problemId/comments?page=1&limit=20&sortBy=hot

// Parameters:
// - page: number (default: 1)
// - limit: number (default: 20)
// - sortBy: 'newest' | 'oldest' | 'hot' | 'top'

// Example
const getDiscussions = async (problemId, page = 1, sortBy = 'hot') => {
  const response = await fetch(
    `${API_CONFIG.BASE_URL}/problems/${problemId}/comments?page=${page}&limit=20&sortBy=${sortBy}`
  );
  return await response.json();
};

// Response:
{
  "comments": [
    {
      "_id": "69678...",
      "content": "Here's my O(n) solution...",
      "userId": {
        "_id": "685e...",
        "name": "John Doe",
        "email": "john@example.com"
      },
      "upvotes": ["user1", "user2"],
      "downvotes": [],
      "tags": ["solution", "dynamic-programming"],
      "reactions": [
        { "userId": "685e...", "emoji": "🚀" }
      ],
      "readBy": [
        { "userId": "685e...", "readAt": "2026-01-14T..." }
      ],
      "isPinned": false,
      "replyCount": 5,
      "voteCount": 2,
      "createdAt": "2026-01-14T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 45,
    "page": 1,
    "pages": 3
  }
}
```

---

### 2. **POST Create Discussion/Reply**

```javascript
// Create new discussion or reply to existing one
POST /problems/:problemId/comments

// Headers: Authorization required
// Body:
{
  "content": "Your message here...",
  "parentId": null,  // null = new discussion, commentId = reply
  "tags": ["solution", "help"]  // optional
}

// Example
const postComment = async (problemId, content, parentId = null, tags = []) => {
  const response = await fetch(
    `${API_CONFIG.BASE_URL}/problems/${problemId}/comments`,
    {
      method: 'POST',
      headers: API_CONFIG.getAuthHeaders(),
      body: JSON.stringify({ content, parentId, tags })
    }
  );
  return await response.json();
};

// Response:
{
  "message": "Comment added successfully",
  "comment": {
    "_id": "69678...",
    "content": "...",
    "userId": { "name": "John", "email": "john@example.com" },
    "voteCount": 0,
    "replyCount": 0,
    "createdAt": "2026-01-14T..."
  }
}
```

---

### 3. **GET Replies**

```javascript
// Get all replies for a specific comment
GET /comments/:commentId/replies

// Example
const getReplies = async (commentId) => {
  const response = await fetch(
    `${API_CONFIG.BASE_URL}/comments/${commentId}/replies`
  );
  return await response.json();
};

// Response:
{
  "replies": [
    {
      "_id": "69679...",
      "content": "Thanks for the explanation!",
      "userId": { "name": "Jane" },
      "parentId": "69678...",
      "voteCount": 3,
      "createdAt": "2026-01-14T..."
    }
  ]
}
```

---

### 4. **POST Upvote**

```javascript
// Toggle upvote on a comment
POST /comments/:commentId/upvote

// Headers: Authorization required

// Example
const upvoteComment = async (commentId) => {
  const response = await fetch(
    `${API_CONFIG.BASE_URL}/comments/${commentId}/upvote`,
    {
      method: 'POST',
      headers: API_CONFIG.getAuthHeaders()
    }
  );
  return await response.json();
};

// Response:
{
  "message": "Vote updated",
  "voteCount": 5,
  "upvoted": true  // true if upvoted, false if removed
}
```

---

### 5. **POST Downvote**

```javascript
// Toggle downvote on a comment
POST /comments/:commentId/downvote

// Same as upvote - Headers: Authorization required

const downvoteComment = async (commentId) => {
  const response = await fetch(
    `${API_CONFIG.BASE_URL}/comments/${commentId}/downvote`,
    {
      method: 'POST',
      headers: API_CONFIG.getAuthHeaders()
    }
  );
  return await response.json();
};
```

---

### 6. **POST Add Emoji Reaction** 🆕

```javascript
// Add emoji reaction to comment
POST /comments/:commentId/react

// Headers: Authorization required
// Body:
{
  "emoji": "🚀"  // Supported: 👍 ❤️ 😂 🎉 🚀 💡 🔥 ⚡
}

// Example
const addReaction = async (commentId, emoji) => {
  const response = await fetch(
    `${API_CONFIG.BASE_URL}/comments/${commentId}/react`,
    {
      method: 'POST',
      headers: API_CONFIG.getAuthHeaders(),
      body: JSON.stringify({ emoji })
    }
  );
  return await response.json();
};

// Response:
{
  "message": "Reaction added",
  "reactions": [
    { "userId": "685e...", "emoji": "🚀" }
  ]
}
```

---

### 7. **POST Mark as Read** 🆕

```javascript
// Mark comment as read by current user
POST /comments/:commentId/read

// Headers: Authorization required

// Example
const markAsRead = async (commentId) => {
  const response = await fetch(
    `${API_CONFIG.BASE_URL}/comments/${commentId}/read`,
    {
      method: 'POST',
      headers: API_CONFIG.getAuthHeaders()
    }
  );
  return await response.json();
};

// Response:
{
  "message": "Marked as read",
  "readCount": 15
}
```

---

### 8. **POST Pin Discussion** 🆕

```javascript
// Toggle pin status (moderator/owner only)
POST /comments/:commentId/pin

// Headers: Authorization required

// Example
const togglePin = async (commentId) => {
  const response = await fetch(
    `${API_CONFIG.BASE_URL}/comments/${commentId}/pin`,
    {
      method: 'POST',
      headers: API_CONFIG.getAuthHeaders()
    }
  );
  return await response.json();
};

// Response:
{
  "message": "Comment pinned",
  "isPinned": true
}
```

---

### 9. **GET Recent Activity Feed** 🆕

```javascript
// Get recent discussions across all problems
GET /discussions/recent?limit=50

// Example
const getRecentActivity = async (limit = 50) => {
  const response = await fetch(
    `${API_CONFIG.BASE_URL}/discussions/recent?limit=${limit}`
  );
  return await response.json();
};

// Response:
{
  "discussions": [
    {
      "_id": "69678...",
      "content": "...",
      "userId": { "name": "John" },
      "voteCount": 5,
      "replyCount": 3,
      "reactionCount": 8,
      "readCount": 12,
      "lastActivity": "2026-01-14T..."
    }
  ]
}
```

---

### 10. **GET Search Discussions** 🆕

```javascript
// Search discussions by content
GET /discussions/search?query=solution&problemId=optional

// Example
const searchDiscussions = async (query, problemId = null) => {
  let url = `${API_CONFIG.BASE_URL}/discussions/search?query=${encodeURIComponent(query)}`;
  if (problemId) url += `&problemId=${problemId}`;
  
  const response = await fetch(url);
  return await response.json();
};

// Response:
{
  "results": [
    {
      "_id": "69678...",
      "content": "Here's a dynamic programming solution...",
      "userId": { "name": "Jane" },
      "voteCount": 12,
      "tags": ["solution"]
    }
  ],
  "count": 5
}
```

---

### 11. **GET User Activity** 🆕

```javascript
// Get user's discussion stats and history
GET /users/:userId/activity

// Example
const getUserActivity = async (userId) => {
  const response = await fetch(
    `${API_CONFIG.BASE_URL}/users/${userId}/activity`
  );
  return await response.json();
};

// Response:
{
  "totalComments": 45,
  "totalUpvotes": 230,
  "totalReplies": 78,
  "recentActivity": [
    {
      "_id": "69678...",
      "content": "...",
      "problemId": { "title": "Two Sum" },
      "createdAt": "2026-01-14T..."
    }
  ]
}
```

---

### 12. **PUT Update Comment**

```javascript
// Edit your own comment
PUT /comments/:commentId

// Headers: Authorization required
// Body:
{
  "content": "Updated content..."
}

// Example
const updateComment = async (commentId, content) => {
  const response = await fetch(
    `${API_CONFIG.BASE_URL}/comments/${commentId}`,
    {
      method: 'PUT',
      headers: API_CONFIG.getAuthHeaders(),
      body: JSON.stringify({ content })
    }
  );
  return await response.json();
};
```

---

### 13. **DELETE Comment**

```javascript
// Delete your own comment
DELETE /comments/:commentId

// Headers: Authorization required

// Example
const deleteComment = async (commentId) => {
  const response = await fetch(
    `${API_CONFIG.BASE_URL}/comments/${commentId}`,
    {
      method: 'DELETE',
      headers: API_CONFIG.getAuthHeaders()
    }
  );
  return await response.json();
};
```

---

## 🎯 Complete React Component

```javascript
// DiscussionSection.jsx
import React, { useState, useEffect } from 'react';
import './DiscussionSection.css';

const API_BASE = 'http://localhost:8080/api/v1';

const DiscussionSection = ({ problemId }) => {
  const [discussions, setDiscussions] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [sortBy, setSortBy] = useState('hot');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [selectedTags, setSelectedTags] = useState([]);
  const [replyTo, setReplyTo] = useState(null);
  const [expandedReplies, setExpandedReplies] = useState({});

  const token = localStorage.getItem('jwt_token');

  // Fetch discussions
  useEffect(() => {
    fetchDiscussions();
  }, [problemId, sortBy, page]);

  const fetchDiscussions = async () => {
    try {
      const response = await fetch(
        `${API_BASE}/problems/${problemId}/comments?page=${page}&sortBy=${sortBy}`
      );
      const data = await response.json();
      setDiscussions(data.comments);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Failed to fetch discussions:', error);
    }
  };

  // Post new comment
  const handlePostComment = async () => {
    if (!newComment.trim()) return;

    try {
      const response = await fetch(`${API_BASE}/problems/${problemId}/comments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: newComment,
          parentId: replyTo,
          tags: selectedTags
        })
      });

      if (response.ok) {
        setNewComment('');
        setReplyTo(null);
        setSelectedTags([]);
        fetchDiscussions();
      }
    } catch (error) {
      console.error('Failed to post comment:', error);
    }
  };

  // Upvote
  const handleUpvote = async (commentId) => {
    try {
      await fetch(`${API_BASE}/comments/${commentId}/upvote`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchDiscussions();
    } catch (error) {
      console.error('Failed to upvote:', error);
    }
  };

  // Add reaction
  const handleReaction = async (commentId, emoji) => {
    try {
      await fetch(`${API_BASE}/comments/${commentId}/react`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ emoji })
      });
      fetchDiscussions();
    } catch (error) {
      console.error('Failed to add reaction:', error);
    }
  };

  // Mark as read
  const handleMarkAsRead = async (commentId) => {
    try {
      await fetch(`${API_BASE}/comments/${commentId}/read`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  // Toggle replies
  const toggleReplies = async (commentId) => {
    if (expandedReplies[commentId]) {
      setExpandedReplies({ ...expandedReplies, [commentId]: null });
    } else {
      try {
        const response = await fetch(`${API_BASE}/comments/${commentId}/replies`);
        const data = await response.json();
        setExpandedReplies({ ...expandedReplies, [commentId]: data.replies });
      } catch (error) {
        console.error('Failed to fetch replies:', error);
      }
    }
  };

  // Group reactions by emoji
  const groupReactions = (reactions) => {
    const grouped = {};
    reactions?.forEach(r => {
      grouped[r.emoji] = (grouped[r.emoji] || 0) + 1;
    });
    return grouped;
  };

  return (
    <div className="discussion-section">
      {/* Header with sort options */}
      <div className="discussion-header">
        <h2>💬 Discussions</h2>
        <div className="sort-buttons">
          <button 
            className={sortBy === 'hot' ? 'active' : ''}
            onClick={() => setSortBy('hot')}
          >
            🔥 Hot
          </button>
          <button 
            className={sortBy === 'newest' ? 'active' : ''}
            onClick={() => setSortBy('newest')}
          >
            🆕 Newest
          </button>
          <button 
            className={sortBy === 'top' ? 'active' : ''}
            onClick={() => setSortBy('top')}
          >
            ⭐ Top
          </button>
        </div>
      </div>

      {/* New comment form */}
      <div className="new-comment-box">
        {replyTo && (
          <div className="reply-indicator">
            Replying to comment...
            <button onClick={() => setReplyTo(null)}>✕</button>
          </div>
        )}
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Share your thoughts, ask questions, or post solutions..."
          rows="4"
        />
        
        {/* Tag selection */}
        <div className="tag-selector">
          {['solution', 'question', 'help', 'bug', 'optimization'].map(tag => (
            <button
              key={tag}
              className={selectedTags.includes(tag) ? 'tag-selected' : 'tag-option'}
              onClick={() => {
                if (selectedTags.includes(tag)) {
                  setSelectedTags(selectedTags.filter(t => t !== tag));
                } else {
                  setSelectedTags([...selectedTags, tag]);
                }
              }}
            >
              {tag}
            </button>
          ))}
        </div>

        <button className="post-button" onClick={handlePostComment}>
          {replyTo ? '💬 Post Reply' : '📝 Post Discussion'}
        </button>
      </div>

      {/* Discussions list */}
      <div className="discussions-list">
        {discussions.map((disc) => (
          <div 
            key={disc._id} 
            className="discussion-card"
            onMouseEnter={() => handleMarkAsRead(disc._id)}
          >
            {/* Pin badge */}
            {disc.isPinned && (
              <div className="pin-badge">📌 Pinned</div>
            )}

            {/* Author info */}
            <div className="discussion-author">
              <div className="author-avatar">
                {disc.userId.name[0].toUpperCase()}
              </div>
              <div className="author-details">
                <strong>{disc.userId.name}</strong>
                <span className="timestamp">
                  {new Date(disc.createdAt).toLocaleDateString()} at{' '}
                  {new Date(disc.createdAt).toLocaleTimeString()}
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="discussion-content">
              {disc.content}
            </div>

            {/* Tags */}
            {disc.tags?.length > 0 && (
              <div className="discussion-tags">
                {disc.tags.map(tag => (
                  <span key={tag} className="tag">{tag}</span>
                ))}
              </div>
            )}

            {/* Actions bar */}
            <div className="discussion-actions">
              {/* Upvote */}
              <button 
                className="action-btn upvote-btn"
                onClick={() => handleUpvote(disc._id)}
              >
                👍 {disc.voteCount}
              </button>

              {/* Replies */}
              <button 
                className="action-btn"
                onClick={() => toggleReplies(disc._id)}
              >
                💬 {disc.replyCount} {disc.replyCount === 1 ? 'reply' : 'replies'}
              </button>

              {/* Read count */}
              <span className="read-count">
                👁️ {disc.readCount || 0}
              </span>

              {/* Reply button */}
              <button 
                className="action-btn reply-btn"
                onClick={() => {
                  setReplyTo(disc._id);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                Reply
              </button>

              {/* Emoji reactions */}
              <div className="emoji-reactions">
                {['👍', '❤️', '😂', '🚀', '🎉'].map(emoji => {
                  const reactions = groupReactions(disc.reactions);
                  const count = reactions[emoji] || 0;
                  return (
                    <button
                      key={emoji}
                      className={`emoji-btn ${count > 0 ? 'has-reactions' : ''}`}
                      onClick={() => handleReaction(disc._id, emoji)}
                      title={`React with ${emoji}`}
                    >
                      {emoji} {count > 0 && count}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Replies section */}
            {expandedReplies[disc._id] && (
              <div className="replies-section">
                {expandedReplies[disc._id].map(reply => (
                  <div key={reply._id} className="reply-card">
                    <div className="reply-author">
                      <strong>{reply.userId.name}</strong>
                      <span className="timestamp">
                        {new Date(reply.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="reply-content">{reply.content}</div>
                    <div className="reply-actions">
                      <button onClick={() => handleUpvote(reply._id)}>
                        👍 {reply.voteCount}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="pagination">
          <button 
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            ← Previous
          </button>
          <span>Page {page} of {pagination.pages}</span>
          <button 
            disabled={page === pagination.pages}
            onClick={() => setPage(page + 1)}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
};

export default DiscussionSection;
```

---

## 🎨 CSS Styling

```css
/* DiscussionSection.css */
.discussion-section {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.discussion-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.discussion-header h2 {
  margin: 0;
  font-size: 24px;
}

.sort-buttons {
  display: flex;
  gap: 10px;
}

.sort-buttons button {
  padding: 8px 16px;
  border: 2px solid #e0e0e0;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.sort-buttons button:hover {
  border-color: #007bff;
  background: #f8f9fa;
}

.sort-buttons button.active {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.new-comment-box {
  background: white;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 30px;
}

.reply-indicator {
  display: flex;
  justify-content: space-between;
  background: #e3f2fd;
  padding: 8px 12px;
  border-radius: 4px;
  margin-bottom: 10px;
  font-size: 14px;
}

.reply-indicator button {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 18px;
}

.new-comment-box textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  resize: vertical;
  font-family: inherit;
}

.tag-selector {
  display: flex;
  gap: 8px;
  margin: 15px 0;
  flex-wrap: wrap;
}

.tag-option, .tag-selected {
  padding: 6px 12px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 16px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.tag-selected {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.post-button {
  padding: 10px 24px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: background 0.2s;
}

.post-button:hover {
  background: #0056b3;
}

.discussions-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.discussion-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  transition: box-shadow 0.2s;
}

.discussion-card:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.pin-badge {
  display: inline-block;
  background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 12px;
}

.discussion-author {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 15px;
}

.author-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 18px;
}

.author-details {
  display: flex;
  flex-direction: column;
}

.author-details strong {
  font-size: 15px;
}

.timestamp {
  font-size: 12px;
  color: #666;
}

.discussion-content {
  line-height: 1.6;
  margin: 15px 0;
  color: #333;
}

.discussion-tags {
  display: flex;
  gap: 8px;
  margin: 15px 0;
  flex-wrap: wrap;
}

.tag {
  background: #e3f2fd;
  color: #1976d2;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.discussion-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid #f0f0f0;
  flex-wrap: wrap;
}

.action-btn {
  padding: 6px 12px;
  border: 1px solid #e0e0e0;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 4px;
}

.action-btn:hover {
  background: #f8f9fa;
  border-color: #007bff;
}

.upvote-btn:hover {
  background: #e3f2fd;
}

.reply-btn {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.reply-btn:hover {
  background: #0056b3;
}

.read-count {
  font-size: 13px;
  color: #666;
}

.emoji-reactions {
  display: flex;
  gap: 4px;
  margin-left: auto;
}

.emoji-btn {
  padding: 4px 8px;
  border: 1px solid #e0e0e0;
  background: white;
  border-radius: 16px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.emoji-btn:hover {
  transform: scale(1.1);
  border-color: #007bff;
}

.emoji-btn.has-reactions {
  background: #fff3cd;
  border-color: #ffc107;
  font-weight: 600;
}

.replies-section {
  margin-top: 20px;
  padding-left: 20px;
  border-left: 3px solid #e0e0e0;
}

.reply-card {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 6px;
  margin-bottom: 10px;
}

.reply-author {
  display: flex;
  gap: 10px;
  margin-bottom: 8px;
  font-size: 14px;
}

.reply-content {
  margin: 10px 0;
  line-height: 1.5;
  font-size: 14px;
}

.reply-actions button {
  padding: 4px 8px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  margin-top: 30px;
}

.pagination button {
  padding: 8px 16px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 6px;
  cursor: pointer;
}

.pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination button:not(:disabled):hover {
  background: #007bff;
  color: white;
  border-color: #007bff;
}
```

---

## 🚀 Quick Usage

```javascript
// In your Problem page component
import DiscussionSection from './DiscussionSection';

function ProblemPage() {
  const problemId = '685fb2e6be86f97755683f12'; // from URL or props
  
  return (
    <div>
      {/* Your problem content */}
      <DiscussionSection problemId={problemId} />
    </div>
  );
}
```

---

## 📋 Integration Checklist

✅ **Setup:**
- [ ] Copy API config with base URL
- [ ] Ensure JWT token is stored in localStorage
- [ ] Install React (if not already)

✅ **Files to create:**
- [ ] `DiscussionSection.jsx` (component)
- [ ] `DiscussionSection.css` (styles)
- [ ] `api.js` (API functions - optional)

✅ **Features included:**
- [x] View discussions with pagination
- [x] Post new discussions
- [x] Reply to discussions
- [x] Upvote/Downvote
- [x] Emoji reactions
- [x] Tag selection
- [x] Mark as read
- [x] Expand/collapse replies
- [x] Sort by hot/newest/top
- [x] Pinned discussions highlight

---

## 🎯 Test Your Integration

1. **Set JWT token** (after login):
   ```javascript
   localStorage.setItem('jwt_token', 'your-jwt-token-here');
   ```

2. **Use component**:
   ```javascript
   <DiscussionSection problemId="685fb2e6be86f97755683f12" />
   ```

3. **Test features**:
   - Post a comment ✅
   - Upvote a discussion ✅
   - Add emoji reaction ✅
   - Reply to a comment ✅
   - Search discussions ✅

---

Your discussion/chat system is ready to integrate! 🎉

**Server:** http://localhost:8080
**Base URL:** http://localhost:8080/api/v1
