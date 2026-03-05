import { getSharedDB } from './shared-db';

// ── Public API ───────────────────────────────────────────────

export const initDatabase = async () => {
  try {
    const db = await getSharedDB();
    console.log('[DB] Database initialized successfully');
    return db;
  } catch (error) {
    console.error('[DB] Database init error:', error);
    return null;
  }
};

export const cacheProfile = async (userId: string, profileData: any, userData: any = null) => {
  try {
    const db = await getSharedDB();
    if (!db) return;
    const profileJson = JSON.stringify(profileData);
    const userJson = userData ? JSON.stringify(userData) : null;

    if (userJson) {
      await db.runAsync(
        'INSERT OR REPLACE INTO profile_cache (id, profile_data, user_data, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
        [userId, profileJson, userJson]
      );
      console.log('[DB] Cached profile + user data for:', userId);
    } else {
      const existing = await db.getFirstAsync<{ user_data: string | null }>(
        'SELECT user_data FROM profile_cache WHERE id = ?', [userId]
      );
      await db.runAsync(
        'INSERT OR REPLACE INTO profile_cache (id, profile_data, user_data, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
        [userId, profileJson, existing?.user_data ?? null]
      );
      console.log('[DB] Cached profile data for:', userId);
    }
  } catch (error) {
    console.error('[DB] Error caching profile:', error);
  }
};

export const getCachedProfile = async (userId: string) => {
  try {
    const db = await getSharedDB();
    if (!db) return null;
    const result = await db.getFirstAsync<{ profile_data: string; user_data: string }>(
      'SELECT profile_data, user_data FROM profile_cache WHERE id = ?',
      [userId]
    );
    if (result) {
      return {
        profile: JSON.parse(result.profile_data),
        user: result.user_data ? JSON.parse(result.user_data) : null,
      };
    }
    return null;
  } catch (error) {
    console.error('[DB] Error getting cached profile:', error);
    return null;
  }
};

export const getLatestCachedUser = async () => {
  try {
    const db = await getSharedDB();
    if (!db) return null;
    const result = await db.getFirstAsync<{ profile_data: string; user_data: string }>(
      'SELECT profile_data, user_data FROM profile_cache ORDER BY updated_at DESC LIMIT 1'
    );
    if (result) {
      return {
        profile: JSON.parse(result.profile_data),
        user: result.user_data ? JSON.parse(result.user_data) : null,
      };
    }
    return null;
  } catch (error) {
    console.error('[DB] Error getting latest cached user:', error);
    return null;
  }
};

export const clearProfileCache = async () => {
  try {
    const db = await getSharedDB();
    if (!db) return;
    await db.runAsync('DELETE FROM profile_cache');
  } catch (error) {
    console.error('[DB] Error clearing cache:', error);
  }
};
