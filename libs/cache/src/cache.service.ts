import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';

import { REDIS_CLIENT } from './cache.constants';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  /**
   * Get a cached value and deserialize from JSON.
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.error(`Cache GET error for key "${key}"`, error);
      return null;
    }
  }

  /**
   * Set a value in cache with optional TTL in seconds.
   */
  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await this.redis.set(key, serialized, 'EX', ttlSeconds);
      } else {
        await this.redis.set(key, serialized);
      }
    } catch (error) {
      this.logger.error(`Cache SET error for key "${key}"`, error);
    }
  }

  /**
   * Delete a specific key.
   */
  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      this.logger.error(`Cache DEL error for key "${key}"`, error);
    }
  }

  /**
   * Delete all keys matching a pattern.
   * Use carefully — SCAN-based, safe for production.
   */
  async delPattern(pattern: string): Promise<number> {
    let cursor = '0';
    let deletedCount = 0;

    do {
      const [nextCursor, keys] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      if (keys.length > 0) {
        await this.redis.del(...keys);
        deletedCount += keys.length;
      }
    } while (cursor !== '0');

    return deletedCount;
  }

  /**
   * Cache-aside pattern: fetch from cache or execute factory and cache the result.
   */
  async getOrSet<T>(key: string, factory: () => Promise<T>, ttlSeconds?: number): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const value = await factory();
    await this.set(key, value, ttlSeconds);
    return value;
  }

  /**
   * Check TTL of a key (returns -2 if not exists, -1 if no expiry).
   */
  async ttl(key: string): Promise<number> {
    return this.redis.ttl(key);
  }

  /**
   * Increment a counter (useful for rate limiting, counters).
   */
  async incr(key: string, ttlSeconds?: number): Promise<number> {
    const val = await this.redis.incr(key);
    if (ttlSeconds && val === 1) {
      await this.redis.expire(key, ttlSeconds);
    }
    return val;
  }

  /**
   * Add to a Set.
   */
  async sadd(key: string, ...members: string[]): Promise<number> {
    return this.redis.sadd(key, ...members);
  }

  /**
   * Check if a member exists in a Set.
   */
  async sismember(key: string, member: string): Promise<boolean> {
    const result = await this.redis.sismember(key, member);
    return result === 1;
  }

  /**
   * Push to a list (for simple job/event queues in dev).
   */
  async lpush(key: string, ...values: string[]): Promise<number> {
    return this.redis.lpush(key, ...values);
  }

  /**
   * Raw Redis client access for advanced use cases.
   */
  getClient(): Redis {
    return this.redis;
  }
}
