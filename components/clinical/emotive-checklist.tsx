/**
 * E-MOTIVE Bundle Checklist
 *
 * Interactive checklist for the WHO E-MOTIVE PPH management protocol.
 * Features:
 * - Elapsed timer tracking time since first step (WHO: complete within 1 hour)
 * - Accordion: expanding a step collapses the previous one
 * - Each step: checkbox, auto-timestamp, dose/volume fields, notes
 * - "Done" button when all steps complete → prompts to close the case
 */

import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { EmotiveStep, useClinical } from '@/context/clinical';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { DiagnosticsModal } from './diagnostics-modal';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

// ── Step Definitions ─────────────────────────────────────────

interface StepDef {
    key: EmotiveStep;
    letter: string;
    label: string;
    description: string;
    color: string;
    detailLabel?: string;
    detailPlaceholder?: string;
}

const STEPS: StepDef[] = [
    {
        key: 'early_detection',
        letter: 'E',
        label: 'Early Detection',
        description: 'Blood loss ≥300 mL with signs or ≥500 mL',
        color: '#C62828',
    },
    {
        key: 'massage',
        letter: 'M',
        label: 'Uterine Massage',
        description: 'Bimanual uterine compression',
        color: '#E65100',
    },
    {
        key: 'oxytocin',
        letter: 'O',
        label: 'Oxytocin',
        description: 'Uterotonic administration',
        color: '#F57F17',
        detailLabel: 'Dose',
        detailPlaceholder: 'e.g. 10 IU IV',
    },
    {
        key: 'txa',
        letter: 'T',
        label: 'Tranexamic Acid',
        description: 'TXA within 3 hours of onset',
        color: '#1B5E20',
        detailLabel: 'Dose',
        detailPlaceholder: 'e.g. 1g IV over 10 min',
    },
    {
        key: 'iv_fluids',
        letter: 'I',
        label: 'IV Fluids',
        description: 'Crystalloid resuscitation',
        color: '#0D47A1',
        detailLabel: 'Volume',
        detailPlaceholder: 'e.g. 1000 mL NS',
    },
    {
        key: 'escalation',
        letter: 'V/E',
        label: 'Escalation',
        description: 'Volume replacement, blood products, or referral',
        color: '#4A148C',
    },
];

// WHO recommends completing bundle within 60 minutes
const TARGET_MINUTES = 60;

// ── Component ────────────────────────────────────────────────

export function EmotiveChecklist({ onEscalate }: { onEscalate?: () => void }) {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const isDark = colorScheme === 'dark';
    const {
        emotiveChecklist,
        toggleEmotiveStep,
        activeProfile,
        updateProfileStatus,
    } = useClinical();

    const [sectionExpanded, setSectionExpanded] = useState(true);
    const [expandedStep, setExpandedStep] = useState<EmotiveStep | null>(null);
    const [showCloseModal, setShowCloseModal] = useState(false);
    const [showDiagnosticsModal, setShowDiagnosticsModal] = useState(false);
    const [stillBleeding, setStillBleeding] = useState<boolean | null>(null);
    // Local flag so post-bundle UI shows immediately after last step toggle
    // without waiting for context async re-render
    const [localAllDone, setLocalAllDone] = useState(false);

    // ── Timer ────────────────────────────────────────────────
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Find the earliest step timestamp to anchor the timer
    const firstStepTime = React.useMemo(() => {
        if (!emotiveChecklist) return null;
        let earliest: string | null = null;
        for (const step of STEPS) {
            const time = (emotiveChecklist as any)[`${step.key}_time`] as string | undefined;
            if (time && (!earliest || time < earliest)) {
                earliest = time;
            }
        }
        return earliest ? new Date(earliest) : null;
    }, [emotiveChecklist]);

    const allDoneFromContext = STEPS.every(s => {
        if (!emotiveChecklist) return false;
        return (emotiveChecklist as any)[`${s.key}_done`];
    });
    const allDone = allDoneFromContext || localAllDone;
    const isCreator = activeProfile?.created_by === useClinical().user?.id;

    // Sync localAllDone upward when context catches up
    useEffect(() => {
        if (allDoneFromContext) setLocalAllDone(true);
    }, [allDoneFromContext]);

    const completedCount = STEPS.filter(s => {
        if (!emotiveChecklist) return false;
        return (emotiveChecklist as any)[`${s.key}_done`];
    }).length;

    // Restore Timer Effect
    useEffect(() => {
        if (firstStepTime && !allDone) {
            const updateElapsed = () => {
                setElapsedSeconds(Math.floor((Date.now() - firstStepTime.getTime()) / 1000));
            };
            updateElapsed();
            timerRef.current = setInterval(updateElapsed, 1000);
            return () => {
                if (timerRef.current) clearInterval(timerRef.current);
            };
        } else if (firstStepTime && allDone) {
            setElapsedSeconds(Math.floor((Date.now() - firstStepTime.getTime()) / 1000));
            if (timerRef.current) clearInterval(timerRef.current);
        } else {
            setElapsedSeconds(0);
            if (timerRef.current) clearInterval(timerRef.current);
        }
    }, [firstStepTime, allDone]);

    const handleDiagnostics = () => {
        setShowDiagnosticsModal(true);
    };

    const handleEscalation = () => {
        onEscalate?.();
    };

    const elapsedMinutes = Math.floor(elapsedSeconds / 60);
    const elapsedSecs = elapsedSeconds % 60;
    const isOverTime = elapsedMinutes >= TARGET_MINUTES;

    const formatTime = () => {
        const mins = String(elapsedMinutes).padStart(2, '0');
        const secs = String(elapsedSecs).padStart(2, '0');
        return `${mins}:${secs}`;
    };

    // ── Accordion ────────────────────────────────────────────
    const handleStepPress = useCallback((stepKey: EmotiveStep) => {
        setExpandedStep(prev => prev === stepKey ? null : stepKey);
    }, []);

    const handleStepToggled = useCallback((stepKey: EmotiveStep, nowDone: boolean) => {
        if (!nowDone) return;
        // Check if this is the last remaining step
        const othersDone = STEPS.filter(s => s.key !== stepKey).every(s => {
            if (!emotiveChecklist) return false;
            return (emotiveChecklist as any)[`${s.key}_done`];
        });
        if (othersDone) setLocalAllDone(true);
    }, [emotiveChecklist]);

    // ── Close Case ───────────────────────────────────────────
    const handleCloseWithOutcome = async (outcome: 'normal' | 'pph_resolved' | 'referred') => {
        setShowCloseModal(false);
        if (!activeProfile) return;
        try {
            await updateProfileStatus(activeProfile.local_id, 'closed', outcome);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            if (router.canGoBack()) router.back();
        } catch {
            // Error logged in context
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Header */}
            <TouchableOpacity
                style={styles.header}
                onPress={() => setSectionExpanded(!sectionExpanded)}
                activeOpacity={0.7}
            >
                <View style={styles.headerLeft}>
                    <Ionicons name="list" size={20} color={colors.primary} />
                    <Text style={[styles.headerTitle, { color: colors.text }]}>E-MOTIVE Bundle</Text>
                </View>
                <View style={styles.headerRight}>
                    {/* Timer badge */}
                    {firstStepTime && (
                        <View style={[
                            styles.timerBadge,
                            {
                                backgroundColor: allDone
                                    ? (isOverTime ? colors.error + '20' : colors.success + '20')
                                    : (isOverTime ? colors.error + '20' : colors.warning + '20'),
                            },
                        ]}>
                            <Ionicons
                                name="timer-outline"
                                size={12}
                                color={isOverTime ? colors.error : allDone ? colors.success : colors.warning}
                            />
                            <Text style={[
                                styles.timerText,
                                {
                                    color: isOverTime ? colors.error : allDone ? colors.success : colors.warning,
                                },
                            ]}>
                                {formatTime()}
                            </Text>
                        </View>
                    )}
                    {/* Progress badge */}
                    <View style={[
                        styles.progressBadge,
                        {
                            backgroundColor: completedCount === 6
                                ? colors.success + '20'
                                : completedCount > 0
                                    ? colors.warning + '20'
                                    : colors.border,
                        },
                    ]}>
                        <Text style={[
                            styles.progressText,
                            {
                                color: completedCount === 6
                                    ? colors.success
                                    : completedCount > 0
                                        ? colors.warning
                                        : colors.textSecondary,
                            },
                        ]}>
                            {completedCount}/6
                        </Text>
                    </View>
                    <Ionicons
                        name={sectionExpanded ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color={colors.textSecondary}
                    />
                </View>
            </TouchableOpacity>

            {/* Target time hint */}
            {sectionExpanded && firstStepTime && !allDone && (
                <View style={[styles.timerHint, { borderTopColor: colors.border }]}>
                    <Ionicons
                        name={isOverTime ? 'warning' : 'information-circle-outline'}
                        size={14}
                        color={isOverTime ? colors.error : colors.textSecondary}
                    />
                    <Text style={[styles.timerHintText, { color: isOverTime ? colors.error : colors.textSecondary }]}>
                        {isOverTime
                            ? `Exceeded ${TARGET_MINUTES}-minute target — escalate immediately`
                            : `Target: complete all steps within ${TARGET_MINUTES} minutes`}
                    </Text>
                </View>
            )}

            {/* Steps */}
            {sectionExpanded && (
                <View style={styles.stepsContainer}>
                    {STEPS.map((step, index) => (
                        <StepRow
                            key={step.key}
                            step={step}
                            colors={colors}
                            isDark={isDark}
                            checklist={emotiveChecklist}
                            onToggle={toggleEmotiveStep}
                            onToggled={handleStepToggled}
                            isLast={index === STEPS.length - 1 && !allDone}
                            isExpanded={expandedStep === step.key}
                            onPress={() => handleStepPress(step.key)}
                            isCreator={isCreator}
                        />
                    ))}

                    {/* Post-Bundle Flow */}
                    {allDone && (
                        <View style={[styles.postBundleContainer, { borderTopColor: colors.border }]}>
                            {stillBleeding === null ? (
                                <View style={styles.questionSection}>
                                    <Text style={[styles.questionText, { color: colors.text }]}>Still bleeding?</Text>
                                    <View style={styles.choiceRow}>
                                        <TouchableOpacity 
                                            style={[styles.choiceButton, { backgroundColor: colors.success, opacity: isCreator ? 1 : 0.5 }]}
                                            onPress={() => {
                                                if (!isCreator) return;
                                                setStillBleeding(false);
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                            }}
                                        >
                                            <Text style={styles.choiceButtonText}>No</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity 
                                            style={[styles.choiceButton, { backgroundColor: colors.error, opacity: isCreator ? 1 : 0.5 }]}
                                            onPress={() => {
                                                if (!isCreator) return;
                                                setStillBleeding(true);
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                            }}
                                        >
                                            <Text style={styles.choiceButtonText}>Yes</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ) : stillBleeding === false ? (
                                <TouchableOpacity
                                    style={[styles.doneButton, { backgroundColor: colors.success, opacity: isCreator ? 1 : 0.5 }]}
                                    onPress={() => {
                                        if (!isCreator) return;
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                        setShowCloseModal(true);
                                    }}
                                >
                                    <Ionicons name="checkmark-done" size={20} color="#FFF" />
                                    <Text style={styles.doneButtonText}>Bleeding Stopped — Close Case</Text>
                                </TouchableOpacity>
                            ) : (
                                <View style={styles.actionSection}>
                                    <Text style={[styles.actionPrompt, { color: colors.error }]}>Persistent Bleeding Detected</Text>
                                    <View style={styles.actionRow}>
                                        <TouchableOpacity
                                            style={[styles.actionSubButton, { backgroundColor: colors.primary, opacity: isCreator ? 1 : 0.5 }]}
                                            onPress={() => isCreator && handleDiagnostics()}
                                        >
                                            <Ionicons name="search" size={18} color="#FFF" />
                                            <Text style={styles.actionSubButtonText}>Diagnostics Phase</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.actionSubButton, { backgroundColor: colors.error, opacity: isCreator ? 1 : 0.5 }]}
                                            onPress={() => isCreator && handleEscalation()}
                                        >
                                            <Ionicons name="alert-circle" size={18} color="#FFF" />
                                            <Text style={styles.actionSubButtonText}>Escalation</Text>
                                        </TouchableOpacity>
                                    </View>
                                    <TouchableOpacity
                                        style={[styles.closeAfterAction, { borderColor: colors.border, opacity: isCreator ? 1 : 0.5 }]}
                                        onPress={() => {
                                            if (!isCreator) return;
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                            setShowCloseModal(true);
                                        }}
                                    >
                                        <Ionicons name="close-circle-outline" size={16} color={colors.textSecondary} />
                                        <Text style={[styles.closeAfterActionText, { color: colors.textSecondary }]}>Close Case</Text>
                                    </TouchableOpacity>
                                    {isCreator && (
                                        <TouchableOpacity
                                            style={styles.resetLink}
                                            onPress={() => setStillBleeding(null)}
                                        >
                                            <Text style={[styles.resetLinkText, { color: colors.textSecondary }]}>Change Answer</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            )}
                        </View>
                    )}
                </View>
            )}

            {/* Diagnostics Phase Modal */}
            <DiagnosticsModal
                visible={showDiagnosticsModal}
                onClose={() => setShowDiagnosticsModal(false)}
                onSaved={() => {
                    setShowDiagnosticsModal(false);
                    setShowCloseModal(true);
                }}
            />

            {/* Close Case Outcome Modal */}
            <Modal visible={showCloseModal} transparent animationType="fade" onRequestClose={() => setShowCloseModal(false)}>
                <Pressable style={styles.modalOverlay} onPress={() => setShowCloseModal(false)}>
                    <Pressable style={[styles.modalContent, { backgroundColor: colors.card }]}>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>Close Case</Text>
                        <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                            All E-MOTIVE steps completed in {formatTime()}. Select outcome:
                        </Text>

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
        </View>
    );
}

// ── Step Row ─────────────────────────────────────────────────

function StepRow({
    step,
    colors,
    isDark,
    checklist,
    onToggle,
    onToggled,
    isLast,
    isExpanded,
    onPress,
}: {
    step: StepDef;
    colors: any;
    isDark: boolean;
    checklist: any;
    onToggle: (step: EmotiveStep, done: boolean, details?: { dose?: string; volume?: string; notes?: string }) => Promise<void>;
    onToggled: (stepKey: EmotiveStep, nowDone: boolean) => void;
    isLast: boolean;
    isExpanded: boolean;
    onPress: () => void;
    isCreator: boolean;
}) {
    const done = checklist?.[`${step.key}_done`] ?? false;
    const time = checklist?.[`${step.key}_time`] as string | undefined;
    const existingDose = checklist?.[`${step.key}_dose`] as string | undefined;
    const existingVolume = checklist?.[`${step.key}_volume`] as string | undefined;
    const existingNotes = checklist?.[`${step.key}_notes`] as string | undefined;

    const [detailValue, setDetailValue] = useState(existingDose || existingVolume || '');
    const [notesValue, setNotesValue] = useState(existingNotes || '');

    const doneBg = isDark ? '#1B3A26' : '#E8F5E9';
    const doneText = isDark ? '#66BB6A' : '#2E7D32';

    const handleToggle = async () => {
        if (!isCreator) return;
        const newDone = !done;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        if (newDone) {
            onPress(); // Expand this step
            await onToggle(step.key, true);
        } else {
            await onToggle(step.key, false);
        }
        onToggled(step.key, newDone);
    };

    const handleDetailBlur = async () => {
        if (!done || !checklist) return;
        const details: { dose?: string; volume?: string; notes?: string } = {};
        if (step.detailLabel === 'Dose') details.dose = detailValue;
        else if (step.detailLabel === 'Volume') details.volume = detailValue;
        if (notesValue) details.notes = notesValue;
        await onToggle(step.key, true, details);
    };

    const handleNotesBlur = async () => {
        if (!done || !checklist) return;
        const details: { dose?: string; volume?: string; notes?: string } = { notes: notesValue };
        if (step.detailLabel === 'Dose') details.dose = detailValue;
        else if (step.detailLabel === 'Volume') details.volume = detailValue;
        await onToggle(step.key, true, details);
    };

    return (
        <View style={[
            styles.stepRow,
            done && { backgroundColor: doneBg },
            !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border },
        ]}>
            {/* Tappable main row */}
            <TouchableOpacity
                style={styles.stepMain}
                onPress={done ? onPress : handleToggle}
                activeOpacity={0.7}
            >
                {/* Checkbox */}
                <TouchableOpacity onPress={handleToggle} style={styles.checkbox}>
                    <View style={[
                        styles.checkboxInner,
                        done
                            ? { backgroundColor: doneText, borderColor: doneText }
                            : { borderColor: colors.border, backgroundColor: 'transparent' },
                    ]}>
                        {done && <Ionicons name="checkmark" size={14} color="#FFF" />}
                    </View>
                </TouchableOpacity>

                {/* Letter Badge */}
                <View style={[styles.letterBadge, { backgroundColor: step.color + '20' }]}>
                    <Text style={[styles.letterText, { color: step.color }]}>{step.letter}</Text>
                </View>

                {/* Label & Description */}
                <View style={styles.stepContent}>
                    <Text style={[
                        styles.stepLabel,
                        { color: done ? doneText : colors.text },
                        done && styles.stepLabelDone,
                    ]}>
                        {step.label}
                    </Text>
                    {(!done || !isExpanded) && (
                        <Text style={[styles.stepDesc, { color: done ? doneText + '99' : colors.textSecondary }]} numberOfLines={1}>
                            {step.description}
                        </Text>
                    )}
                </View>

                {/* Timestamp + expand indicator */}
                <View style={styles.stepRight}>
                    {done && time && (
                        <Text style={[styles.timestamp, { color: doneText }]}>
                            {new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                    )}
                    {done && (
                        <Ionicons
                            name={isExpanded ? 'chevron-up' : 'chevron-down'}
                            size={14}
                            color={colors.textSecondary}
                        />
                    )}
                </View>
            </TouchableOpacity>

            {/* Detail Input — only when expanded and done */}
            {isExpanded && done && (
                <View style={styles.detailsContainer}>
                    {step.detailLabel && (
                        <View style={styles.detailRow}>
                            <Text style={[styles.detailLabel, { color: doneText }]}>
                                {step.detailLabel}:
                            </Text>
                            <TextInput
                                style={[styles.detailInput, {
                                    color: colors.text,
                                    backgroundColor: isDark ? '#1E1A2E' : '#F9FAFB',
                                    borderColor: colors.border,
                                }]}
                                value={detailValue}
                                onChangeText={setDetailValue}
                                onBlur={handleDetailBlur}
                                placeholder={step.detailPlaceholder}
                                placeholderTextColor={colors.placeholder}
                            />
                        </View>
                    )}
                    <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: doneText }]}>
                            Notes:
                        </Text>
                        <TextInput
                            style={[styles.detailInput, {
                                color: colors.text,
                                backgroundColor: isDark ? '#1E1A2E' : '#F9FAFB',
                                borderColor: colors.border,
                            }]}
                            value={notesValue}
                            onChangeText={setNotesValue}
                            onBlur={handleNotesBlur}
                            placeholder="Optional notes..."
                            placeholderTextColor={colors.placeholder}
                        />
                    </View>
                </View>
            )}
        </View>
    );
}

// ── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        borderRadius: Radius.lg,
        borderWidth: 1,
        marginBottom: Spacing.md,
        overflow: 'hidden',
        ...Shadows.sm,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.smd,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    headerTitle: { ...Typography.labelLg },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    timerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        borderRadius: Radius.full,
    },
    timerText: {
        ...Typography.labelSm,
        fontVariant: ['tabular-nums'],
    },
    progressBadge: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        borderRadius: Radius.full,
    },
    progressText: { ...Typography.labelSm },

    timerHint: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderTopWidth: 1,
    },
    timerHintText: { ...Typography.bodySm, fontSize: 11 },

    stepsContainer: {},

    stepRow: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.smd,
    },
    stepMain: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    checkbox: {
        padding: 2,
    },
    checkboxInner: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    letterBadge: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    letterText: {
        ...Typography.labelSm,
        fontSize: 13,
    },
    stepContent: {
        flex: 1,
    },
    stepLabel: { ...Typography.labelMd },
    stepLabelDone: { textDecorationLine: 'line-through' },
    stepDesc: { ...Typography.bodySm, fontSize: 12 },
    stepRight: {
        alignItems: 'flex-end',
        gap: 2,
    },
    timestamp: { ...Typography.labelSm, fontSize: 11 },

    detailsContainer: {
        marginTop: Spacing.sm,
        marginLeft: 56,
        gap: Spacing.xs,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    detailLabel: {
        ...Typography.labelSm,
        width: 50,
    },
    detailInput: {
        flex: 1,
        borderWidth: 1,
        borderRadius: Radius.sm,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
        ...Typography.bodySm,
    },

    // Done button
    doneButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.sm,
        marginHorizontal: Spacing.md,
        marginTop: Spacing.sm,
        marginBottom: Spacing.md,
        paddingVertical: Spacing.smd,
        borderRadius: Radius.md,
    },
    doneButtonText: {
        color: '#FFF',
        ...Typography.buttonMd,
    },

    // Post-bundle styles
    postBundleContainer: {
        padding: Spacing.md,
        borderTopWidth: 1,
        marginTop: Spacing.sm,
    },
    questionSection: {
        alignItems: 'center',
        gap: Spacing.md,
    },
    questionText: {
        ...Typography.headingSm,
    },
    choiceRow: {
        flexDirection: 'row',
        gap: Spacing.lg,
    },
    choiceButton: {
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.sm,
        borderRadius: Radius.md,
        minWidth: 100,
        alignItems: 'center',
    },
    choiceButtonText: {
        color: '#FFF',
        ...Typography.buttonLg,
    },
    actionSection: {
        alignItems: 'center',
        gap: Spacing.md,
    },
    actionPrompt: {
        ...Typography.labelLg,
        fontWeight: '700',
    },
    actionRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    actionSubButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: Spacing.md,
        borderRadius: Radius.md,
    },
    actionSubButtonText: {
        color: '#FFF',
        ...Typography.buttonMd,
        fontSize: 12,
    },
    resetLink: {
        marginTop: Spacing.xs,
    },
    resetLinkText: {
        ...Typography.caption,
        textDecorationLine: 'underline',
    },

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
