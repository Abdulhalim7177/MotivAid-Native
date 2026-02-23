/**
 * Record Vitals — Quick-entry vital signs form
 *
 * Features:
 * - Numeric input for HR, BP, temperature, SpO2, RR
 * - Blood loss estimation with method selector
 * - Live shock index calculation as values are entered
 * - Visual alert banner when SI crosses threshold
 * - Haptic feedback on critical values
 */

import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { useClinical } from '@/context/clinical';
import { useToast } from '@/context/toast';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ShockResult, assessBloodLoss, calculateShockIndex, triggerShockHaptic } from '@/lib/shock-index';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const BLOOD_LOSS_METHODS = [
    { key: 'visual', label: 'Visual', icon: 'eye-outline' },
    { key: 'drape', label: 'Drape', icon: 'layers-outline' },
    { key: 'weighed', label: 'Weighed', icon: 'scale-outline' },
] as const;

export default function RecordVitalsScreen() {
    const { localId } = useLocalSearchParams<{ localId: string }>();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const { recordVitals, profiles, emotiveChecklist, startEmotiveBundle } = useClinical();
    const { showToast } = useToast();

    const profile = profiles.find(p => p.local_id === localId);

    // Form state
    const [heartRate, setHeartRate] = useState('');
    const [systolicBp, setSystolicBp] = useState('');
    const [diastolicBp, setDiastolicBp] = useState('');
    const [temperature, setTemperature] = useState('');
    const [respiratoryRate, setRespiratoryRate] = useState('');
    const [spo2, setSpo2] = useState('');
    const [bloodLoss, setBloodLoss] = useState('0');
    const [bloodLossMethod, setBloodLossMethod] = useState<'visual' | 'drape' | 'weighed'>('visual');
    const [isSaving, setIsSaving] = useState(false);

    const isClosed = profile?.status === 'closed';

    // Pulse animation for critical SI
    const pulseScale = useSharedValue(1);
    const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulseScale.value }] }));

    // Live shock index calculation
    const shockResult: ShockResult | null = useMemo(() => {
        const hr = parseInt(heartRate);
        const sbp = parseInt(systolicBp);
        if (hr > 0 && sbp > 0) {
            const result = calculateShockIndex(hr, sbp);

            // Trigger haptic on significant level changes
            if (result.level === 'critical' || result.level === 'emergency') {
                triggerShockHaptic(result.level);
                pulseScale.value = withRepeat(
                    withSequence(
                        withTiming(1.05, { duration: 500 }),
                        withTiming(1, { duration: 500 })
                    ),
                    -1,
                    true
                );
            } else {
                pulseScale.value = 1;
            }

            return result;
        }
        return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [heartRate, systolicBp]);

    const isPphSuspected = useMemo(() => {
        const ebl = parseInt(bloodLoss) || 0;
        const si = shockResult?.value || 0;
        return ebl > 0 || si >= 0.9;
    }, [bloodLoss, shockResult]);

    const shouldShowStartBundle = isPphSuspected && !emotiveChecklist && !isClosed;

    // Blood loss assessment
    const bloodLossResult = useMemo(() => {
        const ebl = parseInt(bloodLoss) || 0;
        return assessBloodLoss(ebl);
    }, [bloodLoss]);

    const handleSave = async () => {
        if (!heartRate && !systolicBp) {
            showToast('Please enter at least heart rate or blood pressure', 'error');
            return;
        }

        setIsSaving(true);
        try {
            await recordVitals({
                maternalProfileLocalId: localId!,
                heartRate: heartRate ? parseInt(heartRate) : undefined,
                systolicBp: systolicBp ? parseInt(systolicBp) : undefined,
                diastolicBp: diastolicBp ? parseInt(diastolicBp) : undefined,
                temperature: temperature ? parseFloat(temperature) : undefined,
                respiratoryRate: respiratoryRate ? parseInt(respiratoryRate) : undefined,
                spo2: spo2 ? parseInt(spo2) : undefined,
                estimatedBloodLoss: parseInt(bloodLoss) || 0,
                bloodLossMethod,
            });

            if (shouldShowStartBundle && localId) {
                await startEmotiveBundle(localId);
            }

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            if (router.canGoBack()) {
                router.back();
            } else {
                router.replace('/(app)/(tabs)/clinical');
            }
        } catch {
            showToast('Failed to record vital signs', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                {/* Header */}
                <View style={[styles.header, { borderBottomColor: colors.border }]}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <View style={styles.headerCenter}>
                        <Text style={[styles.headerTitle, { color: colors.text }]}>
                            {isClosed ? 'Recent Vitals' : 'Record Vitals'}
                        </Text>
                        {profile && (
                            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                                {profile.patient_id || 'Patient'} · Age {profile.age} {isClosed && '· (View Only)'}
                            </Text>
                        )}
                    </View>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Live Shock Index Banner */}
                    {shockResult && (
                        <Animated.View
                            style={[
                                styles.shockBanner,
                                { backgroundColor: shockResult.bgColor },
                                pulseStyle,
                            ]}
                        >
                            <View style={styles.shockBannerContent}>
                                <Ionicons
                                    name={
                                        shockResult.level === 'emergency' || shockResult.level === 'critical'
                                            ? 'alert-circle'
                                            : shockResult.level === 'warning' || shockResult.level === 'alert'
                                                ? 'warning'
                                                : 'checkmark-circle'
                                    }
                                    size={28}
                                    color={shockResult.color}
                                />
                                <View style={styles.shockTextContainer}>
                                    <Text style={[styles.shockValue, { color: shockResult.color }]}>
                                        SI: {shockResult.value.toFixed(1)}
                                    </Text>
                                    <Text style={[styles.shockLabel, { color: shockResult.color }]}>
                                        {shockResult.label}
                                    </Text>
                                </View>
                            </View>
                            <Text style={[styles.shockDesc, { color: shockResult.color }]}>
                                {shockResult.description}
                            </Text>
                        </Animated.View>
                    )}

                    {/* ─── Core Vitals ─── */}
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Core Vitals</Text>
                    <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        {/* Heart Rate & SpO2 */}
                        <View style={styles.inputRow}>
                            <VitalInput
                                label="Heart Rate"
                                value={heartRate}
                                onChangeText={setHeartRate}
                                unit="bpm"
                                icon="heart-outline"
                                iconColor="#EF4444"
                                colors={colors}
                                placeholder="72"
                                editable={!isClosed}
                            />
                            <VitalInput
                                label="SpO₂"
                                value={spo2}
                                onChangeText={setSpo2}
                                unit="%"
                                icon="water-outline"
                                iconColor="#3B82F6"
                                colors={colors}
                                placeholder="98"
                                editable={!isClosed}
                            />
                        </View>

                        {/* Blood Pressure */}
                        <View style={styles.inputRow}>
                            <VitalInput
                                label="Systolic BP"
                                value={systolicBp}
                                onChangeText={setSystolicBp}
                                unit="mmHg"
                                icon="arrow-up-outline"
                                iconColor="#9B51E0"
                                colors={colors}
                                placeholder="120"
                                editable={!isClosed}
                            />
                            <VitalInput
                                label="Diastolic BP"
                                value={diastolicBp}
                                onChangeText={setDiastolicBp}
                                unit="mmHg"
                                icon="arrow-down-outline"
                                iconColor="#9B51E0"
                                colors={colors}
                                placeholder="80"
                                editable={!isClosed}
                            />
                        </View>

                        {/* Temperature & RR */}
                        <View style={[styles.inputRow, { marginBottom: 0 }]}>
                            <VitalInput
                                label="Temperature"
                                value={temperature}
                                onChangeText={setTemperature}
                                unit="°C"
                                icon="thermometer-outline"
                                iconColor="#F59E0B"
                                colors={colors}
                                placeholder="36.5"
                                isDecimal
                                editable={!isClosed}
                            />
                            <VitalInput
                                label="Resp. Rate"
                                value={respiratoryRate}
                                onChangeText={setRespiratoryRate}
                                unit="/min"
                                icon="cloud-outline"
                                iconColor="#10B981"
                                colors={colors}
                                placeholder="16"
                                editable={!isClosed}
                            />
                        </View>
                    </View>

                    {/* ─── Blood Loss ─── */}
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Blood Loss Estimation</Text>
                    <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        {/* Main blood loss input */}
                        <View style={[
                            styles.bloodLossInputRow, 
                            { 
                                backgroundColor: isClosed ? colors.border + '10' : colors.inputBackground, 
                                borderColor: colors.inputBorder,
                                opacity: isClosed ? 0.7 : 1
                            }
                        ]}>
                            <Ionicons name="water" size={22} color={parseInt(bloodLoss) > 500 ? '#EF4444' : colors.textSecondary} />
                            <TextInput
                                style={[styles.bloodLossValue, { color: colors.text }]}
                                value={bloodLoss}
                                onChangeText={(t) => setBloodLoss(t.replace(/[^0-9]/g, ''))}
                                keyboardType="numeric"
                                maxLength={5}
                                placeholder="0"
                                placeholderTextColor={colors.placeholder}
                                editable={!isClosed}
                            />
                            <Text style={[styles.bloodLossUnit, { color: colors.textSecondary }]}>mL</Text>
                        </View>

                        {/* Blood loss quick buttons */}
                        {!isClosed && (
                            <View style={styles.quickButtons}>
                                {[100, 250, 500, 1000].map((amount) => (
                                    <TouchableOpacity
                                        key={amount}
                                        style={[styles.quickButton, {
                                            borderColor: colors.border,
                                            backgroundColor: colors.inputBackground,
                                        }]}
                                        onPress={() => {
                                            const current = parseInt(bloodLoss) || 0;
                                            setBloodLoss(String(current + amount));
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        }}
                                        activeOpacity={0.6}
                                    >
                                        <Text style={[styles.quickButtonText, { color: colors.primary }]}>
                                            +{amount}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                                <TouchableOpacity
                                    style={[styles.quickButton, {
                                        borderColor: colors.error + '40',
                                        backgroundColor: colors.error + '08',
                                    }]}
                                    onPress={() => {
                                        setBloodLoss('0');
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    }}
                                    activeOpacity={0.6}
                                >
                                    <Text style={[styles.quickButtonText, { color: colors.error }]}>Reset</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Method selector */}
                        <Text style={[styles.methodLabel, { color: colors.textSecondary }]}>Method</Text>
                        <View style={styles.methodRow}>
                            {BLOOD_LOSS_METHODS.map((method) => {
                                const isActive = bloodLossMethod === method.key;
                                return (
                                    <TouchableOpacity
                                        key={method.key}
                                        style={[
                                            styles.methodChip,
                                            isActive && { backgroundColor: colors.primary + '15', borderColor: colors.primary },
                                            !isActive && { borderColor: colors.border, backgroundColor: colors.inputBackground },
                                            isClosed && { opacity: isActive ? 1 : 0.5 }
                                        ]}
                                        onPress={() => !isClosed && setBloodLossMethod(method.key)}
                                        activeOpacity={0.7}
                                        disabled={isClosed}
                                    >
                                        <Ionicons
                                            name={method.icon as any}
                                            size={16}
                                            color={isActive ? colors.primary : colors.textSecondary}
                                        />
                                        <Text style={[styles.methodText, isActive ? { color: colors.primary } : { color: colors.textSecondary }]}>
                                            {method.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Blood loss assessment */}
                        {parseInt(bloodLoss) > 0 && (
                            <View style={[styles.bloodLossBanner, { backgroundColor: bloodLossResult.bgColor }]}>
                                <Text style={[styles.bloodLossBannerLabel, { color: bloodLossResult.color }]}>
                                    {bloodLossResult.label}
                                </Text>
                                <Text style={[styles.bloodLossBannerDesc, { color: bloodLossResult.color }]}>
                                    {bloodLossResult.description}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Save Button */}
                    <TouchableOpacity
                        style={[
                            styles.saveButton,
                            { 
                                backgroundColor: isClosed ? colors.border : (shouldShowStartBundle ? colors.error : colors.primary), 
                                opacity: (isSaving || isClosed) ? 0.6 : 1 
                            }
                        ]}
                        onPress={handleSave}
                        disabled={isSaving || isClosed}
                        activeOpacity={0.8}
                    >
                        <Ionicons name={isClosed ? "lock-closed-outline" : (shouldShowStartBundle ? "alert-circle-outline" : "save-outline")} size={20} color={isClosed ? colors.textSecondary : "#FFF"} />
                        <Text style={[styles.saveButtonText, isClosed && { color: colors.textSecondary }]}>
                            {isSaving 
                                ? 'Saving...' 
                                : isClosed
                                    ? 'Case Closed (View Only)'
                                    : shouldShowStartBundle 
                                        ? 'Save & Start Bundle' 
                                        : 'Save Vital Signs'}
                        </Text>
                    </TouchableOpacity>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

// ── Vital Input Component ────────────────────────────────────

function VitalInput({
    label,
    value,
    onChangeText,
    unit,
    icon,
    iconColor,
    colors,
    placeholder,
    isDecimal = false,
    editable = true,
}: {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    unit: string;
    icon: string;
    iconColor?: string;
    colors: any;
    placeholder: string;
    isDecimal?: boolean;
    editable?: boolean;
}) {
    const [isFocused, setIsFocused] = useState(false);

    return (
        <View style={styles.vitalInputContainer}>
            <View style={styles.vitalLabelRow}>
                <Ionicons name={icon as any} size={14} color={iconColor ?? colors.textSecondary} />
                <Text style={[styles.vitalInputLabel, { color: colors.textSecondary }]}>{label}</Text>
            </View>
            <View style={[
                styles.vitalInputRow,
                {
                    backgroundColor: editable ? colors.inputBackground : colors.border + '10',
                    borderColor: isFocused ? colors.primary : colors.inputBorder,
                    borderWidth: isFocused ? 1.5 : 1,
                    opacity: editable ? 1 : 0.7,
                },
            ]}>
                <TextInput
                    style={[styles.vitalInputField, { color: colors.text }]}
                    value={value}
                    onChangeText={(t) => {
                        const cleaned = isDecimal ? t.replace(/[^0-9.]/g, '') : t.replace(/[^0-9]/g, '');
                        onChangeText(cleaned);
                    }}
                    keyboardType={isDecimal ? 'decimal-pad' : 'numeric'}
                    placeholder={placeholder}
                    placeholderTextColor={colors.placeholder}
                    maxLength={isDecimal ? 5 : 3}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    textAlign="center"
                    editable={editable}
                />
                <Text style={[styles.vitalInputUnit, { color: colors.textSecondary }]}>{unit}</Text>
            </View>
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
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    backButton: { width: 40, height: 40, justifyContent: 'center' },
    headerCenter: { flex: 1, alignItems: 'center' },
    headerTitle: { ...Typography.headingMd },
    headerSubtitle: { ...Typography.bodySm, marginTop: 2 },

    scrollContent: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },

    // Shock banner
    shockBanner: {
        borderRadius: Radius.lg,
        padding: Spacing.md,
        marginBottom: Spacing.md,
    },
    shockBannerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.smd,
    },
    shockTextContainer: { flex: 1 },
    shockValue: { ...Typography.statMd },
    shockLabel: { ...Typography.labelSm },
    shockDesc: { ...Typography.bodySm, marginTop: Spacing.xs },

    // Sections
    sectionTitle: {
        ...Typography.labelMd,
        marginTop: Spacing.md,
        marginBottom: Spacing.sm,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        fontSize: 12,
    },
    section: {
        borderRadius: Radius.lg,
        borderWidth: 1,
        padding: Spacing.md,
        ...Shadows.sm,
    },

    // Vital inputs
    inputRow: {
        flexDirection: 'row',
        gap: Spacing.smd,
        marginBottom: Spacing.md,
    },
    vitalInputContainer: { flex: 1 },
    vitalLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: Spacing.xs,
    },
    vitalInputLabel: {
        ...Typography.labelSm,
        fontSize: 11,
    },
    vitalInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: Radius.md,
        paddingHorizontal: Spacing.smd,
        height: 48,
        gap: Spacing.xs,
    },
    vitalInputField: {
        flex: 1,
        ...Typography.bodyLg,
        fontSize: 18,
        fontWeight: '600',
        padding: 0,
    },
    vitalInputUnit: {
        ...Typography.bodySm,
        fontSize: 12,
        fontWeight: '500',
        opacity: 0.7,
    },

    // Blood loss
    bloodLossInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: Radius.md,
        paddingHorizontal: Spacing.md,
        height: 56,
        gap: Spacing.smd,
        marginBottom: Spacing.smd,
    },
    bloodLossValue: {
        ...Typography.statLg,
        flex: 1,
        fontSize: 28,
        padding: 0,
    },
    bloodLossUnit: { ...Typography.bodyLg, fontWeight: '500' },

    quickButtons: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginBottom: Spacing.smd,
    },
    quickButton: {
        flex: 1,
        borderWidth: 1,
        borderRadius: Radius.md,
        paddingVertical: Spacing.sm,
        alignItems: 'center',
    },
    quickButtonText: { ...Typography.labelSm, fontWeight: '700' },

    methodLabel: {
        ...Typography.labelSm,
        fontSize: 11,
        marginBottom: Spacing.xs,
    },
    methodRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginBottom: Spacing.smd,
    },
    methodChip: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.sm,
        borderRadius: Radius.md,
        borderWidth: 1,
        gap: Spacing.xs,
    },
    methodText: { ...Typography.labelSm },

    // Blood loss banner
    bloodLossBanner: {
        borderRadius: Radius.md,
        padding: Spacing.smd,
        alignItems: 'center',
    },
    bloodLossBannerLabel: { ...Typography.labelMd, fontWeight: '700' },
    bloodLossBannerDesc: { ...Typography.bodySm, marginTop: 2, textAlign: 'center' },

    // Save button
    saveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.md,
        borderRadius: Radius.lg,
        marginTop: Spacing.lg,
        gap: Spacing.sm,
        ...Shadows.sm,
    },
    saveButtonText: { color: '#FFF', ...Typography.buttonLg },
});
