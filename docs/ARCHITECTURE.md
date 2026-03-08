# Architecture Deep Dive

## 1) App Runtime Layers

### UI and Navigation
- Expo Router routes under `wounddoc/app/`.
- `app/_layout.tsx` wraps app in React Query provider and auth gate.
- Auth gate redirects between `(auth)` and `(app)` groups based on local session.

### Domain and State
- `src/features/auth`: local session state and repository abstraction.
- `src/features/wounds`: wound record state, selectors, repository abstraction.
- `src/features/inference`: API DTOs, client methods, response mappers.

### Infrastructure
- `src/services/api/httpClient.ts`: timeout + retry + error mapping.
- `src/services/storage/asyncStorage.ts`: JSON persistence helpers.
- `src/services/media/fileSystemMedia.service.ts`: native file persistence with web fallback.

## 2) Route-Level Responsibilities

### `/(auth)/login`
- Input validation for non-empty email/password.
- Creates local session token and redirects into app shell.

### `/(app)/index`
- Hydrates wound store.
- Shows wound cards and disclaimer.
- Routes to new wound and settings screens.

### `/(app)/wounds/new`
- Acquires image.
- Converts image to data URL payload.
- Calls classification and segmentation in parallel.
- Handles partial success rules.
- Persists new record + first observation.

### `/(app)/wounds/[woundId]`
- Renders reverse-chronological timeline.
- Shows area trend when >=2 area values exist.
- Displays original/overlay image toggle.

### `/(app)/wounds/add-observation`
- Acquires follow-up image.
- Runs segmentation.
- Persists observation and updates parent wound.

## 3) Persistence Strategy

### Session
- Stored via `authRepository` using AsyncStorage key `wounddoc:auth:session`.

### Wounds Metadata
- Stored via `woundRepository` using AsyncStorage key `wounddoc:wounds:v1`.
- Stores URIs/references only, not heavy base64 payloads.

### Images and Overlays
- Native: files in app document directory.
- Web: URI/data URL fallback.

## 4) Inference Call Path

1. UI calls `inferenceClient.classifyWound` and/or `segmentWound`.
2. `inferenceClient` reads base URLs from `src/lib/config.ts`.
3. `httpClient.postJson` enforces timeout.
4. One immediate retry occurs for transient network/timeout failures.
5. Errors mapped to user-readable messages via `inferApiMessage`.

## 5) Error Handling Matrix

- Timeout/network: prompt to check internet and retry.
- 400: show API-provided detail string.
- 500+: generic retry message.
- Classification fail + segmentation success on new wound: save as `Unknown` type.
- Segmentation fail on new wound: block creation.
- Segmentation fail on add-observation: block observation save.

## 6) Hugging Face Spaces Design

### Segmentation Space
- Endpoints:
  - `GET /api/health`
  - `POST /api/segment`
  - `POST /analyze` (compat alias)
- UI mounted at `/gradio`.
- Root redirects to `/gradio`.
- Runtime pins are intentionally strict to avoid HF base image regressions.

### Classification Space
- Endpoints:
  - `GET /api/health`
  - `POST /api/classify`
- UI mounted at `/gradio`.
- Root redirects to `/gradio`.

## 7) Runtime Pin Rationale

### Why strict pins are used
Recent HF default Python images and transitive dependency changes caused breakages.

Current stabilizers:
- `python_version: "3.10"` in each Space README metadata.
- `gradio==4.44.1`.
- `huggingface_hub==0.23.5`.
- Segmentation only: `tensorflow==2.15.0`, `numpy<2`.

## 8) Extension Points for Upcoming Features

- Supabase auth repository replacement:
  - `src/features/auth/auth.repository.ts`
- Supabase wound repository replacement:
  - `src/features/wounds/wounds.repository.ts`
- Supabase media storage replacement:
  - `src/services/media/fileSystemMedia.service.ts`
- Auth headers for API calls:
  - `src/services/api/httpClient.ts`

## 9) Suggested Next Major Milestones

- Add remote sync + offline conflict strategy.
- Add structured observation notes editing and history.
- Add typed API integration tests against Spaces.
- Add CI checks for Expo typecheck + Python lint/smoke.
