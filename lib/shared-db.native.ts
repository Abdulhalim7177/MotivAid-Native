/**
 * Shared SQLite database connection for native (Android/iOS).
 *
 * Uses a single lazily-initialized connection so that all modules
 * (auth cache, clinical data, sync queue) share one handle.
 * This avoids both:
 *   - "database is locked" (from multiple connections)
 *   - NullPointerException (from stale handles in singleton)
 *
 * Uses a promise-based mutex to prevent concurrent init.
 */
import * as SQLite from 'expo-sqlite';

const DB_NAME = 'motivaid_offline_v2.db';

let _db: SQLite.SQLiteDatabase | null = null;
let _initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Get the shared database connection.
 * Safe to call concurrently — only one init will run thanks to the promise cache.
 */
export const getSharedDB = async (): Promise<SQLite.SQLiteDatabase> => {
    if (_db) return _db;

    // If init is already in progress, wait for it
    if (_initPromise) return _initPromise;

    _initPromise = (async () => {
        const db = await SQLite.openDatabaseAsync(DB_NAME);

        // ── Auth profile cache table ──
        await db.execAsync(`
      CREATE TABLE IF NOT EXISTS profile_cache (
        id TEXT PRIMARY KEY NOT NULL,
        profile_data TEXT NOT NULL,
        user_data TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

        // ── Clinical tables ──
        await db.execAsync(`
      CREATE TABLE IF NOT EXISTS maternal_profiles_local (
        local_id TEXT PRIMARY KEY NOT NULL,
        remote_id TEXT,
        facility_id TEXT,
        unit_id TEXT,
        created_by TEXT,
        patient_id TEXT,
        age INTEGER NOT NULL,
        gravida INTEGER DEFAULT 1,
        parity INTEGER DEFAULT 0,
        gestational_age_weeks INTEGER,
        is_multiple_gestation INTEGER DEFAULT 0,
        has_prior_cesarean INTEGER DEFAULT 0,
        has_placenta_previa INTEGER DEFAULT 0,
        has_large_fibroids INTEGER DEFAULT 0,
        has_anemia INTEGER DEFAULT 0,
        has_pph_history INTEGER DEFAULT 0,
        has_intraamniotic_infection INTEGER DEFAULT 0,
        has_severe_anemia INTEGER DEFAULT 0,
        has_coagulopathy INTEGER DEFAULT 0,
        has_severe_pph_history INTEGER DEFAULT 0,
        has_placenta_accreta INTEGER DEFAULT 0,
        has_active_bleeding INTEGER DEFAULT 0,
        has_morbid_obesity INTEGER DEFAULT 0,
        hemoglobin_level REAL,
        risk_level TEXT DEFAULT 'low',
        risk_score INTEGER DEFAULT 0,
        delivery_time TEXT,
        status TEXT DEFAULT 'pre_delivery',
        outcome TEXT,
        notes TEXT,
        is_synced INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS vital_signs_local (
        local_id TEXT PRIMARY KEY NOT NULL,
        remote_id TEXT,
        maternal_profile_local_id TEXT NOT NULL,
        recorded_by TEXT,
        heart_rate INTEGER,
        systolic_bp INTEGER,
        diastolic_bp INTEGER,
        temperature REAL,
        respiratory_rate INTEGER,
        spo2 INTEGER,
        shock_index REAL,
        estimated_blood_loss INTEGER DEFAULT 0,
        blood_loss_method TEXT,
        is_synced INTEGER DEFAULT 0,
        recorded_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (maternal_profile_local_id) REFERENCES maternal_profiles_local(local_id)
      );

      CREATE TABLE IF NOT EXISTS emotive_checklists_local (
        local_id TEXT PRIMARY KEY NOT NULL,
        remote_id TEXT,
        maternal_profile_local_id TEXT NOT NULL,
        performed_by TEXT,
        early_detection_done INTEGER DEFAULT 0,
        early_detection_time TEXT,
        early_detection_notes TEXT,
        massage_done INTEGER DEFAULT 0,
        massage_time TEXT,
        massage_notes TEXT,
        oxytocin_done INTEGER DEFAULT 0,
        oxytocin_time TEXT,
        oxytocin_dose TEXT,
        oxytocin_notes TEXT,
        txa_done INTEGER DEFAULT 0,
        txa_time TEXT,
        txa_dose TEXT,
        txa_notes TEXT,
        iv_fluids_done INTEGER DEFAULT 0,
        iv_fluids_time TEXT,
        iv_fluids_volume TEXT,
        iv_fluids_notes TEXT,
        escalation_done INTEGER DEFAULT 0,
        escalation_time TEXT,
        escalation_notes TEXT,
        diagnostics_causes TEXT,
        diagnostics_notes TEXT,
        is_synced INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (maternal_profile_local_id) REFERENCES maternal_profiles_local(local_id)
      );

      CREATE TABLE IF NOT EXISTS sync_queue_local (
        id TEXT PRIMARY KEY NOT NULL,
        table_name TEXT NOT NULL,
        record_id TEXT NOT NULL,
        operation TEXT NOT NULL,
        payload TEXT NOT NULL,
        retry_count INTEGER DEFAULT 0,
        max_retries INTEGER DEFAULT 5,
        status TEXT DEFAULT 'pending',
        error_message TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        synced_at TEXT
      );

      CREATE TABLE IF NOT EXISTS emergency_contacts_local (
        id TEXT PRIMARY KEY NOT NULL,
        facility_id TEXT,
        unit_id TEXT,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        phone TEXT NOT NULL,
        tier INTEGER NOT NULL,
        is_active INTEGER DEFAULT 1,
        is_synced INTEGER DEFAULT 0,
        is_deleted INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS case_events_local (
        local_id TEXT PRIMARY KEY NOT NULL,
        remote_id TEXT,
        maternal_profile_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        event_label TEXT NOT NULL,
        event_data TEXT,
        performed_by TEXT,
        occurred_at TEXT DEFAULT (datetime('now')),
        is_synced INTEGER DEFAULT 0
      );
    `);

        // ── AI columns on vital_signs_local (graceful ALTER for existing installs) ──
        try {
            await db.execAsync(`ALTER TABLE vital_signs_local ADD COLUMN blood_loss_ai_estimate INTEGER;`);
        } catch { /* column may already exist */ }
        try {
            await db.execAsync(`ALTER TABLE vital_signs_local ADD COLUMN blood_loss_confidence REAL;`);
        } catch { /* column may already exist */ }
        try {
            await db.execAsync(`ALTER TABLE vital_signs_local ADD COLUMN blood_loss_ai_method TEXT;`);
        } catch { /* column may already exist */ }

        // ── Training tables (simulation mode — never synced) ──
        await db.execAsync(`
      CREATE TABLE IF NOT EXISTS maternal_profiles_training (
        local_id TEXT PRIMARY KEY NOT NULL,
        facility_id TEXT,
        unit_id TEXT,
        created_by TEXT,
        patient_id TEXT,
        age INTEGER NOT NULL,
        gravida INTEGER DEFAULT 1,
        parity INTEGER DEFAULT 0,
        gestational_age_weeks INTEGER,
        is_multiple_gestation INTEGER DEFAULT 0,
        has_prior_cesarean INTEGER DEFAULT 0,
        has_placenta_previa INTEGER DEFAULT 0,
        has_large_fibroids INTEGER DEFAULT 0,
        has_anemia INTEGER DEFAULT 0,
        has_pph_history INTEGER DEFAULT 0,
        has_intraamniotic_infection INTEGER DEFAULT 0,
        has_severe_anemia INTEGER DEFAULT 0,
        has_coagulopathy INTEGER DEFAULT 0,
        has_severe_pph_history INTEGER DEFAULT 0,
        has_placenta_accreta INTEGER DEFAULT 0,
        has_active_bleeding INTEGER DEFAULT 0,
        has_morbid_obesity INTEGER DEFAULT 0,
        hemoglobin_level REAL,
        risk_level TEXT DEFAULT 'low',
        risk_score INTEGER DEFAULT 0,
        delivery_time TEXT,
        status TEXT DEFAULT 'pre_delivery',
        outcome TEXT,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS vital_signs_training (
        local_id TEXT PRIMARY KEY NOT NULL,
        maternal_profile_local_id TEXT NOT NULL,
        recorded_by TEXT,
        heart_rate INTEGER,
        systolic_bp INTEGER,
        diastolic_bp INTEGER,
        temperature REAL,
        respiratory_rate INTEGER,
        spo2 INTEGER,
        shock_index REAL,
        estimated_blood_loss INTEGER DEFAULT 0,
        blood_loss_method TEXT,
        blood_loss_ai_estimate INTEGER,
        blood_loss_confidence REAL,
        blood_loss_ai_method TEXT,
        recorded_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (maternal_profile_local_id) REFERENCES maternal_profiles_training(local_id)
      );

      CREATE TABLE IF NOT EXISTS emotive_checklists_training (
        local_id TEXT PRIMARY KEY NOT NULL,
        maternal_profile_local_id TEXT NOT NULL,
        performed_by TEXT,
        early_detection_done INTEGER DEFAULT 0,
        early_detection_time TEXT,
        early_detection_notes TEXT,
        massage_done INTEGER DEFAULT 0,
        massage_time TEXT,
        massage_notes TEXT,
        oxytocin_done INTEGER DEFAULT 0,
        oxytocin_time TEXT,
        oxytocin_dose TEXT,
        oxytocin_notes TEXT,
        txa_done INTEGER DEFAULT 0,
        txa_time TEXT,
        txa_dose TEXT,
        txa_notes TEXT,
        iv_fluids_done INTEGER DEFAULT 0,
        iv_fluids_time TEXT,
        iv_fluids_volume TEXT,
        iv_fluids_notes TEXT,
        escalation_done INTEGER DEFAULT 0,
        escalation_time TEXT,
        escalation_notes TEXT,
        diagnostics_causes TEXT,
        diagnostics_notes TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (maternal_profile_local_id) REFERENCES maternal_profiles_training(local_id)
      );

      CREATE TABLE IF NOT EXISTS case_events_training (
        local_id TEXT PRIMARY KEY NOT NULL,
        maternal_profile_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        event_label TEXT NOT NULL,
        event_data TEXT,
        performed_by TEXT,
        occurred_at TEXT DEFAULT (datetime('now'))
      );
    `);

        _db = db;
        _initPromise = null;
        console.log('[SharedDB] All tables initialized successfully (including training)');
        return db;
    })();

    return _initPromise;
};

export type SharedDatabase = SQLite.SQLiteDatabase;
