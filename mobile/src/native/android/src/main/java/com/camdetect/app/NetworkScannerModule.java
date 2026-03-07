package com.camdetect.app;

import android.content.Context;
import android.net.wifi.WifiInfo;
import android.net.wifi.WifiManager;
import android.net.ConnectivityManager;
import android.net.NetworkCapabilities;
import android.net.Network;
import android.os.Build;

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
    }

    @Override
    public String getName() {
        return "NetworkScanner";
    }

    @ReactMethod
    public void getNetworkInfo(Promise promise) {
        try {
            WritableMap networkInfo = Arguments.createMap();
            
            WifiInfo wifiInfo = wifiManager.getConnectionInfo();
            
            String ssid = null;
            String bssid = null;
            int rssi = -100;
            
            if (wifiInfo != null) {
                ssid = wifiInfo.getSSID();
                bssid = wifiInfo.getBSSID();
                rssi = wifiInfo.getRssi();
                
                if (ssid != null && ssid.startsWith("\"") && ssid.endsWith("\"")) {
                    ssid = ssid.substring(1, ssid.length() - 1);
                }
            }
            
            String deviceIp = NetworkUtils.getDeviceIpAddress();
            int gateway = NetworkUtils.getGatewayAddress(reactContext);
            int subnet = NetworkUtils.getSubnetMask(reactContext);
            
            networkInfo.putString("ssid", ssid != null ? ssid : "Unknown Network");
            networkInfo.putString("bssid", bssid != null ? bssid : "");
            networkInfo.putString("ip", deviceIp != null ? deviceIp : "0.0.0.0");
            networkInfo.putString("deviceIp", deviceIp != null ? deviceIp : "0.0.0.0");
            networkInfo.putInt("gateway", gateway);
            networkInfo.putInt("subnet", subnet);
            networkInfo.putInt("rssi", rssi);
            
            promise.resolve(networkInfo);
        } catch (Exception e) {
            promise.reject("NETWORK_INFO_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void getArpTable(Promise promise) {
        try {
            List<ArpScanner.ArpEntry> arpEntries = arpScanner.getArpTable();
            WritableArray devices = Arguments.createArray();
            
            for (ArpScanner.ArpEntry entry : arpEntries) {
                WritableMap device = Arguments.createMap();
                device.putString("mac", entry.macAddress);
                device.putString("ip", entry.ipAddress);
                device.putString("hostname", entry.hostname);
                devices.pushMap(device);
            }
            
            promise.resolve(devices);
        } catch (Exception e) {
            promise.reject("ARP_TABLE_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void scanPorts(String ipAddress, com.facebook.react.bridge.ReadableArray ports, Promise promise) {
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
            promise.reject("PING_ERROR", e.getMessage());
        }
    }
}
