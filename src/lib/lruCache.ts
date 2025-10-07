/**
 * LRU Cache implementation with proper ordering
 */

export interface CacheEntry<T> {
  value: T;
  timestamp: number;
}

export class LRUCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private accessOrder: string[] = [];
  private maxSize: number;
  private maxAge: number;

  constructor(maxSize = 50, maxAge = 5 * 60 * 1000) {
    this.maxSize = maxSize;
    this.maxAge = maxAge;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    // Check expiration
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.delete(key);
      return null;
    }
    
    // Move to end (most recently used)
    this.moveToEnd(key);
    return entry.value;
  }

  set(key: string, value: T): void {
    // If key exists, update and move to end
    if (this.cache.has(key)) {
      this.cache.set(key, { value, timestamp: Date.now() });
      this.moveToEnd(key);
      return;
    }
    
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldest = this.accessOrder.shift();
      if (oldest) this.cache.delete(oldest);
    }
    
    // Add new entry
    this.cache.set(key, { value, timestamp: Date.now() });
    this.accessOrder.push(key);
  }

  delete(key: string): boolean {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }

  size(): number {
    return this.cache.size;
  }

  private moveToEnd(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
      this.accessOrder.push(key);
    }
  }
}
