"use client";

import { useState } from "react";
import { ONLINE_WINDOW_MS, TANK_NAME } from "@/lib/config";
import { setEmergencyStop } from "@/lib/data";
import { fmtAgo, fmtDayDate, fmtTime } from "@/lib/format";
import { Button, Modal, StatusDot } from "./ui";

export default function Header({ now, nodeTs, gatewayTs, estopOn }: {
  now: number;
  nodeTs?: number;
  gatewayTs?: number;
  estopOn: boolean;
}) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const nodeOnline = !!nodeTs && now - nodeTs < ONLINE_WINDOW_MS;
  const gwOnline = !!gatewayTs && now - gatewayTs < ONLINE_WINDOW_MS;

  async function toggleStop() {
    setBusy(true);
    setError("");
    try {
      await setEmergencyStop(!estopOn);
      setConfirm(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <div className="flex items-center gap-2">
          <Logo />
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Shar<span className="text-sky-700">K</span>Tan<span className="text-sky-700">K</span>
          </h1>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          {TANK_NAME} · {fmtDayDate(now)}, {fmtTime(now)}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm text-slate-700 ring-1 ring-slate-200">
          <StatusDot level={nodeOnline ? "good" : "bad"} pulse={nodeOnline} />
          Sensor node {nodeOnline ? "online" : "offline"}
          {!nodeOnline && nodeTs ? <span className="text-slate-400">· {fmtAgo(now - nodeTs)}</span> : null}
        </span>
        <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm text-slate-700 ring-1 ring-slate-200">
          <StatusDot level={gwOnline ? "good" : "bad"} pulse={gwOnline} />
          Gateway {gwOnline ? "online" : "offline"}
          {gatewayTs ? <span className="text-slate-400">· synced {fmtAgo(now - gatewayTs)}</span> : null}
        </span>
        <Button variant={estopOn ? "primary" : "danger"} onClick={() => setConfirm(true)}>
          <StopIcon />
          {estopOn ? "Resume" : "Emergency stop"}
        </Button>
      </div>

      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title={estopOn ? "Resume normal operation?" : "Stop all pumps and the feeder?"}
        footer={
          <>
            <Button onClick={() => setConfirm(false)}>Cancel</Button>
            <Button variant={estopOn ? "primary" : "danger"} onClick={toggleStop} disabled={busy}>
              {busy ? "Sending…" : estopOn ? "Resume" : "Stop everything"}
            </Button>
          </>
        }
      >
        {estopOn
          ? "The gateway will return every device to its normal schedule."
          : "The gateway turns off every pump, the feeder and any water change in progress. The filter and air pump stay off until you press Resume."}
        {error && <p className="mt-3 text-rose-600">Could not send: {error}</p>}
      </Modal>
    </header>
  );
}

function Logo() {
  return (
    <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden>
      <rect width="32" height="32" rx="9" className="fill-sky-700" />
      <path d="M6 19c3-1 5-1 8 0s5 1 8 0 3-1 4-1" className="stroke-sky-200" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M11 15 16 7l1 8" className="fill-white" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden>
      <rect x="3" y="3" width="10" height="10" rx="2" fill="currentColor" />
    </svg>
  );
}
