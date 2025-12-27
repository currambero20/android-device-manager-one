import { useEffect, useRef, useState, useCallback } from "react";
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

interface UseWebSocketOptions {
  autoConnect?: boolean;
  reconnection?: boolean;
  reconnectionDelay?: number;
  reconnectionDelayMax?: number;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [locations, setLocations] = useState<Map<number, DeviceLocation>>(new Map());
  const [smsMessages, setSmsMessages] = useState<Map<number, SMSMessage[]>>(new Map());
  const [deviceStatuses, setDeviceStatuses] = useState<Map<number, DeviceStatus>>(new Map());
  const socketRef = useRef<Socket | null>(null);
  const watchedDevicesRef = useRef<Set<number>>(new Set());

  const {
    autoConnect = true,
    reconnection = true,
    reconnectionDelay = 1000,
    reconnectionDelayMax = 5000,
  } = options;

  // Initialize socket connection
  useEffect(() => {
    if (!autoConnect) return;

    const socket = io(window.location.origin, {
      reconnection,
      reconnectionDelay,
      reconnectionDelayMax,
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      console.log("[WebSocket] Connected");
      setIsConnected(true);
    });

    socket.on("disconnect", () => {
      console.log("[WebSocket] Disconnected");
      setIsConnected(false);
    });

    socket.on("location-update", (location: DeviceLocation) => {
      console.log("[WebSocket] Location update:", location);
      setLocations((prev) => new Map(prev).set(location.deviceId, location));
    });

    socket.on("sms-received", (sms: SMSMessage) => {
      console.log("[WebSocket] SMS received:", sms);
      setSmsMessages((prev) => {
        const newMap = new Map(prev);
        const messages = newMap.get(sms.deviceId) || [];
        newMap.set(sms.deviceId, [sms, ...messages]);
        return newMap;
      });
    });

    socket.on("sms-batch", (messages: SMSMessage[]) => {
      console.log("[WebSocket] SMS batch received:", messages.length);
      if (messages.length > 0) {
        setSmsMessages((prev) => {
          const newMap = new Map(prev);
          const deviceId = messages[0].deviceId;
          newMap.set(deviceId, messages);
          return newMap;
        });
      }
    });

    socket.on("status-update", (status: DeviceStatus) => {
      console.log("[WebSocket] Status update:", status);
      setDeviceStatuses((prev) => new Map(prev).set(status.deviceId, status));
    });

    // Nuevos eventos para Phase 15
    socket.on("location:update", (location: DeviceLocation) => {
      console.log("[WebSocket] Location update (Phase 15):", location);
      setLocations((prev) => new Map(prev).set(location.deviceId, location));
    });

    socket.on("permission:changed", (event: any) => {
      console.log("[WebSocket] Permission changed:", event);
    });

    socket.on("app:state_changed", (event: any) => {
      console.log("[WebSocket] App state changed:", event);
    });

    socket.on("file:modified", (event: any) => {
      console.log("[WebSocket] File modified:", event);
    });

    socket.on("geofence:alert", (event: any) => {
      console.log("[WebSocket] Geofence alert:", event);
    });

    socket.on("user:connected", (event: any) => {
      console.log("[WebSocket] User connected:", event);
    });

    socket.on("user:disconnected", (event: any) => {
      console.log("[WebSocket] User disconnected:", event);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, [autoConnect, reconnection, reconnectionDelay, reconnectionDelayMax]);

  // Subscribe to devices
  const subscribeToDevices = useCallback((deviceIds: number[]) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("subscribe:devices", deviceIds);
      deviceIds.forEach((id) => watchedDevicesRef.current.add(id));
      console.log("[WebSocket] Subscribed to devices:", deviceIds);
    }
  }, []);

  // Join device room (legacy)
  const joinDevice = useCallback((deviceId: number) => {
    if (socketRef.current && !watchedDevicesRef.current.has(deviceId)) {
      socketRef.current.emit("join-device", deviceId);
      watchedDevicesRef.current.add(deviceId);
      console.log(`[WebSocket] Joined device ${deviceId}`);
    }
  }, []);

  // Unsubscribe from devices
  const unsubscribeFromDevices = useCallback((deviceIds: number[]) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("unsubscribe:devices", deviceIds);
      deviceIds.forEach((id) => watchedDevicesRef.current.delete(id));
      console.log("[WebSocket] Unsubscribed from devices:", deviceIds);
    }
  }, []);

  // Leave device room (legacy)
  const leaveDevice = useCallback((deviceId: number) => {
    if (socketRef.current && watchedDevicesRef.current.has(deviceId)) {
      socketRef.current.emit("leave-device", deviceId);
      watchedDevicesRef.current.delete(deviceId);
      console.log(`[WebSocket] Left device ${deviceId}`);
    }
  }, []);

  // Get location for specific device
  const getLocation = useCallback(
    (deviceId: number): DeviceLocation | undefined => {
      return locations.get(deviceId);
    },
    [locations]
  );

  // Get SMS messages for specific device
  const getSmsMessages = useCallback(
    (deviceId: number): SMSMessage[] => {
      return smsMessages.get(deviceId) || [];
    },
    [smsMessages]
  );

  // Get status for specific device
  const getStatus = useCallback(
    (deviceId: number): DeviceStatus | undefined => {
      return deviceStatuses.get(deviceId);
    },
    [deviceStatuses]
  );

  return {
    isConnected,
    locations,
    smsMessages,
    deviceStatuses,
    joinDevice,
    leaveDevice,
    subscribeToDevices,
    unsubscribeFromDevices,
    getLocation,
    getSmsMessages,
    getStatus,
  };
}
