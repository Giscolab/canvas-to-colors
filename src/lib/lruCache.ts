/**
 * Optimized LRU Cache with efficient Map-based ordering and automatic cleanup
 * Uses native Map insertion order (ES2015+) for O(1) operations
 */

export interface CacheEntry<T> {
  value: T;
  timestamp: number;
}

export class LRUCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxSize: number;
  private maxAge: number;
  private debug: boolean;
  private cleanupInterval: number | null = null;

  constructor(maxSize = 50, maxAge = 5 * 60 * 1000, debug = false) {
    this.maxSize = maxSize;
    this.maxAge = maxAge;
    this.debug = debug;
    
    // Start periodic cleanup (every 30 seconds)
    if (typeof setInterval !== 'undefined') {
      this.cleanupInterval = setInterval(() => this.cleanup(), 30000) as unknown as number;
    }
  }

  private log(...args: any[]): void {
    if (this.debug) {
      console.log('[LRU Cache]', ...args);
    }
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.log('❌ Miss:', key);
      return null;
    }
    
    // Check expiration
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.log('⏰ Expired:', key);
      this.cache.delete(key);
      return null;
    }
    
    // Move to end efficiently (delete + re-insert leverages Map insertion order)
    this.cache.delete(key);
    this.cache.set(key, entry);
    
    this.log('✅ Hit:', key);
    return entry.value;
  }

  set(key: string, value: T): void {
    // If key exists, update and move to end
    if (this.cache.has(key)) {
      this.cache.delete(key);
      this.cache.set(key, { value, timestamp: Date.now() });
      this.log('🔄 Updated:', key);
      return;
    }
    
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldest = this.cache.keys().next().value;
      if (oldest) {
        this.cache.delete(oldest);
        this.log('🗑️ Evicted oldest:', oldest);
      }
    }
    
    // Add new entry
    this.cache.set(key, { value, timestamp: Date.now() });
    this.log('➕ Added:', key, `(${this.cache.size}/${this.maxSize})`);
  }

  delete(key: string): boolean {
    const result = this.cache.delete(key);
    if (result) {
      this.log('🗑️ Deleted:', key);
    }
    return result;
  }

  clear(): void {
    this.cache.clear();
    this.log('🧹 Cleared all entries');
  }

  size(): number {
    return this.cache.size;
  }

  /**
   * Remove all expired entries
   * Called periodically and can be invoked manually
   */
  cleanup(): void {
    const now = Date.now();
    let removed = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.maxAge) {
        this.cache.delete(key);
        removed++;
      }
    }
    
    if (removed > 0) {
      this.log(`🧹 Cleanup: removed ${removed} expired entries`);
    }
  }

  /**
   * Get cache statistics for debugging
   */
  getStats(): { size: number; maxSize: number; oldestAge: number | null } {
    const entries = Array.from(this.cache.values());
    const now = Date.now();
    
    const oldestAge = entries.length > 0
      ? Math.min(...entries.map(e => now - e.timestamp))
      : null;
    
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      oldestAge
    };
  }

  /**
   * Cleanup and release resources
   */
  destroy(): void {
    if (this.cleanupInterval !== null) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
    this.log('💥 Destroyed');
  }
}
