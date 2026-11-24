"use client";

import type { FeedLogEntry, Forecast, Schedule, WaterChange } from "@/lib/data";
import { fmtDayDate, fmtDuration, fmtTime } from "@/lib/format";
import { Card } from "./ui";

/** Today's timestamp for an "HH:MM" string. */
function todayAt(hhmm: string, now: number): number {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(now);
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

export default function ScheduleCard({ schedule, feedLog, waterChange, tdsForecast, now }: {
  schedule: Schedule | null;
  feedLog: Record<string, FeedLogEntry> | null;
  waterChange: WaterChange | null;
  tdsForecast: Forecast | null;
  now: number;
}) {
  const times = [...(schedule?.feed_times ?? [])].sort();
  const startOfDay = todayAt("00:00", now);
  const fedToday = Object.values(feedLog ?? {}).filter((f) => f.ts >= startOfDay);

  // A scheduled slot counts as done if there was a feed within 1 h of it.
  const rows = times.map((t) => {
    const at = todayAt(t, now);
    const feed = fedToday.find((f) => Math.abs(f.ts - at) < 3600_000);
    return { t, at, feed };
  });
  const next = rows.find((r) => !r.feed && r.at > now);

  return (
    <Card title="Schedule">
      <p className="text-xs font-semibold tracking-wider text-slate-500">FEEDING TODAY</p>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-slate-400">No feeding times set (settings/schedule/feed_times)</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {rows.map((r) => (
            <li key={r.t} className="flex items-center gap-3 text-sm">
              <span className="w-12 font-medium tabular-nums text-slate-900">{r.t}</span>
              {r.feed ? (
                <span className="text-emerald-700">
                  ✓ Fed · {r.feed.portions ?? schedule?.portions ?? 1} portion{(r.feed.portions ?? 1) > 1 ? "s" : ""}
                </span>
              ) : r === next ? (
                <span className="text-sky-700">Next feed · in {fmtDuration(r.at - now)}</span>
              ) : r.at < now ? (
                <span className="text-amber-700">Missed</span>
              ) : (
                <span className="text-slate-500">Later</span>
              )}
            </li>
          ))}
        </ul>
      )}
      {fedToday.length > rows.filter((r) => r.feed).length && (
        <p className="mt-1 text-xs text-slate-500">+ {fedToday.length - rows.filter((r) => r.feed).length} extra feed(s) by hand today</p>
      )}

      <p className="mt-5 text-xs font-semibold tracking-wider text-slate-500">WATER CHANGE</p>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
        <dt className="text-slate-500">Last done</dt>
        <dd className="text-slate-900">
          {waterChange?.last_at
            ? `${fmtDayDate(waterChange.last_at)}${waterChange.last_pct ? ` · ${waterChange.last_pct}% replaced` : ""}`
            : "–"}
        </dd>
        <dt className="text-slate-500">Next (AI)</dt>
        <dd className="text-slate-900">{tdsForecast?.reach_at ? fmtDayDate(tdsForecast.reach_at) : "–"}</dd>
        <dt className="text-slate-500">How it runs</dt>
        <dd className="text-slate-900">Drain, then refill, automatically</dd>
        {waterChange?.running && (
          <>
            <dt className="text-slate-500">Now</dt>
            <dd className="font-medium text-sky-700">{waterChange.step === "refill" ? "Refilling…" : "Draining…"}</dd>
          </>
        )}
      </dl>
      {schedule?.led_on && (
        <p className="mt-4 text-xs text-slate-500">
          Light schedule {schedule.led_on}–{schedule.led_off} · now {fmtTime(now)}
        </p>
      )}
    </Card>
  );
}
