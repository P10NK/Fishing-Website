"""Import only county/water directory fields from the supplied workbook."""
import datetime
import hashlib
import json
import math
import pathlib
import sys
import openpyxl

source, destination = map(pathlib.Path, sys.argv[1:3])
rows = iter(openpyxl.load_workbook(source, read_only=True, data_only=True)["Lakes"].values)
headers = next(rows)
assert headers[0] == "Waterbody ID Code (WBIC)" and headers[13] == "County"
waters, seen = [], set()
excluded = {"missingCounty": 0, "missingNameOrId": 0}
for row in rows:
    wbic, name = str(row[0] or "").strip(), str(row[1] or "").strip()
    counties = [c.strip() for c in str(row[13] or "").split(",") if c.strip()]
    if not wbic or not name:
        excluded["missingNameOrId"] += 1
        continue
    if not counties:
        excluded["missingCounty"] += 1
        continue
    assert wbic.isdigit() and wbic not in seen, "Invalid or duplicate WBIC"
    seen.add(wbic)
    lat, lon = float(row[5]), float(row[6])
    valid = math.isfinite(lat) and math.isfinite(lon) and 42 <= lat <= 48 and -94 <= lon <= -86
    waters.append([wbic, name, counties, lat if valid else None, lon if valid else None])
payload = {"source": "Lakes.xlsx", "sheet": "Lakes", "sha256": hashlib.sha256(source.read_bytes()).hexdigest(), "importedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(), "excluded": excluded, "waters": waters}
destination.parent.mkdir(parents=True, exist_ok=True)
destination.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print(json.dumps({"imported": len(waters), "excluded": excluded, "counties": len({c for w in waters for c in w[2]}), "missingCoordinates": sum(w[3] is None for w in waters)}))
