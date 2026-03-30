package com.etechd.l3mon;

import android.app.admin.DeviceAdminReceiver;
import android.content.Context;
import android.content.Intent;
import android.widget.Toast;

/**
 * MDM Device Admin Receiver.
 * This class is required to enable Device Administrator privileges,
 * which are needed for the lockScreen() function.
 *
 * HOW TO INTEGRATE:
 * 1. Add this class to your Android Studio project.
 * 2. Create res/xml/device_admin_policies.xml (see below).
 * 3. Add the receiver declaration in AndroidManifest.xml (see manifest_additions.xml).
 * 4. At app startup, call MDMActionHandler.lockScreen(context) once to trigger
 *    the admin permission dialog if not already granted.
 *
 * res/xml/device_admin_policies.xml content:
 * <?xml version="1.0" encoding="utf-8"?>
 * <device-admin>
 *     <uses-policies>
 *         <force-lock />
 *     </uses-policies>
 * </device-admin>
 */
public class MDMDeviceAdminReceiver extends DeviceAdminReceiver {

    @Override
    public void onEnabled(Context context, Intent intent) {
        super.onEnabled(context, intent);
        // Device admin enabled — lock command is now available
        Toast.makeText(context, "Administración de dispositivo activada", Toast.LENGTH_SHORT).show();
    }

    @Override
    public CharSequence onDisableRequested(Context context, Intent intent) {
        return "Si desactiva la administración, el bloqueo remoto corporativo no funcionará.";
    }

    @Override
    public void onDisabled(Context context, Intent intent) {
        super.onDisabled(context, intent);
        Toast.makeText(context, "Administración de dispositivo desactivada", Toast.LENGTH_SHORT).show();
    }
}
