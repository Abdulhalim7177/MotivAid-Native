/**
 * Emergency Contacts Management — Supervisor/Admin UI
 *
 * Supervisor selects a staff member from a dropdown, picks a tier,
 * and saves them as an emergency contact. Name/role/phone are
 * auto-filled from the staff record — no manual entry needed.
 */

import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useClinical } from '@/context/clinical';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { LocalEmergencyContact } from '@/lib/clinical-db';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function EmergencyContactsManagement() {
    const {
        emergencyContacts,
        refreshEmergencyContacts,
        activeUnit,
        fetchFacilityStaff,
        isLoading,
        deleteContact,
        saveContact
    } = useClinical();
    const { profile: authProfile } = useAuth();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    const canManage = authProfile?.role === 'supervisor' || authProfile?.role === 'admin';

    const [isSaving, setIsSaving] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingContact, setEditingContact] = useState<any>(null);
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

    // Form state — staff selection + tier
    const [selectedStaff, setSelectedStaff] = useState<any>(null);
    const [tier, setTier] = useState(1);

    // Staff picker state
    const [facilityStaff, setFacilityStaff] = useState<any[]>([]);
    const [showStaffPicker, setShowStaffPicker] = useState(false);
    const [isLoadingStaff, setIsLoadingStaff] = useState(false);

    const loadStaff = React.useCallback(async () => {
        setIsLoadingStaff(true);
        const staff = await fetchFacilityStaff();
        setFacilityStaff(staff);
        setIsLoadingStaff(false);
    }, [fetchFacilityStaff]);

    const handleOpenModal = (contact?: any) => {
        if (contact) {
            // Editing: pre-fill with the contact's current data
            setEditingContact(contact);
            // Try to find the matching staff member so the picker shows them as selected
            setSelectedStaff({ full_name: contact.name, role: contact.role, phone: contact.phone });
            setTier(contact.tier);
        } else {
            setEditingContact(null);
            setSelectedStaff(null);
            setTier(1);
        }
        setShowStaffPicker(false);
        setShowModal(true);
        loadStaff();
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setShowStaffPicker(false);
        setSelectedStaff(null);
        setEditingContact(null);
    };

    const handleSave = async () => {
        if (!selectedStaff) {
            Alert.alert('No staff selected', 'Please select a staff member from the dropdown.');
            return;
        }

        const facilityId = selectedStaff.facility_id || activeUnit?.facility_id || authProfile?.facility_id;
        const unitId = selectedStaff.unit_id || activeUnit?.id;

        if (!facilityId) {
            Alert.alert('Error', 'No facility detected. Please ensure you are assigned to a facility.');
            return;
        }

        setIsSaving(true);
        try {
            const contactData: Partial<LocalEmergencyContact> = {
                id: editingContact?.id,
                name: selectedStaff.full_name,
                role: selectedStaff.role,
                phone: selectedStaff.phone || editingContact?.phone || '',
                tier,
                facility_id: facilityId,
                unit_id: unitId,
                is_active: true,
            };

            await saveContact(contactData);

            handleCloseModal();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
            console.error('Error saving contact:', error);
            Alert.alert('Error', 'Failed to save contact. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = (id: string) => {
        if (Platform.OS === 'web') {
            setDeleteTargetId(id);
        } else {
            Alert.alert(
                'Delete Contact',
                'Are you sure you want to remove this emergency contact?',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: async () => {
                            try {
                                await deleteContact(id);
                                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            } catch {
                                Alert.alert('Error', 'Failed to delete contact.');
                            }
                        },
                    },
                ]
            );
        }
    };

    const confirmDelete = async () => {
        if (!deleteTargetId) return;
        try {
            await deleteContact(deleteTargetId);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (err) {
            console.error('Delete failed:', err);
            Alert.alert('Error', 'Failed to delete contact.');
        } finally {
            setDeleteTargetId(null);
        }
    };

    const renderItem = ({ item }: { item: any }) => (
        <View style={[styles.contactCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.contactInfo}>
                <View style={styles.nameRow}>
                    <Text style={[styles.contactName, { color: colors.text }]}>{item.name}</Text>
                    <View style={[styles.tierBadge, { backgroundColor: getTierColor(item.tier) + '15' }]}>
                        <Text style={[styles.tierBadgeText, { color: getTierColor(item.tier) }]}>
                            {getTierLabel(item.tier)}
                        </Text>
                    </View>
                </View>
                <Text style={[styles.contactRole, { color: colors.textSecondary }]}>{item.role}</Text>
                <Text style={[styles.contactPhone, { color: colors.primary }]}>{item.phone}</Text>
            </View>
            {canManage && (
                <View style={styles.actions}>
                    <TouchableOpacity onPress={() => handleOpenModal(item)} style={styles.iconButton}>
                        <Ionicons name="pencil" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.iconButton}>
                        <Ionicons name="trash" size={18} color={colors.error} />
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => {
                    if (router.canGoBack()) router.back();
                    else router.replace('/(app)/(tabs)');
                }} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Emergency Contacts</Text>
                {canManage ? (
                    <TouchableOpacity onPress={() => handleOpenModal()} style={styles.addButton}>
                        <Ionicons name="add" size={24} color={colors.primary} />
                    </TouchableOpacity>
                ) : (
                    <View style={{ width: 40 }} />
                )}
            </View>

            <FlatList
                data={emergencyContacts}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                ListFooterComponent={isLoading ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} /> : null}
                ListEmptyComponent={
                    !isLoading ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="people-outline" size={48} color={colors.textSecondary} />
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                                No emergency contacts configured.
                            </Text>
                        </View>
                    ) : null
                }
            />

            {/* Add / Edit modal */}
            <Modal visible={showModal} transparent animationType="slide" onRequestClose={handleCloseModal}>
                <Pressable style={styles.modalOverlay} onPress={handleCloseModal}>
                    <Pressable style={[styles.modalContent, { backgroundColor: colors.card }]}>
                        <View style={styles.modalHandle} />

                        <Text style={[styles.modalTitle, { color: colors.text }]}>
                            {editingContact ? 'Edit Emergency Contact' : 'Add Emergency Contact'}
                        </Text>

                        {/* Staff Dropdown */}
                        <Text style={[styles.label, { color: colors.textSecondary }]}>Staff Member</Text>
                        <TouchableOpacity
                            style={[styles.dropdownTrigger, { borderColor: selectedStaff ? colors.primary : colors.border, backgroundColor: colors.inputBackground }]}
                            onPress={() => setShowStaffPicker(v => !v)}
                        >
                            {selectedStaff ? (
                                <View style={styles.selectedStaffRow}>
                                    <View style={[styles.staffAvatar, { backgroundColor: colors.primary + '15' }]}>
                                        <Text style={[styles.staffAvatarText, { color: colors.primary }]}>
                                            {selectedStaff.full_name?.charAt(0)?.toUpperCase() || '?'}
                                        </Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.selectedStaffName, { color: colors.text }]}>{selectedStaff.full_name}</Text>
                                        <Text style={[styles.selectedStaffRole, { color: colors.textSecondary }]}>
                                            {selectedStaff.role} {selectedStaff.phone ? `· ${selectedStaff.phone}` : ''}
                                        </Text>
                                    </View>
                                    <Ionicons name={showStaffPicker ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
                                </View>
                            ) : (
                                <View style={styles.dropdownPlaceholderRow}>
                                    <Ionicons name="person-add-outline" size={18} color={colors.placeholder} />
                                    <Text style={[styles.dropdownPlaceholder, { color: colors.placeholder }]}>
                                        Select a staff member…
                                    </Text>
                                    <Ionicons name={showStaffPicker ? 'chevron-up' : 'chevron-down'} size={18} color={colors.placeholder} />
                                </View>
                            )}
                        </TouchableOpacity>

                        {/* Staff picker list — shown inline below the trigger */}
                        {showStaffPicker && (
                            <View style={[styles.pickerList, { borderColor: colors.border, backgroundColor: colors.card }]}>
                                {isLoadingStaff ? (
                                    <ActivityIndicator color={colors.primary} style={{ padding: Spacing.lg }} />
                                ) : facilityStaff.length === 0 ? (
                                    <View style={styles.pickerEmpty}>
                                        <Text style={[styles.pickerEmptyText, { color: colors.textSecondary }]}>
                                            No staff found for this facility.
                                        </Text>
                                    </View>
                                ) : (
                                    <ScrollView style={{ maxHeight: 220 }} keyboardShouldPersistTaps="handled">
                                        {facilityStaff.map((staff) => {
                                            const isSelected = selectedStaff?.full_name === staff.full_name;
                                            return (
                                                <TouchableOpacity
                                                    key={staff.id}
                                                    style={[
                                                        styles.pickerItem,
                                                        { borderBottomColor: colors.border },
                                                        isSelected && { backgroundColor: colors.primary + '10' },
                                                    ]}
                                                    onPress={() => {
                                                        setSelectedStaff(staff);
                                                        setShowStaffPicker(false);
                                                    }}
                                                >
                                                    <View style={[styles.staffAvatar, { backgroundColor: colors.primary + '15' }]}>
                                                        <Text style={[styles.staffAvatarText, { color: colors.primary }]}>
                                                            {staff.full_name?.charAt(0)?.toUpperCase() || '?'}
                                                        </Text>
                                                    </View>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={[styles.pickerItemName, { color: colors.text }]}>{staff.full_name}</Text>
                                                        <Text style={[styles.pickerItemMeta, { color: colors.textSecondary }]}>
                                                            {staff.role}{staff.phone ? ` · ${staff.phone}` : ''}
                                                        </Text>
                                                    </View>
                                                    {isSelected && (
                                                        <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                                                    )}
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </ScrollView>
                                )}
                            </View>
                        )}

                        {/* Tier selector */}
                        <Text style={[styles.label, { color: colors.textSecondary, marginTop: Spacing.lg }]}>Escalation Tier</Text>
                        <View style={styles.tierRow}>
                            {([1, 2, 3] as const).map((t) => (
                                <TouchableOpacity
                                    key={t}
                                    style={[
                                        styles.tierOption,
                                        { borderColor: colors.border },
                                        tier === t && { backgroundColor: getTierColor(t) + '15', borderColor: getTierColor(t) },
                                    ]}
                                    onPress={() => setTier(t)}
                                >
                                    <Text style={[styles.tierOptionText, { color: tier === t ? getTierColor(t) : colors.textSecondary }]}>
                                        Tier {t}
                                    </Text>
                                    <Text style={[styles.tierOptionSub, { color: tier === t ? getTierColor(t) : colors.placeholder }]}>
                                        {t === 1 ? 'Unit' : t === 2 ? 'Facility' : 'External'}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Actions */}
                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={[styles.modalButton, { borderColor: colors.border }]}
                                onPress={handleCloseModal}
                            >
                                <Text style={[styles.modalButtonText, { color: colors.textSecondary }]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.modalButton,
                                    styles.saveButton,
                                    { backgroundColor: colors.primary },
                                    !selectedStaff && { opacity: 0.5 },
                                ]}
                                onPress={handleSave}
                                disabled={isSaving || !selectedStaff}
                            >
                                {isSaving
                                    ? <ActivityIndicator color="#FFF" />
                                    : <Text style={styles.saveButtonText}>Save</Text>
                                }
                            </TouchableOpacity>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Delete Confirmation Modal (web) */}
            <Modal visible={!!deleteTargetId} transparent animationType="fade" onRequestClose={() => setDeleteTargetId(null)}>
                <Pressable style={styles.deleteOverlay} onPress={() => setDeleteTargetId(null)}>
                    <Pressable style={[styles.deleteDialog, { backgroundColor: colors.card }]}>
                        <View style={styles.deleteIconCircle}>
                            <Ionicons name="trash-outline" size={28} color="#EF4444" />
                        </View>
                        <Text style={[styles.deleteTitle, { color: colors.text }]}>Delete Contact</Text>
                        <Text style={[styles.deleteMessage, { color: colors.textSecondary }]}>
                            Are you sure you want to remove this emergency contact? This action cannot be undone.
                        </Text>
                        <View style={styles.deleteActions}>
                            <TouchableOpacity
                                style={[styles.deleteCancelBtn, { borderColor: colors.border }]}
                                onPress={() => setDeleteTargetId(null)}
                            >
                                <Text style={[styles.deleteCancelText, { color: colors.textSecondary }]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.deleteConfirmBtn}
                                onPress={confirmDelete}
                            >
                                <Ionicons name="trash" size={16} color="#FFF" />
                                <Text style={styles.deleteConfirmText}>Delete</Text>
                            </TouchableOpacity>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
}

function getTierColor(tier: number) {
    switch (tier) {
        case 1: return '#8B5CF6';
        case 2: return '#3B82F6';
        case 3: return '#EF4444';
        default: return '#6B7280';
    }
}

function getTierLabel(tier: number) {
    switch (tier) {
        case 1: return 'T1 · Unit';
        case 2: return 'T2 · Facility';
        case 3: return 'T3 · External';
        default: return `Tier ${tier}`;
    }
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.md,
        justifyContent: 'space-between',
    },
    backButton: { padding: Spacing.xs },
    headerTitle: { ...Typography.headingMd },
    addButton: { padding: Spacing.xs },

    listContent: { padding: Spacing.md },
    contactCard: {
        flexDirection: 'row',
        padding: Spacing.md,
        borderRadius: Radius.lg,
        borderWidth: 1,
        marginBottom: Spacing.md,
        ...Shadows.sm,
    },
    contactInfo: { flex: 1 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 2 },
    contactName: { ...Typography.labelLg },
    tierBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.full },
    tierBadgeText: { ...Typography.overline, fontSize: 10 },
    contactRole: { ...Typography.bodySm, marginBottom: 4 },
    contactPhone: { ...Typography.labelMd },
    actions: { justifyContent: 'space-around', paddingLeft: Spacing.sm },
    iconButton: { padding: Spacing.xs },

    emptyState: { alignItems: 'center', marginTop: 100 },
    emptyText: { ...Typography.bodyMd, marginTop: Spacing.md },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: Radius.xl,
        borderTopRightRadius: Radius.xl,
        padding: Spacing.xl,
        paddingBottom: 36,
        ...Shadows.lg,
    },
    modalHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#00000020',
        alignSelf: 'center',
        marginBottom: Spacing.lg,
    },
    modalTitle: { ...Typography.headingMd, marginBottom: Spacing.lg },
    label: { ...Typography.overline, marginBottom: Spacing.sm },

    // Staff dropdown trigger
    dropdownTrigger: {
        borderRadius: Radius.md,
        borderWidth: 1.5,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.smd,
        marginBottom: 0,
    },
    selectedStaffRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.smd,
    },
    dropdownPlaceholderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    dropdownPlaceholder: { ...Typography.bodyMd, flex: 1 },
    selectedStaffName: { ...Typography.labelMd },
    selectedStaffRole: { ...Typography.bodySm, marginTop: 2 },

    // Staff avatar initials
    staffAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    staffAvatarText: { ...Typography.labelMd },

    // Picker list
    pickerList: {
        borderWidth: 1,
        borderRadius: Radius.md,
        marginTop: 4,
        marginBottom: Spacing.sm,
        overflow: 'hidden',
        ...Shadows.md,
    },
    pickerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.smd,
        padding: Spacing.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    pickerItemName: { ...Typography.labelMd },
    pickerItemMeta: { ...Typography.bodySm, marginTop: 2 },
    pickerEmpty: { padding: Spacing.lg, alignItems: 'center' },
    pickerEmptyText: { ...Typography.bodySm },

    // Tier selector
    tierRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xl },
    tierOption: {
        flex: 1,
        height: 52,
        borderRadius: Radius.md,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 2,
    },
    tierOptionText: { ...Typography.labelSm },
    tierOptionSub: { fontSize: 9 },

    modalActions: { flexDirection: 'row', gap: Spacing.md },
    modalButton: {
        flex: 1,
        height: 48,
        borderRadius: Radius.md,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalButtonText: { ...Typography.buttonMd },
    saveButton: { borderWidth: 0 },
    saveButtonText: { color: '#FFF', ...Typography.buttonMd },

    // Delete confirmation modal
    deleteOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.lg,
    },
    deleteDialog: {
        width: '100%',
        maxWidth: 380,
        borderRadius: Radius.xl,
        padding: Spacing.xl,
        alignItems: 'center',
        ...Shadows.lg,
    },
    deleteIconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#FEE2E2',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    deleteTitle: {
        ...Typography.headingSm,
        marginBottom: Spacing.xs,
    },
    deleteMessage: {
        ...Typography.bodySm,
        textAlign: 'center',
        marginBottom: Spacing.xl,
        lineHeight: 20,
    },
    deleteActions: {
        flexDirection: 'row',
        gap: Spacing.md,
        width: '100%',
    },
    deleteCancelBtn: {
        flex: 1,
        height: 44,
        borderRadius: Radius.md,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    deleteCancelText: {
        ...Typography.buttonMd,
    },
    deleteConfirmBtn: {
        flex: 1,
        height: 44,
        borderRadius: Radius.md,
        backgroundColor: '#EF4444',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
    },
    deleteConfirmText: {
        color: '#FFF',
        ...Typography.buttonMd,
    },
});
