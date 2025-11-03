# Redis Integration Guide

## Overview
This backend now includes comprehensive Redis integration for caching and performance optimization. Redis is used to cache frequently accessed data and reduce database queries.

## Features

### 1. Intelligent Caching
- **Problem lists**: Cached for 5 minutes (300s)
- **Leaderboards**: Cached for 5 minutes (300s)
- **User statistics**: Cached for 5 minutes (300s)
- **Judge0 languages**: Cached for 1 hour (3600s)
- **User submissions**: Cached for 3 minutes (180s)

### 2. Automatic Cache Invalidation
- Problem-related caches are invalidated when problems are created/updated
- Leaderboard caches are invalidated when submissions are made
- User-specific caches are invalidated when relevant user data changes

### 3. Rate Limiting
- Basic rate limiting functionality available through Redis
- Can be configured per endpoint as needed

## Setup

### Prerequisites
1. Redis server running locally or remotely
2. Node.js environment with Redis client

### Environment Configuration
Add to your `.env` file:
```env
REDIS_URL=redis://localhost:6379
# OR for remote Redis:
# REDIS_URL=redis://username:password@host:port
```

### Installation
Redis client is already included in package.json. If you need to install manually:
```bash
npm install redis
```

## API Endpoints with Caching

### Problems
- `GET /api/problems` - Cached (300s)
- `GET /api/problems/search` - Cached (300s)
- `GET /api/problems/grouped-tags` - Cached (600s)
- `POST /api/problems` - Invalidates problems cache

### Submissions
- `GET /api/submissions/user/submissions` - Cached (180s)
- `GET /api/submissions/problems/:id/solved` - Cached (300s)
- `GET /api/submissions/user/solved-problems` - Cached (300s)
- `GET /api/submissions/user/stats` - Cached (300s)
- `POST /api/submissions/submit` - Invalidates leaderboard and problems cache

### Leaderboard
- `GET /api/leaderboard` - Cached (300s)

### Contests
- `GET /api/contests/contest` - Cached (300s)
- `GET /api/contests/contest/:id` - Cached (300s)
- `GET /api/contests/contest/:id/leaderboard` - Cached (180s)
- `POST /api/contests/contest` - Invalidates contests cache

## Cache Keys Pattern

### Key Naming Convention
- `problems:` - Problem-related data
- `leaderboard:` - Leaderboard data
- `userstats:` - User statistics
- `usersubmissions:` - User submission lists
- `solved:` - Problem solve status
- `contests:` - Contest data
- `languages:` - Judge0 supported languages

### User-Specific Keys
User-specific data includes the user ID in the cache key:
- `userstats:${userId}`
- `usersubmissions:${userId}`
- `solved:${userId}:${problemId}`

## Error Handling

### Graceful Degradation
The application continues to work even if Redis is unavailable:
- Cache misses fallback to database queries
- Cache writes fail silently without affecting API responses
- Connection errors are logged but don't break functionality

### Redis Connection Management
- Automatic reconnection on connection loss
- Proper cleanup on application shutdown
- Error logging for monitoring

## Performance Benefits

### Expected Improvements
- **Database Load**: 60-80% reduction in MongoDB queries for cached endpoints
- **Response Time**: 30-50% faster response times for cached data
- **Concurrent Users**: Better handling of high traffic through cache layer

### Monitoring
Check Redis memory usage and hit rates:
```bash
# Redis CLI commands
redis-cli info memory
redis-cli info stats
```

## Cache Management

### Manual Cache Clearing
You can manually clear specific cache patterns:
```javascript
// Clear all problem caches
await redisClient.invalidatePattern('problems:*');

// Clear user-specific caches
await redisClient.invalidatePattern('userstats:*');
```

### Cache Statistics
The Redis client includes methods to get cache statistics and monitor performance.

## Best Practices

1. **Cache Duration**: Shorter durations for frequently changing data
2. **Key Patterns**: Use consistent naming conventions for easy management
3. **Invalidation**: Invalidate related caches when data changes
4. **Monitoring**: Regular monitoring of Redis memory and performance
5. **Fallback**: Always ensure graceful degradation when Redis is unavailable

## Troubleshooting

### Common Issues
1. **Redis not running**: Application works but without caching benefits
2. **Memory limits**: Monitor Redis memory usage and configure appropriate limits
3. **Key expiration**: Ensure cache TTL values are appropriate for your use case

### Debug Mode
Set environment variable for Redis debugging:
```env
DEBUG=redis:*
```

This will provide detailed logging of Redis operations for troubleshooting.