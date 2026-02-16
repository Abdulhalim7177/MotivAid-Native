import * as SQLite from 'expo-sqlite';

const DB_NAME = 'motivaid_offline_v2.db';

export const initDatabase = async () => {
  try {
    const db = await SQLite.openDatabaseAsync(DB_NAME);
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS profile_cache (
        id TEXT PRIMARY KEY NOT NULL,
        profile_data TEXT NOT NULL,
        user_data TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    return db;
  } catch (error) {
    console.error('Database init error:', error);
    return null;
  }
};

export const cacheProfile = async (userId: string, profileData: any, userData: any = null) => {
  try {
    const db = await SQLite.openDatabaseAsync(DB_NAME);
    const profileJson = JSON.stringify(profileData);
    const userJson = userData ? JSON.stringify(userData) : null;

    if (userData) {
      await db.runAsync(
        'INSERT OR REPLACE INTO profile_cache (id, profile_data, user_data, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
        [userId, profileJson, userJson]
      );
    } else {
      const existing = await db.getFirstAsync('SELECT id FROM profile_cache WHERE id = ?', [userId]);
      if (existing) {
        await db.runAsync(
          'UPDATE profile_cache SET profile_data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [profileJson, userId]
        );
      } else {
        await db.runAsync(
          'INSERT INTO profile_cache (id, profile_data, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
          [userId, profileJson]
        );
      }
    }
  } catch (error) {
    console.error('Error caching profile:', error);
  }
};

export const getCachedProfile = async (userId: string) => {
  try {
    const db = await SQLite.openDatabaseAsync(DB_NAME);
    const result = await db.getFirstAsync<{ profile_data: string, user_data: string }>(
      'SELECT profile_data, user_data FROM profile_cache WHERE id = ?',
      [userId]
    );
    return result ? { 
      profile: JSON.parse(result.profile_data), 
      user: result.user_data ? JSON.parse(result.user_data) : null 
    } : null;
  } catch (error) {
    console.error('Error getting cached profile:', error);
    return null;
  }
};

export const getLatestCachedUser = async () => {
  try {
    const db = await SQLite.openDatabaseAsync(DB_NAME);
    const result = await db.getFirstAsync<{ profile_data: string, user_data: string }>(
      'SELECT profile_data, user_data FROM profile_cache ORDER BY updated_at DESC LIMIT 1'
    );
    return result ? { 
      profile: JSON.parse(result.profile_data), 
      user: result.user_data ? JSON.parse(result.user_data) : null 
    } : null;
  } catch (error) {
    return null;
  }
};

export const clearProfileCache = async () => {
  try {
    const db = await SQLite.openDatabaseAsync(DB_NAME);
    await db.runAsync('DELETE FROM profile_cache');
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
};
