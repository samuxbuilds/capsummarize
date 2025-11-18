/**
 * Storage utility helpers for the Chrome extension.
 * Provides typed wrappers around IndexedDB for large data storage
 * with fallback to Chrome storage API for small values.
 * Includes convenience helpers for tracking timestamps and usage metadata.
 */

/**
 * Shape of data persisted with timestamp metadata.
 */
interface StorageData {
  data: unknown;
  timestamp: number;
}

/**
 * Summary of current storage usage, including a human-readable value.
 */
interface StorageUsage {
  bytesInUse: number;
  bytesInUseFormatted: string;
}

/**
 * IndexedDB wrapper for storing large data in Chrome extension.
 */
class IndexedDBStorage {
  private static DB_NAME = 'CapSummarize_DB';
  private static DB_VERSION = 1;
  private static STORE_NAME = 'storage';
  private static db: IDBDatabase | null = null;

  /**
   * Initialize and open the IndexedDB database.
   */
  private static async openDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          db.createObjectStore(this.STORE_NAME);
        }
      };
    });
  }

  /**
   * Get a value from IndexedDB by key.
   */
  static async get<T = unknown>(key: string): Promise<T | null> {
    try {
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.STORE_NAME, 'readonly');
        const store = transaction.objectStore(this.STORE_NAME);
        const request = store.get(key);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result || null);
      });
    } catch (error) {
      console.error('Error getting IndexedDB value:', error);
      return null;
    }
  }

  /**
   * Set a value in IndexedDB by key.
   */
  static async set<T = unknown>(key: string, value: T): Promise<boolean> {
    try {
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.STORE_NAME, 'readwrite');
        const store = transaction.objectStore(this.STORE_NAME);
        const request = store.put(value, key);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(true);
      });
    } catch (error) {
      console.error('Error setting IndexedDB value:', error);
      return false;
    }
  }

  /**
   * Remove one or many keys from IndexedDB.
   */
  static async remove(key: string | string[]): Promise<boolean> {
    try {
      const db = await this.openDB();
      const keys = Array.isArray(key) ? key : [key];

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.STORE_NAME, 'readwrite');
        const store = transaction.objectStore(this.STORE_NAME);

        let errorOccurred = false;
        keys.forEach((k) => {
          const request = store.delete(k);
          request.onerror = () => {
            errorOccurred = true;
            reject(request.error);
          };
        });

        transaction.oncomplete = () => resolve(!errorOccurred);
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (error) {
      console.error('Error removing IndexedDB value:', error);
      return false;
    }
  }

  /**
   * Clear all data from IndexedDB.
   */
  static async clear(): Promise<boolean> {
    try {
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.STORE_NAME, 'readwrite');
        const store = transaction.objectStore(this.STORE_NAME);
        const request = store.clear();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(true);
      });
    } catch (error) {
      console.error('Error clearing IndexedDB:', error);
      return false;
    }
  }

  /**
   * Get all key-value pairs from IndexedDB.
   */
  static async getAll(): Promise<Record<string, unknown>> {
    try {
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.STORE_NAME, 'readonly');
        const store = transaction.objectStore(this.STORE_NAME);
        const request = store.openCursor();
        const result: Record<string, unknown> = {};

        request.onerror = () => reject(request.error);
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result as IDBCursorWithValue;
          if (cursor) {
            result[cursor.key as string] = cursor.value;
            cursor.continue();
          } else {
            resolve(result);
          }
        };
      });
    } catch (error) {
      console.error('Error getting all IndexedDB values:', error);
      return {};
    }
  }

  /**
   * Get all keys from IndexedDB.
   */
  static async getAllKeys(): Promise<string[]> {
    try {
      const db = await this.openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.STORE_NAME, 'readonly');
        const store = transaction.objectStore(this.STORE_NAME);
        const request = store.getAllKeys();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result as string[]);
      });
    } catch (error) {
      console.error('Error getting all IndexedDB keys:', error);
      return [];
    }
  }

  /**
   * Estimate storage usage (approximation).
   */
  static async estimateUsage(): Promise<number> {
    try {
      const all = await this.getAll();
      // Rough estimation: convert to JSON and measure size
      const jsonStr = JSON.stringify(all);
      return new Blob([jsonStr]).size;
    } catch (error) {
      console.error('Error estimating IndexedDB usage:', error);
      return 0;
    }
  }
}

/**
 * Convenience wrapper for storage interactions with IndexedDB.
 * Uses IndexedDB for large data storage with no size limitations.
 */
class StorageUtils {
  /**
   * Retrieve a value by key from IndexedDB.
   * @param key - Storage key to read.
   */
  static async get<T = unknown>(key: string): Promise<T | null> {
    return IndexedDBStorage.get<T>(key);
  }

  /**
   * Persist a value by key to IndexedDB.
   * @param key - Storage key to write.
   * @param value - Value to persist.
   */
  static async set<T = unknown>(key: string, value: T): Promise<boolean> {
    return IndexedDBStorage.set(key, value);
  }

  /**
   * Remove one or many keys from IndexedDB.
   * @param key - Key or keys to delete.
   */
  static async remove(key: string | string[]): Promise<boolean> {
    return IndexedDBStorage.remove(key);
  }

  /**
   * Remove all entries from IndexedDB.
   */
  static async clear(): Promise<boolean> {
    return IndexedDBStorage.clear();
  }

  /**
   * Retrieve the full key/value map from IndexedDB.
   */
  static async getAll(): Promise<Record<string, unknown>> {
    return IndexedDBStorage.getAll();
  }

  /**
   * Return current storage consumption in bytes and formatted string.
   */
  static async getUsage(): Promise<StorageUsage | null> {
    try {
      const bytesInUse = await IndexedDBStorage.estimateUsage();
      return {
        bytesInUse,
        bytesInUseFormatted: this.formatBytes(bytesInUse),
      };
    } catch (error) {
      console.error('Error getting storage usage:', error);
      return null;
    }
  }

  /**
   * Format a byte count into a human-readable string.
   * @param bytes - Raw number of bytes.
   */
  static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Remove entries older than the specified threshold.
   * @param maxAgeHours - Maximum allowed age in hours.
   * @returns Number of entries removed.
   */
  static async cleanupExpired(maxAgeHours = 24): Promise<number> {
    try {
      const all = await this.getAll();
      const now = Date.now();
      const maxAge = maxAgeHours * 60 * 60 * 1000;

      const toRemove: string[] = [];
      for (const [key, value] of Object.entries(all)) {
        if (value && typeof value === 'object' && 'timestamp' in value) {
          if (now - (value as StorageData).timestamp > maxAge) {
            toRemove.push(key);
          }
        }
      }

      if (toRemove.length > 0) {
        await this.remove(toRemove);
        console.log(`Cleaned up ${toRemove.length} expired storage entries`);
      }

      return toRemove.length;
    } catch (error) {
      console.error('Error cleaning up expired storage:', error);
      return 0;
    }
  }

  /**
   * Save a value alongside the current timestamp.
   * @param key - Storage key to write.
   * @param data - Value to persist.
   */
  static async saveWithTimestamp<T = unknown>(key: string, data: T): Promise<boolean> {
    return this.set<StorageData>(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Load timestamped data and extract the stored value.
   * @param key - Storage key to read.
   */
  static async getWithTimestamp<T = unknown>(key: string): Promise<T | null> {
    const result = await this.get<StorageData>(key);
    return result ? (result.data as T) : null;
  }

  /**
   * Determine whether a timestamped entry is older than the provided age.
   * @param key - Storage key to inspect.
   * @param maxAgeHours - Maximum allowed age in hours.
   */
  static async isExpired(key: string, maxAgeHours = 24): Promise<boolean> {
    const result = await this.get<StorageData>(key);
    if (!result || !result.timestamp) return true;

    const maxAge = maxAgeHours * 60 * 60 * 1000;
    return Date.now() - result.timestamp > maxAge;
  }
}

// Export for use in other modules
export default StorageUtils;
export { IndexedDBStorage };
