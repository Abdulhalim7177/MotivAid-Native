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

export async function processQueue(): Promise<{
    synced: number;
    failed: number;
}> {
    const pendingItems = await getPendingSyncItems();
    let synced = 0;
    let failed = 0;

    for (const item of pendingItems) {
        try {
            await updateSyncItemStatus(item.id, 'syncing');

            const payload = JSON.parse(item.payload);
            let remoteId: string | null = null;

            switch (item.operation) {
                case 'insert':
                    remoteId = await syncInsert(item.table_name, item.record_id, payload);
                    break;
                case 'update':
                    await syncUpdate(item.table_name, payload);
                    break;
                case 'delete':
                    await syncDelete(item.table_name, payload.id);
                    break;
            }

            await updateSyncItemStatus(item.id, 'synced');

            // Mark the local record as synced
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
