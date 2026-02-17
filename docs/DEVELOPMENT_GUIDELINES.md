# MotivAid - Development Guidelines

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI (`npx expo`)
- Supabase CLI (`npx supabase`)
- Android Studio (for Android emulator) or a physical device with Expo Go

### Setup

```bash
# Install dependencies
npm install

# Start local Supabase
supabase start

# Start Expo dev server
npx expo start
```

### Environment Variables

Create a `.env` file at the project root:

```
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-local-anon-key>
```

The `EXPO_PUBLIC_` prefix is required for Expo to embed variables at build time.

---

## Commands

| Task | Command |
|------|---------|
| Start dev server | `npx expo start` |
| Run on Android | `npx expo start --android` |
| Run on iOS | `npx expo start --ios` |
| Run on Web | `npx expo start --web` |
| Lint | `npm run lint` |
| Start local Supabase | `supabase start` |
| Stop local Supabase | `supabase stop` |
| Create migration | `supabase migration new <name>` |
| Apply migrations | `supabase migration up` |
| Reset database | `supabase db reset` |

---

## Code Conventions

### TypeScript

- **Strict mode** is enabled in `tsconfig.json`
- Use TypeScript for all files — no plain JavaScript
- Define explicit types for context values, props, and API responses
- Use the `@/*` path alias to import from the project root:
  ```typescript
  import { useAuth } from '@/context/auth';
  import { ThemedText } from '@/components/themed-text';
  ```

### File Naming

- Use **kebab-case** for all file names: `themed-text.tsx`, `use-color-scheme.ts`
- Use **PascalCase** for React component exports: `export default function ThemedText()`
- Use **camelCase** for hooks: `export const useAuth = ()`

### File Organization

| Directory | Contents |
|-----------|----------|
| `app/` | Route screens only — no business logic |
| `context/` | React Context providers and hooks |
| `lib/` | Platform services (database, auth, security) |
| `components/` | Reusable UI components |
| `hooks/` | Custom React hooks |
| `constants/` | Static configuration (colors, fonts) |

---

## Platform-Specific Code

Use file extension conventions for platform branching:

| Extension | When to use |
|-----------|-------------|
| `.native.ts` | Code that uses native-only APIs (SQLite, SecureStore, biometrics) |
| `.ts` | Default implementation (works on web, used when no `.native.ts` exists) |
| `.web.ts` | Web-specific overrides |
| `.ios.tsx` | iOS-specific component variants |

**Example:**
```
lib/db.native.ts    ← SQLite operations for iOS/Android
lib/db.ts           ← No-op stubs for web
```

Metro and Webpack automatically resolve the correct file based on the target platform. Import paths should never include the platform extension:

```typescript
// Correct — Metro resolves the right file
import { initDatabase } from '@/lib/db';

// Wrong — never include platform extensions
import { initDatabase } from '@/lib/db.native';
```

---

## State Management

### React Context Pattern

All state is managed via React Context. Follow this pattern when adding new providers:

1. Define the context type interface
2. Create the context with `createContext`
3. Create a provider component that wraps children
4. Create a consumer hook with error boundary
5. Add the provider to the hierarchy in `app/_layout.tsx`

```typescript
// 1. Type
type MyContextType = {
  value: string;
  setValue: (v: string) => void;
};

// 2. Context
const MyContext = createContext<MyContextType | undefined>(undefined);

// 3. Provider
export const MyProvider = ({ children }: { children: React.ReactNode }) => {
  const [value, setValue] = useState('');
  return (
    <MyContext.Provider value={{ value, setValue }}>
      {children}
    </MyContext.Provider>
  );
};

// 4. Hook
export const useMyContext = () => {
  const context = useContext(MyContext);
  if (!context) throw new Error('useMyContext must be used within a MyProvider');
  return context;
};
```

### Provider Nesting Order

When adding new providers, respect the dependency chain in `app/_layout.tsx`:

```
AppThemeProvider → ToastProvider → AuthProvider → UnitProvider → RootLayoutNav
```

If your provider depends on `useAuth()`, it must be nested inside `AuthProvider`.

---

## Styling

### Theme Colors

Always use themed colors from the `useThemeColor` hook or the `Colors` constant:

```typescript
import { useThemeColor } from '@/hooks/use-theme-color';
import { Colors } from '@/constants/theme';

// In a component:
const tint = useThemeColor({}, 'tint');
const cardBg = useThemeColor({}, 'card');
```

### Themed Components

Use `ThemedText` and `ThemedView` instead of raw `Text` and `View` for automatic theme support:

```typescript
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
```

### Platform-Specific Shadows

Use `Platform.select()` for cross-platform shadow styles:

```typescript
...Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  android: { elevation: 6 },
  web: { boxShadow: '0px 8px 16px rgba(0,0,0,0.1)' },
})
```

### Design Tokens

| Token | Value | Usage |
|-------|-------|-------|
| Border radius (cards) | `20` | Cards, modals |
| Border radius (inputs) | `16` | Text inputs, buttons |
| Border radius (badges) | `4-12` | Small status badges |
| Input height | `56` | All text inputs and primary buttons |
| Tint color | `#00D2FF` | Primary accent, buttons, active states |
| Error color | `#FF4444` / `#FF3D00` | Validation errors, destructive actions |
| Success color | `#4CAF50` | Confirmations, verified states |

---

## Supabase Patterns

### Querying with Joins

Use Supabase's PostgREST select syntax for relational queries:

```typescript
const { data, error } = await supabase
  .from('unit_memberships')
  .select(`
    id,
    status,
    unit_id,
    profiles(full_name, avatar_url, role),
    units(name)
  `)
  .eq('status', 'pending');
```

### Handling Network State

Always check network connectivity before making Supabase calls that might fail offline:

```typescript
import NetInfo from '@react-native-community/netinfo';

const netState = await NetInfo.fetch();
if (netState.isConnected) {
  // Online path — call Supabase
} else {
  // Offline path — use cached data
}
```

### Database Migrations

- Migrations live in `supabase/migrations/`
- File naming: `YYYYMMDDHHMMSS_description.sql`
- Build incrementally — create new migration files for each sprint
- Always enable RLS on new tables
- Always add appropriate policies

---

## Haptic Feedback

Use `expo-haptics` for tactile feedback on user actions:

```typescript
import * as Haptics from 'expo-haptics';

// Success (login, approve, save)
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

// Error (validation failure, rejected action)
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

// Light tap (toggle, selection change)
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

// Medium tap (major toggle, mode switch)
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
```

---

## Toast Notifications

Use the `useToast` hook for user-facing feedback:

```typescript
const { showToast } = useToast();

showToast('Profile updated!', 'success');
showToast('Network error', 'error');
showToast('Theme set to Dark', 'info');
```

Types: `'success'` (green), `'error'` (red), `'info'` (tint color).

---

## Navigation

### Adding New Screens

1. Create a `.tsx` file in the appropriate route group under `app/`
2. For authenticated screens, place in `app/(app)/`
3. For tab screens, place in `app/(app)/(tabs)/`
4. Use `Stack.Screen` options for header configuration:
   ```typescript
   <Stack.Screen options={{
     title: 'Screen Title',
     headerShown: true,
     headerTransparent: true,
     headerTintColor: textColor,
   }} />
   ```

### Navigation Actions

```typescript
import { router } from 'expo-router';

router.push('/(app)/profile');      // Push onto stack
router.replace('/(app)/(tabs)');    // Replace current screen
router.back();                       // Go back
```

---

## Avatar Handling

Avatars are stored in the `avatars` Supabase Storage bucket. The `profile.avatar_url` column stores the file path (not a full URL). To display an avatar:

```typescript
const { data } = await supabase.storage.from('avatars').download(profile.avatar_url);
// Convert blob to data URI for Image component
```

The `Avatar` component in `components/avatar.tsx` handles upload and display.

---

## Error Handling

- Use `try/catch` blocks for all async operations
- Show user-facing errors via `showToast('message', 'error')` or `Alert.alert()`
- Use haptic error feedback for form validation failures
- Log errors to console in development; avoid exposing internal details to users

---

## Git Workflow

- Main branch: `main`
- Feature branches: `feat/<description>`
- Bug fix branches: `fix/<description>`
- Commit messages: conventional commits (`feat:`, `fix:`, `chore:`, `docs:`)
- No test framework is currently configured
