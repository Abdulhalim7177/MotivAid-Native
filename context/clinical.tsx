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
    deleteEmergencyContact,
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
    updateDeliveryTime,
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
    updateDeliveryTime: (localId: string, deliveryTime: string) => Promise<void>;
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
    saveDiagnostics: (profileLocalId: string, causes: string[], notes?: string) => Promise<void>;
    refreshEmotiveChecklist: (profileLocalId: string) => Promise<void>;

    // Timeline & Escalation
    caseEvents: LocalCaseEvent[];
    refreshCaseEvents: (profileLocalId: string) => Promise<void>;
    addCaseEvent: (event: Omit<LocalCaseEvent, 'local_id' | 'is_synced' | 'occurred_at'>) => Promise<void>;
    emergencyContacts: LocalEmergencyContact[];
    refreshEmergencyContacts: () => Promise<void>;
    deleteContact: (id: string) => Promise<void>;
    saveContact: (contact: Partial<LocalEmergencyContact>) => Promise<void>;
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
    deliveryTime?: string;
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
            const isSupervisor = authProfile?.role === 'supervisor' || authProfile?.role === 'admin';
            const isStaffRole = ['midwife', 'nurse', 'student'].includes(authProfile?.role || '');
            const isNormalUser = !authProfile?.role || authProfile.role === 'user';

            // First try local data
            const localProfiles = await getMaternalProfiles(isSupervisor ? undefined : activeUnit?.id);

            // Try to fetch from Supabase if online
            const netState = await NetInfo.fetch();
            if (netState.isConnected) {
                try {
                    let query = supabase
                        .from('maternal_profiles')
                        .select('*');

                    if (isSupervisor && authProfile?.facility_id) {
                        // Supervisors see all profiles in their facility
                        query = query.eq('facility_id', authProfile.facility_id);
                    } else if (activeUnit) {
                        // Staff with unit assignment see profiles in their unit + their own created profiles
                        query = query.or(`unit_id.eq.${activeUnit.id},created_by.eq.${user?.id || ''}`);
                    } else if ((isStaffRole || isNormalUser) && authProfile?.facility_id) {
                        // Staff without unit assignment or normal users see only their own created profiles
                        query = query.eq('created_by', user?.id || '');
                    } else {
                        // If no conditions match, just return local
                        const enriched = localProfiles.map(p => ({
                            ...p,
                            riskResult: calculateRiskFromProfile(p),
                        }));
                        setProfiles(enriched);
                        return;
                    }

                    const { data, error } = await query.order('updated_at', { ascending: false });

                    if (!error && data) {
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
    }, [activeUnit, authProfile?.role, authProfile?.facility_id, user?.id]);

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

        // Debug: Log user info during profile creation
        console.log('DEBUG - Creating Profile:', {
            userId: user?.id,
            userType: typeof user?.id,
            authProfileId: authProfile?.id,
            localId: localId
        });

        const profile: LocalMaternalProfile = {
            local_id: localId,
            facility_id: activeUnit?.facility_id || authProfile?.facility_id || null, // Allow null for normal users
            unit_id: activeUnit?.id || null, // Allow null unit_id for unassigned staff and normal users
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
            delivery_time: input.deliveryTime,
            status: 'pre_delivery',
            notes: input.notes,
            is_synced: false,
            created_at: now,
            updated_at: now,
        };

        await saveMaternalProfile(profile);
        await queueOperation('maternal_profiles', localId, 'insert', profile);

        // Debug: Log what was actually saved
        console.log('DEBUG - Profile saved:', {
            localId: profile.local_id,
            createdBy: profile.created_by,
            facilityId: profile.facility_id,
            unitId: profile.unit_id
        });

        await refreshProfiles();

        return localId;
    }, [activeUnit, authProfile?.facility_id, user, refreshProfiles]);

    const updateProfileStatus = useCallback(async (
        localId: string,
        status: string,
        outcome?: string
    ) => {
        const oldProfile = profiles.find(p => p.local_id === localId);

        // If case is already closed, don't allow changing status back (unless it's an admin/fix?)
        // The user wants cases strictly closed.
        if (oldProfile?.status === 'closed' && status !== 'closed') {
            console.warn('[Clinical] Cannot reopen a closed case');
            return;
        }

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

    const updateDeliveryTimeCallback = useCallback(async (localId: string, deliveryTime: string) => {
        await updateDeliveryTime(localId, deliveryTime);
        const updated = await getMaternalProfile(localId);
        if (updated) {
            await queueOperation('maternal_profiles', localId, 'update', updated);
        }
        await refreshProfiles();
    }, [refreshProfiles]);

    // ── Timeline & Escalation Operations ────────────────────

    const refreshCaseEvents = useCallback(async (profileLocalId: string) => {
        try {
            // First try local
            const local = await getCaseEvents(profileLocalId);
            setCaseEvents(local);

            // Try remote if online
            const netState = await NetInfo.fetch();
            if (netState.isConnected) {
                // Find remote profile ID
                const { data: profileData } = await supabase
                    .from('maternal_profiles')
                    .select('id')
                    .or(`local_id.eq.${profileLocalId},id.eq.${profileLocalId}`)
                    .maybeSingle();

                if (profileData?.id) {
                    const { data, error } = await supabase
                        .from('case_events')
                        .select('*')
                        .eq('maternal_profile_id', profileData.id)
                        .order('occurred_at', { ascending: false });

                    if (!error && data) {
                        const merged = mergeRemoteItems(local, data, 'occurred_at');
                        setCaseEvents(merged);
                    }
                }
            }
        } catch (error) {
            console.error('Error refreshing case events:', error);
        }
    }, []);

    const addCaseEvent = useCallback(async (
        eventInput: Omit<LocalCaseEvent, 'local_id' | 'is_synced' | 'occurred_at'>
    ) => {
        // Find the profile to check creator and status
        const profile = profiles.find(p => p.local_id === eventInput.maternal_profile_id);

        // MANDATE: Stop recording case timeline after the case has been closed.
        if (profile?.status === 'closed') return;

        // MANDATE: Stop recording any case timeline by a user that is not the one who created the case
        // (e.g. supervisor viewing a case). 
        // Note: We allow 'status_change' even if not creator if user is supervisor/admin? 
        // User said: "stop recoring any case timeline by a user that hes not the one who creaed the case"
        if (profile && profile.created_by !== user?.id) return;

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
    }, [refreshCaseEvents, profiles, user?.id]);

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

    const deleteContact = useCallback(async (id: string) => {
        // Delete locally
        await deleteEmergencyContact(id);

        // Queue sync delete
        await queueOperation('emergency_contacts', id, 'delete', { id });

        // Refresh state
        await refreshEmergencyContacts();
    }, [refreshEmergencyContacts]);

    const saveContact = useCallback(async (contactInput: Partial<LocalEmergencyContact>) => {
        const id = contactInput.id || generateUUID();
        const now = new Date().toISOString();

        const contact: LocalEmergencyContact = {
            id,
            name: contactInput.name || '',
            role: contactInput.role || '',
            phone: contactInput.phone || '',
            tier: contactInput.tier || 1,
            facility_id: contactInput.facility_id || authProfile?.facility_id,
            unit_id: contactInput.unit_id,
            is_active: contactInput.is_active ?? true,
            created_at: contactInput.created_at || now,
            updated_at: now,
        };

        // Save locally
        await saveEmergencyContacts([contact]);

        // Queue sync
        await queueOperation(
            'emergency_contacts',
            id,
            contactInput.id ? 'update' : 'insert',
            contact
        );

        // Refresh state
        await refreshEmergencyContacts();
    }, [authProfile?.facility_id, refreshEmergencyContacts]);

    const fetchFacilityStaff = useCallback(async () => {
        if (!authProfile?.facility_id) return [];
        try {
            // Fetch all staff in the facility (include admin — they can be emergency contacts too)
            const { data: staffData, error: staffError } = await supabase
                .from('profiles')
                .select('id, full_name, role, phone, facility_id')
                .eq('facility_id', authProfile.facility_id)
                .in('role', ['midwife', 'nurse', 'student', 'supervisor', 'admin'])
                .order('full_name', { ascending: true });

            if (staffError) throw staffError;

            // Bug fix: fetch approved memberships separately so we can join them properly.
            // Using .eq('unit_memberships.status', 'approved') on an embedded select only
            // filters the embedded rows — it does NOT exclude profiles with no approved memberships.
            // A separate query lets us do a real inner-join equivalent.
            const staffIds = (staffData || []).map(s => s.id);
            let unitByStaff: Record<string, string> = {};

            if (staffIds.length > 0) {
                const { data: memberships } = await supabase
                    .from('unit_memberships')
                    .select('profile_id, unit_id')
                    .in('profile_id', staffIds)
                    .eq('status', 'approved');

                (memberships || []).forEach(m => {
                    // Keep the first approved unit per staff member
                    if (!unitByStaff[m.profile_id]) {
                        unitByStaff[m.profile_id] = m.unit_id;
                    }
                });
            }

            return (staffData || []).map(staff => ({
                ...staff,
                unit_id: unitByStaff[staff.id] || null,
            }));
        } catch (error) {
            console.error('Error fetching facility staff:', error);
            return [];
        }
    }, [authProfile?.facility_id]);

    // ── Vital Sign Operations ────────────────────────────────

    const refreshVitals = useCallback(async (profileLocalId: string) => {
        try {
            // First try local
            const local = await getVitalSigns(profileLocalId);

            let finalVitals = local;

            // Try remote if online
            const netState = await NetInfo.fetch();
            if (netState.isConnected) {
                const { data: profileData } = await supabase
                    .from('maternal_profiles')
                    .select('id')
                    .or(`local_id.eq.${profileLocalId},id.eq.${profileLocalId}`)
                    .maybeSingle();

                if (profileData?.id) {
                    const { data, error } = await supabase
                        .from('vital_signs')
                        .select('*')
                        .eq('maternal_profile_id', profileData.id)
                        .order('recorded_at', { ascending: false });

                    if (!error && data) {
                        finalVitals = mergeRemoteItems(local, data, 'recorded_at');
                    }
                }
            }

            const enriched: VitalSign[] = finalVitals.map(v => ({
                ...v,
                shockResult: v.heart_rate && v.systolic_bp
                    ? calculateShockIndex(v.heart_rate, v.systolic_bp)
                    : undefined,
            }));
            setVitalSigns(enriched);

            // Update last vitals time
            if (enriched.length > 0) {
                setLastVitalsTime(new Date(enriched[0].recorded_at));
            }
        } catch (error) {
            console.error('Error refreshing vitals:', error);
        }
    }, []);

    const recordVitals = useCallback(async (input: RecordVitalsInput) => {
        const profile = profiles.find(p => p.local_id === input.maternalProfileLocalId);
        if (profile?.status === 'closed') {
            console.warn('[Clinical] Cannot record vitals for a closed case');
            return;
        }

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

        // Auto-log event (addCaseEvent has its own closed-case guard)
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
    }, [user, refreshVitals, profiles, addCaseEvent]);

    const dismissVitalsPrompt = useCallback(() => {
        setIsVitalsPromptDue(false);
    }, []);

    // ── E-MOTIVE Checklist Operations ────────────────────────

    const refreshEmotiveChecklist = useCallback(async (profileLocalId: string) => {
        try {
            // First try local
            const local = await getEmotiveChecklist(profileLocalId);
            setEmotiveChecklist(local);

            // Try remote if online
            const netState = await NetInfo.fetch();
            if (netState.isConnected) {
                const { data: profileData } = await supabase
                    .from('maternal_profiles')
                    .select('id')
                    .or(`local_id.eq.${profileLocalId},id.eq.${profileLocalId}`)
                    .maybeSingle();

                if (profileData?.id) {
                    const { data, error } = await supabase
                        .from('emotive_checklists')
                        .select('*')
                        .eq('maternal_profile_id', profileData.id)
                        .maybeSingle();

                    if (!error && data) {
                        // For a single item, remote is authoritative if local is synced or empty
                        if (!local || local.is_synced) {
                            setEmotiveChecklist({
                                ...data,
                                local_id: local?.local_id || data.local_id || data.id,
                                is_synced: true,
                            });
                        }
                    }
                }
            }
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

    const saveDiagnostics = useCallback(async (
        profileLocalId: string,
        causes: string[],
        notes?: string
    ) => {
        if (!emotiveChecklist) {
            // If no bundle started, create one (shouldn't really happen but for safety)
            const localId = generateUUID();
            const now = new Date().toISOString();
            const newChecklist: LocalEmotiveChecklist = {
                local_id: localId,
                maternal_profile_local_id: profileLocalId,
                performed_by: user?.id,
                early_detection_done: false,
                massage_done: false,
                oxytocin_done: false,
                txa_done: false,
                iv_fluids_done: false,
                escalation_done: false,
                diagnostics_causes: causes,
                diagnostics_notes: notes,
                is_synced: false,
                created_at: now,
                updated_at: now,
            };
            await saveEmotiveChecklist(newChecklist);
            await queueOperation('emotive_checklists', localId, 'insert', newChecklist);
            setEmotiveChecklist(newChecklist);
        } else {
            const fields: Partial<LocalEmotiveChecklist> = {
                diagnostics_causes: causes,
                diagnostics_notes: notes,
            };
            await updateEmotiveStep(emotiveChecklist.local_id, fields);
            const updated = await getEmotiveChecklist(profileLocalId);
            if (updated) {
                await queueOperation('emotive_checklists', emotiveChecklist.local_id, 'update', updated);
                setEmotiveChecklist(updated);
            }
        }

        // Also log as case event
        await addCaseEvent({
            maternal_profile_id: profileLocalId,
            event_type: 'note',
            event_label: 'Diagnostics Phase Recorded',
            event_data: JSON.stringify({ causes, notes }),
            performed_by: user?.id,
        });
    }, [emotiveChecklist, user?.id, addCaseEvent]);

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

    // Load profiles and contacts when unit changes (or on initial mount for unassigned users)
    useEffect(() => {
        refreshProfiles();
        refreshEmergencyContacts();
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
                updateDeliveryTime: updateDeliveryTimeCallback,
                recordVitals,
                setActiveProfileId,
                refreshProfiles,
                fetchAllFacilityProfiles,
                refreshVitals,
                syncNow,
                emotiveChecklist,
                startEmotiveBundle,
                toggleEmotiveStep,
                saveDiagnostics,
                refreshEmotiveChecklist,
                caseEvents,
                refreshCaseEvents,
                addCaseEvent,
                emergencyContacts,
                refreshEmergencyContacts,
                deleteContact,
                saveContact,
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
                is_synced: true,
            });
        } else {
            // Update existing with latest remote data
            const idx = result.findIndex(l => l.id === r.id);
            result[idx] = { ...r, is_active: !!r.is_active, is_synced: true };
        }
    }

    return result.sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name));
}

function mergeRemoteItems<T extends { local_id: string; remote_id?: string; is_synced: boolean;[key: string]: any }>(
    local: T[],
    remote: any[],
    sortField: string
): T[] {
    const localByRemoteId = new Map(local.filter(l => l.remote_id).map(l => [l.remote_id, l]));
    const localByLocalId = new Map(local.map(l => [l.local_id, l]));
    const result: T[] = [];
    const handledLocalIds = new Set<string>();

    for (const r of remote) {
        const existing = localByRemoteId.get(r.id) ?? (r.local_id ? localByLocalId.get(r.local_id) : undefined);

        if (!existing) {
            result.push({
                ...r,
                local_id: r.local_id || r.id,
                remote_id: r.id,
                is_synced: true,
            } as unknown as T);
        } else if (existing.is_synced) {
            result.push({
                ...existing,
                ...r,
                local_id: existing.local_id,
                remote_id: r.id,
                is_synced: true,
            });
            handledLocalIds.add(existing.local_id);
        } else {
            result.push(existing);
            handledLocalIds.add(existing.local_id);
        }
    }

    for (const l of local) {
        if (!handledLocalIds.has(l.local_id)) {
            result.push(l);
        }
    }

    return result.sort((a, b) =>
        new Date(b[sortField]).getTime() - new Date(a[sortField]).getTime()
    );
}
