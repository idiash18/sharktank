import { METRICS, type MetricKey } from "./config";
import type { HistoryPoint } from "./data";

const DAY = 24 * 60 * 60 * 1000;

export function fmtNumber(v: number | undefined | null, decimals = 1): string {
  return typeof v === "number" && Number.isFinite(v) ? v.toFixed(decimals) : "–";
}

export function fmtAgo(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s} s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} h ago`;
  return `${Math.round(h / 24)} days ago`;
}

export function fmtDuration(ms: number): string {
  const totalMin = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m} min`;
  return `${h} h ${m} min`;
}

export function fmtDayDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

export function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

/** "Today 07:12", "Yesterday 22:41" or "Wed 18 Nov 22:41" */
export function fmtWhen(ts: number, now: number): string {
  const d = new Date(ts);
  const today = new Date(now);
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  if (ts >= startOfToday) return `Today ${fmtTime(ts)}`;
  if (ts >= startOfToday - DAY) return `Yesterday ${fmtTime(ts)}`;
  return `${fmtDayDate(d.getTime())} ${fmtTime(ts)}`;
}

export function daysFromNow(ts: number, now: number): string {
  const startOf = (t: number) => {
    const d = new Date(t);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  };
  const days = Math.round((startOf(ts) - startOf(now)) / DAY);
  if (days <= 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

// ---------- Metric evaluation ----------

export type Level = "good" | "watch" | "bad" | "unknown";

export interface MetricEval {
  level: Level;
  tag: string; // "Good", "Rising", "Too high", ...
  change: string; // "Stable", "+18 in 24 h", ...
  delta: number | null;
}

/** Used instead of evaluateMetric when the sensor node has stopped sending. */
export function staleEval(ageMs: number): MetricEval {
  return { level: "unknown", tag: "Offline", change: `Last reading ${fmtAgo(ageMs)}`, delta: null };
}

/**
 * Change of a metric over the last ~24 h, using the history point closest to
 * 24 h ago. If history is shorter than that, uses the oldest point and says so.
 */
export function changeOverWindow(
  key: MetricKey,
  current: number | undefined,
  history: HistoryPoint[],
  now: number,
): { delta: number; hours: number } | null {
  if (current === undefined) return null;
  const target = now - DAY;
  let best: HistoryPoint | null = null;
  for (const p of history) {
    if (typeof p[key] !== "number") continue;
    if (!best || Math.abs(p.ts - target) < Math.abs(best.ts - target)) best = p;
  }
  if (!best || now - best.ts < 30 * 60 * 1000) return null; // < 30 min of history
  return { delta: current - (best[key] as number), hours: Math.round((now - best.ts) / 3600000) };
}

export function evaluateMetric(
  key: MetricKey,
  value: number | undefined,
  history: HistoryPoint[],
  now: number,
): MetricEval {
  const m = METRICS[key];
  if (value === undefined || !Number.isFinite(value)) {
    return { level: "unknown", tag: "No signal", change: "Sensor not detected", delta: null };
  }
  const ch = changeOverWindow(key, value, history, now);
  const stable = !ch || Math.abs(ch.delta) < m.stableBand;
  const window = ch ? (ch.hours >= 20 ? "24 h" : `${ch.hours} h`) : "";
  const change = stable
    ? "Stable"
    : `${ch!.delta > 0 ? "+" : "−"}${Math.abs(ch!.delta).toFixed(m.decimals)} in ${window}`;

  if (value > m.safeHi) return { level: "bad", tag: "Too high", change, delta: ch?.delta ?? null };
  if (value < m.safeLo) return { level: "bad", tag: "Too low", change, delta: ch?.delta ?? null };
  if (!stable) {
    // Moving towards a limit is worth watching; moving back to the middle is fine.
    const mid = (m.safeLo + m.safeHi) / 2;
    const towardsEdge = (ch!.delta > 0 && value > mid) || (ch!.delta < 0 && value < mid) || key === "tds" && ch!.delta > 0;
    if (towardsEdge) {
      return { level: "watch", tag: ch!.delta > 0 ? "Rising" : "Falling", change, delta: ch!.delta };
    }
  }
  return { level: "good", tag: m.goodWord, change, delta: ch?.delta ?? null };
}

export const LEVEL_STYLE: Record<Level, { pill: string; dot: string; text: string }> = {
  good: { pill: "bg-emerald-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500", text: "text-emerald-700" },
  watch: { pill: "bg-amber-50 text-amber-800 ring-amber-200", dot: "bg-amber-500", text: "text-amber-700" },
  bad: { pill: "bg-rose-50 text-rose-700 ring-rose-200", dot: "bg-rose-500", text: "text-rose-700" },
  unknown: { pill: "bg-slate-100 text-slate-600 ring-slate-200", dot: "bg-slate-400", text: "text-slate-500" },
};
