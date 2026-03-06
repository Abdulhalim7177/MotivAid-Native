/**
 * Training database operations for native (SQLite).
 *
 * Uses _training suffixed tables that are completely isolated from
 * clinical data. No sync queue entries are created — training data
 * stays local only.
 */
import { getSharedDB } from './shared-db';
import type { LocalCaseEvent, LocalEmotiveChecklist, LocalMaternalProfile, LocalVitalSign } from './clinical-db';

// ── Maternal Profiles (Training) ──────────────────────────────

export const saveTrainingProfile = async (profile: Omit<LocalMaternalProfile, 'is_synced'>) => {
    const db = await getSharedDB();
    if (!db) return;
    const boolToInt = (v: boolean) => v ? 1 : 0;
    await db.runAsync(
        `INSERT OR REPLACE INTO maternal_profiles_training (
      local_id, facility_id, unit_id, created_by, patient_id,
      age, gravida, parity, gestational_age_weeks,
      is_multiple_gestation, has_prior_cesarean, has_placenta_previa,
      has_large_fibroids, has_anemia, has_pph_history,
      has_intraamniotic_infection, has_severe_anemia, has_coagulopathy,
      has_severe_pph_history, has_placenta_accreta, has_active_bleeding,
      has_morbid_obesity, hemoglobin_level, risk_level, risk_score,
      delivery_time, status, outcome, notes, created_at, updated_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
            profile.local_id, profile.facility_id ?? null, profile.unit_id ?? null,
            profile.created_by ?? null, profile.patient_id ?? null,
            profile.age, profile.gravida, profile.parity, profile.gestational_age_weeks ?? null,
            boolToInt(profile.is_multiple_gestation), boolToInt(profile.has_prior_cesarean),
            boolToInt(profile.has_placenta_previa), boolToInt(profile.has_large_fibroids),
            boolToInt(profile.has_anemia), boolToInt(profile.has_pph_history),
            boolToInt(profile.has_intraamniotic_infection), boolToInt(profile.has_severe_anemia),
            boolToInt(profile.has_coagulopathy), boolToInt(profile.has_severe_pph_history),
            boolToInt(profile.has_placenta_accreta), boolToInt(profile.has_active_bleeding),
            boolToInt(profile.has_morbid_obesity), profile.hemoglobin_level ?? null,
            profile.risk_level, profile.risk_score,
            profile.delivery_time ?? null, profile.status, profile.outcome ?? null,
            profile.notes ?? null, profile.created_at, profile.updated_at,
        ]
    );
};

export const getTrainingProfiles = async (): Promise<LocalMaternalProfile[]> => {
    const db = await getSharedDB();
    if (!db) return [];
    const rows = await db.getAllAsync<any>('SELECT * FROM maternal_profiles_training ORDER BY created_at DESC');
    return rows.map(mapProfileRow);
};

export const getTrainingProfile = async (localId: string): Promise<LocalMaternalProfile | null> => {
    const db = await getSharedDB();
    if (!db) return null;
    const row = await db.getFirstAsync<any>(
        'SELECT * FROM maternal_profiles_training WHERE local_id = ?', [localId]
    );
    return row ? mapProfileRow(row) : null;
};

export const deleteTrainingProfile = async (localId: string) => {
    const db = await getSharedDB();
    if (!db) return;
    await db.runAsync('DELETE FROM case_events_training WHERE maternal_profile_id = ?', [localId]);
    await db.runAsync('DELETE FROM emotive_checklists_training WHERE maternal_profile_local_id = ?', [localId]);
    await db.runAsync('DELETE FROM vital_signs_training WHERE maternal_profile_local_id = ?', [localId]);
    await db.runAsync('DELETE FROM maternal_profiles_training WHERE local_id = ?', [localId]);
};

// ── Vital Signs (Training) ────────────────────────────────────

export const saveTrainingVitals = async (vitals: Omit<LocalVitalSign, 'is_synced'>) => {
    const db = await getSharedDB();
    if (!db) return;
    await db.runAsync(
        `INSERT OR REPLACE INTO vital_signs_training (
      local_id, maternal_profile_local_id, recorded_by,
      heart_rate, systolic_bp, diastolic_bp, temperature,
      respiratory_rate, spo2, shock_index, estimated_blood_loss,
      blood_loss_method, blood_loss_ai_estimate, blood_loss_confidence,
      blood_loss_ai_method, recorded_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
            vitals.local_id, vitals.maternal_profile_local_id, vitals.recorded_by ?? null,
            vitals.heart_rate ?? null, vitals.systolic_bp ?? null, vitals.diastolic_bp ?? null,
            vitals.temperature ?? null, vitals.respiratory_rate ?? null, vitals.spo2 ?? null,
            vitals.shock_index ?? null, vitals.estimated_blood_loss,
            vitals.blood_loss_method ?? null, vitals.blood_loss_ai_estimate ?? null,
            vitals.blood_loss_confidence ?? null, vitals.blood_loss_ai_method ?? null,
            vitals.recorded_at,
        ]
    );
};

export const getTrainingVitals = async (profileLocalId: string): Promise<LocalVitalSign[]> => {
    const db = await getSharedDB();
    if (!db) return [];
    const rows = await db.getAllAsync<any>(
        'SELECT * FROM vital_signs_training WHERE maternal_profile_local_id = ? ORDER BY recorded_at DESC',
        [profileLocalId]
    );
    return rows.map(mapVitalsRow);
};

// ── Emotive Checklists (Training) ─────────────────────────────

export const saveTrainingChecklist = async (checklist: Omit<LocalEmotiveChecklist, 'is_synced'>) => {
    const db = await getSharedDB();
    if (!db) return;
    const b = (v: boolean) => v ? 1 : 0;
    await db.runAsync(
        `INSERT OR REPLACE INTO emotive_checklists_training (
      local_id, maternal_profile_local_id, performed_by,
      early_detection_done, early_detection_time, early_detection_notes,
      massage_done, massage_time, massage_notes,
      oxytocin_done, oxytocin_time, oxytocin_dose, oxytocin_notes,
      txa_done, txa_time, txa_dose, txa_notes,
      iv_fluids_done, iv_fluids_time, iv_fluids_volume, iv_fluids_notes,
      escalation_done, escalation_time, escalation_notes,
      diagnostics_causes, diagnostics_notes, created_at, updated_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
            checklist.local_id, checklist.maternal_profile_local_id, checklist.performed_by ?? null,
            b(checklist.early_detection_done), checklist.early_detection_time ?? null, checklist.early_detection_notes ?? null,
            b(checklist.massage_done), checklist.massage_time ?? null, checklist.massage_notes ?? null,
            b(checklist.oxytocin_done), checklist.oxytocin_time ?? null, checklist.oxytocin_dose ?? null, checklist.oxytocin_notes ?? null,
            b(checklist.txa_done), checklist.txa_time ?? null, checklist.txa_dose ?? null, checklist.txa_notes ?? null,
            b(checklist.iv_fluids_done), checklist.iv_fluids_time ?? null, checklist.iv_fluids_volume ?? null, checklist.iv_fluids_notes ?? null,
            b(checklist.escalation_done), checklist.escalation_time ?? null, checklist.escalation_notes ?? null,
            checklist.diagnostics_causes ? JSON.stringify(checklist.diagnostics_causes) : null,
            checklist.diagnostics_notes ?? null, checklist.created_at, checklist.updated_at,
        ]
    );
};

export const getTrainingChecklist = async (profileLocalId: string): Promise<LocalEmotiveChecklist | null> => {
    const db = await getSharedDB();
    if (!db) return null;
    const row = await db.getFirstAsync<any>(
        'SELECT * FROM emotive_checklists_training WHERE maternal_profile_local_id = ?', [profileLocalId]
    );
    return row ? mapChecklistRow(row) : null;
};

// ── Case Events (Training) ────────────────────────────────────

export const saveTrainingCaseEvent = async (event: Omit<LocalCaseEvent, 'is_synced'>) => {
    const db = await getSharedDB();
    if (!db) return;
    await db.runAsync(
        `INSERT INTO case_events_training (local_id, maternal_profile_id, event_type, event_label, event_data, performed_by, occurred_at)
     VALUES (?,?,?,?,?,?,?)`,
        [event.local_id, event.maternal_profile_id, event.event_type, event.event_label,
        event.event_data ? JSON.stringify(event.event_data) : null,
        event.performed_by ?? null, event.occurred_at]
    );
};

export const getTrainingCaseEvents = async (profileLocalId: string): Promise<LocalCaseEvent[]> => {
    const db = await getSharedDB();
    if (!db) return [];
    const rows = await db.getAllAsync<any>(
        'SELECT * FROM case_events_training WHERE maternal_profile_id = ? ORDER BY occurred_at ASC',
        [profileLocalId]
    );
    return rows.map(r => ({
        ...r,
        event_data: r.event_data ? JSON.parse(r.event_data) : null,
        is_synced: false,
    }));
};

// ── Clear All Training Data ───────────────────────────────────

export const clearAllTrainingData = async () => {
    const db = await getSharedDB();
    if (!db) return;
    await db.execAsync(`
    DELETE FROM case_events_training;
    DELETE FROM emotive_checklists_training;
    DELETE FROM vital_signs_training;
    DELETE FROM maternal_profiles_training;
  `);
};

// ── Row Mappers ───────────────────────────────────────────────

function mapProfileRow(row: any): LocalMaternalProfile {
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
        is_synced: false,
    };
}

function mapVitalsRow(row: any): LocalVitalSign {
    return {
        ...row,
        is_synced: false,
    };
}

function mapChecklistRow(row: any): LocalEmotiveChecklist {
    return {
        ...row,
        early_detection_done: !!row.early_detection_done,
        massage_done: !!row.massage_done,
        oxytocin_done: !!row.oxytocin_done,
        txa_done: !!row.txa_done,
        iv_fluids_done: !!row.iv_fluids_done,
        escalation_done: !!row.escalation_done,
        diagnostics_causes: row.diagnostics_causes ? JSON.parse(row.diagnostics_causes) : null,
        is_synced: false,
    };
}
