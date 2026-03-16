package com.camdetect.app;

import java.util.Arrays;
import java.util.List;

public class DeviceClassifier {
    
    private static final List<String> CAMERA_VENDORS = Arrays.asList(
        "hikvision", "dahua", "foscam", "amcrest", "reolink", "axis",
        "bosch", "honeywell", "nest", "ring", "arlo", "logitech",
        "netatmo", "canary", "dropcam", "yi", "xiaomi", "ezviz", "tapo"
    );
    
    private static final List<String> ROUTER_VENDORS = Arrays.asList(
        "cisco", "linksys", "netgear", "tp-link", "d-link", "asus",
        "ubiquiti", "mikrotik", "arris", "technicolor", "sagemcom",
        "huawei", "zyxel", "buffalo", "trendnet", "belkin", "tenda"
    );
    
    public static String classify(String vendor, String hostname, List<PortScanner.PortInfo> ports) {
        String searchText = (vendor != null ? vendor : "") + " " + (hostname != null ? hostname : "");
        searchText = searchText.toLowerCase();
        
        if (vendor != null) {
            String vendorLower = vendor.toLowerCase();
            for (String cv : CAMERA_VENDORS) {
                if (vendorLower.contains(cv)) return "camera";
            }
            for (String rv : ROUTER_VENDORS) {
                if (vendorLower.contains(rv)) return "router";
            }
        }
        
        if (ports != null) {
            for (PortScanner.PortInfo port : ports) {
                if (port.number == 554 || port.number == 8554) {
                    return "camera";
                }
            }
        }
        
        if (hostname != null) {
            String hostnameLower = hostname.toLowerCase();
            if (hostnameLower.contains("router") || hostnameLower.contains("gateway")) {
                return "router";
            }
        }
        
        return "unknown";
    }
    
    public static boolean isKnownCameraVendor(String vendor) {
        if (vendor == null) return false;
        String vendorLower = vendor.toLowerCase();
        for (String cv : CAMERA_VENDORS) {
            if (vendorLower.contains(cv)) return true;
        }
        return false;
    }
}
