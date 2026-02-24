/**
 * Case Summary — Read-only overview of a closed or active maternal case
 *
 * Shows:
 * - Patient demographics + risk assessment
 * - Delivery time (if recorded)
 * - E-MOTIVE bundle step completion with timestamps
 * - All vital signs in a compact table
 * - Case event timeline (condensed)
 * - Case outcome and total elapsed time
 */

import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { useClinical } from '@/context/clinical';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { RISK_COLORS, RISK_LABELS, RiskLevel } from '@/lib/risk-calculator';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ── E-MOTIVE step display config ─────────────────────────────

const EMOTIVE_STEPS = [
    { key: 'early_detection', letter: 'E', label: 'Early Detection', color: '#C62828' },
    { key: 'massage',         letter: 'M', label: 'Uterine Massage', color: '#E65100' },
    { key: 'oxytocin',        letter: 'O', label: 'Oxytocin',        color: '#F57F17', doseKey: 'oxytocin_dose' },
    { key: 'txa',             letter: 'T', label: 'Tranexamic Acid', color: '#1B5E20', doseKey: 'txa_dose' },
    { key: 'iv_fluids',       letter: 'I', label: 'IV Fluids',       color: '#0D47A1', volKey: 'iv_fluids_volume' },
    { key: 'escalation',      letter: 'V/E', label: 'Escalation',    color: '#4A148C' },
] as const;

// ── Component ─────────────────────────────────────────────────

export default function CaseSummaryScreen() {
    const { localId } = useLocalSearchParams<{ localId: string }>();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const {
        profiles,
        vitalSigns,
        caseEvents,
        emotiveChecklist,
        setActiveProfileId,
        refreshVitals,
        refreshCaseEvents,
        refreshEmotiveChecklist,
    } = useClinical();

    useFocusEffect(
        useCallback(() => {
            if (localId) {
                setActiveProfileId(localId);
                refreshVitals(localId);
                refreshCaseEvents(localId);
                refreshEmotiveChecklist(localId);
            }
        }, [localId])
    );

    const profile = profiles.find(p => p.local_id === localId);

    if (!profile) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={styles.centerContent}>
                    <Ionicons name="alert-circle-outline" size={48} color={colors.textSecondary} />
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Patient record not found</Text>
                    <TouchableOpacity onPress={() => router.back()} style={{ marginTop: Spacing.md }}>
                        <Text style={{ color: colors.primary, ...Typography.buttonMd }}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const riskColors = RISK_COLORS[profile.risk_level as RiskLevel] ?? RISK_COLORS.low;

    // Compute elapsed from first E-MOTIVE step to last
    const emotiveFirstTime = emotiveChecklist
        ? EMOTIVE_STEPS.reduce<string | null>((earliest, s) => {
            const t = (emotiveChecklist as any)[`${s.key}_time`] as string | undefined;
            if (!t) return earliest;
            return !earliest || t < earliest ? t : earliest;
        }, null)
        : null;
    const emotiveLastTime = emotiveChecklist
        ? EMOTIVE_STEPS.reduce<string | null>((latest, s) => {
            const t = (emotiveChecklist as any)[`${s.key}_time`] as string | undefined;
            if (!t) return latest;
            return !latest || t > latest ? t : latest;
        }, null)
        : null;
    const bundleElapsedMins = emotiveFirstTime && emotiveLastTime
        ? Math.round((new Date(emotiveLastTime).getTime() - new Date(emotiveFirstTime).getTime()) / 60000)
        : null;

    const completedSteps = emotiveChecklist
        ? EMOTIVE_STEPS.filter(s => (emotiveChecklist as any)[`${s.key}_done`]).length
        : 0;

    const peakBloodLoss = vitalSigns.length > 0
        ? Math.max(...vitalSigns.map(v => v.estimated_blood_loss ?? 0))
        : null;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Case Summary</Text>
                    <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                        {profile.patient_id || 'Patient'} · Age {profile.age}
                    </Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: riskColors.border + '20' }]}>
                    <Text style={[styles.statusPillText, { color: riskColors.text }]}>
                        {profile.status.replace('_', ' ')}
                    </Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Demographics */}
                <SectionCard title="Patient" icon="person-outline" colors={colors}>
                    <InfoGrid items={[
                        { label: 'Age', value: `${profile.age} yrs` },
                        { label: 'Gravida', value: String(profile.gravida) },
                        { label: 'Parity', value: String(profile.parity) },
                        { label: 'GA', value: profile.gestational_age_weeks ? `${profile.gestational_age_weeks} wks` : '—' },
                        { label: 'Hb', value: profile.hemoglobin_level ? `${profile.hemoglobin_level} g/dL` : '—' },
                        { label: 'Patient ID', value: profile.patient_id || '—' },
                    ]} colors={colors} />
                    {profile.delivery_time && (
                        <View style={[styles.deliveryRow, { borderTopColor: colors.border }]}>
                            <Ionicons name="time-outline" size={16} color={colors.primary} />
                            <Text style={[styles.deliveryLabel, { color: colors.textSecondary }]}>Delivery:</Text>
                            <Text style={[styles.deliveryValue, { color: colors.text }]}>
                                {new Date(profile.delivery_time).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                            </Text>
                        </View>
                    )}
                    {profile.notes && (
                        <View style={[styles.notesRow, { borderTopColor: colors.border }]}>
                            <Text style={[styles.notesText, { color: colors.textSecondary }]}>{profile.notes}</Text>
                        </View>
                    )}
                </SectionCard>

                {/* Risk Assessment */}
                <SectionCard title="Risk Assessment" icon="warning-outline" colors={colors}>
                    <View style={[styles.riskBadge, { backgroundColor: riskColors.bg, borderColor: riskColors.border }]}>
                        <Text style={[styles.riskLevel, { color: riskColors.text }]}>
                            {RISK_LABELS[profile.risk_level as RiskLevel]}
                        </Text>
                        <Text style={[styles.riskScore, { color: riskColors.text }]}>Score: {profile.risk_score}</Text>
                    </View>
                    {profile.riskResult && profile.riskResult.factors.length > 0 && (
                        <View style={styles.factorsList}>
                            {profile.riskResult.factors.map((f, i) => (
                                <View key={i} style={styles.factorItem}>
                                    <View style={[styles.factorDot, { backgroundColor: f.category === 'high' ? '#C62828' : '#F57C00' }]} />
                                    <Text style={[styles.factorText, { color: colors.text }]}>{f.label}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                </SectionCard>

                {/* E-MOTIVE Bundle */}
                <SectionCard title="E-MOTIVE Bundle" icon="list-outline" colors={colors}>
                    <View style={[styles.bundleSummary, { backgroundColor: colors.background, borderRadius: Radius.sm }]}>
                        <Text style={[styles.bundleSummaryText, { color: colors.text }]}>
                            {completedSteps}/6 steps completed
                        </Text>
                        {bundleElapsedMins !== null && (
                            <Text style={[styles.bundleElapsed, { color: bundleElapsedMins > 60 ? colors.error : colors.success }]}>
                                {bundleElapsedMins} min
                            </Text>
                        )}
                    </View>
                    {EMOTIVE_STEPS.map((step, index) => {
                        const done = emotiveChecklist ? (emotiveChecklist as any)[`${step.key}_done`] : false;
                        const time = emotiveChecklist ? (emotiveChecklist as any)[`${step.key}_time`] as string | undefined : undefined;
                        const dose = step.doseKey && emotiveChecklist ? (emotiveChecklist as any)[step.doseKey] as string | undefined : undefined;
                        const vol = step.volKey && emotiveChecklist ? (emotiveChecklist as any)[step.volKey] as string | undefined : undefined;
                        const detail = dose || vol;
                        const isLast = index === EMOTIVE_STEPS.length - 1;
                        return (
                            <View
                                key={step.key}
                                style={[
                                    styles.emotiveRow,
                                    !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border },
                                    done && { backgroundColor: '#1B3A2610' },
                                ]}
                            >
                                <View style={[styles.emotiveletter, { backgroundColor: step.color + '20' }]}>
                                    <Text style={[styles.emotiveLetterText, { color: step.color }]}>{step.letter}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.emotiveLabel, { color: done ? '#2E7D32' : colors.textSecondary }]}>
                                        {step.label}
                                    </Text>
                                    {detail && <Text style={[styles.emotiveDetail, { color: colors.textSecondary }]}>{detail}</Text>}
                                </View>
                                {done ? (
                                    <View style={styles.emotiveRight}>
                                        <Ionicons name="checkmark-circle" size={18} color="#2E7D32" />
                                        {time && (
                                            <Text style={[styles.emotiveTime, { color: '#2E7D32' }]}>
                                                {new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </Text>
                                        )}
                                    </View>
                                ) : (
                                    <Ionicons name="ellipse-outline" size={18} color={colors.border} />
                                )}
                            </View>
                        );
                    })}
                </SectionCard>

                {/* Vital Signs */}
                {vitalSigns.length > 0 && (
                    <SectionCard title={`Vital Signs (${vitalSigns.length})`} icon="pulse-outline" colors={colors}>
                        {/* Table header */}
                        <View style={[styles.vitalTableRow, styles.vitalTableHeader, { borderBottomColor: colors.border }]}>
                            {['Time', 'HR', 'BP', 'SpO2', 'EBL', 'SI'].map(h => (
                                <Text key={h} style={[styles.vitalHeaderCell, { color: colors.textSecondary }]}>{h}</Text>
                            ))}
                        </View>
                        {vitalSigns.map((v) => (
                            <View key={v.local_id} style={[styles.vitalTableRow, { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
                                <Text style={[styles.vitalCell, { color: colors.text }]}>
                                    {new Date(v.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                                <Text style={[styles.vitalCell, { color: colors.text }]}>{v.heart_rate ?? '—'}</Text>
                                <Text style={[styles.vitalCell, { color: colors.text }]}>
                                    {v.systolic_bp && v.diastolic_bp ? `${v.systolic_bp}/${v.diastolic_bp}` : '—'}
                                </Text>
                                <Text style={[styles.vitalCell, { color: colors.text }]}>{v.spo2 != null ? `${v.spo2}%` : '—'}</Text>
                                <Text style={[styles.vitalCell, { color: colors.text }]}>{v.estimated_blood_loss != null ? `${v.estimated_blood_loss}` : '—'}</Text>
                                <Text style={[styles.vitalCell, { color: v.shockResult ? v.shockResult.bgColor : colors.text }]}>
                                    {v.shockResult?.value.toFixed(1) ?? '—'}
                                </Text>
                            </View>
                        ))}
                        {peakBloodLoss !== null && (
                            <View style={[styles.peakRow, { borderTopColor: colors.border }]}>
                                <Text style={[styles.peakLabel, { color: colors.textSecondary }]}>Peak Blood Loss</Text>
                                <Text style={[styles.peakValue, { color: peakBloodLoss >= 500 ? colors.error : colors.text }]}>
                                    {peakBloodLoss} mL
                                </Text>
                            </View>
                        )}
                    </SectionCard>
                )}

                {/* Case Events */}
                {caseEvents.length > 0 && (
                    <SectionCard title={`Case Events (${caseEvents.length})`} icon="time-outline" colors={colors}>
                        {caseEvents.slice().reverse().map((event, index) => {
                            const iconMap: Record<string, { name: any; color: string }> = {
                                vitals:        { name: 'pulse', color: '#2563EB' },
                                emotive_step:  { name: 'checkmark-circle', color: '#16A34A' },
                                status_change: { name: 'swap-horizontal', color: '#6B7280' },
                                escalation:    { name: 'alert-circle', color: '#DC2626' },
                                note:          { name: 'document-text', color: '#D97706' },
                            };
                            const iconInfo = iconMap[event.event_type] ?? { name: 'ellipse', color: colors.textSecondary };
                            const isLast = index === caseEvents.length - 1;
                            return (
                                <View
                                    key={event.local_id}
                                    style={[
                                        styles.eventRow,
                                        !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border },
                                    ]}
                                >
                                    <Ionicons name={iconInfo.name} size={16} color={iconInfo.color} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.eventLabel, { color: colors.text }]}>{event.event_label}</Text>
                                        <Text style={[styles.eventTime, { color: colors.textSecondary }]}>
                                            {new Date(event.occurred_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                        </Text>
                                    </View>
                                </View>
                            );
                        })}
                    </SectionCard>
                )}

                {/* Outcome */}
                {(profile.status === 'closed' || profile.outcome) && (
                    <SectionCard title="Outcome" icon="checkmark-circle-outline" colors={colors}>
                        <View style={styles.outcomeRow}>
                            <Text style={[styles.outcomeLabel, { color: colors.textSecondary }]}>Status:</Text>
                            <Text style={[styles.outcomeValue, { color: colors.text }]}>
                                {profile.status.charAt(0).toUpperCase() + profile.status.slice(1).replace('_', ' ')}
                            </Text>
                        </View>
                        {profile.outcome && (
                            <View style={styles.outcomeRow}>
                                <Text style={[styles.outcomeLabel, { color: colors.textSecondary }]}>Outcome:</Text>
                                <Text style={[styles.outcomeValue, { color: colors.text }]}>
                                    {profile.outcome.replace('_', ' ')}
                                </Text>
                            </View>
                        )}
                        <View style={styles.outcomeRow}>
                            <Text style={[styles.outcomeLabel, { color: colors.textSecondary }]}>Created:</Text>
                            <Text style={[styles.outcomeValue, { color: colors.text }]}>
                                {new Date(profile.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                            </Text>
                        </View>
                    </SectionCard>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

// ── Sub-components ────────────────────────────────────────────

function SectionCard({
    title,
    icon,
    colors,
    children,
}: {
    title: string;
    icon: any;
    colors: any;
    children: React.ReactNode;
}) {
    return (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
                <Ionicons name={icon} size={18} color={colors.primary} />
                <Text style={[styles.cardTitle, { color: colors.text }]}>{title}</Text>
            </View>
            {children}
        </View>
    );
}

function InfoGrid({ items, colors }: { items: { label: string; value: string }[]; colors: any }) {
    return (
        <View style={styles.infoGrid}>
            {items.map((item) => (
                <View key={item.label} style={styles.infoCell}>
                    <Text style={[styles.infoCellLabel, { color: colors.textSecondary }]}>{item.label}</Text>
                    <Text style={[styles.infoCellValue, { color: colors.text }]}>{item.value}</Text>
                </View>
            ))}
        </View>
    );
}

// ── Styles ────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1 },
    centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
    emptyText: { ...Typography.bodyMd, marginTop: Spacing.md },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.smd,
        borderBottomWidth: 1,
        gap: Spacing.sm,
    },
    backButton: { padding: Spacing.xs },
    headerCenter: { flex: 1 },
    headerTitle: { ...Typography.headingSm },
    headerSubtitle: { ...Typography.bodySm },
    statusPill: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        borderRadius: Radius.full,
    },
    statusPillText: { ...Typography.labelSm },

    scrollContent: { padding: Spacing.md, gap: Spacing.md },

    card: {
        borderWidth: 1,
        borderRadius: Radius.lg,
        overflow: 'hidden',
        ...Shadows.sm,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        padding: Spacing.md,
        borderBottomWidth: 1,
    },
    cardTitle: { ...Typography.labelLg },

    infoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: Spacing.sm,
    },
    infoCell: {
        width: '33.33%',
        padding: Spacing.sm,
    },
    infoCellLabel: { ...Typography.caption },
    infoCellValue: { ...Typography.labelMd, marginTop: 2 },

    deliveryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        padding: Spacing.md,
        borderTopWidth: 1,
    },
    deliveryLabel: { ...Typography.labelSm },
    deliveryValue: { ...Typography.bodySm },

    notesRow: {
        padding: Spacing.md,
        borderTopWidth: 1,
    },
    notesText: { ...Typography.bodySm },

    riskBadge: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        margin: Spacing.md,
        padding: Spacing.sm,
        borderWidth: 1,
        borderRadius: Radius.md,
    },
    riskLevel: { ...Typography.labelLg },
    riskScore: { ...Typography.labelSm },
    factorsList: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.md, gap: Spacing.xs },
    factorItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
    factorDot: { width: 8, height: 8, borderRadius: 4 },
    factorText: { ...Typography.bodySm },

    bundleSummary: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        margin: Spacing.md,
        padding: Spacing.sm,
    },
    bundleSummaryText: { ...Typography.labelMd },
    bundleElapsed: { ...Typography.labelSm },

    emotiveRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.smd,
        gap: Spacing.sm,
    },
    emotiveletter: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emotiveLetterText: { ...Typography.labelSm, fontSize: 13 },
    emotiveLabel: { ...Typography.labelMd },
    emotiveDetail: { ...Typography.bodySm, fontSize: 12 },
    emotiveRight: { alignItems: 'flex-end', gap: 2 },
    emotiveTime: { ...Typography.labelSm, fontSize: 11 },

    vitalTableRow: {
        flexDirection: 'row',
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs,
    },
    vitalTableHeader: { borderBottomWidth: 1 },
    vitalHeaderCell: { flex: 1, ...Typography.labelSm, textAlign: 'center' },
    vitalCell: { flex: 1, ...Typography.bodySm, fontSize: 12, textAlign: 'center' },

    peakRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: Spacing.md,
        borderTopWidth: 1,
    },
    peakLabel: { ...Typography.labelSm },
    peakValue: { ...Typography.labelMd },

    eventRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.sm,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.smd,
    },
    eventLabel: { ...Typography.labelSm },
    eventTime: { ...Typography.caption },

    outcomeRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.smd,
    },
    outcomeLabel: { ...Typography.labelSm, width: 70 },
    outcomeValue: { ...Typography.bodySm, flex: 1 },
});
