import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { useClinical } from '@/context/clinical';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export function CaseTimeline() {
    const { caseEvents, isLoading } = useClinical();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    if (caseEvents.length === 0 && !isLoading) {
        return (
            <View style={[styles.emptyContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="list-outline" size={32} color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    No events logged for this case yet.
                </Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {caseEvents.map((event, index) => (
                <View key={event.local_id} style={styles.eventRow}>
                    {/* Timeline vertical line */}
                    <View style={styles.timelineLeft}>
                        <View style={[styles.timelineLine, { backgroundColor: colors.border }, index === caseEvents.length - 1 && { height: '50%' }, index === 0 && { top: '50%', height: '50%' }]} />
                        <View style={[styles.dot, { backgroundColor: getEventColor(event.event_type, colors) }]}>
                            <Ionicons name={getEventIcon(event.event_type) as any} size={12} color="#FFF" />
                        </View>
                    </View>

                    {/* Event details */}
                    <View style={[styles.eventContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={styles.eventHeader}>
                            <Text style={[styles.eventLabel, { color: colors.text }]}>{event.event_label}</Text>
                            <Text style={[styles.eventTime, { color: colors.textSecondary }]}>
                                {new Date(event.occurred_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                        </View>
                        {event.event_data && (
                            <Text style={[styles.eventData, { color: colors.textSecondary }]} numberOfLines={2}>
                                {formatEventData(event.event_type, event.event_data)}
                            </Text>
                        )}
                    </View>
                </View>
            ))}
        </View>
    );
}

function getEventIcon(type: string) {
    switch (type) {
        case 'vitals': return 'pulse';
        case 'emotive_step': return 'medical';
        case 'status_change': return 'time';
        case 'escalation': return 'alert-circle';
        case 'note': return 'chatbox-text';
        default: return 'ellipse';
    }
}

function getEventColor(type: string, colors: any) {
    switch (type) {
        case 'vitals': return colors.primary;
        case 'emotive_step': return '#10B981';
        case 'status_change': return '#6B7280';
        case 'escalation': return '#EF4444';
        case 'note': return '#F59E0B';
        default: return colors.border;
    }
}

function formatEventData(type: string, dataStr: string) {
    try {
        const data = JSON.parse(dataStr);
        if (type === 'vitals') {
            return `HR: ${data.hr || '—'} bpm, BP: ${data.bp || '—'} mmHg, SI: ${data.si?.toFixed(1) || '—'}`;
        }
        if (type === 'emotive_step') {
            const parts = [];
            if (data.dose) parts.push(`Dose: ${data.dose}`);
            if (data.volume) parts.push(`Vol: ${data.volume}`);
            if (data.notes) parts.push(`Notes: ${data.notes}`);
            return parts.join(', ') || 'Step completed';
        }
        return JSON.stringify(data);
    } catch {
        return dataStr;
    }
}

const styles = StyleSheet.create({
    container: {
        paddingVertical: Spacing.sm,
    },
    eventRow: {
        flexDirection: 'row',
        minHeight: 60,
    },
    timelineLeft: {
        width: 40,
        alignItems: 'center',
    },
    timelineLine: {
        position: 'absolute',
        width: 2,
        height: '100%',
    },
    dot: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
        zIndex: 1,
    },
    eventContent: {
        flex: 1,
        borderRadius: Radius.md,
        borderWidth: 1,
        padding: Spacing.smd,
        marginBottom: Spacing.sm,
        marginLeft: Spacing.xs,
    },
    eventHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 2,
    },
    eventLabel: {
        ...Typography.labelMd,
        flex: 1,
    },
    eventTime: {
        ...Typography.overline,
        fontSize: 10,
    },
    eventData: {
        ...Typography.bodySm,
        fontSize: 12,
    },
    emptyContainer: {
        borderRadius: Radius.lg,
        borderWidth: 1,
        padding: Spacing.xl,
        alignItems: 'center',
        gap: Spacing.sm,
        marginTop: Spacing.sm,
    },
    emptyText: {
        ...Typography.bodySm,
    },
});
