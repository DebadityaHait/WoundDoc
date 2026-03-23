# Contributing to WoundDoc

Welcome to the WoundDoc project! This guide will help you set up your development environment and contribute to the Expo-based wound monitoring app.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v16 or higher) and **npm** or **yarn**
- **Expo CLI**: Install globally with `npm install -g expo-cli`
- **Git** for version control
- **Python 3.8+** (for deploying HF Spaces)
- A code editor (VS Code recommended)

## Environment Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd wounddoc
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
EXPO_PUBLIC_SEGMENTATION_API_BASE=https://zazaman-aerobiosys-wound-analysis.hf.space
EXPO_PUBLIC_CLASSIFICATION_API_BASE=https://zazaman-wound-classification-demo.hf.space
EXPO_PUBLIC_SIZE_API_BASE=https://zazaman-woundsz.hf.space
```

These environment variables point to the three Hugging Face Space backends:
- **Segmentation API**: Wound image segmentation analysis
- **Classification API**: Wound classification and categorization
- **Size API (woundsz)**: Wound size and tissue composition analysis

## Running the App

### Start the Expo Development Server

```bash
npx expo start
```

**Important**: When you change the `.env` file, always restart the dev server with the `--clear` flag:

```bash
npx expo start --clear
```

### Running on Different Platforms

**Android**:
- Press `a` in the terminal after running `npx expo start`
- Requires Android Emulator or physical device with Expo Go installed

**iOS**:
- Press `i` in the terminal after running `npx expo start`
- Requires macOS and Xcode

**Web**:
```bash
npx expo start --web
```

## TypeScript Validation

Always validate your TypeScript code before committing:

```bash
npx tsc --noEmit
```

This checks for type errors without generating output files. Fix all errors before submitting a PR.

## Project Layout

```
wounddoc/
├── app/                              # Expo Router app directory
│   ├── (app)/                       # App stack (authenticated screens)
│   │   ├── _layout.tsx              # Register new screens here
│   │   ├── index.tsx                # Home screen
│   │   └── [woundId]/               # Wound detail screens
│   ├── (auth)/                      # Auth stack
│   └── _layout.tsx                  # Root layout
├── src/
│   ├── components/                  # Reusable React components
│   ├── store/                       # Zustand state management
│   │   └── wounds.ts                # Main wound store
│   ├── types/
│   │   ├── inference.types.ts       # API response types
│   │   ├── inference.mappers.ts     # Map API responses to app types
│   │   └── wounds.types.ts          # App-level wound types
│   ├── utils/
│   │   └── woundSelectors.ts        # Derived state selectors
│   ├── theme/                       # Theme configuration
│   │   ├── colors.ts
│   │   ├── spacing.ts
│   │   └── typography.ts
│   └── services/
│       ├── api/                     # HF Space API clients
│       └── storage/                 # AsyncStorage and FileSystem wrappers
├── docs/                            # Documentation
└── package.json
```

## Making Changes

### Branch Workflow

1. Always work on a feature branch, never commit directly to `main`
2. Use descriptive branch names: `feature/add-wound-photos`, `fix/api-timeout`
3. Create a pull request for code review before merging to `main`

### Pre-Commit Checklist

Before committing, ensure:

1. ✅ Run `npx tsc --noEmit` and fix all TypeScript errors
2. ✅ Test your changes on web and Android
3. ✅ Follow the style guide (see below)
4. ✅ Update tests if applicable
5. ✅ Update documentation if behavior changed

### Commit Message Guidelines

Write clear, concise commit messages:

```
[type]: Brief description

Optional longer explanation of the change
- Bullet points for details
- Reference issue numbers: fixes #123
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

## Adding New Features

### Adding a New Screen

1. **Create the screen component** in `app/(app)/your-screen.tsx`
2. **Register it** in `app/(app)/_layout.tsx`:
   ```typescript
   <Stack.Screen 
     name="your-screen" 
     options={{ title: "Your Screen Title" }} 
   />
   ```
3. **Navigate to it** using Expo Router's `Link` or `useRouter()` hook

### Adding New Inference Fields

When adding a new field to the wound analysis results:

1. **Update API types** in `src/types/inference.types.ts` (match HF Space API response)
2. **Create mapper functions** in `src/types/inference.mappers.ts` to normalize API data
3. **Add field to app types** in `src/types/wounds.types.ts`
4. **Create selectors** in `src/utils/woundSelectors.ts` for derived state
5. **Use in components** via Zustand store and selectors

### Adding New Tissue Colors

When adding or updating tissue color mappings:

1. **Update `TISSUE_COLORS`** in `app/(app)/[woundId].tsx`
2. **Update `TISSUE_COLORS`** in the TissueHistoryChart component
3. Ensure consistency between both definitions
4. Use theme colors from `@/src/theme/colors.ts`

## Deployment

### Deploying HF Spaces

The project uses three Hugging Face Spaces for inference backends. To deploy updated model code:

1. **Ensure you have HF_TOKEN set**:
   ```bash
   export HF_TOKEN=your_hugging_face_token
   ```

2. **Run the deployment script** from the workspace root:
   ```bash
   python deploy_hf_spaces.py
   ```

This script syncs code to:
- `Aerobiosys-Wound-Size-Space/app.py` (size + tissue analysis)
- `Aerobiosys-Wound-Analysis/app.py` (segmentation)
- `wound-classification-demo/app.py` (classification)

### ArUco Marker Configuration

ArUco markers are used for size calibration. The current configuration uses:
- **Dictionary**: `DICT_4X4_50` (4x4 bit dictionary with 50 unique markers)
- **Location**: `src/components/aruco-marker.tsx`

Only change this if marker generation/detection behavior needs adjustment.

## Style Guide

### Code Style

- **Components**: Use functional components with React hooks only
- **Styles**: Use `StyleSheet.create()` for all style definitions
- **Inline Styles**: Only allowed for dynamic values computed at runtime
- **Theme Values**: Always use values from `@/src/theme/*` files
  - Colors: `@/src/theme/colors.ts`
  - Spacing: `@/src/theme/spacing.ts`
  - Typography: `@/src/theme/typography.ts`

### Example Component Structure

```typescript
import { StyleSheet } from 'react-native';
import { useTheme } from '@/src/theme';

const MyComponent = () => {
  const theme = useTheme();
  
  return (
    <View style={styles.container}>
      {/* Content */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
});

export default MyComponent;
```

### Async Store Actions

All Zustand store actions that perform async operations must include try/catch error handling:

```typescript
const addWound = async (wound: Wound) => {
  try {
    await storage.saveWound(wound);
    set((state) => ({
      wounds: [...state.wounds, wound],
    }));
  } catch (error) {
    console.error('Failed to add wound:', error);
    throw error;
  }
};
```

### TypeScript Requirements

- **No `any` types**: Always specify explicit types
- **Strict mode**: Follow `tsconfig.json` strict settings
- **Null safety**: Use proper optional chaining and nullish coalescing
- **Type exports**: Export types from dedicated `.types.ts` files

## Testing Guidance

### Current Testing Strategy

WoundDoc currently relies on **manual testing** rather than automated test suites. TypeScript serves as the primary correctness tool.

### Testing Workflow

1. **Local Testing**: Test on web first for quick iteration
   ```bash
   npx expo start --web
   ```

2. **Mobile Testing**: Test on Android emulator or physical device
   ```bash
   npx expo start
   # Then press 'a' for Android
   ```

3. **TypeScript Validation**: Run type checking before each commit
   ```bash
   npx tsc --noEmit
   ```

### Testing Checklist

- [ ] Feature works on web browser
- [ ] Feature works on Android device/emulator
- [ ] Navigation flows are smooth
- [ ] Data persists correctly (local storage)
- [ ] API calls handle errors gracefully
- [ ] UI renders correctly on different screen sizes
- [ ] All TypeScript errors are resolved

## Common Pitfalls

### 1. Environment Variables Not Updating

**Problem**: Changes to `.env` don't appear in the app

**Solution**: Always restart Expo with `--clear`:
```bash
npx expo start --clear
```

### 2. TypeScript Errors on Commit

**Problem**: Committing code with unresolved TypeScript errors

**Solution**: Run `npx tsc --noEmit` before committing. Fix all errors—they indicate real bugs.

### 3. Inconsistent Tissue Colors

**Problem**: Tissue colors differ between screens

**Solution**: Update `TISSUE_COLORS` in BOTH `[woundId].tsx` and TissueHistoryChart.tsx consistently.

### 4. Incorrect Inference Field Mapping

**Problem**: API data doesn't map correctly to app state

**Solution**: Follow the data flow:
1. Add to `inference.types.ts` (API response type)
2. Add mapper to `inference.mappers.ts`
3. Add to `wounds.types.ts` (app type)
4. Create selector in `woundSelectors.ts`
5. Use in component via store

### 5. Hardcoded Values Instead of Theme

**Problem**: Using hardcoded colors, spacing, fonts

**Solution**: Always import from `@/src/theme/*`:
```typescript
// ❌ Bad
const styles = StyleSheet.create({ color: '#FF5733' });

// ✅ Good
import { colors } from '@/src/theme/colors';
const styles = StyleSheet.create({ color: colors.error });
```

### 6. Direct AsyncStorage Access

**Problem**: Using `AsyncStorage` directly instead of wrapper

**Solution**: Use provided storage service for abstraction and error handling:
```typescript
import { storage } from '@/src/services/storage';
await storage.saveWound(wound);
```

### 7. Missing Error Handling in API Calls

**Problem**: API requests fail silently

**Solution**: Wrap API calls in try/catch and provide user feedback:
```typescript
try {
  const result = await api.classifyWound(image);
} catch (error) {
  console.error('Classification failed:', error);
  // Show error to user
}
```

## Getting Help

If you encounter issues:

1. Check this contributing guide first
2. Review existing code in similar components
3. Check the project documentation in `/docs`
4. Ask in team discussions or create an issue

## License

By contributing to WoundDoc, you agree that your contributions will be licensed under the same license as the project.

Happy coding! 🎉
