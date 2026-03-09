package com.camdetect.app;

import android.util.Log;

import java.net.InetSocketAddress;
import java.net.Socket;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

public class PortScanner {
    private static final String TAG = "PortScanner";
    private static final int TIMEOUT_MS = 2000;
    
    public static class PortInfo {
        public int number;
        public String protocol;
        public String state;
        public String service;
        
        public PortInfo(int number, String protocol, String state, String service) {
            this.number = number;
            this.protocol = protocol;
            this.state = state;
            this.service = service;
        }
    }
    
    private static final java.util.Map<Integer, String> COMMON_SERVICES = new java.util.HashMap<>();
    static {
        COMMON_SERVICES.put(21, "ftp");
        COMMON_SERVICES.put(22, "ssh");
        COMMON_SERVICES.put(23, "telnet");
        COMMON_SERVICES.put(25, "smtp");
        COMMON_SERVICES.put(53, "dns");
        COMMON_SERVICES.put(80, "http");
        COMMON_SERVICES.put(110, "pop3");
        COMMON_SERVICES.put(143, "imap");
        COMMON_SERVICES.put(443, "https");
        COMMON_SERVICES.put(445, "smb");
        COMMON_SERVICES.put(993, "imaps");
        COMMON_SERVICES.put(995, "pop3s");
        COMMON_SERVICES.put(1433, "mssql");
        COMMON_SERVICES.put(1521, "oracle");
        COMMON_SERVICES.put(3306, "mysql");
        COMMON_SERVICES.put(3389, "rdp");
        COMMON_SERVICES.put(5432, "postgresql");
        COMMON_SERVICES.put(5900, "vnc");
        COMMON_SERVICES.put(554, "rtsp");
        COMMON_SERVICES.put(8554, "rtsp-alt");
        COMMON_SERVICES.put(8080, "http-proxy");
        COMMON_SERVICES.put(8443, "https-alt");
        COMMON_SERVICES.put(5000, "upnp");
        COMMON_SERVICES.put(37777, "dahua");
        COMMON_SERVICES.put(37778, "dahua-data");
    }
    
    public List<PortInfo> scanPorts(String ipAddress, List<Integer> ports) {
        List<PortInfo> openPorts = new ArrayList<>();
        
        if (ports == null || ports.isEmpty()) {
            ports = new ArrayList<>(COMMON_SERVICES.keySet());
        }
        
        ExecutorService executor = Executors.newFixedThreadPool(10);
        List<Future<PortInfo>> futures = new ArrayList<>();
        
        for (int port : ports) {
            futures.add(executor.submit(new PortScanTask(ipAddress, port)));
        }
        
        executor.shutdown();
        
        try {
            if (!executor.awaitTermination(30, TimeUnit.SECONDS)) {
                executor.shutdownNow();
            }
        } catch (InterruptedException e) {
            executor.shutdownNow();
        }
        
        for (Future<PortInfo> future : futures) {
            try {
                PortInfo result = future.get();
                if (result != null) {
                    openPorts.add(result);
                }
            } catch (Exception e) {
                Log.e(TAG, "Error getting port scan result: " + e.getMessage());
            }
        }
        
        return openPorts;
    }
    
    private class PortScanTask implements Callable<PortInfo> {
        private final String ipAddress;
        private final int port;
        
        public PortScanTask(String ipAddress, int port) {
            this.ipAddress = ipAddress;
            this.port = port;
        }
        
        @Override
        public PortInfo call() {
            try {
                Socket socket = new Socket();
                socket.connect(new InetSocketAddress(ipAddress, port), TIMEOUT_MS);
                socket.close();
                
                String service = COMMON_SERVICES.getOrDefault(port, "unknown");
                return new PortInfo(port, "tcp", "open", service);
            } catch (Exception e) {
                return null;
            }
        }
    }
}
