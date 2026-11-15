// Updates data.json from Korpen's public Zoezi API. No login or secrets needed:
// the division's matches and teams are public (same data the /serie/<id> page shows).
// The table is computed from the matches, so it cannot disagree with the results shown.
import { readFileSync, writeFileSync } from "node:fs";

const BASE = "https://korpenstockholm.zoezi.se";
const DIVISION_ID = process.env.DIVISION_ID || "8346"; // from https://korpenstockholm.zoezi.se/serie/8346
const US = "Jons BK";

async function getJson(path) {
  let err;
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(BASE + path, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(20000) });
      if (!r.ok) throw new Error("HTTP " + r.status);
      return await r.json();
    } catch (e) { err = e; await new Promise(res => setTimeout(res, 2000 * (i + 1))); }
  }
  throw new Error(`Request failed for ${path.split("?")[0]}: ${err.message}`);
}

// "2026-11-15T19:00:00" / "2026-11-15 19:00" (taken as Stockholm time) or an ISO instant with Z/offset.
function splitTime(s) {
  s = String(s || "");
  if (/(Z|[+-]\d\d:?\d\d)$/.test(s)) {
    const p = Object.fromEntries(new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Stockholm", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(new Date(s)).map(x => [x.type, x.value]));
    return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
  }
  const m = s.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/);
  if (!m) throw new Error("Unrecognised startTime: " + s);
  return { date: m[1], time: m[2] };
}

const [division, rawMatches] = await Promise.all([
  getJson(`/api/teamsport/division/get?id=${DIVISION_ID}`),
  getJson(`/api/teamsport/division/matches/get?id=${DIVISION_ID}`),
]);

const teams = new Map((division.teams || []).map(t => [t.id, t.name]));
if (!Array.isArray(rawMatches) || !rawMatches.length || teams.size < 2) throw new Error("Zoezi returned no matches or teams. Keeping the old data.json.");
const usId = [...teams].find(([, n]) => n === US)?.[0];
if (usId === undefined) throw new Error(`Team "${US}" not found in the division. Keeping the old data.json.`);

const table = new Map([...teams.values()].map(n => [n, { team: n, w: 0, d: 0, l: 0, gf: 0, ga: 0 }]));
const matches = [];
for (const m of rawMatches) {
  const [a, b] = m.teams || [];
  if (!a || !b) continue;
  const goals = id => { const r = (m.result || []).find(x => x.team_id === id); return r && r.result !== "" && r.result != null ? Number(r.result) : NaN; };
  const ga_ = goals(a.id), gb_ = goals(b.id);
  const played = m.finished === true && Number.isFinite(ga_) && Number.isFinite(gb_);
  if (played) {
    for (const [me, f, ag] of [[a, ga_, gb_], [b, gb_, ga_]]) {
      const row = table.get(teams.get(me.id) ?? me.name); if (!row) continue;
      row.gf += f; row.ga += ag; f > ag ? row.w++ : f < ag ? row.l++ : row.d++;
    }
  }
  if (a.id !== usId && b.id !== usId) continue;
  const us = a.id === usId ? a : b, them = a.id === usId ? b : a;
  const { date, time } = splitTime(m.startTime);
  matches.push({ date, time, opp: teams.get(them.id) ?? them.name, pitch: m.location || "", gf: played ? goals(us.id) : null, ga: played ? goals(them.id) : null });
}
matches.sort((x, y) => (x.date + x.time).localeCompare(y.date + y.time));
if (!matches.length) throw new Error(`No matches found for ${US}. Keeping the old data.json.`);

const old = JSON.parse(readFileSync("data.json", "utf8"));
const next = { ...old, demo: false, matches, table: [...table.values()] };
writeFileSync("data.json", JSON.stringify(next, null, 2) + "\n");
const done = matches.filter(m => m.gf !== null).length;
console.log(`data.json updated: ${matches.length} matches (${done} played), ${next.table.length} teams.`);
