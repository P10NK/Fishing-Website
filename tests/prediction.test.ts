import test from "node:test";
import assert from "node:assert/strict";
import {
  predict,
  predictWater,
  demoForecast,
  species,
  windows,
  moonPhase,
  type Species,
} from "../lib/prediction.ts";
import { tackle } from "../lib/tackle.ts";
test("all species produce finite bounded scores over eight days", () => {
  const hours = demoForecast();
  assert.equal(hours.length, 192);
  for (const key of Object.keys(species) as Species[])
    for (const [i, h] of hours.entries()) {
      const p = predict(h, hours[i - 3], key, 43);
      assert.ok(Number.isInteger(p.score) && p.score >= 0 && p.score <= 100);
      assert.ok(p.reasons.length >= 3);
    }
});
test("thermal preference changes ranking without changing the water proxy", () => {
  const h = { ...demoForecast()[7], temp: 12 };
  const cold = predict(h, undefined, "trout", 43),
    warm = predict(h, undefined, "catfish", 43);
  assert.ok(cold.score > warm.score);
  assert.equal(cold.waterTemp, warm.waterTemp);
});
test("observed water temperature replaces the air proxy when supplied", () => {
  const h = { ...demoForecast()[7], temp: 26, waterTemp: 12 };
  const p = predict(h, undefined, "trout", 43);
  assert.equal(p.waterTemp, 12);
  assert.match(p.reasons[0], /Water temperature input/);
});
test("water outlook averages freshwater conditions without a target species", () => {
  const h = { ...demoForecast()[7], temp: 18, waterTemp: 16 };
  const p = predictWater(h, undefined, 43, ["bass", "trout"]);
  const expected = Math.round(
    (predict(h, undefined, "bass", 43).score +
      predict(h, undefined, "trout", 43).score) /
      2,
  );
  assert.equal(p.score, expected);
  assert.match(p.reasons[0], /Water temperature input/);
});
test("storms cap activity and strong winds lower it", () => {
  const h = demoForecast()[7];
  assert.ok(predict({ ...h, code: 95 }, undefined, "bass", 43).score <= 15);
  assert.ok(
    predict({ ...h, wind: 40 }, undefined, "bass", 43).score <
      predict({ ...h, wind: 9 }, undefined, "bass", 43).score,
  );
});
test("tide proxy only affects saltwater targets", () => {
  const h = demoForecast()[8];
  assert.equal(
    predict(h, undefined, "bass", 43).score,
    predict({ ...h, tide: 0.2 }, undefined, "bass", 43).score,
  );
  assert.ok(
    predict({ ...h, tide: 0.2 }, undefined, "redfish", 30).score >
      predict(h, undefined, "redfish", 30).score,
  );
});
test("best windows last two hours and do not overlap", () => {
  const hs = demoForecast()
    .slice(0, 24)
    .map((h) => predict(h, undefined, "bass", 43));
  const ws = windows(hs);
  assert.equal(ws.length, 2);
  for (const w of ws)
    assert.equal(Date.parse(w.end) - Date.parse(w.start), 7200000);
  assert.ok(
    Math.abs(Date.parse(ws[0].start) - Date.parse(ws[1].start)) >= 10800000,
  );
  assert.deepEqual(windows([]), []);
  assert.deepEqual(windows(hs.slice(0, 2)), []);
});
test("lunar phase wraps consistently before and after epoch", () => {
  for (const t of ["1995-01-01T00:00", "2000-01-06T18:14", "2026-09-10T12:00"])
    assert.ok(moonPhase(t) >= 0 && moonPhase(t) < 1);
});
test("every species has a complete three-lure guide", () => {
  assert.equal(Object.keys(species).length, 17);
  for (const key of Object.keys(species) as Species[]) {
    assert.equal(tackle[key].lures.length, 3);
    assert.ok(tackle[key].source.startsWith("https://"));
    for (const lure of tackle[key].lures)
      assert.ok(lure.name && lure.size && lure.presentation);
  }
});
test("lake salmon are freshwater and distinct from warmwater bass", () => {
  const h = { ...demoForecast()[7], temp: 11 };
  for (const key of ["chinook", "coho", "kokanee"] as Species[]) {
    assert.equal(species[key].salt, false);
    assert.ok(
      predict(h, undefined, key, 44).score >
        predict(h, undefined, "bass", 44).score,
    );
  }
});
