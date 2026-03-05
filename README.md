# WiFi Inspector - Security Camera Detector

A cross-platform mobile and desktop application for detecting IP cameras and suspicious devices on WiFi networks. Designed for travelers staying in hotels and Airbnbs who want to check for hidden surveillance devices.

## Features

### Core Features
- **Device Discovery**: Scan local network to find all connected devices
- **Port Scanning**: Identify open ports on each device
- **Camera Detection**: Detect IP cameras via RTSP, HTTP interfaces, and MAC vendor lookup
- **Threat Analysis**: Risk scoring based on device type, open ports, and known vulnerabilities
- **Crowdsourced Alerts**: Backend database of reported networks with camera detections

### Connection Actions
- **Open in Browser**: Launch HTTP/HTTPS interfaces
- **Open RTSP Stream**: View camera streams (in-app or external player)
- **Network Diagnostics**: Ping, traceroute, port details
- **Device Reporting**: Submit suspicious devices to the backend

### Supported Platforms
- **Android** (Primary): Full feature support including ARP scanning
- **iOS**: Limited features due to Apple restrictions
- **Desktop** (Future): Windows, macOS, Linux with enhanced scanning

## Tech Stack

| Layer | Technology |
|-------|------------|
| Mobile App | React Native (Expo), TypeScript |
| UI Framework | NativeWind (Tailwind CSS) |
| State Management | Zustand |
| Local Database | SQLite (expo-sqlite) |
| Backend | Bun.js, Express-compat API |
| Database | PostgreSQL |
| Native Modules | Android Java, iOS Swift |

## Project Structure

```
wifi-inspect/
├── mobile/           # React Native mobile app
│   ├── app/          # Expo Router screens
│   ├── src/         # Source code
│   ├── native/      # Android native modules
│   └── package.json
├── server/           # Bun.js backend API
│   ├── src/
│   │   ├── routes/  # API endpoints
│   │   ├── services/# Business logic
│   │   ├── middleware/
│   │   └── db/      # Database client
│   └── package.json
├── shared/           # Shared types and utilities
│   └── src/
└── README.md
```

## Getting Started

### Prerequisites

- **Bun** >= 1.0
- **PostgreSQL** (for backend)
- **Android SDK** (for building Android app)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/dave-palt/wifi-inspect.git
cd wifi-inspect
```

2. Install dependencies:
```bash
bun install
```

3. Set up environment variables:

Create `server/.env`:
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/camdetect
JWT_SECRET=your-secret-key
PORT=3000
```

4. Initialize the database:
```bash
# Run the SQL schema in your PostgreSQL database
psql $DATABASE_URL -f server/src/db/schema.sql
```

5. Start development servers:

```bash
# Start both mobile and backend
bun run dev

# Or start individually
bun run dev:mobile  # Expo on http://localhost:8081
bun run dev:server  # API on http://localhost:3000
```

### Building

#### Mobile App (Android)

```bash
cd mobile
bun run build:android  # Creates APK in android/app/build/outputs/apk/
```

#### Backend (Production)

```bash
cd server
bun run build
bun run start  # Production server
```

Or use Docker:

```bash
docker build -t camdetect-server -f server/Dockerfile .
docker run -p 3000:3000 --env-file server/.env camdetect-server
```

## Usage

### Mobile App

1. **Scan Network**: Open the app and tap "Scan" to discover devices
2. **Review Devices**: Check the device list for suspicious items
3. **Check Alerts**: See if the network has been reported previously
4. **Open Connections**: Tap on open ports to view camera streams or web interfaces
5. **Report Network**: Submit findings to help other users

### Backend API

The backend provides these endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v1/auth/token` | POST | Get anonymous auth token |
| `/v1/networks/check` | POST | Check network for alerts |
| `/v1/networks/report` | POST | Report camera detection |
| `/v1/alerts/nearby` | GET | Get alerts near location |

See `server/src/routes/` for full API documentation.

## Security & Privacy

- **No Account Required**: Anonymous device-based authentication
- **Local Processing**: Network scanning done on-device
- **Optional Location**: Location sharing is always optional
- **Rate Limiting**: API abuse prevention with per-device limits
- **App Attestation**: Optional verification to prevent fake reports

## Contributing

See [AGENTS.md](./AGENTS.md) for developer documentation.

## License

MIT License - see LICENSE file for details.
