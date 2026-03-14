package com.camdetect.app;

import android.util.Log;

import java.io.BufferedReader;
import java.io.File;
import java.io.InputStreamReader;

public class RootUtils {
    private static final String TAG = "RootUtils";
    
    private static final String[] SU_BINARY_PATHS = {
        "/system/bin/su",
        "/system/xbin/su",
        "/sbin/su",
        "/vendor/bin/su",
        "/system/su",
        "/system/bin/.ext/.su",
        "/system/usr/we-need-root/su",
        "/system/app/SuperSU/su",
        "/su/bin/su",
        "/data/data/com.koushikdutta.superuser/su",
        "/data/data/com.noshufou.android.su/su"
    };
    
    private static Boolean cachedRootAvailable = null;
    private static Boolean cachedRootGranted = null;
    
    public static boolean hasRootBinary() {
        if (cachedRootAvailable != null) {
            return cachedRootAvailable;
        }
        
        for (String path : SU_BINARY_PATHS) {
            File suFile = new File(path);
            if (suFile.exists()) {
                Log.d(TAG, "Found su binary at: " + path);
                cachedRootAvailable = true;
                return true;
            }
        }
        
        try {
            Process process = Runtime.getRuntime().exec("which su");
            BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
            String line = reader.readLine();
            reader.close();
            process.waitFor();
            
            if (line != null && !line.isEmpty()) {
                Log.d(TAG, "Found su binary via 'which': " + line);
                cachedRootAvailable = true;
                return true;
            }
        } catch (Exception e) {
            Log.d(TAG, "Exception checking for su with 'which': " + e.getMessage());
        }
        
        Log.d(TAG, "No su binary found");
        cachedRootAvailable = false;
        return false;
    }
    
    public static boolean requestRootAccess() {
        if (!hasRootBinary()) {
            Log.d(TAG, "No root binary available, cannot request access");
            return false;
        }
        
        if (cachedRootGranted != null && cachedRootGranted) {
            return true;
        }
        
        try {
            Log.d(TAG, "Requesting root access...");
            Process process = Runtime.getRuntime().exec("su -c id");
            BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
            String line = reader.readLine();
            BufferedReader errorReader = new BufferedReader(new InputStreamReader(process.getErrorStream()));
            String errorLine = errorReader.readLine();
            
            int exitCode = process.waitFor();
            
            Log.d(TAG, "Root request result - exitCode: " + exitCode + ", output: " + line + ", error: " + errorLine);
            
            if (exitCode == 0 && line != null && line.contains("uid=0")) {
                Log.d(TAG, "Root access granted");
                cachedRootGranted = true;
                return true;
            }
            
            Log.d(TAG, "Root access denied");
            cachedRootGranted = false;
            return false;
        } catch (Exception e) {
            Log.e(TAG, "Exception requesting root access: " + e.getMessage());
            cachedRootGranted = false;
            return false;
        }
    }
    
    public static boolean hasRootPermission() {
        if (cachedRootGranted != null) {
            return cachedRootGranted;
        }
        return requestRootAccess();
    }
    
    public static void clearCache() {
        cachedRootAvailable = null;
        cachedRootGranted = null;
    }
    
    public static String executeAsRoot(String command) {
        if (!hasRootPermission()) {
            Log.e(TAG, "No root permission, cannot execute: " + command);
            return null;
        }
        
        try {
            Process process = Runtime.getRuntime().exec(new String[]{"su", "-c", command});
            BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
            StringBuilder output = new StringBuilder();
            String line;
            
            while ((line = reader.readLine()) != null) {
                output.append(line).append("\n");
            }
            
            reader.close();
            int exitCode = process.waitFor();
            
            if (exitCode == 0) {
                return output.toString().trim();
            } else {
                Log.e(TAG, "Command failed with exit code: " + exitCode);
                return null;
            }
        } catch (Exception e) {
            Log.e(TAG, "Exception executing command as root: " + e.getMessage());
            return null;
        }
    }
}
