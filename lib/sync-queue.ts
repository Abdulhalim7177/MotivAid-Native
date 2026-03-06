/**
 * Sync Queue Engine
 *
 * Offline-first sync strategy:
 * 1. All clinical data is written to SQLite first
 * 2. Operations are queued in sync_queue_local
 * 3. When online, queue is replayed against Supabase
 * 4. Conflict resolution: last-write-wins for simple fields, server-priority for status
 */

import {
    addToSyncQueue,
    clearSyncedItems,
    getPendingSyncItems,
    markRecordSynced,
    updateSyncItemStatus,
} from '@/lib/clinical-db';
import { supabase } from '@/lib/supabase';
import NetInfo from '@react-native-community/netinfo';

// ── Queue an Operation ───────────────────────────────────────

export async function queueOperation(
    tableName: string,
    recordId: string,
    operation: 'insert' | 'update' | 'delete',
    payload: Record<string, any>
): Promise<void> {
    const id = generateUUID();
    await addToSyncQueue({
        id,
        table_name: tableName,
        record_id: recordId,
        operation,
        payload: JSON.stringify(payload),
    });

    // Attempt immediate sync if online
    const netState = await NetInfo.fetch();
    if (netState.isConnected) {
        await processQueue();
    }
}

// ── Process Pending Queue ────────────────────────────────────

/** Tables that must sync before their dependents */
const TABLE_PRIORITY: Record<string, number> = {
    maternal_profiles: 0,
    vital_signs: 1,
    emotive_checklists: 1,
    case_events: 1,
    emergency_contacts: 1,
};

async function syncOneItem(item: any): Promise<string | null> {
    const payload = JSON.parse(item.payload);
    let remoteId: string | null = null;

    switch (item.operation) {
        case 'insert':
            remoteId = await syncInsert(item.table_name, item.record_id, payload);
            break;
        case 'update':
            await syncUpdate(item.table_name, payload);
            await markRecordSynced(item.table_name, item.record_id, payload.remote_id || payload.id || item.record_id);
            break;
        case 'delete':
            await syncDelete(item.table_name, payload.id || item.record_id);
            await markRecordSynced(item.table_name, item.record_id, payload.id || item.record_id);
            break;
    }

    return remoteId;
}

export async function processQueue(): Promise<{
    synced: number;
    failed: number;
}> {
    const pendingItems = await getPendingSyncItems();
    let synced = 0;
    let failed = 0;

    // Sort by table priority — parent records (profiles) sync before dependents (vitals, events)
    pendingItems.sort((a: any, b: any) =>
        (TABLE_PRIORITY[a.table_name] ?? 99) - (TABLE_PRIORITY[b.table_name] ?? 99)
    );

    const deferred: typeof pendingItems = [];

    for (const item of pendingItems) {
        try {
            await updateSyncItemStatus(item.id, 'syncing');
            const remoteId = await syncOneItem(item);
            await updateSyncItemStatus(item.id, 'synced');
            if (remoteId) {
                await markRecordSynced(item.table_name, item.record_id, remoteId);
            }
            synced++;
        } catch (error: any) {
            if (error?.message?.includes('not yet synced')) {
                // Parent hasn't synced yet — defer for second pass instead of failing
                await updateSyncItemStatus(item.id, 'pending');
                deferred.push(item);
            } else {
                await updateSyncItemStatus(
                    item.id,
                    'failed',
                    error?.message ?? 'Unknown sync error'
                );
                failed++;
            }
        }
    }

    // Second pass: retry deferred items (parent should be synced now)
    for (const item of deferred) {
        try {
            await updateSyncItemStatus(item.id, 'syncing');
            const remoteId = await syncOneItem(item);
            await updateSyncItemStatus(item.id, 'synced');
            if (remoteId) {
                await markRecordSynced(item.table_name, item.record_id, remoteId);
            }
            synced++;
        } catch (error: any) {
            await updateSyncItemStatus(
                item.id,
                'failed',
                error?.message ?? 'Unknown sync error'
            );
            failed++;
        }
    }

    // Clean up completed entries
    if (synced > 0) {
        await clearSyncedItems();
    }

    return { synced, failed };
}

// ── Sync Operations ──────────────────────────────────────────

async function syncInsert(
    tableName: string,
    localId: string,
    payload: Record<string, any>
): Promise<string> {
    // Remove local-only fields
    const { local_id, remote_id, is_synced, ...data } = payload;

    // Set local_id on the remote record for reference
    data.local_id = localId;

    // For tables that link to maternal_profiles: resolve local profile reference to remote profile UUID
    // They might use 'maternal_profile_id' or 'maternal_profile_local_id' in the payload
    const profileLocalId = data.maternal_profile_id || data.maternal_profile_local_id;

    if ((tableName === 'vital_signs' || tableName === 'emotive_checklists' || tableName === 'case_events') && profileLocalId) {
        // Look up the remote ID for this maternal profile
        const { data: profileData } = await supabase
            .from('maternal_profiles')
            .select('id')
            .eq('local_id', profileLocalId)
            .maybeSingle();

        if (profileData?.id) {
            data.maternal_profile_id = profileData.id;
            // Remove local-only reference fields
            delete data.maternal_profile_local_id;
        } else {
            // Check if profileLocalId is actually already a remote UUID (sometimes happens if data was merged)
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(profileLocalId);
            if (isUuid) {
                data.maternal_profile_id = profileLocalId;
            } else {
                throw new Error(`Cannot sync ${tableName}: maternal profile "${profileLocalId}" not yet synced`);
            }
        }
    }

    const { data: result, error } = await supabase
        .from(tableName)
        .insert(data)
        .select('id')
        .single();

    if (error) throw error;
    return result.id;
}

async function syncUpdate(
    tableName: string,
    payload: Record<string, any>
): Promise<void> {
    const { local_id, remote_id, is_synced, id, ...data } = payload;

    // Resolve the remote UUID — try remote_id, then id, then look up by local_id
    let updateId = remote_id || id;
    if (!updateId && local_id) {
        const { data: lookupData } = await supabase
            .from(tableName)
            .select('id')
            .eq('local_id', local_id)
            .maybeSingle();
        updateId = lookupData?.id;
    }

    if (!updateId) {
        throw new Error(`Cannot sync update: record "${local_id}" not yet synced to Supabase`);
    }

    // Handle maternal_profile_id resolution for updates too
    const profileLocalId = data.maternal_profile_id || data.maternal_profile_local_id;
    if ((tableName === 'vital_signs' || tableName === 'emotive_checklists' || tableName === 'case_events') && profileLocalId) {
        const { data: profileData } = await supabase
            .from('maternal_profiles')
            .select('id')
            .eq('local_id', profileLocalId)
            .maybeSingle();
        if (profileData?.id) {
            data.maternal_profile_id = profileData.id;
            delete data.maternal_profile_local_id;
        } else {
            // Check if it's already a UUID
            if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(profileLocalId)) {
                data.maternal_profile_id = profileLocalId;
            }
        }
    }

    const { error } = await supabase
        .from(tableName)
        .update(data)
        .eq('id', updateId);

    if (error) throw error;
}

async function syncDelete(
    tableName: string,
    id: string
): Promise<void> {
    const { error } = await supabase.from(tableName).delete().eq('id', id);
    if (error) throw error;
}

// ── Pull from Remote (Download) ──────────────────────────────

/**
 * Fetches the user's data from Supabase and upserts it into local SQLite.
 * This enables cross-device sync: login on a new device → pull → see your data.
 */
export async function pullFromRemote(options: {
    userId?: string;
    facilityId?: string;
    unitId?: string;
    role?: string;
}): Promise<{ pulled: number; errors: number }> {
    const { saveMaternalProfile, saveVitalSign, saveEmotiveChecklist, saveCaseEvent, saveEmergencyContacts } = await import('@/lib/clinical-db');
    let pulled = 0;
    let errors = 0;

    const { userId, facilityId, unitId, role } = options;
    const isSupervisor = role === 'supervisor' || role === 'admin';

    try {
        // 1. Pull maternal profiles
        let profileQuery = supabase.from('maternal_profiles').select('*');
        if (isSupervisor && facilityId) {
            profileQuery = profileQuery.eq('facility_id', facilityId);
        } else if (unitId) {
            profileQuery = profileQuery.or(`unit_id.eq.${unitId},created_by.eq.${userId || ''}`);
        } else if (userId) {
            profileQuery = profileQuery.eq('created_by', userId);
        }

        const { data: remoteProfiles, error: profileError } = await profileQuery.order('updated_at', { ascending: false });
        if (profileError) throw profileError;

        if (remoteProfiles) {
            for (const r of remoteProfiles) {
                try {
                    await saveMaternalProfile({
                        local_id: r.local_id || r.id,
                        remote_id: r.id,
                        facility_id: r.facility_id,
                        unit_id: r.unit_id,
                        created_by: r.created_by,
                        patient_id: r.patient_id,
                        age: r.age,
                        gravida: r.gravida ?? 1,
                        parity: r.parity ?? 0,
                        gestational_age_weeks: r.gestational_age_weeks,
                        is_multiple_gestation: !!r.is_multiple_gestation,
                        has_prior_cesarean: !!r.has_prior_cesarean,
                        has_placenta_previa: !!r.has_placenta_previa,
                        has_large_fibroids: !!r.has_large_fibroids,
                        has_anemia: !!r.has_anemia,
                        has_pph_history: !!r.has_pph_history,
                        has_intraamniotic_infection: !!r.has_intraamniotic_infection,
                        has_severe_anemia: !!r.has_severe_anemia,
                        has_coagulopathy: !!r.has_coagulopathy,
                        has_severe_pph_history: !!r.has_severe_pph_history,
                        has_placenta_accreta: !!r.has_placenta_accreta,
                        has_active_bleeding: !!r.has_active_bleeding,
                        has_morbid_obesity: !!r.has_morbid_obesity,
                        hemoglobin_level: r.hemoglobin_level,
                        risk_level: r.risk_level ?? 'low',
                        risk_score: r.risk_score ?? 0,
                        delivery_time: r.delivery_time,
                        status: r.status ?? 'pre_delivery',
                        outcome: r.outcome,
                        notes: r.notes,
                        is_synced: true,
                        created_at: r.created_at,
                        updated_at: r.updated_at,
                    });
                    pulled++;
                } catch (e) {
                    console.warn('[Pull] Failed to save profile:', e);
                    errors++;
                }
            }

            // 2. Pull vitals, checklists, events for each profile
            const profileIds = remoteProfiles.map((p: any) => p.id).filter(Boolean);

            if (profileIds.length > 0) {
                // Pull vital signs
                const { data: remoteVitals } = await supabase
                    .from('vital_signs')
                    .select('*')
                    .in('maternal_profile_id', profileIds)
                    .order('recorded_at', { ascending: false });

                if (remoteVitals) {
                    for (const v of remoteVitals) {
                        try {
                            // Find the local_id for this profile
                            const profile = remoteProfiles.find((p: any) => p.id === v.maternal_profile_id);
                            const profileLocalId = profile?.local_id || v.maternal_profile_id;
                            await saveVitalSign({
                                local_id: v.local_id || v.id,
                                remote_id: v.id,
                                maternal_profile_local_id: profileLocalId,
                                recorded_by: v.recorded_by,
                                heart_rate: v.heart_rate,
                                systolic_bp: v.systolic_bp,
                                diastolic_bp: v.diastolic_bp,
                                temperature: v.temperature,
                                respiratory_rate: v.respiratory_rate,
                                spo2: v.spo2,
                                shock_index: v.shock_index,
                                estimated_blood_loss: v.estimated_blood_loss ?? 0,
                                blood_loss_method: v.blood_loss_method,
                                blood_loss_ai_estimate: v.blood_loss_ai_estimate,
                                blood_loss_confidence: v.blood_loss_confidence,
                                blood_loss_ai_method: v.blood_loss_ai_method,
                                is_synced: true,
                                recorded_at: v.recorded_at,
                            });
                            pulled++;
                        } catch (e) {
                            console.warn('[Pull] Failed to save vital:', e);
                            errors++;
                        }
                    }
                }

                // Pull emotive checklists
                const { data: remoteChecklists } = await supabase
                    .from('emotive_checklists')
                    .select('*')
                    .in('maternal_profile_id', profileIds);

                if (remoteChecklists) {
                    for (const c of remoteChecklists) {
                        try {
                            const profile = remoteProfiles.find((p: any) => p.id === c.maternal_profile_id);
                            const profileLocalId = profile?.local_id || c.maternal_profile_id;
                            await saveEmotiveChecklist({
                                local_id: c.local_id || c.id,
                                remote_id: c.id,
                                maternal_profile_local_id: profileLocalId,
                                performed_by: c.performed_by,
                                early_detection_done: !!c.early_detection_done,
                                early_detection_time: c.early_detection_time,
                                early_detection_notes: c.early_detection_notes,
                                massage_done: !!c.massage_done,
                                massage_time: c.massage_time,
                                massage_notes: c.massage_notes,
                                oxytocin_done: !!c.oxytocin_done,
                                oxytocin_time: c.oxytocin_time,
                                oxytocin_dose: c.oxytocin_dose,
                                oxytocin_notes: c.oxytocin_notes,
                                txa_done: !!c.txa_done,
                                txa_time: c.txa_time,
                                txa_dose: c.txa_dose,
                                txa_notes: c.txa_notes,
                                iv_fluids_done: !!c.iv_fluids_done,
                                iv_fluids_time: c.iv_fluids_time,
                                iv_fluids_volume: c.iv_fluids_volume,
                                iv_fluids_notes: c.iv_fluids_notes,
                                escalation_done: !!c.escalation_done,
                                escalation_time: c.escalation_time,
                                escalation_notes: c.escalation_notes,
                                diagnostics_causes: c.diagnostics_causes,
                                diagnostics_notes: c.diagnostics_notes,
                                is_synced: true,
                                created_at: c.created_at,
                                updated_at: c.updated_at,
                            });
                            pulled++;
                        } catch (e) {
                            console.warn('[Pull] Failed to save checklist:', e);
                            errors++;
                        }
                    }
                }

                // Pull case events
                const { data: remoteEvents } = await supabase
                    .from('case_events')
                    .select('*')
                    .in('maternal_profile_id', profileIds)
                    .order('occurred_at', { ascending: false });

                if (remoteEvents) {
                    for (const e of remoteEvents) {
                        try {
                            const profile = remoteProfiles.find((p: any) => p.id === e.maternal_profile_id);
                            const profileLocalId = profile?.local_id || e.maternal_profile_id;
                            await saveCaseEvent({
                                local_id: e.local_id || e.id,
                                remote_id: e.id,
                                maternal_profile_id: profileLocalId,
                                event_type: e.event_type,
                                event_label: e.event_label,
                                event_data: e.event_data ? JSON.stringify(e.event_data) : undefined,
                                performed_by: e.performed_by,
                                occurred_at: e.occurred_at,
                                is_synced: true,
                            });
                            pulled++;
                        } catch {
                            errors++;
                        }
                    }
                }
            }
        }

        // 3. Pull emergency contacts
        if (facilityId) {
            const { data: remoteContacts } = await supabase
                .from('emergency_contacts')
                .select('*')
                .or(`facility_id.eq.${facilityId},tier.eq.3`);

            if (remoteContacts && remoteContacts.length > 0) {
                await saveEmergencyContacts(remoteContacts.map((c: any) => ({
                    ...c,
                    is_active: c.is_active !== false,
                    is_synced: true,
                    is_deleted: false,
                })));
                pulled += remoteContacts.length;
            }
        }

    } catch (error) {
        console.error('[Pull] Remote pull failed:', error);
        errors++;
    }

    console.log(`[Pull] Done: ${pulled} records pulled, ${errors} errors`);
    return { pulled, errors };
}

// ── Network Listener ─────────────────────────────────────────

let unsubscribe: (() => void) | null = null;

export function startSyncListener(): void {
    if (unsubscribe) return;

    unsubscribe = NetInfo.addEventListener(async (state) => {
        if (state.isConnected) {
            console.log('[SyncQueue] Network restored, processing queue...');
            const result = await processQueue();
            if (result.synced > 0) {
                console.log(`[SyncQueue] Synced ${result.synced} items`);
            }
            if (result.failed > 0) {
                console.warn(`[SyncQueue] Failed to sync ${result.failed} items`);
            }
        }
    });

    // Process any pending items immediately if already online
    NetInfo.fetch().then(state => {
        if (state.isConnected) {
            processQueue().catch(err =>
                console.warn('[SyncQueue] Initial queue processing failed:', err)
            );
        }
    });
}

export function stopSyncListener(): void {
    if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
    }
}

// ── UUID Generator ───────────────────────────────────────────

export function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
