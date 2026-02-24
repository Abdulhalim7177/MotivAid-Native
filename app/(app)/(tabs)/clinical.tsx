/**
 * Clinical Tab — Case list screen
 * Lists active and recent maternal profiles.
 * Supervisors see all units with a unit filter row.
 * Staff see only their active unit.
 */

import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { MaternalProfile, useClinical } from '@/context/clinical';
import { useUnits } from '@/context/unit';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { RISK_COLORS, RISK_LABELS, RiskLevel } from '@/lib/risk-calculator';
import { Dropdown } from '@/components/ui/dropdown';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
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

export default function ClinicalScreen() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { profiles, allProfiles, isLoading, refreshProfiles, fetchAllFacilityProfiles, isSyncing, syncNow, user } = useClinical();
    const { activeUnit, availableUnits } = useUnits();
    const { profile: authProfile } = useAuth();

    const [filter, setFilter] = useState<string | null>(null);
    const [showMyCasesOnly, setShowMyCasesOnly] = useState(false);

    // ── Supervisor & Admin monitoring ─────────────────────────
    const isSupervisor = authProfile?.role === 'supervisor';
    const isAdmin = authProfile?.role === 'admin';
    const [monitoringMode, setMonitoringMode] = useState(isSupervisor || isAdmin);
    const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);

    useFocusEffect(
        useCallback(() => {
            refreshProfiles();
            fetchAllFacilityProfiles();
        }, [refreshProfiles, fetchAllFacilityProfiles])
    );

    // Decide which profile list to use
    const baseProfiles = useMemo(() => {
        // For supervisors, use allProfiles if monitoringMode is true, otherwise use profiles
        // Actually, with the new refreshProfiles, profiles already contains facility-wide for supervisors
        let list = (isSupervisor || isAdmin) ? allProfiles : profiles;

        if (showMyCasesOnly && user?.id) {
            list = list.filter(p => p.created_by === user.id);
        }

        return list;
    }, [isSupervisor, isAdmin, allProfiles, profiles, showMyCasesOnly, user?.id]);

    // Apply unit filter
    const unitFilteredProfiles = useMemo(() => {
        if (!selectedUnitId) return baseProfiles;
        return baseProfiles.filter(p => p.unit_id === selectedUnitId);
    }, [baseProfiles, selectedUnitId]);

    // Apply status filter
    const filteredProfiles = useMemo(() => {
        if (!filter) return unitFilteredProfiles;
        return unitFilteredProfiles.filter(p => p.status === filter);
    }, [unitFilteredProfiles, filter]);

    const activeCount = unitFilteredProfiles.filter(p => p.status === 'active' || p.status === 'monitoring').length;

    const isStaff = authProfile?.role && ['midwife', 'nurse', 'student', 'supervisor', 'admin'].includes(authProfile.role);

    // Unit name lookup
    const unitNameMap = useMemo(() => {
        const map = new Map<string, string>();
        for (const u of availableUnits) {
            map.set(u.id, u.name);
        }
        return map;
    }, [availableUnits]);

    const unitOptions = useMemo(() => {
        return availableUnits.map(unit => ({
            label: unit.name,
            value: unit.id,
            count: baseProfiles.filter(p => p.unit_id === unit.id).length
        }));
    }, [availableUnits, baseProfiles]);

    const statusOptions = useMemo(() => {
        return Object.entries(STATUS_CONFIG).map(([key, config]) => ({
            label: config.label,
            value: key,
            count: unitFilteredProfiles.filter(p => p.status === key).length
        }));
    }, [unitFilteredProfiles]);

    const renderProfile = ({ item }: { item: MaternalProfile }) => {
        const riskColors = RISK_COLORS[item.risk_level as RiskLevel] ?? RISK_COLORS.low;
        const statusConfig = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.pre_delivery;

        return (
            <TouchableOpacity
                style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.push({
                    pathname: '/(app)/clinical/patient-detail',
                    params: { localId: item.local_id },
                })}
                activeOpacity={0.7}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.patientInfo}>
                        <Text style={[styles.patientId, { color: colors.text }]}>
                            {item.patient_id || 'No ID'}
                        </Text>
                        <Text style={[styles.patientAge, { color: colors.textSecondary }]}>
                            Age {item.age} · G{item.gravida}P{item.parity}
                        </Text>
                    </View>

                    {/* Risk Badge */}
                    <View style={[styles.riskBadge, { backgroundColor: riskColors.bg, borderColor: riskColors.border }]}>
                        <Text style={[styles.riskText, { color: riskColors.text }]}>
                            {RISK_LABELS[item.risk_level as RiskLevel] ?? 'Low Risk'}
                        </Text>
                    </View>
                </View>

                <View style={styles.cardFooter}>
                    {/* Status */}
                    <View style={[styles.statusChip, { backgroundColor: statusConfig.color + '15' }]}>
                        <Ionicons name={statusConfig.icon as any} size={14} color={statusConfig.color} />
                        <Text style={[styles.statusText, { color: statusConfig.color }]}>
                            {statusConfig.label}
                        </Text>
                    </View>

                    {/* Unit label (supervisor mode) */}
                    {isSupervisor && !selectedUnitId && item.unit_id && (
                        <View style={[styles.unitChip, { backgroundColor: colors.primary + '12' }]}>
                            <Text style={[styles.unitChipText, { color: colors.primary }]} numberOfLines={1}>
                                {unitNameMap.get(item.unit_id) ?? 'Unknown'}
                            </Text>
                        </View>
                    )}

                    {/* Sync indicator */}
                    {!item.is_synced && (
                        <View style={[styles.syncBadge, { backgroundColor: colors.warning + '20' }]}>
                            <Ionicons name="cloud-offline-outline" size={12} color={colors.warning} />
                            <Text style={[styles.syncText, { color: colors.warning }]}>Offline</Text>
                        </View>
                    )}

                    {/* Time ago */}
                    <Text style={[styles.timeText, { color: colors.textSecondary }]}>
                        {formatTimeAgo(item.updated_at)}
                    </Text>
                </View>

                {/* Risk factors preview */}
                {item.riskResult && item.riskResult.factors.length > 0 && (
                    <View style={styles.factorsPreview}>
                        <Text style={[styles.factorsText, { color: colors.textSecondary }]} numberOfLines={1}>
                            {item.riskResult.factors.map(f => f.label).join(' · ')}
                        </Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    const headerSubtitle = monitoringMode
        ? selectedUnitId
            ? `${unitNameMap.get(selectedUnitId) ?? 'Unit'} · ${activeCount} active`
            : `Facility Overview (${availableUnits.length} Units) · ${activeCount} active`
        : `${activeUnit?.name ?? 'Select a unit'} · ${activeCount} active`;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Clinical</Text>
                    <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                        {headerSubtitle}
                    </Text>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity
                        onPress={() => { syncNow(); if (isSupervisor || isAdmin) fetchAllFacilityProfiles(); }}
                        style={[styles.syncButton, { borderColor: colors.border }]}
                        disabled={isSyncing}
                    >
                        {isSyncing ? (
                            <ActivityIndicator size="small" color={colors.primary} />
                        ) : (
                            <Ionicons name="sync-outline" size={20} color={colors.primary} />
                        )}
                    </TouchableOpacity>
                    {isStaff && (
                        <TouchableOpacity
                            style={[styles.newButton, { backgroundColor: colors.primary }]}
                            onPress={() => router.push('/(app)/clinical/new-patient')}
                        >
                            <Ionicons name="add" size={20} color="#FFF" />
                            <Text style={styles.newButtonText}>New</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Monitoring & Personal Filters */}
            <View style={styles.topFilterBar}>
                {(isSupervisor || isAdmin) && (
                    <TouchableOpacity
                        style={[styles.modeToggle, { borderColor: colors.border, backgroundColor: monitoringMode ? colors.primary + '15' : 'transparent' }]}
                        onPress={() => { setMonitoringMode(!monitoringMode); setSelectedUnitId(null); }}
                    >
                        <Ionicons name={monitoringMode ? "business" : "business-outline"} size={16} color={monitoringMode ? colors.primary : colors.textSecondary} />
                        <Text style={[styles.modeToggleText, { color: monitoringMode ? colors.primary : colors.textSecondary }]}>
                            {monitoringMode ? 'Facility View' : 'Unit View'}
                        </Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    style={[styles.modeToggle, { borderColor: colors.border, backgroundColor: showMyCasesOnly ? colors.primary + '15' : 'transparent' }]}
                    onPress={() => setShowMyCasesOnly(!showMyCasesOnly)}
                >
                    <Ionicons name={showMyCasesOnly ? "person" : "person-outline"} size={16} color={showMyCasesOnly ? colors.primary : colors.textSecondary} />
                    <Text style={[styles.modeToggleText, { color: showMyCasesOnly ? colors.primary : colors.textSecondary }]}>
                        My Cases
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Filters Row */}
            <View style={styles.dropdownRow}>
                {(monitoringMode || availableUnits.length > 1) && (
                    <Dropdown
                        label="Filter by Unit"
                        value={selectedUnitId}
                        options={unitOptions}
                        onSelect={setSelectedUnitId}
                        allLabel={monitoringMode ? 'All Units' : 'Current Unit'}
                        icon="grid-outline"
                    />
                )}
                
                <Dropdown
                    label="Case Status"
                    value={filter}
                    options={statusOptions}
                    onSelect={setFilter}
                    allLabel={`All Cases (${unitFilteredProfiles.length})`}
                    icon="funnel-outline"
                />
            </View>

            {/* Profile list */}
            <FlatList
                data={filteredProfiles}
                renderItem={renderProfile}
                keyExtractor={(item) => item.local_id}
                contentContainerStyle={styles.list}
                refreshControl={
                    <RefreshControl
                        refreshing={isLoading}
                        onRefresh={() => { refreshProfiles(); if (isSupervisor || isAdmin) fetchAllFacilityProfiles(); }}
                        tintColor={colors.primary}
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="medical-outline" size={48} color={colors.textSecondary} />
                        <Text style={[styles.emptyTitle, { color: colors.text }]}>No Cases</Text>
                        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                            {isStaff
                                ? 'Tap "New" to create a patient record'
                                : 'No maternal profiles in this unit yet'}
                        </Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

// ── Helpers ──────────────────────────────────────────────────

function formatTimeAgo(dateStr: string): string {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diff = Math.floor((now - then) / 1000);

    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
    },
    headerTitle: { ...Typography.headingLg },
    headerSubtitle: { ...Typography.bodySm, marginTop: 2 },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    topFilterBar: {
        flexDirection: 'row',
        paddingHorizontal: Spacing.md,
        paddingBottom: Spacing.md,
        gap: Spacing.sm,
    },
    modeToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.smd,
        paddingVertical: 6,
        borderRadius: Radius.md,
        borderWidth: 1,
        gap: 6,
    },
    modeToggleText: { ...Typography.labelSm },
    syncButton: {
        width: 40,
        height: 40,
        borderRadius: Radius.md,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    newButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: Radius.md,
        gap: 4,
    },
    newButtonText: { color: '#FFF', ...Typography.buttonMd },

    dropdownRow: {
        flexDirection: 'row',
        paddingHorizontal: Spacing.md,
        paddingBottom: Spacing.md,
        gap: Spacing.sm,
    },

    list: { paddingHorizontal: Spacing.md, paddingBottom: 100 },
    card: {
        borderRadius: Radius.lg,
        borderWidth: 1,
        padding: Spacing.md,
        marginBottom: Spacing.smd,
        ...Shadows.sm,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    patientInfo: { flex: 1 },
    patientId: { ...Typography.labelLg },
    patientAge: { ...Typography.bodySm, marginTop: 2 },
    riskBadge: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xxs,
        borderRadius: Radius.sm,
        borderWidth: 1,
    },
    riskText: { ...Typography.labelSm },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: Spacing.sm,
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
    statusText: { ...Typography.labelSm },
    unitChip: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: 3,
        borderRadius: Radius.full,
        maxWidth: 100,
    },
    unitChipText: { ...Typography.labelSm, fontSize: 10 },
    syncBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 3,
        borderRadius: Radius.full,
        gap: 3,
    },
    syncText: { ...Typography.overline, fontSize: 10 },
    timeText: { ...Typography.bodySm, marginLeft: 'auto' },
    factorsPreview: { marginTop: Spacing.sm },
    factorsText: { ...Typography.bodySm, fontStyle: 'italic' },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.xxxl * 2,
        gap: Spacing.sm,
    },
    emptyTitle: { ...Typography.headingMd },
    emptySubtitle: { ...Typography.bodySm, textAlign: 'center' },
});
