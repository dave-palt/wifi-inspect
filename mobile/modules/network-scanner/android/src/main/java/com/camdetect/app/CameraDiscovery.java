package com.camdetect.app;

import android.util.Log;

import java.net.HttpURLConnection;
import java.net.URL;
import java.util.List;

public class CameraDiscovery {
    private static final String TAG = "CameraDiscovery";
    
    private static final String[] SNAPSHOT_PATHS = {
        "/snapshot.jpg",
        "/image.jpg",
        "/jpg/image.jpg",
        "/cgi-bin/snapshot.cgi",
        "/cgi-bin/api.cgi?cmd=Snap",
        "/Streaming/Channels/1/picture",
        "/ISAPI/Streaming/Channels/1/picture",
        "/snap.jpg",
        "/capture"
    };
    
    private static final int[] HTTP_PORTS = {80, 443, 8000, 8080, 8443, 9000};
    private static final int TIMEOUT_MS = 1000;
    private static final int MAX_TOTAL_TIME_MS = 5000;
    
    public static class CameraEndpoints {
        public String snapshotUrl;
        public boolean requiresAuth;
    }
    
    public static CameraEndpoints discover(String ip, List<PortScanner.PortInfo> openPorts) {
        long startTime = System.currentTimeMillis();
        CameraEndpoints result = new CameraEndpoints();
        
        for (int port : HTTP_PORTS) {
            if (System.currentTimeMillis() - startTime > MAX_TOTAL_TIME_MS) break;
            if (!hasPort(openPorts, port)) continue;
            
            String protocol = (port == 443 || port == 8443) ? "https" : "http";
            String baseUrl = protocol + "://" + ip + ":" + port;
            
            for (String path : SNAPSHOT_PATHS) {
                if (System.currentTimeMillis() - startTime > MAX_TOTAL_TIME_MS) break;
                
                String url = baseUrl + path;
                int status = probeUrl(url);
                
                if (status == 200) {
                    result.snapshotUrl = url;
                    result.requiresAuth = false;
                    Log.d(TAG, "Found snapshot URL: " + url);
                    return result;
                } else if (status == 401) {
                    result.snapshotUrl = url;
                    result.requiresAuth = true;
                    Log.d(TAG, "Found snapshot URL (requires auth): " + url);
                    return result;
                }
            }
        }
        
        return result;
    }
    
    private static boolean hasPort(List<PortScanner.PortInfo> ports, int portNumber) {
        if (ports == null) return false;
        for (PortScanner.PortInfo p : ports) {
            if (p.number == portNumber) return true;
        }
        return false;
    }
    
    private static int probeUrl(String urlStr) {
        HttpURLConnection conn = null;
        try {
            URL url = new URL(urlStr);
            conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("HEAD");
            conn.setConnectTimeout(TIMEOUT_MS);
            conn.setReadTimeout(TIMEOUT_MS);
            conn.setInstanceFollowRedirects(false);
            return conn.getResponseCode();
        } catch (Exception e) {
            return 0;
        } finally {
            if (conn != null) {
                conn.disconnect();
            }
        }
    }
}
