# Developer Documentation

This file documents important information for developers working on this project.

## Project Overview

WiFi Inspector (CamDetect) is a cross-platform application for detecting IP cameras and suspicious devices on WiFi networks, primarily designed for travelers in hotels and Airbnbs.

## Tech Stack

- **Mobile**: React Native (Expo), TypeScript, NativeWind
- **Backend**: Bun.js, PostgreSQL
- **Architecture**: Monorepo with workspaces

## Version Requirements

When adding new Expo packages, use versions compatible with **Expo SDK 51**:

| Package | Version |
|---------|---------|
| expo | ~51.0.0 |
| expo-file-system | ~17.0.0 |
| expo-haptics | ~14.0.0 |
| expo-router | ~3.5.0 |
| expo-constants | ~16.0.0 |
| expo-linking | ~6.3.0 |
| expo-location | ~17.0.0 |
| expo-secure-store | ~13.0.0 |
| expo-sharing | ~12.0.0 |
| expo-splash-screen | ~0.27.0 |
| expo-sqlite | ~14.0.0 |
| expo-status-bar | ~1.12.0 |
| expo-system-ui | ~3.0.0 |
| react-native | 0.74.5 |
| react-native-svg | 15.2.0 |

Check [Expo SDK 51 docs](https://docs.expo.dev/versions/v51.0.0/) for compatible versions.

## Running the Project

### Development

```bash
# Install dependencies
npm install

# Run both mobile and server
npm run dev

# Run individually
npm run dev:mobile  # http://localhost:8081
npm run dev:server  # http://localhost:3000
```

### Database Setup

```bash
# Create database (adjust connection string as needed)
psql -U postgres -c "CREATE DATABASE camdetect;"

# Run migrations
psql $DATABASE_URL -f server/src/db/schema.sql
```

## Code Style

### TypeScript

- Use TypeScript strict mode
- Prefer interfaces over types for object shapes
- Use explicit return types for functions
- Avoid `any`, use `unknown` when type is uncertain

### React Native

- Use functional components with hooks
- Follow Expo Router file-based routing conventions
- Use NativeWind for styling
- Keep components small and focused

### File Organization

```
mobile/src/
├── components/     # Reusable UI components
├── services/       # Business logic and API calls
├── hooks/          # Custom React hooks
├── stores/         # Zustand state stores
├── utils/          # Helper functions
├── types/          # TypeScript types
└── data/          # Static data (OUI database, port mappings)
```

## Key Components

### NetworkScanner (Android Native)

Located in `mobile/native/android/`, this module provides:
- ARP table reading for device discovery
- Raw socket port scanning
- Network interface enumeration

### ThreatAnalyzer

Located in `mobile/src/services/threatAnalyzer.ts`:
- Analyzes discovered devices for security risks
- Scores devices based on device type, open ports
- Generates threat reasons for UI display

### API Client

Located in `mobile/src/services/api.ts`:
- Handles anonymous authentication
- Rate limiting
- Network check and report endpoints

## Testing

```bash
# Run type checking
npm run typecheck

# Run linting (if configured)
npm run lint
```

## Building

### Android APK

```bash
cd mobile
npx expo prebuild --clean
cd android
./gradlew assembleRelease
```

### Server Docker

```bash
cd server
docker build -t camdetect-server .
docker run -p 3000:3000 -e DATABASE_URL=$DATABASE_URL camdetect-server
```

## Database Schema

Key tables:
- `devices`: Anonymous device tracking
- `networks`: WiFi network information
- `reports`: User-submitted camera detections
- `network_alerts`: Active alerts for networks

See `server/src/db/schema.sql` for full schema.

## API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/v1/auth/token` | POST | - | Get anonymous JWT |
| `/v1/networks/check` | GET | JWT | Check network for alerts |
| `/v1/networks/report` | POST | JWT | Submit detection report |
| `/v1/alerts/nearby` | GET | JWT | Get alerts near location |

## Adding New Features

1. **New Screen**: Add to `mobile/app/(tabs)/` or `mobile/app/`
2. **New Component**: Add to `mobile/src/components/`
3. **New Service**: Add to `mobile/src/services/`
4. **New API Endpoint**: Add to `server/src/routes/`

## Common Issues

### Android Emulator

If network scanning doesn't work in emulator:
- Use physical device for testing
- Emulators have limited network access

### Database Connection

If server fails to connect:
- Ensure PostgreSQL is running
- Check DATABASE_URL format
- Verify database exists

### Metro Bundler

If Metro won't start:
```bash
cd mobile
npx expo start --clear
```

## UI Design Guidelines

This project uses NativeWind v4 for styling. Follow these guidelines for ensure consistent UI across all screens.

### Color Palette

| Color | Usage | NativeWind Class |
|-------|-------|------------------|
| Background | Main app background | `bg-slate-950` |
| Surface | Cards, elevated surfaces | `bg-slate-800` |
| Border | Card borders, dividers | `border-slate-700/50` or `border-slate-800` |
| Primary Text | Main headings | `text-white` |
| Secondary Text | Subheadings, descriptions | `text-slate-400` |
| Tertiary Text | Captions, hints | `text-slate-500` |
| Primary Action | Buttons, links | `bg-blue-600` or `text-blue-500` |
| Danger | Threats, errors | `bg-red-500` or `text-red-400` |
| Warning | Caution states | `text-amber-500` or `bg-amber-500/20` |
| Success | Safe states | `text-emerald-500` or `bg-emerald-500/20` |

### Typography

| Element | Classes |
|---------|---------|
| Screen Title | `text-white text-2xl font-bold` |
| Screen Subtitle | `text-slate-400 text-sm mt-1` |
| Section Header | `text-slate-500 text-xs font-semibold uppercase tracking-wider px-5 mb-2 mt-6` |
| Card Title | `text-white font-semibold text-base` |
| Body Text | `text-slate-300 text-sm` |
| Caption | `text-slate-500 text-xs` |

### Spacing

| Element | Value |
|---------|-------|
| Screen padding | `px-5` or `p-5` |
| Card margin | `mx-5 mb-3` |
| Card internal padding | `p-4` |
| Section gap | `gap-3` or `gap-4` |
| Item gap in lists | `gap-4` |

### Components

#### Card
Use `Card` component for content containers:

```tsx
import { Card } from '../components/Card';

// Basic card
<Card>
  <View className="p-4">
    <Text>Content</Text>
  </View>
</Card>

// Danger variant for threats
<Card variant="danger">
  <View className="p-4">...</View>
</Card>
```

#### Badge
Use `Badge` for status indicators:

```tsx
import { Badge } from '../components/Badge';

<Badge variant="info">Gateway</Badge>
<Badge variant="danger">Camera</Badge>
<Badge variant="success">Safe</Badge>
<Badge variant="warning">Caution</Badge>
```

#### Button
Use `Button` component for actions:

```tsx
import { Button } from '../components/Button';

<Button variant="primary" onPress={handlePress} icon={<Icon />}>
  Action
</Button>

<Button variant="danger" fullWidth>
  Report
</Button>
```

### Screen Layout Pattern

Every list screen should follow this structure:

```tsx
export default function ScreenName() {
  return (
    <View className="flex-1 bg-slate-950">
      {/* Header */}
      <View className="px-5 py-4 border-b border-slate-800">
        <Text className="text-white text-2xl font-bold">Screen Title</Text>
        <Text className="text-slate-400 text-sm mt-1">
          Subtitle text
        </Text>
      </View>

      {/* Content */}
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingVertical: 16 }}
        ListEmptyComponent={<EmptyState />}
      />
    </View>
  );
}
```

### List Item Pattern

```tsx
const renderItem = ({ item }) => (
  <TouchableOpacity
    className="mx-5 mb-3 active:opacity-70"
    onPress={() => handlePress(item.id)}
  >
    <Card>
      <View className="p-4 flex-row items-center gap-4">
        <View className="w-12 h-12 rounded-xl bg-slate-700/50 items-center justify-center">
          <Icon size={24} color="#94a3b8" />
        </View>
        <View className="flex-1">
          <Text className="text-white font-semibold text-base">{item.title}</Text>
          <Text className="text-slate-400 text-sm">{item.subtitle}</Text>
        </View>
      </View>
    </Card>
  </TouchableOpacity>
);
```

### Empty State Pattern

```tsx
const EmptyState = () => (
  <View className="flex-1 items-center justify-center py-20 px-5">
    <View className="w-16 h-16 rounded-full bg-slate-800 items-center justify-center mb-4">
      <Icon size={32} color="#64748b" />
    </View>
    <Text className="text-white text-xl font-semibold mb-2">No Items Found</Text>
    <Text className="text-slate-400 text-center">
      Description of what to do next
    </Text>
  </View>
);
```

## Resources

- [Expo Documentation](https://docs.expo.dev)
- [React Native](https://reactnative.dev)
- [NativeWind v4](https://www.nativewind.dev)
- [Bun Documentation](https://bun.sh)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
