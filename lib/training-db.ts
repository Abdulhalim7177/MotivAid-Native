/**
 * Training database operations for web (localStorage).
 *
 * Uses localStorage-backed maps with _training keys that are completely
 * isolated from clinical data. No sync queue entries are created —
 * training data stays local only.
 */
import type { LocalCaseEvent, LocalEmotiveChecklist, LocalMaternalProfile, LocalVitalSign } from './clinical-db';

// ── localStorage helpers ─────────────────────────────────────

const STORAGE_KEYS = {
    profiles: 'motivaid_training_profiles',
    vitals: 'motivaid_training_vitals',
    checklists: 'motivaid_training_checklists',
    caseEvents: 'motivaid_training_case_events',
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

let _profiles: Map<string, Omit<LocalMaternalProfile, 'is_synced'>> | null = null;
let _vitals: Map<string, Omit<LocalVitalSign, 'is_synced'>> | null = null;
let _checklists: Map<string, Omit<LocalEmotiveChecklist, 'is_synced'>> | null = null;
let _caseEvents: Map<string, Omit<LocalCaseEvent, 'is_synced'>> | null = null;

function getProfileStore() {
    if (!_profiles) _profiles = loadMap(STORAGE_KEYS.profiles);
    return _profiles;
}
function getVitalStore() {
    if (!_vitals) _vitals = loadMap(STORAGE_KEYS.vitals);
    return _vitals;
}
function getChecklistStore() {
    if (!_checklists) _checklists = loadMap(STORAGE_KEYS.checklists);
    return _checklists;
}
function getCaseEventStore() {
    if (!_caseEvents) _caseEvents = loadMap(STORAGE_KEYS.caseEvents);
    return _caseEvents;
}

// ── Maternal Profiles (Training) ──────────────────────────────

export const saveTrainingProfile = async (profile: Omit<LocalMaternalProfile, 'is_synced'>) => {
    const store = getProfileStore();
    store.set(profile.local_id, { ...profile });
    saveMap(STORAGE_KEYS.profiles, store);
};

export const getTrainingProfiles = async (): Promise<LocalMaternalProfile[]> => {
    return Array.from(getProfileStore().values())
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .map(p => ({ ...p, is_synced: false }));
};

export const getTrainingProfile = async (localId: string): Promise<LocalMaternalProfile | null> => {
    const p = getProfileStore().get(localId);
    return p ? { ...p, is_synced: false } : null;
};

export const deleteTrainingProfile = async (localId: string) => {
    // Delete related records first
    const vitals = getVitalStore();
    for (const [id, v] of vitals.entries()) {
        if (v.maternal_profile_local_id === localId) vitals.delete(id);
    }
    saveMap(STORAGE_KEYS.vitals, vitals);

    const checklists = getChecklistStore();
    for (const [id, c] of checklists.entries()) {
        if (c.maternal_profile_local_id === localId) checklists.delete(id);
    }
    saveMap(STORAGE_KEYS.checklists, checklists);

    const events = getCaseEventStore();
    for (const [id, e] of events.entries()) {
        if (e.maternal_profile_id === localId) events.delete(id);
    }
    saveMap(STORAGE_KEYS.caseEvents, events);

    getProfileStore().delete(localId);
    saveMap(STORAGE_KEYS.profiles, getProfileStore());
};

// ── Vital Signs (Training) ────────────────────────────────────

export const saveTrainingVitals = async (vitals: Omit<LocalVitalSign, 'is_synced'>) => {
    const store = getVitalStore();
    store.set(vitals.local_id, { ...vitals });
    saveMap(STORAGE_KEYS.vitals, store);
};

export const getTrainingVitals = async (profileLocalId: string): Promise<LocalVitalSign[]> => {
    return Array.from(getVitalStore().values())
        .filter(v => v.maternal_profile_local_id === profileLocalId)
        .sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())
        .map(v => ({ ...v, is_synced: false }));
};

// ── Emotive Checklists (Training) ─────────────────────────────

export const saveTrainingChecklist = async (checklist: Omit<LocalEmotiveChecklist, 'is_synced'>) => {
    const store = getChecklistStore();
    store.set(checklist.local_id, { ...checklist });
    saveMap(STORAGE_KEYS.checklists, store);
};

export const getTrainingChecklist = async (profileLocalId: string): Promise<LocalEmotiveChecklist | null> => {
    for (const c of getChecklistStore().values()) {
        if (c.maternal_profile_local_id === profileLocalId) {
            return { ...c, is_synced: false };
        }
    }
    return null;
};

// ── Case Events (Training) ────────────────────────────────────

export const saveTrainingCaseEvent = async (event: Omit<LocalCaseEvent, 'is_synced'>) => {
    const store = getCaseEventStore();
    store.set(event.local_id, { ...event });
    saveMap(STORAGE_KEYS.caseEvents, store);
};

export const getTrainingCaseEvents = async (profileLocalId: string): Promise<LocalCaseEvent[]> => {
    return Array.from(getCaseEventStore().values())
        .filter(e => e.maternal_profile_id === profileLocalId)
        .sort((a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime())
        .map(e => ({ ...e, is_synced: false }));
};

// ── Clear All Training Data ───────────────────────────────────

export const clearAllTrainingData = async () => {
    _profiles = new Map();
    _vitals = new Map();
    _checklists = new Map();
    _caseEvents = new Map();
    try {
        localStorage.removeItem(STORAGE_KEYS.profiles);
        localStorage.removeItem(STORAGE_KEYS.vitals);
        localStorage.removeItem(STORAGE_KEYS.checklists);
        localStorage.removeItem(STORAGE_KEYS.caseEvents);
    } catch {
        // silent
    }
};
