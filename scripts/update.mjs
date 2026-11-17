// Updates data.json from Korpen's public Zoezi API. No login or secrets needed:
// the division's matches and teams are public (same data the /serie/<id> page shows).
// The table comes from Zoezi's own table endpoint (includes walkovers). If that cannot be read
// and validated, it falls back to a table computed from the match results.
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

// ---- every match in the division, with walkovers read properly ----
// A walkover is a result row with invalid_id set and no goals; the other team's row holds the goals (usually 5).
function side(m, team) {
  const r = (m.result || []).find(x => x.team_id === team.id);
  const wo = !!(r && r.invalid_id != null);
  const raw = r && r.result !== "" && r.result != null ? Number(r.result) : NaN;
  return { id: team.id, name: teams.get(team.id) ?? team.name, wo, goals: Number.isFinite(raw) ? raw : wo ? 0 : NaN };
}
const games = [];
for (const m of rawMatches) {
  const [a, b] = m.teams || [];
  if (!a || !b) continue;
  const A = side(m, a), B = side(m, b);
  const played = m.finished === true && Number.isFinite(A.goals) && Number.isFinite(B.goals) && !(A.wo && B.wo);
  const { date, time } = splitTime(m.startTime);
  games.push({ id: m.id, raw: m, date, time, key: date + " " + time, a: A, b: B, played, location: m.location || "" });
}
games.sort((x, y) => x.key.localeCompare(y.key));

const table = new Map([...teams.values()].map(n => [n, { team: n, w: 0, d: 0, l: 0, gf: 0, ga: 0 }]));
const tally = (rows, g) => {
  for (const [me, other] of [[g.a, g.b], [g.b, g.a]]) {
    const row = rows.get(me.name); if (!row) continue;
    row.gf += me.goals; row.ga += other.goals; me.goals > other.goals ? row.w++ : me.goals < other.goals ? row.l++ : row.d++;
  }
};
const rank = rows => [...rows.values()].map(r => ({ ...r, pts: 3 * r.w + r.d, gd: r.gf - r.ga })).sort((x, y) => y.pts - x.pts || y.gd - x.gd || y.gf - x.gf || x.team.localeCompare(y.team, "sv"));
function positions(filter) { // team name -> 1-based position, from the matches that pass `filter`
  const rows = new Map([...teams.values()].map(n => [n, { team: n, w: 0, d: 0, l: 0, gf: 0, ga: 0 }]));
  let n = 0; for (const g of games) if (g.played && filter(g)) { tally(rows, g); n++; }
  return n ? new Map(rank(rows).map((r, i) => [r.team, i + 1])) : null;
}
for (const g of games) if (g.played) tally(table, g);

const odd = games.filter(g => !g.played && (g.raw.finished === true || (g.raw.result || []).length) && (g.a.id === usId || g.b.id === usId));
const mine = games.filter(g => g.a.id === usId || g.b.id === usId);
if (!mine.length) throw new Error(`No matches found for ${US}. Keeping the old data.json.`);

const old = JSON.parse(readFileSync("data.json", "utf8"));
const oldById = new Map((old.matches || []).map(m => [m.id, m]));
const letter = (f, ag) => (f > ag ? "W" : f < ag ? "L" : "D");
const matches = mine.map((g, i) => {
  const us = g.a.id === usId ? g.a : g.b, them = g.a.id === usId ? g.b : g.a;
  const before = d => positions(x => x.date < d), after = d => positions(x => x.date <= d);
  const pb = before(g.date), pa = g.played ? after(g.date) : null, now = g.played ? null : positions(() => true);
  const prior = games.filter(x => x.played && x.date < g.date);
  const form = prior.filter(x => x.a.id === them.id || x.b.id === them.id).slice(-5).map(x => { const o = x.a.id === them.id ? x.a : x.b, p = x.a.id === them.id ? x.b : x.a; return letter(o.goals, p.goals); });
  const meet = prior.filter(x => (x.a.id === us.id && x.b.id === them.id) || (x.b.id === us.id && x.a.id === them.id)).slice(-1)[0];
  const meetUs = meet && (meet.a.id === us.id ? meet.a : meet.b), meetThem = meet && (meet.a.id === us.id ? meet.b : meet.a);
  const posOf = (map, name) => (map && map.get(name)) || null;
  const m = {
    id: g.id, date: g.date, time: g.time, opp: them.name, pitch: g.location,
    gf: g.played ? us.goals : null, ga: g.played ? them.goals : null,
    walkover: g.played && (us.wo || them.wo) ? (us.wo ? "us" : "them") : null,
    round: i + 1, rounds: mine.length,
    h2h: meet ? { id: meet.id, date: meet.date, gf: meetUs.goals, ga: meetThem.goals, walkover: meetUs.wo || meetThem.wo ? (meetUs.wo ? "us" : "them") : null } : null,
    oppForm: form,
    pos: { teams: teams.size, us: [posOf(g.played ? pb : now, us.name), posOf(pa, us.name)], opp: [posOf(g.played ? pb : now, them.name), posOf(pa, them.name)] },
  };
  return m;
});

// ---- weather (Open-Meteo, free, no key). Played matches are fetched once and then kept. ----
const WEATHER_BASE = { forecast: "https://api.open-meteo.com/v1/forecast", archive: "https://archive-api.open-meteo.com/v1/archive" };
async function fetchWeather(date, time) {
  const today = splitTime(new Date().toISOString()).date, days = Math.round((Date.parse(date) - Date.parse(today)) / 864e5);
  if (days > 15) return null; // no forecast that far ahead yet
  const url = (days >= -80 ? WEATHER_BASE.forecast : WEATHER_BASE.archive) + "?" + new URLSearchParams({
    latitude: "59.3207", longitude: "18.0366", start_date: date, end_date: date, timezone: "Europe/Stockholm", wind_speed_unit: "ms",
    hourly: "temperature_2m,precipitation,weather_code,wind_speed_10m", daily: "sunrise,sunset",
  });
  let res, err;
  for (let i = 0; i < 4; i++) {
    try { res = await fetch(url, { signal: AbortSignal.timeout(20000) }); if (res.status === 429) { await new Promise(r => setTimeout(r, 2500 * (i + 1))); continue; } if (!res.ok) throw new Error("HTTP " + res.status); break; }
    catch (e) { err = e; res = null; await new Promise(r => setTimeout(r, 1500)); }
  }
  if (!res || !res.ok) throw new Error("weather request failed" + (err ? ": " + err.message : " (HTTP " + (res && res.status) + ")"));
  const j = await res.json(), h = j.hourly || {};
  const hh = Number(time.slice(0, 2)), idx = (h.time || []).findIndex(s => Number(s.slice(11, 13)) === hh);
  if (idx < 0) return null;
  const at = k => [idx, idx + 1].map(i => h[k] && h[k][i]).filter(v => typeof v === "number"); // kickoff hour and the one after
  const T = at("temperature_2m"), W = at("wind_speed_10m"), R = at("precipitation"), C = at("weather_code");
  if (!T.length) return null;
  const r1 = v => Math.round(v * 10) / 10, hm = s => (s ? String(s).slice(11, 16) : null);
  return { t: Math.round(T.reduce((x, y) => x + y, 0) / T.length), c: C.length ? Math.max(...C) : null, w: W.length ? r1(Math.max(...W)) : null, r: R.length ? r1(R.reduce((x, y) => x + y, 0)) : 0, sr: hm(j.daily && j.daily.sunrise && j.daily.sunrise[0]), ss: hm(j.daily && j.daily.sunset && j.daily.sunset[0]) };
}
let wFetched = 0, wFailed = 0;
for (const m of matches) {
  const prev = oldById.get(m.id);
  if (prev && prev.weather && m.gf !== null) { m.weather = prev.weather; continue; } // played: keep what we saved
  try { m.weather = await fetchWeather(m.date, m.time); wFetched++; await new Promise(r => setTimeout(r, 300)); }
  catch (e) { wFailed++; m.weather = prev && prev.weather ? prev.weather : null; console.warn(`Weather for ${m.date}: ${e.message}`); }
}

// Official table (handles walkovers, deductions). Validate every row before trusting it.
function officialTable(res) {
  const cols = (res.columns || []).map(c => `${c.name || ""} ${c.shortname || ""}`);
  const ix = re => cols.findIndex(c => re.test(c));
  const diffCol = ix(/\+\/-/);
  const I = { p: ix(/matcher/i), w: ix(/vinst/i), d: ix(/oavgjord/i), l: ix(/förlust/i), gf: ix(/(^|\s)gjorda/i), ga: ix(/insläppta/i) };
  if (Object.values(I).some(i => i < 0) || !Array.isArray(res.rows) || res.rows.length !== (res.teams || []).length) return null;
  const out = [];
  for (let r = 0; r < res.rows.length; r++) {
    const row = res.rows[r], name = teams.get(res.teams[r]);
    const v = Object.fromEntries(Object.entries(I).map(([k, i]) => [k, Number(row[i])]));
    if (!name || Object.values(v).some(n => !Number.isFinite(n)) || v.w + v.d + v.l !== v.p) return null;
    if (diffCol >= 0 && Number(row[diffCol]) !== v.gf - v.ga) return null; // goals must add up
    out.push({ team: name, w: v.w, d: v.d, l: v.l, gf: v.gf, ga: v.ga });
  }
  return out;
}
let finalTable = [...table.values()], source = "computed from results";
try {
  const off = officialTable(await getJson(`/api/memberapi/teamsport/result/for_division?division_id=${DIVISION_ID}`));
  if (off) { finalTable = off; source = "Zoezi table"; } else console.warn("Could not read Zoezi's table; using computed table.");
} catch (e) { console.warn("Zoezi table request failed (" + e.message + "); using computed table."); }
for (const g of odd) console.log("Unusual match (public league data):", JSON.stringify({ start: g.raw.startTime, finished: g.raw.finished, teams: g.raw.teams.map(x => x.name), result: (g.raw.result || []).map(r => ({ team: r.team_id, result: r.result, invalid_id: r.invalid_id })) }));

const next = { ...old, demo: false, matches, table: finalTable };
writeFileSync("data.json", JSON.stringify(next, null, 2) + "\n");
const done = matches.filter(m => m.gf !== null).length;
// sanity: our own count must agree with the official table
const mineRow = finalTable.find(r => r.team === US), W = matches.filter(m => m.gf !== null && m.gf > m.ga).length, D = matches.filter(m => m.gf !== null && m.gf === m.ga).length, L = done - W - D;
if (mineRow && (mineRow.w !== W || mineRow.d !== D || mineRow.l !== L)) console.warn(`Check: match list gives ${W}-${D}-${L} but the table says ${mineRow.w}-${mineRow.d}-${mineRow.l}.`);
const ours = rank(new Map(finalTable.map(r => [r.team, r]))).map(r => r.team).join("|"), theirs = rank(table).map(r => r.team).join("|");
if (ours !== theirs) console.warn("Check: standings computed from matches differ from the official table. Position history may be slightly off.");
console.log(`data.json updated: ${matches.length} matches (${done} played), ${next.table.length} teams. Table: ${source}. Weather: ${wFetched} fetched, ${wFailed} failed.`);
