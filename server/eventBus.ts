import { EventEmitter } from "events";

class SystemEventBus extends EventEmitter {}

// Global event bus for bridging asynchronous WebSocket responses back to synchronous tRPC queries
export const eventBus = new SystemEventBus();

// Allow multiple concurrent API requests without triggering memory leak warnings
eventBus.setMaxListeners(100);
