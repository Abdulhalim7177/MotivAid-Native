# Phase 6: AI & Voice Features — Implementation Plan

## Overview

Phase 6 introduces hands-free clinical workflow via speech-to-text and text-to-speech, plus AI-assisted blood loss estimation using both camera-based computer vision and vitals-based machine learning.

---

## Sprint 11: Voice Features (STT + TTS)

### 11.1 — Speech-to-Text for Vital Entry

**Goal:** Allow clinicians to speak vital sign values instead of typing, with hybrid online/offline recognition.

#### New Files

| File | Purpose |
|------|---------|
| `lib/voice/speech-to-text.ts` | Hybrid STT service: `@react-native-voice/voice` offline, OpenAI Whisper API online |
| `components/clinical/voice-input-button.tsx` | Hold-to-speak button with pulsing animation and waveform indicator |

#### Files to Modify

| File | Changes |
|------|---------|
| `app/(app)/clinical/record-vitals.tsx` | Add `VoiceInputButton` next to each vital sign input (HR, BP, temp, SpO₂, RR) |

#### STT Service Interface

```typescript
interface STTResult {
  text: string;
  confidence: number;
}

startListening(): Promise<void>
stopListening(): Promise<STTResult>
isListening(): boolean
```

#### Hybrid Strategy

1. Check network connectivity via `NetInfo.fetch()`
2. **Online:** Send audio to OpenAI Whisper API for higher accuracy
3. **Offline:** Use `@react-native-voice/voice` (platform-native recognition)
4. Parse numeric value from transcribed text (e.g., "one twenty" → 120)

#### Voice Input Button Behavior

- **Press and hold:** Start recording, show pulsing microphone animation
- **Release:** Stop recording, parse result, fill associated input field
- **Error:** Show toast with error message, field unchanged
- Visual feedback: Waveform animation during recording, green check on success

### 11.2 — Text-to-Speech Guidance

**Goal:** Voice-guided E-MOTIVE step readout and spoken timer alerts.

#### New Files

| File | Purpose |
|------|---------|
| `lib/voice/text-to-speech.ts` | `expo-speech` wrapper with clinical-specific functions |

#### Files to Modify

| File | Changes |
|------|---------|
| `components/clinical/emotive-checklist.tsx` | Add "Read aloud" button per E-MOTIVE step |
| `context/clinical.tsx` | In vitals prompt timer, add spoken alerts at key intervals |

#### TTS Functions

```typescript
speak(text: string, options?: { rate?: number }): Promise<void>
speakEmotiveStep(step: EmotiveStep): Promise<void>
speakTimerAlert(message: string): Promise<void>
stopSpeaking(): void
```

#### Spoken Alerts

| Trigger | Message |
|---------|---------|
| Bundle started | "E-MOTIVE bundle started. Begin with early detection." |
| 30 minutes elapsed | "30 minutes elapsed. Half of the target time remaining." |
| 50 minutes elapsed | "50 minutes elapsed. 10 minutes remaining." |
| 60 minutes elapsed | "Bundle time target of 60 minutes has been exceeded." |
| Vitals overdue | "Vital signs are overdue. Please record patient vitals." |

### Verification

- [ ] Hold voice button on HR field → say "120" → field fills with "120"
- [ ] Works offline with native recognition
- [ ] Works online with Whisper (if API configured)
- [ ] Tap "Read aloud" on Oxytocin step → TTS speaks instructions
- [ ] Timer alerts spoken at 30, 50, 60 minute marks

---

## Sprint 12: AI-Assisted Blood Loss Estimation

### 12.1 — Camera-Based Estimation

**Goal:** Capture image of surgical drape/pad and estimate blood volume using cloud computer vision.

#### New Files

| File | Purpose |
|------|---------|
| `lib/ai/blood-loss-camera.ts` | Image capture → cloud CV API → estimated mL + confidence |

#### Requirements

- Cloud endpoint: Supabase Edge Function or external API
- New env var: `EXPO_PUBLIC_AI_API_URL`
- Camera permissions in `app.json`

#### Camera Estimation Interface

```typescript
interface CameraEstimateResult {
  estimatedMl: number;
  confidence: number;  // 0.0 to 1.0
  imageUri: string;
}

estimateBloodLossFromImage(imageUri: string): Promise<CameraEstimateResult>
```

### 12.2 — Vitals-Based ML Estimation

**Goal:** On-device machine learning model that estimates blood loss from vital sign trends, working fully offline.

#### New Files

| File | Purpose |
|------|---------|
| `lib/ai/blood-loss-vitals.ts` | On-device model using HR/BP/SI trends |
| `assets/models/blood-loss-vitals.tflite` | Bundled TFLite model file |

#### Vitals ML Interface

```typescript
interface VitalsEstimateResult {
  estimatedMl: number;
  confidence: number;
  trendDirection: 'stable' | 'increasing' | 'decreasing';
}

estimateBloodLossFromVitals(vitals: LocalVitalSign[]): Promise<VitalsEstimateResult>
```

#### Model Input Features

- Heart rate trend (last 3+ readings)
- Systolic BP trend
- Shock index trajectory
- Time since delivery
- Known risk factors

### 12.3 — Combined Estimation UI

**Goal:** Side-by-side display of camera and vitals-based estimates with clinician override.

#### New Files

| File | Purpose |
|------|---------|
| `lib/ai/blood-loss-combined.ts` | Weighted combination of camera + vitals estimates |
| `app/(app)/clinical/ai-blood-loss.tsx` | Side-by-side comparison, accept/override UI |

#### Files to Modify

| File | Changes |
|------|---------|
| `app/(app)/clinical/record-vitals.tsx` | Add "AI Estimate" button navigating to ai-blood-loss screen |
| `lib/clinical-db.native.ts` | Update `LocalVitalSign` interface with `blood_loss_ai_estimate`, `blood_loss_confidence`, `blood_loss_ai_method` |
| `app/(app)/clinical/patient-detail.tsx` | Show AI estimate alongside manual estimate in vitals card |

#### Combined UI Workflow

1. **Camera tab:** Capture image → show estimate with confidence bar
2. **Vitals tab:** Auto-calculated from recorded vitals → show estimate with trend arrow
3. **Combined view:** Weighted average with individual breakdowns
4. **Actions:** "Accept" fills the blood loss field, "Override" allows manual entry
5. **Logging:** Saves `blood_loss_ai_estimate`, `blood_loss_confidence`, `blood_loss_ai_method` to vital signs record

### Verification

- [ ] Camera capture returns estimate with confidence score
- [ ] Vitals-based model returns estimate after 3+ readings
- [ ] Combined view shows both side-by-side
- [ ] "Accept" saves AI value to database with method and confidence
- [ ] Values sync to Supabase with new columns
