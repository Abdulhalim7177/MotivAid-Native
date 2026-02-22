/**
 * Obstetric Shock Index (OSI) Calculator & Alert System
 *
 * Based on published clinical thresholds for postpartum hemorrhage.
 * SI = Heart Rate / Systolic Blood Pressure
 *
 * Thresholds:
 *   < 0.9  → Normal
 *   ≥ 0.9  → Warning (increased vigilance)
 *   ≥ 1.1  → Alert (prepare for intervention)
 *   ≥ 1.4  → Critical (urgent intervention)
 *   ≥ 1.7  → Emergency (immediate action)
 */

import * as Haptics from 'expo-haptics';

export type ShockLevel = 'normal' | 'warning' | 'alert' | 'critical' | 'emergency';

export interface ShockResult {
    value: number;
    level: ShockLevel;
    label: string;
    color: string;
    bgColor: string;
    description: string;
    shouldPulse: boolean;
}

// ── Thresholds ───────────────────────────────────────────────

const THRESHOLDS: {
    min: number;
    level: ShockLevel;
    label: string;
    color: string;
    bgColor: string;
    description: string;
    shouldPulse: boolean;
}[] = [
        {
            min: 1.7,
            level: 'emergency',
            label: 'EMERGENCY',
            color: '#FFFFFF',
            bgColor: '#B71C1C',
            description: 'Life-threatening — Immediate intervention required',
            shouldPulse: true,
        },
        {
            min: 1.4,
            level: 'critical',
            label: 'CRITICAL',
            color: '#FFFFFF',
            bgColor: '#D32F2F',
            description: 'Urgent intervention needed in tertiary facility',
            shouldPulse: true,
        },
        {
            min: 1.1,
            level: 'alert',
            label: 'ALERT',
            color: '#FFFFFF',
            bgColor: '#F57C00',
            description: 'Prepare for intervention — consider transfusion',
            shouldPulse: false,
        },
        {
            min: 0.9,
            level: 'warning',
            label: 'WARNING',
            color: '#FFFFFF',
            bgColor: '#FFA000',
            description: 'Increased vigilance — closer monitoring required',
            shouldPulse: false,
        },
        {
            min: 0,
            level: 'normal',
            label: 'NORMAL',
            color: '#2E7D32',
            bgColor: '#E8F5E9',
            description: 'Within normal range for postpartum patients',
            shouldPulse: false,
        },
    ];

// ── Calculation ──────────────────────────────────────────────

export function calculateShockIndex(
    heartRate: number,
    systolicBp: number
): ShockResult {
    if (systolicBp <= 0) {
        return {
            value: 0,
            level: 'emergency',
            label: 'INVALID',
            color: '#FFFFFF',
            bgColor: '#B71C1C',
            description: 'Invalid blood pressure — cannot calculate SI',
            shouldPulse: true,
        };
    }

    const value = Math.round((heartRate / systolicBp) * 10) / 10; // 1 decimal

    for (const threshold of THRESHOLDS) {
        if (value >= threshold.min) {
            return { value, ...threshold };
        }
    }

    // Fallback (should never reach)
    return {
        value,
        level: 'normal',
        label: 'NORMAL',
        color: '#2E7D32',
        bgColor: '#E8F5E9',
        description: 'Within normal range',
        shouldPulse: false,
    };
}

// ── Haptic Feedback ──────────────────────────────────────────

export function triggerShockHaptic(level: ShockLevel): void {
    switch (level) {
        case 'emergency':
        case 'critical':
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            break;
        case 'alert':
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            break;
        case 'warning':
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            break;
        default:
            // No haptic for normal
            break;
    }
}

// ── Formatting Helpers ───────────────────────────────────────

export function formatShockIndex(value: number): string {
    return value.toFixed(1);
}

export function getShockDescription(level: ShockLevel): string {
    const desc = THRESHOLDS.find((t) => t.level === level);
    return desc?.description ?? '';
}

// ── Blood Loss Severity ──────────────────────────────────────

export type BloodLossLevel = 'normal' | 'pph' | 'severe_pph' | 'massive';

export interface BloodLossResult {
    level: BloodLossLevel;
    label: string;
    color: string;
    bgColor: string;
    description: string;
}

/**
 * WHO 2023/2025 PPH blood loss thresholds:
 * - Normal: <300 mL
 * - PPH (with clinical signs): ≥300 mL + abnormal signs
 * - PPH (safety net): ≥500 mL
 * - Severe PPH: ≥1000 mL
 * - Massive hemorrhage: ≥1500 mL
 */
export function assessBloodLoss(
    estimatedMl: number,
    hasAbnormalSigns: boolean = false
): BloodLossResult {
    if (estimatedMl >= 1500) {
        return {
            level: 'massive',
            label: 'MASSIVE HEMORRHAGE',
            color: '#FFFFFF',
            bgColor: '#B71C1C',
            description: `${estimatedMl} mL — Massive hemorrhage, immediate action required`,
        };
    }
    if (estimatedMl >= 1000) {
        return {
            level: 'severe_pph',
            label: 'SEVERE PPH',
            color: '#FFFFFF',
            bgColor: '#D32F2F',
            description: `${estimatedMl} mL — Severe postpartum hemorrhage`,
        };
    }
    if (estimatedMl >= 500 || (estimatedMl >= 300 && hasAbnormalSigns)) {
        return {
            level: 'pph',
            label: 'PPH DETECTED',
            color: '#FFFFFF',
            bgColor: '#F57C00',
            description: `${estimatedMl} mL — Postpartum hemorrhage threshold reached`,
        };
    }
    return {
        level: 'normal',
        label: 'NORMAL',
        color: '#2E7D32',
        bgColor: '#E8F5E9',
        description: `${estimatedMl} mL — Within expected range`,
    };
}
