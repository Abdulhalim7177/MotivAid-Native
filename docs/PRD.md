# MotivAid - Product Requirements Document

## Executive Summary

**MotivAid** is a mobile health (mHealth) application designed to support midwives and frontline healthcare workers in the early detection, prevention, and management of postpartum hemorrhage (PPH) using the WHO-endorsed **E-MOTIVE** clinical bundle.

> PPH is the leading cause of maternal mortality in low-resource settings. This app aims to reduce maternal deaths through timely intervention and standardized care.

---

## Product Vision

A **trusted digital companion** for midwives ensuring timely, standardized, and auditable application of the E-MOTIVE approach at the point of care, even in offline and low-resource environments.

---

## Problem Statement

| Problem | Impact |
|---------|--------|
| Delayed PPH recognition | Late intervention, preventable deaths |
| Inconsistent clinical decisions | Variable care quality |
| Limited training access | Skill gaps in emergency response |
| Poor documentation | Weak audit and accountability |
| Weak connectivity | Data loss, delayed sync |

---

## Goals & Success Metrics

| Goal | Metric | Target |
|------|--------|--------|
| Early PPH detection | Time from delivery to alert | < 15 min |
| E-MOTIVE adherence | Steps completed per case | > 90% |
| Reduced intervention delay | Time to first uterotonic | < 5 min |
| Training completion | Midwives completing modules | > 80% |
| Documentation completeness | Cases with full audit trail | > 95% |

---

## Scope

### In-Scope (MVP)

- Clinical decision support for PPH
- Training and simulation mode
- Offline-first mobile usage
- Automated documentation and audits
- Supabase authentication and analytics

### Out-of-Scope (Future)

- Patient-facing features
- Billing/insurance systems
- Hardware integrations (wearables)
- Multi-language support (post-MVP)

---

## Functional Requirements Summary

| ID | Feature | Priority |
|----|---------|----------|
| FR-01 | Secure authentication (online, offline, biometric) | P0 |
| FR-02 | Role-based access control (6 roles) | P0 |
| FR-03 | Maternal risk factor entry | P0 |
| FR-04 | PPH risk profile generation | P0 |
| FR-05 | E-MOTIVE step-by-step checklist | P0 |
| FR-06 | Real-time clinical prompts | P0 |
| FR-07 | Shock index calculation | P0 |
| FR-08 | Clinical threshold alerts | P0 |
| FR-09 | One-tap emergency escalation | P0 |
| FR-10 | SMS/in-app team alerts | P1 |
| FR-11 | Automatic intervention logging | P0 |
| FR-12 | PPH case report generation | P1 |
| FR-13 | Simulated PPH scenarios | P1 |
| FR-14 | Quizzes and assessments | P1 |
| FR-15 | Training performance tracking | P2 |

---

## Non-Functional Requirements

| Requirement | Specification |
|-------------|---------------|
| Performance | < 300ms response time |
| Offline | Full functionality without internet |
| Usability | Low-literacy optimized UI |
| Security | SHA-256 credential hashing, Supabase RLS, SecureStore encryption |
| Device Support | Android 8.0+, iOS 15+, low-end devices |

---

## Technical Stack

```
┌─────────────────────────────────────────────────────────────┐
│                       FRONTEND                               │
│  React Native 0.81 via Expo SDK 54 (managed workflow)       │
│  React 19 (experimental React Compiler)                      │
│  TypeScript 5.9 (strict mode)                                │
│  Expo Router v6 (file-based routing, typed routes)          │
│  State: React Context (4 providers)                          │
│  Local: SQLite (expo-sqlite) + SecureStore + AsyncStorage   │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                       BACKEND                                │
│  Supabase Auth (JWT + session management)                   │
│  PostgreSQL with Row-Level Security                         │
│  Supabase Storage (avatar uploads)                          │
│  Edge Functions (planned: risk calc, reports)               │
└─────────────────────────────────────────────────────────────┘
```

---

## User Roles

| Role | Code | Access | Typical Users |
|------|------|--------|---------------|
| Admin | `admin` | Full system access | App administrators, IT staff |
| Supervisor | `supervisor` | Unit management, approvals, analytics | Senior midwives, health coordinators |
| Midwife | `midwife` | Clinical mode, training | Midwives |
| Nurse | `nurse` | Clinical mode, training | Nurses |
| Student | `student` | Clinical mode, training | Nursing/midwifery students |
| User | `user` | Basic access (default) | Unverified registrations |

---

## Compliance

- WHO E-MOTIVE clinical guidelines
- Nigeria national maternal health policies
- Data protection and ethical research standards

---

## Document Version

| Version | Date | Author |
|---------|------|--------|
| 1.0 | 2026-01-26 | MotivAid Team |
| 2.0 | 2026-02-17 | Initial implementation update |
| 3.0 | 2026-02-27 | Phase 4 completion update |
