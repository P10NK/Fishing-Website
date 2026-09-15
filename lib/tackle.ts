import type { Species } from "./prediction";
export type Lure = {
  name: string;
  size: string;
  presentation: string;
  where: string;
  tag: string;
};
type Guide = {
  habitat: string;
  tip: string;
  source: string;
  sourceName: string;
  lures: [Lure, Lure, Lure];
};
const wi =
  "https://dnr.wisconsin.gov/topic/Fishing/outreach/hookyourcatch.html";
const tx =
  "https://tpwd.texas.gov/publications/pwdpubs/media/pwd_bk_k0700_0639d.pdf";
const salmon =
  "https://www.michigan.gov/dnr/education/michigan-species/fish-species/chinook-salmon";
const lakeTrout =
  "https://dnr.wisconsin.gov/sites/default/files/topic/Fishing/Pubs_laketrout.pdf";
const kokanee =
  "https://idfg.idaho.gov/press/kokanee-budget-no-downriggers-no-depth-finder-no-problem";
const lure = (
  name: string,
  size: string,
  presentation: string,
  where: string,
  tag: string,
): Lure => ({ name, size, presentation, where, tag });
export const tackle: Record<Species, Guide> = {
  bass: {
    habitat: "Weed edges · timber · docks",
    tip: "Start close to cover. If fish follow without striking, slow the retrieve.",
    source: "https://www.mass.gov/info-details/bass-fishing-tips",
    sourceName: "MassWildlife",
    lures: [
      lure(
        "Soft plastic worm",
        "4–6 in",
        "Texas-rig it and pause between short lifts.",
        "Vegetation and timber",
        "Finesse",
      ),
      lure(
        "Spinnerbait",
        "¼–½ oz",
        "Retrieve steadily beside the cover.",
        "Wind-blown weed edges",
        "Search bait",
      ),
      lure(
        "Shallow crankbait",
        "2–3 in",
        "Work it around hard cover with brief pauses.",
        "Rock and shallow points",
        "Reaction",
      ),
    ],
  },
  smallmouth: {
    habitat: "Rock bars · gravel · current seams",
    tip: "Imitate small baitfish or crayfish near rock.",
    source:
      "https://www.dnr.state.mn.us/gofishing/how-catch-smallmouth-bass.html",
    sourceName: "Minnesota DNR",
    lures: [
      lure(
        "Tube jig",
        "2½–4 in",
        "Drag or hop it over the bottom.",
        "Rock and gravel",
        "Bottom contact",
      ),
      lure(
        "Minnow crankbait",
        "2–4 in",
        "Retrieve with pauses beside current breaks.",
        "Points and current seams",
        "Baitfish",
      ),
      lure(
        "Inline spinner",
        "⅛–¼ oz",
        "Keep the blade turning in the current.",
        "Shallow rivers",
        "Search bait",
      ),
    ],
  },
  walleye: {
    habitat: "Drop-offs · points · deeper edges",
    tip: "Low light can bring fish shallower; keep the presentation close to their depth.",
    source: "https://www.dnr.state.mn.us/gofishing/how-catch-walleye.html",
    sourceName: "Minnesota DNR",
    lures: [
      lure(
        "Jig & minnow",
        "⅛–⅜ oz",
        "Lift gently and let it settle near bottom.",
        "Breaklines",
        "Slow & low",
      ),
      lure(
        "Minnow crankbait",
        "3–5 in",
        "Troll or cast along a depth contour.",
        "Points and ledges",
        "Cover water",
      ),
      lure(
        "Crawler harness",
        "Match weight to depth",
        "Drift or troll slowly over structure.",
        "Deeper flats",
        "Live bait",
      ),
    ],
  },
  trout: {
    habitat: "Cold streams · cool lake margins",
    tip: "Use a compact presentation and approach clear, shallow water quietly.",
    source: "https://www.dnr.state.mn.us/gofishing/how-catch-trout.html",
    sourceName: "Minnesota DNR",
    lures: [
      lure(
        "Inline spinner",
        "1⁄16–¼ oz",
        "Swing it through the current.",
        "Riffles and pools",
        "Search bait",
      ),
      lure(
        "Small spoon",
        "1–2 in",
        "Retrieve with short pauses.",
        "Lake margins",
        "Flash",
      ),
      lure(
        "Nymph or wet fly",
        "Match local insects",
        "Drift naturally through a feeding lane.",
        "Current seams",
        "Fly fishing",
      ),
    ],
  },
  brownTrout: {
    habitat: "Deep pools · undercut banks · rocky shores",
    tip: "Larger browns take baitfish and crayfish imitations; work deeper pools slowly in cold water.",
    source: wi,
    sourceName: "Wisconsin DNR",
    lures: [
      lure(
        "Minnow plug",
        "2–4 in",
        "Pause beside cover and current breaks.",
        "Banks and pools",
        "Baitfish",
      ),
      lure(
        "Crayfish imitation",
        "2–3 in",
        "Work it close to the bottom.",
        "Rocky runs",
        "Bottom contact",
      ),
      lure(
        "Streamer fly",
        "Match local forage",
        "Swing or strip past cover.",
        "Undercut banks",
        "Fly fishing",
      ),
    ],
  },
  crappie: {
    habitat: "Brush piles · timber · suspended schools",
    tip: "Small offerings are a useful starting point around cover.",
    source: tx,
    sourceName: "Texas Parks & Wildlife",
    lures: [
      lure(
        "Marabou jig",
        "1⁄32–⅛ oz",
        "Use small movements at the school’s depth.",
        "Brush and timber",
        "Finesse",
      ),
      lure(
        "Soft plastic jig",
        "1–2 in",
        "Swim slowly beside cover.",
        "Weed edges",
        "Small profile",
      ),
      lure(
        "Live minnow",
        "Small hook / light float",
        "Suspend beside the cover.",
        "Standing timber",
        "Live bait",
      ),
    ],
  },
  catfish: {
    habitat: "Channel edges · deeper holes · flats",
    tip: "Natural and prepared baits are generally a better starting point than artificial lures.",
    source: "https://tpwd.texas.gov/fishboat/fish/recreational/lakes/brazos/",
    sourceName: "Texas Parks & Wildlife",
    lures: [
      lure(
        "Nightcrawler",
        "Whole or a short piece",
        "Present near bottom.",
        "Shallow flats",
        "Natural bait",
      ),
      lure(
        "Fresh cut bait",
        "Match hook to bait",
        "Let the scent disperse along an edge.",
        "Channel breaks",
        "Natural bait",
      ),
      lure(
        "Prepared dip bait",
        "Bait-holding rig",
        "Fish a stationary bottom rig.",
        "Holes and current edges",
        "Prepared bait",
      ),
    ],
  },
  chinook: {
    habitat: "Great Lakes · deep, cold open water",
    tip: "Lake salmon often feed far below the surface. Locate bait and cold water; air temperature cannot reveal their depth.",
    source: salmon,
    sourceName: "Michigan DNR",
    lures: [
      lure(
        "Trolling spoon",
        "3–5 in",
        "Use a downrigger or weighted line to reach fish.",
        "Bait schools in cold water",
        "Trolling",
      ),
      lure(
        "Dodger & fly",
        "Salmon-size setup",
        "Tune the rig’s action at the boat before lowering it.",
        "Deeper open water",
        "Trolling",
      ),
      lure(
        "Salmon plug",
        "3–5 in",
        "Troll at the depth where fish are holding.",
        "Staging fish and open water",
        "Baitfish",
      ),
    ],
  },
  coho: {
    habitat: "Great Lakes · bays · open water",
    tip: "Depth and bait location matter more than a surface weather score.",
    source:
      "https://www.in.gov/dnr/fish-and-wildlife/files/fw-fishing_lake_michigan.pdf",
    sourceName: "Indiana DNR",
    lures: [
      lure(
        "Small trolling spoon",
        "2–4 in",
        "Troll at the school’s depth.",
        "Bays and open water",
        "Trolling",
      ),
      lure(
        "Dodger & fly",
        "Compact salmon setup",
        "Check the action, then adjust depth.",
        "Schooling fish",
        "Trolling",
      ),
      lure(
        "Casting spoon",
        "¼–¾ oz",
        "Vary the retrieve and let it sink to depth.",
        "Piers and shore-access areas",
        "Casting",
      ),
    ],
  },
  kokanee: {
    habitat: "Stocked lakes · reservoirs · suspended schools",
    tip: "Kokanee are landlocked sockeye salmon. Confirm that the lake supports them before targeting them.",
    source: kokanee,
    sourceName: "Idaho Fish & Game",
    lures: [
      lure(
        "Dodger & hoochie",
        "Small kokanee rig",
        "Troll slowly through suspended schools.",
        "Open-water schools",
        "Trolling",
      ),
      lure(
        "Wedding-ring spinner",
        "Small trolling spinner",
        "Run behind an attractor with a steady action.",
        "Schooling fish",
        "Flash",
      ),
      lure(
        "Small trolling spoon",
        "Kokanee-size spoon",
        "Adjust running depth to the fish.",
        "Cool open water",
        "Trolling",
      ),
    ],
  },
  lakeTrout: {
    habitat: "Deep cold lakes · rocky structure",
    tip: "Match the depth of the fish. A warm surface does not mean the cold layer below is warm.",
    source: lakeTrout,
    sourceName: "Wisconsin DNR",
    lures: [
      lure(
        "Trolling spoon",
        "3–5 in",
        "Control depth with weighted line or a downrigger.",
        "Cold-water contours",
        "Trolling",
      ),
      lure(
        "Dodger & fly",
        "Lake-trout setup",
        "Present at depth with a consistent action.",
        "Deeper water",
        "Trolling",
      ),
      lure(
        "Diving plug",
        "Match local baitfish",
        "Follow structure at the right running depth.",
        "Rocky drop-offs",
        "Baitfish",
      ),
    ],
  },
  pike: {
    habitat: "Weed beds · marsh edges · cooler depths",
    tip: "Use a bite-resistant leader and keep moving lures near ambush cover.",
    source: wi,
    sourceName: "Wisconsin DNR",
    lures: [
      lure(
        "Casting spoon",
        "½–1 oz",
        "Swim alongside vegetation.",
        "Weed edges",
        "Flash",
      ),
      lure(
        "Large crankbait",
        "4–6 in",
        "Vary speed along the cover.",
        "Points and drop-offs",
        "Baitfish",
      ),
      lure(
        "Streamer fly",
        "Large baitfish profile",
        "Strip past likely ambush spots.",
        "Shallow vegetation",
        "Fly fishing",
      ),
    ],
  },
  musky: {
    habitat: "Weed beds · rock bars · drop-offs",
    tip: "Cover promising structure patiently with tackle and leaders suited to large fish.",
    source:
      "https://dnr.wisconsin.gov/topic/Fishing/musky/muskywaters_fishing.html",
    sourceName: "Wisconsin DNR",
    lures: [
      lure(
        "Bucktail spinner",
        "Musky-size profile",
        "Retrieve along the edge of cover.",
        "Weed beds",
        "Search bait",
      ),
      lure(
        "Large jerkbait",
        "6–10 in",
        "Use deliberate pulls with pauses.",
        "Rock bars",
        "Reaction",
      ),
      lure(
        "Diving crankbait",
        "Musky-size plug",
        "Work along a contour or drop-off.",
        "Structure edges",
        "Baitfish",
      ),
    ],
  },
  perch: {
    habitat: "Weed edges · flats · schooling fish",
    tip: "Search for a school, then keep a small presentation near its depth.",
    source:
      "https://dnr.wisconsin.gov/sites/default/files/topic/Fishing/Species_yellowperch.pdf",
    sourceName: "Wisconsin DNR",
    lures: [
      lure(
        "Small baited jig",
        "1⁄32–⅛ oz",
        "Tip with a grub and lift gently.",
        "Schooling fish",
        "Finesse",
      ),
      lure(
        "Worm on a small hook",
        "Small piece",
        "Suspend just above the bottom.",
        "Vegetation edges",
        "Natural bait",
      ),
      lure(
        "Small minnow rig",
        "Small minnow",
        "Hold at the school’s depth.",
        "Deeper flats",
        "Live bait",
      ),
    ],
  },
  bluegill: {
    habitat: "Shoreline cover · vegetation · woody structure",
    tip: "Small hooks and small baits help connect with these smaller-mouthed fish.",
    source: tx,
    sourceName: "Texas Parks & Wildlife",
    lures: [
      lure(
        "Micro jig",
        "1⁄64–1⁄32 oz",
        "Suspend beneath a small float.",
        "Shoreline vegetation",
        "Finesse",
      ),
      lure(
        "Worm or cricket",
        "Small piece / single cricket",
        "Present close to cover.",
        "Docks and timber",
        "Natural bait",
      ),
      lure(
        "Small popper fly",
        "Panfish-size",
        "Use short pops and long pauses.",
        "Calm shallow water",
        "Topwater",
      ),
    ],
  },
  redfish: {
    habitat: "Coastal flats · grass · oyster edges",
    tip: "Match local forage and keep your lure clear of bottom snags.",
    source:
      "https://tpwd.texas.gov/fishboat/fish/didyouknow/coastal/baituse101.phtml",
    sourceName: "Texas Parks & Wildlife",
    lures: [
      lure(
        "Gold spoon",
        "¼–½ oz",
        "Retrieve steadily over the grass.",
        "Shallow flats",
        "Flash",
      ),
      lure(
        "Paddle-tail plastic",
        "3–5 in",
        "Swim beside current edges.",
        "Channels and grass",
        "Baitfish",
      ),
      lure(
        "Shrimp imitation",
        "3–4 in",
        "Hop gently or suspend below a float.",
        "Oyster edges",
        "Shrimp profile",
      ),
    ],
  },
  striped: {
    habitat: "Coastal current seams · bait schools",
    tip: "Match the size of local baitfish and the depth where stripers are feeding.",
    source: "https://www.mass.gov/info-details/learn-about-striped-bass",
    sourceName: "Massachusetts Marine Fisheries",
    lures: [
      lure(
        "Paddle-tail swimbait",
        "4–6 in",
        "Swim through the edge of the bait school.",
        "Baitfish schools",
        "Baitfish",
      ),
      lure(
        "Bucktail jig",
        "Weight for depth / current",
        "Work it through a current seam.",
        "Channels",
        "Depth control",
      ),
      lure(
        "Topwater plug",
        "4–6 in",
        "Use pauses when fish feed near the surface.",
        "Surface-feeding schools",
        "Topwater",
      ),
    ],
  },
};
