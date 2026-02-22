import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ScreenContainer } from '@/components/ui/screen-container';
import { Skeleton } from '@/components/ui/skeleton';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { useAppTheme } from '@/context/theme';
import { useToast } from '@/context/toast';
import { supabase } from '@/lib/supabase';
import * as Haptics from 'expo-haptics';
import { Stack } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Modal,
    Platform, Pressable,
    RefreshControl, ScrollView,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

const isWeb = Platform.OS === 'web';

type Facility = {
    id: string;
    name: string;
    location: string | null;
    unitCount: number;
    staffCount: number;
    codes: FacilityCode[];
};

type FacilityCode = {
    id: string;
    role: string;
    code: string;
    is_active: boolean;
};

type PreviewCode = {
    role: string;
    code: string;
};

const ROLES = ['supervisor', 'midwife', 'nurse', 'student'] as const;

/* ── Code Generation ────────────────────────────────── */

const SKIP_WORDS = new Set(['of', 'the', 'and', 'in', 'at', 'for', 'a', 'an']);
const ROLE_SUFFIX: Record<string, string> = {
    supervisor: 'SUP',
    midwife: 'MID',
    nurse: 'NRS',
    student: 'STU',
};

function generateCodePrefix(facilityName: string): string {
    const words = facilityName
        .trim()
        .split(/\s+/)
        .filter(w => w.length > 0)
        .map(w => w.replace(/[^a-zA-Z]/g, ''));

    if (words.length === 0) return 'FAC';

    const significant = words.filter(w => !SKIP_WORDS.has(w.toLowerCase()));

    if (significant.length === 0) return words[0].substring(0, 3).toUpperCase();
    if (significant.length === 1) return significant[0].substring(0, 3).toUpperCase();

    // Acronym from first letter of each significant word (up to 5)
    return significant.map(w => w[0]).join('').toUpperCase().substring(0, 5);
}

function generateRoleCode(prefix: string, role: string, digit: number): string {
    return `${prefix}${digit}-${ROLE_SUFFIX[role] || role.substring(0, 3).toUpperCase()}`;
}

/** Generate preview codes, checking against existing codes to ensure uniqueness */
function generatePreviewCodes(facilityName: string, existingCodes: string[]): PreviewCode[] {
    const prefix = generateCodePrefix(facilityName);
    const existing = new Set(existingCodes.map(c => c.toUpperCase()));

    // Find the lowest digit where ALL 4 role codes are unique
    let digit = 1;
    while (digit <= 999) {
        const candidates = ROLES.map(role => ({
            role,
            code: generateRoleCode(prefix, role, digit),
        }));
        const allUnique = candidates.every(c => !existing.has(c.code));
        if (allUnique) return candidates;
        digit++;
    }

    // Fallback (should never happen)
    return ROLES.map(role => ({
        role,
        code: generateRoleCode(prefix, role, digit),
    }));
}

export default function FacilitiesScreen() {
    const { theme } = useAppTheme();
    const c = Colors[theme];
    const { showToast } = useToast();

    const [facilities, setFacilities] = useState<Facility[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Create / Edit modal
    const [modalVisible, setModalVisible] = useState(false);
    const [editingFacility, setEditingFacility] = useState<Facility | null>(null);
    const [name, setName] = useState('');
    const [location, setLocation] = useState('');
    const [saving, setSaving] = useState(false);
    const [previewCodes, setPreviewCodes] = useState<PreviewCode[]>([]);

    // View modal (with codes + inline editing)
    const [viewFacility, setViewFacility] = useState<Facility | null>(null);
    const [editingCode, setEditingCode] = useState<{ id: string; value: string } | null>(null);

    /* ── Data fetching ─────────────────────────────────── */

    const fetchFacilities = useCallback(async () => {
        try {
            const { data: facData, error } = await supabase
                .from('facilities')
                .select('id, name, location')
                .order('name');
            if (error) throw error;
            if (!facData) { setFacilities([]); return; }

            const [{ data: units }, { data: staff }, { data: codes }] = await Promise.all([
                supabase.from('units').select('id, facility_id'),
                supabase.from('profiles').select('id, facility_id')
                    .in('role', ['midwife', 'nurse', 'student', 'supervisor'])
                    .not('facility_id', 'is', null),
                supabase.from('facility_codes').select('id, facility_id, role, code, is_active'),
            ]);

            const enriched: Facility[] = facData.map(f => ({
                ...f,
                unitCount: units?.filter(u => u.facility_id === f.id).length || 0,
                staffCount: staff?.filter(s => s.facility_id === f.id).length || 0,
                codes: (codes?.filter(cc => cc.facility_id === f.id) || [])
                    .map(cc => ({ id: cc.id, role: cc.role, code: cc.code, is_active: cc.is_active ?? true })),
            }));

            setFacilities(enriched);
        } catch (e: any) {
            showToast(e.message || 'Failed to load facilities', 'error');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [showToast]);

    useEffect(() => { fetchFacilities(); // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* ── Collect all existing codes for uniqueness checks ── */

    const allExistingCodes = useMemo(
        () => facilities.flatMap(f => f.codes.map(cc => cc.code)),
        [facilities],
    );

    /* ── Auto-generate codes on name change (create only) ── */

    const handleNameChange = (val: string) => {
        setName(val);
        if (!editingFacility && val.trim().length >= 2) {
            setPreviewCodes(generatePreviewCodes(val, allExistingCodes));
        } else if (!editingFacility) {
            setPreviewCodes([]);
        }
    };

    const handlePreviewCodeChange = (role: string, newCode: string) => {
        setPreviewCodes(prev => prev.map(pc =>
            pc.role === role ? { ...pc, code: newCode.toUpperCase() } : pc
        ));
    };

    const regenerateCodes = () => {
        if (name.trim().length >= 2) {
            setPreviewCodes(generatePreviewCodes(name, allExistingCodes));
        }
    };

    /* ── CRUD ──────────────────────────────────────────── */

    const openCreate = () => {
        setEditingFacility(null);
        setName('');
        setLocation('');
        setPreviewCodes([]);
        setModalVisible(true);
    };
    const openEdit = (f: Facility) => {
        setEditingFacility(f);
        setName(f.name);
        setLocation(f.location || '');
        setPreviewCodes([]);
        setModalVisible(true);
    };

    const handleSave = async () => {
        if (!name.trim()) { showToast('Facility name is required', 'error'); return; }
        setSaving(true);
        try {
            if (editingFacility) {
                const { error } = await supabase.from('facilities')
                    .update({ name: name.trim(), location: location.trim() || null })
                    .eq('id', editingFacility.id);
                if (error) throw error;
                if (!isWeb) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                showToast('Facility updated', 'success');
            } else {
                // Create facility
                const { data: newFac, error } = await supabase.from('facilities')
                    .insert({ name: name.trim(), location: location.trim() || null })
                    .select('id, name').single();
                if (error) throw error;

                // Insert the previewed (possibly user-edited) codes
                const codesToInsert = previewCodes.length > 0
                    ? previewCodes
                    : generatePreviewCodes(name, allExistingCodes); // fallback

                const { error: codeError } = await supabase.from('facility_codes').insert(
                    codesToInsert.map(pc => ({
                        facility_id: newFac.id,
                        role: pc.role,
                        code: pc.code,
                    }))
                );
                if (codeError) throw codeError;

                if (!isWeb) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                showToast('Facility created with registration codes', 'success');
            }
            setModalVisible(false);
            fetchFacilities();
        } catch (e: any) {
            showToast(e.message || 'Failed to save', 'error');
        } finally { setSaving(false); }
    };

    const handleDelete = (f: Facility) => {
        const doDelete = async () => {
            try {
                const { error } = await supabase.from('facilities').delete().eq('id', f.id);
                if (error) throw error;
                if (!isWeb) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                showToast('Facility deleted', 'success');
                if (viewFacility?.id === f.id) setViewFacility(null);
                fetchFacilities();
            } catch (e: any) { showToast(e.message || 'Failed to delete', 'error'); }
        };
        if (isWeb) {
            if (confirm(`Delete "${f.name}"? All units and codes will be removed.`)) doDelete();
        } else {
            Alert.alert('Delete Facility', `Delete "${f.name}"? All units and codes will be removed.`, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: doDelete },
            ]);
        }
    };

    const handleCodeSave = async (codeId: string, newValue: string) => {
        if (!newValue.trim()) return;
        try {
            const { error } = await supabase.from('facility_codes')
                .update({ code: newValue.trim().toUpperCase() }).eq('id', codeId);
            if (error) throw error;
            showToast('Code updated', 'success');
            setEditingCode(null);
            fetchFacilities();
            // Refresh view modal data
            if (viewFacility) {
                setViewFacility(prev => prev ? {
                    ...prev,
                    codes: prev.codes.map(cc => cc.id === codeId ? { ...cc, code: newValue.trim().toUpperCase() } : cc),
                } : null);
            }
        } catch (e: any) { showToast(e.message || 'Failed to update code', 'error'); }
    };

    const handleToggleCode = async (codeId: string, currentActive: boolean) => {
        try {
            const { error } = await supabase.from('facility_codes')
                .update({ is_active: !currentActive }).eq('id', codeId);
            if (error) throw error;
            if (!isWeb) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showToast(currentActive ? 'Code deactivated' : 'Code activated', 'success');
            fetchFacilities();
            // Refresh view modal data
            if (viewFacility) {
                setViewFacility(prev => prev ? {
                    ...prev,
                    codes: prev.codes.map(cc => cc.id === codeId ? { ...cc, is_active: !currentActive } : cc),
                } : null);
            }
        } catch (e: any) { showToast(e.message || 'Failed to toggle code', 'error'); }
    };

    const roleLabel = (role: string) => {
        const m: Record<string, string> = { supervisor: 'Supervisor', midwife: 'Midwife', nurse: 'Nurse', student: 'Student' };
        return m[role] || role;
    };
    const roleColor = (role: string) => {
        const m: Record<string, string> = { supervisor: c.primary, midwife: c.secondary, nurse: '#3B82F6', student: '#8B5CF6' };
        return m[role] || c.textSecondary;
    };

    /* ── View Modal (shared web + mobile) ──────────────── */

    function renderViewModal() {
        return (
            <Modal visible={!!viewFacility} animationType="fade" transparent>
                <View style={[styles.modalOverlay, { backgroundColor: c.overlay }]}>
                    <View style={[styles.viewModalContent, { backgroundColor: c.background }, isWeb && styles.viewModalWeb]}>
                        {viewFacility && (
                            <ScrollView showsVerticalScrollIndicator={false}>
                                {/* Header */}
                                <View style={styles.viewModalHeader}>
                                    <View style={[styles.viewIconCircle, { backgroundColor: c.primary + '12' }]}>
                                        <IconSymbol name="building.2" size={24} color={c.primary} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <ThemedText style={[Typography.headingMd, { color: c.text }]}>
                                            {viewFacility.name}
                                        </ThemedText>
                                        {viewFacility.location && (
                                            <ThemedText type="bodyMd" color="secondary" style={{ marginTop: 2 }}>
                                                📍 {viewFacility.location}
                                            </ThemedText>
                                        )}
                                    </View>
                                    <Pressable onPress={() => { setViewFacility(null); setEditingCode(null); }}>
                                        <IconSymbol name="xmark.circle.fill" size={28} color={c.textSecondary} />
                                    </Pressable>
                                </View>

                                {/* Stats */}
                                <View style={styles.viewStatsRow}>
                                    <View style={[styles.viewStat, { backgroundColor: c.primary + '08', borderColor: c.primary + '18' }]}>
                                        <IconSymbol name="square.grid.2x2.fill" size={18} color={c.primary} />
                                        <ThemedText style={[Typography.statMd, { color: c.primary }]}>{viewFacility.unitCount}</ThemedText>
                                        <ThemedText type="labelSm" color="secondary">Units</ThemedText>
                                    </View>
                                    <View style={[styles.viewStat, { backgroundColor: c.secondary + '08', borderColor: c.secondary + '18' }]}>
                                        <IconSymbol name="person.2.fill" size={18} color={c.secondary} />
                                        <ThemedText style={[Typography.statMd, { color: c.secondary }]}>{viewFacility.staffCount}</ThemedText>
                                        <ThemedText type="labelSm" color="secondary">Staff</ThemedText>
                                    </View>
                                    <View style={[styles.viewStat, { backgroundColor: c.success + '08', borderColor: c.success + '18' }]}>
                                        <IconSymbol name="key.fill" size={18} color={c.success} />
                                        <ThemedText style={[Typography.statMd, { color: c.success }]}>{viewFacility.codes.length}</ThemedText>
                                        <ThemedText type="labelSm" color="secondary">Codes</ThemedText>
                                    </View>
                                </View>

                                {/* Registration Codes */}
                                <View style={styles.viewCodesSection}>
                                    <ThemedText type="labelMd" style={{ marginBottom: Spacing.sm }}>
                                        Registration Codes
                                    </ThemedText>
                                    <ThemedText type="bodySm" color="secondary" style={{ marginBottom: Spacing.md }}>
                                        Click any code to edit it. Use the toggle to activate or deactivate codes.
                                    </ThemedText>

                                    {viewFacility.codes.length === 0 ? (
                                        <ThemedText type="bodySm" color="secondary">No codes generated.</ThemedText>
                                    ) : (
                                        viewFacility.codes.map(code => (
                                            <View key={code.id} style={[styles.codeRow, { borderBottomColor: c.border }, !code.is_active && { opacity: 0.5 }]}>
                                                <View style={[styles.codeRoleDot, { backgroundColor: code.is_active ? roleColor(code.role) : c.textSecondary }]} />
                                                <View style={{ flex: 1 }}>
                                                    <ThemedText type="bodyMd" style={!code.is_active ? { textDecorationLine: 'line-through' as any } : undefined}>
                                                        {roleLabel(code.role)}
                                                    </ThemedText>
                                                    {!code.is_active && (
                                                        <ThemedText type="bodySm" style={{ color: c.error, fontSize: 11 }}>Inactive</ThemedText>
                                                    )}
                                                </View>
                                                {editingCode?.id === code.id ? (
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                                                        <TextInput
                                                            value={editingCode.value}
                                                            onChangeText={v => setEditingCode({ id: code.id, value: v })}
                                                            autoCapitalize="characters"
                                                            autoFocus
                                                            style={[styles.codeInput, { color: c.text, backgroundColor: c.inputBackground, borderColor: c.inputBorder }]}
                                                        />
                                                        <Pressable onPress={() => handleCodeSave(code.id, editingCode.value)}>
                                                            <IconSymbol name="checkmark.circle.fill" size={24} color={c.success} />
                                                        </Pressable>
                                                        <Pressable onPress={() => setEditingCode(null)}>
                                                            <IconSymbol name="xmark.circle.fill" size={24} color={c.error} />
                                                        </Pressable>
                                                    </View>
                                                ) : (
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                                                        <Pressable
                                                            onPress={() => setEditingCode({ id: code.id, value: code.code })}
                                                            style={({ hovered }: any) => [
                                                                styles.codeBadge,
                                                                { backgroundColor: (code.is_active ? roleColor(code.role) : c.textSecondary) + '10' },
                                                                hovered && { backgroundColor: (code.is_active ? roleColor(code.role) : c.textSecondary) + '20' },
                                                            ]}
                                                        >
                                                            <ThemedText style={[
                                                                Typography.labelMd,
                                                                { color: code.is_active ? roleColor(code.role) : c.textSecondary, fontFamily: 'monospace' },
                                                                !code.is_active && { textDecorationLine: 'line-through' as any },
                                                            ]}>
                                                                {code.code}
                                                            </ThemedText>
                                                            <IconSymbol name="pencil" size={12} color={code.is_active ? roleColor(code.role) : c.textSecondary} />
                                                        </Pressable>
                                                        <Pressable
                                                            onPress={() => handleToggleCode(code.id, code.is_active)}
                                                            style={({ hovered }: any) => [
                                                                styles.toggleBtn,
                                                                {
                                                                    backgroundColor: code.is_active ? c.error + '10' : c.success + '10',
                                                                    borderColor: code.is_active ? c.error + '20' : c.success + '20',
                                                                },
                                                                hovered && {
                                                                    backgroundColor: code.is_active ? c.error + '20' : c.success + '20',
                                                                },
                                                            ]}
                                                        >
                                                            <IconSymbol
                                                                name={code.is_active ? 'pause.circle' : 'play.circle'}
                                                                size={14}
                                                                color={code.is_active ? c.error : c.success}
                                                            />
                                                            <ThemedText style={[Typography.labelSm, { color: code.is_active ? c.error : c.success }]}>
                                                                {code.is_active ? 'Deactivate' : 'Activate'}
                                                            </ThemedText>
                                                        </Pressable>
                                                    </View>
                                                )}
                                            </View>
                                        ))
                                    )}
                                </View>

                                {/* Actions */}
                                <View style={styles.viewActions}>
                                    <Pressable
                                        onPress={() => { setViewFacility(null); setEditingCode(null); }}
                                        style={[styles.viewActionBtn, { backgroundColor: c.card, borderColor: c.border }]}
                                    >
                                        <IconSymbol name="xmark" size={16} color={c.textSecondary} />
                                        <ThemedText style={[Typography.labelMd, { color: c.textSecondary }]}>Close</ThemedText>
                                    </Pressable>
                                    <Pressable
                                        onPress={() => { setViewFacility(null); openEdit(viewFacility); }}
                                        style={[styles.viewActionBtn, { backgroundColor: c.warning + '10', borderColor: c.warning + '20' }]}
                                    >
                                        <IconSymbol name="pencil" size={16} color={c.warning} />
                                        <ThemedText style={[Typography.labelMd, { color: c.warning }]}>Edit</ThemedText>
                                    </Pressable>
                                    <Pressable
                                        onPress={() => handleDelete(viewFacility)}
                                        style={[styles.viewActionBtn, { backgroundColor: c.error + '10', borderColor: c.error + '20' }]}
                                    >
                                        <IconSymbol name="trash" size={16} color={c.error} />
                                        <ThemedText style={[Typography.labelMd, { color: c.error }]}>Delete</ThemedText>
                                    </Pressable>
                                </View>
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>
        );
    }

    /* ── Create / Edit Modal ───────────────────────────── */

    function renderModal() {
        return (
            <Modal visible={modalVisible} animationType="slide" transparent>
                <View style={[styles.modalOverlay, { backgroundColor: c.overlay }]}>
                    <View style={[styles.modalContent, { backgroundColor: c.background }, isWeb && styles.modalWeb]}>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={styles.modalHeader}>
                                <ThemedText type="headingMd" style={{ flex: 1 }}>
                                    {editingFacility ? 'Edit Facility' : 'New Facility'}
                                </ThemedText>
                                <Pressable onPress={() => setModalVisible(false)}>
                                    <IconSymbol name="xmark.circle.fill" size={28} color={c.textSecondary} />
                                </Pressable>
                            </View>

                            <ThemedText type="labelSm" color="secondary" style={styles.inputLabel}>Facility Name *</ThemedText>
                            <TextInput
                                value={name}
                                onChangeText={handleNameChange}
                                placeholder="e.g. Aminu Kano Teaching Hospital"
                                placeholderTextColor={c.placeholder}
                                style={[styles.input, { color: c.text, backgroundColor: c.inputBackground, borderColor: c.inputBorder }]}
                            />

                            <ThemedText type="labelSm" color="secondary" style={styles.inputLabel}>Location</ThemedText>
                            <TextInput
                                value={location}
                                onChangeText={setLocation}
                                placeholder="e.g. Zaria Road, Kano"
                                placeholderTextColor={c.placeholder}
                                style={[styles.input, { color: c.text, backgroundColor: c.inputBackground, borderColor: c.inputBorder }]}
                            />

                            {/* Preview codes (create only) */}
                            {!editingFacility && previewCodes.length > 0 && (
                                <View style={[styles.previewCodesSection, { backgroundColor: c.card, borderColor: c.border }]}>
                                    <View style={styles.previewCodesHeader}>
                                        <View style={{ flex: 1 }}>
                                            <ThemedText type="labelMd">Generated Registration Codes</ThemedText>
                                            <ThemedText type="bodySm" color="secondary">
                                                Edit any code below before saving
                                            </ThemedText>
                                        </View>
                                        <Pressable
                                            onPress={regenerateCodes}
                                            style={({ hovered }: any) => [
                                                styles.regenerateBtn,
                                                { backgroundColor: c.primary + '10' },
                                                hovered && { backgroundColor: c.primary + '20' },
                                            ]}
                                        >
                                            <IconSymbol name="arrow.clockwise" size={14} color={c.primary} />
                                            <ThemedText style={[Typography.labelSm, { color: c.primary }]}>
                                                Regenerate
                                            </ThemedText>
                                        </Pressable>
                                    </View>

                                    {previewCodes.map(pc => (
                                        <View key={pc.role} style={[styles.previewCodeRow, { borderTopColor: c.border }]}>
                                            <View style={[styles.codeRoleDot, { backgroundColor: roleColor(pc.role) }]} />
                                            <ThemedText type="bodyMd" style={{ flex: 1 }}>{roleLabel(pc.role)}</ThemedText>
                                            <TextInput
                                                value={pc.code}
                                                onChangeText={v => handlePreviewCodeChange(pc.role, v)}
                                                autoCapitalize="characters"
                                                style={[
                                                    styles.previewCodeInput,
                                                    {
                                                        color: roleColor(pc.role),
                                                        backgroundColor: roleColor(pc.role) + '08',
                                                        borderColor: roleColor(pc.role) + '20',
                                                    },
                                                ]}
                                            />
                                        </View>
                                    ))}
                                </View>
                            )}

                            {!editingFacility && previewCodes.length === 0 && (
                                <View style={[styles.infoBox, { backgroundColor: c.primary + '08', borderColor: c.primary + '18' }]}>
                                    <IconSymbol name="info.circle" size={16} color={c.primary} />
                                    <ThemedText type="bodySm" color="secondary" style={{ flex: 1 }}>
                                        Type a facility name to auto-generate registration codes.
                                    </ThemedText>
                                </View>
                            )}

                            <View style={styles.modalActions}>
                                <Button title="Cancel" variant="outline" onPress={() => setModalVisible(false)} style={{ flex: 1 }} />
                                <Button
                                    title={saving ? 'Saving...' : (editingFacility ? 'Update' : 'Create')}
                                    onPress={handleSave}
                                    loading={saving}
                                    disabled={saving || (!editingFacility && !name.trim())}
                                    style={{ flex: 1 }}
                                />
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        );
    }

    /* ── Desktop Web Layout ────────────────────────────── */

    if (isWeb) {
        return (
            <>
                <Stack.Screen options={{ title: 'Facilities', headerShown: true }} />
                <ScreenContainer scroll={false} contentContainerStyle={styles.webRoot}>
                    {/* Page header */}
                    <View style={styles.webPageHeader}>
                        <View>
                            <ThemedText style={[Typography.headingLg, { color: c.text }]}>
                                Facility Management
                            </ThemedText>
                            <ThemedText type="bodyMd" color="secondary">
                                {facilities.length} registered {facilities.length === 1 ? 'facility' : 'facilities'}
                            </ThemedText>
                        </View>
                        <Pressable
                            onPress={openCreate}
                            style={({ hovered }) => [
                                styles.webPrimaryBtn,
                                { backgroundColor: hovered ? c.accent : c.primary },
                            ]}
                        >
                            <IconSymbol name="plus" size={18} color="#fff" />
                            <ThemedText style={[Typography.buttonMd, { color: '#fff' }]}>Add Facility</ThemedText>
                        </Pressable>
                    </View>

                    {/* Table */}
                    <View style={[styles.webTable, { backgroundColor: c.card, borderColor: c.border }]}>
                        <View style={[styles.webTableHeaderRow, { borderBottomColor: c.border }]}>
                            <ThemedText type="labelSm" color="secondary" style={[styles.webCol, { flex: 3 }]}>Facility</ThemedText>
                            <ThemedText type="labelSm" color="secondary" style={styles.webCol}>Units</ThemedText>
                            <ThemedText type="labelSm" color="secondary" style={styles.webCol}>Staff</ThemedText>
                            <ThemedText type="labelSm" color="secondary" style={styles.webCol}>Codes</ThemedText>
                            <ThemedText type="labelSm" color="secondary" style={[styles.webCol, { flex: 2 }]}>Actions</ThemedText>
                        </View>

                        {loading ? (
                            <View style={{ padding: Spacing.lg, gap: Spacing.sm }}>
                                {[1, 2, 3].map(i => <Skeleton key={i} width="100%" height={48} borderRadius={Radius.sm} />)}
                            </View>
                        ) : facilities.length === 0 ? (
                            <View style={styles.webEmptyState}>
                                <IconSymbol name="building.2" size={40} color={c.textSecondary} />
                                <ThemedText type="labelLg" style={{ marginTop: Spacing.sm }}>No Facilities</ThemedText>
                                <ThemedText type="bodySm" color="secondary">Create your first healthcare facility.</ThemedText>
                            </View>
                        ) : (
                            facilities.map((f, i) => (
                                <Animated.View key={f.id} entering={FadeInDown.delay(i * 40).springify()}>
                                    <Pressable
                                        onPress={() => setViewFacility(f)}
                                        style={({ hovered }) => [
                                            styles.webTableRow,
                                            { borderBottomColor: c.border },
                                            hovered && { backgroundColor: c.primary + '06' },
                                        ]}
                                    >
                                        <View style={[styles.webCol, { flex: 3 }]}>
                                            <ThemedText type="labelMd">{f.name}</ThemedText>
                                            {f.location && (
                                                <ThemedText type="bodySm" color="secondary" numberOfLines={1}>📍 {f.location}</ThemedText>
                                            )}
                                        </View>
                                        <View style={styles.webCol}>
                                            <View style={[styles.badge, { backgroundColor: c.primary + '12' }]}>
                                                <ThemedText style={[Typography.labelSm, { color: c.primary }]}>{f.unitCount}</ThemedText>
                                            </View>
                                        </View>
                                        <View style={styles.webCol}>
                                            <View style={[styles.badge, { backgroundColor: c.secondary + '12' }]}>
                                                <ThemedText style={[Typography.labelSm, { color: c.secondary }]}>{f.staffCount}</ThemedText>
                                            </View>
                                        </View>
                                        <View style={styles.webCol}>
                                            <View style={[styles.badge, { backgroundColor: c.success + '12' }]}>
                                                <ThemedText style={[Typography.labelSm, { color: c.success }]}>{f.codes.length}</ThemedText>
                                            </View>
                                        </View>
                                        <View style={[styles.webCol, { flex: 2, flexDirection: 'row', gap: Spacing.sm }]}>
                                            <Pressable
                                                onPress={(e) => { e.stopPropagation(); setViewFacility(f); }}
                                                style={({ hovered }) => [styles.webActionBtn, hovered && { backgroundColor: c.primary + '12' }]}
                                            >
                                                <IconSymbol name="eye" size={16} color={c.primary} />
                                                <ThemedText style={[Typography.labelSm, { color: c.primary }]}>View</ThemedText>
                                            </Pressable>
                                            <Pressable
                                                onPress={(e) => { e.stopPropagation(); openEdit(f); }}
                                                style={({ hovered }) => [styles.webActionBtn, hovered && { backgroundColor: c.warning + '12' }]}
                                            >
                                                <IconSymbol name="pencil" size={16} color={c.warning} />
                                                <ThemedText style={[Typography.labelSm, { color: c.warning }]}>Edit</ThemedText>
                                            </Pressable>
                                            <Pressable
                                                onPress={(e) => { e.stopPropagation(); handleDelete(f); }}
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
                </ScreenContainer>

                {renderViewModal()}
                {renderModal()}
            </>
        );
    }

    /* ── Mobile Layout ─────────────────────────────────── */

    return (
        <>
            <Stack.Screen options={{ title: 'Facilities', headerShown: true }} />
            <ScreenContainer
                scrollViewProps={{
                    refreshControl: <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchFacilities(); }} />,
                }}
            >
                <View style={styles.header}>
                    <View>
                        <ThemedText type="headingLg">Facilities</ThemedText>
                        <ThemedText type="bodySm" color="secondary">{facilities.length} registered</ThemedText>
                    </View>
                    <Button title="+ Add" onPress={openCreate} />
                </View>

                {loading ? (
                    <View style={styles.list}>
                        {[1, 2, 3].map(i => <Skeleton key={i} width="100%" height={120} borderRadius={Radius.lg} />)}
                    </View>
                ) : facilities.length === 0 ? (
                    <Card style={styles.emptyCard}>
                        <IconSymbol name="building.2" size={48} color={c.textSecondary} />
                        <ThemedText type="labelLg">No facilities yet</ThemedText>
                        <ThemedText type="bodySm" color="secondary" style={{ textAlign: 'center' }}>
                            Create your first healthcare facility.
                        </ThemedText>
                    </Card>
                ) : (
                    <View style={styles.list}>
                        {facilities.map((f, i) => (
                            <Animated.View key={f.id} entering={FadeInDown.delay(i * 60).springify()}>
                                <Card style={styles.mobileCard}>
                                    <View style={styles.mobileCardHeader}>
                                        <View style={[styles.mobileIcon, { backgroundColor: c.primary + '12' }]}>
                                            <IconSymbol name="building.2" size={22} color={c.primary} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <ThemedText type="labelLg">{f.name}</ThemedText>
                                            {f.location && <ThemedText type="bodySm" color="secondary">📍 {f.location}</ThemedText>}
                                        </View>
                                    </View>

                                    <View style={styles.mobileBadgeRow}>
                                        <View style={[styles.badge, { backgroundColor: c.primary + '10' }]}>
                                            <ThemedText style={[Typography.labelSm, { color: c.primary }]}>{f.unitCount} units</ThemedText>
                                        </View>
                                        <View style={[styles.badge, { backgroundColor: c.secondary + '10' }]}>
                                            <ThemedText style={[Typography.labelSm, { color: c.secondary }]}>{f.staffCount} staff</ThemedText>
                                        </View>
                                    </View>

                                    <View style={[styles.mobileActions, { borderTopColor: c.border }]}>
                                        <Pressable onPress={() => setViewFacility(f)} style={styles.mobileActionBtn}>
                                            <IconSymbol name="eye" size={16} color={c.primary} />
                                            <ThemedText type="labelSm" style={{ color: c.primary }}>View</ThemedText>
                                        </Pressable>
                                        <Pressable onPress={() => openEdit(f)} style={styles.mobileActionBtn}>
                                            <IconSymbol name="pencil" size={16} color={c.warning} />
                                            <ThemedText type="labelSm" style={{ color: c.warning }}>Edit</ThemedText>
                                        </Pressable>
                                        <Pressable onPress={() => handleDelete(f)} style={styles.mobileActionBtn}>
                                            <IconSymbol name="trash" size={16} color={c.error} />
                                            <ThemedText type="labelSm" style={{ color: c.error }}>Delete</ThemedText>
                                        </Pressable>
                                    </View>
                                </Card>
                            </Animated.View>
                        ))}
                    </View>
                )}
            </ScreenContainer>

            {renderViewModal()}
            {renderModal()}
        </>
    );
}

const styles = StyleSheet.create({
    /* ── Web Table ───────────────────────────────── */
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

    /* ── View Modal ──────────────────────────────── */
    viewModalContent: {
        width: '100%',
        maxWidth: 500,
        borderRadius: Radius.xl,
        padding: Spacing.lg,
        maxHeight: '85%',
    },
    viewModalWeb: {
        maxWidth: 580,
    },
    viewModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        marginBottom: Spacing.lg,
    },
    viewIconCircle: {
        width: 48,
        height: 48,
        borderRadius: Radius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    viewStatsRow: {
        flexDirection: 'row',
        gap: Spacing.smd,
        marginBottom: Spacing.lg,
    },
    viewStat: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: Spacing.md,
        borderRadius: Radius.md,
        borderWidth: 1,
        gap: 4,
    },
    viewCodesSection: {
        marginBottom: Spacing.md,
    },
    viewActions: {
        flexDirection: 'row',
        gap: Spacing.smd,
        marginTop: Spacing.md,
    },
    viewActionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        paddingVertical: Spacing.smd,
        borderRadius: Radius.md,
        borderWidth: 1,
    },

    /* ── Code rows (shared in View modal) ────────── */
    codeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.smd,
        borderBottomWidth: 1,
        gap: Spacing.smd,
    },
    codeRoleDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    codeInput: {
        borderWidth: 1,
        borderRadius: Radius.sm,
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs,
        fontSize: 14,
        fontFamily: 'monospace',
        width: 130,
        textAlign: 'center' as any,
    },
    codeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        paddingHorizontal: Spacing.smd,
        paddingVertical: Spacing.xs,
        borderRadius: Radius.sm,
        cursor: 'pointer' as any,
    },
    toggleBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs,
        borderRadius: Radius.sm,
        borderWidth: 1,
        cursor: 'pointer' as any,
    },

    /* ── Create / Edit Modal ─────────────────────── */
    previewCodesSection: {
        marginTop: Spacing.lg,
        borderRadius: Radius.lg,
        borderWidth: 1,
        padding: Spacing.md,
    },
    previewCodesHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Spacing.sm,
        gap: Spacing.sm,
    },
    regenerateBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        paddingHorizontal: Spacing.smd,
        paddingVertical: Spacing.xs,
        borderRadius: Radius.md,
        cursor: 'pointer' as any,
    },
    previewCodeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.smd,
        borderTopWidth: 1,
        gap: Spacing.smd,
    },
    previewCodeInput: {
        borderWidth: 1,
        borderRadius: Radius.sm,
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs,
        fontSize: 14,
        fontFamily: 'monospace',
        width: 130,
        textAlign: 'center' as any,
    },

    /* ── Mobile ──────────────────────────────────── */
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
        width: 44,
        height: 44,
        borderRadius: Radius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    mobileBadgeRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
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

    /* ── Shared ──────────────────────────────────── */
    badge: {
        paddingHorizontal: Spacing.smd,
        paddingVertical: Spacing.xs,
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
        maxHeight: '90%',
    },
    modalWeb: {
        maxWidth: 560,
    },
    modalTitle: {
        marginBottom: Spacing.lg,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.lg,
        gap: Spacing.md,
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
    infoBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        padding: Spacing.smd,
        borderRadius: Radius.md,
        borderWidth: 1,
        marginTop: Spacing.md,
    },
    modalActions: {
        flexDirection: 'row',
        gap: Spacing.smd,
        marginTop: Spacing.lg,
    },
});
