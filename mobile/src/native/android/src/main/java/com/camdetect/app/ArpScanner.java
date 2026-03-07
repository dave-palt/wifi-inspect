package com.camdetect.app;

import android.util.Log;

import java.io.BufferedReader;
import java.io.FileReader;
import java.util.ArrayList;
import java.util.List;

public class ArpScanner {
    private static final String TAG = "ArpScanner";
    
    public static class ArpEntry {
        public String ipAddress;
        public String macAddress;
        public String hostname;
        
        public ArpEntry(String ipAddress, String macAddress, String hostname) {
            this.ipAddress = ipAddress;
            this.macAddress = macAddress;
            this.hostname = hostname;
        }
    }
    
    public List<ArpEntry> getArpTable() {
        List<ArpEntry> entries = new ArrayList<>();
        
        try {
            BufferedReader reader = new BufferedReader(new FileReader("/proc/net/arp"));
            String line;
            
            reader.readLine();
            
            while ((line = reader.readLine()) != null) {
                String[] parts = line.trim().split("\\s+");
                
                if (parts.length >= 4) {
                    String ipAddress = parts[0];
                    String hwType = parts[1];
                    String flags = parts[2];
                    String macAddress = parts[3];
                    
                    if (!macAddress.equals("00:00:00:00:00:00") && 
                        !macAddress.equals("00-00-00-00-00-00") &&
                        !macAddress.isEmpty() &&
                        flags.contains("2")) {
                        
                        String hostname = parts.length >= 6 ? parts[5] : "";
                        
                        entries.add(new ArpEntry(ipAddress, macAddress, hostname));
                    }
                }
            }
            
            reader.close();
        } catch (Exception e) {
            Log.e(TAG, "Failed to read ARP table: " + e.getMessage());
        }
        
        return entries;
    }
}
