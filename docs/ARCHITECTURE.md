# WoundDoc Expo App Architecture

## Overview

WoundDoc is a mobile application built with React Native Expo that enables point-of-care wound assessment through computer vision. The app captures wound images and routes them to specialized inference APIs for classification, segmentation, and size detection. Results are combined to provide clinicians with comprehensive wound metrics including tissue composition, area trends, and calibrated measurements.

**Key capabilities:**
- Multi-modal image inference (classification, segmentation, size detection) in parallel
- ArUco marker-based calibration for accurate measurements
- Real-time tissue composition visualization via stacked bar charts
- Area trend analysis with sparkline visualizations
- Persistent local storage of wound records with full image history
- User authentication via secure token management

---

## Directory Structure

```
wounddoc/
├── app/
│   ├── (auth)/
│   │   └── login.tsx                 # Authentication screen
│   ├── (app)/
│   │   ├── _layout.tsx               # Root Stack navigator (all screens registered)
│   │   ├── index.tsx                 # Dashboard: wound list, mini sparklines, trend arrows
│   │   ├── settings.tsx              # API config display, ArUco marker link, sign out
│   │   ├── aruco-marker.tsx          # ArUco marker generator (fullscreen, DPI-calibrated)
│   │   └── wounds/
│   │       ├── new.tsx               # Create wound: image capture + parallel inference
│   │       ├── [woundId].tsx         # Wound detail: header, size tracking, tissue history
│   │       └── add-observation.tsx   # Add observation to existing wound
│   └── _layout.tsx                   # App root layout
├── src/
│   ├── components/
│   │   ├── AiAnalysisCard.tsx        # AI clinical analysis display card (Gemini results)
│   │   ├── AppButton.tsx             # Primary/secondary/danger buttons with press animation
│   │   ├── AppCard.tsx               # Styled card with shadow and border
│   │   ├── AreaSparkline.tsx         # Zero-dependency area-over-time line chart
│   │   ├── EmptyState.tsx            # Empty state placeholder component
│   │   ├── ImageCompareToggle.tsx    # 3-tab image viewer: Original / Annotated / Rectified
│   │   ├── LoadingOverlay.tsx        # Loading indicator with overlay
│   │   ├── SectionHeader.tsx         # Section header with left accent bar
│   │   ├── StatChip.tsx              # Tinted chip with dot indicator
│   │   ├── TissueHistoryChart.tsx    # Stacked bar chart of tissue composition
│   │   ├── WoundTypeBadge.tsx        # Pill badge with human-readable wound type label
│   │   └── WoundTypePickerModal.tsx  # Fullscreen modal for wound type override (16 types)
│   ├── constants/
│   │   └── disclaimers.ts            # Legal and safety disclaimers
│   ├── features/
│   │   ├── auth/
│   │   │   ├── auth.store.ts         # Zustand authentication state management
│   │   │   ├── auth.repository.ts    # Token persistence and auth operations
│   │   │   └── auth.types.ts         # Auth-related type definitions
│   │   ├── inference/
│   │   │   ├── gemini.client.ts      # GeminiClient: analyzeObservation(), analyzeProgress() for AI insights
│   │   │   ├── inference.client.ts   # API client: classifyWound(), segmentWound(), detectWoundSize()
│   │   │   ├── inference.mappers.ts  # Response mappers: mapSegmentationToObservationMetrics, pickOverlayDataUrl, pickRectifiedOverlayDataUrl
│   │   │   └── inference.types.ts    # ClassificationResponse, SegmentationResponse, SizeDetectionResponse
│   │   └── wounds/
│   │       ├── wounds.store.ts       # Zustand wounds store: CRUD operations on wounds and observations
│   │       ├── wounds.repository.ts  # AsyncStorage persistence (key: wounddoc:wounds:v1)
│   │       ├── wounds.types.ts       # WoundRecord, WoundObservation with tissue/calibration data + aiAnalysis
│   │       └── woundSelectors.ts     # Computed selectors: area trends, tissue history, statistics
│   ├── lib/
│   │   ├── config.ts                 # API configuration (segmentation, classification, size bases)
│   │   ├── base64.ts                 # Base64 encoding/decoding utilities
│   │   ├── date.ts                   # Date formatting and manipulation utilities
│   │   ├── image.ts                  # Image processing utilities
│   │   └── validators.ts             # Input validation helpers
│   ├── services/
│   │   ├── api/
│   │   │   └── httpClient.ts         # HTTP client with timeout and retry logic
│   │   ├── media/
│   │   │   └── fileSystemMedia.service.ts  # Image persistence: save/load/delete operations
│   │   ├── storage/
│   │   │   └── asyncStorage.ts       # AsyncStorage wrapper for persistence
│   │   └── theme/
│   │       └── (colors, radius, spacing, typography)
│   └── theme/
│       └── Design tokens and theming configuration
└── docs/
    └── ARCHITECTURE.md               # This file
```

---

## Routing & Navigation

WoundDoc uses Expo Router for file-based routing with two main route groups:

### Auth Group: `(auth)`
- **`/login`** – Initial screen for user authentication
- Protected by route middleware; redirect to login if token absent

### App Group: `(app)`
- **`/`** (index.tsx) – Dashboard
  - Displays list of all wounds with mini sparklines
  - Shows trend indicators for each wound
  - Navigation to wound details or create new wound

- **`/settings`** – Settings screen
  - Displays current API base URLs from environment config
  - Link to ArUco marker generator
  - Sign out functionality

- **`/aruco-marker`** – ArUco Marker Generator
  - Fullscreen, DPI-calibrated ArUco marker display
  - DICT_4X4_50 dictionary support
  - Supports IDs 0-49
  - Physical size calculated from device PixelRatio and estimated DPI

- **`/wounds/new`** – Create New Wound
  - Image capture from camera or library
  - Triggers parallel inference pipeline
  - Creates wound record with initial observation

- **`/wounds/[woundId]`** – Wound Detail
  - Header with wound type and metadata
  - Size tracking card with current metrics
  - Area trend sparkline
  - Tissue composition stacked bar chart
  - Chronological observation list with image viewer

- **`/wounds/[woundId]/add-observation`** – Add Observation
  - Image capture or library selection
  - Runs inference pipeline on existing wound
  - Updates observation history

Root layout (`_layout.tsx`) registers all screens in a Stack navigator with appropriate transitions.

---

## Inference Pipeline

The inference pipeline is the core of WoundDoc's wound assessment capability. It orchestrates parallel calls to three specialized backend APIs.

### Overview

1. **Image capture & preparation**: User captures image or selects from library
2. **Filesystem persistence**: Image saved to local filesystem
3. **Base64 encoding**: Image converted to base64 for API transmission
4. **Parallel inference**: Three inference APIs called simultaneously:
   - Classification (wound type prediction)
   - Segmentation (tissue composition analysis)
   - Size detection (ArUco-calibrated measurements)
5. **Response consolidation**: Results merged into single observation metric
6. **Media persistence**: Overlay and rectified overlay images saved to filesystem
7. **Store update**: Wound record and observation added to Zustand store

### Parallel Inference Calls

All three API calls are invoked concurrently using `Promise.allSettled()`:

```typescript
Promise.allSettled([
  classifyWound(base64Image),
  segmentWound(base64Image),
  detectWoundSize(base64Image, markerSizeCm)
])
```

This ensures that:
- Partial results are captured (one API failure doesn't block others)
- Maximum responsiveness (no sequential waiting)
- Graceful degradation (fallback to segmentation if size detection fails)

### Result Consolidation

**Primary result selection logic:**
- If size detection succeeds → use as primary result
- Else if segmentation succeeds → use as primary result
- Else → fall back to classification only

The primary result provides:
- Overlay image (tissue segmentation mask)
- Rectified overlay image (ArUco-calibrated and rectified)
- Tissue size information (cm² measurements per tissue type)
- Calibration metadata (ArUco detection status, scale factor)

### Inference Response Types

#### ClassificationResponse
```typescript
{
  wound_type: string;          // e.g., "arterial_ulcer", "pressure_ulcer"
  confidence: number;          // 0–1 confidence score
  reasoning?: string;          // Optional explanation
}
```

#### SegmentationResponse
```typescript
{
  overlay_image_base64: string;          // Tissue segmentation mask
  tissue_composition: {                  // Percentage breakdown
    [tissueType: string]: number;
  };
  tissue_size_information?: {            // Optional cm² measurements
    [tissueType: string]: number;
  };
  calibration?: {                        // Optional ArUco calibration
    aruco_detected: boolean;
    marker_size_cm: number;
    detected_marker_size_px: number;
    scale_factor: number;
  };
}
```

#### SizeDetectionResponse
```typescript
{
  overlay_image_base64: string;          // Segmentation mask
  rectified_overlay_image_base64: string;// Geometrically corrected overlay
  tissue_size_information: {             // cm² measurements
    [tissueType: string]: number;
  };
  tissue_composition: {                  // Percentage breakdown
    [tissueType: string]: number;
  };
  calibration: {                         // ArUco calibration metadata
    aruco_detected: boolean;
    marker_size_cm: number;
    detected_marker_size_px: number;
    scale_factor: number;
  };
}
```

### Media Handling

After successful inference:

1. **Original image**: Saved to `documents/wounddoc/originals/{woundId}_{obsId}.jpg`
2. **Overlay image**: Saved to `documents/wounddoc/overlays/{woundId}_{obsId}.jpg`
3. **Rectified overlay**: Saved to `documents/wounddoc/overlays/{woundId}_{obsId}_rectified.jpg`

Filenames include wound ID and observation ID for cross-referencing. Deletion is coordinated across all three files when an observation is removed.

---

## AI Clinical Analysis (Gemini)

WoundDoc integrates Google's Gemini AI model to provide clinical insights and analysis of wound progression. This capability runs on-demand and never auto-executes, giving clinicians full control over when analysis occurs.

### Overview

**Model:** `gemini-3.1-flash-lite-preview` via Gemini REST API

**API endpoint:** `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`

**Authentication:** `EXPO_PUBLIC_GEMINI_API_KEY` (environment variable, inlined at Metro build time)

**Key principle:** Analysis is on-demand only. Users explicitly trigger analysis via UI buttons; results are persisted to AsyncStorage.

### Architecture Components

**Files involved:**
- `src/features/inference/gemini.client.ts` — GeminiClient class with analysis methods
- `src/components/AiAnalysisCard.tsx` — UI card component displaying results
- `src/features/wounds/wounds.types.ts` — `aiAnalysis` field on WoundObservation and WoundRecord
- `src/features/wounds/wounds.store.ts` — `saveWoundAiAnalysis`, `saveObservationAiAnalysis` actions

### Analysis Modes

The GeminiClient provides two analysis methods:

**1. analyzeObservation(obs, wound)**
- Analyzes a single observation in the context of its wound
- Sends best-quality image: rectified > overlay > original
- Includes wound metrics: total area (cm²), infection risk, tissue breakdown
- Includes ArUco calibration metadata
- Includes clinician notes from both observation and wound

**2. analyzeProgress(wound, mode)**
- Analyzes wound progression across multiple observations
- `mode='all'`: sends all observations chronologically for full trajectory analysis
- `mode='last_two'`: sends last 2 observations for comparison-focused insights
- Enables detection of healing trajectory and trend analysis

### Multimodal Request Format

For each observation sent to Gemini, the request includes:

**Image data:**
- Wound image as base64-encoded inlineData (JPEG format)
- Always uses best-quality image available (rectified preferred)

**Text context:**
- Total wound area in cm²
- Infection risk assessment (if available)
- Tissue breakdown by type and percentage/cm²
- ArUco calibration metadata (detection status, scale factor, marker size)
- Clinician notes (observation-specific + wound-level notes)

### Gemini Response Schema

All responses are validated JSON with the following structure:

```typescript
{
  summary: string;                                      // Concise clinical summary
  keyFindings: string[];                                // Array of significant findings
  recommendations: string[];                           // Clinical recommendations
  healingTrajectory: 'improving' | 'stable' | 'worsening' | 'insufficient_data';
  concerns: string[];                                   // Safety/clinical concerns
}
```

**Field descriptions:**
- `summary` — 1–2 sentence clinical assessment
- `keyFindings` — 3–5 bullet points of notable observations
- `recommendations` — Suggested clinical actions or monitoring strategies
- `healingTrajectory` — Wound progression direction (requires 2+ observations for accuracy)
- `concerns` — Red flags or items requiring immediate attention

### UI Component: AiAnalysisCard

**Location:** Displayed on wound detail screen (`[woundId].tsx`)

**Features:**
- **On-demand analysis only** — Primary button: "Analyse" or "Re-analyse"
- **Optional secondary button** — e.g., "Compare last two visits" (triggers `analyzeProgress` with mode='last_two')
- **Healing trajectory pill** — Color-coded visual indicator (improving=green, stable=yellow, worsening=red, insufficient_data=gray)
- **Structured result sections:**
  - Summary block (gray background)
  - Key Findings list (bullet points)
  - Concerns section (highlighted if present)
  - Recommendations section
- **Clinical disclaimer** — Always displayed, emphasizing AI is supplementary to clinical judgment
- **Loading state** — Shows spinner while Gemini API processes request
- **Error handling** — Displays user-friendly error messages if analysis fails

### Integration on Wound Detail Screen

**Wound-level analysis:**
- Progress analysis card displayed in header section (above observations list)
- Analyzes full wound history (mode='all')
- Provides trajectory assessment across all observations

**Per-observation analysis:**
- Individual analysis card at bottom of each observation card
- Single-observation analysis
- Optional secondary button for comparison (last_two mode)

### Data Persistence

Analysis results are persisted via store actions:

**`saveWoundAiAnalysis(woundId, aiAnalysis)`**
- Stores wound-level analysis result to `WoundRecord.aiAnalysis`
- Replaces previous analysis (only latest persisted)
- Triggers AsyncStorage write via repository

**`saveObservationAiAnalysis(woundId, obsId, aiAnalysis)`**
- Stores observation-level analysis result to `WoundObservation.aiAnalysis`
- Replaces previous analysis for that observation
- Triggers AsyncStorage write via repository

**Data structure in store:**
```typescript
interface WoundRecord {
  // ... existing fields
  aiAnalysis?: {
    summary: string;
    keyFindings: string[];
    recommendations: string[];
    healingTrajectory: 'improving' | 'stable' | 'worsening' | 'insufficient_data';
    concerns: string[];
    generatedAt: Date;  // Timestamp of analysis
  };
}

interface WoundObservation {
  // ... existing fields
  aiAnalysis?: {
    summary: string;
    keyFindings: string[];
    recommendations: string[];
    healingTrajectory: 'improving' | 'stable' | 'worsening' | 'insufficient_data';
    concerns: string[];
    generatedAt: Date;  // Timestamp of analysis
  };
}
```

### Error Handling & Edge Cases

- **Network failure:** Displays retry button; no partial persistence
- **Invalid API key:** Graceful message directing user to settings
- **Rate limiting:** Exponential backoff with user notification
- **Insufficient observations:** `analyzeProgress` returns `healingTrajectory: 'insufficient_data'` if < 2 observations
- **Missing image:** Uses text-only analysis (metrics + notes, no multimodal)
- **Malformed response:** Validates JSON schema before persistence; displays error if invalid

### Security & Privacy

- API key stored in environment variable, never logged or transmitted insecurely
- Images sent only to Google Gemini API (third-party service)
- Analysis results stored locally on device (AsyncStorage)
- No data sent to WoundDoc servers
- Users can delete analysis results via observation/wound deletion

---

## Data Model

### WoundRecord

```typescript
interface WoundRecord {
  id: string;                          // UUID
  createdAt: Date;                     // Creation timestamp
  woundType: string;                   // e.g., "arterial_ulcer", "pressure_ulcer"
  woundTypeOverride?: string;          // Manual override (user-selected)
  location?: string;                   // Body location (optional)
  notes?: string;                       // Custom notes
  observations: WoundObservation[];    // Chronological history
}
```

### WoundObservation

```typescript
interface WoundObservation {
  id: string;                          // UUID
  createdAt: Date;                     // Observation timestamp
  originalImageUri: string;            // Filesystem path to original image
  overlayImageUri?: string;            // Filesystem path to segmentation mask
  rectifiedOverlayUri?: string;        // Filesystem path to geometrically corrected overlay
  
  // Inference results
  classificationResult?: ClassificationResponse;
  segmentationResult?: SegmentationResponse;
  sizeDetectionResult?: SizeDetectionResponse;
  
  // Derived metrics
  tissueSizeInformation?: {            // cm² measurements per tissue type
    [tissueType: string]: number;
  };
  tissueAreaCm2?: number;              // Total wound area (cm²)
  tissueComposition?: {                // Percentage breakdown
    [tissueType: string]: number;
  };
  calibration?: {                      // ArUco calibration metadata
    aruco_detected: boolean;
    marker_size_cm: number;
    detected_marker_size_px: number;
    scale_factor: number;
  };
  
  // User input
  notes?: string;                      // Observation-specific notes
}
```

### Wound Type Taxonomy

16 supported wound types (with human-readable labels):
- Arterial ulcer
- Diabetic ulcer
- Pressure ulcer
- Venous ulcer
- Surgical wound
- Burn wound
- Trauma/laceration
- Fungal infection
- Bacterial infection
- Inflammatory wound
- And others (see WoundTypeBadge.tsx for complete list)

---

## Local Persistence

WoundDoc uses two complementary persistence mechanisms:

### Structured Data: AsyncStorage

**Store key:** `wounddoc:wounds:v1`

All wound records and observations are serialized to JSON and persisted to AsyncStorage. This provides:
- Fast, reliable read/write access
- Transaction-like semantics via Zustand store
- Schema versioning via key suffix (v1, v2, etc.)

**Data flow:**
1. User action triggers store mutation
2. Zustand calls repository method
3. Repository serializes state to JSON
4. AsyncStorage persists to device storage
5. On app launch, repository hydrates store from AsyncStorage

### Media Files: Filesystem

Images are stored in app's documents directory for durability and privacy:

```
documents/wounddoc/
├── originals/
│   └── {woundId}_{obsId}.jpg         # Original captured image
├── overlays/
│   ├── {woundId}_{obsId}.jpg         # Segmentation mask overlay
│   └── {woundId}_{obsId}_rectified.jpg  # Geometrically corrected overlay
```

**Lifecycle management:**
- Created during inference pipeline (step 7)
- Deleted when observation is removed (coordinated delete across all three files)
- Deleted when wound is removed (cascade delete all observations → all images)

**File format:**
- JPEG compression for overlays (smaller, acceptable quality loss)
- Original format preserved for original images

### Persistence Coordination

Store operations that affect media files:
- `createWound()` + `addObservation()` → save 3 image files
- `addObservation()` → save 3 image files
- `deleteObservation()` → delete 3 image files
- `deleteWound()` → delete all observation images (recursive)

The `fileSystemMedia.service.ts` provides high-level operations that handle all three files:
- `saveOriginalFromUri(originalUri, woundId, obsId)`
- `saveOverlayFromDataUrl(overlayDataUrl, woundId, obsId)`
- `saveRectifiedOverlayFromDataUrl(rectifiedDataUrl, woundId, obsId)`
- `deleteObservationMedia(woundId, obsId)`
- `deleteWoundMedia(woundId)`

---

## ArUco Marker Generator

The ArUco marker generator enables manual size calibration for wound measurements. It generates physical, printable ArUco markers that can be placed in wound photos.

### Marker Specification

**Dictionary:** OpenCV DICT_4X4_50
- 4×4 bit array per marker
- 50 unique IDs (0–49)
- Robust detection under varying lighting and angles

**Physical sizing:**
```
pixels = cm × (estimatedDPI / 2.54)
```

Where:
- `cm` = desired physical marker size (1.5–10 cm, user-selectable)
- `estimatedDPI` = device DPI (PixelRatio.get() × 163 on iOS, × 160 on Android)
- Clamped pixel size ensures markers fit modern phone displays

**Rendering:**
- 6×6 View grid layout
- 1-cell black border around perimeter
- 4×4 data region in center
- Each data bit rendered as white or black square
- Fullscreen mode: StatusBar hidden, white background for clean output

### Size Detection Integration

The ArUco marker is optional but highly recommended for accurate measurements. The size detection API:
- Accepts optional `marker_size_cm` parameter
- Gracefully falls back to pixel-based measurements if marker not detected
- Returns calibration metadata indicating detection success
- Applies scale factor to convert pixel areas to cm²

**Workflow:**
1. Clinician prints ArUco marker at known size (e.g., 5 cm)
2. Marker placed in wound photo for scale reference
3. Size detection API detects marker and calculates scale
4. All measurements automatically converted to cm²

---

## Size Tracking & Visualisations

WoundDoc provides two primary visualisations for wound progression monitoring:

### AreaSparkline

**Component:** `AreaSparkline.tsx` (zero external dependencies)

A compact, minimal line chart showing wound area over time:

**Features:**
- Polyline created via rotated View components (no canvas/SVG)
- Fill region rendered as stacked rect Views
- Gridlines for reference
- Y-axis labels with units (cm²)
- Touch-responsive for detailed data inspection

**Data source:** `woundSelectors.getAreaHistory(woundRecord)`
- Returns array of `{ date: Date, areaCm2: number }`
- Sorted chronologically (oldest first)

**Rendering:**
1. Normalize data to 0–100% scale
2. Calculate polyline points from normalized values
3. Draw gridlines (horizontal, y-axis labels)
4. Draw filled area (light background)
5. Draw polyline (dark color)

### TissueHistoryChart

**Component:** `TissueHistoryChart.tsx`

A stacked horizontal bar chart showing tissue composition evolution across observations:

**Features:**
- One horizontal bar per observation
- Stacked segments per tissue type
- Color-coded segments (TISSUE_COLORS map)
- Sorted chronologically (oldest bottom, newest top)
- Supports both cm² and percentage modes (cm² preferred)

**Data source:** `woundSelectors.getTissueHistory(woundRecord)`
- Returns array of `{ date: Date, tissues: { [type: string]: number } }`

**Tissue type color map:**
- 34+ predefined tissue types (epithelial, granulation, necrotic, slough, eschar, etc.)
- Consistent colors across app for instant recognition
- Fallback color for unknown tissue types

**Rendering:**
1. Group observations chronologically
2. For each observation, calculate total tissue area (sum of all types)
3. Draw background bar (gray)
4. Draw colored segments proportional to tissue area
5. Add labels for tissue types exceeding 5% threshold

---

## Backend APIs

WoundDoc integrates with three Hugging Face Spaces for inference. All are deployed by zazaman and configured via environment variables.

### 1. Classification API

**Space:** `zazaman/wound-classification-demo`

**Environment variable:** `EXPO_PUBLIC_CLASSIFICATION_API_BASE`

**Endpoint:** `POST /api/classify`

**Request:**
```json
{
  "image_base64": "iVBORw0KGgoAAAANSUhEUgAA..."
}
```

**Response:**
```json
{
  "wound_type": "arterial_ulcer",
  "confidence": 0.95,
  "reasoning": "High confidence arterial ulcer based on irregular borders..."
}
```

**Purpose:** Predicts primary wound type from image.

### 2. Segmentation API

**Space:** `zazaman/Aerobiosys-Wound-Analysis`

**Environment variable:** `EXPO_PUBLIC_SEGMENTATION_API_BASE`

**Endpoint:** `POST /api/segment`

**Request:**
```json
{
  "image_base64": "iVBORw0KGgoAAAANSUhEUgAA..."
}
```

**Response:**
```json
{
  "overlay_image_base64": "iVBORw0KGgoAAAANSUhEUgAA...",
  "tissue_composition": {
    "epithelial": 20,
    "granulation": 40,
    "necrotic": 40
  },
  "tissue_size_information": {
    "epithelial": 2.5,
    "granulation": 5.0,
    "necrotic": 5.0
  },
  "calibration": {
    "aruco_detected": false,
    "marker_size_cm": 0,
    "detected_marker_size_px": 0,
    "scale_factor": 1.0
  }
}
```

**Purpose:** Segments tissue types and quantifies composition (by % and optionally by cm²).

### 3. Size Detection API

**Space:** `zazaman/woundsz` (Aerobiosys-Wound-Size-Space)

**Environment variable:** `EXPO_PUBLIC_SIZE_API_BASE`

**Endpoint:** `POST /api/segment`

**Request:**
```json
{
  "image_base64": "iVBORw0KGgoAAAANSUhEUgAA...",
  "marker_size_cm": 5.0
}
```

**Response:**
```json
{
  "overlay_image_base64": "iVBORw0KGgoAAAANSUhEUgAA...",
  "rectified_overlay_image_base64": "iVBORw0KGgoAAAANSUhEUgAA...",
  "tissue_size_information": {
    "epithelial": 2.5,
    "granulation": 5.0,
    "necrotic": 5.0
  },
  "tissue_composition": {
    "epithelial": 20,
    "granulation": 40,
    "necrotic": 40
  },
  "calibration": {
    "aruco_detected": true,
    "marker_size_cm": 5.0,
    "detected_marker_size_px": 125,
    "scale_factor": 0.04
  }
}
```

**Purpose:** Segments tissue, detects ArUco marker for calibration, and provides geometrically corrected overlay (rectified).

**Key distinctions:**
- Returns rectified overlay (ArUco-corrected perspective)
- Requires optional marker_size_cm for scale calculation
- Gracefully handles missing marker (returns scale_factor: 1.0, aruco_detected: false)
- Best-in-class for accurate cm² measurements

---

## HTTP Client & Reliability

**File:** `src/services/api/httpClient.ts`

**Features:**
- Configurable timeout (default 30s)
- Automatic retry on network errors (exponential backoff)
- Request/response logging in development
- JSON serialization/deserialization
- Error handling with descriptive messages

**Usage:**
```typescript
const response = await httpClient.postJson(url, payload, {
  timeout: 30000,
  maxRetries: 3
});
```

All three inference APIs use this client for consistent error handling and resilience.

---

## Theme System

WoundDoc uses a centralized design token system for visual consistency.

**Modules** (in `src/theme/`):
- **colors.ts** – Palette definition, semantic colors (primary, error, warning)
- **radius.ts** – Border radius tokens (sm, md, lg)
- **spacing.ts** – Margin/padding increments (xs, sm, md, lg, xl)
- **typography.ts** – Font families, sizes, weights, line heights

**Design principles:**
- Accessible color contrast (WCAG AA minimum)
- Consistent spacing (8px grid system)
- Clear visual hierarchy via typography
- Touch-friendly component sizing (48px minimum tap target)

**Usage in components:**
```typescript
import { colors, spacing, typography } from '@/theme';

<View style={{ 
  backgroundColor: colors.primary,
  padding: spacing.md,
  ...typography.body1
}} />
```

---

## State Management

WoundDoc uses **Zustand** for scalable, minimal-boilerplate state management.

### Wounds Store

**File:** `src/features/wounds/wounds.store.ts`

**State:**
```typescript
{
  wounds: WoundRecord[];
}
```

**Actions:**
- `createWound(woundType: string)` – Create new wound with initial observation
- `addObservation(woundId: string, observation: WoundObservation)` – Add observation to existing wound
- `deleteWound(woundId: string)` – Remove wound and all observations
- `deleteObservation(woundId: string, obsId: string)` – Remove single observation
- `updateWoundType(woundId: string, woundType: string)` – Change wound type
- `updateWoundTypeOverride(woundId: string, override?: string)` – Set manual override
- `updateWoundDetails(woundId: string, location?: string, notes?: string)` – Update metadata
- `updateObservationNotes(woundId: string, obsId: string, notes: string)` – Update observation notes
- `saveWoundAiAnalysis(woundId: string, aiAnalysis: AiAnalysis)` – Store wound-level AI analysis result
- `saveObservationAiAnalysis(woundId: string, obsId: string, aiAnalysis: AiAnalysis)` – Store observation-level AI analysis result

**Persistence:**
- Repository hydrates store from AsyncStorage on app launch
- Each action commits changes to AsyncStorage
- Transactional semantics ensure data consistency

### Auth Store

**File:** `src/features/auth/auth.store.ts`

**State:**
```typescript
{
  token?: string;
  isAuthenticated: boolean;
}
```

**Actions:**
- `login(token: string)` – Authenticate user
- `logout()` – Clear token
- `hydrateFromStorage()` – Load token from AsyncStorage on app launch

---

## Selectors & Computed Data

**File:** `src/features/wounds/woundSelectors.ts`

Pure functions for deriving insights from wound data:

- **`getLatestObservation(woundRecord)`** – Most recent observation
- **`computeAreaTrend(woundRecord)`** – Area change direction (↑ ↓ →)
- **`getAreaHistory(woundRecord)`** – Array of `{ date, areaCm2 }` for sparkline
- **`getTissueHistory(woundRecord)`** – Array of `{ date, tissues }` for stacked chart
- **`getWoundStats(woundRecord)`** – Computed metrics (current area, avg area, delta, etc.)

All selectors handle edge cases:
- Missing observations
- Missing tissue size data (fallback to percentage composition)
- Division by zero
- Invalid dates

---

## Extension Points

WoundDoc is architected for extensibility:

### Adding New Inference APIs

1. Define response types in `src/features/inference/inference.types.ts`
2. Implement API client method in `src/features/inference/inference.client.ts`
3. Add mapper function in `src/features/inference/inference.mappers.ts`
4. Update `inference/index.ts` exports
5. Integrate into pipeline in wound creation screen

### Adding New Visualisations

1. Create component in `src/components/`
2. Implement using Zustand selectors for data
3. Integrate into wound detail screen or dashboard
4. Reuse TISSUE_COLORS and theme tokens

### Adding New Data Fields

1. Extend `WoundObservation` or `WoundRecord` in `wounds.types.ts`
2. Update store CRUD operations if needed
3. Update persistence schema (consider versioning: wounddoc:wounds:v2)
4. Update UI forms and displays

### Adding New Wound Types

1. Extend wound type taxonomy in `WoundTypePickerModal.tsx`
2. Add color/styling in component if needed
3. Update labels in `WoundTypeBadge.tsx`
4. Backend APIs will automatically support new types (no changes needed)

### Customizing Theme

1. Update tokens in `src/theme/`
2. Recompile app (Expo will hot-reload)
3. No component changes required (all use design tokens)

---

## Development Workflow

### Environment Setup

**Required environment variables** (`.env.local`):
```
EXPO_PUBLIC_CLASSIFICATION_API_BASE=https://zazaman-wound-classification-demo.hf.space
EXPO_PUBLIC_SEGMENTATION_API_BASE=https://zazaman-Aerobiosys-Wound-Analysis.hf.space
EXPO_PUBLIC_SIZE_API_BASE=https://zazaman-woundsz.hf.space
EXPO_PUBLIC_GEMINI_API_KEY=<your-gemini-api-key>
```

### Key Dependencies

- **expo** – Managed React Native framework
- **react-native** – UI library
- **zustand** – State management
- **react-native-async-storage** – Persistent storage
- **expo-file-system** – Filesystem access
- **expo-media-library** – Camera/photo library
- **expo-router** – File-based routing

### Build Commands

```bash
expo start              # Development server
expo build:android     # Production APK/AAB
expo build:ios         # Production IPA
```

---

## Security Considerations

- **Token storage:** Auth token persisted to AsyncStorage (device-encrypted on modern devices)
- **Image privacy:** All images stored locally on device; no transmission to WoundDoc servers
- **API endpoints:** Direct communication with inference provider services only
- **HTTPS enforcement:** All API calls use HTTPS; certificates validated
- **Data deletion:** Users can permanently delete all wounds and observations; deletes both DB and filesystem

---

## Performance Optimization

- **Parallel inference:** Three API calls concurrent; no sequential delays
- **Image compression:** Overlay images compressed to JPEG; original preserved
- **Memoization:** React components memoized to prevent unnecessary re-renders
- **Lazy loading:** Navigation screens lazy-loaded via Expo Router
- **Filesystem indexing:** Images organized by wound/observation ID for fast lookup/deletion

---

## Testing Strategy

- **Unit tests:** Selectors, mappers, validators tested in isolation
- **Integration tests:** Store mutations and persistence tested end-to-end
- **Component tests:** Key components (sparkline, stacked chart) tested with mock data
- **E2E tests:** Critical user journeys (wound creation, observation addition) tested on device

---

## Troubleshooting

### Common Issues

**Inference fails with network error:**
- Verify API base URLs in settings
- Check network connectivity
- Inspect httpClient retry logs

**Images not saving:**
- Verify filesystem permissions (iOS/Android)
- Check available disk space
- Inspect FileSystem errors in console

**ArUco marker not detected:**
- Ensure marker is at least 1.5 cm
- Use high-contrast printing (100% black/white)
- Avoid glare or shadows on marker

**Size measurements seem off:**
- Verify marker is printed at exact physical size
- Check that size_marker_cm parameter matches physical marker
- Confirm ArUco detection succeeded (check calibration metadata)

---

## Future Roadmap

- [ ] Support additional ArUco dictionaries (DICT_5X5_100, etc.)
- [ ] Multi-wound comparison analytics
- [ ] Trend prediction and progression forecasting
- [ ] Integration with electronic health records (EHR)
- [ ] Offline mode with syncing
- [ ] Batch re-analysis of historical wounds
- [ ] Custom wound type taxonomy per deployment
- [ ] Export reports (PDF, CSV)

