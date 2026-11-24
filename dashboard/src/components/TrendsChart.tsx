"use client";

import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { METRICS, METRIC_KEYS, type MetricKey } from "@/lib/config";
import { forecastPoints, type Forecast, type HistoryPoint } from "@/lib/data";
import { fmtDayDate, fmtNumber, fmtTime } from "@/lib/format";
import { Card } from "./ui";

const DAY = 86_400_000;

export default function TrendsChart({ history, source, forecasts, now }: {
  history: HistoryPoint[];
  source: "hourly" | "raw" | "none";
  forecasts: Partial<Record<MetricKey, Forecast>>;
  now: number;
}) {
  const [metric, setMetric] = useState<MetricKey>("tds");
  const m = METRICS[metric];

  const measured = history
    .filter((p) => typeof p[metric] === "number")
    .map((p) => ({ ts: p.ts, v: p[metric] as number }));
  const fc = forecastPoints(forecasts[metric]);

  // Start the dashed forecast line at the last measured point so the two join.
  const last = measured[measured.length - 1];
  const data: { ts: number; v?: number; f?: number }[] = [
    ...measured.map((p) => ({ ts: p.ts, v: p.v, f: p === last && fc.length ? p.v : undefined })),
    ...fc.filter((p) => !last || p.ts > last.ts).map((p) => ({ ts: p.ts, f: p.v })),
  ];

  const start = data.length ? Math.min(data[0].ts, now - (source === "hourly" ? 7 * DAY : 0)) : now - 7 * DAY;
  const end = Math.max(now, data.length ? data[data.length - 1].ts : now);
  const spanDays = (end - start) / DAY;

  const values = data.flatMap((d) => [d.v, d.f]).filter((v): v is number => typeof v === "number");
  const yMin = Math.min(m.safeLo, ...values);
  const yMax = Math.max(m.safeHi, ...values);
  const pad = (yMax - yMin) * 0.1 || 1;

  const fcDef = forecasts[metric];
  const reachAt = fcDef?.reach_at;

  return (
    <Card
      title="Trends and forecast"
      subtitle={
        source === "hourly"
          ? "Last 7 days (hourly averages), plus the AI forecast"
          : source === "raw"
            ? "Most recent readings, plus the AI forecast"
            : "No history yet"
      }
      action={
        <div role="tablist" className="flex rounded-lg bg-slate-100 p-0.5 text-sm">
          {METRIC_KEYS.map((k) => (
            <button
              key={k}
              role="tab"
              aria-selected={metric === k}
              onClick={() => setMetric(k)}
              className={`rounded-md px-3 py-1 font-medium transition-colors ${
                metric === k ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {METRICS[k].chartLabel}
            </button>
          ))}
        </div>
      }
    >
      <div className="h-64">
        {data.length === 0 ? (
          <div className="grid h-full place-items-center rounded-xl bg-slate-50 text-sm text-slate-400">
            Waiting for readings from the sensor node…
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
              <CartesianGrid stroke="#eef2f6" vertical={false} />
              <ReferenceArea y1={m.safeLo} y2={m.safeHi} fill="#10b981" fillOpacity={0.07} />
              <ReferenceLine y={m.safeHi} stroke="#10b981" strokeDasharray="2 4" strokeOpacity={0.6} />
              <XAxis
                dataKey="ts"
                type="number"
                scale="time"
                domain={[start, end]}
                tickFormatter={(t: number) => (spanDays > 2 ? fmtDayDate(t).replace(/ \w+$/, "") : fmtTime(t))}
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                tickLine={false}
                axisLine={false}
                minTickGap={24}
              />
              <YAxis
                domain={[Math.floor(yMin - pad), Math.ceil(yMax + pad)]}
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                tickLine={false}
                axisLine={false}
                width={48}
              />
              <ReferenceLine x={now} stroke="#64748b" strokeDasharray="3 3" label={{ value: "Now", position: "top", fontSize: 11, fill: "#64748b" }} />
              <Tooltip
                labelFormatter={(t) => `${fmtDayDate(Number(t))} ${fmtTime(Number(t))}`}
                formatter={(v, name) => [`${fmtNumber(Number(v), m.decimals)} ${m.unit}`, name === "f" ? "AI forecast" : "Measured"]}
                contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12 }}
              />
              <Line dataKey="v" stroke="#0369a1" strokeWidth={2} dot={false} isAnimationActive={false} connectNulls={false} />
              <Line dataKey="f" stroke="#7c3aed" strokeWidth={2} strokeDasharray="6 5" dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-500">
        <Legend color="bg-sky-700" label="Measured" />
        {fc.length > 0 && <Legend color="bg-violet-600" label="AI forecast" dashed />}
        <Legend color="bg-emerald-300" label={`Safe, ${m.safeLo}–${m.safeHi}${m.unit ? " " + m.unit : ""}`} />
        {reachAt && (
          <span className="text-slate-600">
            Forecast: reaches {fcDef?.limit ?? m.safeHi} {m.unit} on <b>{fmtDayDate(reachAt)}</b>.
          </span>
        )}
      </div>
    </Card>
  );
}

function Legend({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block h-0.5 w-4 ${dashed ? "bg-[length:6px_2px] bg-repeat-x" : ""} ${color}`} />
      {label}
    </span>
  );
}
