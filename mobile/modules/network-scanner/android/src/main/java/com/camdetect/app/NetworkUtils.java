package com.camdetect.app;

import android.content.Context;
import android.net.DhcpInfo;
import android.net.wifi.WifiManager;
import android.util.Log;

import java.net.InetAddress;
import java.net.NetworkInterface;
import java.net.Socket;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class NetworkUtils {
    private static final String TAG = "NetworkUtils";
    
    public static class InterfaceInfo {
        public String name;
        public String ipAddress;
        public String subnet;
        public String subnetMask;
        public boolean isLoopback;
        public boolean isUp;
        
        public InterfaceInfo(String name, String ipAddress, String subnet, String subnetMask, boolean isLoopback, boolean isUp) {
            this.name = name;
            this.ipAddress = ipAddress;
            this.subnet = subnet;
            this.subnetMask = subnetMask;
            this.isLoopback = isLoopback;
            this.isUp = isUp;
        }
    }
    
    public static String getDeviceIpAddress() {
        try {
            List<NetworkInterface> interfaces = Collections.list(NetworkInterface.getNetworkInterfaces());
            for (NetworkInterface intf : interfaces) {
                if (intf.getName().contains("wlan") || intf.getName().contains("eth")) {
                    List<InetAddress> addrs = Collections.list(intf.getInetAddresses());
                    for (InetAddress addr : addrs) {
                        if (!addr.isLoopbackAddress() && addr.getHostAddress().indexOf(':') < 0) {
                            return addr.getHostAddress();
                        }
                    }
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error getting device IP: " + e.getMessage());
        }
        return null;
    }
    
    public static List<InterfaceInfo> getAllNetworkInterfaces() {
        List<InterfaceInfo> result = new ArrayList<>();
        
        try {
            List<NetworkInterface> interfaces = Collections.list(NetworkInterface.getNetworkInterfaces());
            for (NetworkInterface intf : interfaces) {
                try {
                    boolean isUp = intf.isUp();
                    boolean isLoopback = intf.isLoopback();
                    
                    if (!isUp || isLoopback) {
                        continue;
                    }
                    
                    List<InetAddress> addrs = Collections.list(intf.getInetAddresses());
                    for (InetAddress addr : addrs) {
                        if (!addr.isLoopbackAddress() && addr.getHostAddress().indexOf(':') < 0) {
                            String ip = addr.getHostAddress();
                            String subnet = getSubnetFromIp(ip);
                            String mask = guessSubnetMask(intf);
                            
                            result.add(new InterfaceInfo(
                                intf.getName(),
                                ip,
                                subnet,
                                mask,
                                isLoopback,
                                isUp
                            ));
                            
                            Log.d(TAG, "Interface: " + intf.getName() + " IP: " + ip + " Subnet: " + subnet);
                        }
                    }
                } catch (Exception e) {
                    Log.e(TAG, "Error processing interface " + intf.getName() + ": " + e.getMessage());
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error getting network interfaces: " + e.getMessage());
        }
        
        return result;
    }
    
    private static String getSubnetFromIp(String ip) {
        if (ip == null) return null;
        String[] parts = ip.split("\\.");
        if (parts.length == 4) {
            return parts[0] + "." + parts[1] + "." + parts[2];
        }
        return null;
    }
    
    private static String guessSubnetMask(NetworkInterface intf) {
        try {
            int prefixLength = intf.getInterfaceAddresses().isEmpty() ? 24 : 
                intf.getInterfaceAddresses().get(0).getNetworkPrefixLength();
            
            int mask = 0xFFFFFFFF << (32 - prefixLength);
            return String.format("%d.%d.%d.%d",
                (mask >> 24) & 0xFF,
                (mask >> 16) & 0xFF,
                (mask >> 8) & 0xFF,
                mask & 0xFF);
        } catch (Exception e) {
            return "255.255.255.0";
        }
    }
    
    public static int getGatewayAddress(Context context) {
        try {
            WifiManager wifiManager = (WifiManager) context.getApplicationContext().getSystemService(Context.WIFI_SERVICE);
            DhcpInfo dhcpInfo = wifiManager.getDhcpInfo();
            if (dhcpInfo != null) {
                return dhcpInfo.gateway;
            }
        } catch (Exception e) {
            Log.e(TAG, "Error getting gateway: " + e.getMessage());
        }
        return 0;
    }
    
    public static int getSubnetMask(Context context) {
        try {
            WifiManager wifiManager = (WifiManager) context.getApplicationContext().getSystemService(Context.WIFI_SERVICE);
            DhcpInfo dhcpInfo = wifiManager.getDhcpInfo();
            if (dhcpInfo != null) {
                return dhcpInfo.netmask;
            }
        } catch (Exception e) {
            Log.e(TAG, "Error getting subnet mask: " + e.getMessage());
        }
        return 0xFFFFFF00;
    }
    
    public static boolean pingHost(String ipAddress, int timeout) {
        try {
            InetAddress inet = InetAddress.getByName(ipAddress);
            return inet.isReachable(timeout);
        } catch (Exception e) {
            Log.e(TAG, "Ping failed for " + ipAddress + ": " + e.getMessage());
            return false;
        }
    }
    
    public static String intToIp(int ip) {
        return String.format("%d.%d.%d.%d",
            (ip & 0xff),
            (ip >> 8 & 0xff),
            (ip >> 16 & 0xff),
            (ip >> 24 & 0xff));
    }
    
    public static int ipToInt(String ipAddress) {
        try {
            String[] parts = ipAddress.split("\\.");
            if (parts.length != 4) return 0;
            
            int result = 0;
            for (int i = 0; i < 4; i++) {
                result |= (Integer.parseInt(parts[i]) << (8 * i));
            }
            return result;
        } catch (Exception e) {
            return 0;
        }
    }
}
