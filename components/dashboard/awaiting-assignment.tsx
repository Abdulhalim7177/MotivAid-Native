import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useAppTheme } from '@/context/theme';
import { useUnits } from '@/context/unit';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

export function AwaitingAssignment() {
    const { theme } = useAppTheme();
    const themeColors = Colors[theme];
    const { user, profile } = useAuth();
    const { refreshUnits } = useUnits();
    const [facilityName, setFacilityName] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    // Staff roles that can access clinical mode
    const isStaffRole = ['midwife', 'nurse', 'student', 'supervisor', 'admin'].includes(profile?.role || '');
    const isNormalUser = !profile?.role || profile.role === 'user';

    useEffect(() => {
        fetchFacility();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchFacility = async () => {
        try {
            if (!user?.id) return;

            const { data } = await supabase
                .from('profiles')
                .select('facility_id, facilities:facility_id(name)')
                .eq('id', user.id)
                .maybeSingle();

            // @ts-ignore
            if (data?.facilities?.name) setFacilityName(data.facilities.name);
        } catch { }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await refreshUnits();
        setRefreshing(false);
    };

    return (
        <View style={styles.container}>
            <Animated.View entering={FadeInDown.springify()} style={styles.content}>
                {/* Icon */}
                <View style={[styles.iconCircle, { backgroundColor: themeColors.primary + '15' }]}>
                    <IconSymbol name="clock.fill" size={36} color={themeColors.primary} />
                </View>

                {/* Heading */}
                <Text style={[styles.heading, { color: themeColors.text }]}>
                    Awaiting Unit Assignment
                </Text>
                <Text style={[styles.description, { color: themeColors.textSecondary }]}>
                    Your account has been created successfully. A supervisor needs to assign you to a unit before you can access the full dashboard. However, you can still access clinical mode to create and manage patient cases.
                </Text>

                {/* Facility info */}
                {facilityName && (
                    <Card style={styles.facilityCard}>
                        <View style={styles.facilityRow}>
                            <View style={[styles.facilityIcon, { backgroundColor: themeColors.primary + '15' }]}>
                                <IconSymbol name="building.2" size={20} color={themeColors.primary} />
                            </View>
                            <View>
                                <Text style={[styles.facilityLabel, { color: themeColors.textSecondary }]}>
                                    Registered Facility
                                </Text>
                                <Text style={[styles.facilityName, { color: themeColors.text }]}>
                                    {facilityName}
                                </Text>
                            </View>
                        </View>
                    </Card>
                )}

                {/* What to expect */}
                <Card style={styles.stepsCard}>
                    <Text style={[styles.stepsTitle, { color: themeColors.text }]}>What happens next?</Text>
                    <Step number="1" text="Your supervisor will review your registration" color={themeColors} />
                    <Step number="2" text="You'll be assigned to a unit" color={themeColors} />
                    <Step number="3" text="Full dashboard access will be unlocked" color={themeColors} />
                </Card>

                {/* Clinical Mode Access */}
                {(isStaffRole || isNormalUser) && (
                    <Card style={[styles.clinicalCard, { backgroundColor: themeColors.primary + '08', borderColor: themeColors.primary + '30' }]}>
                        <View style={styles.clinicalHeader}>
                            <View style={[styles.clinicalIcon, { backgroundColor: themeColors.primary + '20' }]}>
                                <IconSymbol name="cross.case.fill" size={24} color={themeColors.primary} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.clinicalTitle, { color: themeColors.text }]}>
                                    Clinical Mode Access
                                </Text>
                                <Text style={[styles.clinicalDescription, { color: themeColors.textSecondary }]}>
                                    You can create and manage patient cases while waiting for unit assignment
                                </Text>
                            </View>
                        </View>
                        <Button
                            title="Open Clinical Mode"
                            onPress={() => router.push('/(app)/(tabs)/clinical')}
                            style={styles.clinicalButton}
                        />
                    </Card>
                )}

                {/* Refresh */}
                <Button
                    title="Check Assignment Status"
                    onPress={handleRefresh}
                    loading={refreshing}
                    disabled={refreshing}
                    style={styles.refreshButton}
                />
            </Animated.View>
        </View>
    );
}

function Step({ number, text, color }: { number: string; text: string; color: any }) {
    return (
        <View style={styles.stepRow}>
            <View style={[styles.stepBadge, { backgroundColor: color.primary + '15' }]}>
                <Text style={[styles.stepNumber, { color: color.primary }]}>{number}</Text>
            </View>
            <Text style={[styles.stepText, { color: color.textSecondary }]}>{text}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        paddingBottom: Spacing.sm,
    },
    content: {
        alignItems: 'center',
    },
    iconCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.sm,
    },
    heading: {
        ...Typography.headingMd,
        textAlign: 'center',
        marginBottom: Spacing.xs,
    },
    description: {
        ...Typography.bodySm,
        textAlign: 'center',
        paddingHorizontal: Spacing.lg,
        marginBottom: Spacing.md,
        lineHeight: 20,
    },
    facilityCard: {
        width: '100%',
        marginBottom: Spacing.sm,
    },
    facilityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
    },
    facilityIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    facilityLabel: {
        ...Typography.caption,
    },
    facilityName: {
        ...Typography.labelLg,
        marginTop: 2,
    },
    stepsCard: {
        width: '100%',
        marginBottom: Spacing.sm,
    },
    stepsTitle: {
        ...Typography.labelMd,
        marginBottom: Spacing.xs,
    },
    stepRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        marginBottom: Spacing.xs,
    },
    stepBadge: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepNumber: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    stepText: {
        ...Typography.bodySm,
        flex: 1,
    },
    refreshButton: {
        width: '100%',
    },
    clinicalCard: {
        width: '100%',
        marginBottom: Spacing.sm,
        borderWidth: 1,
    },
    clinicalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        marginBottom: Spacing.sm,
    },
    clinicalIcon: {
        width: 40,
        height: 40,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    clinicalTitle: {
        ...Typography.labelLg,
    },
    clinicalDescription: {
        ...Typography.bodySm,
        marginTop: 2,
    },
    clinicalButton: {
        width: '100%',
    },
});
