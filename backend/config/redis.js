import { Redis } from "@upstash/redis";
import dotenv from "dotenv";

dotenv.config();

class UPathRedisClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.initializeClient();
  }

  initializeClient() {
    try {
      // Initialize Upstash Redis client
      this.client = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_TOKEN,
        automaticDeserialization: false, // We handle JSON parsing manually
      });

      this.isConnected = true;
      console.log("✅ Upstash Redis Client Initialized Successfully");
    } catch (error) {
      console.error("❌ Failed to initialize Upstash Redis:", error);
      this.isConnected = false;
    }
  }

  async connect() {
    // Upstash Redis doesn't require explicit connection
    // Test connection with a ping
    try {
      if (this.client) {
        await this.client.ping();
        this.isConnected = true;
        console.log("✅ Upstash Redis Connection Verified");
      }
    } catch (error) {
      console.error("❌ Upstash Redis Connection Test Failed:", error);
      this.isConnected = false;
    }
  }

  async disconnect() {
    // Upstash Redis doesn't require explicit disconnection
    this.isConnected = false;
    console.log("🔴 Upstash Redis Client Disconnected");
  }

  // 🚀 Get data from cache with Upstash Redis
  async get(key) {
    try {
      if (!this.isConnected || !this.client) return null;
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error("❌ Upstash Redis GET Error:", error);
      return null;
    }
  }

  // 🚀 Set data in cache with expiration (default: 1 hour)
  async set(key, value, expireInSeconds = 3600) {
    try {
      if (!this.isConnected || !this.client) return false;
      await this.client.setex(key, expireInSeconds, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error("❌ Upstash Redis SET Error:", error);
      return false;
    }
  }

  // 🚀 Delete specific key
  async del(key) {
    try {
      if (!this.isConnected || !this.client) return false;
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error("❌ Upstash Redis DEL Error:", error);
      return false;
    }
  }

  // 🚀 Delete multiple keys by pattern (Upstash optimized)
  async delPattern(pattern) {
    try {
      if (!this.isConnected || !this.client) return false;

      // Use scan for better performance with large datasets
      const keys = await this.client.keys(pattern);
      if (keys && keys.length > 0) {
        // Batch delete for efficiency
        const pipeline = this.client.pipeline();
        keys.forEach((key) => pipeline.del(key));
        await pipeline.exec();
      }
      return true;
    } catch (error) {
      console.error("❌ Upstash Redis DEL PATTERN Error:", error);
      return false;
    }
  }

  // 🚀 Check if key exists
  async exists(key) {
    try {
      if (!this.isConnected || !this.client) return false;
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error("❌ Upstash Redis EXISTS Error:", error);
      return false;
    }
  }

  // 🚀 Get TTL (time to live) of a key
  async ttl(key) {
    try {
      if (!this.isConnected || !this.client) return -1;
      return await this.client.ttl(key);
    } catch (error) {
      console.error("❌ Upstash Redis TTL Error:", error);
      return -1;
    }
  }

  // 🚀 Increment counter (useful for rate limiting)
  async incr(key) {
    try {
      if (!this.isConnected || !this.client) return null;
      return await this.client.incr(key);
    } catch (error) {
      console.error("❌ Upstash Redis INCR Error:", error);
      return null;
    }
  }

  // 🚀 Set expiration for existing key
  async expire(key, seconds) {
    try {
      if (!this.isConnected || !this.client) return false;
      const result = await this.client.expire(key, seconds);
      return result === 1;
    } catch (error) {
      console.error("❌ Upstash Redis EXPIRE Error:", error);
      return false;
    }
  }

  // 🚀 Flush all cache (use with caution)
  async flushAll() {
    try {
      if (!this.isConnected || !this.client) return false;
      await this.client.flushall();
      console.log("🗑️ Upstash Redis Cache Cleared");
      return true;
    } catch (error) {
      console.error("❌ Upstash Redis FLUSH Error:", error);
      return false;
    }
  }

  // 🚀 Additional Upstash-specific methods

  // Hash operations for complex data structures
  async hset(key, field, value) {
    try {
      if (!this.isConnected || !this.client) return false;
      await this.client.hset(key, field, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error("❌ Upstash Redis HSET Error:", error);
      return false;
    }
  }

  async hget(key, field) {
    try {
      if (!this.isConnected || !this.client) return null;
      const data = await this.client.hget(key, field);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error("❌ Upstash Redis HGET Error:", error);
      return null;
    }
  }

  // List operations for queues and collections
  async lpush(key, ...values) {
    try {
      if (!this.isConnected || !this.client) return 0;
      const serializedValues = values.map((v) => JSON.stringify(v));
      return await this.client.lpush(key, ...serializedValues);
    } catch (error) {
      console.error("❌ Upstash Redis LPUSH Error:", error);
      return 0;
    }
  }

  async lrange(key, start = 0, stop = -1) {
    try {
      if (!this.isConnected || !this.client) return [];
      const data = await this.client.lrange(key, start, stop);
      return data.map((item) => JSON.parse(item));
    } catch (error) {
      console.error("❌ Upstash Redis LRANGE Error:", error);
      return [];
    }
  }

  // Set operations for unique collections
  async sadd(key, ...members) {
    try {
      if (!this.isConnected || !this.client) return 0;
      const serializedMembers = members.map((m) => JSON.stringify(m));
      return await this.client.sadd(key, ...serializedMembers);
    } catch (error) {
      console.error("❌ Upstash Redis SADD Error:", error);
      return 0;
    }
  }

  async smembers(key) {
    try {
      if (!this.isConnected || !this.client) return [];
      const data = await this.client.smembers(key);
      return data.map((item) => JSON.parse(item));
    } catch (error) {
      console.error("❌ Upstash Redis SMEMBERS Error:", error);
      return [];
    }
  }

  // Rate limiting helper
  async rateLimit(key, limit, windowInSeconds) {
    try {
      if (!this.isConnected || !this.client)
        return { allowed: true, remaining: limit };

      const current = await this.client.incr(key);

      if (current === 1) {
        await this.client.expire(key, windowInSeconds);
      }

      const ttl = await this.client.ttl(key);
      const allowed = current <= limit;
      const remaining = Math.max(0, limit - current);

      return {
        allowed,
        remaining,
        reset: new Date(Date.now() + ttl * 1000),
        total: limit,
      };
    } catch (error) {
      console.error("❌ Upstash Redis Rate Limit Error:", error);
      return { allowed: true, remaining: limit };
    }
  }

  // Health check
  async ping() {
    try {
      if (!this.client) return false;
      const result = await this.client.ping();
      return result === "PONG";
    } catch (error) {
      console.error("❌ Upstash Redis PING Error:", error);
      return false;
    }
  }
}

// Create and export a singleton instance
const upstashRedisClient = new UPathRedisClient();

export default upstashRedisClient;
