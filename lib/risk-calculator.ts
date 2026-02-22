/**
 * AWHONN-adapted PPH Risk Calculator
 *
 * Categorizes maternal patients into Low / Medium / High risk
 * based on the Association of Women's Health, Obstetric and
 * Neonatal Nurses (AWHONN) risk assessment model and WHO 2023 guidelines.
 *
 * Key rule: 2+ medium-risk factors auto-escalate to HIGH.
 */

export type RiskLevel = 'low' | 'medium' | 'high';

export interface RiskFactor {
    id: string;
    label: string;
    category: 'medium' | 'high';
    weight: number;
    description: string;
}

export interface RiskResult {
    level: RiskLevel;
    score: number;
    factors: RiskFactor[];
    summary: string;
}

export interface MaternalRiskInput {
    age: number;
    parity: number;
    gestationalAgeWeeks?: number;
    isMultipleGestation: boolean;
    hasPriorCesarean: boolean;
    hasPlacentaPrevia: boolean;
    hasLargeFibroids: boolean;
    hasAnemia: boolean;           // Hct <30% / Hb <10
    hasPphHistory: boolean;       // 1 previous PPH
    hasIntraamnioticInfection: boolean;
    hasSevereAnemia: boolean;     // Hb <8
    hasCoagulopathy: boolean;
    hasSeverePphHistory: boolean;  // >1 PPH or >1500mL or required transfusion
    hasPlacentaAccreta: boolean;
    hasActiveBleeding: boolean;
    hasMorbidObesity: boolean;
    hemoglobinLevel?: number;      // g/dL
}

// ── Risk Factor Definitions ──────────────────────────────────

const MEDIUM_RISK_FACTORS: Omit<RiskFactor, 'id'>[] = [
    {
        label: 'Advanced or Young Maternal Age',
        category: 'medium',
        weight: 1,
        description: 'Age <18 or >35 years',
    },
    {
        label: 'Grand Multiparity',
        category: 'medium',
        weight: 1,
        description: 'More than 4 previous births',
    },
    {
        label: 'Preterm or Post-term',
        category: 'medium',
        weight: 1,
        description: 'Gestational age <37 or >41 weeks',
    },
    {
        label: 'Multiple Gestation',
        category: 'medium',
        weight: 1,
        description: 'Twin, triplet, or higher-order pregnancy',
    },
    {
        label: 'Prior Cesarean Section',
        category: 'medium',
        weight: 1,
        description: 'Previous uterine incision or cesarean birth',
    },
    {
        label: 'Placenta Previa',
        category: 'medium',
        weight: 1,
        description: 'Low-lying placenta or placenta previa',
    },
    {
        label: 'Large Uterine Fibroids',
        category: 'medium',
        weight: 1,
        description: 'Fibroids that may impair uterine contraction',
    },
    {
        label: 'Anemia',
        category: 'medium',
        weight: 1,
        description: 'Hemoglobin <10 g/dL or Hematocrit <30%',
    },
    {
        label: 'Previous PPH',
        category: 'medium',
        weight: 1,
        description: 'One prior episode of postpartum hemorrhage',
    },
    {
        label: 'Intraamniotic Infection',
        category: 'medium',
        weight: 1,
        description: 'Chorioamnionitis or intraamniotic infection',
    },
];

const HIGH_RISK_FACTORS: Omit<RiskFactor, 'id'>[] = [
    {
        label: 'Active Bleeding',
        category: 'high',
        weight: 3,
        description: 'Suspected abruption or active bleeding beyond bloody show',
    },
    {
        label: 'Placenta Accreta Spectrum',
        category: 'high',
        weight: 3,
        description: 'Suspected placenta accreta, increta, or percreta',
    },
    {
        label: 'Known Coagulopathy',
        category: 'high',
        weight: 3,
        description: 'Diagnosed bleeding disorder or coagulation abnormality',
    },
    {
        label: 'Recurrent / Severe PPH History',
        category: 'high',
        weight: 3,
        description: 'More than 1 previous PPH, or prior PPH >1500mL, or required transfusion',
    },
    {
        label: 'Severe Anemia',
        category: 'high',
        weight: 3,
        description: 'Hemoglobin <8 g/dL',
    },
    {
        label: 'Morbid Obesity',
        category: 'high',
        weight: 2,
        description: 'BMI ≥40 kg/m², which increases surgical and hemorrhage risk',
    },
];

// ── Risk Calculation ─────────────────────────────────────────

export function calculateRisk(input: MaternalRiskInput): RiskResult {
    const detectedFactors: RiskFactor[] = [];
    let factorIndex = 0;

    // Check medium-risk factors
    const mediumChecks: [boolean, number][] = [
        [input.age < 18 || input.age > 35, 0],
        [input.parity > 4, 1],
        [
            input.gestationalAgeWeeks !== undefined &&
            (input.gestationalAgeWeeks < 37 || input.gestationalAgeWeeks > 41),
            2,
        ],
        [input.isMultipleGestation, 3],
        [input.hasPriorCesarean, 4],
        [input.hasPlacentaPrevia, 5],
        [input.hasLargeFibroids, 6],
        [input.hasAnemia, 7],
        [input.hasPphHistory, 8],
        [input.hasIntraamnioticInfection, 9],
    ];

    for (const [isPresent, idx] of mediumChecks) {
        if (isPresent) {
            detectedFactors.push({
                ...MEDIUM_RISK_FACTORS[idx],
                id: `medium_${factorIndex++}`,
            });
        }
    }

    // Auto-detect anemia from hemoglobin level
    if (
        !input.hasAnemia &&
        !input.hasSevereAnemia &&
        input.hemoglobinLevel !== undefined &&
        input.hemoglobinLevel < 10 &&
        input.hemoglobinLevel >= 8
    ) {
        detectedFactors.push({
            ...MEDIUM_RISK_FACTORS[7], // Anemia
            id: `medium_${factorIndex++}`,
        });
    }

    // Check high-risk factors
    const highChecks: [boolean, number][] = [
        [input.hasActiveBleeding, 0],
        [input.hasPlacentaAccreta, 1],
        [input.hasCoagulopathy, 2],
        [input.hasSeverePphHistory, 3],
        [input.hasSevereAnemia, 4],
        [input.hasMorbidObesity, 5],
    ];

    for (const [isPresent, idx] of highChecks) {
        if (isPresent) {
            detectedFactors.push({
                ...HIGH_RISK_FACTORS[idx],
                id: `high_${factorIndex++}`,
            });
        }
    }

    // Auto-detect severe anemia from hemoglobin level
    if (
        !input.hasSevereAnemia &&
        input.hemoglobinLevel !== undefined &&
        input.hemoglobinLevel < 8
    ) {
        detectedFactors.push({
            ...HIGH_RISK_FACTORS[4], // Severe anemia
            id: `high_${factorIndex++}`,
        });
    }

    // Calculate score
    const score = detectedFactors.reduce((sum, f) => sum + f.weight, 0);

    // Determine risk level
    const highRiskCount = detectedFactors.filter(
        (f) => f.category === 'high'
    ).length;
    const mediumRiskCount = detectedFactors.filter(
        (f) => f.category === 'medium'
    ).length;

    let level: RiskLevel;
    let summary: string;

    if (highRiskCount > 0) {
        level = 'high';
        summary = `HIGH risk — ${highRiskCount} high-risk factor${highRiskCount > 1 ? 's' : ''} detected`;
    } else if (mediumRiskCount >= 2) {
        // AWHONN rule: 2+ medium-risk factors → auto-escalate to HIGH
        level = 'high';
        summary = `HIGH risk — ${mediumRiskCount} medium-risk factors (AWHONN auto-escalation)`;
    } else if (mediumRiskCount === 1) {
        level = 'medium';
        summary = `MEDIUM risk — 1 risk factor identified`;
    } else {
        level = 'low';
        summary = 'LOW risk — No significant risk factors identified';
    }

    return { level, score, factors: detectedFactors, summary };
}

// ── Risk Level Colors ────────────────────────────────────────

export const RISK_COLORS: Record<RiskLevel, { bg: string; text: string; border: string }> = {
    low: { bg: '#E8F5E9', text: '#2E7D32', border: '#4CAF50' },
    medium: { bg: '#FFF3E0', text: '#E65100', border: '#FF9800' },
    high: { bg: '#FFEBEE', text: '#C62828', border: '#F44336' },
};

export const RISK_LABELS: Record<RiskLevel, string> = {
    low: 'Low Risk',
    medium: 'Medium Risk',
    high: 'High Risk',
};

// ── All Available Risk Factors (for UI toggles) ──────────────

export function getAllRiskFactors(): {
    medium: (RiskFactor & { fieldName: keyof MaternalRiskInput })[];
    high: (RiskFactor & { fieldName: keyof MaternalRiskInput })[];
} {
    const mediumFields: (keyof MaternalRiskInput)[] = [
        'age', // special handling — not a boolean
        'parity', // special handling
        'gestationalAgeWeeks', // special handling
        'isMultipleGestation',
        'hasPriorCesarean',
        'hasPlacentaPrevia',
        'hasLargeFibroids',
        'hasAnemia',
        'hasPphHistory',
        'hasIntraamnioticInfection',
    ];

    const highFields: (keyof MaternalRiskInput)[] = [
        'hasActiveBleeding',
        'hasPlacentaAccreta',
        'hasCoagulopathy',
        'hasSeverePphHistory',
        'hasSevereAnemia',
        'hasMorbidObesity',
    ];

    return {
        medium: MEDIUM_RISK_FACTORS.map((f, i) => ({
            ...f,
            id: `medium_${i}`,
            fieldName: mediumFields[i],
        })),
        high: HIGH_RISK_FACTORS.map((f, i) => ({
            ...f,
            id: `high_${i}`,
            fieldName: highFields[i],
        })),
    };
}
