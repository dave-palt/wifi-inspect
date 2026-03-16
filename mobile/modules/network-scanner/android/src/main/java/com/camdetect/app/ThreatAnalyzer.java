package com.camdetect.app;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public class ThreatAnalyzer {
    
    public static class ThreatResult {
        public final int threatLevel;
        public final List<String> reasons;
        
        public ThreatResult(int threatLevel, List<String> reasons) {
            this.threatLevel = threatLevel;
            this.reasons = reasons;
        }
    }
    
    private static final int[] CAMERA_PORTS = {554, 8554, 37777, 8000, 8080, 8443};
    
    public static ThreatResult analyze(String deviceType, List<PortScanner.PortInfo> ports) {
        List<String> reasons = new ArrayList<>();
        int score = 0;
        
        if ("camera".equals(deviceType)) {
            score += 3;
            reasons.add("Camera device detected on network");
        }
        
        if (ports != null) {
            boolean hasRtsp = false;
            boolean hasCameraWeb = false;
            boolean hasTelnet = false;
            
            for (PortScanner.PortInfo port : ports) {
                if (port.number == 554 || port.number == 8554) hasRtsp = true;
                if (Arrays.stream(CAMERA_PORTS).anyMatch(cp -> cp == port.number)) hasCameraWeb = true;
                if (port.number == 23) hasTelnet = true;
            }
            
            if (hasRtsp) {
                score += 2;
                reasons.add("RTSP stream accessible");
            }
            
            if (hasCameraWeb && !"camera".equals(deviceType)) {
                score += 1;
                reasons.add("Camera web interface exposed");
            }
            
            if (hasTelnet) {
                score += 1;
                reasons.add("Suspicious port detected");
            }
            
            if (ports.size() > 5) {
                score += 1;
                reasons.add("Multiple open ports detected");
            }
        }
        
        if ("unknown".equals(deviceType)) {
            score += 1;
            reasons.add("Unknown device on network");
        }
        
        int threatLevel = Math.min(5, score);
        List<String> limitedReasons = reasons.size() > 3 ? reasons.subList(0, 3) : reasons;
        
        return new ThreatResult(threatLevel, new ArrayList<>(limitedReasons));
    }
}
