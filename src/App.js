import React, { useEffect, useRef, useState } from "react";
import ThreeDroneScene from "./ThreeDrone";
import useTelloLive from "./hooks/useTelloLive";

function deriveAttitude(row) {
  if (!row) return { roll: 0, pitch: 0, yaw: 0, alt: 0 };
  const toRad = (deg) => (deg * Math.PI) / 180;
  const rate = Number(row.Rate) || 0;
  const srate = Number(row.Srate) || 0;
  const drate = Number(row.Drate) || 0;
  const entropy = Number(row.Entropy) || 0;

  const rollDeg  = Math.max(-30, Math.min(30, (rate  % 60) - 30));
  const pitchDeg = Math.max(-25, Math.min(25, (srate % 50) - 25));
  const yawDeg   = ((drate % 360) - 180);
  const altM     = Math.max(0, Math.min(2, (entropy % 2)));

  return { roll: toRad(rollDeg), pitch: toRad(pitchDeg), yaw: toRad(yawDeg), alt: altM };
}

export default function App() {
  const [row, setRow] = useState(null);
  const [err, setErr] = useState("");
  const [i, setI] = useState(0);
  const [running, setRunning] = useState(true);
  const [intervalMs, setIntervalMs] = useState(300);
  const [liveMode, setLiveMode] = useState(false);
  const timerRef = useRef(null);
  
  const live = useTelloLive(liveMode);

  useEffect(() => {
    clearInterval(timerRef.current);
    if (!running) return;

    const tick = async () => {
      try {
        const res = await fetch(`http://localhost:8000/telemetry?i=${i}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setRow(json);
        setErr("");
        setI((prev) => prev + 1);
      } catch (e) {
        setErr(String(e));
      }
    };

    tick();
    timerRef.current = setInterval(tick, Math.max(50, intervalMs));
    return () => clearInterval(timerRef.current);
  }, [running, intervalMs, i]);

  const csvAttitude = deriveAttitude(row);
  
  // Choose source: live if enabled, else CSV-derived
  const roll = liveMode ? (live.roll * Math.PI / 180) : csvAttitude.roll;  // Convert degrees to radians
  const pitch = liveMode ? (live.pitch * Math.PI / 180) : csvAttitude.pitch;
  const yaw = liveMode ? (live.yaw * Math.PI / 180) : csvAttitude.yaw;
  const altitude = liveMode ? live.altitude : csvAttitude.alt;
  const liveConnected = liveMode && live.connected;

  return (
    <div style={{ padding: 20, fontFamily: "system-ui, Arial, sans-serif" }}>
      <h1>TelloTwin — Live Telemetry + 3D</h1>

      <div style={{ display: "flex", gap: 12, alignItems: "center", margin: "6px 0 16px" }}>
        <button onClick={() => setRunning((r) => !r)}>{running ? "Pause" : "Start"}</button>
        <label>
          Speed (ms):{" "}
          <input
            type="number"
            min={50}
            step={50}
            value={intervalMs}
            onChange={(e) => setIntervalMs(Number(e.target.value) || 300)}
            style={{ width: 90 }}
          />
        </label>
        <button onClick={() => setI(0)}>Reset Index</button>
        <span style={{ opacity: 0.7 }}>Row index: <b>{row?.index ?? "—"}</b></span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={liveMode}
            onChange={(e) => setLiveMode(e.target.checked)}
          />
          Live Tello stream (WebSocket)
        </label>
        <span style={{ fontSize: 12, opacity: 0.75 }}>
          {liveMode ? (liveConnected ? "🟢 connected" : "🟡 connecting…") : "⚪ CSV mode"}
        </span>
      </div>

      {err && <p style={{ color: "crimson" }}>Error: {err}</p>}
      {!row ? (
        <p>Connecting…</p>
      ) : (
        <>
          <DashboardCards row={row} />
          <div style={{
            height: 520,
            borderRadius: 12,
            overflow: "hidden",
            border: "1px solid #ddd",
            marginBottom: 16
          }}>
            <ThreeDroneScene roll={roll} pitch={pitch} yaw={yaw} altitude={altitude} />
          </div>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 16 }}>
            roll: {deg(roll)}°, pitch: {deg(pitch)}°, yaw: {deg(yaw)}°, alt: {altitude.toFixed(2)} m
            <span style={{ marginLeft: 8, opacity: 0.6 }}>
              {liveMode ? "Live Tello data" : "CSV simulation data"}
            </span>
          </div>
          <Sparkline value={Number(row.Rate) || 0} />
        </>
      )}
    </div>
  );
}

function deg(rad) { return (rad * 180 / Math.PI).toFixed(1); }

function DashboardCards({ row }) {
  const fields = [
    ["Rate", row.Rate],
    ["Srate", row.Srate],
    ["Drate", row.Drate],
    ["Payload_Length", row.Payload_Length],
    ["Entropy", row.Entropy],
    ["Protocol Type", row["Protocol Type"]],
    ["UDP", row.UDP],
    ["TCP", row.TCP],
  ].filter(([_, v]) => v !== undefined);

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
      gap: 12,
      marginBottom: 18
    }}>
      {fields.map(([label, value]) => (
        <Card key={label} label={label} value={fmt(value)} />
      ))}
    </div>
  );
}

function Card({ label, value }) {
  return (
    <div style={{
      border: "1px solid #ddd",
      borderRadius: 10,
      padding: 14,
      boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      background: "white"
    }}>
      <div style={{ fontSize: 12, opacity: 0.7 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function fmt(x) {
  if (x === undefined || x === null || x === "") return "—";
  const num = Number(x);
  if (!Number.isFinite(num)) return String(x);
  return Intl.NumberFormat(undefined, { maximumFractionDigits: 3 }).format(num);
}

function Sparkline({ value, maxPoints = 80, height = 80 }) {
  const [points, setPoints] = useState([]);
  useEffect(() => {
    setPoints((prev) => {
      const next = [...prev, value];
      if (next.length > maxPoints) next.shift();
      return next;
    });
  }, [value]);

  const w = 600;
  const h = height;
  const min = Math.min(...points, 0);
  const max = Math.max(...points, 1);
  const scaleX = (idx) => (idx / Math.max(1, points.length - 1)) * w;
  const scaleY = (v) => h - ((v - min) / Math.max(1e-9, max - min)) * h;

  const d = points
    .map((v, idx) => `${idx === 0 ? "M" : "L"} ${scaleX(idx).toFixed(1)} ${scaleY(v).toFixed(1)}`)
    .join(" ");

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <b>Rate (sparkline)</b>
        <span style={{ opacity: 0.6 }}>
          min {fmt(min)} • max {fmt(max)}
        </span>
      </div>
      <svg width={w} height={h} style={{ border: "1px solid #eee", borderRadius: 8, background: "#fafafa" }}>
        {points.length > 1 && <path d={d} fill="none" stroke="black" strokeWidth="2" />}
      </svg>
    </div>
  );
}