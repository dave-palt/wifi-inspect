package com.camdetect.app;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.net.wifi.WifiInfo;
import android.net.wifi.WifiManager;
import android.net.ConnectivityManager;
import android.net.NetworkCapabilities;
import android.net.Network;
import android.os.Build;
import android.util.Log;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;

import java.net.InetAddress;
import java.net.NetworkInterface;
import java.util.ArrayList;
import java.util.List;

public class NetworkScannerModule extends ReactContextBaseJavaModule {
    private static final String TAG = "NetworkScannerModule";
    private final ReactApplicationContext reactContext;
    private final WifiManager wifiManager;
    private final ConnectivityManager connectivityManager;
    private final ArpScanner arpScanner;
    private final PortScanner portScanner;

    public NetworkScannerModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        this.wifiManager = (WifiManager) reactContext.getApplicationContext().getSystemService(Context.WIFI_SERVICE);
        this.connectivityManager = (ConnectivityManager) reactContext.getSystemService(Context.CONNECTIVITY_SERVICE);
        this.arpScanner = new ArpScanner();
        this.portScanner = new PortScanner();
        Log.d(TAG, "NetworkScannerModule initialized");
    }

    @Override
    public String getName() {
        return "NetworkScanner";
    }

    private boolean hasLocationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            int result = reactContext.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION);
            boolean hasPermission = result == PackageManager.PERMISSION_GRANTED;
            Log.d(TAG, "Location permission check: " + (hasPermission ? "GRANTED" : "DENIED"));
            return hasPermission;
        }
        return true;
    }

    private boolean isWifiConnectedViaConnectivityManager() {
        try {
            Network activeNetwork = connectivityManager.getActiveNetwork();
            if (activeNetwork == null) {
                Log.d(TAG, "No active network");
                return false;
            }
            
            NetworkCapabilities caps = connectivityManager.getNetworkCapabilities(activeNetwork);
            if (caps == null) {
                Log.d(TAG, "No network capabilities");
                return false;
            }
            
            boolean isWifi = caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI);
            boolean isCellular = caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR);
            boolean isVpn = caps.hasTransport(NetworkCapabilities.TRANSPORT_VPN);
            
            Log.d(TAG, "Network type - WiFi: " + isWifi + ", Cellular: " + isCellular + ", VPN: " + isVpn);
            
            return isWifi;
        } catch (Exception e) {
            Log.e(TAG, "Error checking WiFi via ConnectivityManager: " + e.getMessage());
            return false;
        }
    }

    private boolean isWifiEnabledViaWifiManager() {
        try {
            boolean isEnabled = wifiManager.isWifiEnabled();
            Log.d(TAG, "WiFi enabled (WifiManager): " + isEnabled);
            return isEnabled;
        } catch (Exception e) {
            Log.e(TAG, "Error checking WiFi enabled: " + e.getMessage());
            return false;
        }
    }

    @ReactMethod
    public void getNetworkInfo(Promise promise) {
        Log.d(TAG, "getNetworkInfo called");
        
        try {
            if (!hasLocationPermission()) {
                Log.e(TAG, "Location permission not granted");
                WritableMap error = Arguments.createMap();
                error.putString("error", "PERMISSION_DENIED");
                error.putString("message", "Location permission is required");
                promise.resolve(error);
                return;
            }

            boolean wifiConnected = isWifiConnectedViaConnectivityManager();
            boolean wifiEnabled = isWifiEnabledViaWifiManager();
            
            Log.d(TAG, "WiFi status - Connected: " + wifiConnected + ", Enabled: " + wifiEnabled);
            
            if (!wifiConnected) {
                Log.d(TAG, "Not connected to WiFi");
                WritableMap error = Arguments.createMap();
                error.putString("error", "NOT_CONNECTED");
                error.putString("message", "Not connected to WiFi network");
                error.putBoolean("wifiEnabled", wifiEnabled);
                promise.resolve(error);
                return;
            }
            
            WritableMap networkInfo = Arguments.createMap();
            
            WifiInfo wifiInfo = null;
            try {
                wifiInfo = wifiManager.getConnectionInfo();
                Log.d(TAG, "Got WifiInfo: " + (wifiInfo != null ? "yes" : "no"));
            } catch (Exception e) {
                Log.e(TAG, "Error getting WifiInfo: " + e.getMessage());
            }
            
            String ssid = null;
            String bssid = null;
            int rssi = -100;
            
            if (wifiInfo != null) {
                try {
                    ssid = wifiInfo.getSSID();
                    bssid = wifiInfo.getBSSID();
                    rssi = wifiInfo.getRssi();
                    
                    Log.d(TAG, "Raw SSID: " + ssid + ", BSSID: " + bssid + ", RSSI: " + rssi);
                    
                    if (ssid != null && ssid.startsWith("\"") && ssid.endsWith("\"")) {
                        ssid = ssid.substring(1, ssid.length() - 1);
                    }
                    
                    if (ssid == null || ssid.equals("<unknown ssid>") || ssid.isEmpty()) {
                        Log.d(TAG, "SSSID unknown or empty, using fallback");
                        ssid = "Connected WiFi";
                    }
                } catch (Exception e) {
                    Log.e(TAG, "Error processing WifiInfo: " + e.getMessage());
                    ssid = "Connected WiFi";
                }
            }
            
            String deviceIp = NetworkUtils.getDeviceIpAddress();
            int gateway = NetworkUtils.getGatewayAddress(reactContext);
            int subnet = NetworkUtils.getSubnetMask(reactContext);
            
            Log.d(TAG, "Device IP: " + deviceIp + ", Gateway: " + gateway + ", Subnet: " + subnet);
            
            if (deviceIp == null || deviceIp.equals("0.0.0.0") || deviceIp.isEmpty()) {
                Log.e(TAG, "Invalid device IP: " + deviceIp);
                WritableMap error = Arguments.createMap();
                error.putString("error", "NO_IP");
                error.putString("message", "Could not get device IP address");
                promise.resolve(error);
                return;
            }
            
            networkInfo.putString("ssid", ssid != null ? ssid : "Connected WiFi");
            networkInfo.putString("bssid", bssid != null ? bssid : "");
            networkInfo.putString("ip", deviceIp);
            networkInfo.putString("deviceIp", deviceIp);
            networkInfo.putInt("gateway", gateway);
            networkInfo.putInt("subnet", subnet);
            networkInfo.putInt("rssi", rssi);
            networkInfo.putBoolean("success", true);
            
            Log.d(TAG, "Returning network info: SSID=" + ssid + ", IP=" + deviceIp);
            promise.resolve(networkInfo);
        } catch (Exception e) {
            Log.e(TAG, "Exception in getNetworkInfo: " + e.getMessage());
            e.printStackTrace();
            WritableMap error = Arguments.createMap();
            error.putString("error", "EXCEPTION");
            error.putString("message", e.getMessage());
            promise.resolve(error);
        }
    }

    @ReactMethod
    public void getArpTable(Promise promise) {
        Log.d(TAG, "getArpTable called");
        try {
            List<ArpScanner.ArpEntry> arpEntries = arpScanner.getArpTable();
            WritableArray devices = Arguments.createArray();
            
            Log.d(TAG, "Found " + arpEntries.size() + " ARP entries");
            
            for (ArpScanner.ArpEntry entry : arpEntries) {
                WritableMap device = Arguments.createMap();
                device.putString("mac", entry.macAddress);
                device.putString("ip", entry.ipAddress);
                device.putString("hostname", entry.hostname);
                devices.pushMap(device);
            }
            
            promise.resolve(devices);
        } catch (Exception e) {
            Log.e(TAG, "Error in getArpTable: " + e.getMessage());
            promise.reject("ARP_TABLE_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void scanPorts(String ipAddress, com.facebook.react.bridge.ReadableArray ports, Promise promise) {
        Log.d(TAG, "scanPorts called for " + ipAddress);
        try {
            List<Integer> portList = new ArrayList<>();
            for (int i = 0; i < ports.size(); i++) {
                portList.add(ports.getInt(i));
            }
            
            List<PortScanner.PortInfo> openPorts = portScanner.scanPorts(ipAddress, portList);
            WritableArray portsArray = Arguments.createArray();
            
            for (PortScanner.PortInfo portInfo : openPorts) {
                WritableMap port = Arguments.createMap();
                port.putInt("number", portInfo.number);
                port.putString("protocol", portInfo.protocol);
                port.putString("state", portInfo.state);
                port.putString("service", portInfo.service);
                portsArray.pushMap(port);
            }
            
            promise.resolve(portsArray);
        } catch (Exception e) {
            Log.e(TAG, "Error in scanPorts: " + e.getMessage());
            promise.reject("PORT_SCAN_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void ping(String ipAddress, Promise promise) {
        try {
            boolean success = NetworkUtils.pingHost(ipAddress, 3000);
            WritableMap result = Arguments.createMap();
            result.putBoolean("success", success);
            promise.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Error in ping: " + e.getMessage());
            promise.reject("PING_ERROR", e.getMessage());
        }
    }
}
