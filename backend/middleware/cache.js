import redisClient from "../config/redis.js";

/**
 * Cache middleware for GET requests
 * @param {number} duration - Cache duration in seconds (default: 5 minutes)
 * @param {string} keyPrefix - Custom key prefix (optional)
 */
export const cacheMiddleware = (duration = 300, keyPrefix = "") => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== "GET") {
      return next();
    }

    // Skip caching if user is admin (for real-time admin data)
    if (req.user && req.user.role === "admin") {
      return next();
    }

    try {
      // Generate cache key based on route and query params
      const userId = req.user ? req.user._id.toString() : "guest";
      const queryString =
        Object.keys(req.query).length > 0 ? JSON.stringify(req.query) : "";

      const cacheKey = `${keyPrefix}${req.route.path}:${userId}:${queryString}`;

      // Try to get cached data
      const cachedData = await redisClient.get(cacheKey);

      if (cachedData) {
        console.log(`🚀 Cache HIT: ${cacheKey}`);
        return res.json(cachedData);
      }

      console.log(`📝 Cache MISS: ${cacheKey}`);

      // Store original res.json method
      const originalJson = res.json;

      // Override res.json to cache the response
      res.json = function (data) {
        // Cache the response data
        redisClient.set(cacheKey, data, duration);

        // Call original json method
        originalJson.call(this, data);
      };

      next();
    } catch (error) {
      console.error("❌ Cache Middleware Error:", error);
      next(); // Continue without caching on error
    }
  };
};

/**
 * Cache invalidation middleware for write operations
 * @param {string[]} patterns - Array of cache key patterns to invalidate
 */
export const invalidateCache = (patterns = []) => {
  return async (req, res, next) => {
    // Store original response methods
    const originalJson = res.json;
    const originalSend = res.send;

    // Override response methods to clear cache after successful operations
    const clearCacheAfterResponse = async function (data) {
      // Only clear cache for successful responses (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          for (const pattern of patterns) {
            await redisClient.delPattern(pattern);
            console.log(`🗑️ Cache cleared for pattern: ${pattern}`);
          }
        } catch (error) {
          console.error("❌ Cache invalidation error:", error);
        }
      }

      // Call original method
      originalJson.call(this, data);
    };

    res.json = clearCacheAfterResponse;

    next();
  };
};

/**
 * Rate limiting middleware using Redis
 * @param {number} maxRequests - Maximum requests allowed
 * @param {number} windowMs - Time window in milliseconds
 * @param {string} message - Error message when limit exceeded
 */
export const rateLimiter = (
  maxRequests = 100,
  windowMs = 60000,
  message = "Too many requests"
) => {
  return async (req, res, next) => {
    try {
      const identifier = req.ip || req.connection.remoteAddress;
      const key = `rate_limit:${identifier}`;

      const current = await redisClient.incr(key);

      if (current === 1) {
        // Set expiration for new key
        await redisClient.expire(key, Math.ceil(windowMs / 1000));
      }

      if (current > maxRequests) {
        return res.status(429).json({
          error: message,
          resetTime: await redisClient.ttl(key),
        });
      }

      // Add rate limit headers
      res.set({
        "X-RateLimit-Limit": maxRequests,
        "X-RateLimit-Remaining": Math.max(0, maxRequests - current),
        "X-RateLimit-Reset": new Date(Date.now() + windowMs).toISOString(),
      });

      next();
    } catch (error) {
      console.error("❌ Rate Limiter Error:", error);
      next(); // Continue without rate limiting on error
    }
  };
};

/**
 * Cache user session data
 */
export const cacheUserSession = async (userId, userData, duration = 3600) => {
  const key = `user_session:${userId}`;
  await redisClient.set(key, userData, duration);
};

/**
 * Get cached user session data
 */
export const getCachedUserSession = async (userId) => {
  const key = `user_session:${userId}`;
  return await redisClient.get(key);
};

/**
 * Clear user session cache
 */
export const clearUserSession = async (userId) => {
  const key = `user_session:${userId}`;
  await redisClient.del(key);
};
