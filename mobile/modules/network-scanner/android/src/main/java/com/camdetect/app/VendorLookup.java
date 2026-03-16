package com.camdetect.app;

import java.util.HashMap;
import java.util.Map;

public class VendorLookup {
    private static final Map<String, String> OUI_DATABASE = new HashMap<>();
    
    static {
        // Camera vendors
        OUI_DATABASE.put("001A2B", "Hikvision");
        OUI_DATABASE.put("001C10", "Dahua");
        OUI_DATABASE.put("00D01F", "Foscam");
        OUI_DATABASE.put("00D02C", "Amcrest");
        OUI_DATABASE.put("00D056", "Reolink");
        OUI_DATABASE.put("0023CD", "Axis");
        OUI_DATABASE.put("00E09F", "Bosch");
        OUI_DATABASE.put("001BC5", "Honeywell");
        OUI_DATABASE.put("001046", "Nest");
        OUI_DATABASE.put("001747", "Nest");
        OUI_DATABASE.put("000CE2", "Ring");
        OUI_DATABASE.put("000CF1", "Ring");
        OUI_DATABASE.put("000DB3", "Ring");
        OUI_DATABASE.put("0014EB", "Ring");
        OUI_DATABASE.put("001BCD", "Ring");
        OUI_DATABASE.put("001F12", "Ring");
        OUI_DATABASE.put("001F84", "Ring");
        OUI_DATABASE.put("0021F5", "Ring");
        
        // Router/Network vendors
        OUI_DATABASE.put("0011BC", "Cisco");
        OUI_DATABASE.put("001A2F", "Cisco");
        OUI_DATABASE.put("001B0C", "Cisco");
        OUI_DATABASE.put("001E13", "Cisco");
        OUI_DATABASE.put("002155", "Cisco");
        OUI_DATABASE.put("00249B", "Cisco");
        OUI_DATABASE.put("001A4B", "Linksys");
        OUI_DATABASE.put("002553", "Netgear");
        OUI_DATABASE.put("002611", "Netgear");
        OUI_DATABASE.put("00264D", "Netgear");
        OUI_DATABASE.put("00274D", "Netgear");
        OUI_DATABASE.put("0027B3", "Netgear");
        OUI_DATABASE.put("00146C", "TP-Link");
        OUI_DATABASE.put("002219", "TP-Link");
        OUI_DATABASE.put("0023CE", "TP-Link");
        OUI_DATABASE.put("001D7E", "D-Link");
        OUI_DATABASE.put("04BF6D", "Asus");
        OUI_DATABASE.put("000C29", "VMware");
        
        // Apple
        OUI_DATABASE.put("00223F", "Apple");
        OUI_DATABASE.put("002436", "Apple");
        OUI_DATABASE.put("00254B", "Apple");
        OUI_DATABASE.put("0026BB", "Apple");
        OUI_DATABASE.put("003065", "Apple");
        OUI_DATABASE.put("085505", "Apple");
        OUI_DATABASE.put("0C771A", "Apple");
        OUI_DATABASE.put("10D38A", "Apple");
        OUI_DATABASE.put("28465D", "Apple");
        OUI_DATABASE.put("3412E9", "Apple");
        OUI_DATABASE.put("3898D6", "Apple");
        OUI_DATABASE.put("40A6D9", "Apple");
        OUI_DATABASE.put("4C32D5", "Apple");
        OUI_DATABASE.put("5404A6", "Apple");
        OUI_DATABASE.put("581F28", "Apple");
        OUI_DATABASE.put("60F801", "Apple");
        OUI_DATABASE.put("6419C2", "Apple");
        OUI_DATABASE.put("70DEE2", "Apple");
        OUI_DATABASE.put("7409E3", "Apple");
        OUI_DATABASE.put("78008B", "Apple");
        OUI_DATABASE.put("7C6DF5", "Apple");
        OUI_DATABASE.put("8425DB", "Apple");
        OUI_DATABASE.put("90B334", "Apple");
        OUI_DATABASE.put("9478A2", "Apple");
        OUI_DATABASE.put("A45E60", "Apple");
        OUI_DATABASE.put("AC293A", "Apple");
        OUI_DATABASE.put("B065BD", "Apple");
        OUI_DATABASE.put("BC3EBA", "Apple");
        OUI_DATABASE.put("C06599", "Apple");
        OUI_DATABASE.put("D023DB", "Apple");
        OUI_DATABASE.put("DC2B2A", "Apple");
        OUI_DATABASE.put("F02475", "Apple");
        OUI_DATABASE.put("FCFC48", "Apple");
        
        // Samsung
        OUI_DATABASE.put("002275", "Samsung");
        OUI_DATABASE.put("0023D6", "Samsung");
        OUI_DATABASE.put("080A6A", "Samsung");
        OUI_DATABASE.put("0C47C9", "Samsung");
        OUI_DATABASE.put("140E5A", "Samsung");
        OUI_DATABASE.put("1C5A6E", "Samsung");
        OUI_DATABASE.put("20D5BF", "Samsung");
        OUI_DATABASE.put("240B5C", "Samsung");
        OUI_DATABASE.put("3008D8", "Samsung");
        OUI_DATABASE.put("4C3C16", "Samsung");
        OUI_DATABASE.put("503EAA", "Samsung");
        OUI_DATABASE.put("6027DF", "Samsung");
        OUI_DATABASE.put("7085C5", "Samsung");
        OUI_DATABASE.put("78D6F0", "Samsung");
        OUI_DATABASE.put("80E4DA", "Samsung");
        OUI_DATABASE.put("8C71F8", "Samsung");
        OUI_DATABASE.put("940055", "Samsung");
        OUI_DATABASE.put("A08030", "Samsung");
        OUI_DATABASE.put("B47C9C", "Samsung");
        OUI_DATABASE.put("CC3A61", "Samsung");
        OUI_DATABASE.put("E03F49", "Samsung");
        OUI_DATABASE.put("F04F7C", "Samsung");
        
        // Google
        OUI_DATABASE.put("00178D", "Google");
        OUI_DATABASE.put("001E75", "Google");
        OUI_DATABASE.put("1C75F5", "Google");
        OUI_DATABASE.put("20DFB9", "Google");
        OUI_DATABASE.put("44DE8C", "Google");
        OUI_DATABASE.put("54A704", "Google");
        OUI_DATABASE.put("5C789B", "Google");
        OUI_DATABASE.put("6CDFFB", "Google");
        OUI_DATABASE.put("7488C9", "Google");
        OUI_DATABASE.put("94D6C4", "Google");
        OUI_DATABASE.put("A04268", "Google");
        OUI_DATABASE.put("AC54EC", "Google");
        OUI_DATABASE.put("D025F9", "Google");
        OUI_DATABASE.put("F00E04", "Google");
        
        // Microsoft
        OUI_DATABASE.put("0050F2", "Microsoft");
        OUI_DATABASE.put("00155D", "Microsoft");
        OUI_DATABASE.put("000D3A", "Microsoft");
        OUI_DATABASE.put("002481", "Microsoft");
        OUI_DATABASE.put("0025AE", "Microsoft");
        
        // Intel
        OUI_DATABASE.put("00A040", "Intel");
        OUI_DATABASE.put("001320", "Intel");
        OUI_DATABASE.put("00166F", "Intel");
        OUI_DATABASE.put("001B21", "Intel");
        OUI_DATABASE.put("001E64", "Intel");
        OUI_DATABASE.put("002170", "Intel");
        
        // Dell
        OUI_DATABASE.put("0011AB", "Dell");
        OUI_DATABASE.put("0013A2", "Dell");
        OUI_DATABASE.put("001878", "Dell");
        OUI_DATABASE.put("001BBE", "Dell");
        OUI_DATABASE.put("0021F6", "Dell");
        OUI_DATABASE.put("002618", "Dell");
        OUI_DATABASE.put("003018", "Dell");
        
        // Lenovo
        OUI_DATABASE.put("3C970E", "Lenovo");
        OUI_DATABASE.put("50E549", "Lenovo");
        OUI_DATABASE.put("5442EB", "Lenovo");
        OUI_DATABASE.put("64899A", "Lenovo");
        OUI_DATABASE.put("78ACC0", "Lenovo");
        OUI_DATABASE.put("888322", "Lenovo");
        OUI_DATABASE.put("A44CC8", "Lenovo");
        OUI_DATABASE.put("F08134", "Lenovo");
    }
    
    public static String lookup(String mac) {
        if (mac == null || mac.isEmpty()) return "Unknown";
        String oui = mac.replace(":", "").replace("-", "").toUpperCase();
        if (oui.length() >= 6) {
            return OUI_DATABASE.getOrDefault(oui.substring(0, 6), "Unknown");
        }
        return "Unknown";
    }
}
