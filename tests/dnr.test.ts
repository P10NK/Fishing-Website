import test from "node:test";
import assert from "node:assert/strict";
import { dnrStates, wisconsinCounties } from "../lib/dnr.ts";
import { countyWaters, nearbyCountyEstimate } from "../lib/water-directory.ts";
import directory from "../lib/water-directory.json" with { type: "json" };

test("DNR directory exposes Wisconsin county selection", () => {
  assert.deepEqual(dnrStates, [{ code: "WI", name: "Wisconsin" }]);
  assert.equal(wisconsinCounties.length, 72);
  assert.ok(wisconsinCounties.includes("Dane"));
  assert.ok(wisconsinCounties.includes("Milwaukee"));
  assert.ok(wisconsinCounties.includes("Door"));
});

test("workbook county spellings match all 72 selectable counties", () => {
  const names = new Set(directory.waters.flatMap(row => row[2] as string[]));
  assert.deepEqual([...names].sort(), [...wisconsinCounties].sort());
});

test("workbook names replace generic GIS names and include each shared county", () => {
  const kenosha = countyWaters("Kenosha");
  assert.equal(kenosha.find(w => w.wbic === "733600")?.name, "Bass Pond");
  assert.equal(kenosha.find(w => w.wbic === "739100")?.name, "Vern Wolf Lake");
  for (const county of ["Kenosha", "Walworth"]) {
    const powers = countyWaters(county).find(w => w.wbic === "744200");
    assert.equal(powers?.name, "Powers Lake");
    assert.equal(powers?.county, county);
    assert.deepEqual(powers?.counties, ["Walworth", "Kenosha"]);
  }
  assert.equal(kenosha.find(w => w.wbic === "1000")?.name, "Unnamed");
});

test("every source row appears only in its assigned counties with exact name and WBIC", () => {
  const source = new Map(directory.waters.map(row => [row[0], row]));
  assert.equal(source.size, 15461);
  for (const county of wisconsinCounties) {
    const waters = countyWaters(county);
    assert.equal(waters.length, directory.waters.filter(row => (row[2] as string[]).includes(county)).length);
    assert.equal(new Set(waters.map(w => w.id)).size, waters.length);
    for (const water of waters) {
      const row = source.get(water.wbic!)!;
      assert.equal(water.name, row[1]);
      assert.ok((row[2] as string[]).includes(county));
      if (row[3] === null) assert.equal(water.coordinatesAvailable, false);
    }
  }
});

test("offline location fallback labels only a nearby likely county", () => {
  assert.equal(nearbyCountyEstimate(43.0731, -89.4012), "Dane");
  assert.equal(nearbyCountyEstimate(0, 0), null);
});
