# MotivAid - Modules & Features (React Native Expo)

## Module Overview

```mermaid
graph LR
    A[Auth] --> D[Dashboard]
    D --> C[Clinical Mode]
    D --> T[Training Mode]
    D --> R[Reports]
    D --> S[Settings]
    C --> AL[Alerts]
    C --> DOC[Documentation]
```

---

## 1. Authentication Module

### Features
| Feature | Description | Priority |
|---------|-------------|----------|
| Login | Email/password authentication | P0 |
| Logout | Secure session termination | P0 |
| Session Management | JWT token handling | P0 |
| Offline Auth | Cached credentials for offline | P0 |

### Components
- `LoginScreen.js` - Authentication form
- `ForgotPasswordScreen.js` - Password recovery

### Files
```
src/screens/auth/
├── LoginScreen.js
├── ForgotPasswordScreen.js
├── styles.js
└── index.js

src/contexts/
├── AuthContext.js
└── UserContext.js

src/hooks/
├── useAuth.js
└── useSession.js

src/services/
├── api/
│   └── authService.js
└── storage/
    └── authStorage.js
```

---

## 2. Dashboard Module

### Features
| Feature | Description | Priority |
|---------|-------------|----------|
| Mode Selection | Clinical/Training mode entry | P0 |
| Quick Stats | Cases, alerts, sync status | P1 |
| Recent Cases | Last 5 PPH cases | P1 |
| Sync Status | Online/offline indicator | P0 |

### Components
- `DashboardScreen.js` - Main home screen

---

## 3. Clinical Mode Module

### Features
| Feature | Description | Priority |
|---------|-------------|----------|
| Risk Assessment | Maternal risk factor entry | P0 |
| Risk Profile | Auto-generated PPH risk level | P0 |
| E-MOTIVE Checklist | Step-by-step clinical workflow | P0 |
| Vital Signs | HR, BP, shock index calculation | P0 |
| Blood Loss Tracking | Visual estimation guides | P0 |
| Timer | PPH monitoring countdown | P0 |
| Alerts | Threshold-based warnings | P0 |
| Escalation | One-tap emergency notification | P0 |
| Documentation | Automatic event logging | P0 |

### Components
- `RiskAssessmentScreen.js` - Maternal data entry
- `ClinicalModeScreen.js` - Active PPH management
- `ChecklistScreen.js` - E-MOTIVE steps
- `VitalSignsScreen.js` - Vital signs entry
- `EscalationScreen.js` - Emergency contacts

### E-MOTIVE Workflow
```
┌─────────────────────────────────────────────┐
│  E-MOTIVE CHECKLIST                         │
├─────────────────────────────────────────────┤
│  □ Early Detection                          │
│    └─ Blood loss estimation                 │
│    └─ Vital signs check                     │
│                                              │
│  □ Massage (Uterine)                        │
│    └─ Bimanual compression                  │
│                                              │
│  □ Oxytocics                                │
│    └─ Oxytocin (10 IU IM/IV)               │
│    └─ Alternative: Misoprostol             │
│                                              │
│  □ Tranexamic Acid                          │
│    └─ 1g IV within 3 hours                 │
│                                              │
│  □ IV Fluids                                │
│    └─ Crystalloids (Ringer's/NS)           │
│                                              │
│  □ Examination                              │
│    └─ Inspect for tears                    │
│    └─ Check for retained products          │
│                                              │
│  □ Escalation                               │
│    └─ Call for help                        │
│    └─ Prepare referral                     │
└─────────────────────────────────────────────┘
```

---

## 4. Training Module

### Features
| Feature | Description | Priority |
|---------|-------------|----------|
| Scenarios | Simulated PPH cases | P1 |
| Quizzes | MCQ assessments | P1 |
| Case Studies | Interactive decision trees | P1 |
| Progress Tracking | Performance history | P2 |
| Certificates | Completion badges | P2 |

### Components
- `TrainingHomeScreen.js` - Module selection
- `ScenarioScreen.js` - Interactive scenario
- `QuizScreen.js` - Assessment questions
- `ResultsScreen.js` - Score and feedback
- `ProgressScreen.js` - Training history

---

## 5. Reports Module

### Features
| Feature | Description | Priority |
|---------|-------------|----------|
| Case Reports | Individual PPH case summaries | P1 |
| Facility Reports | Aggregated metrics | P1 |
| E-MOTIVE Adherence | Compliance tracking | P1 |
| Export | PDF/CSV generation | P2 |

### Components
- `ReportsListScreen.js` - Report list
- `CaseReportScreen.js` - Single case detail
- `AnalyticsScreen.js` - Facility metrics

---

## 6. Settings Module

### Features
| Feature | Description | Priority |
|---------|-------------|----------|
| Profile | User information | P1 |
| Notifications | Alert preferences | P1 |
| Facility | Facility configuration | P1 |
| Emergency Contacts | Team contact list | P0 |
| Data Management | Sync, clear cache | P1 |
| About | Version, licenses | P2 |

### Components
- `SettingsScreen.js` - Settings menu
- `ProfileScreen.js` - User profile edit
- `EmergencyContactsScreen.js` - Contact management

---

## Shared Components

### UI Components
| Component | Usage |
|-----------|-------|
| `MotivAidButton.js` | Primary action buttons |
| `MotivAidCard.js` | Content cards |
| `AlertBanner.js` | Warning/error banners |
| `ChecklistItem.js` | E-MOTIVE step item |
| `VitalSignsInput.js` | HR/BP input fields |
| `TimerComponent.js` | Countdown display |
| `SyncIndicator.js` | Online/offline status |

### Services
| Service | Responsibility |
|---------|----------------|
| `SyncService.js` | Data synchronization |
| `NotificationService.js` | Local + push notifications |
| `AlertService.js` | Clinical alert triggers |
| `AnalyticsService.js` | Event tracking |

### Store (Zustand)
| Store | Responsibility |
|-------|----------------|
| `authStore.js` | Authentication state |
| `clinicalStore.js` | Clinical mode state |
| `syncStore.js` | Sync queue and status |
| `alertStore.js` | Alert management |
