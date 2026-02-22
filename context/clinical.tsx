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
    getEmotiveChecklist,
    getMaternalProfile,
    getMaternalProfiles,
    getVitalSigns,
    initClinicalDatabase,
    LocalEmotiveChecklist,
    LocalMaternalProfile,
    LocalVitalSign,
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
    refreshVitals: (profileLocalId: string) => Promise<void>;
    syncNow: () => Promise<void>;

    // E-MOTIVE checklist
    emotiveChecklist: LocalEmotiveChecklist | null;
    toggleEmotiveStep: (step: EmotiveStep, done: boolean, details?: { dose?: string; volume?: string; notes?: string }) => Promise<void>;
    refreshEmotiveChecklist: (profileLocalId: string) => Promise<void>;

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
    const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
    const [vitalSigns, setVitalSigns] = useState<VitalSign[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    // E-MOTIVE checklist state
    const [emotiveChecklist, setEmotiveChecklist] = useState<LocalEmotiveChecklist | null>(null);

    // Auto-prompt state
    const [vitalsPromptInterval, setVitalsPromptInterval] = useState(15); // minutes
    const [isVitalsPromptDue, setIsVitalsPromptDue] = useState(false);
    const [lastVitalsTime, setLastVitalsTime] = useState<Date | null>(null);
    const promptTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Init
    useEffect(() => {
        initClinicalDatabase();
        startSyncListener();
        return () => stopSyncListener();
    }, []);

    // Load profiles when unit changes
    useEffect(() => {
        if (activeUnit) {
            refreshProfiles();
        }
    }, [activeUnit?.id]);

    // Load vitals and checklist when active profile changes
    useEffect(() => {
        if (activeProfileId) {
            refreshVitals(activeProfileId);
            refreshEmotiveChecklist(activeProfileId);
        } else {
            setVitalSigns([]);
            setEmotiveChecklist(null);
        }
    }, [activeProfileId]);

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
        await updateMaternalProfileStatus(localId, status, outcome);
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
            }
        }
    }, [activeProfileId, emotiveChecklist, user]);

    // ── Sync ─────────────────────────────────────────────────

    const syncNow = useCallback(async () => {
        setIsSyncing(true);
        try {
            await processQueue();
            await refreshProfiles();
        } finally {
            setIsSyncing(false);
        }
    }, [refreshProfiles]);

    // ── Active Profile ───────────────────────────────────────

    const activeProfile = profiles.find(p => p.local_id === activeProfileId) ?? null;
    const latestVital = vitalSigns.length > 0 ? vitalSigns[0] : null;

    return (
        <ClinicalContext.Provider
            value={{
                profiles,
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
                refreshVitals,
                syncNow,
                emotiveChecklist,
                toggleEmotiveStep,
                refreshEmotiveChecklist,
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
    const localMap = new Map(local.map(l => [l.local_id, l]));
    const result = [...local];

    for (const r of remote) {
        // Check if this remote record already exists locally
        const existsLocal = local.find(l => l.remote_id === r.id || l.local_id === r.local_id);
        if (!existsLocal) {
            // Add remote record as local
            result.push({
                ...r,
                local_id: r.local_id || r.id,
                remote_id: r.id,
                is_synced: true,
            });
        }
    }

    return result;
}
