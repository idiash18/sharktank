"use client";

import { useState } from "react";
import { ALERT_TYPES } from "@/lib/config";
import { setAlertPref, useValue, type Alert } from "@/lib/data";
import { fmtWhen, type Level } from "@/lib/format";
import { Button, Card, Modal, StatusDot } from "./ui";

export default function AlertsCard({ alerts, now }: { alerts: Record<string, Alert> | null; now: number }) {
  const [open, setOpen] = useState(false);
  const list = Object.values(alerts ?? {})
    .filter((a) => a && typeof a.ts === "number")
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 6);

  return (
    <Card
      title="Alerts"
      action={<span className="text-xs text-slate-500">Discord · #tank-alerts</span>}
    >
      {list.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">No alerts yet</p>
      ) : (
        <ul className="space-y-3">
          {list.map((a, i) => {
            const level: Level = a.level === "crit" ? "bad" : a.level === "warn" ? "watch" : "good";
            return (
              <li key={i} className="flex gap-3">
                <span className="mt-1.5">
                  <StatusDot level={level} />
                </span>
                <div>
                  <p className="text-sm font-medium text-slate-900">{a.title}</p>
                  <p className="text-xs text-slate-500">
                    {fmtWhen(a.ts, now)}
                    {a.discord ? " · sent to Discord" : " · not sent yet"}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <Button variant="ghost" className="mt-3 -ml-3" onClick={() => setOpen(true)}>
        Choose which alerts go to Discord →
      </Button>
      <AlertPrefs open={open} onClose={() => setOpen(false)} />
    </Card>
  );
}

function AlertPrefs({ open, onClose }: { open: boolean; onClose: () => void }) {
  const prefs = useValue<Record<string, boolean>>("settings/alerts").data ?? {};
  const [error, setError] = useState("");

  return (
    <Modal open={open} onClose={onClose} title="Alerts sent to Discord" footer={<Button onClick={onClose}>Done</Button>}>
      <p>The gateway checks these settings before posting to Discord.</p>
      <ul className="mt-3 space-y-2">
        {ALERT_TYPES.map((t) => (
          <li key={t.id}>
            <label className="flex cursor-pointer items-center gap-3 text-slate-800">
              <input
                type="checkbox"
                className="h-4 w-4 accent-sky-700"
                checked={prefs[t.id] ?? true}
                onChange={(e) => setAlertPref(t.id, e.target.checked).catch((err) => setError(String(err?.message ?? err)))}
              />
              {t.label}
            </label>
          </li>
        ))}
      </ul>
      {error && <p className="mt-3 text-rose-600">Could not save: {error}</p>}
    </Modal>
  );
}
