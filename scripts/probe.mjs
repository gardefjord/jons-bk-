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
  v && typeof v === "object" ? (d > 2 ? "object" : "{" + Object.keys(v).slice(0, 25).map(k => `${k}:${shape(v[k], d + 1)}`).join(",") + "}") :
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
await page.goto(BASE, { waitUntil: "networkidle" });
const captcha = await page.locator('iframe[src*="recaptcha"],iframe[src*="hcaptcha"],iframe[src*="turnstile"],.g-recaptcha,.h-captcha').count();
if (captcha) notes.push("CAPTCHA present on the login page. Automated login is not possible.");

// Open a login form if it sits behind a link/button.
if (!(await page.locator('input[type="password"]').count())) {
  const link = page.getByRole("link", { name: /logga in|login|sign in/i }).first();
  if (await link.count()) { await link.click(); await page.waitForLoadState("networkidle"); }
}
const pw = page.locator('input[type="password"]:visible').first();
if (!(await pw.count())) notes.push("Could not find a visible password field.");
else {
  const u = page.locator('input[type="email"]:visible,input[type="text"]:visible,input[name*="user" i]:visible').first();
  await u.fill(user); await pw.fill(pass); await pw.press("Enter");
  await page.waitForLoadState("networkidle").catch(() => {});
  if (await page.locator('input[type="password"]:visible').count()) notes.push("Still on the login form after submitting. Wrong login, CAPTCHA, or 2FA.");
  if (await page.getByText(/verifieringskod|two-factor|2fa|engångskod|verification code/i).count()) notes.push("Two-factor / verification code requested. Automated login is not possible.");
}
// Visit likely pages so their data calls get recorded.
for (const p of ["", "#/schedule", "#/results", "#/table", "#/team", "#/my-team"]) {
  await page.goto(BASE + p, { waitUntil: "networkidle" }).catch(() => {});
}
const links = await page.$$eval("a[href]", as => [...new Set(as.map(a => a.getAttribute("href")))].slice(0, 60));
await browser.close();

const out = { notes, links, requests: Object.fromEntries(found) };
writeFileSync("probe-result.json", JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
