/**
 * ShockAlarmBanner — Persistent alarm banner for critical/emergency shock index
 *
 * - Critical: Red banner, dismissible with "Acknowledge" (5-min cooldown)
 * - Emergency: Red pulsing banner, NOT dismissible (mute only)
 */

import { Radius, Spacing, Typography } from '@/constants/theme';
import { ShockLevel } from '@/lib/shock-index';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
} from 'react-native-reanimated';

interface ShockAlarmBannerProps {
    shockLevel: ShockLevel;
    shockValue: number;
    isMuted: boolean;
    onMuteToggle: () => void;
}

const ACKNOWLEDGE_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

export function ShockAlarmBanner({ shockLevel, shockValue, isMuted, onMuteToggle }: ShockAlarmBannerProps) {
    const [acknowledged, setAcknowledged] = useState(false);
    const cooldownRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const isEmergency = shockLevel === 'emergency';
    const isCritical = shockLevel === 'critical';
    const shouldShow = (isEmergency || isCritical) && !acknowledged;

    // Pulse animation for emergency
    const pulseOpacity = useSharedValue(1);
    const pulseStyle = useAnimatedStyle(() => ({
        opacity: pulseOpacity.value,
    }));

    useEffect(() => {
        if (isEmergency) {
            pulseOpacity.value = withRepeat(
                withSequence(
                    withTiming(0.6, { duration: 400 }),
                    withTiming(1, { duration: 400 })
                ),
                -1,
                true
            );
        } else {
            pulseOpacity.value = 1;
        }
    }, [isEmergency, pulseOpacity]);

    // Reset acknowledged when level changes
    useEffect(() => {
        setAcknowledged(false);
        if (cooldownRef.current) clearTimeout(cooldownRef.current);
    }, [shockLevel]);

    const handleAcknowledge = useCallback(() => {
        if (isEmergency) return; // Emergency cannot be acknowledged
        setAcknowledged(true);
        cooldownRef.current = setTimeout(() => {
            setAcknowledged(false);
        }, ACKNOWLEDGE_COOLDOWN_MS);
    }, [isEmergency]);

    useEffect(() => {
        return () => {
            if (cooldownRef.current) clearTimeout(cooldownRef.current);
        };
    }, []);

    if (!shouldShow) return null;

    return (
        <Animated.View
            style={[
                styles.banner,
                { backgroundColor: isEmergency ? '#B71C1C' : '#D32F2F' },
                pulseStyle,
            ]}
        >
            <View style={styles.row}>
                <Ionicons name="alert-circle" size={24} color="#FFFFFF" />
                <View style={styles.textContainer}>
                    <Text style={styles.levelText}>
                        {isEmergency ? 'EMERGENCY' : 'CRITICAL'} — SI: {shockValue.toFixed(1)}
                    </Text>
                    <Text style={styles.descText}>
                        {isEmergency
                            ? 'Life-threatening — Immediate intervention required'
                            : 'Urgent intervention needed'}
                    </Text>
                </View>
            </View>
            <View style={styles.actions}>
                <TouchableOpacity
                    onPress={onMuteToggle}
                    style={[styles.actionButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
                >
                    <Ionicons
                        name={isMuted ? 'volume-mute' : 'volume-high'}
                        size={16}
                        color="#FFFFFF"
                    />
                    <Text style={styles.actionText}>{isMuted ? 'Unmute' : 'Mute'}</Text>
                </TouchableOpacity>
                {isCritical && (
                    <TouchableOpacity
                        onPress={handleAcknowledge}
                        style={[styles.actionButton, { backgroundColor: 'rgba(255,255,255,0.3)' }]}
                    >
                        <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                        <Text style={styles.actionText}>Acknowledge</Text>
                    </TouchableOpacity>
                )}
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    banner: {
        padding: Spacing.smd,
        borderRadius: Radius.md,
        marginBottom: Spacing.sm,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    textContainer: {
        flex: 1,
    },
    levelText: {
        ...Typography.labelLg,
        color: '#FFFFFF',
        fontWeight: '800',
    },
    descText: {
        ...Typography.bodySm,
        color: 'rgba(255,255,255,0.9)',
        marginTop: 2,
    },
    actions: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginTop: Spacing.sm,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        paddingHorizontal: Spacing.smd,
        paddingVertical: Spacing.xs,
        borderRadius: Radius.sm,
    },
    actionText: {
        ...Typography.labelSm,
        color: '#FFFFFF',
    },
});
