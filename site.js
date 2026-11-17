"use strict";
var US = "Jons BK";
var $ = function (id) { return document.getElementById(id); };
var root = $("root");
var PAGE = document.body.dataset.page || (/matcher/.test(location.pathname) ? "matcher" : /laget/.test(location.pathname) ? "laget" : "start");

function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
function getJson(url) { return fetch(url, { cache: "no-store" }).then(function (r) { if (!r.ok) throw new Error(url); return r.json(); }); }
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

/* ---------- datum ---------- */
function played(m) { return m.gf !== null && m.gf !== "" && m.ga !== null && m.ga !== "" && m.gf !== undefined && m.ga !== undefined; }
function when(m) { var d = new Date((m.date || "1970-01-01") + "T" + (m.time || "00:00") + ":00"); return isNaN(d) ? new Date(0) : d; }
function dayDiff(d) { var a = new Date(); a.setHours(0, 0, 0, 0); var b = new Date(d); b.setHours(0, 0, 0, 0); return Math.round((b - a) / 864e5); }
function fmtDay(d, long) { return cap(d.toLocaleDateString("sv-SE", long ? { weekday: "long", day: "numeric", month: "long" } : { weekday: "short", day: "numeric", month: "short" }).replace(/\.$/, "")); }
function countdown(d) { var n = dayDiff(d); return n <= 0 ? "Idag" : n === 1 ? "Imorgon" : "Om " + n + " dagar"; }
function resOf(m) { var a = +m.gf, b = +m.ga; return a > b ? "W" : a < b ? "L" : "D"; }
var RES = { W: ["V", "Vinst"], D: ["O", "Oavgjort"], L: ["L", "Lärdom"] };

/* ---------- grafik ---------- */
var TITLES = { "start": "Start", "matcher": "Matcher", "laget": "Laget" };
var NAV = [["start", "Start", "index.html"], ["matcher", "Matcher", "matcher.html"], ["laget", "Laget", "laget.html"]];

/* ---------- gemensam ram ---------- */
function frame(inner, d) {
  d = d || {};
  var h = '<div class="wrap">';
  var logo = '<a href="index.html" class="logo"><img src="assets/logo/jons-bk-rosa.png" width="230" height="229" alt="Jons BK, till startsidan" decoding="async" fetchpriority="high"></a>';
  h += '<header class="mast' + (PAGE === "start" ? ' home' : '') + '">' + logo + '</header>';
  h += '<nav aria-label="Huvudmeny"><ul class="nav">' + NAV.map(function (n) { return '<li><a href="' + n[2] + '"' + (n[0] === PAGE ? ' aria-current="page"' : '') + '>' + n[1] + '</a></li>'; }).join("") + '</ul></nav>';
  h += '<main>' + (PAGE === "start" ? '<h1 class="sr">Jons BK</h1>' : '<h1 class="pagetitle">' + esc(TITLES[PAGE] || "") + '</h1>') + inner + '</main>';
  h += '<footer class="foot"><img src="assets/logo/jons-bk-rosa.png" width="44" height="44" alt=""><p class="love">Jons är kärlek</p><small>Matcher och tabell från Korpen Stockholm</small></footer></div>';
  root.innerHTML = h;
  /* Loggan visas direkt om den redan är hämtad, annars tonas den in när den är klar (ingen halvladdad bild syns) */
  var li = root.querySelector(".mast .logo img");
  if (li) {
    if (li.complete) li.className = "instant";
    else { li.addEventListener("load", function () { li.className = "ready"; }); li.addEventListener("error", function () { li.className = "instant"; }); }
  }
}
function fail() { frame('<p class="note">Vi kunde inte hämta sidans innehåll just nu. Försök igen om en stund, så rullar bollen vidare.</p>'); }
function sec(title, body, id) { return '<section class="sec"' + (id ? ' id="' + id + '"' : '') + '><h2>' + title + '</h2><div class="panel">' + body + '</div></section>'; }

/* ---------- matcher ---------- */
function lists(s) {
  var ms = (s.matches || []).slice(), cutoff = Date.now() - 3 * 36e5;
  var up = ms.filter(function (m) { return !played(m) && when(m).getTime() >= cutoff; }).sort(function (a, b) { return when(a) - when(b); });
  var done = ms.filter(played).sort(function (a, b) { return when(b) - when(a); });
  return { next: up[0], later: up.slice(1), done: done };
}
function nextCard(s, next, mode) {
  var h = '<section aria-labelledby="h-next"><div class="card">';
  h += '<h2 class="nameplate" id="h-next">Nästa match</h2>';
  if (next) {
    var d = when(next);
    h += '<div class="scene"><span class="sticker">' + esc(countdown(d)) + '</span><div class="versus"><span class="us">Jons BK</span><span class="vs">mot</span><span class="them">' + esc(next.opp) + '</span></div></div>';
    h += '<div class="flame"><dl class="stats"><dt>Dag</dt><dd>' + esc(fmtDay(d, true)) + '</dd><dt>Avspark</dt><dd>' + esc(next.time || "Meddelas") + '</dd><dt>Plan</dt><dd>' + esc(next.pitch || s.venue) + '</dd><dt>Kärlek</dt><dd>100</dd></dl>' + (next.id != null ? (mode === "a" ? '<a class="mnext" href="matcher.html#m' + esc(next.id) + '">Mer om matchen &rarr;</a>' : '<button type="button" class="mnext mopen" data-id="' + esc(next.id) + '">Mer om matchen &rarr;</button>') : '') + '</div>';
  } else {
    h += '<div class="scene"><p class="empty">Ingen match är inbokad just nu.<br>Håll kärleken varm.</p></div>';
    h += '<div class="flame"><dl class="stats"><dt>Plan</dt><dd>' + esc(s.venue) + '</dd><dt>Kärlek</dt><dd>100</dd></dl></div>';
  }
  return h + '</div></section>';
}
/* En matchrad: på startsidan en länk till matchen, på Matcher en knapp som öppnar lådan */
function rowTag(m, mode) {
  var id = esc(m.id);
  if (m.id == null) return ['<div class="mrow plain">', '</div>'];
  return mode === "a" ? ['<a class="mrow" href="matcher.html#m' + id + '" data-id="' + id + '">', '</a>'] : ['<button type="button" class="mrow" data-id="' + id + '">', '</button>'];
}
var CHEV = '<span class="chev" aria-hidden="true">&rsaquo;</span>';
function upcoming(s, later, mode) {
  if (!later.length) return "";
  var h = '<ul class="rows">';
  later.forEach(function (m) { var d = when(m), t = rowTag(m, mode); h += '<li>' + t[0] + '<span class="when">' + esc(fmtDay(d)) + ', ' + esc(m.time || "tid meddelas") + ' på ' + esc(m.pitch || s.venue) + '</span><span class="res up" aria-hidden="true">&hearts;</span><span class="opp">' + esc(m.opp) + '</span>' + CHEV + t[1] + '</li>'; });
  return sec("Kommande matcher", h + '</ul>');
}
function chip(r, small) { return '<span class="res ' + r + '" title="' + RES[r][1] + '" aria-label="' + RES[r][1] + '">' + RES[r][0] + '</span>'; }
function formRow(done) {
  if (!done.length) return "";
  var h = '<p class="form">Senaste fem ';
  done.slice(0, 5).reverse().forEach(function (m) { h += chip(resOf(m)); });
  return h + '</p>';
}
function resRows(list, mode) {
  var h = '<ul class="rows">';
  list.forEach(function (m) { var r = resOf(m), t = rowTag(m, mode); h += '<li>' + t[0] + '<span class="when">' + esc(fmtDay(when(m))) + (m.walkover ? ' &middot; walkover' : '') + '</span>' + chip(r) + '<span class="opp">' + esc(m.opp) + '</span><span class="score">' + esc(m.gf) + '&ndash;' + esc(m.ga) + '</span>' + CHEV + t[1] + '</li>'; });
  return h + '</ul>';
}
var LEGEND = '<p class="fine">Jons BK:s mål står alltid först i resultatet. V = vinst, O = oavgjort, L = lärdom.</p>';
function playedList(done, mode) {
  if (!done.length) return '<p>Inga matcher spelade än den här säsongen. Det bästa är fortfarande på väg.</p>';
  return formRow(done) + resRows(done, mode) + LEGEND;
}
function standings(s) {
  return (s.table || []).map(function (r) {
    var w = +r.w || 0, d = +r.d || 0, l = +r.l || 0, gf = +r.gf || 0, ga = +r.ga || 0;
    return { team: r.team, p: w + d + l, w: w, d: d, l: l, gd: gf - ga, gf: gf, pts: 3 * w + d };
  }).sort(function (a, b) { return b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.team.localeCompare(b.team, "sv"); });
}
function tableHtml(s) {
  var st = standings(s);
  if (!st.length) return '<p>Tabellen kommer snart.</p>';
  var h = '<div class="scroll"><table class="lg"><thead><tr><th scope="col">#</th><th scope="col" class="t">Lag</th><th scope="col" title="Spelade">S</th><th scope="col" title="Vunna">V</th><th scope="col" title="Oavgjorda">O</th><th scope="col" title="Förlorade">F</th><th scope="col" title="Målskillnad">+/-</th><th scope="col" title="Poäng">P</th></tr></thead><tbody>';
  st.forEach(function (r, i) { h += '<tr' + (r.team === US ? ' class="us"' : '') + '><td>' + (i + 1) + '</td><td class="t">' + esc(r.team) + '</td><td>' + r.p + '</td><td>' + r.w + '</td><td>' + r.d + '</td><td>' + r.l + '</td><td>' + (r.gd > 0 ? "+" : "") + r.gd + '</td><td class="pts">' + r.pts + '</td></tr>'; });
  return h + '</tbody></table></div><p class="fine">' + esc(s.league) + '. Tre poäng för vinst, en för oavgjort. Resultat och tabell hämtas automatiskt från <a href="https://korpenstockholm.zoezi.se/serie/8346">Korpen Stockholm</a>.</p>';
}
var DEMO = '<p class="note">Resultaten och tabellen här är exempel för att visa designen. De riktiga är på väg.</p>';

function pageStart(s, pl) {
  var L = lists(s), h = (s.demo ? DEMO : "") + nextCard(s, L.next, "a") + upcoming(s, L.later, "a");
  if (L.done.length) h += sec("Senaste resultat", resRows(L.done.slice(0, 5), "a") + LEGEND + '<p class="more"><a href="matcher.html#spelade">Alla resultat och tabellen <span aria-hidden="true">&rarr;</span></a></p>');
  if (pl && pl.spelare) {
    h += '<section class="sec"><h2>Laget</h2><div class="strip">' + pl.spelare.filter(function (p) { return p.grupp === "trupp"; }).map(function (p) { var k = pick(p, "2026"); return '<a href="laget.html#' + esc(p.id) + '"><img src="' + esc(k.bild) + '" width="250" height="390" loading="lazy" alt="' + esc(p.namn) + ', spelarkort"></a>'; }).join("") + '</div><p class="more strip-more"><a href="laget.html">Möt laget <span aria-hidden="true">&rarr;</span></a></p></section>';
  }
  frame(h, s);
}
function pageMatcher(s) {
  var L = lists(s);
  frame((s.demo ? DEMO : "") + (L.next ? nextCard(s, L.next, "btn") : "") + upcoming(s, L.later, "btn") + sec("Spelade matcher", playedList(L.done, "btn"), "spelade") + sec("Tabell", tableHtml(s), "tabell"), s);
  MS = (s.matches || []).filter(function (m) { return m.id != null; }).sort(function (a, b) { return when(a) - when(b); });
  if (!MS.length) return;
  document.body.insertAdjacentHTML("beforeend", drawerHtml("Match", ""));
  MDRAW = makeDrawer({
    row: ".mrow,.mopen", swipe: "#sbody",
    ids: function () { return MS.map(function (m) { return String(m.id); }); },
    show: showMatch,
    hash: function (id) { return "m" + id; },
    fromHash: function (h) { var x = /^m(\d+)$/.exec(h); return x && matchById(x[1]) ? x[1] : null; },
    onClick: function (e) { var j = e.target.closest("[data-match]"); if (j) MDRAW.jump(j.dataset.match); }
  });
}

/* ---------- en match ---------- */
var MS = [], MDRAW = null;
var WCODE = { 0: "Klart", 1: "Mestadels klart", 2: "Halvklart", 3: "Mulet", 45: "Dimma", 48: "Dimma", 51: "Lätt duggregn", 53: "Duggregn", 55: "Kraftigt duggregn", 56: "Underkylt duggregn", 57: "Underkylt duggregn", 61: "Lätt regn", 63: "Regn", 65: "Kraftigt regn", 66: "Isregn", 67: "Isregn", 71: "Lätt snöfall", 73: "Snöfall", 75: "Kraftigt snöfall", 77: "Snökorn", 80: "Lätta skurar", 81: "Skurar", 82: "Kraftiga skurar", 85: "Snöbyar", 86: "Kraftiga snöbyar", 95: "Åska", 96: "Åska med hagel", 99: "Åska med hagel" };
function matchById(id) { return MS.filter(function (m) { return String(m.id) === String(id); })[0]; }
function ordinal(n) { return n + (n === 1 || n === 2 ? ":a" : ":e"); }
function dec(n) { return String(n).replace(".", ","); }
function ourGoalsFirst(m) { return US + " " + m.gf + "\u2013" + m.ga + " " + m.opp; }
function mxPos(name, pair, isPlayed) {
  var b = pair && pair[0], a = pair && pair[1];
  if (!b && !a) return "";
  var cell = isPlayed ? (b && a ? (a === b ? '<span class="pp">oförändrad</span><span class="pp now">' + ordinal(a) + '</span>' : '<span class="pp">' + ordinal(b) + '</span><i aria-hidden="true">&rarr;</i><span class="pp now' + (a < b ? ' up' : '') + '">' + ordinal(a) + '</span>') : '<span class="pp now">' + ordinal(a || b) + '</span>') : '<span class="pp now">' + ordinal(b) + '</span>';
  return '<li><b>' + esc(name) + '</b><span class="posv">' + cell + '</span></li>';
}
function mxWeather(m, isPlayed) {
  var w = m.weather;
  if (m.walkover) return "";
  if (!w) return isPlayed ? "" : '<h4>Väderprognos</h4><p class="soft">Prognosen visas när matchen är närmare.</p>';
  var bits = [];
  if (w.w != null) bits.push("Vind " + dec(w.w) + " m/s");
  bits.push(w.r > 0 ? "Nederbörd " + dec(w.r) + " mm" : "Torrt");
  if (w.ss) bits.push("Solnedgång " + w.ss);
  var dark = w.ss && m.time && m.time >= w.ss;
  return '<h4>' + (isPlayed ? "Vädret under matchen" : "Väderprognos") + '</h4><div class="wx"><b>' + w.t + '\u00a0\u00b0C</b><span>' + esc(WCODE[w.c] || "") + '</span></div>' +
    '<p class="soft">' + bits.join(" \u00b7 ") + '</p>' + (dark ? '<p class="soft">' + (isPlayed ? "Det var mörkt när matchen började." : "Det blir mörkt när matchen börjar.") + '</p>' : '');
}
function showMatch(id) {
  var m = matchById(id); if (!m) return;
  var i = MS.indexOf(m), isPlayed = played(m), d = when(m), r = isPlayed ? resOf(m) : null, p = m.pos;
  var h = '<div class="pager"><button type="button" class="pg" data-go="-1" aria-label="Föregående match">&larr;</button><p class="count" aria-live="polite">' + (i + 1) + ' / ' + MS.length + '</p><button type="button" class="pg" data-go="1" aria-label="Nästa match">&rarr;</button></div>';
  h += '<div class="mx"><div class="who mxhead"><p class="mx-eyebrow">Match ' + (i + 1) + ' av ' + MS.length + '</p><h2 class="mx-title"><span>' + US + ' mot</span>' + esc(m.opp) + '</h2><p class="mx-when">' + esc(fmtDay(d, true)) + ' \u00b7 ' + esc(m.time || "tid meddelas") + '</p></div>';
  if (isPlayed) {
    h += '<div class="mx-result"><span class="res ' + r + '" aria-hidden="true">' + RES[r][0] + '</span><b>' + esc(m.gf) + '\u2013' + esc(m.ga) + '</b><small>' + RES[r][1] + '</small></div>';
    if (m.walkover) h += '<p class="mx-note">' + (m.walkover === "them" ? "Walkover: " + esc(m.opp) + " kom inte, så matchen skrevs som " + m.gf + "\u2013" + m.ga + " till oss." : "Walkover: vi lämnade walkover och matchen skrevs som " + m.gf + "\u2013" + m.ga + ". Det händer i de bästa lag.") + '</p>';
  } else {
    h += '<div class="mx-result"><span class="sticker">' + esc(countdown(d)) + '</span><small>Avspark ' + esc(m.time || "meddelas") + '</small></div>';
  }
  h += '<div class="detail">';
  h += '<h4>Matchen</h4><dl class="facts"><dt>Dag</dt><dd>' + esc(fmtDay(d, true)) + '</dd><dt>Avspark</dt><dd>' + esc(m.time || "Meddelas") + '</dd><dt>Plan</dt><dd>' + esc(m.pitch || "Långholmens BP") + ' <a class="ext" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&amp;query=L%C3%A5ngholmens+BP+Stockholm">Karta &#8599;</a></dd></dl>';
  h += mxWeather(m, isPlayed);
  if (p && (p.us || p.opp)) {
    var rows = mxPos(US, p.us, isPlayed) + mxPos(m.opp, p.opp, isPlayed);
    if (rows) h += '<h4>Tabellen</h4><ul class="tabl">' + rows + '</ul><p class="soft">' + (isPlayed ? ((p.us && p.us[0]) || (p.opp && p.opp[0]) ? "Placering före och efter matchdagen" : "Placering efter matchdagen") : "Placering just nu") + (p.teams ? ", av " + p.teams + " lag." : ".") + '</p>';
  }
  h += '<h4>Förra mötet</h4>';
  if (m.h2h) {
    var hh = { gf: m.h2h.gf, ga: m.h2h.ga, opp: m.opp }, hr = resOf(hh), body = '<span class="when">' + esc(fmtDay(when({ date: m.h2h.date, time: "00:00" }))) + (m.h2h.walkover ? ' \u00b7 walkover' : '') + '</span>' + chip(hr) + '<span class="opp">' + esc(ourGoalsFirst(hh)) + '</span>' + CHEV;
    h += '<ul class="rows"><li>' + (m.h2h.id != null && matchById(m.h2h.id) ? '<button type="button" class="mrow" data-match="' + esc(m.h2h.id) + '">' + body + '</button>' : '<div class="mrow plain">' + body + '</div>') + '</li></ul>';
  } else h += '<p class="soft">Första mötet med ' + esc(m.opp) + ' i år.</p>';
  h += '<h4>' + esc(m.opp) + ', senaste fem</h4>';
  if (m.oppForm && m.oppForm.length) h += '<p class="form" style="border:0;padding:0;margin:0">' + m.oppForm.map(function (x) { return chip(x); }).join("") + '</p>';
  else h += '<p class="soft">Första matchen för ' + esc(m.opp) + ' i år.</p>';
  h += '<p class="fine">Resultat och tabell från <a href="https://korpenstockholm.zoezi.se/serie/8346">Korpen Stockholm</a>. Väder från <a href="https://open-meteo.com/">Open-Meteo.com</a>.</p></div></div>';
  $("sbody").innerHTML = h;
  var mx = $("sbody").querySelector(".mx"); if (mx) replay(mx);
}

/* ---------- laget ---------- */
var POS = { ST: "Anfallare", LW: "Vänsterytter", RW: "Högerytter", CM: "Central mittfältare", LB: "Vänsterback", RB: "Högerback", CB: "Mittback", MB: "Mittback", GK: "Målvakt" };
var PL = null, SERIES = [], cur = null, curSerie = null;
function seriesName(id) { var s = SERIES.filter(function (x) { return x.id === id; })[0]; return s ? s.namn : id; }
function order(p) { var ids = SERIES.map(function (s) { return s.id; }); return p.kort.slice().sort(function (a, b) { return ids.indexOf(a.serie) - ids.indexOf(b.serie); }); }
function pick(p, id) { return p.kort.filter(function (k) { return k.serie === id; })[0] || p.kort[0]; }
/* ---------- lådan (delas av spelare och matcher) ---------- */
var PLAYER_BODY = '<div class="stage" id="stage"><img id="dimg" alt=""></div>' +
  '<div class="pager"><button type="button" class="pg" data-go="-1" aria-label="Föregående spelare">&larr;</button><p class="count" id="count" aria-live="polite"></p><button type="button" class="pg" data-go="1" aria-label="Nästa spelare">&rarr;</button></div>' +
  '<div class="who" id="who"><h2 id="dn"></h2><p id="dpos"></p></div>' +
  '<div class="detail"><div class="chips" id="chips" role="group" aria-label="Kortserie"></div><h4 id="sh"></h4><p class="legend" id="legend"></p><ul class="bars" id="dbars"></ul><div id="extra"></div>' +
  '<div class="lovemeter">Kärlek 100 av 100<div class="bar" role="img" aria-label="Kärlek: 100 av 100"></div></div></div>';
function drawerHtml(label, body) {
  return '<div class="sheet-backdrop" id="sbk"></div>' +
    '<div class="sheet" id="sheet" role="dialog" aria-modal="true" aria-label="' + label + '" aria-hidden="true" tabindex="-1">' +
    '<div class="sheet-head" id="shead"><span class="grab"></span><button type="button" class="sx" id="sclose" aria-label="Stäng">&times;</button></div>' +
    '<div class="sheet-body" id="sbody">' + body + '</div></div>';
}
/* cfg: row (väljare för raderna, med data-id), ids() (alla id i ordning), show(id) (fyller lådan), hash(id), fromHash(h) (id eller null), swipe (väljare där sidled svep byter) */
function makeDrawer(cfg) {
  var sheet = $("sheet"), sbody = $("sbody"), shead = $("shead"), bk = $("sbk"), isOpen = false, opener = null, curId = null;
  var OPEN_MS = 520, CLOSE_MS = 440, moveTimer = null;
  function insetFor(r) { return "inset(" + Math.max(0, r.top) + "px " + Math.max(0, innerWidth - r.right) + "px " + Math.max(0, innerHeight - r.bottom) + "px " + Math.max(0, r.left) + "px round 2px)"; }
  function rowEl(id) { return document.querySelector(cfg.row.split(",").map(function (s) { return s + '[data-id="' + id + '"]'; }).join(",")); }
  function jump(id) { curId = id; cfg.show(id); try { history.replaceState({ sheet: id }, "", "#" + cfg.hash(id)); } catch (e) {} sbody.scrollTo({ top: 0, behavior: "smooth" }); }
  function reduced() { return matchMedia("(prefers-reduced-motion: reduce)").matches; }
  function go(n) {
    var ids = cfg.ids(), i = (ids.indexOf(curId) + n + ids.length) % ids.length; curId = ids[i]; cfg.show(curId);
    try { history.replaceState({ sheet: curId }, "", "#" + cfg.hash(curId)); } catch (e) {} sbody.scrollTo({ top: 0, behavior: "smooth" });
  }
  function open(id, fromHash) {
    curId = id; cfg.show(id); isOpen = true; sbody.scrollTop = 0; sheet.style.transform = ""; bk.style.opacity = "";
    clearTimeout(moveTimer); sheet.classList.remove("morph-close");
    var row = fromHash ? null : rowEl(id), r = row && row.getBoundingClientRect();
    var morph = r && r.bottom > 0 && r.top < innerHeight && !reduced();
    if (morph) {
      sheet.classList.add("morph-open");
      sheet.style.clipPath = insetFor(r); sheet.style.setProperty("--sheet-bg", "var(--panel)");
      void sheet.offsetWidth;
      sheet.style.setProperty("--sheet-bg", "var(--bg)");
      sheet.style.clipPath = "inset(0px round 0px)";
      moveTimer = setTimeout(function () { sheet.classList.remove("morph-open"); sheet.style.clipPath = ""; sheet.style.removeProperty("--sheet-bg"); }, OPEN_MS + 40);
    }
    document.body.classList.add("sheet-open"); sheet.setAttribute("aria-hidden", "false");
    setTimeout(function () { sheet.focus({ preventScroll: true }); }, 60);
    if (!fromHash) { try { history.pushState({ sheet: id }, "", "#" + cfg.hash(id)); } catch (e) {} }
  }
  function finishClose() {
    sheet.classList.remove("morph-close"); sheet.style.clipPath = ""; sheet.style.removeProperty("--sheet-bg"); sheet.style.transition = "none";
    void sheet.offsetWidth; sheet.style.transition = "";
  }
  function close(fromPop, slide) {
    if (!isOpen) return; isOpen = false;
    sheet.classList.remove("dragging"); bk.style.opacity = "";
    var row = !slide && curId ? rowEl(curId) : null, morph = row && !reduced();
    if (morph) { row.scrollIntoView({ block: "center", behavior: "instant" }); }
    var r = morph && row.getBoundingClientRect();
    if (morph && r.bottom > 0 && r.top < innerHeight) {
      clearTimeout(moveTimer);
      sheet.style.transform = ""; sheet.classList.add("morph-close"); sheet.style.clipPath = "inset(0px round 0px)"; sheet.style.setProperty("--sheet-bg", "var(--bg)");
      void sheet.offsetWidth;
      sheet.style.setProperty("--sheet-bg", "var(--panel)"); sheet.style.clipPath = insetFor(r);
      moveTimer = setTimeout(finishClose, CLOSE_MS + 40);
    } else { sheet.style.transform = ""; }
    document.body.classList.remove("sheet-open"); sheet.setAttribute("aria-hidden", "true");
    if (opener) { try { (rowEl(curId) || opener).focus({ preventScroll: true }); } catch (e) {} }
    if (!fromPop) { try { if (history.state && history.state.sheet) history.back(); else history.replaceState(null, "", location.pathname + location.search); } catch (e) {} }
  }
  window.addEventListener("popstate", function () {
    var s = history.state && history.state.sheet;
    if (isOpen && !s) close(true); else if (!isOpen && s) open(s, true);
  });
  window.addEventListener("hashchange", function () { var id = cfg.fromHash(location.hash.slice(1)); if (!isOpen && id) open(id, true); });
  root.addEventListener("click", function (e) { var r = e.target.closest(cfg.row); if (r && r.dataset.id) { opener = r; open(r.dataset.id); } });
  sheet.addEventListener("click", function (e) {
    if (e.target.closest("#sclose")) return close();
    var g = e.target.closest("[data-go]"); if (g) return go(+g.dataset.go);
    if (cfg.onClick) cfg.onClick(e);
  });
  document.addEventListener("keydown", function (e) {
    if (!isOpen) return;
    if (e.key === "Escape") close(); else if (e.key === "ArrowLeft") go(-1); else if (e.key === "ArrowRight") go(1);
  });

  /* dra ner för att stänga: i handtaget (mus och touch) och i innehållet när det ligger längst upp */
  var drag = null;
  function dStart(y) { drag = { y0: y, dy: 0, t0: performance.now() }; sheet.classList.add("dragging"); }
  function dMove(y) { drag.dy = Math.max(0, y - drag.y0); sheet.style.transform = "translateY(" + drag.dy + "px)"; bk.style.opacity = String(1 - Math.min(0.6, drag.dy / (innerHeight * 0.9))); }
  function dEnd() {
    if (!drag) return; var dy = drag.dy, v = dy / Math.max(1, performance.now() - drag.t0); drag = null;
    sheet.classList.remove("dragging");
    if (dy > 110 || (dy > 30 && v > 0.55)) close(false, true); else { sheet.style.transform = ""; bk.style.opacity = ""; }
  }
  shead.addEventListener("pointerdown", function (e) { if (e.target.closest("#sclose")) return; shead.setPointerCapture(e.pointerId); dStart(e.clientY); });
  shead.addEventListener("pointermove", function (e) { if (drag) dMove(e.clientY); });
  shead.addEventListener("pointerup", dEnd); shead.addEventListener("pointercancel", dEnd);
  var ty = null, tx = null, mode = null;
  sbody.addEventListener("touchstart", function (e) { ty = e.touches[0].clientY; tx = e.touches[0].clientX; mode = null; }, { passive: true });
  sbody.addEventListener("touchmove", function (e) {
    if (ty === null) return; var dy = e.touches[0].clientY - ty, dx = e.touches[0].clientX - tx;
    if (!mode) { if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) mode = "x"; else if (dy > 8 && sbody.scrollTop <= 0) { mode = "y"; dStart(e.touches[0].clientY - dy); } else if (Math.abs(dy) > 8) mode = "scroll"; }
    if (mode === "y" && drag) { dMove(e.touches[0].clientY); e.preventDefault(); }
  }, { passive: false });
  sbody.addEventListener("touchend", function (e) {
    if (mode === "y") dEnd();
    else if (mode === "x" && e.target.closest(cfg.swipe)) { var dx = e.changedTouches[0].clientX - tx; if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1); }
    ty = null; mode = null;
  }, { passive: true });
  bk.addEventListener("click", function () { close(); });

  var h0 = cfg.fromHash(location.hash.slice(1));
  if (h0) { opener = null; open(h0, true); try { history.replaceState({ sheet: h0 }, "", "#" + cfg.hash(h0)); } catch (e) {} }
  return { open: open, close: close, go: go, jump: jump };
}

/* ---------- laget: spelarlista med kortlåda ---------- */
var SHORTP = { ST: "Anfallare", LW: "Vänsterytter", RW: "Högerytter", CM: "Mittfältare", LB: "Vänsterback", RB: "Högerback", CB: "Mittback", MB: "Mittback", GK: "Målvakt" };
function pos(p) { return SHORTP[pick(p, "2026").pos] || ""; }
function pageLaget(d, data) {
  SERIES = data.serier || [];
  PL = data.spelare.slice().sort(function (a, b) { return a.namn.localeCompare(b.namn, "sv"); });
  var h = '<ul class="plist" aria-label="Spelare">', last = "";
  PL.forEach(function (p) {
    var L = p.namn.charAt(0).toUpperCase();
    if (L !== last) { last = L; h += '<li class="pl-letter" aria-hidden="true">' + L + '</li>'; }
    var kk = pick(p, "2026");
    h += '<li><button type="button" class="prow" data-id="' + esc(p.id) + '"><img class="av" src="assets/avatars/' + esc(p.id) + '.jpg" alt="" width="64" height="64" loading="lazy"><span class="pt"><b>' + esc(p.namn) + ' ' + esc(p.flagga || "") + '</b><small>' + esc(pos(p)) + '</small>' + (p.superkraft ? '<em>' + esc(p.superkraft.namn) + '</em>' : '') + '</span><span class="mini"><img src="' + esc(kk.bild) + '" alt="" width="250" height="390" loading="lazy"></span></button></li>';
  });
  frame(h + '</ul>', d);
  document.body.insertAdjacentHTML("beforeend", drawerHtml("Spelarkort", PLAYER_BODY));
  makeDrawer({
    row: ".prow", swipe: "#stage",
    ids: function () { return PL.map(function (p) { return p.id; }); },
    show: function (id) { select(id, true); },
    hash: function (id) { return id; },
    fromHash: function (h) { return PL.some(function (p) { return p.id === h; }) ? h : null; },
    onClick: function (e) { var c = e.target.closest(".chip"); if (c) showSerie(c.dataset.s, 0); }
  });
}


function replay(el) { el.classList.remove("swap"); void el.offsetWidth; el.classList.add("swap"); }
function yearCards(p) { return order(p).filter(function (x) { return /^\d{4}$/.test(x.serie); }); }
function select(id, quiet) {
  var p = PL.filter(function (x) { return x.id === id; })[0]; if (!p || p === cur) return;
  var dir = cur ? (PL.indexOf(p) > PL.indexOf(cur) ? 1 : -1) : 0;
  cur = p;
  $("count").textContent = (PL.indexOf(cur) + 1) + " / " + PL.length;
  $("dn").innerHTML = esc(cur.namn) + ' ' + esc(cur.flagga || "");
  $("chips").innerHTML = order(cur).map(function (k) { return '<button type="button" class="chip" data-s="' + esc(k.serie) + '" aria-pressed="false">' + esc(seriesName(k.serie)) + '</button>'; }).join("");
  var x = "";
  if (cur.superkraft) x += '<h4>Superkraft (' + esc(seriesName(cur.superkraft.serie || "2024")) + ')</h4><div class="kraft"><b>' + esc(cur.superkraft.namn) + '</b>' + esc(cur.superkraft.text) + '</div>';
  if (cur.forebild && cur.forebild.namn) x += '<h4>Spelar i samma anda som</h4><p class="proname">' + esc(cur.forebild.namn) + '</p>';
  x += '<h4>Utmärkelser</h4><ul class="awards">' + ((cur.utnamningar || []).length ? cur.utnamningar.map(function (u) { return '<li>' + esc(u) + '</li>'; }).join("") : '<li>Här samlas utmärkelserna. Alla är nominerade.</li>') + '</ul>';
  $("extra").innerHTML = x;
  if (dir) { replay($("who")); replay($("extra")); }
  var ys = yearCards(cur);
  showSerie((ys.length ? ys[ys.length - 1] : cur.kort[0]).serie, dir);
  if (!quiet) { try { history.replaceState(null, "", "#" + id); } catch (e) {} }
}
var imgTok = 0;
function swapImg(src, alt, dir) {
  var img = $("dimg"), tok = ++imgTok;
  if (!img.getAttribute("src")) { img.src = src; img.alt = alt; return; }
  if (img.getAttribute("src") === src) return;
  var pre = new Image(); pre.src = src;
  img.style.setProperty("--dx", (-dir * 28) + "px"); img.classList.add("out");
  setTimeout(function () {
    if (tok !== imgTok) return;
    function show() { if (tok !== imgTok) return; img.src = src; img.alt = alt; img.classList.add("jump"); img.style.setProperty("--dx", (dir * 28) + "px"); void img.offsetWidth; img.classList.remove("jump"); img.classList.remove("out"); }
    if (pre.complete) show(); else { pre.onload = show; pre.onerror = show; }
  }, 170);
}
function countTo(el, to) {
  var from = +el.textContent || 0; if (from === to) { el.textContent = to; return; }
  if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) { el.textContent = to; return; }
  var t0 = null; el._to = to;
  function tick(t) { if (el._to !== to) return; if (!t0) t0 = t; var k = Math.min(1, (t - t0) / 500), e = 1 - Math.pow(1 - k, 3); el.textContent = Math.round(from + (to - from) * e); if (k < 1) requestAnimationFrame(tick); }
  requestAnimationFrame(tick);
}
/* Statistik: har spelaren kort från flera år visas åren under varandra för varje värde, så att utvecklingen syns direkt. */
function showSerie(sid, dir) {
  var k = pick(cur, sid); curSerie = k.serie;
  swapImg(k.bild, cur.namn + ", " + (POS[k.pos] || k.pos).toLowerCase() + ", kortserie " + seriesName(k.serie), dir || 0);
  $("dpos").textContent = (POS[k.pos] || k.pos) + " · " + seriesName(k.serie);
  document.querySelectorAll("#chips .chip").forEach(function (c) { c.setAttribute("aria-pressed", c.dataset.s === k.serie ? "true" : "false"); });
  var ys = yearCards(cur), compare = ys.length > 1 && ys.indexOf(k) >= 0, cards = compare ? ys : [k], last = cards[cards.length - 1];
  var rows = last.stats.map(function (s) { return s[0]; });
  cards.forEach(function (c) { c.stats.forEach(function (s) { if (rows.indexOf(s[0]) < 0) rows.push(s[0]); }); });
  function val(c, lab) { var s = c.stats.filter(function (x) { return x[0] === lab; })[0]; return s ? s[1] : null; }
  $("sh").textContent = compare ? "Utveckling " + cards[0].serie + " → " + last.serie : "Kortets värden · " + seriesName(k.serie);
  $("legend").innerHTML = compare ? cards.map(function (c, i) { return '<span class="key k' + (i === cards.length - 1 ? 'new' : 'old') + '"></span>' + esc(c.serie); }).join(" ") : "";
  var ul = $("dbars"), sig = cards.map(function (c) { return c.serie; }).join("|") + "::" + rows.join("|");
  if (ul.dataset.sig !== sig) {
    ul.dataset.sig = sig;
    ul.innerHTML = rows.map(function (lab) {
      return '<li><span class="lab">' + esc(lab) + '</span><div class="tracks">' + cards.map(function (c, i) { return '<div class="bar ' + (i === cards.length - 1 ? 'new' : 'old') + '" data-s="' + esc(c.serie) + '"><i style="width:0"></i></div>'; }).join("") + '</div>' +
        '<span class="nums">' + (compare ? '<small>0</small><span class="arr" aria-hidden="true">→</span>' : '') + '<b>0</b></span><em></em></li>';
    }).join("");
    replay(ul);
  }
  ul.classList.toggle("compare", compare);
  requestAnimationFrame(function () { requestAnimationFrame(function () {
    Array.prototype.forEach.call(ul.children, function (li, r) {
      var lab = rows[r], vNew = val(last, lab), vOld = compare ? val(cards[0], lab) : null;
      cards.forEach(function (c, i) { var v = val(c, lab), bar = li.querySelectorAll(".bar")[i]; bar.querySelector("i").style.width = (v === null ? 0 : v) + "%"; bar.classList.toggle("on", c === k); });
      var b = li.querySelector("b"), sm = li.querySelector("small"), arr = li.querySelector(".arr"), em = li.querySelector("em");
      if (vNew === null) { b.textContent = "–"; } else countTo(b, vNew);
      if (sm) { if (vOld === null) { sm.textContent = ""; arr.style.visibility = "hidden"; } else { arr.style.visibility = ""; countTo(sm, vOld); } }
      var up = (vOld !== null && vNew !== null) ? vNew - vOld : 0;
      em.textContent = up > 0 ? "+" + up + " ♥" : "";
      li.setAttribute("aria-label", lab + ": " + (compare && vOld !== null ? cards[0].serie + " " + vOld + ", " + last.serie + " " + (vNew === null ? "saknas" : vNew) : (vNew === null ? "saknas" : vNew)));
    });
  }); });
}

/* ---------- start ---------- */
var JOBS = {
  "start": function () { return Promise.all([getJson("data.json"), getJson("spelare.json").catch(function () { return null; })]).then(function (r) { SERIES = (r[1] && r[1].serier) || []; pageStart(r[0], r[1]); }); },
  "matcher": function () { return getJson("data.json").then(pageMatcher); },
  "laget": function () { return Promise.all([getJson("data.json"), getJson("spelare.json")]).then(function (r) { pageLaget(r[0], r[1]); }); }
};
(JOBS[PAGE] || JOBS.start)().catch(fail);
