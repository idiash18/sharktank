"use client";

import { useId } from "react";
import { AQUARIUM_LEVEL, FOOD_LOW_PCT, WATER_CHANGE_USES_PCT } from "@/lib/config";
import type { Tanks } from "@/lib/data";
import type { Level } from "@/lib/format";
import { Card } from "./ui";

/** Water level of the aquarium in %, from the VL53L0X distance on the gateway. */
export function aquariumPct(distanceMm?: number): number | undefined {
  if (typeof distanceMm !== "number") return undefined;
  const { emptyDistanceMm: e, fullDistanceMm: f } = AQUARIUM_LEVEL;
  return Math.round(Math.max(0, Math.min(100, ((e - distanceMm) / (e - f)) * 100)));
}

export default function TanksCard({ distanceMm, tanks }: { distanceMm?: number; tanks: Tanks | null }) {
  const aq = aquariumPct(distanceMm);
  const changesLeft = (p: number) => Math.floor(p / WATER_CHANGE_USES_PCT);

  const items: { name: string; pct?: number; note: string; level: Level; color: string }[] = [
    {
      name: "Aquarium",
      pct: aq,
      note: aq === undefined ? "No level reading" : aq >= 90 ? "Full" : aq >= 75 ? "Slightly low" : "Low – check for leaks",
      level: aq === undefined ? "unknown" : aq >= 75 ? "good" : aq >= 60 ? "watch" : "bad",
      color: "#0284c7",
    },
    {
      name: "Fresh water",
      pct: tanks?.fresh,
      note: tanks?.fresh === undefined ? "No sensor data" : `${changesLeft(tanks.fresh)} changes left`,
      level: tanks?.fresh === undefined ? "unknown" : changesLeft(tanks.fresh) >= 2 ? "good" : changesLeft(tanks.fresh) >= 1 ? "watch" : "bad",
      color: "#0ea5e9",
    },
    {
      name: "Waste tank",
      pct: tanks?.waste,
      note: tanks?.waste === undefined ? "No sensor data" : `Room for ${changesLeft(100 - tanks.waste)}`,
      level: tanks?.waste === undefined ? "unknown" : changesLeft(100 - tanks.waste) >= 2 ? "good" : changesLeft(100 - tanks.waste) >= 1 ? "watch" : "bad",
      color: "#78716c",
    },
    {
      name: "Food",
      pct: tanks?.food,
      note: tanks?.food === undefined ? "No sensor data" : tanks.food < FOOD_LOW_PCT ? "Refill soon" : "OK",
      level: tanks?.food === undefined ? "unknown" : tanks.food < FOOD_LOW_PCT / 2 ? "bad" : tanks.food < FOOD_LOW_PCT ? "watch" : "good",
      color: "#d97706",
    },
  ];

  return (
    <Card title="Tanks and food" subtitle="How full each container is right now">
      <div className="grid grid-cols-4 gap-3">
        {items.map((it) => (
          <div key={it.name} className="flex flex-col items-center text-center">
            <Container pct={it.pct} color={it.color} />
            <p className="mt-2 text-lg font-semibold tabular-nums text-slate-900">
              {it.pct === undefined ? "–" : `${Math.round(it.pct)}%`}
            </p>
            <p className="text-sm font-medium text-slate-700">{it.name}</p>
            <p
              className={`mt-0.5 text-xs ${
                it.level === "bad" ? "text-rose-600" : it.level === "watch" ? "text-amber-700" : "text-slate-500"
              }`}
            >
              {it.note}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function Container({ pct, color }: { pct?: number; color: string }) {
  const h = 76;
  const fill = pct === undefined ? 0 : Math.max(0, Math.min(100, pct));
  const y = 4 + (h * (100 - fill)) / 100;
  const clipId = useId();
  return (
    <svg viewBox="0 0 48 84" className="h-24 w-14" aria-hidden>
      <rect x="2" y="2" width="44" height="80" rx="8" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" />
      <clipPath id={clipId}>
        <rect x="4" y="4" width="40" height={h} rx="6" />
      </clipPath>
      <rect x="4" y={y} width="40" height={h + 4 - y} fill={color} opacity={pct === undefined ? 0 : 0.85} clipPath={`url(#${clipId})`} />
    </svg>
  );
}
