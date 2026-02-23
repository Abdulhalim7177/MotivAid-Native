# Phase 4: Timeline, Alerts & Escalation

## Database & Sync
- [x] Migration `20260224000000_emergency_and_timeline.sql` — `emergency_contacts`, `case_events`, `audit_logs`
- [x] Update `lib/clinical-db.native.ts` — SQLite tables for contacts and events
- [x] Update `lib/sync-queue.ts` — Add case_events to sync engine

## Core Logic & Context
- [x] Update `context/clinical.tsx` — Add methods for fetching contacts and events
- [x] Implement auto-logging of events (vitals, checklist steps) in clinical context

## UI Components
- [x] `components/clinical/case-timeline.tsx` — Vertical chronological feed
- [x] `components/clinical/escalation-modal.tsx` — Tiered contact list with one-tap call

## Screens
- [x] Update `app/(app)/clinical/patient-detail.tsx` — Integrate Timeline and Escalation button
- [x] `app/(app)/management/emergency-contacts.tsx` — Supervisor UI to manage contacts

## Reporting
- [ ] `lib/report-generator.ts` — Logic to compile timeline into a summary
- [ ] Case summary view for closed cases
