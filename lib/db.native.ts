import * as SQLite from 'expo-sqlite';

const DB_NAME = 'motivaid_offline_v2.db';

// ── Singleton DB connection ──────────────────────────────────
let _db: SQLite.SQLiteDatabase | null = null;

const getDB = async (): Promise<SQLite.SQLiteDatabase> => {
  if (!_db) {
    _db = await SQLite.openDatabaseAsync(DB_NAME);
    // Always ensure table exists when first opening the connection
    await _db.execAsync(`
      CREATE TABLE IF NOT EXISTS profile_cache (
        id TEXT PRIMARY KEY NOT NULL,
        profile_data TEXT NOT NULL,
        user_data TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }
  return _db;
};

// ── Public API ───────────────────────────────────────────────

export const initDatabase = async () => {
  try {
    const db = await getDB();
    console.log('[DB] Database initialized successfully');
    return db;
  } catch (error) {
    console.error('[DB] Database init error:', error);
    return null;
  }
};

export const cacheProfile = async (userId: string, profileData: any, userData: any = null) => {
  try {
    const db = await getDB();
    const profileJson = JSON.stringify(profileData);
    const userJson = userData ? JSON.stringify(userData) : null;

    if (userJson) {
      // Store both profile and user data
      await db.runAsync(
        'INSERT OR REPLACE INTO profile_cache (id, profile_data, user_data, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
        [userId, profileJson, userJson]
      );
      console.log('[DB] Cached profile + user data for:', userId);
    } else {
      // Update profile_data but preserve existing user_data
      const existing = await db.getFirstAsync<{ user_data: string | null }>(
        'SELECT user_data FROM profile_cache WHERE id = ?', [userId]
      );
      await db.runAsync(
        'INSERT OR REPLACE INTO profile_cache (id, profile_data, user_data, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
        [userId, profileJson, existing?.user_data ?? null]
      );
      console.log('[DB] Cached profile data for:', userId, '(preserved existing user_data)');
    }
  } catch (error) {
    console.error('[DB] Error caching profile:', error);
  }
};

export const getCachedProfile = async (userId: string) => {
  try {
    const db = await getDB();
    const result = await db.getFirstAsync<{ profile_data: string; user_data: string }>(
      'SELECT profile_data, user_data FROM profile_cache WHERE id = ?',
      [userId]
    );
    if (result) {
      console.log('[DB] Found cached profile for:', userId);
      return {
        profile: JSON.parse(result.profile_data),
        user: result.user_data ? JSON.parse(result.user_data) : null,
      };
    }
    console.log('[DB] No cached profile found for:', userId);
    return null;
  } catch (error) {
    console.error('[DB] Error getting cached profile:', error);
    return null;
  }
};

export const getLatestCachedUser = async () => {
  try {
    const db = await getDB();
    const result = await db.getFirstAsync<{ profile_data: string; user_data: string }>(
      'SELECT profile_data, user_data FROM profile_cache ORDER BY updated_at DESC LIMIT 1'
    );
    if (result) {
      console.log('[DB] Found latest cached user');
      return {
        profile: JSON.parse(result.profile_data),
        user: result.user_data ? JSON.parse(result.user_data) : null,
      };
    }
    console.log('[DB] No cached users in database');
    return null;
  } catch (error) {
    console.error('[DB] Error getting latest cached user:', error);
    return null;
  }
};

export const clearProfileCache = async () => {
  try {
    const db = await getDB();
    await db.runAsync('DELETE FROM profile_cache');
    console.log('[DB] Profile cache cleared');
  } catch (error) {
    console.error('[DB] Error clearing cache:', error);
  }
};
