"use strict";
var US = "Jons BK";
var $ = function (id) { return document.getElementById(id); };
var root = $("root");
var PAGE = document.body.dataset.page;

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
var NAV = [["start", "Start", "index.html"], ["matcher", "Matcher", "matcher.html"], ["laget", "Laget", "laget.html"]];

/* ---------- gemensam ram ---------- */
function frame(inner, d) {
  d = d || {};
  var h = '<div class="wrap">';
  h += '<header class="mast"><a href="index.html" class="logo"><img src="assets/logo/jons-bk-roed.png" width="230" height="229" alt="Jons BK, till startsidan"></a><h1 class="sr">Jons BK</h1><p>Korpen Stockholm' + (d.league ? ' · ' + esc(d.league) : '') + '</p></header>';
  h += '<nav aria-label="Huvudmeny"><ul class="nav">' + NAV.map(function (n) { return '<li><a href="' + n[2] + '"' + (n[0] === PAGE ? ' aria-current="page"' : '') + '>' + n[1] + '</a></li>'; }).join("") + '</ul></nav>';
  h += '<main>' + inner + '</main>';
  h += '<footer class="foot"><img src="assets/logo/jons-bk-roed.png" width="44" height="44" alt=""><p class="love">Jons är kärlek</p><small>Matcher och tabell från Korpen Stockholm</small></footer></div>';
  root.innerHTML = h;
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
function nextCard(s, next) {
  var h = '<section aria-labelledby="h-next"><div class="card">';
  h += '<h2 class="nameplate" id="h-next">Nästa match</h2>';
  if (next) {
    var d = when(next);
    h += '<div class="scene"><span class="sticker">' + esc(countdown(d)) + '</span><div class="versus"><span class="us">Jons BK</span><span class="vs">mot</span><span class="them">' + esc(next.opp) + '</span></div></div>';
    h += '<div class="flame"><dl class="stats"><dt>Dag</dt><dd>' + esc(fmtDay(d, true)) + '</dd><dt>Avspark</dt><dd>' + esc(next.time || "Meddelas") + '</dd><dt>Plan</dt><dd>' + esc(next.pitch || s.venue) + '</dd><dt>Kärlek</dt><dd>100</dd></dl></div>';
  } else {
    h += '<div class="scene"><p class="empty">Ingen match är inbokad just nu.<br>Håll kärleken varm.</p></div>';
    h += '<div class="flame"><dl class="stats"><dt>Plan</dt><dd>' + esc(s.venue) + '</dd><dt>Kärlek</dt><dd>100</dd></dl></div>';
  }
  return h + '</div></section>';
}
function upcoming(s, later) {
  if (!later.length) return "";
  var h = '<ul class="rows">';
  later.forEach(function (m) { var d = when(m); h += '<li><span class="when">' + esc(fmtDay(d)) + ', ' + esc(m.time || "tid meddelas") + ' på ' + esc(m.pitch || s.venue) + '</span><span class="res up" aria-hidden="true">&hearts;</span><span class="opp">' + esc(m.opp) + '</span><span></span></li>'; });
  return sec("Kommande matcher", h + '</ul>');
}
function chip(r, small) { return '<span class="res ' + r + '" title="' + RES[r][1] + '" aria-label="' + RES[r][1] + '">' + RES[r][0] + '</span>'; }
function formRow(done) {
  if (!done.length) return "";
  var h = '<p class="form">Senaste fem ';
  done.slice(0, 5).reverse().forEach(function (m) { h += chip(resOf(m)); });
  return h + '</p>';
}
function resRows(list) {
  var h = '<ul class="rows">';
  list.forEach(function (m) { var r = resOf(m); h += '<li><span class="when">' + esc(fmtDay(when(m))) + '</span>' + chip(r) + '<span class="opp">' + esc(m.opp) + '</span><span class="score">' + esc(m.gf) + '&ndash;' + esc(m.ga) + '</span></li>'; });
  return h + '</ul>';
}
var LEGEND = '<p class="fine">Jons BK:s mål står alltid först i resultatet. V = vinst, O = oavgjort, L = lärdom.</p>';
function playedList(done) {
  if (!done.length) return '<p>Inga matcher spelade än den här säsongen. Det bästa är fortfarande på väg.</p>';
  return formRow(done) + resRows(done) + LEGEND;
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

function pageStart(s) {
  var L = lists(s), h = (s.demo ? DEMO : "") + nextCard(s, L.next) + upcoming(s, L.later);
  if (L.done.length) h += sec("Senaste resultat", resRows(L.done.slice(0, 5)) + LEGEND + '<p class="more"><a href="matcher.html#spelade">Alla resultat och tabellen <span aria-hidden="true">&rarr;</span></a></p>');
  h += '<section class="sec"><h2>Utforska</h2><div class="panel"><ul class="tiles">' +
    '<li><a href="matcher.html"><div><b>Matcher &amp; tabell</b><span>Resultat, kommande matcher och ställning</span></div><i>&rarr;</i></a></li>' +
    '<li><a href="laget.html"><div><b>Laget</b><span>Ett spelarkort med superkraft för varje hjärta</span></div><i>&rarr;</i></a></li>' +
    '</ul></div></section>';
  frame(h, s);
}
function pageMatcher(s) {
  var L = lists(s);
  frame((s.demo ? DEMO : "") + (L.next ? nextCard(s, L.next) : "") + upcoming(s, L.later) + sec("Spelade matcher", playedList(L.done), "spelade") + sec("Tabell", tableHtml(s), "tabell"), s);
}

/* ---------- laget ---------- */
var POS = { ST: "Anfallare", LW: "Vänsterytter", RW: "Högerytter", CM: "Central mittfältare", LB: "Vänsterback", RB: "Högerback", CB: "Mittback", MB: "Mittback", GK: "Målvakt" };
var PL = null, SERIES = [], cur = null, curSerie = null;
function seriesName(id) { var s = SERIES.filter(function (x) { return x.id === id; })[0]; return s ? s.namn : id; }
function order(p) { var ids = SERIES.map(function (s) { return s.id; }); return p.kort.slice().sort(function (a, b) { return ids.indexOf(a.serie) - ids.indexOf(b.serie); }); }
function pick(p, id) { return p.kort.filter(function (k) { return k.serie === id; })[0] || p.kort[0]; }
function tile(p) {
  var k = pick(p, "2026");
  return '<li><button class="tile" data-id="' + esc(p.id) + '" aria-label="Öppna spelarkortet för ' + esc(p.namn) + '"><img src="' + esc(k.bild) + '" width="250" height="390" loading="lazy" alt="' + esc(p.namn) + ', ' + esc((POS[k.pos] || k.pos).toLowerCase()) + ', Jons BK spelarkort"><b>' + esc(p.namn) + '</b><small>' + esc(POS[k.pos] || k.pos) + '</small></button></li>';
}
function pageLaget(d, data) {
  PL = data.spelare; SERIES = data.serier || [];
  var trupp = PL.filter(function (p) { return p.grupp === "trupp"; }), vanner = PL.filter(function (p) { return p.grupp !== "trupp"; });
  var h = '<p class="prose" style="margin:0 0 4px">Tryck på ett kort för att se superkraft, utmärkelser och hur korten har växt genom åren.</p>';
  h += sec("Truppen 2026", '<ul class="grid">' + trupp.map(tile).join("") + '</ul>');
  if (vanner.length) h += sec("Fler som delat bollen med oss", '<ul class="grid">' + vanner.map(tile).join("") + '</ul>');
  h += '<dialog class="spelare" id="dlg" aria-labelledby="dn"></dialog>';
  frame(h, d);
  root.addEventListener("click", function (e) { var b = e.target.closest(".tile"); if (b) openPlayer(b.dataset.id); });
  var dlg = $("dlg");
  dlg.addEventListener("click", function (e) { if (e.target === dlg || e.target.closest("[data-close]")) dlg.close(); var c = e.target.closest(".chip"); if (c) showSerie(c.dataset.s); });
}
function openPlayer(id) {
  cur = PL.filter(function (p) { return p.id === id; })[0]; if (!cur) return;
  curSerie = pick(cur, "2026").serie;
  var h = '<div class="ph"><div><h3 id="dn">' + esc(cur.namn) + ' ' + esc(cur.flagga || "") + '</h3><small id="dpos"></small></div><button class="btn sm" data-close>Stäng</button></div><div class="pb">';
  h += '<div class="pimg"><img id="dimg" alt=""></div>';
  h += '<div class="chips" role="group" aria-label="Kortserie">' + order(cur).map(function (k) { return '<button class="chip" data-s="' + esc(k.serie) + '" aria-pressed="false">' + esc(seriesName(k.serie)) + '</button>'; }).join("") + '</div>';
  h += '<h4>Så har kortet växt</h4><ul class="bars" id="dbars"></ul>';
  if (cur.superkraft) h += '<h4>Superkraft (' + esc(seriesName(cur.superkraft.serie || "2024")) + ')</h4><div class="kraft"><b>' + esc(cur.superkraft.namn) + '</b>' + esc(cur.superkraft.text) + '</div>';
  h += '<h4>Utmärkelser</h4><ul class="awards">' + ((cur.utnamningar || []).length ? cur.utnamningar.map(function (u) { return '<li>' + esc(u) + '</li>'; }).join("") : '<li>Här samlas utmärkelserna. Alla är nominerade.</li>') + '</ul>';
  h += '<div class="lovemeter">Kärlek 100 av 100<div class="bar" role="img" aria-label="Kärlek: 100 av 100"></div></div></div>';
  $("dlg").innerHTML = h; $("dlg").showModal(); showSerie(curSerie);
}
function showSerie(sid) {
  var k = pick(cur, sid); curSerie = k.serie;
  var img = $("dimg"); img.src = k.bild; img.alt = cur.namn + ", " + (POS[k.pos] || k.pos).toLowerCase() + ", kortserie " + seriesName(k.serie);
  $("dpos").textContent = (POS[k.pos] || k.pos) + " · " + seriesName(k.serie);
  document.querySelectorAll("#dlg .chip").forEach(function (c) { c.setAttribute("aria-pressed", c.dataset.s === k.serie ? "true" : "false"); });
  var ul = $("dbars"), same = ul.children.length === k.stats.length && Array.prototype.every.call(ul.children, function (li, i) { return li.dataset.l === k.stats[i][0]; });
  if (!same) ul.innerHTML = k.stats.map(function (s) { return '<li data-l="' + esc(s[0]) + '"><span></span><div class="bar"><i style="width:0"></i></div><b></b></li>'; }).join("");
  /* växtmarkeringar: bara uppåt, jämfört med närmast tidigare kortserie med årtal */
  var yrs = order(cur).filter(function (x) { return /^\d{4}$/.test(x.serie); }), pi = yrs.indexOf(k), prev = pi > 0 ? yrs[pi - 1] : null;
  Array.prototype.forEach.call(ul.children, function (li, i) {
    var lab = k.stats[i][0], was = prev && prev.stats.filter(function (s) { return s[0] === lab; })[0], up = was ? k.stats[i][1] - was[1] : 0;
    li.querySelector("span").innerHTML = esc(lab) + (up > 0 ? '<em title="Upp från ' + esc(prev.serie) + '">+' + up + ' &hearts;</em>' : "");
  });
  requestAnimationFrame(function () { requestAnimationFrame(function () {
    Array.prototype.forEach.call(ul.children, function (li, i) { li.querySelector("i").style.width = k.stats[i][1] + "%"; li.querySelector("b").textContent = k.stats[i][1]; });
  }); });
}

/* ---------- start ---------- */
var JOBS = {
  "start": function () { return getJson("data.json").then(pageStart); },
  "matcher": function () { return getJson("data.json").then(pageMatcher); },
  "laget": function () { return Promise.all([getJson("data.json"), getJson("spelare.json")]).then(function (r) { pageLaget(r[0], r[1]); }); }
};
(JOBS[PAGE] || JOBS.start)().catch(fail);
