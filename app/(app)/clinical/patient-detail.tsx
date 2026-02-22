/**
 * Patient Detail — Overview of a maternal profile
 *
 * Shows risk assessment, vital signs timeline, shock index,
 * blood loss tracker, and case status controls.
 */

import { EmotiveChecklist } from '@/components/clinical/emotive-checklist';
import { VitalsPromptBanner } from '@/components/clinical/vitals-prompt-banner';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { useClinical, VitalSign } from '@/context/clinical';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { RISK_COLORS, RISK_LABELS, RiskLevel } from '@/lib/risk-calculator';
import { assessBloodLoss } from '@/lib/shock-index';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PatientDetailScreen() {
    const { localId } = useLocalSearchParams<{ localId: string }>();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const {
        profiles,
        vitalSigns,
        latestVital,
        setActiveProfileId,
        refreshVitals,
        updateProfileStatus,
        isLoading,
        refreshProfiles,
    } = useClinical();

    const [showCloseModal, setShowCloseModal] = useState(false);

    const profile = profiles.find(p => p.local_id === localId);

    useFocusEffect(
        useCallback(() => {
            if (localId) {
                setActiveProfileId(localId);
                refreshVitals(localId);
            }
        }, [localId, setActiveProfileId, refreshVitals])
    );

    if (!profile) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => {
                        if (router.canGoBack()) router.back();
                        else router.replace('/(app)/(tabs)/clinical');
                    }} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Patient</Text>
                    <View style={{ width: 40 }} />
                </View>
                <View style={styles.emptyContainer}>
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Patient not found</Text>
                </View>
            </SafeAreaView>
        );
    }

    const riskColors = RISK_COLORS[profile.risk_level as RiskLevel] ?? RISK_COLORS.low;
    const totalBloodLoss = vitalSigns.reduce((sum, v) => Math.max(sum, v.estimated_blood_loss), 0);
    const bloodLossAssessment = assessBloodLoss(totalBloodLoss);

    const handleStatusChange = async (newStatus: string) => {
        if (newStatus === 'closed') {
            setShowCloseModal(true);
        } else {
            try {
                await updateProfileStatus(localId!, newStatus);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch {
                // Status update failed — logged in context
            }
        }
    };

    const handleCloseWithOutcome = async (outcome: 'normal' | 'pph_resolved' | 'referred') => {
        setShowCloseModal(false);
        try {
            await updateProfileStatus(localId!, 'closed', outcome);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {
            // Close failed — logged in context
        }
    };

    const onRefresh = async () => {
        await refreshProfiles();
        if (localId) await refreshVitals(localId);
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => {
                    if (router.canGoBack()) router.back();
                    else router.replace('/(app)/(tabs)/clinical');
                }} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>
                        {profile.patient_id || 'Patient'}
                    </Text>
                    <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                        Age {profile.age} · G{profile.gravida}P{profile.parity}
                    </Text>
                </View>
                <View style={[styles.riskDot, { backgroundColor: riskColors.border }]} />
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={colors.primary} />
                }
            >
                {/* Risk Assessment Card */}
                <View style={[styles.card, { backgroundColor: riskColors.bg, borderColor: riskColors.border }]}>
                    <View style={styles.cardHeader}>
                        <Ionicons
                            name={profile.risk_level === 'high' ? 'warning' : profile.risk_level === 'medium' ? 'alert-circle' : 'shield-checkmark'}
                            size={22}
                            color={riskColors.text}
                        />
                        <Text style={[styles.cardTitle, { color: riskColors.text }]}>
                            {RISK_LABELS[profile.risk_level as RiskLevel]}
                        </Text>
                        <Text style={[styles.scoreText, { color: riskColors.text }]}>
                            Score: {profile.risk_score}
                        </Text>
                    </View>
                    {profile.riskResult && profile.riskResult.factors.length > 0 && (
                        <View style={styles.factorsList}>
                            {profile.riskResult.factors.map((f, i) => (
                                <View key={i} style={styles.factorItem}>
                                    <View style={[styles.factorDot, { backgroundColor: f.category === 'high' ? '#C62828' : '#F57C00' }]} />
                                    <Text style={[styles.factorText, { color: riskColors.text }]}>{f.label}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>

                {/* Shock Index & Blood Loss */}
                <View style={styles.metricsRow}>
                    {/* Shock Index */}
                    <View style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Shock Index</Text>
                        {latestVital?.shockResult ? (
                            <>
                                <Text style={[styles.metricValue, { color: latestVital.shockResult.bgColor }]}>
                                    {latestVital.shockResult.value.toFixed(1)}
                                </Text>
                                <View style={[styles.metricBadge, { backgroundColor: latestVital.shockResult.bgColor }]}>
                                    <Text style={[styles.metricBadgeText, { color: latestVital.shockResult.color }]}>
                                        {latestVital.shockResult.label}
                                    </Text>
                                </View>
                            </>
                        ) : (
                            <Text style={[styles.metricValue, { color: colors.textSecondary }]}>—</Text>
                        )}
                    </View>

                    {/* Blood Loss */}
                    <View style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Blood Loss</Text>
                        <Text style={[styles.metricValue, { color: bloodLossAssessment.bgColor }]}>
                            {totalBloodLoss} mL
                        </Text>
                        <View style={[styles.metricBadge, { backgroundColor: bloodLossAssessment.bgColor }]}>
                            <Text style={[styles.metricBadgeText, { color: bloodLossAssessment.color }]}>
                                {bloodLossAssessment.label}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Quick Actions */}
                <View style={styles.actionsRow}>
                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: colors.primary }]}
                        onPress={() => router.push({
                            pathname: '/(app)/clinical/record-vitals',
                            params: { localId: localId! },
                        })}
                    >
                        <Ionicons name="pulse" size={20} color="#FFF" />
                        <Text style={styles.actionText}>Record Vitals</Text>
                    </TouchableOpacity>

                    {profile.status === 'pre_delivery' && (
                        <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: '#10B981' }]}
                            onPress={() => handleStatusChange('active')}
                        >
                            <Ionicons name="play" size={18} color="#FFF" />
                            <Text style={styles.actionText}>Start</Text>
                        </TouchableOpacity>
                    )}

                    {(profile.status === 'active' || profile.status === 'monitoring') && (
                        <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: '#6B7280' }]}
                            onPress={() => handleStatusChange('closed')}
                        >
                            <Ionicons name="checkmark-circle" size={18} color="#FFF" />
                            <Text style={styles.actionText}>Close</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* E-MOTIVE Bundle Checklist */}
                {(profile.status === 'active' || profile.status === 'monitoring') && (
                    <EmotiveChecklist />
                )}

                {/* Status Controls */}
                {profile.status !== 'closed' && (
                    <View style={[styles.statusRow, { borderColor: colors.border }]}>
                        {(['pre_delivery', 'active', 'monitoring'] as const).map((s) => {
                            const isActive = profile.status === s;
                            const label = s === 'pre_delivery' ? 'Pre-Del' : s === 'active' ? 'Active' : 'Monitoring';
                            return (
                                <TouchableOpacity
                                    key={s}
                                    style={[styles.statusPill, isActive && { backgroundColor: colors.primary + '15' }]}
                                    onPress={() => !isActive && handleStatusChange(s)}
                                >
                                    <Text style={[styles.statusPillText, isActive ? { color: colors.primary } : { color: colors.textSecondary }]}>
                                        {label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}

                {/* Vital Signs Timeline */}
                <View style={styles.timelineHeader}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Vital Signs</Text>
                    <Text style={[styles.timelineCount, { color: colors.textSecondary }]}>
                        {vitalSigns.length} records
                    </Text>
                </View>

                {vitalSigns.length === 0 ? (
                    <View style={[styles.emptyVitals, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Ionicons name="pulse-outline" size={32} color={colors.textSecondary} />
                        <Text style={[styles.emptyVitalsText, { color: colors.textSecondary }]}>
                            No vital signs recorded yet
                        </Text>
                    </View>
                ) : (
                    vitalSigns.map((vital, index) => (
                        <VitalSignCard key={vital.local_id} vital={vital} colors={colors} isLast={index === vitalSigns.length - 1} />
                    ))
                )}

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Floating vitals reminder */}
            <VitalsPromptBanner />

            {/* Close Case Outcome Modal */}
            <Modal visible={showCloseModal} transparent animationType="fade" onRequestClose={() => setShowCloseModal(false)}>
                <Pressable style={styles.modalOverlay} onPress={() => setShowCloseModal(false)}>
                    <Pressable style={[styles.modalContent, { backgroundColor: colors.card }]}>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>Close Case</Text>
                        <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>Select outcome for this case:</Text>

                        <TouchableOpacity
                            style={[styles.modalOption, { backgroundColor: colors.success + '15' }]}
                            onPress={() => handleCloseWithOutcome('normal')}
                        >
                            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                            <Text style={[styles.modalOptionText, { color: colors.success }]}>Normal</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.modalOption, { backgroundColor: colors.warning + '15' }]}
                            onPress={() => handleCloseWithOutcome('pph_resolved')}
                        >
                            <Ionicons name="medkit" size={20} color={colors.warning} />
                            <Text style={[styles.modalOptionText, { color: colors.warning }]}>PPH Resolved</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.modalOption, { backgroundColor: colors.primary + '15' }]}
                            onPress={() => handleCloseWithOutcome('referred')}
                        >
                            <Ionicons name="arrow-redo" size={20} color={colors.primary} />
                            <Text style={[styles.modalOptionText, { color: colors.primary }]}>Referred</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.modalCancel, { borderColor: colors.border }]}
                            onPress={() => setShowCloseModal(false)}
                        >
                            <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>Cancel</Text>
                        </TouchableOpacity>
                    </Pressable>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
}

// ── Vital Sign Card ──────────────────────────────────────────

function VitalSignCard({ vital, colors, isLast }: { vital: VitalSign; colors: any; isLast: boolean }) {
    return (
        <View style={[styles.vitalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.vitalCardHeader}>
                <Text style={[styles.vitalTime, { color: colors.textSecondary }]}>
                    {new Date(vital.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
                {vital.shockResult && (
                    <View style={[styles.shockBadge, { backgroundColor: vital.shockResult.bgColor }]}>
                        <Text style={[styles.shockBadgeText, { color: vital.shockResult.color }]}>
                            SI {vital.shockResult.value.toFixed(1)}
                        </Text>
                    </View>
                )}
            </View>

            <View style={styles.vitalGrid}>
                {vital.heart_rate != null && (
                    <VitalItem label="HR" value={`${vital.heart_rate}`} unit="bpm" colors={colors} />
                )}
                {vital.systolic_bp != null && (
                    <VitalItem
                        label="BP"
                        value={`${vital.systolic_bp}/${vital.diastolic_bp ?? '—'}`}
                        unit="mmHg"
                        colors={colors}
                    />
                )}
                {vital.temperature != null && (
                    <VitalItem label="Temp" value={`${vital.temperature}`} unit="°C" colors={colors} />
                )}
                {vital.spo2 != null && (
                    <VitalItem label="SpO₂" value={`${vital.spo2}`} unit="%" colors={colors} />
                )}
                {vital.respiratory_rate != null && (
                    <VitalItem label="RR" value={`${vital.respiratory_rate}`} unit="/min" colors={colors} />
                )}
                {vital.estimated_blood_loss > 0 && (
                    <VitalItem label="EBL" value={`${vital.estimated_blood_loss}`} unit="mL" colors={colors} isWarning />
                )}
            </View>

            {!vital.is_synced && (
                <View style={styles.syncIndicator}>
                    <Ionicons name="cloud-offline-outline" size={12} color={colors.warning} />
                </View>
            )}
        </View>
    );
}

function VitalItem({
    label,
    value,
    unit,
    colors,
    isWarning = false,
}: {
    label: string;
    value: string;
    unit: string;
    colors: any;
    isWarning?: boolean;
}) {
    return (
        <View style={styles.vitalItem}>
            <Text style={[styles.vitalItemLabel, { color: colors.textSecondary }]}>{label}</Text>
            <Text style={[styles.vitalItemValue, { color: isWarning ? '#C62828' : colors.text }]}>
                {value}
                <Text style={styles.vitalItemUnit}> {unit}</Text>
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.smd,
    },
    backButton: { width: 40, height: 40, justifyContent: 'center' },
    headerCenter: { flex: 1, alignItems: 'center' },
    headerTitle: { ...Typography.headingMd },
    headerSubtitle: { ...Typography.bodySm, marginTop: 2 },
    riskDot: { width: 12, height: 12, borderRadius: 6 },

    scrollContent: { paddingHorizontal: Spacing.md },

    // Cards
    card: {
        borderRadius: Radius.lg,
        borderWidth: 1.5,
        padding: Spacing.md,
        marginBottom: Spacing.md,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    cardTitle: { ...Typography.labelLg, flex: 1 },
    scoreText: { ...Typography.labelSm },

    // Factors list
    factorsList: { marginTop: Spacing.smd, gap: Spacing.xs },
    factorItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    factorDot: { width: 6, height: 6, borderRadius: 3 },
    factorText: { ...Typography.bodySm },

    // Metrics
    metricsRow: { flexDirection: 'row', gap: Spacing.smd, marginBottom: Spacing.md },
    metricCard: {
        flex: 1,
        borderRadius: Radius.lg,
        borderWidth: 1,
        padding: Spacing.md,
        alignItems: 'center',
        ...Shadows.sm,
    },
    metricLabel: { ...Typography.labelSm, marginBottom: Spacing.xs },
    metricValue: { ...Typography.statLg },
    metricBadge: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        borderRadius: Radius.full,
        marginTop: Spacing.xs,
    },
    metricBadgeText: { ...Typography.overline },

    // Actions
    actionsRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginBottom: Spacing.md,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.smd,
        borderRadius: Radius.md,
        gap: Spacing.xs,
    },
    actionText: { color: '#FFF', ...Typography.buttonMd },

    // Status row
    statusRow: {
        flexDirection: 'row',
        borderWidth: 1,
        borderRadius: Radius.md,
        overflow: 'hidden',
        marginBottom: Spacing.lg,
    },
    statusPill: {
        flex: 1,
        paddingVertical: Spacing.sm,
        alignItems: 'center',
    },
    statusPillText: { ...Typography.labelSm },

    // Timeline
    timelineHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    sectionTitle: { ...Typography.headingSm },
    timelineCount: { ...Typography.bodySm },

    // Vital cards
    vitalCard: {
        borderRadius: Radius.md,
        borderWidth: 1,
        padding: Spacing.smd,
        marginBottom: Spacing.sm,
        ...Shadows.sm,
    },
    vitalCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    vitalTime: { ...Typography.labelSm },
    shockBadge: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        borderRadius: Radius.full,
    },
    shockBadgeText: { ...Typography.overline, fontSize: 10 },

    vitalGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.smd,
    },
    vitalItem: { width: '28%' },
    vitalItemLabel: { ...Typography.overline },
    vitalItemValue: { ...Typography.labelMd, marginTop: 2 },
    vitalItemUnit: { ...Typography.bodySm, fontWeight: '400' },

    syncIndicator: { position: 'absolute', top: 8, right: 8 },

    // Empty states
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyText: { ...Typography.bodyMd },
    emptyVitals: {
        borderRadius: Radius.lg,
        borderWidth: 1,
        padding: Spacing.xl,
        alignItems: 'center',
        gap: Spacing.sm,
    },
    emptyVitalsText: { ...Typography.bodySm },

    // Close modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.lg,
    },
    modalContent: {
        width: '100%',
        maxWidth: 360,
        borderRadius: Radius.xl,
        padding: Spacing.lg,
        ...Shadows.lg,
    },
    modalTitle: { ...Typography.headingMd, marginBottom: Spacing.xs },
    modalSubtitle: { ...Typography.bodySm, marginBottom: Spacing.md },
    modalOption: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        paddingVertical: Spacing.smd,
        paddingHorizontal: Spacing.md,
        borderRadius: Radius.md,
        marginBottom: Spacing.sm,
    },
    modalOptionText: { ...Typography.labelLg },
    modalCancel: {
        alignItems: 'center',
        paddingVertical: Spacing.smd,
        borderTopWidth: 1,
        marginTop: Spacing.sm,
    },
    modalCancelText: { ...Typography.buttonMd },
});
