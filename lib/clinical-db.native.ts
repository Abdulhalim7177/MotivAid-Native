import * as SQLite from 'expo-sqlite';

const DB_NAME = 'motivaid_offline_v2.db';

// ── Types ────────────────────────────────────────────────────

export interface LocalMaternalProfile {
    local_id: string;
    remote_id?: string;
    facility_id?: string;
    unit_id?: string;
    created_by?: string;
    patient_id?: string;
    age: number;
    gravida: number;
    parity: number;
    gestational_age_weeks?: number;
    is_multiple_gestation: boolean;
    has_prior_cesarean: boolean;
    has_placenta_previa: boolean;
    has_large_fibroids: boolean;
    has_anemia: boolean;
    has_pph_history: boolean;
    has_intraamniotic_infection: boolean;
    has_severe_anemia: boolean;
    has_coagulopathy: boolean;
    has_severe_pph_history: boolean;
    has_placenta_accreta: boolean;
    has_active_bleeding: boolean;
    has_morbid_obesity: boolean;
    hemoglobin_level?: number;
    risk_level: string;
    risk_score: number;
    delivery_time?: string;
    status: string;
    outcome?: string;
    notes?: string;
    is_synced: boolean;
    created_at: string;
    updated_at: string;
}

export interface LocalVitalSign {
    local_id: string;
    remote_id?: string;
    maternal_profile_local_id: string;
    recorded_by?: string;
    heart_rate?: number;
    systolic_bp?: number;
    diastolic_bp?: number;
    temperature?: number;
    respiratory_rate?: number;
    spo2?: number;
    shock_index?: number;
    estimated_blood_loss: number;
    blood_loss_method?: string;
    is_synced: boolean;
    recorded_at: string;
}

export interface LocalEmotiveChecklist {
    local_id: string;
    remote_id?: string;
    maternal_profile_local_id: string;
    performed_by?: string;

    // E — Early detection
    early_detection_done: boolean;
    early_detection_time?: string;
    early_detection_notes?: string;

    // M — Uterine Massage
    massage_done: boolean;
    massage_time?: string;
    massage_notes?: string;

    // O — Oxytocin
    oxytocin_done: boolean;
    oxytocin_time?: string;
    oxytocin_dose?: string;
    oxytocin_notes?: string;

    // T — Tranexamic Acid
    txa_done: boolean;
    txa_time?: string;
    txa_dose?: string;
    txa_notes?: string;

    // I — IV Fluids
    iv_fluids_done: boolean;
    iv_fluids_time?: string;
    iv_fluids_volume?: string;
    iv_fluids_notes?: string;

    // V/E — Escalation
    escalation_done: boolean;
    escalation_time?: string;
    escalation_notes?: string;

    is_synced: boolean;
    created_at: string;
    updated_at: string;
}

export interface SyncQueueItem {
    id: string;
    table_name: string;
    record_id: string;
    operation: 'insert' | 'update' | 'delete';
    payload: string;
    retry_count: number;
    max_retries: number;
    status: 'pending' | 'syncing' | 'synced' | 'failed';
    error_message?: string;
    created_at: string;
    synced_at?: string;
}

export interface LocalEmergencyContact {
    id: string;
    facility_id?: string;
    unit_id?: string;
    name: string;
    role: string;
    phone: string;
    tier: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface LocalCaseEvent {
    local_id: string;
    remote_id?: string;
    maternal_profile_id: string; // Links to the profile's local_id or remote_id
    event_type: string;
    event_label: string;
    event_data?: string; // Stored as JSON string
    performed_by?: string;
    occurred_at: string;
    is_synced: boolean;
}

// ── Database Init ────────────────────────────────────────────

export const initClinicalDatabase = async () => {
    try {
        const db = await SQLite.openDatabaseAsync(DB_NAME);

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

        return db;
    } catch (error) {
        console.error('Clinical DB init error:', error);
        return null;
    }
};

// ── Maternal Profile CRUD ────────────────────────────────────

export const saveMaternalProfile = async (profile: LocalMaternalProfile): Promise<void> => {
    try {
        const db = await SQLite.openDatabaseAsync(DB_NAME);
        await db.runAsync(
            `INSERT OR REPLACE INTO maternal_profiles_local (
        local_id, remote_id, facility_id, unit_id, created_by,
        patient_id, age, gravida, parity, gestational_age_weeks,
        is_multiple_gestation, has_prior_cesarean, has_placenta_previa,
        has_large_fibroids, has_anemia, has_pph_history,
        has_intraamniotic_infection, has_severe_anemia, has_coagulopathy,
        has_severe_pph_history, has_placenta_accreta, has_active_bleeding,
        has_morbid_obesity, hemoglobin_level, risk_level, risk_score,
        delivery_time, status, outcome, notes, is_synced, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                profile.local_id,
                profile.remote_id ?? null,
                profile.facility_id ?? null,
                profile.unit_id ?? null,
                profile.created_by ?? null,
                profile.patient_id ?? null,
                profile.age,
                profile.gravida,
                profile.parity,
                profile.gestational_age_weeks ?? null,
                profile.is_multiple_gestation ? 1 : 0,
                profile.has_prior_cesarean ? 1 : 0,
                profile.has_placenta_previa ? 1 : 0,
                profile.has_large_fibroids ? 1 : 0,
                profile.has_anemia ? 1 : 0,
                profile.has_pph_history ? 1 : 0,
                profile.has_intraamniotic_infection ? 1 : 0,
                profile.has_severe_anemia ? 1 : 0,
                profile.has_coagulopathy ? 1 : 0,
                profile.has_severe_pph_history ? 1 : 0,
                profile.has_placenta_accreta ? 1 : 0,
                profile.has_active_bleeding ? 1 : 0,
                profile.has_morbid_obesity ? 1 : 0,
                profile.hemoglobin_level ?? null,
                profile.risk_level,
                profile.risk_score,
                profile.delivery_time ?? null,
                profile.status,
                profile.outcome ?? null,
                profile.notes ?? null,
                profile.is_synced ? 1 : 0,
                profile.created_at,
                profile.updated_at,
            ]
        );
    } catch (error) {
        console.error('Error saving maternal profile:', error);
        throw error;
    }
};

export const getMaternalProfiles = async (
    unitId?: string,
    status?: string
): Promise<LocalMaternalProfile[]> => {
    try {
        const db = await SQLite.openDatabaseAsync(DB_NAME);
        let query = 'SELECT * FROM maternal_profiles_local';
        const params: any[] = [];
        const conditions: string[] = [];

        if (unitId) {
            conditions.push('unit_id = ?');
            params.push(unitId);
        }
        if (status) {
            conditions.push('status = ?');
            params.push(status);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY updated_at DESC';

        const rows = await db.getAllAsync<any>(query, params);
        return rows.map(rowToProfile);
    } catch (error) {
        console.error('Error getting maternal profiles:', error);
        return [];
    }
};

export const getMaternalProfile = async (
    localId: string
): Promise<LocalMaternalProfile | null> => {
    try {
        const db = await SQLite.openDatabaseAsync(DB_NAME);
        const row = await db.getFirstAsync<any>(
            'SELECT * FROM maternal_profiles_local WHERE local_id = ?',
            [localId]
        );
        return row ? rowToProfile(row) : null;
    } catch (error) {
        console.error('Error getting maternal profile:', error);
        return null;
    }
};

export const updateMaternalProfileStatus = async (
    localId: string,
    status: string,
    outcome?: string
): Promise<void> => {
    try {
        const db = await SQLite.openDatabaseAsync(DB_NAME);
        if (outcome) {
            await db.runAsync(
                `UPDATE maternal_profiles_local SET status = ?, outcome = ?, updated_at = datetime('now'), is_synced = 0 WHERE local_id = ?`,
                [status, outcome, localId]
            );
        } else {
            await db.runAsync(
                `UPDATE maternal_profiles_local SET status = ?, updated_at = datetime('now'), is_synced = 0 WHERE local_id = ?`,
                [status, localId]
            );
        }
    } catch (error) {
        console.error('Error updating maternal profile status:', error);
        throw error;
    }
};

// ── Vital Signs CRUD ─────────────────────────────────────────

export const saveVitalSign = async (vital: LocalVitalSign): Promise<void> => {
    try {
        const db = await SQLite.openDatabaseAsync(DB_NAME);
        await db.runAsync(
            `INSERT OR REPLACE INTO vital_signs_local (
        local_id, remote_id, maternal_profile_local_id, recorded_by,
        heart_rate, systolic_bp, diastolic_bp, temperature,
        respiratory_rate, spo2, shock_index,
        estimated_blood_loss, blood_loss_method, is_synced, recorded_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                vital.local_id,
                vital.remote_id ?? null,
                vital.maternal_profile_local_id,
                vital.recorded_by ?? null,
                vital.heart_rate ?? null,
                vital.systolic_bp ?? null,
                vital.diastolic_bp ?? null,
                vital.temperature ?? null,
                vital.respiratory_rate ?? null,
                vital.spo2 ?? null,
                vital.shock_index ?? null,
                vital.estimated_blood_loss,
                vital.blood_loss_method ?? null,
                vital.is_synced ? 1 : 0,
                vital.recorded_at,
            ]
        );
    } catch (error) {
        console.error('Error saving vital sign:', error);
        throw error;
    }
};

export const getVitalSigns = async (
    profileId: string
): Promise<LocalVitalSign[]> => {
    try {
        const db = await SQLite.openDatabaseAsync(DB_NAME);
        const rows = await db.getAllAsync<any>(
            `SELECT * FROM vital_signs_local 
             WHERE maternal_profile_local_id = ? 
             OR maternal_profile_local_id = (SELECT remote_id FROM maternal_profiles_local WHERE local_id = ?) 
             ORDER BY recorded_at DESC`,
            [profileId, profileId]
        );
        return rows.map(rowToVital);
    } catch (error) {
        console.error('Error getting vital signs:', error);
        return [];
    }
};

export const getLatestVitalSign = async (
    maternalProfileLocalId: string
): Promise<LocalVitalSign | null> => {
    try {
        const db = await SQLite.openDatabaseAsync(DB_NAME);
        const row = await db.getFirstAsync<any>(
            'SELECT * FROM vital_signs_local WHERE maternal_profile_local_id = ? ORDER BY recorded_at DESC LIMIT 1',
            [maternalProfileLocalId]
        );
        return row ? rowToVital(row) : null;
    } catch (error) {
        console.error('Error getting latest vital sign:', error);
        return null;
    }
};

// ── E-MOTIVE Checklist CRUD ──────────────────────────────────

export const saveEmotiveChecklist = async (checklist: LocalEmotiveChecklist): Promise<void> => {
    try {
        const db = await SQLite.openDatabaseAsync(DB_NAME);
        await db.runAsync(
            `INSERT OR REPLACE INTO emotive_checklists_local (
        local_id, remote_id, maternal_profile_local_id, performed_by,
        early_detection_done, early_detection_time, early_detection_notes,
        massage_done, massage_time, massage_notes,
        oxytocin_done, oxytocin_time, oxytocin_dose, oxytocin_notes,
        txa_done, txa_time, txa_dose, txa_notes,
        iv_fluids_done, iv_fluids_time, iv_fluids_volume, iv_fluids_notes,
        escalation_done, escalation_time, escalation_notes,
        is_synced, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                checklist.local_id,
                checklist.remote_id ?? null,
                checklist.maternal_profile_local_id,
                checklist.performed_by ?? null,
                checklist.early_detection_done ? 1 : 0,
                checklist.early_detection_time ?? null,
                checklist.early_detection_notes ?? null,
                checklist.massage_done ? 1 : 0,
                checklist.massage_time ?? null,
                checklist.massage_notes ?? null,
                checklist.oxytocin_done ? 1 : 0,
                checklist.oxytocin_time ?? null,
                checklist.oxytocin_dose ?? null,
                checklist.oxytocin_notes ?? null,
                checklist.txa_done ? 1 : 0,
                checklist.txa_time ?? null,
                checklist.txa_dose ?? null,
                checklist.txa_notes ?? null,
                checklist.iv_fluids_done ? 1 : 0,
                checklist.iv_fluids_time ?? null,
                checklist.iv_fluids_volume ?? null,
                checklist.iv_fluids_notes ?? null,
                checklist.escalation_done ? 1 : 0,
                checklist.escalation_time ?? null,
                checklist.escalation_notes ?? null,
                checklist.is_synced ? 1 : 0,
                checklist.created_at,
                checklist.updated_at,
            ]
        );
    } catch (error) {
        console.error('Error saving emotive checklist:', error);
        throw error;
    }
};

export const getEmotiveChecklist = async (
    profileId: string
): Promise<LocalEmotiveChecklist | null> => {
    try {
        const db = await SQLite.openDatabaseAsync(DB_NAME);
        const row = await db.getFirstAsync<any>(
            `SELECT * FROM emotive_checklists_local 
             WHERE maternal_profile_local_id = ? 
             OR maternal_profile_local_id = (SELECT remote_id FROM maternal_profiles_local WHERE local_id = ?)`,
            [profileId, profileId]
        );
        return row ? rowToChecklist(row) : null;
    } catch (error) {
        console.error('Error getting emotive checklist:', error);
        return null;
    }
};

export const updateEmotiveStep = async (
    localId: string,
    stepFields: Partial<LocalEmotiveChecklist>
): Promise<void> => {
    try {
        const db = await SQLite.openDatabaseAsync(DB_NAME);
        const sets: string[] = [];
        const values: any[] = [];

        for (const [key, value] of Object.entries(stepFields)) {
            if (key === 'local_id' || key === 'remote_id' || key === 'maternal_profile_local_id') continue;
            if (typeof value === 'boolean') {
                sets.push(`${key} = ?`);
                values.push(value ? 1 : 0);
            } else {
                sets.push(`${key} = ?`);
                values.push(value ?? null);
            }
        }

        sets.push("updated_at = datetime('now')");
        sets.push('is_synced = 0');
        values.push(localId);

        await db.runAsync(
            `UPDATE emotive_checklists_local SET ${sets.join(', ')} WHERE local_id = ?`,
            values
        );
    } catch (error) {
        console.error('Error updating emotive step:', error);
        throw error;
    }
};

// ── Sync Queue ───────────────────────────────────────────────

export const addToSyncQueue = async (item: Omit<SyncQueueItem, 'retry_count' | 'max_retries' | 'status' | 'created_at'>): Promise<void> => {
    try {
        const db = await SQLite.openDatabaseAsync(DB_NAME);
        await db.runAsync(
            `INSERT INTO sync_queue_local (id, table_name, record_id, operation, payload)
       VALUES (?, ?, ?, ?, ?)`,
            [item.id, item.table_name, item.record_id, item.operation, item.payload]
        );
    } catch (error) {
        console.error('Error adding to sync queue:', error);
    }
};

export const getPendingSyncItems = async (): Promise<SyncQueueItem[]> => {
    try {
        const db = await SQLite.openDatabaseAsync(DB_NAME);
        const rows = await db.getAllAsync<SyncQueueItem>(
            `SELECT * FROM sync_queue_local 
       WHERE status = 'pending' AND retry_count < max_retries
       ORDER BY created_at ASC`
        );
        return rows;
    } catch (error) {
        console.error('Error getting pending sync items:', error);
        return [];
    }
};

export const updateSyncItemStatus = async (
    id: string,
    status: 'syncing' | 'synced' | 'failed',
    errorMessage?: string
): Promise<void> => {
    try {
        const db = await SQLite.openDatabaseAsync(DB_NAME);
        if (status === 'failed') {
            await db.runAsync(
                `UPDATE sync_queue_local SET status = ?, error_message = ?, retry_count = retry_count + 1 WHERE id = ?`,
                [status, errorMessage ?? null, id]
            );
        } else if (status === 'synced') {
            await db.runAsync(
                `UPDATE sync_queue_local SET status = ?, synced_at = datetime('now') WHERE id = ?`,
                [status, id]
            );
        } else {
            await db.runAsync(
                `UPDATE sync_queue_local SET status = ? WHERE id = ?`,
                [status, id]
            );
        }
    } catch (error) {
        console.error('Error updating sync item status:', error);
    }
};

export const markRecordSynced = async (
    tableName: string,
    localId: string,
    remoteId: string
): Promise<void> => {
    try {
        const db = await SQLite.openDatabaseAsync(DB_NAME);
        const tableMap: Record<string, string> = {
            maternal_profiles: 'maternal_profiles_local',
            vital_signs: 'vital_signs_local',
            emotive_checklists: 'emotive_checklists_local',
            case_events: 'case_events_local',
        };
        const localTable = tableMap[tableName] ?? 'maternal_profiles_local';
        await db.runAsync(
            `UPDATE ${localTable} SET is_synced = 1, remote_id = ? WHERE local_id = ?`,
            [remoteId, localId]
        );
    } catch (error) {
        console.error('Error marking record as synced:', error);
    }
};

export const clearSyncedItems = async (): Promise<void> => {
    try {
        const db = await SQLite.openDatabaseAsync(DB_NAME);
        await db.runAsync(`DELETE FROM sync_queue_local WHERE status = 'synced'`);
    } catch (error) {
        console.error('Error clearing synced items:', error);
    }
};

// ── Row Converters ───────────────────────────────────────────

function rowToProfile(row: any): LocalMaternalProfile {
    return {
        ...row,
        is_multiple_gestation: !!row.is_multiple_gestation,
        has_prior_cesarean: !!row.has_prior_cesarean,
        has_placenta_previa: !!row.has_placenta_previa,
        has_large_fibroids: !!row.has_large_fibroids,
        has_anemia: !!row.has_anemia,
        has_pph_history: !!row.has_pph_history,
        has_intraamniotic_infection: !!row.has_intraamniotic_infection,
        has_severe_anemia: !!row.has_severe_anemia,
        has_coagulopathy: !!row.has_coagulopathy,
        has_severe_pph_history: !!row.has_severe_pph_history,
        has_placenta_accreta: !!row.has_placenta_accreta,
        has_active_bleeding: !!row.has_active_bleeding,
        has_morbid_obesity: !!row.has_morbid_obesity,
        is_synced: !!row.is_synced,
    };
}

function rowToVital(row: any): LocalVitalSign {
    return {
        ...row,
        is_synced: !!row.is_synced,
    };
}

function rowToChecklist(row: any): LocalEmotiveChecklist {
    return {
        ...row,
        early_detection_done: !!row.early_detection_done,
        massage_done: !!row.massage_done,
        oxytocin_done: !!row.oxytocin_done,
        txa_done: !!row.txa_done,
        iv_fluids_done: !!row.iv_fluids_done,
        escalation_done: !!row.escalation_done,
        is_synced: !!row.is_synced,
    };
}

// ── Emergency Contacts CRUD ──────────────────────────────────

export const saveEmergencyContacts = async (contacts: LocalEmergencyContact[]): Promise<void> => {
    try {
        const db = await SQLite.openDatabaseAsync(DB_NAME);
        for (const contact of contacts) {
            await db.runAsync(
                `INSERT OR REPLACE INTO emergency_contacts_local (
          id, facility_id, unit_id, name, role, phone, tier, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    contact.id,
                    contact.facility_id ?? null,
                    contact.unit_id ?? null,
                    contact.name,
                    contact.role,
                    contact.phone,
                    contact.tier,
                    contact.is_active ? 1 : 0,
                    contact.created_at,
                    contact.updated_at,
                ]
            );
        }
    } catch (error) {
        console.error('Error saving emergency contacts:', error);
    }
};

export const getEmergencyContacts = async (facilityId?: string): Promise<LocalEmergencyContact[]> => {
    try {
        const db = await SQLite.openDatabaseAsync(DB_NAME);
        let query = "SELECT * FROM emergency_contacts_local WHERE is_active = 1";
        const params: any[] = [];

        if (facilityId) {
            query += " AND (facility_id = ? OR tier = 3)";
            params.push(facilityId);
        }

        query += " ORDER BY tier ASC, name ASC";
        const rows = await db.getAllAsync<any>(query, params);
        return rows.map(row => ({
            ...row,
            is_active: !!row.is_active
        }));
    } catch (error) {
        console.error('Error getting emergency contacts:', error);
        return [];
    }
};

// ── Case Events CRUD ─────────────────────────────────────────

export const saveCaseEvent = async (event: LocalCaseEvent): Promise<void> => {
    try {
        const db = await SQLite.openDatabaseAsync(DB_NAME);
        await db.runAsync(
            `INSERT INTO case_events_local (
        local_id, remote_id, maternal_profile_id, event_type, event_label, event_data, performed_by, occurred_at, is_synced
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                event.local_id,
                event.remote_id ?? null,
                event.maternal_profile_id,
                event.event_type,
                event.event_label,
                event.event_data ?? null,
                event.performed_by ?? null,
                event.occurred_at,
                event.is_synced ? 1 : 0,
            ]
        );
    } catch (error) {
        console.error('Error saving case event:', error);
    }
};

export const getCaseEvents = async (profileId: string): Promise<LocalCaseEvent[]> => {
    try {
        const db = await SQLite.openDatabaseAsync(DB_NAME);
        const rows = await db.getAllAsync<any>(
            'SELECT * FROM case_events_local WHERE maternal_profile_id = ? OR maternal_profile_id = (SELECT remote_id FROM maternal_profiles_local WHERE local_id = ?) ORDER BY occurred_at DESC',
            [profileId, profileId]
        );
        return rows.map(rowToEvent);
    } catch (error) {
        console.error('Error getting case events:', error);
        return [];
    }
};

function rowToEvent(row: any): LocalCaseEvent {
    return {
        ...row,
        is_synced: !!row.is_synced,
    };
}
