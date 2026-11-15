// Updates data.json from Korpen / Zoezi.
// STATUS: not wired up yet. Run the "Probe Zoezi" workflow first to find the
// JSON endpoints the logged-in pages use, then fill in fetchFromZoezi() below.
// Credentials come only from env vars KORPEN_USER / KORPEN_PASS. Never log them.
import { readFileSync, writeFileSync } from "node:fs";

const user = process.env.KORPEN_USER;
const pass = process.env.KORPEN_PASS;

async function fetchFromZoezi(/* user, pass */) {
  // TODO after probe: log in, call the discovered JSON endpoints, and return
  // { league, venue, matches: [{date,time,opp,pitch,gf,ga}], table: [{team,w,d,l,gf,ga}] }
  return null;
}

if (!user || !pass) {
  console.log("KORPEN_USER / KORPEN_PASS not set. Leaving data.json unchanged.");
  process.exit(0);
}
const fresh = await fetchFromZoezi();
if (!fresh) {
  console.log("Zoezi fetch not implemented yet. Leaving data.json unchanged.");
  process.exit(0);
}
if (!Array.isArray(fresh.matches) || !Array.isArray(fresh.table) || !fresh.table.length) {
  console.error("Fetched data looks wrong. Keeping the old data.json.");
  process.exit(1);
}
const old = JSON.parse(readFileSync("data.json", "utf8"));
const next = { ...old, ...fresh, demo: false };
writeFileSync("data.json", JSON.stringify(next, null, 2) + "\n");
console.log(`data.json updated: ${next.matches.length} matches, ${next.table.length} teams.`);
