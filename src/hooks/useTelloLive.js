// frontend/tellotwin-frontend/src/hooks/useTelloLive.js
import { useEffect, useRef, useState } from "react";

export default function useTelloLive(enabled) {
  const wsRef = useRef(null);
  const [state, setState] = useState({
    roll: 0, pitch: 0, yaw: 0, altitude: 0, connected: false
  });

  useEffect(() => {
    if (!enabled) {
      // tear down if toggled off
      if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
      return;
    }

    // Connect to backend WebSocket server
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const url = `${proto}://${window.location.host.replace(/\/$/, "")}/ws/tello`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data);
        // Expect: {roll, pitch, yaw, altitude, connected}
        setState((prev) => ({ ...prev, ...data }));
      } catch {}
    };
    ws.onopen = () => setState((s) => ({ ...s, connected: true }));
    ws.onclose = () => setState((s) => ({ ...s, connected: false }));

    return () => {
      if (wsRef.current === ws) {
        ws.close();
        wsRef.current = null;
      }
    };
  }, [enabled]);

  return state;
}

