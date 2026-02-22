# Phase 3: Risk Assessment & Clinical Data

## Database
- [x] Migration `20260220000000_clinical_data_tables.sql` — `maternal_profiles`, `vital_signs`, `sync_queue` + RLS

## Core Logic
- [x] `lib/risk-calculator.ts` — AWHONN-adapted PPH risk scoring
- [x] `lib/shock-index.ts` — Obstetric Shock Index + blood loss assessment
- [x] `lib/clinical-db.native.ts` — SQLite offline CRUD
- [x] `lib/clinical-db.ts` — Web stubs
- [x] `lib/sync-queue.ts` — Offline-first sync engine

## State & Navigation
- [x] `context/clinical.tsx` — Clinical workflow context
- [x] `app/_layout.tsx` — ClinicalProvider added
- [x] `app/(app)/(tabs)/_layout.tsx` — Clinical tab added
- [x] `app/(app)/_layout.tsx` — Clinical routes added
- [x] `components/ui/icon-symbol.tsx` — `cross.case.fill` mapping

## Screens
- [x] `app/(app)/(tabs)/clinical.tsx` — Case list with filters
- [x] `app/(app)/clinical/new-patient.tsx` — Patient form + live risk banner
- [x] `app/(app)/clinical/patient-detail.tsx` — Risk, metrics, vitals timeline
- [x] `app/(app)/clinical/record-vitals.tsx` — Vitals entry + live shock index

## Components
- [x] `components/clinical/vitals-prompt-banner.tsx` — Auto-prompt notification

## Dashboard Integration
- [x] Staff dashboard: "New Case" → new-patient, "My Patients" → clinical tab, "View All" → clinical tab
- [x] Supervisor dashboard: "Cases" action → clinical tab

## Future
- [ ] Documentation updates
