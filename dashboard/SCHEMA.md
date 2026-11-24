# Realtime Database layout

The dashboard reads (R) and writes (W) these paths. `ts` is always Firebase
server time in ms (`{".sv": "timestamp"}` from the gateway, `serverTimestamp()`
from the dashboard). Anything the gateway does not write yet shows as "No data"
on the dashboard.

| Path | Who writes | Dashboard | Shape |
|---|---|---|---|
| `latest/node1` | gateway (exists) | R | `{node, seq, ts, ph, water_temp, turbidity, tds, *_ok, rx, lost}` – a missing sensor is omitted |
| `latest/gateway` | gateway (exists) | R | `{ts, air_temp, humidity, pressure, lux, distance_mm, rssi, uptime_s}` |
| `readings/{id}/{push}` | gateway (exists) | R (fallback) | same as `latest/{id}`; dashboard loads only the last 2000 |
| `hourly/{id}/{YYYYMMDDHH}` | gateway (todo) | R | `{ts, ph, water_temp, tds, turbidity}` hourly averages – lets the chart show 7 days cheaply |
| `forecast/{metric}` | AI (todo, M4) | R | `{updated, model, limit, reach_at, points: [{ts, v}, …]}` – `metric` is `tds`, `ph`, `water_temp` or `turbidity` |
| `ai/status` | AI (todo, M4) | R | `{updated, anomaly: bool, summary?: string}` |
| `tanks` | gateway (todo) | R | `{fresh, waste, food}` in % full |
| `devices/{id}` | gateway (todo) | R | `{on: bool, note?: string, ts}` – ids: `filter, air, led, drain, refill, feeder` |
| `water_change` | gateway (todo) | R | `{running, step: "drain"\|"refill", last_at, last_pct}` |
| `feed_log/{push}` | gateway (todo) | R | `{ts, portions, by}` |
| `alerts/{push}` | gateway (todo, M6) | R | `{title, ts, level: "info"\|"warn"\|"crit", type, discord: bool}` |
| `settings/schedule` | you (Firebase console) | R | `{feed_times: ["08:00","18:00"], portions: 1, led_on: "08:00", led_off: "20:00"}` |
| `settings/alerts/{type}` | dashboard | R/W | `true`/`false` – types listed in `src/lib/config.ts` (`ALERT_TYPES`); missing = on |
| `control/estop` | dashboard | R/W | `{on: bool, by, ts}` – gateway must stop all pumps + feeder while `on` |
| `control/{device}` | dashboard | W | `{on: bool, by, ts}` – manual switch for `filter`, `air`, `led` |
| `commands/{push}` | dashboard | R/W | `{cmd: "feed"\|"water_change"\|"estop"\|"resume", by, ts}` – gateway runs it, then deletes it. `feed` / `water_change` older than 60 s must be deleted **without** running (see below) |

## Command expiry (gateway)

The dashboard disables "Feed now" / "Change water now" while a command of the
same type younger than `COMMAND_TTL_MS` (60 s, `src/lib/config.ts`) is in
`commands`. The gateway must drop `feed` and `water_change` commands older than
that, so presses made while it was offline do not all run when it reconnects.
`estop` / `resume` are never dropped (the gateway also follows `control/estop`).

```cpp
// Gateway needs real time: configTime(7 * 3600, 0, "pool.ntp.org") in setup().
const uint64_t COMMAND_TTL_MS = 60000;

uint64_t nowMs() {
  struct timeval tv;
  gettimeofday(&tv, nullptr);
  return (uint64_t)tv.tv_sec * 1000ULL + tv.tv_usec / 1000;
}

// Called for each child of /commands.
void handleCommand(const String& key, const String& cmd, uint64_t ts) {
  bool expires = (cmd == "feed" || cmd == "water_change");
  bool tooOld  = ts == 0 || nowMs() > ts + COMMAND_TTL_MS;
  if (expires && tooOld) {
    deleteNode("/commands/" + key);   // drop it, do not run it
    return;
  }
  runCommand(cmd);                    // feed / water change / estop / resume
  deleteNode("/commands/" + key);
}
```

## Suggested rules

```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null",
    "readings": { "$id": { ".indexOn": ["ts"] } }
  }
}
```
