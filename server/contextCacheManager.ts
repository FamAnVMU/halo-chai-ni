/**
 * Context Cache Manager (Halo Chinese v2.5.0)
 * Phase B2 - Context Retrieval & Context Builder
 *
 * Implements bounded in-memory cache with tag-based invalidation upon new evidence arrival.
 */

export interface CacheEntry<T> {
  data: T;
  cachedAt: number;
  ttlMs: number;
  tag: string;
}

export class ContextCacheManager {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private static readonly DEFAULT_TTL_MS = 120000; // 2 minutes for learner context
  private static readonly STATIC_TTL_MS = 600000;  // 10 minutes for static knowledge items

  /**
   * Lưu dữ liệu vào cache kèm theo tag và TTL
   */
  public set<T>(key: string, data: T, tag: string = 'general', customTtlMs?: number): void {
    const ttlMs = customTtlMs || (tag === 'static_knowledge' ? ContextCacheManager.STATIC_TTL_MS : ContextCacheManager.DEFAULT_TTL_MS);
    this.cache.set(key, {
      data,
      cachedAt: Date.now(),
      ttlMs,
      tag
    });
  }

  /**
   * Lấy dữ liệu từ cache nếu chưa hết hạn
   */
  public get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.cachedAt > entry.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Hủy cache theo Tag (Ví dụ: khi có evidence mới của learnerId -> invalidate toàn bộ tag 'learner_<id>')
   */
  public invalidateByTag(tagPrefix: string): number {
    let count = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tag.startsWith(tagPrefix)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Xóa toàn bộ cache
   */
  public clearAll(): void {
    this.cache.clear();
  }

  public getCacheSize(): number {
    return this.cache.size;
  }
}

export const contextCacheManager = new ContextCacheManager();
