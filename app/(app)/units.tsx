import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ScreenContainer } from '@/components/ui/screen-container';
import { Skeleton } from '@/components/ui/skeleton';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useAppTheme } from '@/context/theme';
import { useToast } from '@/context/toast';
import { supabase } from '@/lib/supabase';
import * as Haptics from 'expo-haptics';
import { Stack } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    Modal,
    Platform,
    Pressable,
    RefreshControl,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

const isWeb = Platform.OS === 'web';

type StaffMember = {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    role: string;
};

type UnitWithStaff = {
    id: string;
    name: string;
    description: string | null;
    staff: StaffMember[];
};

export default function UnitsScreen() {
    const { theme } = useAppTheme();
    const c = Colors[theme];
    const { user } = useAuth();
    const { showToast } = useToast();

    const [units, setUnits] = useState<UnitWithStaff[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [facilityId, setFacilityId] = useState<string | null>(null);

    // Modal
    const [modalVisible, setModalVisible] = useState(false);
    const [editingUnit, setEditingUnit] = useState<UnitWithStaff | null>(null);
    const [unitName, setUnitName] = useState('');
    const [unitDesc, setUnitDesc] = useState('');
    const [saving, setSaving] = useState(false);

    // View / expand
    const [viewUnit, setViewUnit] = useState<UnitWithStaff | null>(null);

    /* ── Data ───────────────────────────────────── */

    const fetchUnits = useCallback(async () => {
        try {
            if (!user?.id) return;
            const { data: profile } = await supabase
                .from('profiles').select('facility_id').eq('id', user.id).maybeSingle();
            if (!profile?.facility_id) { setLoading(false); return; }
            setFacilityId(profile.facility_id);

            const { data: unitData, error } = await supabase
                .from('units').select('id, name, description')
                .eq('facility_id', profile.facility_id).order('name');
            if (error) throw error;
            if (!unitData) { setUnits([]); return; }

            const unitIds = unitData.map(u => u.id);
            const { data: memberships } = await supabase
                .from('unit_memberships').select('unit_id, profile_id')
                .in('unit_id', unitIds).eq('status', 'approved');

            const staffIds = [...new Set(memberships?.map(m => m.profile_id) || [])];
            let staffProfiles: StaffMember[] = [];
            if (staffIds.length > 0) {
                const { data } = await supabase
                    .from('profiles').select('id, full_name, avatar_url, role').in('id', staffIds);
                staffProfiles = data || [];
            }

            const enriched: UnitWithStaff[] = unitData.map(u => ({
                ...u,
                staff: staffProfiles.filter(s =>
                    memberships?.some(m => m.unit_id === u.id && m.profile_id === s.id)
                ),
            }));
            setUnits(enriched);
        } catch (e: any) {
            showToast(e.message || 'Failed to load units', 'error');
        } finally { setLoading(false); setRefreshing(false); }
    }, [user?.id]);

    useEffect(() => { if (user?.id) fetchUnits(); }, [user?.id]);

    /* ── CRUD ───────────────────────────────────── */

    const openCreate = () => { setEditingUnit(null); setUnitName(''); setUnitDesc(''); setModalVisible(true); };
    const openEdit = (u: UnitWithStaff) => { setEditingUnit(u); setUnitName(u.name); setUnitDesc(u.description || ''); setModalVisible(true); };

    const handleSave = async () => {
        if (!unitName.trim()) { showToast('Unit name is required', 'error'); return; }
        if (!facilityId) return;
        setSaving(true);
        try {
            if (editingUnit) {
                const { error } = await supabase.from('units')
                    .update({ name: unitName.trim(), description: unitDesc.trim() || null })
                    .eq('id', editingUnit.id);
                if (error) throw error;
                if (!isWeb) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                showToast('Unit updated', 'success');
            } else {
                const { error } = await supabase.from('units')
                    .insert({ name: unitName.trim(), description: unitDesc.trim() || null, facility_id: facilityId });
                if (error) throw error;
                if (!isWeb) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                showToast('Unit created', 'success');
            }
            setModalVisible(false);
            fetchUnits();
        } catch (e: any) { showToast(e.message || 'Failed to save', 'error'); }
        finally { setSaving(false); }
    };

    const handleDelete = (u: UnitWithStaff) => {
        const doDelete = async () => {
            try {
                const { error } = await supabase.from('units').delete().eq('id', u.id);
                if (error) throw error;
                if (!isWeb) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                showToast('Unit deleted', 'success');
                if (viewUnit?.id === u.id) setViewUnit(null);
                fetchUnits();
            } catch (e: any) { showToast(e.message || 'Failed to delete', 'error'); }
        };
        if (isWeb) {
            if (confirm(`Delete "${u.name}"? Staff assignments will be removed.`)) doDelete();
        } else {
            Alert.alert('Delete Unit', `Delete "${u.name}"?`, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: doDelete },
            ]);
        }
    };

    const roleColor = (role: string) => {
        const m: Record<string, string> = { midwife: c.secondary, nurse: '#3B82F6', student: '#8B5CF6', supervisor: c.primary };
        return m[role] || c.textSecondary;
    };

    /* ── Desktop web layout ────────────────────── */

    if (isWeb) {
        return (
            <>
                <Stack.Screen options={{ title: 'My Units', headerShown: true }} />
                <ScreenContainer scroll={false} contentContainerStyle={styles.webRoot}>
                    <View style={styles.webPageHeader}>
                        <View>
                            <ThemedText style={[Typography.headingLg, { color: c.text }]}>Unit Management</ThemedText>
                            <ThemedText type="bodyMd" color="secondary">
                                {units.length} {units.length === 1 ? 'unit' : 'units'} in your facility
                            </ThemedText>
                        </View>
                        <Pressable
                            onPress={openCreate}
                            style={({ hovered }) => [styles.webPrimaryBtn, { backgroundColor: hovered ? c.accent : c.primary }]}
                        >
                            <IconSymbol name="plus" size={18} color="#fff" />
                            <ThemedText style={[Typography.buttonMd, { color: '#fff' }]}>Add Unit</ThemedText>
                        </Pressable>
                    </View>

                    {/* Table */}
                    <View style={[styles.webTable, { backgroundColor: c.card, borderColor: c.border }]}>
                        <View style={[styles.webTableHeaderRow, { borderBottomColor: c.border }]}>
                            <ThemedText type="labelSm" color="secondary" style={[styles.webCol, { flex: 3 }]}>Unit</ThemedText>
                            <ThemedText type="labelSm" color="secondary" style={styles.webCol}>Staff</ThemedText>
                            <ThemedText type="labelSm" color="secondary" style={[styles.webCol, { flex: 2 }]}>Actions</ThemedText>
                        </View>

                        {loading ? (
                            <View style={{ padding: Spacing.lg, gap: Spacing.sm }}>
                                {[1, 2, 3].map(i => <Skeleton key={i} width="100%" height={48} borderRadius={Radius.sm} />)}
                            </View>
                        ) : units.length === 0 ? (
                            <View style={styles.webEmptyState}>
                                <IconSymbol name="square.grid.2x2.fill" size={40} color={c.textSecondary} />
                                <ThemedText type="labelLg" style={{ marginTop: Spacing.sm }}>No Units</ThemedText>
                                <ThemedText type="bodySm" color="secondary">Create a unit to organize staff.</ThemedText>
                            </View>
                        ) : (
                            units.map((u, i) => (
                                <Animated.View key={u.id} entering={FadeInDown.delay(i * 40).springify()}>
                                    <Pressable
                                        onPress={() => setViewUnit(viewUnit?.id === u.id ? null : u)}
                                        style={({ hovered }) => [
                                            styles.webTableRow, { borderBottomColor: c.border },
                                            hovered && { backgroundColor: c.primary + '06' },
                                            viewUnit?.id === u.id && { backgroundColor: c.primary + '0A' },
                                        ]}
                                    >
                                        <View style={[styles.webCol, { flex: 3, gap: 2 }]}>
                                            <ThemedText type="labelMd">{u.name}</ThemedText>
                                            {u.description && <ThemedText type="bodySm" color="secondary" numberOfLines={1}>{u.description}</ThemedText>}
                                        </View>
                                        <View style={styles.webCol}>
                                            <View style={[styles.badge, { backgroundColor: c.primary + '12' }]}>
                                                <ThemedText style={[Typography.labelSm, { color: c.primary }]}>{u.staff.length}</ThemedText>
                                            </View>
                                        </View>
                                        <View style={[styles.webCol, { flex: 2, flexDirection: 'row', gap: Spacing.sm }]}>
                                            <Pressable
                                                onPress={(e) => { e.stopPropagation(); setViewUnit(u); }}
                                                style={({ hovered }) => [styles.webActionBtn, hovered && { backgroundColor: c.primary + '12' }]}
                                            >
                                                <IconSymbol name="eye" size={16} color={c.primary} />
                                                <ThemedText style={[Typography.labelSm, { color: c.primary }]}>View</ThemedText>
                                            </Pressable>
                                            <Pressable
                                                onPress={(e) => { e.stopPropagation(); openEdit(u); }}
                                                style={({ hovered }) => [styles.webActionBtn, hovered && { backgroundColor: c.warning + '12' }]}
                                            >
                                                <IconSymbol name="pencil" size={16} color={c.warning} />
                                                <ThemedText style={[Typography.labelSm, { color: c.warning }]}>Edit</ThemedText>
                                            </Pressable>
                                            <Pressable
                                                onPress={(e) => { e.stopPropagation(); handleDelete(u); }}
                                                style={({ hovered }) => [styles.webActionBtn, hovered && { backgroundColor: c.error + '12' }]}
                                            >
                                                <IconSymbol name="trash" size={16} color={c.error} />
                                                <ThemedText style={[Typography.labelSm, { color: c.error }]}>Delete</ThemedText>
                                            </Pressable>
                                        </View>
                                    </Pressable>
                                </Animated.View>
                            ))
                        )}
                    </View>

                    {/* Detail Panel */}
                    {viewUnit && (
                        <Animated.View
                            entering={FadeInDown.springify()}
                            style={[styles.webDetailPanel, { backgroundColor: c.card, borderColor: c.border }]}
                        >
                            <View style={styles.webDetailHeader}>
                                <View style={{ flex: 1 }}>
                                    <ThemedText style={[Typography.headingMd, { color: c.text }]}>{viewUnit.name}</ThemedText>
                                    {viewUnit.description && (
                                        <ThemedText type="bodyMd" color="secondary" style={{ marginTop: 4 }}>{viewUnit.description}</ThemedText>
                                    )}
                                </View>
                                <Pressable onPress={() => setViewUnit(null)}>
                                    <IconSymbol name="xmark" size={20} color={c.textSecondary} />
                                </Pressable>
                            </View>

                            <ThemedText type="labelMd" style={{ marginTop: Spacing.lg, marginBottom: Spacing.sm }}>
                                Assigned Staff ({viewUnit.staff.length})
                            </ThemedText>

                            {viewUnit.staff.length === 0 ? (
                                <ThemedText type="bodySm" color="secondary">
                                    No staff assigned. Use Pending Approvals to assign staff to this unit.
                                </ThemedText>
                            ) : (
                                viewUnit.staff.map(member => (
                                    <View key={member.id} style={[styles.webStaffRow, { borderBottomColor: c.border }]}>
                                        <View style={[styles.avatar, { backgroundColor: c.primary + '15' }]}>
                                            <ThemedText style={[Typography.labelSm, { color: c.primary }]}>
                                                {(member.full_name || '?')[0].toUpperCase()}
                                            </ThemedText>
                                        </View>
                                        <ThemedText type="bodyMd" style={{ flex: 1 }}>
                                            {member.full_name || 'Unnamed'}
                                        </ThemedText>
                                        <View style={[styles.roleBadge, { backgroundColor: roleColor(member.role) + '12' }]}>
                                            <ThemedText style={[Typography.overline, { color: roleColor(member.role) }]}>
                                                {member.role}
                                            </ThemedText>
                                        </View>
                                    </View>
                                ))
                            )}
                        </Animated.View>
                    )}
                </ScreenContainer>
                {renderModal()}
            </>
        );
    }

    /* ── Mobile layout ─────────────────────────── */

    return (
        <>
            <Stack.Screen options={{ title: 'My Units', headerShown: true }} />
            <ScreenContainer
                scrollViewProps={{
                    refreshControl: <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchUnits(); }} />,
                }}
            >
                <View style={styles.header}>
                    <View>
                        <ThemedText type="headingLg">My Units</ThemedText>
                        <ThemedText type="bodySm" color="secondary">
                            {units.length} {units.length === 1 ? 'unit' : 'units'}
                        </ThemedText>
                    </View>
                    <Button title="+ Add" onPress={openCreate} />
                </View>

                {loading ? (
                    <View style={styles.list}>
                        {[1, 2, 3].map(i => <Skeleton key={i} width="100%" height={100} borderRadius={Radius.lg} />)}
                    </View>
                ) : units.length === 0 ? (
                    <Card style={styles.emptyCard}>
                        <IconSymbol name="square.grid.2x2.fill" size={48} color={c.textSecondary} />
                        <ThemedText type="labelLg">No units yet</ThemedText>
                        <ThemedText type="bodySm" color="secondary" style={{ textAlign: 'center' }}>
                            Create a unit to organize your staff.
                        </ThemedText>
                    </Card>
                ) : (
                    <View style={styles.list}>
                        {units.map((unit, i) => (
                            <Animated.View key={unit.id} entering={FadeInDown.delay(i * 60).springify()}>
                                <Card style={styles.mobileCard}>
                                    <View style={styles.mobileCardHeader}>
                                        <View style={[styles.mobileIcon, { backgroundColor: c.primary + '12' }]}>
                                            <IconSymbol name="square.grid.2x2.fill" size={20} color={c.primary} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <ThemedText type="labelLg">{unit.name}</ThemedText>
                                            {unit.description && <ThemedText type="bodySm" color="secondary" numberOfLines={2}>{unit.description}</ThemedText>}
                                        </View>
                                        <View style={[styles.badge, { backgroundColor: c.primary + '12' }]}>
                                            <ThemedText style={[Typography.labelSm, { color: c.primary }]}>{unit.staff.length}</ThemedText>
                                        </View>
                                    </View>

                                    <View style={[styles.mobileActions, { borderTopColor: c.border }]}>
                                        <Pressable onPress={() => setViewUnit(unit)} style={styles.mobileActionBtn}>
                                            <IconSymbol name="eye" size={16} color={c.primary} />
                                            <ThemedText type="labelSm" style={{ color: c.primary }}>View</ThemedText>
                                        </Pressable>
                                        <Pressable onPress={() => openEdit(unit)} style={styles.mobileActionBtn}>
                                            <IconSymbol name="pencil" size={16} color={c.warning} />
                                            <ThemedText type="labelSm" style={{ color: c.warning }}>Edit</ThemedText>
                                        </Pressable>
                                        <Pressable onPress={() => handleDelete(unit)} style={styles.mobileActionBtn}>
                                            <IconSymbol name="trash" size={16} color={c.error} />
                                            <ThemedText type="labelSm" style={{ color: c.error }}>Delete</ThemedText>
                                        </Pressable>
                                    </View>
                                </Card>
                            </Animated.View>
                        ))}
                    </View>
                )}

                {/* Mobile staff detail modal */}
                <Modal visible={!!viewUnit} animationType="slide" transparent>
                    <View style={[styles.modalOverlay, { backgroundColor: c.overlay }]}>
                        <View style={[styles.modalContent, { backgroundColor: c.background }]}>
                            {viewUnit && (
                                <>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <ThemedText type="headingMd">{viewUnit.name}</ThemedText>
                                        <Pressable onPress={() => setViewUnit(null)}>
                                            <IconSymbol name="xmark" size={20} color={c.textSecondary} />
                                        </Pressable>
                                    </View>
                                    {viewUnit.description && (
                                        <ThemedText type="bodyMd" color="secondary" style={{ marginTop: Spacing.xs }}>{viewUnit.description}</ThemedText>
                                    )}
                                    <ThemedText type="labelMd" style={{ marginTop: Spacing.lg, marginBottom: Spacing.sm }}>
                                        Assigned Staff ({viewUnit.staff.length})
                                    </ThemedText>
                                    {viewUnit.staff.length === 0 ? (
                                        <ThemedText type="bodySm" color="secondary">No staff assigned yet.</ThemedText>
                                    ) : (
                                        viewUnit.staff.map(member => (
                                            <View key={member.id} style={[styles.mobileStaffRow, { borderBottomColor: c.border }]}>
                                                <View style={[styles.avatar, { backgroundColor: c.primary + '15' }]}>
                                                    <ThemedText style={[Typography.labelSm, { color: c.primary }]}>
                                                        {(member.full_name || '?')[0].toUpperCase()}
                                                    </ThemedText>
                                                </View>
                                                <ThemedText type="bodyMd" style={{ flex: 1 }}>{member.full_name || 'Unnamed'}</ThemedText>
                                                <View style={[styles.roleBadge, { backgroundColor: roleColor(member.role) + '12' }]}>
                                                    <ThemedText style={[Typography.overline, { color: roleColor(member.role) }]}>{member.role}</ThemedText>
                                                </View>
                                            </View>
                                        ))
                                    )}
                                    <Button title="Close" variant="outline" onPress={() => setViewUnit(null)} style={{ marginTop: Spacing.lg }} />
                                </>
                            )}
                        </View>
                    </View>
                </Modal>
            </ScreenContainer>
            {renderModal()}
        </>
    );

    /* ── Shared modal ──────────────────────────── */
    function renderModal() {
        return (
            <Modal visible={modalVisible} animationType="slide" transparent>
                <View style={[styles.modalOverlay, { backgroundColor: c.overlay }]}>
                    <View style={[styles.modalContent, { backgroundColor: c.background }, isWeb && styles.modalWeb]}>
                        <ThemedText type="headingMd" style={styles.modalTitle}>
                            {editingUnit ? 'Edit Unit' : 'New Unit'}
                        </ThemedText>

                        <ThemedText type="labelSm" color="secondary" style={styles.inputLabel}>Unit Name *</ThemedText>
                        <TextInput
                            value={unitName}
                            onChangeText={setUnitName}
                            placeholder="e.g. Labour Ward 1"
                            placeholderTextColor={c.placeholder}
                            style={[styles.input, { color: c.text, backgroundColor: c.inputBackground, borderColor: c.inputBorder }]}
                        />

                        <ThemedText type="labelSm" color="secondary" style={styles.inputLabel}>Description</ThemedText>
                        <TextInput
                            value={unitDesc}
                            onChangeText={setUnitDesc}
                            placeholder="e.g. Active labour monitoring"
                            placeholderTextColor={c.placeholder}
                            multiline numberOfLines={3}
                            style={[styles.input, styles.textArea, { color: c.text, backgroundColor: c.inputBackground, borderColor: c.inputBorder }]}
                        />

                        <View style={styles.modalActions}>
                            <Button title="Cancel" variant="outline" onPress={() => setModalVisible(false)} style={{ flex: 1 }} />
                            <Button
                                title={saving ? 'Saving...' : (editingUnit ? 'Update' : 'Create')}
                                onPress={handleSave} loading={saving} disabled={saving} style={{ flex: 1 }}
                            />
                        </View>
                    </View>
                </View>
            </Modal>
        );
    }
}

const styles = StyleSheet.create({
    /* ── Web ───────────────────────────────── */
    webRoot: {
        maxWidth: 1200,
        alignSelf: 'center' as any,
        width: '100%',
        flex: 1,
    },
    webPageHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    webPrimaryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.smd,
        borderRadius: Radius.md,
        cursor: 'pointer' as any,
    },
    webTable: {
        borderRadius: Radius.lg,
        borderWidth: 1,
        overflow: 'hidden' as any,
    },
    webTableHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.smd,
        borderBottomWidth: 1,
    },
    webTableRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        cursor: 'pointer' as any,
        transitionDuration: '100ms' as any,
    },
    webCol: {
        flex: 1,
        justifyContent: 'center' as any,
    },
    webActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs,
        borderRadius: Radius.sm,
        cursor: 'pointer' as any,
    },
    webEmptyState: {
        alignItems: 'center',
        padding: Spacing.xxl,
        gap: Spacing.xs,
    },
    webDetailPanel: {
        marginTop: Spacing.md,
        borderRadius: Radius.lg,
        borderWidth: 1,
        padding: Spacing.lg,
    },
    webDetailHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.md,
    },
    webStaffRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.smd,
        borderBottomWidth: 1,
        gap: Spacing.smd,
    },

    /* ── Mobile ────────────────────────────── */
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    list: {
        gap: Spacing.smd,
    },
    emptyCard: {
        alignItems: 'center',
        padding: Spacing.xxl,
        gap: Spacing.md,
    },
    mobileCard: {
        gap: Spacing.smd,
    },
    mobileCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.smd,
    },
    mobileIcon: {
        width: 40,
        height: 40,
        borderRadius: Radius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    mobileActions: {
        flexDirection: 'row',
        borderTopWidth: 1,
        paddingTop: Spacing.smd,
        gap: Spacing.md,
    },
    mobileActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: Spacing.xs,
    },
    mobileStaffRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.smd,
        borderBottomWidth: 1,
        gap: Spacing.smd,
    },

    /* ── Shared ────────────────────────────── */
    badge: {
        paddingHorizontal: Spacing.smd,
        paddingVertical: Spacing.xs,
        borderRadius: Radius.full,
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    roleBadge: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        borderRadius: Radius.full,
    },

    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.lg,
    },
    modalContent: {
        width: '100%',
        borderRadius: Radius.xl,
        padding: Spacing.lg,
        maxWidth: 500,
    },
    modalWeb: {
        maxWidth: 520,
    },
    modalTitle: {
        marginBottom: Spacing.lg,
    },
    inputLabel: {
        marginBottom: Spacing.xs,
        marginTop: Spacing.smd,
    },
    input: {
        borderWidth: 1,
        borderRadius: Radius.md,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.smd,
        fontSize: 16,
    },
    textArea: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    modalActions: {
        flexDirection: 'row',
        gap: Spacing.smd,
        marginTop: Spacing.lg,
    },
});
