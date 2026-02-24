import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { useClinical } from '@/context/clinical';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import {
    Alert,
    Linking,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface EscalationModalProps {
    visible: boolean;
    onClose: () => void;
}

export function EscalationModal({ visible, onClose }: EscalationModalProps) {
    const { emergencyContacts, activeProfile, addCaseEvent, user } = useClinical();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    const groupedContacts = useMemo(() => {
        const tiers = {
            1: [] as typeof emergencyContacts,
            2: [] as typeof emergencyContacts,
            3: [] as typeof emergencyContacts,
        };
        emergencyContacts.forEach(c => {
            if (c.tier === 1 || c.tier === 2 || c.tier === 3) {
                tiers[c.tier].push(c);
            }
        });
        return tiers;
    }, [emergencyContacts]);

    const handleCall = async (contact: typeof emergencyContacts[0]) => {
        const url = `tel:${contact.phone}`;
        const canOpen = await Linking.canOpenURL(url);

        if (!canOpen) {
            // Bug fix: inform the user instead of silently failing
            Alert.alert(
                'Cannot Make Call',
                `This device cannot place phone calls. Please dial ${contact.phone} manually.`
            );
            return;
        }

        // Log escalation event before dialling so it's recorded even if the call app takes over
        if (activeProfile) {
            await addCaseEvent({
                maternal_profile_id: activeProfile.local_id,
                event_type: 'escalation',
                event_label: `Escalation: Called ${contact.name} (${contact.role})`,
                event_data: JSON.stringify({
                    tier: contact.tier,
                    contact_id: contact.id,
                    phone: contact.phone
                }),
                performed_by: user?.id,
            });
        }
        Linking.openURL(url);
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <Pressable style={styles.overlay} onPress={onClose}>
                <Pressable style={[styles.content, { backgroundColor: colors.background }]}>
                    <View style={styles.header}>
                        <View style={styles.headerLeft}>
                            <Ionicons name="alert-circle" size={24} color={colors.error} />
                            <Text style={[styles.title, { color: colors.text }]}>Emergency Escalation</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
                        <TierSection
                            title="Tier 1: Unit Level"
                            subtitle="Immediate bedside assistance"
                            contacts={groupedContacts[1]}
                            colors={colors}
                            onCall={handleCall}
                            icon="people"
                        />
                        <TierSection
                            title="Tier 2: Facility Level"
                            subtitle="Specialists & Resources"
                            contacts={groupedContacts[2]}
                            colors={colors}
                            onCall={handleCall}
                            icon="business"
                        />
                        <TierSection
                            title="Tier 3: External / Referral"
                            subtitle="Ambulance & Higher Centers"
                            contacts={groupedContacts[3]}
                            colors={colors}
                            onCall={handleCall}
                            icon="airplane"
                        />

                        {emergencyContacts.length === 0 && (
                            <View style={styles.emptyState}>
                                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                                    No emergency contacts configured for this facility.
                                </Text>
                            </View>
                        )}
                        <View style={{ height: 20 }} />
                    </ScrollView>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

function TierSection({ title, subtitle, contacts, colors, onCall, icon }: any) {
    if (contacts.length === 0) return null;

    return (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <View style={[styles.iconContainer, { backgroundColor: colors.primary + '10' }]}>
                    <Ionicons name={icon} size={18} color={colors.primary} />
                </View>
                <View>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
                    <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
                </View>
            </View>

            {contacts.map((contact: any) => (
                <TouchableOpacity
                    key={contact.id}
                    style={[styles.contactCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => onCall(contact)}
                >
                    <View style={styles.contactInfo}>
                        <Text style={[styles.contactName, { color: colors.text }]}>{contact.name}</Text>
                        <Text style={[styles.contactRole, { color: colors.textSecondary }]}>{contact.role}</Text>
                        {/* Bug fix: show the phone number so users know what number they're dialling */}
                        <Text style={[styles.contactPhone, { color: colors.primary }]}>{contact.phone}</Text>
                    </View>
                    <View style={[styles.callButton, { backgroundColor: colors.success }]}>
                        <Ionicons name="call" size={18} color="#FFF" />
                    </View>
                </TouchableOpacity>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    content: {
        borderTopLeftRadius: Radius.xl,
        borderTopRightRadius: Radius.xl,
        maxHeight: '85%',
        paddingBottom: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: '#00000010',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    title: {
        ...Typography.headingMd,
    },
    closeButton: {
        padding: Spacing.xs,
    },
    scroll: {
        paddingHorizontal: Spacing.lg,
    },
    section: {
        marginTop: Spacing.lg,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.smd,
        marginBottom: Spacing.md,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: Radius.md,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sectionTitle: {
        ...Typography.labelLg,
    },
    sectionSubtitle: {
        ...Typography.bodySm,
        fontSize: 12,
    },
    contactCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.md,
        borderRadius: Radius.lg,
        borderWidth: 1,
        marginBottom: Spacing.sm,
        ...Shadows.sm,
    },
    contactInfo: {
        flex: 1,
    },
    contactName: {
        ...Typography.labelMd,
    },
    contactRole: {
        ...Typography.bodySm,
        marginTop: 2,
    },
    contactPhone: {
        ...Typography.labelSm,
        marginTop: 2,
    },
    callButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyState: {
        padding: Spacing.xl,
        alignItems: 'center',
    },
    emptyText: {
        ...Typography.bodySm,
        textAlign: 'center',
    },
});
