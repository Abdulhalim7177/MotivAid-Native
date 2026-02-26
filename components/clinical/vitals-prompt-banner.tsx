/**
 * VitalsPromptBanner — Auto-prompt notification for vital signs
 *
 * Shows a prominent banner when vital signs are due for the active patient.
 * Appears at the bottom of the screen with a "Record Now" button.
 * Can be dismissed with a "Later" button.
 */

import { Radius, Spacing, Typography } from '@/constants/theme';
import { useClinical } from '@/context/clinical';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withSpring,
    withTiming
} from 'react-native-reanimated';

export function VitalsPromptBanner() {
    const {
        isVitalsPromptDue,
        dismissVitalsPrompt,
        activeProfile,
        lastVitalsTime,
        vitalSigns,
        vitalsPromptInterval,
        user,
    } = useClinical();

    // Slide-in animation
    const translateY = useSharedValue(100);
    const pulse = useSharedValue(1);
    const hasTriggeredHaptic = useRef(false);

    const isCreator = activeProfile?.created_by === user?.id;
    // Show prompt if it's due OR if there are no vitals yet for an active/monitoring case
    const isActuallyDue = isVitalsPromptDue || (activeProfile && vitalSigns.length === 0 && (activeProfile.status === 'active' || activeProfile.status === 'monitoring'));

    useEffect(() => {
        if (isActuallyDue && activeProfile && isCreator && activeProfile.status !== 'closed') {
            translateY.value = withSpring(0, { damping: 15, stiffness: 120 });
            pulse.value = withRepeat(
                withSequence(
                    withTiming(1.02, { duration: 800 }),
                    withTiming(1, { duration: 800 })
                ),
                -1,
                true
            );

            // Haptic once per prompt
            if (!hasTriggeredHaptic.current) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                hasTriggeredHaptic.current = true;
            }
        } else {
            translateY.value = withSpring(100);
            hasTriggeredHaptic.current = false;
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isActuallyDue, activeProfile, isCreator]);

    const containerStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }, { scale: pulse.value }],
    }));

    if (!isActuallyDue || !activeProfile || activeProfile.status === 'closed' || !isCreator) return null;

    const elapsedMin = lastVitalsTime
        ? Math.floor((Date.now() - lastVitalsTime.getTime()) / 1000 / 60)
        : null;

    return (
        <Animated.View style={[styles.container, containerStyle]}>
            <View style={styles.banner}>
                <View style={styles.iconContainer}>
                    <Ionicons name="pulse" size={24} color="#FFF" />
                </View>

                <View style={styles.textContainer}>
                    <Text style={styles.title}>{vitalSigns.length === 0 ? 'Initial Vitals' : 'Vitals Due'}</Text>
                    <Text style={styles.subtitle}>
                        {vitalSigns.length === 0
                            ? 'Please record initial vitals for this case'
                            : elapsedMin != null
                                ? `Last recorded ${elapsedMin}m ago (${vitalsPromptInterval}m interval)`
                                : `No vitals recorded yet`}
                    </Text>
                </View>

                <View style={styles.actions}>
                    <TouchableOpacity
                        style={styles.recordButton}
                        onPress={() => {
                            router.push({
                                pathname: '/(app)/clinical/record-vitals',
                                params: { localId: activeProfile.local_id },
                            });
                        }}
                    >
                        <Text style={styles.recordText}>Record</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={dismissVitalsPrompt}
                        style={styles.laterButton}
                    >
                        <Text style={styles.laterText}>Later</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 90, // Above floating buttons if any, or bottom of screen
        left: Spacing.md,
        right: Spacing.md,
        zIndex: 999,
    },
    banner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#C62828',
        borderRadius: Radius.lg,
        paddingVertical: Spacing.smd,
        paddingHorizontal: Spacing.md,
        gap: Spacing.smd,
        shadowColor: '#C62828',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    textContainer: {
        flex: 1,
    },
    title: {
        color: '#FFF',
        ...Typography.labelMd,
    },
    subtitle: {
        color: 'rgba(255,255,255,0.8)',
        ...Typography.bodySm,
        marginTop: 1,
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
    },
    recordButton: {
        backgroundColor: '#FFF',
        paddingHorizontal: Spacing.smd,
        paddingVertical: Spacing.xs,
        borderRadius: Radius.md,
    },
    recordText: {
        color: '#C62828',
        ...Typography.buttonSm,
    },
    laterButton: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs,
    },
    laterText: {
        color: 'rgba(255,255,255,0.7)',
        ...Typography.buttonSm,
    },
});
