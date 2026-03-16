package com.camdetect.app;

import android.util.Log;

import com.facebook.react.ReactApplication;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

public class BackgroundScanner {
    private static final String TAG = "BackgroundScanner";
    private static final long PROGRESS_THROTTLE_MS = 100;
    
    private final ReactApplicationContext reactContext;
    private final ArpScanner arpScanner;
    private final PortScanner portScanner;
    private final ExecutorService executor;
    private final AtomicBoolean isScanning;
    private final AtomicBoolean isCancelled;
    private volatile long lastProgressTime;
    
    private String gatewayIp;
    private String subnet;
    private String deviceIp;
    private List<Integer> portsToScan;
    
    public BackgroundScanner(ReactApplicationContext reactContext) {
        this.reactContext = reactContext;
        this.arpScanner = new ArpScanner();
        this.portScanner = new PortScanner();
        this.executor = Executors.newSingleThreadExecutor();
        this.isScanning = new AtomicBoolean(false);
        this.isCancelled = new AtomicBoolean(false);
        this.lastProgressTime = 0;
    }
    
    public boolean isScanning() {
        return isScanning.get();
    }
    
    public void startScan(List<Integer> ports, String gateway, String subnetStr, String deviceIpStr) {
        if (isScanning.get()) {
            Log.w(TAG, "Scan already in progress");
            return;
        }
        
        this.portsToScan = ports != null ? ports : getDefaultPorts();
        this.gatewayIp = gateway;
        this.subnet = subnetStr;
        this.deviceIp = deviceIpStr;
        
        isScanning.set(true);
        isCancelled.set(false);
        
        executor.submit(this::runScan);
    }
    
    public void cancel() {
        isCancelled.set(true);
    }
    
    private void runScan() {
        long startTime = System.currentTimeMillis();
        int deviceCount = 0;
        
        try {
            emitProgressThrottled(5, "Initializing scan...");
            
            if (isCancelled.get()) {
                emitComplete(0, true);
                return;
            }
            
            emitProgressThrottled(10, "Discovering devices...");
            Set<String> activeIps = pingSweep(subnet);
            
            if (isCancelled.get()) {
                emitComplete(0, true);
                return;
            }
            
            emitProgressThrottled(50, "Found " + activeIps.size() + " devices, getting details...");
            
            List<ArpScanner.ArpEntry> arpEntries = arpScanner.getArpTable();
            Log.d(TAG, "ARP table has " + arpEntries.size() + " entries");
            
            List<DeviceInfo> devices = new ArrayList<>();
            for (String ip : activeIps) {
                String mac = "unknown";
                String hostname = null;
                for (ArpScanner.ArpEntry entry : arpEntries) {
                    if (entry.ipAddress.equals(ip)) {
                        mac = entry.macAddress;
                        hostname = entry.hostname;
                        break;
                    }
                }
                devices.add(new DeviceInfo(ip, mac, hostname));
            }
            
            int total = devices.size();
            int processed = 0;
            
            for (DeviceInfo info : devices) {
                if (isCancelled.get()) {
                    emitComplete(deviceCount, true);
                    return;
                }
                
                List<PortScanner.PortInfo> openPorts = portScanner.scanPorts(info.ip, portsToScan);
                
                String vendor = VendorLookup.lookup(info.mac);
                String deviceType = DeviceClassifier.classify(vendor, info.hostname, openPorts);
                ThreatAnalyzer.ThreatResult threat = ThreatAnalyzer.analyze(deviceType, openPorts);
                
                boolean isGateway = info.ip.equals(gatewayIp);
                
                CameraDiscovery.CameraEndpoints endpoints = null;
                if ("camera".equals(deviceType) || hasRtspPort(openPorts)) {
                    endpoints = CameraDiscovery.discover(info.ip, openPorts);
                }
                
                emitDeviceFound(info, vendor, deviceType, openPorts, isGateway, threat, endpoints);
                deviceCount++;
                
                processed++;
                int progress = 55 + (processed * 40 / Math.max(total, 1));
                emitProgressThrottled(progress, "Scanning device " + processed + "/" + total);
            }
            
            if (!hasGateway(devices) && gatewayIp != null && !gatewayIp.isEmpty()) {
                if (!isCancelled.get()) {
                    List<PortScanner.PortInfo> gatewayPorts = portScanner.scanPorts(gatewayIp, portsToScan);
                    ThreatAnalyzer.ThreatResult threat = ThreatAnalyzer.analyze("router", gatewayPorts);
                    emitDeviceFound(
                        new DeviceInfo(gatewayIp, "unknown", null),
                        "Gateway/Router", "router", gatewayPorts, true, threat, null
                    );
                    deviceCount++;
                }
            }
            
            long duration = System.currentTimeMillis() - startTime;
            emitComplete(deviceCount, false);
            Log.d(TAG, "Scan complete: " + deviceCount + " devices in " + duration + "ms");
            
        } catch (Exception e) {
            Log.e(TAG, "Scan error: " + e.getMessage(), e);
            emitError("SCAN_ERROR", e.getMessage());
        } finally {
            isScanning.set(false);
        }
    }
    
    private Set<String> pingSweep(String subnet) {
        Set<String> discoveredIps = new HashSet<>();
        int range = 254;
        int batchSize = 20;
        int scanned = 0;
        
        for (int i = 1; i < range; i += batchSize) {
            if (isCancelled.get()) break;
            
            List<Thread> threads = new ArrayList<>();
            int batch = Math.min(batchSize, range - i);
            
            for (int j = 0; j < batch; j++) {
                final String ip = subnet + "." + (i + j);
                Thread t = new Thread(() -> {
                    if (NetworkUtils.pingHost(ip, 3000)) {
                        synchronized (discoveredIps) {
                            discoveredIps.add(ip);
                        }
                    }
                });
                threads.add(t);
                t.start();
            }
            
            for (Thread t : threads) {
                try {
                    t.join(5000);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            }
            
            scanned += batch;
            int progress = 15 + (scanned * 35 / range);
            emitProgressThrottled(progress, "Scanning " + subnet + ".x... " + scanned + "/" + (range - 1));
        }
        
        return discoveredIps;
    }
    
    private static class DeviceInfo {
        final String ip;
        final String mac;
        final String hostname;
        
        DeviceInfo(String ip, String mac, String hostname) {
            this.ip = ip;
            this.mac = mac;
            this.hostname = hostname;
        }
    }
    
    private boolean hasRtspPort(List<PortScanner.PortInfo> ports) {
        if (ports == null) return false;
        for (PortScanner.PortInfo p : ports) {
            if (p.number == 554 || p.number == 8554) return true;
        }
        return false;
    }
    
    private boolean hasGateway(List<DeviceInfo> devices) {
        for (DeviceInfo d : devices) {
            if (d.ip.equals(gatewayIp)) return true;
        }
        return false;
    }
    
    private List<Integer> getDefaultPorts() {
        return Arrays.asList(
            21, 22, 23, 25, 53, 80, 110, 123, 143, 161, 443, 445, 514, 993, 995,
            554, 8554, 37777, 37778,
            8000, 8001, 8002, 8080, 8081, 8082, 8083, 8084, 8443, 8800, 9000, 9001, 9008, 1024,
            1433, 1521, 1883, 3306, 3389, 5432, 5800, 5900, 6000, 62078, 6789, 6667,
            1900, 5000, 5353, 5357
        );
    }
    
    private void emitProgressThrottled(int progress, String message) {
        long now = System.currentTimeMillis();
        if (now - lastProgressTime >= PROGRESS_THROTTLE_MS || progress == 100 || progress == 5) {
            lastProgressTime = now;
            WritableMap params = Arguments.createMap();
            params.putInt("progress", progress);
            params.putString("message", message);
            sendEvent("ScanProgress", params);
        }
    }
    
    private void emitDeviceFound(DeviceInfo info, String vendor, String deviceType,
                                  List<PortScanner.PortInfo> openPorts, boolean isGateway,
                                  ThreatAnalyzer.ThreatResult threat,
                                  CameraDiscovery.CameraEndpoints endpoints) {
        WritableMap device = Arguments.createMap();
        device.putString("mac", info.mac);
        device.putString("ip", info.ip);
        device.putString("hostname", info.hostname);
        device.putString("vendor", vendor);
        device.putString("deviceType", deviceType);
        device.putBoolean("isGateway", isGateway);
        device.putInt("threatLevel", threat.threatLevel);
        
        WritableArray reasons = Arguments.createArray();
        for (String reason : threat.reasons) {
            reasons.pushString(reason);
        }
        device.putArray("threatReasons", reasons);
        
        WritableArray ports = Arguments.createArray();
        if (openPorts != null) {
            for (PortScanner.PortInfo p : openPorts) {
                WritableMap portMap = Arguments.createMap();
                portMap.putInt("number", p.number);
                portMap.putString("protocol", p.protocol);
                portMap.putString("state", p.state);
                portMap.putString("service", p.service);
                ports.pushMap(portMap);
            }
        }
        device.putArray("openPorts", ports);
        
        if (endpoints != null && endpoints.snapshotUrl != null) {
            device.putString("snapshotUrl", endpoints.snapshotUrl);
            device.putBoolean("requiresAuth", endpoints.requiresAuth);
        }
        
        sendEvent("DeviceFound", device);
    }
    
    private void emitComplete(int totalDevices, boolean cancelled) {
        WritableMap params = Arguments.createMap();
        params.putInt("totalDevices", totalDevices);
        params.putBoolean("cancelled", cancelled);
        sendEvent("ScanComplete", params);
    }
    
    private void emitError(String code, String message) {
        WritableMap params = Arguments.createMap();
        params.putString("code", code);
        params.putString("message", message);
        sendEvent("ScanError", params);
    }
    
    private void sendEvent(String eventName, WritableMap params) {
        try {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit(eventName, params);
        } catch (Exception e) {
            Log.e(TAG, "Error sending event: " + e.getMessage());
        }
    }
}
