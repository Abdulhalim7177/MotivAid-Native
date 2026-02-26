/**
 * Web implementation — Clinical data layer
 *
 * Uses localStorage so that profiles/vitals persist across page
 * refreshes. Falls back to in-memory if localStorage is unavailable.
 * The sync queue writes directly to Supabase.
 */

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
    status: string;
    outcome?: string;
    notes?: string;
    is_synced: boolean;
    created_at: string;
    updated_at: string;
    [key: string]: any;
}

export interface LocalVitalSign {
    local_id: string;
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
    [key: string]: any;
}

export interface LocalEmotiveChecklist {
    local_id: string;
    remote_id?: string;
    maternal_profile_local_id: string;
    performed_by?: string;

    early_detection_done: boolean;
    early_detection_time?: string;
    early_detection_notes?: string;

    massage_done: boolean;
    massage_time?: string;
    massage_notes?: string;

    oxytocin_done: boolean;
    oxytocin_time?: string;
    oxytocin_dose?: string;
    oxytocin_notes?: string;

    txa_done: boolean;
    txa_time?: string;
    txa_dose?: string;
    txa_notes?: string;

    iv_fluids_done: boolean;
    iv_fluids_time?: string;
    iv_fluids_volume?: string;
    iv_fluids_notes?: string;

    escalation_done: boolean;
    escalation_time?: string;
    escalation_notes?: string;

    diagnostics_causes?: string[];
    diagnostics_notes?: string;

    is_synced: boolean;
    created_at: string;
    updated_at: string;
    [key: string]: any;
}

export interface SyncQueueItem {
    id: string;
    table_name: string;
    record_id: string;
    operation: string;
    payload: string;
    status: string;
    error_message?: string;
    created_at: string;
    [key: string]: any;
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
    is_synced?: boolean;
    is_deleted?: boolean;
    created_at: string;
    updated_at: string;
}

export interface LocalCaseEvent {
    local_id: string;
    remote_id?: string;
    maternal_profile_id: string;
    event_type: string;
    event_label: string;
    event_data?: string;
    performed_by?: string;
    occurred_at: string;
    is_synced: boolean;
}

// ── localStorage-backed helpers ──────────────────────────────

const STORAGE_KEYS = {
    profiles: 'motivaid_profiles',
    vitals: 'motivaid_vitals',
    emotiveChecklists: 'motivaid_emotive_checklists',
    syncQueue: 'motivaid_sync_queue',
    emergencyContacts: 'motivaid_emergency_contacts',
    caseEvents: 'motivaid_case_events',
} as const;

function loadMap<T>(key: string): Map<string, T> {
    try {
        const raw = localStorage.getItem(key);
        if (raw) {
            const entries: [string, T][] = JSON.parse(raw);
            return new Map(entries);
        }
    } catch {
        // ignore parse errors — start fresh
    }
    return new Map();
}

function saveMap<T>(key: string, map: Map<string, T>): void {
    try {
        localStorage.setItem(key, JSON.stringify(Array.from(map.entries())));
    } catch {
        // localStorage full or unavailable — silent fallback
    }
}

// Lazy-loaded stores (hydrate once on first access)
let _profiles: Map<string, LocalMaternalProfile> | null = null;
let _vitals: Map<string, LocalVitalSign> | null = null;
let _emotiveChecklists: Map<string, LocalEmotiveChecklist> | null = null;
let _syncQueue: Map<string, SyncQueueItem> | null = null;
let _emergencyContacts: Map<string, LocalEmergencyContact> | null = null;
let _caseEvents: Map<string, LocalCaseEvent> | null = null;

function getProfileStore(): Map<string, LocalMaternalProfile> {
    if (!_profiles) _profiles = loadMap<LocalMaternalProfile>(STORAGE_KEYS.profiles);
    return _profiles;
}
function getVitalStore(): Map<string, LocalVitalSign> {
    if (!_vitals) _vitals = loadMap<LocalVitalSign>(STORAGE_KEYS.vitals);
    return _vitals;
}
function getEmotiveStore(): Map<string, LocalEmotiveChecklist> {
    if (!_emotiveChecklists) _emotiveChecklists = loadMap<LocalEmotiveChecklist>(STORAGE_KEYS.emotiveChecklists);
    return _emotiveChecklists;
}
function getSyncQueueStore(): Map<string, SyncQueueItem> {
    if (!_syncQueue) _syncQueue = loadMap<SyncQueueItem>(STORAGE_KEYS.syncQueue);
    return _syncQueue;
}
function getEmergencyContactStore(): Map<string, LocalEmergencyContact> {
    if (!_emergencyContacts) _emergencyContacts = loadMap<LocalEmergencyContact>(STORAGE_KEYS.emergencyContacts);
    return _emergencyContacts;
}
function getCaseEventStore(): Map<string, LocalCaseEvent> {
    if (!_caseEvents) _caseEvents = loadMap<LocalCaseEvent>(STORAGE_KEYS.caseEvents);
    return _caseEvents;
}

function flushProfiles() { saveMap(STORAGE_KEYS.profiles, getProfileStore()); }
function flushVitals() { saveMap(STORAGE_KEYS.vitals, getVitalStore()); }
function flushEmotive() { saveMap(STORAGE_KEYS.emotiveChecklists, getEmotiveStore()); }
function flushSyncQueue() { saveMap(STORAGE_KEYS.syncQueue, getSyncQueueStore()); }
function flushEmergencyContacts() { saveMap(STORAGE_KEYS.emergencyContacts, getEmergencyContactStore()); }
function flushCaseEvents() { saveMap(STORAGE_KEYS.caseEvents, getCaseEventStore()); }

// ── Init ─────────────────────────────────────────────────────

export const initClinicalDatabase = async () => {
    // Hydrate stores eagerly on init
    getProfileStore();
    getVitalStore();
    getEmotiveStore();
    getSyncQueueStore();
    getEmergencyContactStore();
    getCaseEventStore();
    return null;
};

// ── Maternal Profile CRUD ────────────────────────────────────

export const saveMaternalProfile = async (profile: LocalMaternalProfile) => {
    getProfileStore().set(profile.local_id, { ...profile });
    flushProfiles();
};

export const getMaternalProfiles = async (
    unitId?: string,
    status?: string
): Promise<LocalMaternalProfile[]> => {
    let results = Array.from(getProfileStore().values());

    if (unitId) {
        results = results.filter(p => p.unit_id === unitId);
    }
    if (status) {
        results = results.filter(p => p.status === status);
    }

    // Sort by updated_at descending
    results.sort((a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );

    return results;
};

export const getMaternalProfile = async (
    localId: string
): Promise<LocalMaternalProfile | null> => {
    return getProfileStore().get(localId) ?? null;
};

export const updateMaternalProfileStatus = async (
    localId: string,
    status: string,
    outcome?: string
) => {
    const store = getProfileStore();
    const profile = store.get(localId);
    if (profile) {
        profile.status = status;
        profile.updated_at = new Date().toISOString();
        if (outcome) profile.outcome = outcome;
        store.set(localId, profile);
        flushProfiles();
    }
};

export const updateDeliveryTime = async (localId: string, deliveryTime: string) => {
    const store = getProfileStore();
    const profile = store.get(localId);
    if (profile) {
        profile.delivery_time = deliveryTime;
        profile.updated_at = new Date().toISOString();
        store.set(localId, profile);
        flushProfiles();
    }
};

// ── Vital Sign CRUD ──────────────────────────────────────────

export const saveVitalSign = async (vital: LocalVitalSign) => {
    getVitalStore().set(vital.local_id, { ...vital });
    flushVitals();
};

export const getVitalSigns = async (
    maternalProfileLocalId: string
): Promise<LocalVitalSign[]> => {
    return Array.from(getVitalStore().values())
        .filter(v => v.maternal_profile_local_id === maternalProfileLocalId || v.maternal_profile_id === maternalProfileLocalId)
        .sort((a, b) =>
            new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
        );
};

export const getLatestVitalSign = async (
    maternalProfileLocalId: string
): Promise<LocalVitalSign | null> => {
    const vitals = await getVitalSigns(maternalProfileLocalId);
    return vitals.length > 0 ? vitals[0] : null;
};

// ── E-MOTIVE Checklist CRUD ──────────────────────────────────

export const saveEmotiveChecklist = async (checklist: LocalEmotiveChecklist) => {
    getEmotiveStore().set(checklist.local_id, { ...checklist });
    flushEmotive();
};

export const getEmotiveChecklist = async (
    maternalProfileLocalId: string
): Promise<LocalEmotiveChecklist | null> => {
    for (const checklist of getEmotiveStore().values()) {
        if (checklist.maternal_profile_local_id === maternalProfileLocalId || checklist.maternal_profile_id === maternalProfileLocalId) {
            return checklist;
        }
    }
    return null;
};

export const updateEmotiveStep = async (
    localId: string,
    stepFields: Partial<LocalEmotiveChecklist>
) => {
    const store = getEmotiveStore();
    const checklist = store.get(localId);
    if (checklist) {
        Object.assign(checklist, stepFields);
        checklist.updated_at = new Date().toISOString();
        checklist.is_synced = false;
        store.set(localId, checklist);
        flushEmotive();
    }
};

// ── Sync Queue ───────────────────────────────────────────────

export const addToSyncQueue = async (item: any) => {
    const queueItem: SyncQueueItem = {
        ...item,
        status: 'pending',
        created_at: new Date().toISOString(),
    };
    getSyncQueueStore().set(item.id, queueItem);
    flushSyncQueue();
};

export const getPendingSyncItems = async (): Promise<SyncQueueItem[]> => {
    return Array.from(getSyncQueueStore().values())
        .filter(item => item.status === 'pending')
        .sort((a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
};

export const updateSyncItemStatus = async (
    id: string,
    status: string,
    errorMessage?: string
) => {
    const store = getSyncQueueStore();
    const item = store.get(id);
    if (item) {
        item.status = status;
        if (errorMessage) item.error_message = errorMessage;
        store.set(id, item);
        flushSyncQueue();
    }
};

export const markRecordSynced = async (
    tableName: string,
    localId: string,
    remoteId: string
) => {
    if (tableName === 'maternal_profiles') {
        const store = getProfileStore();
        const profile = store.get(localId);
        if (profile) {
            profile.is_synced = true;
            profile.remote_id = remoteId;
            store.set(localId, profile);
            flushProfiles();
        }
    } else if (tableName === 'vital_signs') {
        const store = getVitalStore();
        const vital = store.get(localId);
        if (vital) {
            vital.is_synced = true;
            (vital as any).remote_id = remoteId;
            store.set(localId, vital);
            flushVitals();
        }
    } else if (tableName === 'emotive_checklists') {
        const store = getEmotiveStore();
        const checklist = store.get(localId);
        if (checklist) {
            checklist.is_synced = true;
            checklist.remote_id = remoteId;
            store.set(localId, checklist);
            flushEmotive();
        }
    } else if (tableName === 'case_events') {
        const store = getCaseEventStore();
        const event = store.get(localId);
        if (event) {
            event.is_synced = true;
            event.remote_id = remoteId;
            store.set(localId, event);
            flushCaseEvents();
        }
    } else if (tableName === 'emergency_contacts') {
        const store = getEmergencyContactStore();
        const contact = store.get(localId);
        if (contact) {
            if (contact.is_deleted) {
                // Now that it's synced to Supabase (deleted there), 
                // we can safely remove it from local storage too.
                store.delete(localId);
            } else {
                contact.is_synced = true;
                store.set(localId, contact);
            }
            flushEmergencyContacts();
        }
    }
};

export const clearSyncedItems = async () => {
    const store = getSyncQueueStore();
    for (const [id, item] of store.entries()) {
        if (item.status === 'synced') {
            store.delete(id);
        }
    }
    flushSyncQueue();
};

// ── Emergency Contacts CRUD ──────────────────────────────────

export const saveEmergencyContacts = async (contacts: LocalEmergencyContact[]) => {
    const store = getEmergencyContactStore();
    for (const contact of contacts) {
        // Avoid overwriting locally deleted items that haven't synced yet
        const existing = store.get(contact.id);
        if (existing && existing.is_deleted && !contact.is_deleted) {
            continue;
        }
        store.set(contact.id, { ...contact });
    }
    flushEmergencyContacts();
};

export const deleteEmergencyContact = async (id: string) => {
    const store = getEmergencyContactStore();
    const contact = store.get(id);
    if (contact) {
        contact.is_deleted = true;
        contact.is_synced = false;
        store.set(id, contact);
        flushEmergencyContacts();
    }
};

export const getEmergencyContacts = async (facilityId?: string): Promise<LocalEmergencyContact[]> => {
    let results = Array.from(getEmergencyContactStore().values())
        .filter(c => !!c.is_active && !c.is_deleted);

    if (facilityId) {
        results = results.filter(c => c.facility_id === facilityId || c.tier === 3);
    }

    results.sort((a, b) => (a.tier || 0) - (b.tier || 0) || (a.name || '').localeCompare(b.name || ''));
    return results;
};

// ── Case Events CRUD ─────────────────────────────────────────

export const saveCaseEvent = async (event: LocalCaseEvent) => {
    getCaseEventStore().set(event.local_id, { ...event });
    flushCaseEvents();
};

export const getCaseEvents = async (maternalProfileId: string): Promise<LocalCaseEvent[]> => {
    return Array.from(getCaseEventStore().values())
        .filter(e => e.maternal_profile_id === maternalProfileId)
        .sort((a, b) =>
            new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
        );
};

export const fetchFacilityStaff = async (): Promise<any[]> => {
    // Web monitoring/management usually uses direct Supabase access
    return [];
};
