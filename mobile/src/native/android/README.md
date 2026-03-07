# Network Scanner Native Module

This directory contains the Android native implementation for network scanning functionality.

## Structure

```
android/
├── src/main/
│   ├── java/com/camdetect/app/
│   │   ├── NetworkScannerModule.java      # Main React Native module
│   │   ├── NetworkScannerPackage.java     # Package registration
│   │   ├── ArpScanner.java                # ARP table reader
│   │   ├── PortScanner.java               # TCP port scanner
│   │   └── NetworkUtils.java              # Network utilities
│   └── AndroidManifest.xml                # Permissions
└── build.gradle                           # Build configuration
```

## Features

### 1. Network Information (`getNetworkInfo()`)
- SSID (network name)
- BSSID (MAC address of router)
- Device IP address
- Gateway IP
- Subnet mask
- Signal strength (RSSI)

### 2. ARP Table Scanning (`getArpTable()`)
- Reads `/proc/net/arp` to discover connected devices
- Returns MAC address, IP address, and hostname
- Filters out incomplete entries

### 3. Port Scanning (`scanPorts()`)
- TCP connect scan for specified ports
- Concurrent scanning with thread pool
- 2-second timeout per port
- Identifies common services (HTTP, RTSP, SSH, etc.)

### 4. ICMP Ping (`ping()`)
- Uses Java InetAddress.isReachable()
- 3-second timeout
- Returns success/failure status

## Permissions Required

- `ACCESS_WIFI_STATE` - Read WiFi information
- `ACCESS_NETWORK_STATE` - Network status
- `CHANGE_WIFI_STATE` - Modify WiFi state
- `ACCESS_FINE_LOCATION` - Required for SSID/BSSID on Android 8+
- `ACCESS_COARSE_LOCATION` - Approximate location
- `INTERNET` - For port scanning

## Android Version Compatibility

- **Android 6-7 (API 23-25)**: Full functionality
- **Android 8-9 (API 26-28)**: Requires location permission for SSID/BSSID
- **Android 10+ (API 29+)**: Some restrictions on network info
- **Android 13+ (API 33+)**: Additional MAC address restrictions

## Usage in React Native

```typescript
import { NativeModules } from 'react-native';

const { NetworkScanner } = NativeModules;

// Get network information
const networkInfo = await NetworkScanner.getNetworkInfo();

// Get connected devices
const devices = await NetworkScanner.getArpTable();

// Scan ports
const openPorts = await NetworkScanner.scanPorts('192.168.1.1', [80, 443, 554]);

// Ping a device
const result = await NetworkScanner.ping('192.168.1.1');
```

## Building

The native module is automatically integrated during the Expo prebuild process:

```bash
cd mobile
npx expo prebuild --clean --platform android
```

The GitHub Actions workflow will copy these files to the generated Android project before building.

## Troubleshooting

### Module not found
- Ensure files are copied to `mobile/android/app/src/main/java/com/camdetect/app/`
- Check that `NetworkScannerPackage` is registered in `MainApplication.java`

### Permission denied
- Check AndroidManifest.xml includes all required permissions
- Request runtime permissions for location on Android 6+

### Empty ARP table
- Some Android versions restrict `/proc/net/arp` access
- Fallback to ping sweep is implemented in JavaScript

### Port scanning timeout
- Default timeout is 2 seconds per port
- Adjust `TIMEOUT_MS` in `PortScanner.java` if needed
- Consider scanning fewer ports for better performance

## Security Considerations

- Network scanning may trigger security alerts on IDS/IPS systems
- Some networks may block or rate-limit port scanning
- Always respect network policies and terms of service
- Use responsibly and only on networks you own or have permission to test
