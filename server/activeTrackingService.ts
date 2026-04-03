import { WebSocketManager } from "./websocket";
import { getDb } from "./db";
import { devices } from "../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Service for Active Intelligence Tracking (L3MON Platinum upgrade)
 * Automatically polls devices for GPS location based on their build configuration.
 */
class ActiveTrackingService {
  private interval: NodeJS.Timeout | null = null;
  private wsManager: WebSocketManager | null = null;

  /**
   * Initialize and start the tracking loop
   */
  public start(wsManager: WebSocketManager) {
    this.wsManager = wsManager;
    console.log("[ActiveTracking] Starting GPS polling service...");
    
    // Poll every 5 minutes by default
    this.interval = setInterval(() => this.pollDevices(), 5 * 60 * 1000);
    
    // Initial poll after short delay to ensure DB and WS are ready
    setTimeout(() => {
      try {
        this.pollDevices();
      } catch (err) {
        console.error("[ActiveTracking] Initial poll failed:", err);
      }
    }, 5000);
  }


  /**
   * Stop the tracking loop
   */
  public stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  /**
   * Scan all online devices and send location requests to those with active tracking enabled
   */
  private async pollDevices() {
    const db = await getDb();
    if (!db || !this.wsManager) return;

    try {
      // Find all devices
      const allDevices = await db.select().from(devices);
      
      for (const device of allDevices) {
        const metadata = (device.metadata as any) || {};
        
        // Only poll if active tracking is enabled in metadata
        if (metadata.activeTrackingEnabled === true) {
          console.log(`[ActiveTracking] Requesting automated GPS update for device ${device.id} (${device.deviceName})`);
          
          this.wsManager.broadcastToDevice(device.id, "get-location", {
            priority: "high",
            timestamp: Date.now()
          });
        }
      }
    } catch (error) {
      console.error("[ActiveTracking] Polling error:", error);
    }
  }

  /**
   * Manually trigger a poll for a specific device (e.g. when enabled by admin)
   */
  public async triggerPollForDevice(deviceId: number) {
     if (!this.wsManager) return;
     this.wsManager.broadcastToDevice(deviceId, "get-location", { priority: "requested" });
  }
}

export const activeTrackingService = new ActiveTrackingService();
