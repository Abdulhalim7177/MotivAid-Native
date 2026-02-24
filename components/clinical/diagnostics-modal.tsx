/**
 * Diagnostics Phase Modal
 *
 * Shown after the E-MOTIVE bundle when the patient is still bleeding.
 * Presents a checklist of common secondary PPH causes and a free-text
 * notes field. Saving logs a 'note' case event with structured JSON data.
 */

import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { useClinical } from '@/context/clinical';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

// ── Cause Definitions ─────────────────────────────────────────

interface DiagnosticCause {
    key: string;
    label: string;
    description: string;
    severity: 'high' | 'medium';
}

const CAUSES: DiagnosticCause[] = [
    { key: 'retained_placenta', label: 'Retained Placenta', description: 'Incomplete placental delivery', severity: 'high' },
    { key: 'uterine_atony', label: 'Uterine Atony', description: 'Failure of uterus to contract adequately', severity: 'high' },
    { key: 'uterine_rupture', label: 'Uterine Rupture', description: 'Tear in uterine wall', severity: 'high' },
    { key: 'cervical_laceration', label: 'Cervical / Vaginal Laceration', description: 'Tears in birth canal', severity: 'medium' },
    { key: 'coagulation_failure', label: 'Coagulation Failure (DIC)', description: 'Disseminated intravascular coagulation', severity: 'high' },
    { key: 'bladder_injury', label: 'Bladder Injury', description: 'Inadvertent bladder trauma', severity: 'medium' },
    { key: 'inverted_uterus', label: 'Inverted Uterus', description: 'Uterine inversion', severity: 'high' },
];

// ── Props ─────────────────────────────────────────────────────

interface DiagnosticsModalProps {
    visible: boolean;
    onClose: () => void;
}

// ── Component ─────────────────────────────────────────────────

export function DiagnosticsModal({ visible, onClose }: DiagnosticsModalProps) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { activeProfile, saveDiagnostics, emotiveChecklist } = useClinical();

    const [selectedCauses, setSelectedCauses] = useState<Set<string>>(new Set());
    const [notes, setNotes] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);

    // Load existing values when modal opens
    React.useEffect(() => {
        if (visible && emotiveChecklist && !hasLoaded) {
            if (emotiveChecklist.diagnostics_causes) {
                const causeKeys = CAUSES
                    .filter(c => emotiveChecklist.diagnostics_causes?.includes(c.label))
                    .map(c => c.key);
                setSelectedCauses(new Set(causeKeys));
            }
            if (emotiveChecklist.diagnostics_notes) {
                setNotes(emotiveChecklist.diagnostics_notes);
            }
            setHasLoaded(true);
        }
        if (!visible) setHasLoaded(false);
    }, [visible, emotiveChecklist, hasLoaded]);

    const toggleCause = (key: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedCauses(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const handleSave = async () => {
        if (!activeProfile) return;
        setIsSaving(true);
        try {
            const causeLabels = CAUSES
                .filter(c => selectedCauses.has(c.key))
                .map(c => c.label);

            await saveDiagnostics(activeProfile.local_id, causeLabels, notes.trim());

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onClose();
        } catch {
            // Error logged in context
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <Pressable style={styles.overlay} onPress={onClose}>
                <Pressable style={[styles.sheet, { backgroundColor: colors.card }]}>
                    {/* Handle */}
                    <View style={[styles.handle, { backgroundColor: colors.border }]} />

                    {/* Header */}
                    <View style={styles.header}>
                        <Ionicons name="search" size={22} color={colors.primary} />
                        <Text style={[styles.headerTitle, { color: colors.text }]}>Diagnostics Phase</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={22} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        Identify potential secondary causes of persistent bleeding
                    </Text>

                    <ScrollView
                        style={styles.scroll}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {CAUSES.map((cause, index) => {
                            const isSelected = selectedCauses.has(cause.key);
                            const isLast = index === CAUSES.length - 1;
                            const accentColor = cause.severity === 'high' ? colors.error : colors.warning;

                            return (
                                <TouchableOpacity
                                    key={cause.key}
                                    style={[
                                        styles.causeRow,
                                        !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border },
                                        isSelected && { backgroundColor: accentColor + '10' },
                                    ]}
                                    onPress={() => toggleCause(cause.key)}
                                    activeOpacity={0.7}
                                >
                                    <View style={[
                                        styles.checkbox,
                                        isSelected
                                            ? { backgroundColor: accentColor, borderColor: accentColor }
                                            : { backgroundColor: 'transparent', borderColor: colors.border },
                                    ]}>
                                        {isSelected && <Ionicons name="checkmark" size={14} color="#FFF" />}
                                    </View>
                                    <View style={styles.causeContent}>
                                        <Text style={[styles.causeLabel, { color: colors.text }]}>{cause.label}</Text>
                                        <Text style={[styles.causeDesc, { color: colors.textSecondary }]}>{cause.description}</Text>
                                    </View>
                                    <View style={[styles.severityBadge, { backgroundColor: accentColor + '20' }]}>
                                        <Text style={[styles.severityText, { color: accentColor }]}>
                                            {cause.severity === 'high' ? 'High' : 'Medium'}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}

                        {/* Notes */}
                        <View style={styles.notesContainer}>
                            <Text style={[styles.notesLabel, { color: colors.textSecondary }]}>Additional Notes</Text>
                            <TextInput
                                style={[styles.notesInput, {
                                    backgroundColor: colors.background,
                                    borderColor: colors.border,
                                    color: colors.text,
                                }]}
                                value={notes}
                                onChangeText={setNotes}
                                placeholder="Clinical findings, interventions tried, observations..."
                                placeholderTextColor={colors.placeholder}
                                multiline
                                numberOfLines={4}
                                textAlignVertical="top"
                            />
                        </View>

                        <View style={{ height: Spacing.lg }} />
                    </ScrollView>

                    {/* Save Button */}
                    <TouchableOpacity
                        style={[
                            styles.saveButton,
                            { backgroundColor: selectedCauses.size > 0 || notes.trim() ? colors.primary : colors.border },
                        ]}
                        onPress={handleSave}
                        disabled={isSaving || (selectedCauses.size === 0 && !notes.trim())}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="save-outline" size={18} color="#FFF" />
                        <Text style={styles.saveButtonText}>
                            {isSaving ? 'Saving...' : `Log Findings${selectedCauses.size > 0 ? ` (${selectedCauses.size})` : ''}`}
                        </Text>
                    </TouchableOpacity>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

// ── Styles ────────────────────────────────────────────────────

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    sheet: {
        borderTopLeftRadius: Radius.xl,
        borderTopRightRadius: Radius.xl,
        maxHeight: '85%',
        paddingBottom: Spacing.xl,
        ...Shadows.lg,
    },
    handle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: Spacing.sm,
        marginBottom: Spacing.md,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.xs,
    },
    headerTitle: {
        ...Typography.headingSm,
        flex: 1,
    },
    closeButton: { padding: 4 },
    subtitle: {
        ...Typography.bodySm,
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.md,
    },
    scroll: {
        paddingHorizontal: Spacing.lg,
    },
    causeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.smd,
        gap: Spacing.sm,
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    causeContent: { flex: 1 },
    causeLabel: { ...Typography.labelMd },
    causeDesc: { ...Typography.bodySm, fontSize: 12 },
    severityBadge: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        borderRadius: Radius.full,
    },
    severityText: { ...Typography.labelSm, fontSize: 11 },
    notesContainer: {
        marginTop: Spacing.md,
        gap: Spacing.xs,
    },
    notesLabel: { ...Typography.labelSm },
    notesInput: {
        borderWidth: 1,
        borderRadius: Radius.md,
        padding: Spacing.sm,
        ...Typography.bodySm,
        minHeight: 90,
    },
    saveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        marginHorizontal: Spacing.lg,
        marginTop: Spacing.md,
        paddingVertical: Spacing.smd,
        borderRadius: Radius.md,
    },
    saveButtonText: {
        color: '#FFF',
        ...Typography.buttonMd,
    },
});
