"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  limitToLast,
  onValue,
  orderByKey,
  push,
  query,
  ref,
  serverTimestamp,
  set,
  type Query,
} from "firebase/database";
import { auth, db } from "./firebase";
import type { MetricKey } from "./config";

// ---------- Shapes of the data in the Realtime Database (see SCHEMA.md) ----------

export interface NodeLatest {
  node: string;
  seq: number;
  ts: number;
  ph?: number;
  water_temp?: number;
  turbidity?: number;
  tds?: number;
  temp_ok?: boolean;
  ph_ok?: boolean;
  turb_ok?: boolean;
  tds_ok?: boolean;
  rx?: number;
  lost?: number;
}

export interface GatewayLatest {
  node: string;
  ts: number;
  air_temp?: number;
  humidity?: number;
  pressure?: number;
  lux?: number;
  distance_mm?: number;
  rssi?: number;
  uptime_s?: number;
}

export type HistoryPoint = { ts: number } & Partial<Record<MetricKey, number>>;

export interface ForecastPoint {
  ts: number;
  v: number;
}
export interface Forecast {
  updated?: number;
  model?: string;
  points?: ForecastPoint[] | Record<string, ForecastPoint>;
  limit?: number; // e.g. 400 ppm for TDS
  reach_at?: number; // when the value is predicted to reach the limit
}

export interface AiStatus {
  updated?: number;
  anomaly?: boolean;
  summary?: string;
}

export interface DeviceState {
  on?: boolean;
  note?: string;
  ts?: number;
}

export interface Tanks {
  fresh?: number; // percent full
  waste?: number;
  food?: number;
}

export interface Alert {
  title: string;
  ts: number;
  level?: "info" | "warn" | "crit";
  type?: string;
  discord?: boolean; // true once the gateway has posted it to Discord
}

export interface Schedule {
  feed_times?: string[]; // "HH:MM"
  portions?: number;
  led_on?: string;
  led_off?: string;
}

export interface FeedLogEntry {
  ts: number;
  portions?: number;
  by?: string;
}

export interface WaterChange {
  last_at?: number;
  last_pct?: number;
  running?: boolean;
  step?: "drain" | "refill";
}

export interface ControlState {
  estop?: { on: boolean; ts?: number; by?: string };
  [device: string]: unknown;
}

/** An entry under /commands that the gateway has not run (and deleted) yet. */
export interface QueuedCommand {
  cmd: CommandName;
  ts?: number;
  by?: string;
}

// ---------- Hooks ----------

type Loadable<T> = { data: T | null; loading: boolean; error: string | null };

/** Live value at a database path (re-renders whenever it changes). */
export function useValue<T>(path: string | null): Loadable<T> {
  return useQueryValue<T>(path, (r) => r);
}

/** Live value of the last `n` children (by key) under a path. */
export function useLastChildren<T>(path: string | null, n: number): Loadable<Record<string, T>> {
  return useQueryValue<Record<string, T>>(path, (r) => query(r, orderByKey(), limitToLast(n)), n);
}

function useQueryValue<T>(
  path: string | null,
  build: (r: ReturnType<typeof ref>) => Query,
  key: unknown = null,
): Loadable<T> {
  const [state, setState] = useState<Loadable<T> & { path: string | null }>({
    data: null, loading: true, error: null, path,
  });

  useEffect(() => {
    if (!path) return;
    return onValue(
      build(ref(db, path)),
      (snap) => setState({ data: snap.val() as T | null, loading: false, error: null, path }),
      (err) => setState({ data: null, loading: false, error: err.message, path }),
    );
    // `build` is an inline arrow; `key` stands in for whatever it captures.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, key]);

  // Ignore a stale result from a previous path.
  if (state.path !== path) return { data: null, loading: !!path, error: null };
  return state;
}

/** Signed-in Firebase user: undefined while checking, null when signed out. */
export function useAuthUser(): User | null | undefined {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  useEffect(() => onAuthStateChanged(auth, setUser), []);
  return user;
}

/**
 * Current time in ms, corrected by Firebase's server-time offset so "x s ago"
 * labels agree with the `ts` values the gateway writes. Ticks every second.
 */
export function useServerNow(): number {
  const offset = useValue<number>(".info/serverTimeOffset").data ?? 0;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return now + offset;
}

/**
 * Water-quality history for the trend chart.
 * Prefers `hourly/{node}` (one averaged point per hour, cheap to download for
 * 7 days). Falls back to the most recent raw `readings/{node}` when the
 * gateway does not write hourly averages yet.
 */
export function useHistory(nodeId: string): { points: HistoryPoint[]; source: "hourly" | "raw" | "none"; loading: boolean } {
  const hourly = useLastChildren<HistoryPoint>(`hourly/${nodeId}`, 24 * 7);
  const needRaw = !hourly.loading && !hourly.data;
  const raw = useLastChildren<HistoryPoint>(needRaw ? `readings/${nodeId}` : null, 2000);

  const pick = hourly.data ? hourly.data : raw.data;
  const points = pick
    ? Object.values(pick)
        .filter((p) => p && typeof p.ts === "number")
        .sort((a, b) => a.ts - b.ts)
    : [];
  return {
    points,
    source: hourly.data ? "hourly" : raw.data ? "raw" : "none",
    loading: hourly.loading || (needRaw && raw.loading),
  };
}

// ---------- Writes (commands the gateway picks up) ----------

export type CommandName = "feed" | "water_change" | "estop" | "resume";

/** Queue a command for the gateway under /commands. */
export async function sendCommand(cmd: CommandName, extra: Record<string, unknown> = {}) {
  await push(ref(db, "commands"), {
    cmd,
    ...extra,
    by: auth.currentUser?.email ?? "dashboard",
    ts: serverTimestamp(),
  });
}

export async function setEmergencyStop(on: boolean) {
  await set(ref(db, "control/estop"), {
    on,
    by: auth.currentUser?.email ?? "dashboard",
    ts: serverTimestamp(),
  });
  await sendCommand(on ? "estop" : "resume");
}

/** Manual on/off for a device; the gateway applies it unless e-stop is active. */
export async function setDevice(id: string, on: boolean) {
  await set(ref(db, `control/${id}`), {
    on,
    by: auth.currentUser?.email ?? "dashboard",
    ts: serverTimestamp(),
  });
}

export async function setAlertPref(type: string, enabled: boolean) {
  await set(ref(db, `settings/alerts/${type}`), enabled);
}

export function forecastPoints(f: Forecast | null | undefined): ForecastPoint[] {
  if (!f?.points) return [];
  const list = Array.isArray(f.points) ? f.points : Object.values(f.points);
  return list.filter((p) => p && typeof p.ts === "number" && typeof p.v === "number").sort((a, b) => a.ts - b.ts);
}
