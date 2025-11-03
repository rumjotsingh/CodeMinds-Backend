import { createClient } from "redis";
import dotenv from "dotenv";

dotenv.config();

class RedisClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      this.client = createClient({
        url: process.env.REDIS_URL || "redis://localhost:6379",
        socket: {
          connectTimeout: 60000,
          lazyConnect: true,
        },
      });

      this.client.on("error", (err) => {
        console.error("❌ Redis Client Error:", err);
        this.isConnected = false;
      });

      this.client.on("connect", () => {
        console.log("🔄 Redis Client Connecting...");
      });

      this.client.on("ready", () => {
        console.log("✅ Redis Client Connected Successfully");
        this.isConnected = true;
      });

      this.client.on("end", () => {
        console.log("🔴 Redis Client Connection Ended");
        this.isConnected = false;
      });

      await this.client.connect();
    } catch (error) {
      console.error("❌ Failed to connect to Redis:", error);
      this.isConnected = false;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.disconnect();
      this.isConnected = false;
      console.log("🔴 Redis Client Disconnected");
    }
  }

  // Get data from cache
  async get(key) {
    try {
      if (!this.isConnected) return null;
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error("❌ Redis GET Error:", error);
      return null;
    }
  }

  // Set data in cache with expiration (default: 1 hour)
  async set(key, value, expireInSeconds = 3600) {
    try {
      if (!this.isConnected) return false;
      await this.client.setEx(key, expireInSeconds, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error("❌ Redis SET Error:", error);
      return false;
    }
  }

  // Delete specific key
  async del(key) {
    try {
      if (!this.isConnected) return false;
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error("❌ Redis DEL Error:", error);
      return false;
    }
  }

  // Delete multiple keys by pattern
  async delPattern(pattern) {
    try {
      if (!this.isConnected) return false;
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
      return true;
    } catch (error) {
      console.error("❌ Redis DEL PATTERN Error:", error);
      return false;
    }
  }

  // Check if key exists
  async exists(key) {
    try {
      if (!this.isConnected) return false;
      return await this.client.exists(key);
    } catch (error) {
      console.error("❌ Redis EXISTS Error:", error);
      return false;
    }
  }

  // Get TTL (time to live) of a key
  async ttl(key) {
    try {
      if (!this.isConnected) return -1;
      return await this.client.ttl(key);
    } catch (error) {
      console.error("❌ Redis TTL Error:", error);
      return -1;
    }
  }

  // Increment counter (useful for rate limiting)
  async incr(key) {
    try {
      if (!this.isConnected) return null;
      return await this.client.incr(key);
    } catch (error) {
      console.error("❌ Redis INCR Error:", error);
      return null;
    }
  }

  // Set expiration for existing key
  async expire(key, seconds) {
    try {
      if (!this.isConnected) return false;
      return await this.client.expire(key, seconds);
    } catch (error) {
      console.error("❌ Redis EXPIRE Error:", error);
      return false;
    }
  }

  // Flush all cache (use with caution)
  async flushAll() {
    try {
      if (!this.isConnected) return false;
      await this.client.flushAll();
      console.log("🗑️ Redis Cache Cleared");
      return true;
    } catch (error) {
      console.error("❌ Redis FLUSH Error:", error);
      return false;
    }
  }
}

// Create and export a singleton instance
const redisClient = new RedisClient();

export default redisClient;
