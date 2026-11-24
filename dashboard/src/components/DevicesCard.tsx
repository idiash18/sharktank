"use client";

import { useState } from "react";
import { DEVICES } from "@/lib/config";
import { setDevice, type DeviceState, type Schedule } from "@/lib/data";
import { StatusDot } from "./ui";
import { Card } from "./ui";

export default function DevicesCard({ devices, schedule, estopOn }: {
  devices: Record<string, DeviceState> | null;
  schedule: Schedule | null;
  estopOn: boolean;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function toggle(id: string, on: boolean) {
    setBusy(id);
    setError("");
    try {
      await setDevice(id, on);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card title="Devices">
      <ul className="divide-y divide-slate-100">
        {DEVICES.map((d) => {
          const st = devices?.[d.id];
          const known = typeof st?.on === "boolean";
          const on = !!st?.on;
          let text: string;
          if (!known) text = "No status from the gateway";
          else if (st?.note) text = st.note;
          else if (on) text = d.id === "led" && schedule?.led_on ? `On · schedule ${schedule.led_on}–${schedule.led_off ?? "?"}` : d.onText;
          else text = "idleText" in d ? d.idleText : "Off";

          return (
            <li key={d.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="flex min-w-0 items-center gap-3">
                <StatusDot level={!known ? "unknown" : on ? "good" : "unknown"} pulse={on} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">{d.name}</p>
                  <p className="truncate text-xs text-slate-500">{text}</p>
                </div>
              </div>
              {d.auto ? (
                <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">Auto only</span>
              ) : (
                <Switch
                  checked={on}
                  disabled={!known || estopOn || busy === d.id}
                  onChange={(v) => toggle(d.id, v)}
                  label={`Turn ${d.name} ${on ? "off" : "on"}`}
                />
              )}
            </li>
          );
        })}
      </ul>
      {estopOn && <p className="mt-2 text-xs text-rose-600">Emergency stop is on – devices cannot be switched.</p>}
      {error && <p className="mt-2 text-xs text-rose-600">Could not switch: {error}</p>}
    </Card>
  );
}

function Switch({ checked, disabled, onChange, label }: {
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 disabled:opacity-40 ${
        checked ? "bg-sky-600" : "bg-slate-300"
      }`}
    >
      <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );
}
