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
var CREST = '<svg viewBox="0 0 68 78" aria-hidden="true"><path d="M34 3 62 11v27c0 19-12 30-28 37C18 68 6 57 6 38V11z" fill="#f6d51f" stroke="#1b1408" stroke-width="4" stroke-linejoin="round"/><path d="M34 12 54 17.5v20c0 14-8.500 22-20 28-11.500-6.500-20-14-20-28v-20z" fill="none" stroke="#d3202b" stroke-width="2.500"/><path d="M34 54c-9-6.500-14-11-14-17.500 0-4.500 3.300-7.500 7.200-7.500 2.800 0 5.300 1.500 6.800 4 1.500-2.500 4-4 6.800-4 3.900 0 7.200 3 7.200 7.500C48 43 43 47.500 34 54z" fill="#d3202b" stroke="#1b1408" stroke-width="2.500" stroke-linejoin="round"/></svg>';
var SPARK = '<svg viewBox="0 0 60 60" aria-hidden="true"><path d="M30 0c1.500 18 4 26 30 30-26 4-28.500 12-30 30-1.500-18-4-26-30-30 26-4 28.500-12 30-30z" fill="#fff"/></svg>';
var DEFS = '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><filter id="rough" x="-5%" y="-10%" width="110%" height="120%"><feTurbulence type="fractalNoise" baseFrequency=".035 .06" numOctaves="2" seed="7"/><feDisplacementMap in="SourceGraphic" scale="9"/></filter></svg>';
var HEART = '<svg class="heart" viewBox="0 0 120 108" role="img" aria-label="Ett hjärta med texten Jons BK"><path d="M60 102C24 76 6 56 6 34 6 18 18 8 33 8c11 0 21 6 27 16C66 14 76 8 87 8c15 0 27 10 27 26 0 22-18 42-54 68z" fill="#d3202b" stroke="#1b1408" stroke-width="5" stroke-linejoin="round"/><text x="60" y="48" text-anchor="middle" font-family="Rammetto One,Arial Black,sans-serif" font-size="22" fill="#f6d51f" stroke="#1b1408" stroke-width="1.2" paint-order="stroke">JONS</text><text x="60" y="74" text-anchor="middle" font-family="Rammetto One,Arial Black,sans-serif" font-size="22" fill="#f6d51f" stroke="#1b1408" stroke-width="1.2" paint-order="stroke">BK</text></svg>';
var NAV = [["start", "Start", "index.html"], ["matcher", "Matcher", "matcher.html"], ["laget", "Laget", "laget.html"], ["galleri", "Galleri", "galleri.html"], ["om-oss", "Om oss", "om-oss.html"]];

/* ---------- gemensam ram ---------- */
function frame(inner, d) {
  d = d || {};
  var h = DEFS + '<div class="wrap">';
  h += '<header class="mast"><a href="index.html" class="crest" aria-label="Jons BK, till startsidan">' + CREST + '</a><div><h1><a href="index.html">Jons BK</a></h1><p>Korpen Stockholm' + (d.league ? ', ' + esc(d.league) : '') + '</p></div></header>';
  h += '<div class="ticker" aria-hidden="true"><span>Jons är kärlek <b>&hearts;</b> Söndagar på ' + esc(d.venue || "Långholmens BP") + ' <b>&hearts;</b> Passa bollen, passa kärleken <b>&hearts;</b> Styrka 95, kärlek 100 <b>&hearts;</b> Fotboll är vackert <b>&hearts;</b></span></div>';
  h += '<nav aria-label="Huvudmeny"><ul class="nav">' + NAV.map(function (n) { return '<li><a href="' + n[2] + '"' + (n[0] === PAGE ? ' aria-current="page"' : '') + '>' + n[1] + '</a></li>'; }).join("") + '</ul></nav>';
  h += '<main>' + inner + '</main>';
  h += '<footer class="foot"><p class="love">Jons är kärlek</p><small>Bäst i Netscape Navigator 4.0 i 800&times;600</small></footer></div>';
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
  var h = '<section aria-labelledby="h-next"><div class="card"><div class="card-in plate">';
  h += '<i class="screw s1"></i><i class="screw s2"></i><i class="screw s3"></i><i class="screw s4"></i><span class="spark sp1">' + SPARK + '</span><span class="spark sp2">' + SPARK + '</span>';
  h += '<h2 class="nameplate" id="h-next"><span class="yr">20<br>26</span>' + CREST + '<span>Nästa<br>match</span></h2>';
  if (next) {
    var d = when(next);
    h += '<div class="scene"><span class="sticker">' + esc(countdown(d)) + '</span><div class="versus"><span class="us">Jons BK</span><span class="vs">mot</span><span class="them">' + esc(next.opp) + '</span></div></div>';
    h += '<div class="flame"><dl class="stats"><dt>Dag</dt><dd>' + esc(fmtDay(d, true)) + '</dd><dt>Avspark</dt><dd>' + esc(next.time || "Meddelas") + '</dd><dt>Plan</dt><dd>' + esc(next.pitch || s.venue) + '</dd><dt>Kärlek</dt><dd>100</dd></dl></div>';
  } else {
    h += '<div class="scene"><p class="empty">Ingen match är inbokad just nu.<br>Håll kärleken varm.</p></div>';
    h += '<div class="flame"><dl class="stats"><dt>Plan</dt><dd>' + esc(s.venue) + '</dd><dt>Kärlek</dt><dd>100</dd></dl></div>';
  }
  return h + '</div></div></section>';
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
function playedList(done) {
  if (!done.length) return '<p>Inga matcher spelade än den här säsongen. Det bästa är fortfarande på väg.</p>';
  var h = formRow(done) + '<ul class="rows">';
  done.forEach(function (m) { var r = resOf(m); h += '<li><span class="when">' + esc(fmtDay(when(m))) + '</span>' + chip(r) + '<span class="opp">' + esc(m.opp) + '</span><span class="score">' + esc(m.gf) + '&ndash;' + esc(m.ga) + '</span></li>'; });
  return h + '</ul><p class="fine">Jons BK:s mål står alltid först i resultatet. V = vinst, O = oavgjort, L = lärdom.</p>';
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
  if (L.done.length) h += sec("Formen just nu", formRow(L.done).replace(/^<p class="form">/, '<p class="form" style="border:0;margin:0">') + '<p class="fine">V = vinst, O = oavgjort, L = lärdom. Varje match är ett tillfälle att spela fotboll tillsammans.</p>');
  h += sec("Välkommen", '<div class="prose"><p>Jons BK spelar sjumannafotboll i Korpen Stockholm. Här samlar vi matcherna, tabellen och oss själva, på det sätt som passar oss bäst: med värme, glädje och bollen som rullar.</p><p>Fotboll är vackert. Det är ännu vackrare tillsammans.</p></div>');
  h += '<section class="sec"><h2>Utforska</h2><div class="panel"><ul class="tiles">' +
    '<li><a href="matcher.html"><div><b>Matcher &amp; tabell</b><span>Resultat, kommande matcher och ställning</span></div><i>&rarr;</i></a></li>' +
    '<li><a href="laget.html"><div><b>Laget</b><span>Ett spelarkort med superkraft för varje hjärta</span></div><i>&rarr;</i></a></li>' +
    '<li><a href="galleri.html"><div><b>Galleri</b><span>Bilder och minnen</span></div><i>&rarr;</i></a></li>' +
    '<li><a href="om-oss.html"><div><b>Om oss</b><span>Vad Jons BK handlar om</span></div><i>&rarr;</i></a></li></ul></div></section>';
  frame(h, s);
}
function pageMatcher(s) {
  var L = lists(s);
  frame((s.demo ? DEMO : "") + (L.next ? nextCard(s, L.next) : "") + upcoming(s, L.later) + sec("Spelade matcher", playedList(L.done)) + sec("Tabell", tableHtml(s)), s);
}

/* ---------- laget ---------- */
var POS = { ST: "Anfallare", LW: "Vänsterytter", RW: "Högerytter", CM: "Central mittfältare", LB: "Vänsterback", RB: "Högerback", CB: "Mittback", MB: "Mittback", GK: "Målvakt" };
var PL = null, SERIES = [], cur = null, curSerie = null;
function seriesName(id) { var s = SERIES.filter(function (x) { return x.id === id; })[0]; return s ? s.namn : id; }
function pick(p, id) { return p.kort.filter(function (k) { return k.serie === id; })[0] || p.kort[0]; }
function tile(p) {
  var k = pick(p, "2026");
  return '<li><button class="tile" data-id="' + esc(p.id) + '" aria-label="Öppna spelarkortet för ' + esc(p.namn) + '"><img src="' + esc(k.bild) + '" width="250" height="390" loading="lazy" alt="' + esc(p.namn) + ', ' + esc((POS[k.pos] || k.pos).toLowerCase()) + ', Jons BK spelarkort"><b>' + esc(p.namn) + '</b><small>' + esc(POS[k.pos] || k.pos) + '</small><span class="pt">&hearts; 100</span></button></li>';
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
  h += '<div class="chips" role="group" aria-label="Kortserie">' + cur.kort.map(function (k) { return '<button class="chip" data-s="' + esc(k.serie) + '" aria-pressed="false">' + esc(seriesName(k.serie)) + '</button>'; }).join("") + '</div>';
  h += '<h4>Så har kortet växt</h4><ul class="bars" id="dbars"></ul>';
  if (cur.superkraft) h += '<h4>Superkraft (' + esc(seriesName(cur.superkraft.serie || "stal")) + ')</h4><div class="kraft"><b>' + esc(cur.superkraft.namn) + '</b>' + esc(cur.superkraft.text) + '</div>';
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
  if (!same) ul.innerHTML = k.stats.map(function (s) { return '<li data-l="' + esc(s[0]) + '"><span>' + esc(s[0]) + '</span><div class="bar"><i style="width:0"></i></div><b></b></li>'; }).join("");
  requestAnimationFrame(function () { requestAnimationFrame(function () {
    Array.prototype.forEach.call(ul.children, function (li, i) { li.querySelector("i").style.width = k.stats[i][1] + "%"; li.querySelector("b").textContent = k.stats[i][1]; });
  }); });
}

/* ---------- galleri ---------- */
function pageGalleri(d, data) {
  var fig = data.foton.map(function (f) { return '<figure><img src="' + esc(f.src) + '" alt="' + esc(f.alt) + '" loading="lazy"><figcaption>' + esc(f.text) + '</figcaption></figure>'; }).join("");
  frame(sec("Galleri", '<div class="prose"><p>Små stunder från Jons BK. Fler bilder är alltid välkomna.</p></div><div class="gal">' + fig + '</div><p class="fine">Alla spelarkort hittar du under <a href="laget.html">Laget</a>.</p>'), d);
}

/* ---------- om oss ---------- */
function pageOmOss(d) {
  var h = sec("Om Jons BK", HEART + '<div class="prose"><p>Jons BK är ett fotbollslag som spelar sjumannafotboll i Korpen Stockholm, ' + esc(d.league) + ', med ' + esc(d.venue) + ' som hemmaplan. Vi spelar för glädjen, för gemenskapen och för att fotboll är vackert.</p><p>Här är vi glada för varandras insatser, hejar på varandra och firar både stora och små ögonblick. Alla som vill spela boll får plats i vårt hjärta.</p></div><ul class="values"><li>Jons är kärlek</li><li>Passa bollen, passa kärleken</li><li>Fotboll är vackert</li></ul>');
  h += sec("Följ ligan", '<div class="prose"><p>Den officiella tabellen och alla matcher i serien finns hos Korpen Stockholm: <a href="https://korpenstockholm.zoezi.se/serie/8346">Division 2 på korpenstockholm.zoezi.se</a>. Resultaten här på sidan uppdateras automatiskt därifrån.</p></div>');
  frame(h, d);
}

/* ---------- start ---------- */
var JOBS = {
  "start": function () { return getJson("data.json").then(pageStart); },
  "matcher": function () { return getJson("data.json").then(pageMatcher); },
  "laget": function () { return Promise.all([getJson("data.json"), getJson("spelare.json")]).then(function (r) { pageLaget(r[0], r[1]); }); },
  "galleri": function () { return Promise.all([getJson("data.json"), getJson("galleri.json")]).then(function (r) { pageGalleri(r[0], r[1]); }); },
  "om-oss": function () { return getJson("data.json").then(pageOmOss); }
};
(JOBS[PAGE] || JOBS.start)().catch(fail);
