import assert from "node:assert/strict";
import test from "node:test";
import {
  lakeProfiles,
  lakeProfile,
  profileWater,
  documentedTargets,
  waterBodyChoices,
  nearbyEvidenceWaters,
  catchesForWater,
  recentCatches,
} from "../lib/fish-evidence.ts";
const mendota = profileWater(lakeProfiles[0]);
test("lake matching requires name, coordinates, kind and consistent official identity", () => {
  assert.equal(
    lakeProfile({
      ...mendota,
      id: "relation123",
      wbic: undefined,
      name: "Mendota Lake",
    })?.wbic,
    "805400",
  );
  for (const mismatch of [
    { lat: 45 },
    { name: "Mendota Pond" },
    { kind: "Access point" },
    { county: "Rock" },
    { state: "IL" },
    { wbic: "804600" },
  ]) {
    assert.equal(lakeProfile({ ...mendota, ...mismatch }), undefined);
  }
});
test("broad groups, stocking-only records and unknown waters cannot create forecast targets", () => {
  const targets = documentedTargets(lakeProfiles[0]);
  assert.ok(targets.includes("walleye"));
  assert.ok(
    !targets.includes("bluegill") &&
      !targets.includes("catfish") &&
      !targets.includes("trout"),
  );
  assert.deepEqual(documentedTargets(undefined), []);
  assert.deepEqual(
    documentedTargets({
      ...lakeProfiles[0],
      evidence: [
        {
          name: "Rainbow trout",
          species: "trout",
          status: "Stocked",
          observed: "1990",
          source: "Test",
          url: "https://example.com",
        },
      ],
    }),
    [],
  );
});
test("nearby official waters survive map failure and duplicate map features collapse by identity", () => {
  assert.ok(nearbyEvidenceWaters(mendota).some((w) => w.wbic === mendota.wbic));
  const results = nearbyEvidenceWaters(mendota, [
    { ...mendota, id: "way1" },
    { ...mendota, id: "relation2" },
  ]);
  assert.equal(results.filter((w) => w.wbic === mendota.wbic).length, 1);
  assert.deepEqual(nearbyEvidenceWaters({ lat: 40, lon: -74 }), []);
});
test("water picker uses named bodies and canonicalizes matches to DNR identity", () => {
  const osmLake = { ...mendota, id: "way-mendota", source: "OpenStreetMap" };
  const choices = waterBodyChoices(osmLake, [
    osmLake,
    { ...mendota, id: "access-1", kind: "Access point", name: "Mendota launch" },
    { ...mendota, id: "river-1", kind: "River", name: "Yahara River" },
  ]);
  assert.equal(choices[0].id, "wi:805400");
  assert.equal(choices[0].wbic, "805400");
  assert.ok(choices.every((water) => water.kind !== "Access point"));
  assert.ok(choices.some((water) => water.name === "Yahara River"));
});
test("catch matching cannot move an ambiguous name or a changed location to a lake", () => {
  const catchRecord = {
    id: "a",
    species: "Bluegill",
    location: mendota.name,
    time: "2026-09-13T07:00",
    water: mendota,
  };
  assert.equal(
    catchesForWater([catchRecord], { ...mendota, id: "different-map-id" })
      .length,
    1,
  );
  assert.equal(
    catchesForWater([{ ...catchRecord, water: undefined }], mendota).length,
    0,
  );
  assert.equal(
    catchesForWater(
      [{ ...catchRecord, water: { ...mendota, lat: 45 } }],
      mendota,
    ).length,
    0,
  );
  assert.equal(
    catchesForWater([{ ...catchRecord, location: "Another lake" }], mendota)
      .length,
    0,
  );
  assert.equal(
    catchesForWater([catchRecord], profileWater(lakeProfiles[1])).length,
    0,
  );
});
test("bite reports expire after 14 days, reject future dates, and deduplicate", () => {
  const c = {
    id: "a",
    species: "Bluegill",
    location: mendota.name,
    time: "2026-09-13T07:00",
    water: mendota,
  };
  const entries = [
    c,
    c,
    { ...c, id: "old", time: "2026-08-30T10:00" },
    { ...c, id: "future", time: "2026-09-14T11:00" },
    { ...c, id: "invalid", time: "invalid" },
    { ...c, id: "edge", time: "2026-08-31T10:00" },
  ];
  assert.deepEqual(
    recentCatches(entries, "2026-09-14T10:00").map((r) => r.id),
    ["a", "edge"],
  );
});
