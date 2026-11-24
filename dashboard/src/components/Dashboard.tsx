"use client";

import { useEffect, useState } from "react";
import { signInAnonymously } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  COMMAND_TTL_MS,
  FOOD_LOW_PCT,
  GATEWAY_ID,
  METRIC_KEYS,
  NODE_ID,
  ONLINE_WINDOW_MS,
  WATER_CHANGE_USES_PCT,
  type MetricKey,
} from "@/lib/config";
import {
  useAuthUser,
  useHistory,
  useLastChildren,
  useServerNow,
  useValue,
  type AiStatus,
  type Alert,
  type ControlState,
  type DeviceState,
  type FeedLogEntry,
  type Forecast,
  type GatewayLatest,
  type NodeLatest,
  type QueuedCommand,
  type Schedule,
  type Tanks,
  type WaterChange,
} from "@/lib/data";
import { evaluateMetric, staleEval, type MetricEval } from "@/lib/format";
import Header from "./Header";
import StatusCard, { type WatchItem } from "./StatusCard";
import WaterQuality from "./WaterQuality";
import TrendsChart from "./TrendsChart";
import TanksCard, { aquariumPct } from "./TanksCard";
import DevicesCard from "./DevicesCard";
import ScheduleCard from "./ScheduleCard";
import AlertsCard from "./AlertsCard";

// No sign-in page: the dashboard signs in anonymously in the background so the
// database rules ("auth != null") still apply.
export default function Dashboard() {
  const user = useAuthUser();
  const [error, setError] = useState("");

  useEffect(() => {
    if (user !== null) return;
    signInAnonymously(auth).catch((err: { code?: string; message?: string }) =>
      setError(err.code ?? err.message ?? String(err)),
    );
  }, [user]);

  if (error) {
    return (
      <Splash
        text={`Could not connect to Firebase: ${error}`}
        hint={
          error === "auth/admin-restricted-operation" || error === "auth/operation-not-allowed"
            ? "Turn on Anonymous sign-in in Firebase Console → Authentication → Sign-in method."
            : undefined
        }
      />
    );
  }
  if (!user) return <Splash text="Connecting…" />;
  return <LiveDashboard />;
}

function LiveDashboard() {
  const now = useServerNow();
  const node = useValue<NodeLatest>(`latest/${NODE_ID}`);
  const gateway = useValue<GatewayLatest>(`latest/${GATEWAY_ID}`).data;
  const history = useHistory(NODE_ID);
  const forecasts = useValue<Partial<Record<MetricKey, Forecast>>>("forecast").data ?? {};
  const ai = useValue<AiStatus>("ai/status").data;
  const tanks = useValue<Tanks>("tanks").data;
  const devices = useValue<Record<string, DeviceState>>("devices").data;
  const control = useValue<ControlState>("control").data;
  const schedule = useValue<Schedule>("settings/schedule").data;
  const waterChange = useValue<WaterChange>("water_change").data;
  const feedLog = useLastChildren<FeedLogEntry>("feed_log", 20).data;
  const alerts = useLastChildren<Alert>("alerts", 20).data;
  const commands = useValue<Record<string, QueuedCommand>>("commands").data;

  if (node.error) {
    return (
      <Splash
        text={`Could not read the database: ${node.error}`}
        hint="Check the Realtime Database rules allow this account to read, and that the database URL in .env.local is correct."
      />
    );
  }

  const n = node.data;
  // latest/node1 stays in the database after the node dies, so old values must
  // not be judged as if they were live.
  const nodeAgeMs = n && typeof n.ts === "number" ? now - n.ts : null;
  const nodeStale = nodeAgeMs !== null && nodeAgeMs > ONLINE_WINDOW_MS;
  const evals = Object.fromEntries(
    METRIC_KEYS.map((k) => [k, nodeStale ? staleEval(nodeAgeMs) : evaluateMetric(k, n?.[k], history.points, now)]),
  ) as Record<MetricKey, MetricEval>;

  // Commands the gateway has not run yet. Older than COMMAND_TTL_MS = dropped by the gateway.
  const queued = (cmd: QueuedCommand["cmd"]) =>
    Object.values(commands ?? {}).some(
      (c) => c?.cmd === cmd && typeof c.ts === "number" && now - c.ts < COMMAND_TTL_MS,
    );
  const gatewayOnline = typeof gateway?.ts === "number" && now - gateway.ts < ONLINE_WINDOW_MS;

  const extra: WatchItem[] = [];
  const aq = aquariumPct(gateway?.distance_mm);
  if (aq !== undefined && aq < 75) extra.push({ level: aq < 60 ? "bad" : "watch", text: "the aquarium water level is low" });
  if (tanks?.food !== undefined && tanks.food < FOOD_LOW_PCT) extra.push({ level: "watch", text: "the food container is low" });
  if (tanks?.fresh !== undefined && tanks.fresh < WATER_CHANGE_USES_PCT) extra.push({ level: "watch", text: "the fresh-water tank needs refilling" });
  if (tanks?.waste !== undefined && 100 - tanks.waste < WATER_CHANGE_USES_PCT) extra.push({ level: "watch", text: "the waste tank needs emptying" });

  const estopOn = !!control?.estop?.on;

  return (
    <main className="mx-auto w-full max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:py-8">
      <Header now={now} nodeTs={n?.ts} gatewayTs={gateway?.ts} estopOn={estopOn} />

      {estopOn && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <b>Emergency stop is on.</b> All pumps and the feeder are stopped
          {control?.estop?.by ? ` (by ${control.estop.by})` : ""}. Press Resume when it is safe.
        </div>
      )}

      <StatusCard
        evals={evals}
        extraItems={extra}
        ai={ai}
        tdsForecast={forecasts.tds ?? null}
        waterChange={waterChange}
        estopOn={estopOn}
        nodeStaleMs={nodeStale ? nodeAgeMs : null}
        feedQueued={queued("feed")}
        waterChangeQueued={queued("water_change")}
        gatewayOnline={gatewayOnline}
        now={now}
      />

      <WaterQuality node={n} gateway={gateway} evals={evals} />

      <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
        <TrendsChart history={history.points} source={history.source} forecasts={forecasts} now={now} />
        <TanksCard distanceMm={gateway?.distance_mm} tanks={tanks} />
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <DevicesCard devices={devices} schedule={schedule} estopOn={estopOn} />
        <ScheduleCard schedule={schedule} feedLog={feedLog} waterChange={waterChange} tdsForecast={forecasts.tds ?? null} now={now} />
        <AlertsCard alerts={alerts} now={now} />
      </div>

      <footer className="pt-2 text-center text-xs text-slate-400">
        {n ? `Node ${n.node} · reading #${n.seq}` : "No reading from the sensor node yet"}
        {n?.rx !== undefined && n.lost !== undefined && n.rx + n.lost > 0
          ? ` · packet delivery ${((100 * n.rx) / (n.rx + n.lost)).toFixed(1)}%`
          : ""}
        {gateway?.rssi !== undefined ? ` · gateway Wi-Fi ${gateway.rssi} dBm` : ""}
      </footer>
    </main>
  );
}

function Splash({ text, hint }: { text: string; hint?: string }) {
  return (
    <main className="grid min-h-screen place-items-center px-4 text-center">
      <div>
        <p className="text-slate-600">{text}</p>
        {hint && <p className="mt-2 max-w-md text-sm text-slate-400">{hint}</p>}
      </div>
    </main>
  );
}
