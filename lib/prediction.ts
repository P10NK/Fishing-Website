export const species = {
  bass: {
    name: "Largemouth bass",
    ideal: 23,
    tolerance: 12,
    dawn: 1,
    cloud: 1,
    pressure: 1,
    night: 0.35,
    salt: false,
  },
  smallmouth: {
    name: "Smallmouth bass",
    ideal: 19,
    tolerance: 10,
    dawn: 0.9,
    cloud: 0.8,
    pressure: 1,
    night: 0.3,
    salt: false,
  },
  walleye: {
    name: "Walleye",
    ideal: 17,
    tolerance: 10,
    dawn: 1,
    cloud: 1.3,
    pressure: 1.2,
    night: 0.9,
    salt: false,
  },
  trout: {
    name: "Rainbow trout",
    ideal: 13,
    tolerance: 8,
    dawn: 0.8,
    cloud: 1,
    pressure: 0.6,
    night: 0.3,
    salt: false,
  },
  crappie: {
    name: "Crappie",
    ideal: 20,
    tolerance: 11,
    dawn: 0.9,
    cloud: 0.8,
    pressure: 1.2,
    night: 0.5,
    salt: false,
  },
  catfish: {
    name: "Channel catfish",
    ideal: 26,
    tolerance: 13,
    dawn: 0.6,
    cloud: 0.5,
    pressure: 0.7,
    night: 1.2,
    salt: false,
  },
  chinook: {
    name: "Chinook salmon (lake)",
    ideal: 11,
    tolerance: 8,
    dawn: 1.2,
    cloud: 1.1,
    pressure: 0.7,
    night: 0.4,
    salt: false,
  },
  coho: {
    name: "Coho salmon (lake)",
    ideal: 13,
    tolerance: 8,
    dawn: 1.1,
    cloud: 1,
    pressure: 0.7,
    night: 0.35,
    salt: false,
  },
  kokanee: {
    name: "Kokanee salmon",
    ideal: 12,
    tolerance: 7,
    dawn: 1,
    cloud: 0.8,
    pressure: 0.6,
    night: 0.2,
    salt: false,
  },
  lakeTrout: {
    name: "Lake trout",
    ideal: 10,
    tolerance: 7,
    dawn: 0.8,
    cloud: 0.7,
    pressure: 0.6,
    night: 0.25,
    salt: false,
  },
  brownTrout: {
    name: "Brown trout",
    ideal: 14,
    tolerance: 8,
    dawn: 1,
    cloud: 1.1,
    pressure: 0.7,
    night: 0.8,
    salt: false,
  },
  pike: {
    name: "Northern pike",
    ideal: 18,
    tolerance: 11,
    dawn: 0.7,
    cloud: 0.8,
    pressure: 1,
    night: 0.15,
    salt: false,
  },
  musky: {
    name: "Muskellunge",
    ideal: 21,
    tolerance: 11,
    dawn: 0.9,
    cloud: 1.2,
    pressure: 1.2,
    night: 0.7,
    salt: false,
  },
  perch: {
    name: "Yellow perch",
    ideal: 19,
    tolerance: 11,
    dawn: 0.7,
    cloud: 0.6,
    pressure: 0.7,
    night: 0.1,
    salt: false,
  },
  bluegill: {
    name: "Bluegill",
    ideal: 24,
    tolerance: 11,
    dawn: 0.7,
    cloud: 0.6,
    pressure: 0.6,
    night: 0.1,
    salt: false,
  },
  redfish: {
    name: "Redfish",
    ideal: 24,
    tolerance: 11,
    dawn: 1,
    cloud: 0.7,
    pressure: 0.8,
    night: 0.5,
    salt: true,
  },
  striped: {
    name: "Striped bass",
    ideal: 18,
    tolerance: 10,
    dawn: 1,
    cloud: 1,
    pressure: 1,
    night: 1,
    salt: true,
  },
} as const;
export type Species = keyof typeof species;
export const speciesGroups: { label: string; ids: Species[] }[] = [
  {
    label: "Bass & freshwater predators",
    ids: ["bass", "smallmouth", "walleye", "pike", "musky", "catfish"],
  },
  {
    label: "Lake salmon & trout",
    ids: ["chinook", "coho", "kokanee", "lakeTrout", "trout", "brownTrout"],
  },
  { label: "Panfish", ids: ["crappie", "perch", "bluegill"] },
  { label: "Coastal", ids: ["redfish", "striped"] },
];
export const isColdwater = (key: Species) =>
  ["chinook", "coho", "kokanee", "lakeTrout", "trout", "brownTrout"].includes(
    key,
  );
export const freshwaterSpecies = (Object.keys(species) as Species[]).filter(
  (key) => !species[key].salt,
);
export type Hour = {
  time: string;
  temp: number;
  /** Optional observed water temperature in Celsius; air temperature remains the fallback. */
  waterTemp?: number;
  wind: number;
  pressure: number;
  cloud: number;
  rain: number;
  code: number;
  sunrise: number;
  sunset: number;
  tide?: number;
};
export type Prediction = Hour & {
  score: number;
  reasons: string[];
  phase: number;
  waterTemp: number;
};
export const clamp = (n: number, min = 0, max = 100) =>
  Math.min(max, Math.max(min, n));
export function moonPhase(time: string) {
  return (
    (((((Date.parse(time + "Z") - Date.UTC(2000, 0, 6, 18, 14)) / 86400000) %
      29.53059) +
      29.53059) %
      29.53059) /
    29.53059
  );
}
export function predict(
  hour: Hour,
  previous: Hour | undefined,
  target: Species,
  latitude: number,
): Prediction {
  const s = species[target],
    h = Number(hour.time.slice(11, 13)),
    month = Number(hour.time.slice(5, 7));
  const waterTemp = hour.waterTemp ?? hour.temp;
  const thermal = clamp(1 - Math.abs(waterTemp - s.ideal) / s.tolerance, 0, 1);
  const twilight =
    Number.isFinite(hour.sunrise) && Number.isFinite(hour.sunset)
      ? Math.max(
          Math.exp(-(((h - hour.sunrise) / 1.8) ** 2)),
          Math.exp(-(((h - hour.sunset) / 1.8) ** 2)),
        )
      : 0;
  const dark = h < hour.sunrise || h > hour.sunset;
  const trend = previous ? hour.pressure - previous.pressure : 0;
  const phase = moonPhase(hour.time);
  const lunar = (1 + Math.cos(phase * 4 * Math.PI)) / 2;
  const season = latitude < 0 ? ((month + 5) % 12) + 1 : month;
  let score =
    10 +
    thermal * 40 +
    twilight * 20 * s.dawn +
    (dark ? 9 * s.night : 0) +
    (hour.cloud / 100) * 8 * s.cloud;
  score += hour.wind >= 3 && hour.wind <= 18 ? 7 : hour.wind > 28 ? -17 : 1;
  score += clamp(-trend * 3, -6, 5) * s.pressure + lunar * 3;
  score += [4, 5, 9, 10].includes(season) ? 8 : 0;
  score -= hour.rain > 5 ? 18 : hour.rain > 1 ? 4 : 0;
  if (s.salt && hour.tide !== undefined)
    score += Math.abs(hour.tide) > 0.08 ? 6 : -3;
  if (hour.code >= 95) score = Math.min(score, 15);
  const reasons = [
    thermal > 0.7
      ? hour.waterTemp === undefined
        ? "Temperature proxy favors this species"
        : "Water temperature input favors this species"
      : hour.waterTemp === undefined
        ? "Temperature proxy is outside the preferred range"
        : "Water temperature input is outside the preferred range",
    twilight > 0.5
      ? "Low light near sunrise or sunset"
      : dark && s.night > 0.8
        ? "Nighttime feeding opportunity"
        : "Outside the strongest low-light window",
    trend < -0.4
      ? "Falling forecast pressure"
      : trend > 0.4
        ? "Rising forecast pressure may slow activity"
        : "Relatively stable forecast pressure",
    hour.wind > 28
      ? "Strong winds reduce this score"
      : hour.cloud > 55
        ? "Cloud cover extends low-light conditions"
        : "Moderate wind and light considered",
  ];
  if (hour.code >= 95)
    reasons.unshift("Thunderstorm forecast: postpone exposed-water trips");
  if (s.salt && hour.tide !== undefined)
    reasons.push(
      Math.abs(hour.tide) > 0.08
        ? "Changing tide height favors activity (current proxy)"
        : "Little tide height change predicted",
    );
  return {
    ...hour,
    score: Math.round(clamp(score)),
    reasons,
    phase,
    waterTemp,
  };
}
export function predictWater(
  hour: Hour,
  previous: Hour | undefined,
  latitude: number,
  targets: Species[] = freshwaterSpecies,
): Prediction {
  const candidates = targets.length ? targets : freshwaterSpecies;
  const predictions = candidates.map((target) =>
    predict(hour, previous, target, latitude),
  );
  const h = Number(hour.time.slice(11, 13));
  const trend = previous ? hour.pressure - previous.pressure : 0;
  const twilight =
    Number.isFinite(hour.sunrise) && Number.isFinite(hour.sunset)
      ? Math.max(
          Math.exp(-(((h - hour.sunrise) / 1.8) ** 2)),
          Math.exp(-(((h - hour.sunset) / 1.8) ** 2)),
        )
      : 0;
  const dark = h < hour.sunrise || h > hour.sunset;
  const score =
    predictions.reduce((total, prediction) => total + prediction.score, 0) /
    predictions.length;
  const reasons = [
    hour.waterTemp === undefined
      ? "Estimated water temperature sets the baseline"
      : "Water temperature input sets the baseline",
    twilight > 0.5
      ? "Low light near sunrise or sunset"
      : dark
        ? "Nighttime water conditions"
        : "Daylight water conditions",
    trend < -0.4
      ? "Falling forecast pressure"
      : trend > 0.4
        ? "Rising forecast pressure may slow activity"
        : "Relatively stable forecast pressure",
    hour.wind > 28
      ? "Strong winds reduce water activity"
      : hour.cloud > 55
        ? "Cloud cover extends low-light conditions"
        : "Moderate wind and light considered",
  ];
  if (hour.code >= 95)
    reasons.unshift("Thunderstorm forecast: postpone exposed-water trips");
  return {
    ...hour,
    score: Math.round(clamp(score)),
    reasons,
    phase: moonPhase(hour.time),
    waterTemp: hour.waterTemp ?? hour.temp,
  };
}
export function windows(hours: Prediction[], count = 2) {
  const ranked = hours
    .slice(0, -2)
    .map((p, i) => ({
      start: p.time,
      end: hours[i + 2].time,
      score: Math.round((p.score + hours[i + 1].score) / 2),
      hour: p,
    }))
    .sort((a, b) => b.score - a.score);
  const chosen: typeof ranked = [];
  for (const p of ranked)
    if (
      chosen.every(
        (x) =>
          Math.abs(Date.parse(x.start) - Date.parse(p.start)) >= 3 * 3600000,
      )
    ) {
      chosen.push(p);
      if (chosen.length >= count) break;
    }
  return chosen;
}
export function demoForecast(timezone = "America/Chicago"): Hour[] {
  const today = new Intl.DateTimeFormat("sv-SE", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return Array.from({ length: 192 }, (_, i) => {
    const date = new Date(today + "T00:00:00Z");
    date.setUTCHours(i);
    const h = i % 24,
      d = Math.floor(i / 24);
    return {
      time: date.toISOString().slice(0, 16),
      temp: 18 + 6 * Math.sin(((h - 8) / 24) * Math.PI * 2) + Math.sin(d) * 2,
      wind: 8 + 5 * Math.sin(i * 0.4),
      pressure: 1015 - 3 * Math.sin(i * 0.12),
      cloud: 55 + 30 * Math.sin(i * 0.1),
      rain: d === 3 && h > 12 ? 2 : 0,
      code: 2,
      sunrise: 6.5,
      sunset: 19.3,
    };
  });
}
