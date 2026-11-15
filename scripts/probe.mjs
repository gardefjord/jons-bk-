// One-off discovery. Logs in to Zoezi in a headless browser and lists the JSON
// requests the pages make (path, status, shape only). It never prints request
// headers, cookies, bodies or credentials, and strips query values from URLs.
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const BASE = "https://korpenstockholm.zoezi.se/";
const user = process.env.KORPEN_USER, pass = process.env.KORPEN_PASS;
if (!user || !pass) { console.error("Secrets missing."); process.exit(1); }

const shape = (v, d = 0) =>
  Array.isArray(v) ? `array(${v.length})<${v.length ? shape(v[0], d + 1) : ""}>` :
  v && typeof v === "object" ? (d > 3 ? "object" : "{" + Object.keys(v).slice(0, 25).map(k => `${k}:${shape(v[k], d + 1)}`).join(",") + "}") :
  typeof v;
const clean = u => { const x = new URL(u); return x.origin + x.pathname + (x.search ? "?" + [...x.searchParams.keys()].join("&") : ""); };

const found = new Map();
const browser = await chromium.launch();
const page = await browser.newPage();
page.on("response", async r => {
  try {
    if (!new URL(r.url()).hostname.endsWith("zoezi.se")) return;
    if (!(r.headers()["content-type"] || "").includes("json")) return;
    const key = r.request().method() + " " + clean(r.url());
    if (!found.has(key)) found.set(key, { status: r.status(), shape: shape(await r.json()) });
  } catch {}
});

const notes = [];
// Zoezi keeps polling, so "networkidle" never fires. Use a short fixed settle instead.
const settle = async () => { await page.waitForLoadState("load", { timeout: 15000 }).catch(() => {}); await page.waitForTimeout(2000); const c = page.getByRole("button", { name: /^(Avvisa|Acceptera alla)$/ }).first(); if (await c.count()) { await c.click({ timeout: 3000 }).catch(() => {}); await page.waitForTimeout(1000); } };
const go = async url => { await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 }).catch(e => notes.push("Could not open " + url.replace(BASE, "/") + ": " + e.name)); await settle(); };
await go(BASE + "login");
const captcha = await page.locator('iframe[src*="recaptcha"],iframe[src*="hcaptcha"],iframe[src*="turnstile"],.g-recaptcha,.h-captcha').count();
if (captcha) notes.push("CAPTCHA present on the login page. Automated login is not possible.");

// Open a login form if it sits behind a link/button.
if (!(await page.locator('input[type="password"]').count())) {
  const link = page.getByRole("link", { name: /logga in|login|sign in/i }).first();
  if (await link.count()) { await link.click(); await settle(); }
}
if (!(await page.locator('input[type="password"]:visible').count())) {
  const labels = await page.$$eval("button,a,[role=button]", els => els.map(e => (e.textContent || "").trim().slice(0, 40)).filter(Boolean).slice(0, 25));
  notes.push("Login page buttons/links: " + JSON.stringify(labels));
  const mail = page.getByText(/e-?post|mail|användarnamn|username/i).first();
  if (await mail.count()) { await mail.click().catch(() => {}); await settle(); }
}
if (!(await page.locator('input[type="password"]:visible').count())) {
  const li = page.getByText(/^\s*logga in\s*$/i).first();
  if (await li.count()) { await li.click({ timeout: 5000 }).catch(() => {}); await settle(); notes.push("Clicked 'Logga in'."); }
  notes.push("Page text on login page: " + JSON.stringify((await page.innerText("body").catch(() => "")).replace(/\s+/g, " ").slice(0, 400)));
}
const pw = page.locator('input[type="password"]:visible').first();
if (!(await pw.count())) notes.push("Could not find a visible password field.");
else {
  const u = page.locator('input[type="email"]:visible,input[type="text"]:visible,input[name*="user" i]:visible').first();
  await u.fill(user); await pw.fill(pass); await pw.press("Enter");
  await settle();
  if (await page.locator('input[type="password"]:visible').count()) notes.push("Still on the login form after submitting. Wrong login, CAPTCHA, or 2FA.");
  if (await page.getByText(/verifieringskod|two-factor|2fa|engångskod|verification code/i).count()) notes.push("Two-factor / verification code requested. Automated login is not possible.");
}
// Visit competition pages, then follow links that look like league data.
const seen = new Set();
const visit = async path => { if (seen.has(path)) return; seen.add(path); await go(new URL(path, BASE).href); };
for (const p of ["schema", "tavlingskategorier", "aktuellt"]) await visit(p);
const hrefs = async () => await page.$$eval("a[href^='/']", as => [...new Set(as.map(a => a.getAttribute("href")))]);
const want = /tavling|serie|tabell|lag|match|resultat|mina|kalender|schema|kurser|division|liga/i;
for (const h of (await hrefs()).filter(h => want.test(h)).slice(0, 14)) await visit(h);
// Competition pages use clickable cards, not links. Click a few and let their data calls be recorded.
const SKIP = /^(start|tävling|schema\/boka pass|butik|aktuellt|om oss|logga in|avvisa|acceptera alla|anpassa|visa mer|spara.*|nödvändig|funktionell|analytics|prestanda|annons|okategoriserad)$/i;
for (const base of ["tavlingskategorier", "schema"]) {
  await go(new URL(base, BASE).href);
  const labels = await page.$$eval("a,button,[role=button],[class*=card i],[class*=category i],[class*=item i]", els => [...new Set(els.map(e => (e.textContent || "").trim().replace(/\s+/g, " ")).filter(x => x && x.length < 60))].slice(0, 40));
  notes.push("Clickables on /" + base + ": " + JSON.stringify(labels));
  const targets = labels.filter(l => !SKIP.test(l)).slice(0, 6);
  for (const label of targets) {
    await page.getByText(label, { exact: true }).first().click({ timeout: 4000 }).catch(() => {});
    await settle();
    notes.push("Clicked '" + label + "' -> " + new URL(page.url()).pathname);
    await go(new URL(base, BASE).href);
  }
}
const links = await page.$$eval("a[href]", as => [...new Set(as.map(a => a.getAttribute("href")))].slice(0, 60));
await browser.close();

const out = { notes, visited: [...seen], links, requests: Object.fromEntries(found) };
writeFileSync("probe-result.json", JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
