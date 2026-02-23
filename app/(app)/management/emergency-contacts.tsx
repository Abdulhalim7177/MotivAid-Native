/**
 * Emergency Contacts Management — Supervisor/Admin UI
 *
 * Allows managing the 3-level emergency contact hierarchy
 * for a facility/unit.
 */

import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { useClinical } from '@/context/clinical';
import { useAuth } from '@/context/auth';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function EmergencyContactsManagement() {
    const { emergencyContacts, refreshEmergencyContacts, activeUnit, fetchFacilityStaff, isLoading } = useClinical();
    const { profile: authProfile } = useAuth();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    const canManage = authProfile?.role === 'supervisor' || authProfile?.role === 'admin';

    const [isSaving, setIsSaving] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingContact, setEditingContact] = useState<any>(null);

    // Form state
    const [name, setName] = useState('');
    const [role, setRole] = useState('');
    const [phone, setPhone] = useState('');
    const [tier, setTier] = useState(1);
    // selectedStaff holds the staff object chosen from the dropdown — used to
    // resolve facility_id / unit_id for the new contact.
    const [selectedStaff, setSelectedStaff] = useState<any>(null);

    // Staff list state
    const [facilityStaff, setFacilityStaff] = useState<any[]>([]);
    const [showStaffDropdown, setShowStaffDropdown] = useState(false);

    const loadStaff = React.useCallback(async () => {
        const staff = await fetchFacilityStaff();
        setFacilityStaff(staff);
    }, [fetchFacilityStaff]);

    React.useEffect(() => {
        loadStaff();
    }, [loadStaff]);

    // Bug fix: when a staff member is selected, assign them to selectedStaff so
    // handleSave can read selectedStaff.facility_id / selectedStaff.unit_id.
    const handleStaffSelect = (staff: any) => {
        setName(staff.full_name);
        setRole(staff.role.charAt(0).toUpperCase() + staff.role.slice(1));
        setPhone(staff.phone || '');
        setSelectedStaff(staff);          // was set here before — now it actually flows through
        setShowStaffDropdown(false);
    };

    // Only show staff that match the current name input
    const filteredStaff = facilityStaff.filter(s =>
        s.full_name?.toLowerCase().includes(name.toLowerCase())
    );

    const handleOpenModal = (contact?: any) => {
        if (contact) {
            setEditingContact(contact);
            setName(contact.name);
            setRole(contact.role);
            setPhone(contact.phone);
            setTier(contact.tier);
            setSelectedStaff(null);
        } else {
            setEditingContact(null);
            setName('');
            setRole('');
            setPhone('');
            setTier(1);
            setSelectedStaff(null);
        }
        setShowStaffDropdown(false);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setShowStaffDropdown(false);
        setSelectedStaff(null);
    };

    const handleSave = async () => {
        if (!name || !role || !phone) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        setIsSaving(true);
        try {
            // Bug fix: selectedStaff is now properly assigned from handleStaffSelect,
            // so selectedStaff?.facility_id actually resolves when a staff member is picked.
            // Falls back to activeUnit context when manually entering a name.
            const facilityId = selectedStaff?.facility_id || activeUnit?.facility_id;
            const unitId = selectedStaff?.unit_id || activeUnit?.id;

            if (!facilityId) {
                Alert.alert('Error', 'No facility detected. Please select an active unit first.');
                setIsSaving(false);
                return;
            }

            if (editingContact) {
                // Bug fix: do NOT overwrite unit_id on edit — preserve the original
                // unit assignment unless the user explicitly changed it via staff selection.
                const updatePayload: any = { name, role, phone, tier };
                // Only update unit_id if a new staff member was selected in this edit session
                if (selectedStaff) {
                    updatePayload.unit_id = unitId;
                }
                const { error } = await supabase
                    .from('emergency_contacts')
                    .update(updatePayload)
                    .eq('id', editingContact.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('emergency_contacts')
                    .insert({
                        name,
                        role,
                        phone,
                        tier,
                        facility_id: facilityId,
                        unit_id: unitId,
                    });
                if (error) throw error;
            }

            await refreshEmergencyContacts();
            handleCloseModal();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
            console.error('Error saving contact:', error);
            Alert.alert('Error', 'Failed to save contact. Check your connection and try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
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
                            const { error } = await supabase
                                .from('emergency_contacts')
                                .delete()
                                .eq('id', id);
                            if (error) throw error;
                            await refreshEmergencyContacts();
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        } catch {
                            Alert.alert('Error', 'Failed to delete contact. Check your connection and try again.');
                        }
                    },
                },
            ]
        );
    };

    const renderItem = ({ item }: { item: any }) => (
        <View style={[styles.contactCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.contactInfo}>
                <View style={styles.nameRow}>
                    <Text style={[styles.contactName, { color: colors.text }]}>{item.name}</Text>
                    <View style={[styles.tierBadge, { backgroundColor: getTierColor(item.tier) + '15' }]}>
                        <Text style={[styles.tierBadgeText, { color: getTierColor(item.tier) }]}>
                            Tier {item.tier}
                        </Text>
                    </View>
                </View>
                <Text style={[styles.contactRole, { color: colors.textSecondary }]}>{item.role}</Text>
                <Text style={[styles.contactPhone, { color: colors.primary }]}>{item.phone}</Text>
            </View>
            {/* Bug fix: only show edit/delete buttons if the user has manage permissions */}
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
            <View style={styles.header}>
                <TouchableOpacity onPress={() => {
                    if (router.canGoBack()) router.back();
                    else router.replace('/(app)/(tabs)');
                }} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Emergency Contacts</Text>
                {/* Bug fix: only show the add button for supervisors/admins */}
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
                // Bug fix: show a loading indicator while contacts are being fetched
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

            {/* Create / Edit modal — only reachable if canManage */}
            <Modal visible={showModal} transparent animationType="fade" onRequestClose={handleCloseModal}>
                {/* Bug fix: tapping the overlay dismisses the modal AND the staff dropdown */}
                <Pressable style={styles.modalOverlay} onPress={handleCloseModal}>
                    <Pressable style={[styles.modalContent, { backgroundColor: colors.card }]}>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>
                            {editingContact ? 'Edit Contact' : 'New Contact'}
                        </Text>

                        <Text style={[styles.label, { color: colors.textSecondary }]}>Name</Text>
                        <View style={{ zIndex: 1 }}>
                            <TextInput
                                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground, marginBottom: 0 }]}
                                value={name}
                                onChangeText={(t) => {
                                    setName(t);
                                    // Clear the previously selected staff when the user types manually
                                    if (selectedStaff && t !== selectedStaff.full_name) {
                                        setSelectedStaff(null);
                                    }
                                    setShowStaffDropdown(true);
                                }}
                                onFocus={() => setShowStaffDropdown(true)}
                                // Bug fix: close the dropdown when the field loses focus
                                onBlur={() => setTimeout(() => setShowStaffDropdown(false), 150)}
                                placeholder="Search staff or enter name"
                                placeholderTextColor={colors.placeholder}
                            />

                            {showStaffDropdown && name.length > 0 && (
                                <View style={[styles.staffDropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                    <ScrollView style={{ maxHeight: 150 }} keyboardShouldPersistTaps="handled">
                                        {filteredStaff.length > 0 ? (
                                            filteredStaff.map((staff) => (
                                                <TouchableOpacity
                                                    key={staff.id}
                                                    style={[styles.staffItem, { borderBottomColor: colors.border }]}
                                                    onPress={() => handleStaffSelect(staff)}
                                                >
                                                    <Text style={[styles.staffName, { color: colors.text }]}>{staff.full_name}</Text>
                                                    <Text style={[styles.staffRole, { color: colors.textSecondary }]}>{staff.role}</Text>
                                                </TouchableOpacity>
                                            ))
                                        ) : (
                                            <View style={styles.staffItem}>
                                                <Text style={{ color: colors.textSecondary, fontStyle: 'italic' }}>No staff matching &quot;{name}&quot;</Text>
                                            </View>
                                        )}
                                    </ScrollView>
                                </View>
                            )}
                        </View>

                        <Text style={[styles.label, { color: colors.textSecondary, marginTop: Spacing.lg }]}>Role</Text>
                        <TextInput
                            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
                            value={role}
                            onChangeText={setRole}
                            onFocus={() => setShowStaffDropdown(false)}
                            placeholder="e.g. Senior Midwife"
                            placeholderTextColor={colors.placeholder}
                        />

                        <Text style={[styles.label, { color: colors.textSecondary }]}>Phone Number</Text>
                        <TextInput
                            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
                            value={phone}
                            onChangeText={setPhone}
                            onFocus={() => setShowStaffDropdown(false)}
                            placeholder="+234..."
                            keyboardType="phone-pad"
                            placeholderTextColor={colors.placeholder}
                        />

                        <Text style={[styles.label, { color: colors.textSecondary }]}>Tier (Escalation Level)</Text>
                        <View style={styles.tierRow}>
                            {[1, 2, 3].map((t) => (
                                <TouchableOpacity
                                    key={t}
                                    style={[
                                        styles.tierOption,
                                        { borderColor: colors.border },
                                        tier === t && { backgroundColor: getTierColor(t) + '15', borderColor: getTierColor(t) }
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
                                    (!name || !role || !phone) && { opacity: 0.5 }
                                ]}
                                onPress={handleSave}
                                disabled={isSaving || !name || !role || !phone}
                            >
                                {isSaving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveButtonText}>Save</Text>}
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
        case 1: return '#8B5CF6'; // Unit
        case 2: return '#3B82F6'; // Facility
        case 3: return '#EF4444'; // Referral
        default: return '#6B7280';
    }
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.md,
        justifyContent: 'space-between'
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
        ...Shadows.sm
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

    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: Spacing.lg
    },
    modalContent: {
        borderRadius: Radius.xl,
        padding: Spacing.xl,
        ...Shadows.lg
    },
    modalTitle: { ...Typography.headingMd, marginBottom: Spacing.lg },
    label: { ...Typography.overline, marginBottom: 4 },
    input: {
        height: 48,
        borderRadius: Radius.md,
        borderWidth: 1,
        paddingHorizontal: Spacing.md,
        marginBottom: Spacing.lg,
        ...Typography.bodyMd
    },
    tierRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xl },
    tierOption: {
        flex: 1,
        height: 48,
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
        alignItems: 'center'
    },
    modalButtonText: { ...Typography.buttonMd },
    saveButton: { borderWidth: 0 },
    saveButtonText: { color: '#FFF', ...Typography.buttonMd },

    // Staff dropdown
    staffDropdown: {
        position: 'absolute',
        top: 50,
        left: 0,
        right: 0,
        borderRadius: Radius.md,
        borderWidth: 1,
        ...Shadows.md,
        zIndex: 1000,
    },
    staffItem: {
        padding: Spacing.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    staffName: { ...Typography.labelMd },
    staffRole: { ...Typography.overline, fontSize: 10, marginTop: 2 },
});
