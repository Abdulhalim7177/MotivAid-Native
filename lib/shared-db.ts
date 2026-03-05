/**
 * Web stub for shared-db — no SQLite on web.
 * Each consuming module has its own web fallback (localStorage-based).
 */

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export type SharedDatabase = any;

export const getSharedDB = async (): Promise<SharedDatabase> => null;
