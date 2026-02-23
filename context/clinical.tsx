/**
 * Clinical Context Provider
 *
 * Manages the clinical workflow state:
 * - Active maternal profiles for the current unit
 * - Vital signs for active cases
 * - Auto-prompt timer for vital sign recording
 * - Sync lifecycle with offline-first approach
 */

import {
    getCaseEvents,
    getEmergencyContacts,
    getEmotiveChecklist,
    getMaternalProfile,
    getMaternalProfiles,
    getVitalSigns,
    initClinicalDatabase,
    LocalCaseEvent,
    LocalEmergencyContact,
    LocalEmotiveChecklist,
    LocalMaternalProfile,
    LocalVitalSign,
    saveCaseEvent,
    saveEmergencyContacts,
    saveEmotiveChecklist,
    saveMaternalProfile,
    saveVitalSign,
    updateEmotiveStep,
    updateMaternalProfileStatus
} from '@/lib/clinical-db';
import { calculateRisk, MaternalRiskInput, RiskResult } from '@/lib/risk-calculator';
import { calculateShockIndex, ShockResult } from '@/lib/shock-index';
import { supabase } from '@/lib/supabase';
import { generateUUID, processQueue, queueOperation, startSyncListener, stopSyncListener } from '@/lib/sync-queue';
import NetInfo from '@react-native-community/netinfo';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './auth';
import { useUnits } from './unit';

// ── Types ────────────────────────────────────────────────────

export interface MaternalProfile extends LocalMaternalProfile {
    riskResult?: RiskResult;
}

export interface VitalSign extends LocalVitalSign {
    shockResult?: ShockResult;
}

export type EmotiveStep = 'early_detection' | 'massage' | 'oxytocin' | 'txa' | 'iv_fluids' | 'escalation';

type ClinicalContextType = {
    // Data
    profiles: MaternalProfile[];
    allProfiles: MaternalProfile[]; // For monitoring (facility-wide)
    activeProfile: MaternalProfile | null;
    vitalSigns: VitalSign[];
    latestVital: VitalSign | null;

    // Loading states
    isLoading: boolean;
    isSyncing: boolean;

    // Actions
    createProfile: (input: CreateProfileInput) => Promise<string>;
    updateProfileStatus: (localId: string, status: string, outcome?: string) => Promise<void>;
    recordVitals: (input: RecordVitalsInput) => Promise<void>;
    setActiveProfileId: (localId: string | null) => void;
    refreshProfiles: () => Promise<void>;
    fetchAllFacilityProfiles: () => Promise<void>;
    refreshVitals: (profileLocalId: string) => Promise<void>;
    syncNow: () => Promise<void>;

    // E-MOTIVE checklist
    emotiveChecklist: LocalEmotiveChecklist | null;
    startEmotiveBundle: (profileLocalId: string) => Promise<void>;
    toggleEmotiveStep: (step: EmotiveStep, done: boolean, details?: { dose?: string; volume?: string; notes?: string }) => Promise<void>;
    refreshEmotiveChecklist: (profileLocalId: string) => Promise<void>;

    // Timeline & Escalation
    caseEvents: LocalCaseEvent[];
    refreshCaseEvents: (profileLocalId: string) => Promise<void>;
    addCaseEvent: (event: Omit<LocalCaseEvent, 'local_id' | 'is_synced' | 'occurred_at'>) => Promise<void>;
    emergencyContacts: LocalEmergencyContact[];
    refreshEmergencyContacts: () => Promise<void>;
    fetchFacilityStaff: () => Promise<any[]>;

    // Auto-prompt
    vitalsPromptInterval: number; // minutes
    setVitalsPromptInterval: (mins: number) => void;
    isVitalsPromptDue: boolean;
    dismissVitalsPrompt: () => void;
    lastVitalsTime: Date | null;
};

export interface CreateProfileInput {
    patientId?: string;
    age: number;
    gravida: number;
    parity: number;
    gestationalAgeWeeks?: number;
    riskInput: MaternalRiskInput;
    hemoglobinLevel?: number;
    notes?: string;
}

export interface RecordVitalsInput {
    maternalProfileLocalId: string;
    heartRate?: number;
    systolicBp?: number;
    diastolicBp?: number;
    temperature?: number;
    respiratoryRate?: number;
    spo2?: number;
    estimatedBloodLoss: number;
    bloodLossMethod?: 'visual' | 'drape' | 'weighed';
}

const ClinicalContext = createContext<ClinicalContextType | undefined>(undefined);

// ── Provider ─────────────────────────────────────────────────

export const ClinicalProvider = ({ children }: { children: React.ReactNode }) => {
    const { user, profile: authProfile } = useAuth();
    const { activeUnit } = useUnits();

    // State
    const [profiles, setProfiles] = useState<MaternalProfile[]>([]);
    const [allProfiles, setAllProfiles] = useState<MaternalProfile[]>([]);
    const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
    const [vitalSigns, setVitalSigns] = useState<VitalSign[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    // E-MOTIVE checklist state
    const [emotiveChecklist, setEmotiveChecklist] = useState<LocalEmotiveChecklist | null>(null);

    // Timeline & Escalation state
    const [caseEvents, setCaseEvents] = useState<LocalCaseEvent[]>([]);
    const [emergencyContacts, setEmergencyContacts] = useState<LocalEmergencyContact[]>([]);

    // Auto-prompt state
    const [vitalsPromptInterval, setVitalsPromptInterval] = useState(15); // minutes
    const [isVitalsPromptDue, setIsVitalsPromptDue] = useState(false);
    const [lastVitalsTime, setLastVitalsTime] = useState<Date | null>(null);
    const promptTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // ── Profile Operations ───────────────────────────────────

    const refreshProfiles = useCallback(async () => {
        setIsLoading(true);
        try {
            // First try local data
            const localProfiles = await getMaternalProfiles(activeUnit?.id);

            // Try to fetch from Supabase if online
            const netState = await NetInfo.fetch();
            if (netState.isConnected && activeUnit) {
                try {
                    const { data, error } = await supabase
                        .from('maternal_profiles')
                        .select('*')
                        .eq('unit_id', activeUnit.id)
                        .order('updated_at', { ascending: false });

                    if (!error && data && data.length > 0) {
                        // Merge remote data with local data
                        const merged = mergeRemoteIntoLocal(localProfiles, data);
                        const enriched = merged.map(p => ({
                            ...p,
                            riskResult: calculateRiskFromProfile(p),
                        }));
                        setProfiles(enriched);
                        return;
                    }
                } catch {
                    // Fall back to local
                }
            }

            const enriched = localProfiles.map(p => ({
                ...p,
                riskResult: calculateRiskFromProfile(p),
            }));
            setProfiles(enriched);
        } catch (error) {
            console.error('Error refreshing profiles:', error);
        } finally {
            setIsLoading(false);
        }
    }, [activeUnit?.id]);

    const fetchAllFacilityProfiles = useCallback(async () => {
        if (!authProfile?.facility_id) return;
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('maternal_profiles')
                .select('*')
                .eq('facility_id', authProfile.facility_id)
                .order('updated_at', { ascending: false });

            if (!error && data) {
                const localProfiles = await getMaternalProfiles();
                const merged = mergeRemoteIntoLocal(localProfiles, data);
                const enriched = merged.map(p => ({
                    ...p,
                    riskResult: calculateRiskFromProfile(p),
                }));
                setAllProfiles(enriched);
            }
        } catch (error) {
            console.error('Error fetching all facility profiles:', error);
        } finally {
            setIsLoading(false);
        }
    }, [authProfile?.facility_id]);

    const createProfile = useCallback(async (input: CreateProfileInput): Promise<string> => {
        const localId = generateUUID();
        const riskResult = calculateRisk(input.riskInput);
        const now = new Date().toISOString();

        const profile: LocalMaternalProfile = {
            local_id: localId,
            facility_id: activeUnit?.facility_id,
            unit_id: activeUnit?.id,
            created_by: user?.id,
            patient_id: input.patientId,
            age: input.age,
            gravida: input.gravida,
            parity: input.parity,
            gestational_age_weeks: input.gestationalAgeWeeks,
            is_multiple_gestation: input.riskInput.isMultipleGestation,
            has_prior_cesarean: input.riskInput.hasPriorCesarean,
            has_placenta_previa: input.riskInput.hasPlacentaPrevia,
            has_large_fibroids: input.riskInput.hasLargeFibroids,
            has_anemia: input.riskInput.hasAnemia,
            has_pph_history: input.riskInput.hasPphHistory,
            has_intraamniotic_infection: input.riskInput.hasIntraamnioticInfection,
            has_severe_anemia: input.riskInput.hasSevereAnemia,
            has_coagulopathy: input.riskInput.hasCoagulopathy,
            has_severe_pph_history: input.riskInput.hasSeverePphHistory,
            has_placenta_accreta: input.riskInput.hasPlacentaAccreta,
            has_active_bleeding: input.riskInput.hasActiveBleeding,
            has_morbid_obesity: input.riskInput.hasMorbidObesity,
            hemoglobin_level: input.hemoglobinLevel,
            risk_level: riskResult.level,
            risk_score: riskResult.score,
            status: 'pre_delivery',
            notes: input.notes,
            is_synced: false,
            created_at: now,
            updated_at: now,
        };

        await saveMaternalProfile(profile);
        await queueOperation('maternal_profiles', localId, 'insert', profile);
        await refreshProfiles();

        return localId;
    }, [activeUnit, user]);

    const updateProfileStatus = useCallback(async (
        localId: string,
        status: string,
        outcome?: string
    ) => {
        const oldProfile = profiles.find(p => p.local_id === localId);
        const oldStatus = oldProfile?.status;

        await updateMaternalProfileStatus(localId, status, outcome);

        // Auto-log status change event
        if (oldStatus !== status) {
            await addCaseEvent({
                maternal_profile_id: localId,
                event_type: 'status_change',
                event_label: `Status changed to ${status.split('_').join(' ')}`,
                event_data: JSON.stringify({ old_status: oldStatus, new_status: status, outcome }),
                performed_by: user?.id,
            });
        }

        try {
            const updated = await getMaternalProfile(localId);
            if (updated) {
                await queueOperation('maternal_profiles', localId, 'update', updated);
            }
        } catch (e) {
            // Sync may fail if profile not yet synced — that's OK,
            // it will sync when the insert completes first.
            console.warn('[Clinical] Status sync queued but may retry:', e);
        }
        await refreshProfiles();
    }, [refreshProfiles]);

    // ── Timeline & Escalation Operations ────────────────────

    const refreshCaseEvents = useCallback(async (profileLocalId: string) => {
        try {
            const events = await getCaseEvents(profileLocalId);
            setCaseEvents(events);
        } catch (error) {
            console.error('Error refreshing case events:', error);
        }
    }, []);

    const addCaseEvent = useCallback(async (
        eventInput: Omit<LocalCaseEvent, 'local_id' | 'is_synced' | 'occurred_at'>
    ) => {
        const localId = generateUUID();
        const now = new Date().toISOString();

        const event: LocalCaseEvent = {
            ...eventInput,
            local_id: localId,
            occurred_at: now,
            is_synced: false,
        };

        await saveCaseEvent(event);
        await queueOperation('case_events', localId, 'insert', event);
        await refreshCaseEvents(eventInput.maternal_profile_id);
    }, [refreshCaseEvents]);

    const refreshEmergencyContacts = useCallback(async () => {
        try {
            // First try local
            const local = await getEmergencyContacts(authProfile?.facility_id);
            setEmergencyContacts(local);

            // Try remote if online
            const netState = await NetInfo.fetch();
            if (netState.isConnected && authProfile?.facility_id) {
                // Fetch facility-specific AND tier 3 global contacts
                const { data, error } = await supabase
                    .from('emergency_contacts')
                    .select('*')
                    .or(`facility_id.eq.${authProfile.facility_id},tier.eq.3`)
                    .eq('is_active', true);

                if (!error && data) {
                    await saveEmergencyContacts(data);
                    
                    // Merge remote into local for state
                    const merged = mergeRemoteContacts(local, data);
                    setEmergencyContacts(merged);
                }
            }
        } catch (error) {
            console.error('Error refreshing emergency contacts:', error);
        }
    }, [authProfile?.facility_id]);

    const fetchFacilityStaff = useCallback(async () => {
        if (!authProfile?.facility_id) return [];
        try {
            // Fetch staff with their approved unit memberships
            const { data, error } = await supabase
                .from('profiles')
                .select(`
                    id, 
                    full_name, 
                    role, 
                    phone,
                    facility_id,
                    unit_memberships(unit_id)
                `)
                .eq('facility_id', authProfile.facility_id)
                .eq('unit_memberships.status', 'approved')
                .in('role', ['midwife', 'nurse', 'student', 'supervisor'])
                .order('full_name', { ascending: true });

            if (error) throw error;
            
            // Map to simplify structure
            return (data || []).map(staff => ({
                ...staff,
                unit_id: staff.unit_memberships?.[0]?.unit_id || null
            }));
        } catch (error) {
            console.error('Error fetching facility staff:', error);
            return [];
        }
    }, [authProfile?.facility_id]);

    // ── Vital Sign Operations ────────────────────────────────

    const refreshVitals = useCallback(async (profileLocalId: string) => {
        try {
            const vitals = await getVitalSigns(profileLocalId);
            const enriched: VitalSign[] = vitals.map(v => ({
                ...v,
                shockResult: v.heart_rate && v.systolic_bp
                    ? calculateShockIndex(v.heart_rate, v.systolic_bp)
                    : undefined,
            }));
            setVitalSigns(enriched);

            // Update last vitals time
            if (vitals.length > 0) {
                setLastVitalsTime(new Date(vitals[0].recorded_at));
            }
        } catch (error) {
            console.error('Error refreshing vitals:', error);
        }
    }, []);

    const recordVitals = useCallback(async (input: RecordVitalsInput) => {
        const localId = generateUUID();
        const now = new Date().toISOString();

        const shockIndex = input.heartRate && input.systolicBp && input.systolicBp > 0
            ? Math.round((input.heartRate / input.systolicBp) * 10) / 10
            : undefined;

        const vital: LocalVitalSign = {
            local_id: localId,
            maternal_profile_local_id: input.maternalProfileLocalId,
            recorded_by: user?.id,
            heart_rate: input.heartRate,
            systolic_bp: input.systolicBp,
            diastolic_bp: input.diastolicBp,
            temperature: input.temperature,
            respiratory_rate: input.respiratoryRate,
            spo2: input.spo2,
            shock_index: shockIndex,
            estimated_blood_loss: input.estimatedBloodLoss,
            blood_loss_method: input.bloodLossMethod,
            is_synced: false,
            recorded_at: now,
        };

        await saveVitalSign(vital);
        await queueOperation('vital_signs', localId, 'insert', vital);

        // Auto-log event
        await addCaseEvent({
            maternal_profile_id: input.maternalProfileLocalId,
            event_type: 'vitals',
            event_label: `Vitals recorded (HR: ${input.heartRate || '—'}, BP: ${input.systolicBp || '—'}/${input.diastolicBp || '—'})`,
            event_data: JSON.stringify({
                hr: input.heartRate,
                bp: `${input.systolicBp}/${input.diastolicBp}`,
                si: shockIndex,
                ebl: input.estimatedBloodLoss
            }),
            performed_by: user?.id,
        });

        setLastVitalsTime(new Date(now));
        setIsVitalsPromptDue(false);

        await refreshVitals(input.maternalProfileLocalId);
    }, [user, refreshVitals]);

    const dismissVitalsPrompt = useCallback(() => {
        setIsVitalsPromptDue(false);
    }, []);

    // ── E-MOTIVE Checklist Operations ────────────────────────

    const refreshEmotiveChecklist = useCallback(async (profileLocalId: string) => {
        try {
            const checklist = await getEmotiveChecklist(profileLocalId);
            setEmotiveChecklist(checklist);
        } catch (error) {
            console.error('Error refreshing emotive checklist:', error);
        }
    }, []);

    const startEmotiveBundle = useCallback(async (profileLocalId: string) => {
        const now = new Date().toISOString();
        const localId = generateUUID();
        const newChecklist: LocalEmotiveChecklist = {
            local_id: localId,
            maternal_profile_local_id: profileLocalId,
            performed_by: user?.id,
            early_detection_done: true, // Auto-mark first step as it's the trigger
            early_detection_time: now,
            massage_done: false,
            oxytocin_done: false,
            txa_done: false,
            iv_fluids_done: false,
            escalation_done: false,
            is_synced: false,
            created_at: now,
            updated_at: now,
        };

        await saveEmotiveChecklist(newChecklist);
        await queueOperation('emotive_checklists', localId, 'insert', newChecklist);
        setEmotiveChecklist(newChecklist);

        // Auto-log event
        await addCaseEvent({
            maternal_profile_id: profileLocalId,
            event_type: 'emotive_step',
            event_label: 'E-MOTIVE Bundle Started',
            event_data: JSON.stringify({ reason: 'Vitals trigger' }),
            performed_by: user?.id,
        });

        // Also update profile status to active if it was pre_delivery
        const profile = profiles.find(p => p.local_id === profileLocalId);
        if (profile?.status === 'pre_delivery') {
            await updateProfileStatus(profileLocalId, 'active');
        }
    }, [user, profiles, addCaseEvent, updateProfileStatus]);

    const toggleEmotiveStep = useCallback(async (
        step: EmotiveStep,
        done: boolean,
        details?: { dose?: string; volume?: string; notes?: string }
    ) => {
        if (!activeProfileId) return;

        const now = new Date().toISOString();

        if (!emotiveChecklist) {
            // Create a new checklist
            const localId = generateUUID();
            const newChecklist: LocalEmotiveChecklist = {
                local_id: localId,
                maternal_profile_local_id: activeProfileId,
                performed_by: user?.id,
                early_detection_done: false,
                massage_done: false,
                oxytocin_done: false,
                txa_done: false,
                iv_fluids_done: false,
                escalation_done: false,
                is_synced: false,
                created_at: now,
                updated_at: now,
            };

            // Set the toggled step
            (newChecklist as any)[`${step}_done`] = done;
            if (done) (newChecklist as any)[`${step}_time`] = now;

            // Set detail fields
            if (details?.dose) (newChecklist as any)[`${step}_dose`] = details.dose;
            if (details?.volume) (newChecklist as any)[`${step}_volume`] = details.volume;
            if (details?.notes) (newChecklist as any)[`${step}_notes`] = details.notes;

            await saveEmotiveChecklist(newChecklist);
            await queueOperation('emotive_checklists', localId, 'insert', newChecklist);
            setEmotiveChecklist(newChecklist);

            // Auto-log event if done
            if (done) {
                await addCaseEvent({
                    maternal_profile_id: activeProfileId,
                    event_type: 'emotive_step',
                    event_label: `E-MOTIVE: ${step.split('_').join(' ')} completed`,
                    event_data: JSON.stringify(details || {}),
                    performed_by: user?.id,
                });
            }
        } else {
            // Update existing checklist
            const fields: Partial<LocalEmotiveChecklist> = {
                [`${step}_done`]: done,
                [`${step}_time`]: done ? now : undefined,
            } as any;

            if (details?.dose) (fields as any)[`${step}_dose`] = details.dose;
            if (details?.volume) (fields as any)[`${step}_volume`] = details.volume;
            if (details?.notes !== undefined) (fields as any)[`${step}_notes`] = details.notes;

            await updateEmotiveStep(emotiveChecklist.local_id, fields);

            // Queue sync
            const updated = await getEmotiveChecklist(activeProfileId);
            if (updated) {
                await queueOperation('emotive_checklists', emotiveChecklist.local_id, 'update', updated);
                setEmotiveChecklist(updated);

                // Auto-log event if newly done
                const wasDone = (emotiveChecklist as any)[`${step}_done`];
                if (done && !wasDone) {
                    await addCaseEvent({
                        maternal_profile_id: activeProfileId,
                        event_type: 'emotive_step',
                        event_label: `E-MOTIVE: ${step.split('_').join(' ')} completed`,
                        event_data: JSON.stringify(details || {}),
                        performed_by: user?.id,
                    });
                }
            }
        }
    }, [activeProfileId, emotiveChecklist, user, addCaseEvent]);

    // ── Sync ─────────────────────────────────────────────────

    const syncNow = useCallback(async () => {
        setIsSyncing(true);
        try {
            await processQueue();
            await refreshProfiles();
            await refreshEmergencyContacts();
            if (activeProfileId) {
                await refreshCaseEvents(activeProfileId);
            }
        } finally {
            setIsSyncing(false);
        }
    }, [refreshProfiles, activeProfileId, refreshCaseEvents, refreshEmergencyContacts]);

    // ── Effects ──────────────────────────────────────────────

    // Init
    useEffect(() => {
        initClinicalDatabase();
        startSyncListener();
        return () => stopSyncListener();
    }, []);

    // Load profiles and contacts when unit changes
    useEffect(() => {
        if (activeUnit) {
            refreshProfiles();
            refreshEmergencyContacts();
        }
    }, [activeUnit?.id, refreshEmergencyContacts, refreshProfiles]);

    // Load vitals, checklist, and events when active profile changes
    useEffect(() => {
        if (activeProfileId) {
            refreshVitals(activeProfileId);
            refreshEmotiveChecklist(activeProfileId);
            refreshCaseEvents(activeProfileId);
        } else {
            setVitalSigns([]);
            setEmotiveChecklist(null);
            setCaseEvents([]);
        }
    }, [activeProfileId, refreshCaseEvents, refreshEmotiveChecklist, refreshVitals]);

    // Auto-prompt timer
    useEffect(() => {
        if (!activeProfileId || vitalsPromptInterval <= 0) return;

        if (promptTimerRef.current) clearInterval(promptTimerRef.current);

        promptTimerRef.current = setInterval(() => {
            if (lastVitalsTime) {
                const elapsed = (Date.now() - lastVitalsTime.getTime()) / 1000 / 60;
                if (elapsed >= vitalsPromptInterval) {
                    setIsVitalsPromptDue(true);
                }
            } else {
                setIsVitalsPromptDue(true);
            }
        }, 30000); // Check every 30 seconds

        return () => {
            if (promptTimerRef.current) clearInterval(promptTimerRef.current);
        };
    }, [activeProfileId, vitalsPromptInterval, lastVitalsTime]);

    // ── Active Profile ───────────────────────────────────────

    const activeProfile = profiles.find(p => p.local_id === activeProfileId) ?? null;
    const latestVital = vitalSigns.length > 0 ? vitalSigns[0] : null;

    return (
        <ClinicalContext.Provider
            value={{
                profiles,
                allProfiles,
                activeProfile,
                vitalSigns,
                latestVital,
                isLoading,
                isSyncing,
                createProfile,
                updateProfileStatus,
                recordVitals,
                setActiveProfileId,
                refreshProfiles,
                fetchAllFacilityProfiles,
                refreshVitals,
                syncNow,
                emotiveChecklist,
                startEmotiveBundle,
                toggleEmotiveStep,
                refreshEmotiveChecklist,
                caseEvents,
                refreshCaseEvents,
                addCaseEvent,
                emergencyContacts,
                refreshEmergencyContacts,
                fetchFacilityStaff,
                vitalsPromptInterval,
                setVitalsPromptInterval,
                isVitalsPromptDue,
                dismissVitalsPrompt,
                lastVitalsTime,
            }}
        >
            {children}
        </ClinicalContext.Provider>
    );
};

export const useClinical = () => {
    const context = useContext(ClinicalContext);
    if (!context) throw new Error('useClinical must be used within a ClinicalProvider');
    return context;
};

// ── Helpers ──────────────────────────────────────────────────

function calculateRiskFromProfile(p: LocalMaternalProfile): RiskResult {
    return calculateRisk({
        age: p.age,
        parity: p.parity,
        gestationalAgeWeeks: p.gestational_age_weeks ?? undefined,
        isMultipleGestation: p.is_multiple_gestation,
        hasPriorCesarean: p.has_prior_cesarean,
        hasPlacentaPrevia: p.has_placenta_previa,
        hasLargeFibroids: p.has_large_fibroids,
        hasAnemia: p.has_anemia,
        hasPphHistory: p.has_pph_history,
        hasIntraamnioticInfection: p.has_intraamniotic_infection,
        hasSevereAnemia: p.has_severe_anemia,
        hasCoagulopathy: p.has_coagulopathy,
        hasSeverePphHistory: p.has_severe_pph_history,
        hasPlacentaAccreta: p.has_placenta_accreta,
        hasActiveBleeding: p.has_active_bleeding,
        hasMorbidObesity: p.has_morbid_obesity,
        hemoglobinLevel: p.hemoglobin_level ?? undefined,
    });
}

function mergeRemoteIntoLocal(
    local: LocalMaternalProfile[],
    remote: any[]
): LocalMaternalProfile[] {
    // Index local records by their remote_id (or local_id as fallback) for O(1) lookup
    const localByRemoteId = new Map(local.filter(l => l.remote_id).map(l => [l.remote_id, l]));
    const localByLocalId = new Map(local.map(l => [l.local_id, l]));
    const result: LocalMaternalProfile[] = [];
    const handledLocalIds = new Set<string>();

    for (const r of remote) {
        // Match by remote_id first, then by local_id if the remote record carries one
        const existing = localByRemoteId.get(r.id) ?? (r.local_id ? localByLocalId.get(r.local_id) : undefined);

        if (!existing) {
            // New remote record not present locally — add it
            result.push({
                ...r,
                local_id: r.local_id || r.id,
                remote_id: r.id,
                is_synced: true,
            });
        } else if (existing.is_synced) {
            // Synced local record — remote is authoritative, update with latest remote data
            result.push({
                ...existing,
                ...r,
                local_id: existing.local_id,
                remote_id: r.id,
                is_synced: true,
            });
            handledLocalIds.add(existing.local_id);
        } else {
            // Unsynced local record — has pending changes not yet pushed; preserve as-is
            result.push(existing);
            handledLocalIds.add(existing.local_id);
        }
    }

    // Append local-only records that have no remote counterpart (created fully offline)
    for (const l of local) {
        if (!handledLocalIds.has(l.local_id)) {
            result.push(l);
        }
    }

    return result;
}

function mergeRemoteContacts(
    local: LocalEmergencyContact[],
    remote: any[]
): LocalEmergencyContact[] {
    const localMap = new Map(local.map(l => [l.id, l]));
    const result = [...local];

    for (const r of remote) {
        if (!localMap.has(r.id)) {
            result.push({
                ...r,
                is_active: !!r.is_active,
            });
        } else {
            // Update existing with latest remote data
            const idx = result.findIndex(l => l.id === r.id);
            result[idx] = { ...r, is_active: !!r.is_active };
        }
    }

    return result.sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name));
}
