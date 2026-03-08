# Contributing Guide

## Branch and Commit Workflow

1. Create a branch per feature/fix.
2. Keep commits scoped by concern:
- app UI flow
- data model/store
- inference/client
- HF Space backend
3. Run checks before pushing.

## Required Local Checks

### Expo app
```bash
cd wounddoc
npm run typecheck
```

### Spaces (syntax sanity)
```bash
python -m py_compile Aerobiosys-Wound-Analysis/app.py wound-classification-demo/app.py
```

## Common Development Tasks

### Add a new wound metric field end-to-end
1. Extend `WoundObservation.metrics` in `wounds.types.ts`.
2. Update mapper in `inference.mappers.ts`.
3. Render UI in `wounds/[woundId].tsx` timeline card.
4. Verify persistence/hydration works with existing records.

### Add a new app screen
1. Add file route in `wounddoc/app/`.
2. Register screen title/options in `app/(app)/_layout.tsx` if needed.
3. Keep logic in `src/features` + `src/services`, not directly in route file where possible.

### Swap local auth for Supabase
1. Add `SupabaseAuthRepository` implementing `AuthRepository` interface.
2. Replace exported repository in `auth.repository.ts`.
3. Inject auth token usage into `httpClient.ts`.

### Swap local wound storage for cloud
1. Add `SupabaseWoundRepository` implementing `WoundRepository`.
2. Replace exported repository in `wounds.repository.ts`.
3. Migrate media layer for signed upload URLs/storage buckets.

## Style and Architecture Expectations

- Keep route files focused on orchestration and rendering.
- Keep API contracts centralized in `features/inference`.
- Avoid storing large base64 blobs in AsyncStorage.
- Preserve compatibility endpoints on Spaces unless an intentional breaking change is approved.

## Testing Guidance

- Test new wound creation with:
  - healthy image + segmentation success
  - classification endpoint unavailable
  - segmentation endpoint unavailable
- Test add-observation path independently from creation flow.
- Test web and native behavior when touching media/file code.

## Security and Repo Hygiene

- Never commit `hftoken.txt`.
- Never commit `.env` with secrets.
- Keep deployment targets in `deploy_hf_spaces.py` aligned with production owner namespace.

## Release Checklist

- Verify both Spaces return healthy JSON from `/api/health`.
- Verify app loads with latest runtime URLs.
- Verify login -> create wound -> add observation e2e flow.
- Update README/docs when contracts or routes change.
