# Cursor / AI Bootstrap Context

Use this file as the first context block when asking an AI coding assistant to modify this codebase.

## Project Intent

Build and evolve a mobile-first wound monitoring MVP:
- classify wound type from image
- segment wound and extract tissue/area/risk metrics
- track observations over time
- keep architecture ready for Supabase migration

## Active Components

- Expo app in `wounddoc/`
- HF segmentation Space in `Aerobiosys-Wound-Analysis/`
- HF classification Space in `wound-classification-demo/`

## Non-Negotiable Constraints

- Keep Gradio UI available in Spaces.
- Keep API endpoints stable:
  - classification: `/api/classify`, `/api/health`
  - segmentation: `/api/segment`, `/api/health`, `/analyze` alias
- Preserve local-first storage semantics unless task explicitly requests cloud migration.
- Do not store full base64 payloads in AsyncStorage.

## Runtime/Dependency Stability Notes

Spaces currently require:
- README metadata: `python_version: "3.10"`
- `gradio==4.44.1`
- `huggingface_hub==0.23.5`
- segmentation adds `tensorflow==2.15.0`, `numpy<2`

Reason: avoid known HF runtime regressions encountered during setup.

## Where to Implement Changes

### UI Route-level changes
- `wounddoc/app/*`

### Business logic and state
- `wounddoc/src/features/*`

### Network/persistence/media infra
- `wounddoc/src/services/*`

### Contracts and mapping
- `wounddoc/src/features/inference/*`

### Shared types
- `wounddoc/src/features/wounds/wounds.types.ts`

## Fast Ramp-Up Commands

```bash
cd wounddoc
npm install
npm run typecheck
npx expo start --host lan --port 8082
```

Space deploy:

```bash
$env:HF_TOKEN='hf_xxx'
python deploy_hf_spaces.py
```

## Typical AI Task Prompt Template

```text
You are updating WoundDoc.

Goal:
<one concrete goal>

Constraints:
- keep existing API contracts
- keep Gradio mounted
- keep local storage compatibility
- update docs for any behavior change

Deliverables:
- code changes
- verification steps run
- any migration notes
```

## Definition of Done for AI Changes

- App typechecks (`npm run typecheck`).
- No endpoint contract regression in Spaces.
- New behavior documented in README/docs.
- If dependency/runtime pins changed, explain why.
