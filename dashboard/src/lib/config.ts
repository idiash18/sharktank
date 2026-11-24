// Dashboard settings. Edit these to match your tank and sensors.

export const TANK_NAME = "Living room aquarium";
export const NODE_ID = "node1"; // sensor node whose water readings are shown
export const GATEWAY_ID = "gateway";

// A device counts as online if its last upload is newer than this.
// Sensor node sends every 5 s, gateway uploads its own sensors every 10 s.
export const ONLINE_WINDOW_MS = 30_000;

// A feed / water-change command the gateway has not picked up within this time
// is dropped by the gateway (and no longer blocks the button on the dashboard),
// so commands sent while the gateway is offline do not all run when it returns.
export const COMMAND_TTL_MS = 60_000;

export type MetricKey = "water_temp" | "ph" | "tds" | "turbidity";

export interface MetricDef {
  label: string;
  chartLabel: string;
  unit: string;
  decimals: number;
  min: number; // left end of the gauge
  max: number; // right end of the gauge
  safeLo: number;
  safeHi: number;
  stableBand: number; // a 24 h change smaller than this counts as "Stable"
  goodWord: string;
}

export const METRICS: Record<MetricKey, MetricDef> = {
  water_temp: {
    label: "Temperature", chartLabel: "Temp", unit: "°C", decimals: 1,
    min: 20, max: 32, safeLo: 24, safeHi: 28, stableBand: 0.5, goodWord: "Good",
  },
  ph: {
    label: "pH", chartLabel: "pH", unit: "", decimals: 1,
    min: 5.5, max: 8.5, safeLo: 6.5, safeHi: 7.5, stableBand: 0.2, goodWord: "Good",
  },
  tds: {
    label: "TDS", chartLabel: "TDS", unit: "ppm", decimals: 0,
    min: 0, max: 600, safeLo: 0, safeHi: 400, stableBand: 10, goodWord: "Good",
  },
  turbidity: {
    label: "Turbidity", chartLabel: "Clarity", unit: "NTU", decimals: 1,
    min: 0, max: 25, safeLo: 0, safeHi: 10, stableBand: 1, goodWord: "Clear",
  },
};

export const METRIC_KEYS = Object.keys(METRICS) as MetricKey[];

// VL53L0X on the gateway measures the distance from the sensor down to the
// water surface. Measure these two once with a ruler and fill them in.
export const AQUARIUM_LEVEL = {
  emptyDistanceMm: 300, // distance when the tank is at the lowest safe level
  fullDistanceMm: 40, // distance when the tank is full
};

// How much of the fresh-water / waste container one water change uses.
export const WATER_CHANGE_USES_PCT = 20;
export const FOOD_LOW_PCT = 20;

// Devices shown in the Devices card. "auto" devices are run only by the
// gateway (during a water change / on the feeding schedule), never by hand.
export const DEVICES = [
  { id: "filter", name: "Filter pump", onText: "Running · cleaning the water", auto: false },
  { id: "air", name: "Air pump", onText: "Running · adding oxygen", auto: false },
  { id: "led", name: "LED light", onText: "On", auto: false },
  { id: "drain", name: "Drain pump", onText: "Draining", idleText: "Idle · runs during a water change", auto: true },
  { id: "refill", name: "Refill pump", onText: "Refilling", idleText: "Idle · runs during a water change", auto: true },
  { id: "feeder", name: "Feeder", onText: "Feeding", idleText: "Idle", auto: true },
] as const;

export const ALERT_TYPES = [
  { id: "water_quality", label: "Water quality out of the safe range" },
  { id: "trend", label: "Unusual trends found by the AI" },
  { id: "food_low", label: "Food container is low" },
  { id: "tanks", label: "Fresh-water / waste tank needs attention" },
  { id: "offline", label: "Sensor node or gateway goes offline / comes back" },
  { id: "water_change", label: "Water change started / finished" },
  { id: "sensor_fault", label: "A sensor is unplugged or not responding" },
] as const;
