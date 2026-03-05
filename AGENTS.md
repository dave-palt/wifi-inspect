# Developer Documentation

This file documents important information for developers working on this project.

## Project Overview

WiFi Inspector (CamDetect) is a cross-platform application for detecting IP cameras and suspicious devices on WiFi networks, primarily designed for travelers in hotels and Airbnbs.

## Tech Stack

- **Mobile**: React Native (Expo), TypeScript, NativeWind
- **Backend**: Bun.js, PostgreSQL
- **Architecture**: Monorepo with workspaces

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

## Resources

- [Expo Documentation](https://docs.expo.dev)
- [React Native](https://reactnative.dev)
- [Bun Documentation](https://bun.sh)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
