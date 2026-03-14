package com.camdetect.app;

import android.util.Log;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class RootScanner {
    private static final String TAG = "RootScanner";
    
    public static class ArpScanResult {
        public String ipAddress;
        public String macAddress;
        
        public ArpScanResult(String ipAddress, String macAddress) {
            this.ipAddress = ipAddress;
            this.macAddress = macAddress;
        }
    }
    
    public static class PortScanResult {
        public int portNumber;
        public String state;
        public String service;
        
        public PortScanResult(int portNumber, String state, String service) {
            this.portNumber = portNumber;
            this.state = state;
            this.service = service;
        }
    }
    
    public static List<ArpScanResult> arpBroadcastScan(String subnet) {
        List<ArpScanResult> results = new ArrayList<>();
        
        if (!RootUtils.hasRootPermission()) {
            Log.e(TAG, "Root permission not available for ARP scan");
            return results;
        }
        
        Log.d(TAG, "Starting ARP broadcast scan for subnet: " + subnet);
        
        String output = RootUtils.executeAsRoot("arping -c 1 -I wlan0 -g " + subnet + ".0 2>/dev/null || echo 'arping not available'");
        
        if (output == null || output.contains("arping not available") || output.isEmpty()) {
            Log.d(TAG, "arping not available, trying alternative method");
            return pingAndArpScan(subnet);
        }
        
        return results;
    }
    
    public static List<ArpScanResult> pingAndArpScan(String subnet) {
        List<ArpScanResult> results = new ArrayList<>();
        
        if (!RootUtils.hasRootPermission()) {
            Log.e(TAG, "Root permission not available");
            return results;
        }
        
        Log.d(TAG, "Starting ping + ARP scan for subnet: " + subnet);
        
        Thread[] threads = new Thread[255];
        
        for (int i = 1; i <= 254; i++) {
            final int host = i;
            threads[i] = new Thread(() -> {
                String ip = subnet + "." + host;
                RootUtils.executeAsRoot("ping -c 1 -W 1 " + ip + " > /dev/null 2>&1 &");
            });
            threads[i].start();
        }
        
        try {
            Thread.sleep(3000);
        } catch (InterruptedException e) {
            Log.e(TAG, "Interrupted during ping sweep", e);
        }
        
        String arpOutput = RootUtils.executeAsRoot("cat /proc/net/arp");
        if (arpOutput != null) {
            results.addAll(parseArpTable(arpOutput));
        }
        
        Log.d(TAG, "ARP scan found " + results.size() + " devices");
        return results;
    }
    
    private static List<ArpScanResult> parseArpTable(String arpOutput) {
        List<ArpScanResult> results = new ArrayList<>();
        String[] lines = arpOutput.split("\n");
        
        for (int i = 1; i < lines.length; i++) {
            String line = lines[i].trim();
            if (line.isEmpty()) continue;
            
            String[] parts = line.split("\\s+");
            if (parts.length >= 4) {
                String ipAddress = parts[0];
                String macAddress = parts[3];
                String flags = parts[2];
                
                if (!macAddress.equals("00:00:00:00:00:00") &&
                    !macAddress.equals("00-00-00-00-00-00") &&
                    !macAddress.isEmpty() &&
                    flags.contains("2")) {
                    results.add(new ArpScanResult(ipAddress, macAddress));
                }
            }
        }
        
        return results;
    }
    
    public static List<PortScanResult> synPortScan(String ipAddress, int[] ports) {
        List<PortScanResult> openPorts = new ArrayList<>();
        
        if (!RootUtils.hasRootPermission()) {
            Log.e(TAG, "Root permission not available for SYN scan");
            return openPorts;
        }
        
        Log.d(TAG, "Starting SYN port scan for " + ipAddress);
        
        StringBuilder portList = new StringBuilder();
        for (int i = 0; i < ports.length; i++) {
            if (i > 0) portList.append(",");
            portList.append(ports[i]);
        }
        
        String output = RootUtils.executeAsRoot(
            "timeout 30 sh -c 'for port in " + portList.toString().replace(",", " ") + "; do " +
            "(echo > /dev/tcp/" + ipAddress + "/$port) 2>/dev/null && echo $port; done'"
        );
        
        if (output != null && !output.isEmpty()) {
            String[] openPortStrings = output.split("\n");
            for (String portStr : openPortStrings) {
                try {
                    int port = Integer.parseInt(portStr.trim());
                    openPorts.add(new PortScanResult(port, "open", guessService(port)));
                } catch (NumberFormatException e) {
                    // Ignore invalid output
                }
            }
        }
        
        Log.d(TAG, "SYN scan found " + openPorts.size() + " open ports");
        return openPorts;
    }
    
    private static String guessService(int port) {
        switch (port) {
            case 21: return "ftp";
            case 22: return "ssh";
            case 23: return "telnet";
            case 25: return "smtp";
            case 53: return "dns";
            case 80: return "http";
            case 110: return "pop3";
            case 123: return "ntp";
            case 143: return "imap";
            case 161: return "snmp";
            case 443: return "https";
            case 445: return "smb";
            case 514: return "syslog";
            case 554: return "rtsp";
            case 993: return "imaps";
            case 995: return "pop3s";
            case 1433: return "mssql";
            case 1521: return "oracle";
            case 1883: return "mqtt";
            case 1900: return "ssdp";
            case 3306: return "mysql";
            case 3389: return "rdp";
            case 5000: return "upnp";
            case 5353: return "mdns";
            case 5357: return "wsd";
            case 5432: return "postgresql";
            case 5800: return "vnc";
            case 5900: return "vnc";
            case 6000: return "x11";
            case 6667: return "irc";
            case 8000: return "http-alt";
            case 8001: return "http-alt";
            case 8002: return "http-alt";
            case 8080: return "http-proxy";
            case 8081: return "http-alt";
            case 8082: return "http-alt";
            case 8083: return "http-alt";
            case 8084: return "http-alt";
            case 8443: return "https-alt";
            case 8554: return "rtsp-alt";
            case 8800: return "http-alt";
            case 9000: return "http-alt";
            case 9001: return "http-alt";
            case 9008: return "http-alt";
            case 37777: return "dahua";
            case 37778: return "dahua-data";
            case 62078: return "lockdown";
            case 6789: return "http-alt";
            default: return "unknown";
        }
    }
}
