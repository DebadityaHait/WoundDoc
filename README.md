# WoundDoc App

Expo + Hugging Face Spaces app for longitudinal wound monitoring.

This folder is the app repo root and is intended for direct GitHub collaboration.

## What this app does

- Dummy login (non-empty email/password)
- New wound creation from camera/gallery image
- First image initializes wound type from classification Space
- Segmentation overlay + metrics per observation
- Add follow-up observations over time
- Timeline view with area trend and tissue composition snippets
- Local persistence (AsyncStorage metadata + native file storage)
- Web-safe fallback for media persistence

## Tech Stack

- Expo SDK 55
- TypeScript
- Expo Router
- Zustand (local state)
- React Query (client provider in root layout)
- AsyncStorage
- expo-image-picker
- expo-file-system

## Project Structure

```text
wounddoc/
  app/
    _layout.tsx
    (auth)/login.tsx
    (app)/
      _layout.tsx
      index.tsx
      settings.tsx
      wounds/
        new.tsx
        [woundId].tsx
        add-observation.tsx
  src/
    components/
    constants/
    features/
      auth/
      wounds/
      inference/
    services/
      api/
      media/
      storage/
    lib/
    theme/
  docs/
```

## Environment

Create `.env` from `.env.example`:

```env
EXPO_PUBLIC_SEGMENTATION_API_BASE=https://zazaman-aerobiosys-wound-analysis.hf.space
EXPO_PUBLIC_CLASSIFICATION_API_BASE=https://zazaman-wound-classification-demo.hf.space
```

## Run

Install:

```bash
npm install
```

Typecheck:

```bash
npm run typecheck
```

Web:

```bash
npm run web
```

Expo Go (same Wi-Fi):

```bash
npx expo start --host lan --port 8082
```

Expo Go (network fallback):

```bash
npx expo start --host tunnel --port 8082
```

## Spaces API contracts consumed

Classification:
- `GET /api/health`
- `POST /api/classify`

Segmentation:
- `GET /api/health`
- `POST /api/segment`
- `POST /analyze` (legacy alias)

All inference requests use:

```json
{ "image_base64": "data:image/jpeg;base64,..." }
```

## Documentation Index

- Architecture: `docs/ARCHITECTURE.md`
- Contributing: `docs/CONTRIBUTING.md`
- Cursor bootstrap context: `docs/CURSOR_BOOTSTRAP.md`

## Medical Safety Note

This is a research/demo application. It is not a substitute for professional medical advice or diagnosis.
