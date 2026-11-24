"use client";

import { METRICS, METRIC_KEYS, type MetricKey } from "@/lib/config";
import type { GatewayLatest, NodeLatest } from "@/lib/data";
import { fmtNumber, LEVEL_STYLE, type MetricEval } from "@/lib/format";
import { Card, Pill } from "./ui";

export default function WaterQuality({ node, gateway, evals }: {
  node: NodeLatest | null;
  gateway: GatewayLatest | null;
  evals: Record<MetricKey, MetricEval>;
}) {
  const room = [
    gateway?.air_temp !== undefined && `Room ${fmtNumber(gateway.air_temp, 1)} °C`,
    gateway?.humidity !== undefined && `Humidity ${fmtNumber(gateway.humidity, 0)}%`,
    gateway?.lux !== undefined && `Light ${fmtNumber(gateway.lux, 0)} lx`,
  ].filter(Boolean);

  return (
    <Card
      title="Water quality"
      action={room.length ? <p className="text-sm text-slate-500">{room.join(" · ")}</p> : null}
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {METRIC_KEYS.map((k) => (
          <MetricTile key={k} k={k} value={node?.[k]} ev={evals[k]} />
        ))}
      </div>
    </Card>
  );
}

function MetricTile({ k, value, ev }: { k: MetricKey; value?: number; ev: MetricEval }) {
  const m = METRICS[k];
  const has = typeof value === "number" && Number.isFinite(value);
  const span = m.max - m.min;
  const pos = (v: number) => `${Math.max(0, Math.min(100, ((v - m.min) / span) * 100))}%`;

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-600">{m.label}</p>
        <Pill level={ev.level}>{ev.tag}</Pill>
      </div>
      <p className="mt-2 flex items-baseline gap-1.5">
        <span className={`text-3xl font-semibold tabular-nums ${!has ? "text-slate-300" : ev.level === "unknown" ? "text-slate-400" : "text-slate-900"}`}>
          {has ? fmtNumber(value, m.decimals) : "–"}
        </span>
        {m.unit && <span className="text-sm text-slate-500">{m.unit}</span>}
      </p>
      <p className={`mt-0.5 text-sm ${ev.level === "watch" || ev.level === "bad" ? LEVEL_STYLE[ev.level].text : "text-slate-500"}`}>
        {ev.change}
      </p>

      {/* Gauge: full range, green safe band, marker at the current value */}
      <div className="relative mt-4 h-2 rounded-full bg-slate-200">
        <div
          className="absolute inset-y-0 rounded-full bg-emerald-300"
          style={{ left: pos(m.safeLo), width: `calc(${pos(m.safeHi)} - ${pos(m.safeLo)})` }}
        />
        {has && (
          <div
            className={`absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow ${LEVEL_STYLE[ev.level].dot}`}
            style={{ left: pos(value) }}
          />
        )}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-slate-400 tabular-nums">
        <span>{m.min}</span>
        <span>
          Safe {m.safeLo}–{m.safeHi}
        </span>
        <span>{m.max}</span>
      </div>
    </div>
  );
}
