# Cursor / AI Bootstrap Context — WoundDoc

Use this file as the first context block when asking an AI coding assistant to work on this codebase.

---

## Project Overview

**WoundDoc** — A React Native + TypeScript Expo application for clinicians to monitor wound healing over time. 

**Core workflow:**
1. Photograph a wound with an ArUco marker for scale reference
2. AI backend classifies wound type, segments tissue, and detects size (perspective-corrected via ArUco)
3. Track observations across multiple visits
4. View healing trends via sparkline charts and tissue composition history

---

## Tech Stack

### Frontend
- **Expo SDK 55** (React Native)
- **TypeScript** (strict mode)
- **Expo Router** (file-based routing, `(app)` and `(auth)` route groups)
- **Zustand** (wound & auth store, no Redux)
- **React Query** — client provider in root layout (future expansion planned)
- **AsyncStorage** + **FileSystem** (local-first persistence)
- **No `react-native-svg`** — pure View/StyleSheet for components
- **No charting library** — custom sparkline/bar chart components

### Backend (3 Hugging Face Spaces)
1. **Classification Space** (`wound-classification-demo/`) — wound type detection
2. **Segmentation Space** (`Aerobiosys-Wound-Analysis/`) — tissue overlay & metrics
3. **Size Space** (`Aerobiosys-Wound-Size-Space/`) — ArUco-calibrated size & perspective correction

All three return JSON; inference client runs them in parallel via `Promise.allSettled`.

---

## Active Screens

| Screen | Path | Purpose |
|--------|------|---------|
| Dashboard | `(app)/index.tsx` | Wound cards, mini sparklines, healing trends |
| New Wound | `(app)/wounds/new.tsx` | Create wound, parallel inference calls, type selection |
| Wound Detail | `(app)/wounds/[woundId].tsx` | Size tracking, full sparkline, tissue history, notes |
| Add Observation | `(app)/wounds/add-observation.tsx` | Photograph + inference + size detection |
| ArUco Generator | `(app)/aruco-marker.tsx` | On-screen marker generator (DPI-calibrated) |
| Settings | `(app)/settings.tsx` | API URLs, ArUco help link, sign out |
| Login | `(auth)/login.tsx` | Dummy auth (email + password) |

---

## Key Components

### `ImageCompareToggle`
- **3-tab view**: Original → Annotated → Rectified
- Fullscreen modal with adaptive aspect ratio
- Pinch-zoom, swipe-dismiss supported
- Used in `[woundId].tsx` detail view

### `AreaSparkline`
- Pure View-based line chart (no charting library)
- Draws rotated line segments to form sparkline
- Shows trend direction & optionally % change
- Used on dashboard cards and detail page

### `TissueHistoryChart`
- Stacked horizontal bar chart for tissue composition
- **34+ tissue color keys** (e.g., `necrotic`, `granulation`, `epithelial`)
- Displays percentage + absolute area (cm²)
- Colors must stay in sync with `[woundId].tsx` tissue rendering

### `WoundTypePickerModal`
- Modal with **16 clinical wound types** (list from HF classification space)
- Manual override after AI classification
- Searchable dropdown interface

### `WoundTypeBadge`
- Displays human-readable wound type label
- Looks up type via `WOUND_TYPE_OPTIONS` constant

### `StatChip`
- Small inline stat card (e.g., "Area: 5.2 cm²")

### `AppCard`, `AppButton`, `SectionHeader`, `EmptyState`, `LoadingOverlay`
- Shared UI primitives with theme tokens

---

## Inference Pipeline

### Parallel Execution (Promise.allSettled)

```typescript
const [classResult, segResult, sizeResult] = await Promise.allSettled([
  inferenceClient.classifyWound({ imageBase64 }),
  inferenceClient.segmentWound({ imageBase64 }),
  inferenceClient.detectWoundSize({ imageBase64, markerSizeCm })
]);
```

### What Each Returns

1. **Classification** (`classifyWound`)
   - Endpoint: `POST /api/classify`
   - Returns: `{ wound_type: string, confidence: number }`

2. **Segmentation** (`segmentWound`)
   - Endpoint: `POST /api/segment` (alias: `/analyze`)
   - Returns: `{ overlay_base64: string, metrics: { ... } }`
   - Basic tissue overlay (not perspective-corrected)

3. **Size Detection** (`detectWoundSize`)
   - Endpoint: `POST /api/detect_size` (or similar)
   - Input: `{ image_base64, marker_size_cm: number }`
   - Returns: `{ rectified_overlay_base64, area_cm2, tissue_areas, ... }`
   - **Preferred** over segmentation for final metrics (perspective-corrected)

### Client Code
- `wounddoc/src/features/inference/inference.client.ts` — HTTP calls
- `wounddoc/src/features/inference/inference.mappers.ts` — Response → domain models
- `wounddoc/src/features/inference/inference.types.ts` — TypeScript interfaces

---

## Data Models

### `WoundRecord` (wounds.types.ts)
```typescript
{
  id: string;                        // unique ID
  label: string;                     // e.g., "Left knee pressure ulcer"
  bodyLocation: string;              // e.g., "left knee"
  woundType: string;                 // e.g., "pressure_ulcer"
  observations: WoundObservation[];  // ordered by date
  coverImageUri: string;             // first observation preview
  createdAt: number;                 // timestamp
  updatedAt: number;
}
```

### `WoundObservation`
```typescript
{
  id: string;
  originalImageUri: string;          // local file path
  segmentationOverlayUri: string;    // from segmentation space
  rectifiedOverlayUri: string;       // ArUco-corrected (preferred)
  metrics: {
    totalAreaCm2: number;            // computed area
    infectionRiskScore: number;      // 0–1 score
    tissueComposition: {              // e.g., { necrotic: 30, granulation: 50 }
      [tissueType: string]: number;  // percentage
    };
    tissueAreaCm2: {                  // e.g., { necrotic: 1.5, granulation: 2.6 }
      [tissueType: string]: number;
    };
    tissueSizeInformation: {          // alternative format
      [tissueType: string]: {
        percentage: number;
        area_cm2: number;
      };
    };
    calibration?: {                   // ArUco marker info
      markerSizeCm: number;
      detectedPixels: number;
      pixelsToCmRatio: number;
    };
  };
  notes: string;                     // clinician observations
  createdAt: number;
}
```

---

## Store & Actions

### Zustand Store (wounds.store.ts)

**State:**
- `wounds: Map<string, WoundRecord>`
- `selectedWoundId: string | null`

**Actions:**
- `createWound(label, bodyLocation)` → `WoundRecord`
- `addObservation(woundId, observation)` → void
- `deleteWound(woundId)` → void
- `deleteObservation(woundId, observationId)` → void
- `updateWoundType(woundId, woundType)` → void
- `updateWoundDetails(woundId, updates)` → void
- `updateObservationNotes(woundId, observationId, notes)` → void
- `clearAll()` → void
- `hydrate(state)` → void (init from storage)

**Storage:**
- Metadata stored in AsyncStorage (`wound_records_v1` key)
- Images stored in FileSystem (`Documents/WoundDoc/wounds/`)

---

## Environment Variables

**Required in `.env`:**
```env
EXPO_PUBLIC_SEGMENTATION_API_BASE=https://zazaman-aerobiosys-wound-analysis.hf.space
EXPO_PUBLIC_CLASSIFICATION_API_BASE=https://zazaman-wound-classification-demo.hf.space
EXPO_PUBLIC_SIZE_API_BASE=https://zazaman-aerobiosys-wound-size-space.hf.space
```

**Important:** Env vars are inlined at Metro build time. Always restart with:
```bash
npx expo start --clear
```
after modifying `.env`.

---

## Constraints & Guidelines

### Code Quality
- **TypeScript strict mode** — run `npx tsc --noEmit` before every commit
- All styling via `StyleSheet.create()` + theme tokens (`colors.ts`, `spacing.ts`, etc.)
- No `console.log` in production (use error boundaries)
- Handle Promise rejections gracefully (show user feedback)

### Dependencies
- No new npm packages without team discussion
- Keep `Gradio==4.44.1` and `huggingface_hub==0.23.5` pinned in Space READMEs
- Segmentation Space pins `tensorflow==2.15.0`, `numpy<2` to avoid regressions

### Data Sync
- Tissue color keys used in `TissueHistoryChart.tsx` must match those in `[woundId].tsx` detail view
- Metrics from size detection (rectified) preferred over segmentation (basic)
- All images stored locally; no automatic cloud sync yet

### Naming
- Store: `wounds.store.ts`
- Types: `wounds.types.ts`
- API Client: `inference.client.ts`
- Mappers: `inference.mappers.ts`

---

## Known Issues & TODOs

- **Automated tests** not yet set up (Jest/Detox)
- **Supabase integration** planned (`wounds.repository.ts` has TODO comments)
- **Healing rate metric** (cm²/day) not yet calculated
- **Export/share** wound report not yet implemented
- **Offline sync** queue for future cloud migration
- **Push notifications** for follow-up reminders not yet added

---

## The ArUco Workflow

1. **Clinician opens ArUco generator** → `(app)/aruco-marker.tsx`
2. **Prints or displays on device** (adjusts DPI for accurate size)
3. **Places marker next to wound**, photographs both together
4. **App detects marker position** in image via OpenCV (via backend)
5. **Calculates pixel-to-cm ratio** from marker size
6. **Size Space rectifies perspective** → accurate area measurement
7. **Metrics stored with calibration metadata** (marker size, ratio)

---

## Backend APIs Summary

| Space | Endpoint | Input | Output |
|-------|----------|-------|--------|
| Classification | `POST /api/classify` | `{ image_base64 }` | `{ wound_type, confidence }` |
| Segmentation | `POST /api/segment` | `{ image_base64 }` | `{ overlay_base64, metrics }` |
| Size Detection | `POST /api/detect_size` | `{ image_base64, marker_size_cm }` | `{ rectified_overlay, area_cm2, tissues }` |

All return JSON. Health checks available at `GET /api/health`.

---

## Quick Setup

```bash
cd wounddoc
npm install
npm run typecheck
npx expo start --clear
```

For Space deployment:
```bash
$env:HF_TOKEN='hf_xxxxxxxxxxxx'
python deploy_hf_spaces.py
```

---

## Typical AI Task Prompt Template

```text
You are updating WoundDoc.

Goal:
<describe one concrete change>

Constraints:
- Keep existing Spaces API contracts stable
- Keep Gradio UI mounted in each Space
- Preserve local-first storage semantics
- TypeScript strict mode only
- Update docs for behavior changes

Deliverables:
- Code changes
- Any migration notes
- Verification steps (typecheck + manual testing)
```

---

## Definition of Done

✓ App typechecks (`npm run typecheck`)  
✓ No API contract regression  
✓ New behavior documented in README/CURSOR_BOOTSTRAP  
✓ If dependency versions pinned, explain why  
✓ All images/overlays persist correctly  
✓ Tested on device (or Expo Go)
