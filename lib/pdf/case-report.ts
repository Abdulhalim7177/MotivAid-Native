/**
 * PDF Case Report Generator
 *
 * Builds an HTML template from clinical data and generates/shares a PDF
 * using expo-print and expo-sharing.
 */

import { LocalCaseEvent, LocalEmotiveChecklist, LocalMaternalProfile, LocalVitalSign } from '@/lib/clinical-db';
import { RISK_LABELS, RiskLevel } from '@/lib/risk-calculator';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export interface CaseReportData {
    profile: LocalMaternalProfile & { riskResult?: { level: string; score: number; factors: { label: string; category: string }[] } };
    vitalSigns: (LocalVitalSign & { shockResult?: { value: number; level: string; label: string } })[];
    emotiveChecklist: LocalEmotiveChecklist | null;
    caseEvents: LocalCaseEvent[];
}

const EMOTIVE_STEPS = [
    { key: 'early_detection', letter: 'E', label: 'Early Detection', doseKey: null, volKey: null },
    { key: 'massage', letter: 'M', label: 'Uterine Massage', doseKey: null, volKey: null },
    { key: 'oxytocin', letter: 'O', label: 'Oxytocin', doseKey: 'oxytocin_dose', volKey: null },
    { key: 'txa', letter: 'T', label: 'Tranexamic Acid', doseKey: 'txa_dose', volKey: null },
    { key: 'iv_fluids', letter: 'I', label: 'IV Fluids', doseKey: null, volKey: 'iv_fluids_volume' },
    { key: 'escalation', letter: 'V/E', label: 'Escalation', doseKey: null, volKey: null },
];

function getRiskColor(level: string): string {
    switch (level) {
        case 'high': return '#C62828';
        case 'medium': return '#F57C00';
        case 'low': return '#2E7D32';
        default: return '#6B7280';
    }
}

function getSIColor(level: string): string {
    switch (level) {
        case 'emergency': return '#B71C1C';
        case 'critical': return '#D32F2F';
        case 'alert': return '#F57C00';
        case 'warning': return '#FFA000';
        default: return '#2E7D32';
    }
}

function formatTime(iso: string): string {
    try {
        return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch { return '—'; }
}

function formatDateTime(iso: string): string {
    try {
        return new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
    } catch { return '—'; }
}

export function buildCaseReportHTML(data: CaseReportData): string {
    const { profile, vitalSigns, emotiveChecklist, caseEvents } = data;
    const riskLabel = RISK_LABELS[(profile.risk_level as RiskLevel)] ?? profile.risk_level ?? 'Unknown';
    const riskColor = getRiskColor(profile.risk_level ?? 'low');
    const peakBloodLoss = vitalSigns.length > 0
        ? Math.max(...vitalSigns.map(v => v.estimated_blood_loss ?? 0))
        : 0;

    // E-MOTIVE rows
    const emotiveRows = EMOTIVE_STEPS.map(step => {
        const done = emotiveChecklist ? (emotiveChecklist as any)[`${step.key}_done`] : false;
        const time = emotiveChecklist ? (emotiveChecklist as any)[`${step.key}_time`] : null;
        const dose = step.doseKey && emotiveChecklist ? (emotiveChecklist as any)[step.doseKey] : null;
        const vol = step.volKey && emotiveChecklist ? (emotiveChecklist as any)[step.volKey] : null;
        return `
            <tr>
                <td style="font-weight:600;">${step.letter}</td>
                <td>${step.label}</td>
                <td style="text-align:center;color:${done ? '#2E7D32' : '#9CA3AF'}">${done ? 'Yes' : 'No'}</td>
                <td>${time ? formatTime(time) : '—'}</td>
                <td>${dose || vol || '—'}</td>
            </tr>`;
    }).join('');

    // Vitals rows
    const vitalsRows = vitalSigns.map(v => {
        const siColor = v.shockResult ? getSIColor(v.shockResult.level) : '#6B7280';
        return `
            <tr>
                <td>${formatTime(v.recorded_at)}</td>
                <td>${v.heart_rate ?? '—'}</td>
                <td>${v.systolic_bp && v.diastolic_bp ? `${v.systolic_bp}/${v.diastolic_bp}` : '—'}</td>
                <td>${v.temperature ?? '—'}</td>
                <td>${v.respiratory_rate ?? '—'}</td>
                <td>${v.spo2 != null ? `${v.spo2}%` : '—'}</td>
                <td>${v.estimated_blood_loss != null ? `${v.estimated_blood_loss}` : '—'}</td>
                <td style="color:${siColor};font-weight:600">${v.shock_index?.toFixed(1) ?? '—'}</td>
            </tr>`;
    }).join('');

    // Events rows
    const eventRows = caseEvents.slice().reverse().map(e => `
        <tr>
            <td>${formatDateTime(e.occurred_at)}</td>
            <td>${e.event_type.replace('_', ' ')}</td>
            <td>${e.event_label}</td>
        </tr>`
    ).join('');

    // Risk factors
    const factors = profile.riskResult?.factors ?? [];
    const factorsHtml = factors.length > 0
        ? `<div style="margin-top:8px;font-size:12px;color:#6B7280">
            ${factors.map(f => `<span style="display:inline-block;margin:2px 6px 2px 0;padding:2px 8px;border-radius:4px;background:${f.category === 'high' ? '#FEE2E2' : '#FEF3C7'};color:${f.category === 'high' ? '#991B1B' : '#92400E'}">${f.label}</span>`).join('')}
           </div>`
        : '';

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #1F2937; padding: 24px; }
    h1 { font-size: 20px; color: #9B51E0; margin-bottom: 4px; }
    h2 { font-size: 14px; color: #4B5563; margin: 16px 0 8px; padding-bottom: 4px; border-bottom: 2px solid #E5E7EB; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    th, td { padding: 6px 8px; text-align: left; border-bottom: 1px solid #E5E7EB; font-size: 12px; }
    th { background: #F9FAFB; font-weight: 600; color: #6B7280; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #9B51E0; }
    .risk-badge { display: inline-block; padding: 4px 12px; border-radius: 6px; font-weight: 700; font-size: 13px; }
    .demo-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 12px; }
    .demo-item label { font-size: 11px; color: #9CA3AF; text-transform: uppercase; }
    .demo-item span { display: block; font-weight: 600; font-size: 14px; }
    .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #E5E7EB; font-size: 11px; color: #9CA3AF; text-align: center; }
</style>
</head>
<body>
    <div class="header">
        <div>
            <h1>MotivAid Case Report</h1>
            <span style="font-size:12px;color:#9CA3AF">Generated ${formatDateTime(new Date().toISOString())}</span>
        </div>
        <div class="risk-badge" style="background:${riskColor}15;color:${riskColor}">
            ${riskLabel} Risk (Score: ${profile.risk_score ?? '—'})
        </div>
    </div>

    <h2>Patient Demographics</h2>
    <div class="demo-grid">
        <div class="demo-item"><label>Patient ID</label><span>${profile.patient_id || '—'}</span></div>
        <div class="demo-item"><label>Age</label><span>${profile.age} yrs</span></div>
        <div class="demo-item"><label>Gravida</label><span>${profile.gravida}</span></div>
        <div class="demo-item"><label>Parity</label><span>${profile.parity}</span></div>
        <div class="demo-item"><label>GA</label><span>${profile.gestational_age_weeks ? `${profile.gestational_age_weeks} wks` : '—'}</span></div>
        <div class="demo-item"><label>Hb</label><span>${profile.hemoglobin_level ? `${profile.hemoglobin_level} g/dL` : '—'}</span></div>
    </div>
    ${factorsHtml}

    <h2>E-MOTIVE Bundle</h2>
    <table>
        <thead><tr><th></th><th>Step</th><th>Done</th><th>Time</th><th>Details</th></tr></thead>
        <tbody>${emotiveRows}</tbody>
    </table>

    <h2>Vital Signs (${vitalSigns.length} recordings)</h2>
    <table>
        <thead><tr><th>Time</th><th>HR</th><th>BP</th><th>Temp</th><th>RR</th><th>SpO2</th><th>EBL</th><th>SI</th></tr></thead>
        <tbody>${vitalsRows}</tbody>
    </table>
    ${peakBloodLoss > 0 ? `<p style="text-align:right;font-weight:600;color:${peakBloodLoss >= 500 ? '#DC2626' : '#1F2937'}">Peak Blood Loss: ${peakBloodLoss} mL</p>` : ''}

    ${caseEvents.length > 0 ? `
    <h2>Case Events (${caseEvents.length})</h2>
    <table>
        <thead><tr><th>Time</th><th>Type</th><th>Description</th></tr></thead>
        <tbody>${eventRows}</tbody>
    </table>` : ''}

    <h2>Outcome</h2>
    <table>
        <tbody>
            <tr><td style="width:120px;font-weight:600">Status</td><td>${(profile.status ?? 'unknown').replace('_', ' ')}</td></tr>
            ${profile.outcome ? `<tr><td style="font-weight:600">Outcome</td><td>${profile.outcome.replace('_', ' ')}</td></tr>` : ''}
            <tr><td style="font-weight:600">Created</td><td>${formatDateTime(profile.created_at)}</td></tr>
            ${profile.delivery_time ? `<tr><td style="font-weight:600">Delivery</td><td>${formatDateTime(profile.delivery_time)}</td></tr>` : ''}
        </tbody>
    </table>

    <div class="footer">
        Generated by MotivAid &mdash; Clinical Decision Support for PPH Management
    </div>
</body>
</html>`;
}

export async function generateCaseReportPDF(data: CaseReportData): Promise<string> {
    const html = buildCaseReportHTML(data);
    const { uri } = await Print.printToFileAsync({ html, base64: false });
    return uri;
}

export async function shareCaseReport(data: CaseReportData): Promise<void> {
    const uri = await generateCaseReportPDF(data);
    if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
            mimeType: 'application/pdf',
            dialogTitle: `Case Report - ${data.profile.patient_id || 'Patient'}`,
        });
    }
}

export async function printCaseReport(data: CaseReportData): Promise<void> {
    const html = buildCaseReportHTML(data);
    await Print.printAsync({ html });
}
