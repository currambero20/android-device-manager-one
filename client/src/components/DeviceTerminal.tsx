import React, { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Terminal as TerminalIcon, Send, Trash2, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getSocket } from "@/lib/socket";

interface DeviceTerminalProps {
  deviceId: number;
  deviceName?: string;
}

export const DeviceTerminal: React.FC<DeviceTerminalProps> = ({ deviceId, deviceName }) => {
  const [history, setHistory] = useState<{ type: "in" | "out", text: string, timestamp: number }[]>([]);
  const [input, setInput] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const socket = getSocket();
    
    const handleOutput = (data: any) => {
      if (data.deviceId === deviceId) {
        setHistory(prev => [...prev, { type: "out", text: data.output, timestamp: Date.now() }]);
      }
    };

    socket.on("shell-output", handleOutput);
    
    // Auto-scroll to bottom
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }

    return () => {
      socket.off("shell-output", handleOutput);
    };
  }, [deviceId]);

  useEffect(() => {
      if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
  }, [history]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;

    const socket = getSocket();
    socket.emit("shell-input", { deviceId, command: input });
    
    setHistory(prev => [...prev, { type: "in", text: input, timestamp: Date.now() }]);
    setInput("");
    inputRef.current?.focus();
  };

  const clearHistory = () => setHistory([]);

  return (
    <Card className={`relative overflow-hidden border-glow-cyan/30 bg-black transition-all duration-300 ${isExpanded ? 'fixed inset-4 z-50' : 'h-[400px]'}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-glow-cyan/20 bg-slate-900/50 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest">
            DEVICE SHELL: {deviceName || `DEVICE_${deviceId}`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={clearHistory} title="Clear">
            <Trash2 className="w-3 h-3 text-slate-400" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? <Minimize2 className="w-3 h-3 text-slate-400" /> : <Maximize2 className="w-3 h-3 text-slate-400" />}
          </Button>
        </div>
      </div>

      {/* Terminal Area */}
      <div className="p-4 h-[calc(100%-80px)] overflow-hidden font-mono text-[11px] leading-relaxed">
        <div 
          ref={scrollRef}
          className="h-full overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-cyan-900"
        >
          {history.length === 0 && (
            <div className="text-slate-600 animate-pulse">
              [SYSTEM] Terminal ready. Awaiting connection to Android Shell...
              <br />
              [INFO] Try 'ls', 'id', or 'getprop'
            </div>
          )}
          {history.map((line, i) => (
            <div key={i} className="group">
              {line.type === "in" ? (
                <div className="flex gap-2 text-green-400">
                  <span className="opacity-50">root@android:~$</span>
                  <span className="font-bold">{line.text}</span>
                </div>
              ) : (
                <div className="text-slate-300 whitespace-pre-wrap break-all">
                  {line.text}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Input Area */}
      <form 
        onSubmit={handleSend}
        className="absolute bottom-0 left-0 right-0 p-2 bg-slate-950 border-t border-glow-cyan/10 flex items-center gap-2"
      >
        <span className="text-green-500 font-bold ml-2">$</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type command..."
          className="flex-1 bg-transparent border-none focus:ring-0 text-cyan-100 text-xs placeholder:text-slate-700"
          autoFocus
        />
        <Button size="icon" variant="ghost" type="submit" disabled={!input.trim()}>
          <Send className="w-3 h-3 text-cyan-500" />
        </Button>
      </form>

      {/* Grid Overlay for Cyberpunk look */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />
    </Card>
  );
};
