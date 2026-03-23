# WoundDoc — AI-Powered Wound Monitoring for Clinicians

A React Native + TypeScript Expo application that enables clinicians to monitor wound healing longitudinally using AI-powered classification, segmentation, and ArUco-calibrated size detection.

**Photograph once. Track healing forever.**

---

## What It Does

WoundDoc transforms wound care workflows by providing:

- **Wound Classification** — AI automatically identifies wound type (pressure ulcer, diabetic, venous, etc.) from a single photo
- **Tissue Segmentation** — Overlays color-coded tissue types (necrotic, granulation, epithelial, slough, etc.) on the original image
- **Perspective-Corrected Sizing** — ArUco marker calibration ensures accurate area measurements regardless of camera angle
- **Tissue Composition Tracking** — Monitors percentage and absolute area (cm²) of each tissue type across visits
- **Healing Trend Visualization** — Sparkline charts show wound area progression and % improvement/decline
- **Observation History** — Add clinical notes to each observation, building a longitudinal record
- **Offline-First Local Storage** — All data kept on device with file system persistence
- **Manual Type Override** — Override AI classification when clinical judgment differs
- **ArUco Marker Generator** — DPI-calibrated printable marker for consistent scale reference
- **Multi-Observation Support** — Track the same wound across multiple visits with automatic comparison

---

## Screenshots

[Screenshots section placeholder — insert UI mockups or real app screenshots showing dashboard, detail view, tissue history, and ArUco marker.]

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Mobile Runtime** | Expo SDK 55, React Native |
| **Language** | TypeScript (strict mode) |
| **Routing** | Expo Router (file-based) |
| **State Management** | Zustand (wounds & auth) |
| **Data Fetching** | React Query (client in root layout) |
| **Local Storage** | AsyncStorage + Expo FileSystem |
| **Image Handling** | expo-image-picker, expo-file-system |
| **Styling** | StyleSheet.create + theme tokens |
| **Charts** | Custom View components (no external charting) |
| **Backend (AI)** | 3 Hugging Face Spaces (FastAPI + Gradio) |

---

## Key Features in Detail

### 1. Wound Classification
Automatically detects wound type (16 clinical categories) from a single photo using the Classification Space. Clinicians can override if needed.

### 2. AI Segmentation & Tissue Detection
Color-coded overlay showing tissue composition:
- **Necrotic tissue** (black/dark) — non-viable tissue
- **Granulation** (red/pink) — healthy new tissue forming
- **Epithelial** (pink/light) — new skin forming at edges
- **Slough** (yellow) — fibrin/debris layer
- And 30+ more tissue types supported

### 3. ArUco-Calibrated Size Detection
1. Clinician prints or displays the DPI-calibrated ArUco marker
2. Places marker next to wound in photograph
3. App detects marker via backend OpenCV analysis
4. Calculates pixel-to-cm conversion ratio
5. Backend returns perspective-corrected area (cm²)

**Why ArUco?** Unlike manual ruler placement, ArUco is robust to angle, lighting, and distance variations.

### 4. Tissue History Chart
Stacked horizontal bar chart showing tissue composition evolution:
- View all observations side-by-side
- See percentage + absolute area for each tissue type
- Identify which tissues improving/worsening

### 5. Sparkline Trend Charts
Compact line charts on dashboard and detail views showing:
- Wound area progression (cm²)
- % improvement or decline since baseline
- Direction & slope at a glance

### 6. Perspective Correction & Rectified View
Original photo → Segmentation overlay → Rectified (ArUco-corrected) image comparison in a 3-tab toggle. Useful for assessing subtle improvements.

### 7. Local-First Storage
All data (wound records, observations, images) stored locally:
- Metadata in AsyncStorage
- Images in FileSystem (`Documents/WoundDoc/wounds/`)
- No cloud dependency; Supabase planned for future

### 8. Manual Type Override
After AI classification, clinician can manually select from 16 wound types via dropdown, overriding AI if clinical assessment differs.

---

## Environment Setup

### 1. Prerequisites
- Node.js 18+
- npm or yarn
- Expo CLI: `npm install -g expo-cli`
- Expo Go app (for testing on device)

### 2. Create `.env` File

Copy `.env.example` → `.env` and fill in the three Hugging Face Space URLs:

```env
# Wound type classification
EXPO_PUBLIC_CLASSIFICATION_API_BASE=https://zazaman-wound-classification-demo.hf.space

# Tissue segmentation & basic metrics
EXPO_PUBLIC_SEGMENTATION_API_BASE=https://zazaman-aerobiosys-wound-analysis.hf.space

# ArUco-calibrated size detection & perspective correction
EXPO_PUBLIC_SIZE_API_BASE=https://zazaman-aerobiosys-wound-size-space.hf.space
```

**Important:** Metro bundles these at build time. Always restart with `npx expo start --clear` after `.env` changes.

### 3. Backend API Spaces

| Space | Purpose | Endpoint |
|-------|---------|----------|
| **wound-classification-demo** | Classify wound type | `POST /api/classify` → `{ wound_type, confidence }` |
| **Aerobiosys-Wound-Analysis** | Segment tissue, extract metrics | `POST /api/segment` → `{ overlay_base64, metrics }` |
| **Aerobiosys-Wound-Size-Space** | Detect ArUco marker, rectify perspective, measure area | `POST /api/detect_size` → `{ rectified_overlay, area_cm2, tissues }` |

All three accept `{ image_base64: "data:image/jpeg;base64,..." }` and return JSON.

---

## Installation & Running

### Install Dependencies
```bash
cd wounddoc
npm install
```

### Typecheck (Before Every Commit)
```bash
npm run typecheck
```

### Start Development Server

**Web (browser):**
```bash
npm run web
```

**Expo Go (mobile on same Wi-Fi):**
```bash
npx expo start --host lan --port 8082
```

Then open Expo Go app → scan QR code.

**Expo Go (tunnel mode for different networks):**
```bash
npx expo start --host tunnel --port 8082
```

### Build for Production

```bash
# iOS
npx eas build --platform ios

# Android
npx eas build --platform android
```

---

## Project Structure

```
wounddoc/
├── app/                              # Expo Router routes
│   ├── _layout.tsx                   # Root navigation layout
│   ├── (auth)/
│   │   └── login.tsx                 # Dummy login screen
│   └── (app)/                        # Main app routes
│       ├── _layout.tsx               # App layout with bottom tabs
│       ├── index.tsx                 # Dashboard (wound cards + sparklines)
│       ├── aruco-marker.tsx          # ArUco marker generator
│       ├── settings.tsx              # API URLs, sign out
│       └── wounds/
│           ├── new.tsx               # Create wound form + initial inference
│           ├── [woundId].tsx         # Wound detail (history, tissue chart)
│           └── add-observation.tsx   # Add observation + inference
│
├── src/
│   ├── components/                   # Reusable UI components
│   │   ├── ImageCompareToggle.tsx    # 3-tab image viewer
│   │   ├── AreaSparkline.tsx         # Line chart component
│   │   ├── TissueHistoryChart.tsx    # Stacked bar chart
│   │   ├── WoundTypePickerModal.tsx  # Type selection modal
│   │   ├── WoundTypeBadge.tsx        # Type display badge
│   │   ├── AppCard.tsx               # Card wrapper
│   │   ├── AppButton.tsx             # Button styles
│   │   ├── StatChip.tsx              # Stat display chip
│   │   ├── SectionHeader.tsx         # Section titles
│   │   ├── EmptyState.tsx            # No data view
│   │   └── LoadingOverlay.tsx        # Loading indicator
│   │
│   ├── features/                     # Feature modules
│   │   ├── auth/
│   │   │   ├── auth.store.ts         # Zustand auth state
│   │   │   ├── auth.types.ts         # Auth interfaces
│   │   │   └── auth.repository.ts    # Auth persistence (future: Supabase)
│   │   │
│   │   ├── wounds/
│   │   │   ├── wounds.store.ts       # Zustand wound state + actions
│   │   │   ├── wounds.types.ts       # WoundRecord, WoundObservation
│   │   │   ├── woundSelectors.ts     # Derived state helpers
│   │   │   └── wounds.repository.ts  # Persistence (future: Supabase)
│   │   │
│   │   └── inference/
│   │       ├── inference.client.ts   # HTTP calls to 3 Spaces
│   │       ├── inference.mappers.ts  # Response → domain models
│   │       └── inference.types.ts    # Inference interfaces
│   │
│   ├── services/
│   │   ├── api/
│   │   │   └── httpClient.ts         # Axios wrapper
│   │   ├── media/
│   │   │   └── fileSystemMedia.service.ts  # Image persistence
│   │   └── storage/
│   │       └── asyncStorage.ts       # AsyncStorage wrapper
│   │
│   ├── lib/
│   │   ├── base64.ts                 # Base64 encoding/decoding
│   │   ├── config.ts                 # Env var loading
│   │   ├── date.ts                   # Date formatting
│   │   ├── image.ts                  # Image loading & sizing
│   │   └── validators.ts             # Input validation
│   │
│   ├── constants/
│   │   └── disclaimers.ts            # Medical safety copy
│   │
│   ├── theme/                        # Design tokens
│   │   ├── colors.ts
│   │   ├── spacing.ts
│   │   ├── radius.ts
│   │   └── typography.ts
│   │
│   └── types.ts                      # Global type exports
│
├── docs/
│   ├── ARCHITECTURE.md               # Detailed architecture
│   ├── CONTRIBUTING.md               # Contribution guidelines
│   └── CURSOR_BOOTSTRAP.md           # AI context (this file)
│
├── .env.example                      # Template for .env
├── app.json                          # Expo config
├── package.json
└── tsconfig.json
```

---

## How the ArUco Workflow Works

### Setup (One-Time)
1. Clinician opens **ArUco Generator** screen (`(app)/aruco-marker.tsx`)
2. App displays a QR-code-like checkerboard pattern (ArUco marker 6×6 bits)
3. Selects **Print** or **Display on device**, adjusting DPI for accurate size (e.g., 5cm × 5cm)

### Wound Photography (Per Observation)
1. Clinician places printed/displayed marker next to wound (within frame)
2. Photographs wound + marker together with app camera
3. App sends image to **Size Detection Space** with `marker_size_cm` parameter
4. Backend:
   - Detects marker position via OpenCV
   - Calculates pixel-to-cm ratio
   - Rectifies perspective (removes camera angle distortion)
   - Detects tissue types via segmentation model
   - Returns `rectified_overlay_base64`, `area_cm2`, `tissue_areas[]`

### Result Storage
- Original image saved locally
- Rectified overlay saved
- Metrics (area, tissue %, calibration data) stored in observation
- Clinician can verify rectified view in 3-tab toggle

---

## Backend API Contracts

### Classification Space

**Endpoint:** `POST /api/classify`

**Request:**
```json
{
  "image_base64": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
}
```

**Response:**
```json
{
  "wound_type": "pressure_ulcer",
  "confidence": 0.87,
  "all_predictions": [
    { "type": "pressure_ulcer", "confidence": 0.87 },
    { "type": "diabetic_foot_ulcer", "confidence": 0.08 }
  ]
}
```

### Segmentation Space

**Endpoint:** `POST /api/segment` (alias: `/analyze`)

**Request:**
```json
{
  "image_base64": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
}
```

**Response:**
```json
{
  "overlay_base64": "data:image/png;base64,iVBORw0KGgo...",
  "metrics": {
    "total_area_cm2": 12.5,
    "infection_risk_score": 0.42,
    "tissue_composition": {
      "necrotic": 25,
      "granulation": 50,
      "epithelial": 20,
      "slough": 5
    },
    "tissue_area_cm2": {
      "necrotic": 3.1,
      "granulation": 6.25,
      "epithelial": 2.5,
      "slough": 0.625
    }
  }
}
```

### Size Detection Space

**Endpoint:** `POST /api/detect_size`

**Request:**
```json
{
  "image_base64": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  "marker_size_cm": 5.0
}
```

**Response:**
```json
{
  "rectified_overlay_base64": "data:image/png;base64,iVBORw0KGgo...",
  "area_cm2": 11.8,
  "detected_pixels": 45000,
  "pixels_to_cm_ratio": 62.3,
  "tissue_areas": {
    "necrotic": 2.95,
    "granulation": 5.9,
    "epithelial": 2.37,
    "slough": 0.58
  },
  "tissue_composition": {
    "necrotic": 25,
    "granulation": 50,
    "epithelial": 20,
    "slough": 5
  }
}
```

**Health Check:** `GET /api/health` → `{ "status": "ok" }`

---

## Data Models

### WoundRecord
```typescript
{
  id: string;                           // UUID
  label: string;                        // e.g., "Left knee pressure ulcer"
  bodyLocation: string;                 // e.g., "left knee"
  woundType: string;                    // e.g., "pressure_ulcer"
  observations: WoundObservation[];     // ordered by date
  coverImageUri: string;                // preview image URI
  createdAt: number;                    // timestamp (ms)
  updatedAt: number;
}
```

### WoundObservation
```typescript
{
  id: string;                           // UUID
  originalImageUri: string;             // local file path
  segmentationOverlayUri: string;       // from segmentation space
  rectifiedOverlayUri: string;          // ArUco-corrected (preferred)
  metrics: {
    totalAreaCm2: number;               // from size detection
    infectionRiskScore: number;         // 0–1
    tissueComposition: {                // percentage
      [key: string]: number;
    };
    tissueAreaCm2: {                    // absolute area
      [key: string]: number;
    };
    calibration?: {
      markerSizeCm: number;
      detectedPixels: number;
      pixelsToCmRatio: number;
    };
  };
  notes: string;                        // clinician observations
  createdAt: number;
}
```

---

## Constraints & Development Guidelines

### Code Quality
- **TypeScript strict mode** — always run `npm run typecheck` before commit
- Use theme tokens from `src/theme/` for all colors, spacing, typography
- No `react-native-svg` or external charting libraries (components built with View)
- Handle errors gracefully with user-facing feedback

### Dependencies
- Do not add packages without team discussion
- Prefer native Expo modules over third-party
- Keep bundle size lean (monitor with `expo-optimize`)

### Tissue Color Keys
- Tissue types and colors used in `TissueHistoryChart.tsx` **must match** those in `[woundId].tsx`
- When adding new tissue types, update both files simultaneously

### Data Persistence
- All images stored in FileSystem (`Documents/WoundDoc/`)
- Metadata stored in AsyncStorage
- No base64 payloads in AsyncStorage (too large)
- Supabase integration planned; preserve local-first semantics until then

### Env Vars
- Always restart Metro (`npx expo start --clear`) after `.env` changes
- Vars inlined at build time; no runtime reloading
- All three Space URLs required; app fails gracefully if unreachable

---

## Known Limitations & Future Work

### Current Limitations
- ❌ No automated test suite (Jest/Detox)
- ❌ No cloud sync (Supabase integration in progress)
- ❌ No healing rate calculation (cm²/day)
- ❌ No export/share wound reports (PDF export planned)
- ❌ No offline sync queue
- ❌ No push notifications for follow-up reminders
- ❌ No multi-user/team support

### Planned Features
- ✅ Supabase backend for cloud persistence
- ✅ Healing rate metrics (trend analysis)
- ✅ PDF export and clinician notes
- ✅ Automated tests
- ✅ Multi-user roles (clinician, patient, admin)
- ✅ Integration with EHR systems

---

## Medical Safety

**⚠️ Important:**

This application is a **research and demonstration tool**. It is **not a substitute for professional medical diagnosis, treatment, or clinical judgment**. All AI predictions are advisory only and must be verified by a qualified clinician.

Use of this application is at the user's own risk. The developers assume no liability for outcomes.

---

## Contributing

See [`docs/CONTRIBUTING.md`](./docs/CONTRIBUTING.md) for:
- Code style guidelines
- Commit message conventions
- PR review process
- Running tests locally
- Deployment procedures

---

## License

[Insert license here — typically MIT or Apache 2.0 for medical research tools]

---

## Support & Feedback

- **Bug reports:** Open an issue with reproduction steps
- **Feature requests:** Discuss in an issue or pull request
- **Questions:** See [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) for deeper context

---

## Acknowledgments

Built with Expo, React Native, Hugging Face Spaces, and a passion for improving wound care. Special thanks to the FastAPI + Gradio communities for backend infrastructure.
