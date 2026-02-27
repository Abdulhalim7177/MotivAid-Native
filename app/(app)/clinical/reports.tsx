/**
 * Reports Page — Overview of all cases with analytics and case-by-case details
 *
 * Shows:
 * - Summary stats (total, active, closed, high-risk)
 * - Risk distribution bar chart
 * - Case outcomes breakdown
 * - Recent case list with status, risk, and tap-to-view detail
 */

import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { MaternalProfile, useClinical } from '@/context/clinical';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { RISK_COLORS, RISK_LABELS, RiskLevel } from '@/lib/risk-calculator';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import {
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
    pre_delivery: { label: 'Pre-Delivery', color: '#3B82F6', icon: 'time-outline' },
    active: { label: 'Active', color: '#10B981', icon: 'pulse-outline' },
    monitoring: { label: 'Monitoring', color: '#F59E0B', icon: 'eye-outline' },
    closed: { label: 'Closed', color: '#6B7280', icon: 'checkmark-circle-outline' },
};

export default function ReportsScreen() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { profiles } = useClinical();
    const { profile: authProfile } = useAuth();

    // ── Analytics ──────────────────────────────────────────────
    const stats = useMemo(() => {
        const active = profiles.filter(p => p.status !== 'closed');
        const closed = profiles.filter(p => p.status === 'closed');
        const highRisk = active.filter(p => p.risk_level === 'high');
        const mediumRisk = active.filter(p => p.risk_level === 'medium');
        const lowRisk = active.filter(p => p.risk_level === 'low');
        return { total: profiles.length, active, closed, highRisk, mediumRisk, lowRisk };
    }, [profiles]);

    // All cases sorted by most recent
    const sortedCases = useMemo(() => {
        return [...profiles].sort(
            (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
    }, [profiles]);

    // Outcomes
    const outcomes = useMemo(() => {
        const normal = stats.closed.filter(p => p.outcome === 'normal').length;
        const pphResolved = stats.closed.filter(p => p.outcome === 'pph_resolved').length;
        const referred = stats.closed.filter(p => p.outcome === 'referred').length;
        return { normal, pphResolved, referred };
    }, [stats.closed]);

    const getTimeAgo = (dateStr: string): string => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    };

    const navigateToCase = (profile: MaternalProfile) => {
        router.push({
            pathname: '/(app)/clinical/case-summary',
            params: { localId: profile.local_id },
        });
    };

    // ── Case Row ──────────────────────────────────────────────
    const renderCase = ({ item }: { item: MaternalProfile }) => {
        const riskColors = RISK_COLORS[item.risk_level as RiskLevel] ?? RISK_COLORS.low;
        const riskLabel = RISK_LABELS[item.risk_level as RiskLevel] ?? 'Low';
        const statusConf = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.pre_delivery;

        return (
            <TouchableOpacity
                style={[styles.caseCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                activeOpacity={0.7}
                onPress={() => navigateToCase(item)}
            >
                {/* Top row: patient + risk */}
                <View style={styles.caseTop}>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.caseName, { color: colors.text }]}>
                            {item.patient_id || 'Patient'}
                        </Text>
                        <Text style={[styles.caseInfo, { color: colors.textSecondary }]}>
                            Age {item.age} · G{item.gravida}P{item.parity}
                        </Text>
                    </View>
                    <View style={[styles.riskBadge, { backgroundColor: riskColors.bg, borderColor: riskColors.border }]}>
                        <Text style={[styles.riskText, { color: riskColors.text }]}>{riskLabel}</Text>
                    </View>
                </View>

                {/* Risk factors preview */}
                {item.riskResult && item.riskResult.factors.length > 0 && (
                    <Text style={[styles.factorsPreview, { color: colors.textSecondary }]} numberOfLines={1}>
                        {item.riskResult.factors.map(f => f.label).join(' · ')}
                    </Text>
                )}

                {/* Bottom: status + time + arrow */}
                <View style={styles.caseBottom}>
                    <View style={[styles.statusChip, { backgroundColor: statusConf.color + '15' }]}>
                        <Ionicons name={statusConf.icon as any} size={12} color={statusConf.color} />
                        <Text style={[styles.statusChipText, { color: statusConf.color }]}>
                            {statusConf.label}
                        </Text>
                    </View>
                    <Text style={[styles.timeText, { color: colors.textSecondary }]}>
                        {getTimeAgo(item.updated_at)}
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                </View>
            </TouchableOpacity>
        );
    };

    // ── Header (analytics section) ────────────────────────────
    const ListHeader = () => (
        <View>
            {/* Summary Cards */}
            <View style={styles.summaryRow}>
                <View style={[styles.summaryCard, { backgroundColor: '#6366F1' + '12' }]}>
                    <Ionicons name="layers-outline" size={20} color="#6366F1" />
                    <Text style={[styles.summaryNum, { color: '#6366F1' }]}>{stats.total}</Text>
                    <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total</Text>
                </View>
                <View style={[styles.summaryCard, { backgroundColor: '#10B981' + '12' }]}>
                    <Ionicons name="pulse-outline" size={20} color="#10B981" />
                    <Text style={[styles.summaryNum, { color: '#10B981' }]}>{stats.active.length}</Text>
                    <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Active</Text>
                </View>
                <View style={[styles.summaryCard, { backgroundColor: '#EF4444' + '12' }]}>
                    <Ionicons name="warning-outline" size={20} color="#EF4444" />
                    <Text style={[styles.summaryNum, { color: '#EF4444' }]}>{stats.highRisk.length}</Text>
                    <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>High Risk</Text>
                </View>
                <View style={[styles.summaryCard, { backgroundColor: '#6B7280' + '12' }]}>
                    <Ionicons name="checkmark-done-outline" size={20} color="#6B7280" />
                    <Text style={[styles.summaryNum, { color: '#6B7280' }]}>{stats.closed.length}</Text>
                    <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Closed</Text>
                </View>
            </View>

            {/* Risk Distribution */}
            {stats.active.length > 0 && (
                <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.sectionCardHeader}>
                        <Ionicons name="analytics-outline" size={18} color={colors.primary} />
                        <Text style={[styles.sectionCardTitle, { color: colors.text }]}>Risk Distribution</Text>
                    </View>
                    <View style={styles.barGroup}>
                        <BarRow label="High" count={stats.highRisk.length} total={stats.active.length} color="#EF4444" colors={colors} />
                        <BarRow label="Medium" count={stats.mediumRisk.length} total={stats.active.length} color="#F59E0B" colors={colors} />
                        <BarRow label="Low" count={stats.lowRisk.length} total={stats.active.length} color="#10B981" colors={colors} />
                    </View>
                </View>
            )}

            {/* Outcomes */}
            {stats.closed.length > 0 && (
                <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.sectionCardHeader}>
                        <Ionicons name="pie-chart-outline" size={18} color={colors.primary} />
                        <Text style={[styles.sectionCardTitle, { color: colors.text }]}>Case Outcomes</Text>
                    </View>
                    <View style={styles.outcomesRow}>
                        <OutcomePill label="Normal" count={outcomes.normal} color="#10B981" icon="checkmark-circle" />
                        <OutcomePill label="PPH Resolved" count={outcomes.pphResolved} color="#F59E0B" icon="medkit" />
                        <OutcomePill label="Referred" count={outcomes.referred} color="#6366F1" icon="arrow-redo" />
                    </View>
                </View>
            )}

            {/* Case list title */}
            <View style={styles.caseListHeader}>
                <Text style={[styles.caseListTitle, { color: colors.text }]}>
                    All Cases ({sortedCases.length})
                </Text>
            </View>
        </View>
    );

    const EmptyList = () => (
        <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="document-text-outline" size={40} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No cases recorded yet</Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                Cases will appear here once created
            </Text>
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Reports</Text>
                    <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                        Case history & analytics
                    </Text>
                </View>
            </View>

            <FlatList
                data={sortedCases}
                keyExtractor={item => item.local_id}
                renderItem={renderCase}
                ListHeaderComponent={ListHeader}
                ListEmptyComponent={EmptyList}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
            />
        </SafeAreaView>
    );
}

// ── Sub-components ────────────────────────────────────────────

function BarRow({ label, count, total, color, colors }: {
    label: string; count: number; total: number; color: string; colors: any;
}) {
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    return (
        <View style={styles.barRow}>
            <Text style={[styles.barLabel, { color: colors.textSecondary }]}>{label}</Text>
            <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
                <View style={[styles.barFill, { backgroundColor: color, width: `${Math.max(pct, 3)}%` }]} />
            </View>
            <Text style={[styles.barCount, { color }]}>{count}</Text>
            <Text style={[styles.barPct, { color: colors.textSecondary }]}>{pct}%</Text>
        </View>
    );
}

function OutcomePill({ label, count, color, icon }: {
    label: string; count: number; color: string; icon: string;
}) {
    return (
        <View style={styles.outcomePill}>
            <View style={[styles.outcomeIcon, { backgroundColor: color + '15' }]}>
                <Ionicons name={icon as any} size={16} color={color} />
            </View>
            <Text style={[styles.outcomeCount, { color }]}>{count}</Text>
            <Text style={styles.outcomeLabel}>{label}</Text>
        </View>
    );
}

// ── Styles ────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1 },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.smd,
        borderBottomWidth: 1,
        gap: Spacing.sm,
    },
    backButton: { padding: Spacing.xs },
    headerTitle: { ...Typography.headingSm },
    headerSubtitle: { ...Typography.bodySm },

    listContent: {
        padding: Spacing.md,
        paddingBottom: Spacing.xxl,
    },

    // Summary cards
    summaryRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginBottom: Spacing.md,
    },
    summaryCard: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: Spacing.smd,
        borderRadius: Radius.lg,
        gap: 2,
    },
    summaryNum: {
        fontSize: 22,
        fontWeight: 'bold',
    },
    summaryLabel: {
        ...Typography.bodySm,
        fontSize: 10,
    },

    // Section cards (risk, outcomes)
    sectionCard: {
        borderWidth: 1,
        borderRadius: Radius.lg,
        padding: Spacing.md,
        marginBottom: Spacing.md,
        ...Shadows.sm,
    },
    sectionCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        marginBottom: Spacing.smd,
    },
    sectionCardTitle: { ...Typography.labelLg },

    // Bar chart
    barGroup: { gap: Spacing.sm },
    barRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    barLabel: {
        width: 55,
        ...Typography.bodySm,
        fontSize: 12,
    },
    barTrack: {
        flex: 1,
        height: 8,
        borderRadius: 4,
    },
    barFill: {
        height: 8,
        borderRadius: 4,
    },
    barCount: {
        width: 20,
        ...Typography.labelSm,
        textAlign: 'right',
    },
    barPct: {
        width: 32,
        ...Typography.bodySm,
        fontSize: 11,
        textAlign: 'right',
    },

    // Outcomes
    outcomesRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    outcomePill: {
        flex: 1,
        alignItems: 'center',
    },
    outcomeIcon: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    outcomeCount: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    outcomeLabel: {
        fontSize: 9,
        color: '#9CA3AF',
        marginTop: 2,
    },

    // Case list
    caseListHeader: {
        marginTop: Spacing.sm,
        marginBottom: Spacing.sm,
    },
    caseListTitle: {
        ...Typography.labelLg,
    },

    caseCard: {
        padding: Spacing.md,
        borderRadius: Radius.lg,
        borderWidth: 1,
        marginBottom: Spacing.sm,
        ...Shadows.sm,
    },
    caseTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: Spacing.xs,
    },
    caseName: { ...Typography.labelMd },
    caseInfo: { ...Typography.bodySm, marginTop: 2 },
    riskBadge: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        borderRadius: Radius.sm,
        borderWidth: 1,
    },
    riskText: { ...Typography.labelSm, fontSize: 10 },
    factorsPreview: {
        ...Typography.bodySm,
        fontSize: 11,
        marginBottom: Spacing.xs,
    },
    caseBottom: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    statusChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 3,
        borderRadius: Radius.full,
        gap: 4,
    },
    statusChipText: { ...Typography.labelSm, fontSize: 10 },
    timeText: { ...Typography.bodySm, fontSize: 11, flex: 1 },

    // Empty
    emptyState: {
        padding: Spacing.xl,
        borderRadius: Radius.lg,
        borderWidth: 1,
        alignItems: 'center',
        gap: Spacing.xs,
        marginTop: Spacing.md,
    },
    emptyText: { ...Typography.labelMd },
    emptySubtext: { ...Typography.bodySm, textAlign: 'center' },
});
