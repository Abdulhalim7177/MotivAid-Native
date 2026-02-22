# Phase 3: Clinical Data — Testing Guide

## Prerequisites

1. Ensure all dependencies are installed:
   ```bash
   npm install
   ```

2. Apply the Supabase migration:
   ```bash
   npx supabase db push
   ```
   Or manually run `supabase/migrations/20260220000000_clinical_data_tables.sql` against your Supabase instance.

3. Start the dev server:
   ```bash
   npx expo start
   ```

---

## Test 1: Navigation & Tab Visibility

| Step | Action | Expected Result |
|------|--------|----------------|
| 1.1 | Launch app and sign in as a **staff** user (midwife/nurse/student) | Home dashboard loads |
| 1.2 | Look at the bottom tab bar | **Clinical** tab appears between Home and Profile with a medkit icon |
| 1.3 | Tap the **Clinical** tab | Clinical case list screen loads with "No Cases" empty state |
| 1.4 | Go back to Home → tap **"New Case"** action card | Navigates to the New Patient form |
| 1.5 | Go back to Home → tap **"My Patients"** action card | Navigates to Clinical tab (case list) |
| 1.6 | Sign in as a **supervisor** | Supervisor dashboard loads |
| 1.7 | Tap **"Cases"** in the Management grid | Navigates to Clinical tab |

---

## Test 2: Create a Patient Profile (Low Risk)

| Step | Action | Expected Result |
|------|--------|----------------|
| 2.1 | On Clinical tab → tap **"New"** button | New Patient form opens |
| 2.2 | Enter: Patient ID = "PT001", Age = 28 | Fields accept input |
| 2.3 | Set Gravida = 2, Parity = 1, GA = 39 | Fields accept numeric input |
| 2.4 | Leave all risk factor toggles **OFF** | Live risk banner shows **"Low Risk"** in green |
| 2.5 | Tap **"Save & Start Monitoring"** | Haptic success feedback, navigates to Patient Detail |
| 2.6 | Verify Patient Detail screen | Shows PT001, Age 28, G2P1, green "Low Risk" badge, Score: 0 |

---

## Test 3: Create a Patient Profile (Medium Risk)

| Step | Action | Expected Result |
|------|--------|----------------|
| 3.1 | Create new patient: Age = 37, Gravida = 4, Parity = 3 | — |
| 3.2 | Toggle ON: **"Prior Cesarean Section"** | Live banner updates to **"Medium Risk"** in amber |
| 3.3 | Note the score (should be ≥1) | Score reflects the toggled factor |
| 3.4 | Save the profile | Patient detail shows amber Medium Risk |

---

## Test 4: Create a Patient Profile (High Risk — Auto-Escalation)

| Step | Action | Expected Result |
|------|--------|----------------|
| 4.1 | Create new patient: Age = 40, Gravida = 5, Parity = 5 | Age >35 = medium factor, parity >4 = medium factor |
| 4.2 | Toggle ON: **"Multiple Gestation"** | Now 3 medium factors → banner should show **"High Risk"** in red |
| 4.3 | Observe the risk summary text | Should mention "2+ medium-risk factors auto-escalated" |
| 4.4 | Save the profile | Patient detail shows red High Risk badge |

---

## Test 5: Create a Patient Profile (High Risk — Direct Factor)

| Step | Action | Expected Result |
|------|--------|----------------|
| 5.1 | Create new patient: Age = 25 | Low risk initially |
| 5.2 | Toggle ON: **"Active Bleeding"** (in High Risk section) | Banner immediately jumps to **"High Risk"** in red |
| 5.3 | The switch thumb should turn red (#C62828) | Visual distinction for high-risk toggles |
| 5.4 | Toggle OFF Active Bleeding, toggle ON **"Known Coagulopathy"** | Still High Risk |
| 5.5 | Save the profile | High Risk badge displayed |

---

## Test 6: Record Vital Signs — Normal

| Step | Action | Expected Result |
|------|--------|----------------|
| 6.1 | Open any patient detail → tap **"Record Vitals"** | Record Vitals form opens, shows patient info in header |
| 6.2 | Enter: HR = 72, Systolic BP = 120, Diastolic BP = 80 | **Live Shock Index banner** appears: SI 0.6 — "Normal" in green |
| 6.3 | Enter: Temp = 36.5, SpO₂ = 98, RR = 16 | Fields accept values |
| 6.4 | Blood Loss = 0 | No blood loss assessment shown |
| 6.5 | Tap **"Save Vital Signs"** | Haptic success, navigates back to patient detail |
| 6.6 | Verify patient detail | Vital sign card appears with HR 72, BP 120/80, SI 0.6 in timeline |

---

## Test 7: Record Vital Signs — Critical Shock Index

| Step | Action | Expected Result |
|------|--------|----------------|
| 7.1 | Open Record Vitals for any patient | — |
| 7.2 | Enter: HR = 140, Systolic BP = 80 | **SI = 1.75** → "Emergency" banner in deep red, **pulse animation** triggers |
| 7.3 | Feel for **strong haptic feedback** | Device should vibrate with heavy impact |
| 7.4 | Change Systolic BP to 100 | SI drops to 1.4 → "Critical" level |
| 7.5 | Change Systolic BP to 120 | SI drops to 1.17 → "Alert" level |
| 7.6 | Change Systolic BP to 160 | SI drops to 0.875 → "Normal" level, animation stops |

---

## Test 8: Blood Loss Estimation

| Step | Action | Expected Result |
|------|--------|----------------|
| 8.1 | Open Record Vitals | Blood loss starts at 0 |
| 8.2 | Tap **"+250"** button | Blood loss value = 250 mL, haptic |
| 8.3 | Tap **"+250"** again | Blood loss = 500 mL, assessment banner shows **"PPH (>500 mL)"** |
| 8.4 | Tap **"+500"** | Blood loss = 1000 mL, assessment shows **"Severe PPH"** in red |
| 8.5 | Tap **"+1000"** | Blood loss = 2000 mL, assessment shows **"Massive Hemorrhage"** |
| 8.6 | Switch method to **"Drape"** | Chip highlights in purple |
| 8.7 | Switch method to **"Weighed"** | Chip updates |
| 8.8 | Save vitals | Blood loss appears as "EBL" in the vitals card on patient detail |

---

## Test 9: Patient Detail — Metrics Cards

| Step | Action | Expected Result |
|------|--------|----------------|
| 9.1 | After recording vitals, check patient detail | **Shock Index** card shows latest SI value with colored badge |
| 9.2 | Check **Blood Loss** card | Shows max estimated blood loss with WHO assessment label |
| 9.3 | Record multiple vitals | Timeline shows all entries in chronological order (newest first) |
| 9.4 | Each vital card shows SI badge if HR+BP were recorded | Color matches the SI level |

---

## Test 10: Case Lifecycle

| Step | Action | Expected Result |
|------|--------|----------------|
| 10.1 | Open a "Pre-Delivery" case | Status pill shows "Pre-Del" highlighted |
| 10.2 | Tap green **"Start"** button | Status changes to "Active", haptic success |
| 10.3 | Verify the status row updates | "Active" pill is now highlighted |
| 10.4 | Tap grey **"Close"** button | Alert popup with 3 outcome options: Normal, PPH Resolved, Referred |
| 10.5 | Select "Normal" | Case closes, status changes |
| 10.6 | Return to clinical tab | Case shows "Closed" status chip in grey |

---

## Test 11: Filter Chips on Clinical Tab

| Step | Action | Expected Result |
|------|--------|----------------|
| 11.1 | Create 3+ patients with different statuses | — |
| 11.2 | On Clinical tab, tap **"Active"** filter chip | Only active cases shown, count matches |
| 11.3 | Tap **"Pre-Delivery"** chip | Only pre-delivery cases shown |
| 11.4 | Tap **"All"** chip | All cases shown |
| 11.5 | Verify counts in chip labels | Each chip shows correct count (e.g., "Active (2)") |

---

## Test 12: Sync & Offline Indicator

| Step | Action | Expected Result |
|------|--------|----------------|
| 12.1 | Create a patient while online | Case appears in list |
| 12.2 | Check if offline badge appears | Should show **cloud-offline** icon if not yet synced |
| 12.3 | Tap the **sync button** (↻) in the header | Spinner animates, cases sync |
| 12.4 | After sync completes | Offline badge disappears from synced cases |

---

## Test 13: Offline-First Data Entry

> **Important:** This test requires a physical device or emulator with network toggling.

| Step | Action | Expected Result |
|------|--------|----------------|
| 13.1 | Enable **Airplane Mode** | App remains functional |
| 13.2 | Create a new patient with risk factors | Profile saves successfully (to SQLite) |
| 13.3 | Record vitals for that patient | Vitals save successfully, SI calculates correctly |
| 13.4 | Check clinical tab | New patient appears with offline badge |
| 13.5 | Disable Airplane Mode | Sync should trigger automatically via network listener |
| 13.6 | Verify in Supabase dashboard | Records should appear in `maternal_profiles` and `vital_signs` tables |

---

## Test 14: Vitals Auto-Prompt

> **Tip:** For faster testing, temporarily change `vitalsPromptInterval` default from 15 to 1 (minute) in `context/clinical.tsx` line ~100.

| Step | Action | Expected Result |
|------|--------|----------------|
| 14.1 | Open a patient detail screen | Timer starts |
| 14.2 | Wait for the prompt interval to elapse | Red **"Vitals Due"** banner slides in from bottom with haptic |
| 14.3 | Banner shows elapsed time text | e.g., "Last recorded 2m ago (1m interval)" |
| 14.4 | Tap **"Record"** | Navigates to Record Vitals screen |
| 14.5 | Return to patient detail without recording | — |
| 14.6 | Wait again for interval | Prompt appears again |
| 14.7 | Tap **"Later"** | Banner dismisses (reappears after next interval) |

---

## Test 15: Pull-to-Refresh

| Step | Action | Expected Result |
|------|--------|----------------|
| 15.1 | On Clinical tab, pull down | Refresh indicator appears, list reloads |
| 15.2 | On Patient Detail, pull down | Refresh indicator appears, vitals and profile reload |

---

## Quick Smoke Test Checklist

- [ ] Clinical tab visible in bottom nav
- [ ] Can create a Low/Medium/High risk patient
- [ ] Live risk banner updates as toggles change
- [ ] Can record vitals with live SI calculation
- [ ] Critical SI triggers haptic + pulse animation
- [ ] Blood loss quick-buttons work (+100/+250/+500/+1000)
- [ ] Patient detail shows metrics cards (SI + Blood Loss)
- [ ] Case lifecycle works (Pre-Del → Active → Closed)
- [ ] Filter chips work on clinical tab
- [ ] Sync button triggers data sync
- [ ] Dashboard actions navigate correctly (New Case, My Patients, Cases)
- [ ] Vitals prompt banner appears after interval
