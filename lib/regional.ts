export type SignalStatus = "live" | "unavailable" | "not_applicable";

export type UsgsSignal = {
  status: SignalStatus;
  stationId?: string;
  stationName?: string;
  waterTempC?: number;
  flowCfs?: number;
  gageHeightFt?: number;
  observedAt?: string;
  sourceUrl: string;
};

export type DnrSignal = {
  status: SignalStatus;
  waterName?: string;
  wbic?: string;
  fishSpecies: string[];
  nearbyWaterCount: number;
  sourceUrl: string;
};

export type NwsAlert = {
  event: string;
  headline?: string;
  severity?: string;
  expires?: string;
};

export type NwsSignal = {
  status: SignalStatus;
  alerts: NwsAlert[];
  sourceUrl: string;
};

export type BuoySignal = {
  status: SignalStatus;
  stationId?: string;
  stationName?: string;
  distanceMi?: number;
  waterTempC?: number;
  windMph?: number;
  waveFt?: number;
  observedAt?: string;
  sourceUrl: string;
};

export type WaterQualitySignal = {
  status: SignalStatus;
  siteCount: number;
  sourceUrl: string;
};

export type RegionalConditions = {
  area: {
    label: string;
    wisconsin: boolean;
    lakeMichigan: boolean;
  };
  fetchedAt: string;
  usgs: UsgsSignal;
  dnr: DnrSignal;
  waterQuality: WaterQualitySignal;
  nws: NwsSignal;
  buoy: BuoySignal;
};

const inlandWaterByMonthC = [2, 2, 4, 8, 14, 20, 23, 22, 18, 12, 6, 3];
const greatLakeWaterByMonthC = [1, 1, 3, 6, 11, 16, 20, 21, 18, 12, 6, 2];
const seasonalAirByMonthC = [-4, -2, 4, 10, 16, 21, 23, 22, 17, 10, 4, -1];

export function estimateLocalWaterTemperatureC({
  date = new Date(),
  airTemperatureC,
  waterName = "",
  waterKind = "",
}: {
  date?: Date;
  airTemperatureC?: number;
  waterName?: string;
  waterKind?: string;
}) {
  const month = date.getMonth();
  const greatLake = /great lake|lake\s+michigan/i.test(`${waterKind} ${waterName}`);
  const baseline = (greatLake ? greatLakeWaterByMonthC : inlandWaterByMonthC)[month];
  const seasonalAir = seasonalAirByMonthC[month];
  const airAdjustment =
    airTemperatureC === undefined
      ? 0
      : Math.min(3, Math.max(-3, (airTemperatureC - seasonalAir) * 0.35));
  return Math.round((baseline + airAdjustment) * 10) / 10;
}
