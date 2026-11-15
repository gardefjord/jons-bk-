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

function pageStart(s, pl) {
  var L = lists(s), h = (s.demo ? DEMO : "") + nextCard(s, L.next) + upcoming(s, L.later);
  if (L.done.length) h += sec("Senaste resultat", resRows(L.done.slice(0, 5)) + LEGEND + '<p class="more"><a href="matcher.html#spelade">Alla resultat och tabellen <span aria-hidden="true">&rarr;</span></a></p>');
  if (pl && pl.spelare) {
    h += '<section class="sec"><h2>Laget</h2><div class="strip">' + pl.spelare.filter(function (p) { return p.grupp === "trupp"; }).map(function (p) { var k = pick(p, "2026"); return '<a href="laget.html#' + esc(p.id) + '"><img src="' + esc(k.bild) + '" width="250" height="390" loading="lazy" alt="' + esc(p.namn) + ', spelarkort"></a>'; }).join("") + '</div><p class="more strip-more"><a href="laget.html">Möt laget <span aria-hidden="true">&rarr;</span></a></p></section>';
  }
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
function pageLaget(d, data) {
  PL = data.spelare; SERIES = data.serier || [];
  PL = PL.slice().sort(function (x, y) { return x.namn.localeCompare(y.namn, "sv"); });
  var h = '<div class="bubwrap"><div class="bubfade" id="bubfade"><div class="bubbles" id="bubbles" role="group" aria-label="Välj spelare">' +
    PL.map(function (p) { return '<button type="button" class="bub" data-id="' + esc(p.id) + '" aria-current="false"><img class="av" src="assets/avatars/' + esc(p.id) + '.jpg" alt="" width="64" height="64" loading="lazy"><span>' + esc(p.namn) + '</span></button>'; }).join("") +
    '</div><button type="button" class="bubnav l" data-scroll="-1" aria-label="Fler spelare åt vänster">&lsaquo;</button><button type="button" class="bubnav r" data-scroll="1" aria-label="Fler spelare åt höger">&rsaquo;</button></div></div>';
  h += '<div class="stage" id="stage"><img id="dimg" alt=""></div>';
  h += '<div class="pager"><button type="button" class="pg" data-step="-1" aria-label="Föregående spelare">&larr;</button><p class="count" id="count" aria-live="polite"></p><button type="button" class="pg" data-step="1" aria-label="Nästa spelare">&rarr;</button></div>';
  h += '<div class="who" id="who"><h2 id="dn"></h2><p id="dpos"></p></div>';
  h += '<div class="detail"><div class="chips" id="chips" role="group" aria-label="Kortserie"></div>' +
    '<h4 id="sh"></h4><p class="legend" id="legend"></p><ul class="bars" id="dbars"></ul>' +
    '<div id="extra"></div>' +
    '<div class="lovemeter">Kärlek 100 av 100<div class="bar" role="img" aria-label="Kärlek: 100 av 100"></div></div></div>';
  frame(h, d);
  root.addEventListener("click", function (e) {
    var n = e.target.closest(".bub"); if (n) return select(n.dataset.id);
    var sc = e.target.closest("[data-scroll]"); if (sc) { var row = $("bubbles"); return row.scrollBy({ left: +sc.dataset.scroll * row.clientWidth * 0.7, behavior: "smooth" }); }
    var s = e.target.closest("[data-step]"); if (s) return step(+s.dataset.step);
    var c = e.target.closest(".chip"); if (c) showSerie(c.dataset.s, 0);
  });
  document.addEventListener("keydown", function (e) {
    if (e.target.closest("input,textarea,select")) return;
    if (e.key === "ArrowLeft") step(-1); else if (e.key === "ArrowRight") step(1);
  });
  var sx = null, st = $("stage");
  st.addEventListener("touchstart", function (e) { sx = e.touches[0].clientX; }, { passive: true });
  st.addEventListener("touchend", function (e) { if (sx === null) return; var dx = e.changedTouches[0].clientX - sx; sx = null; if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1); }, { passive: true });
  window.addEventListener("hashchange", function () { var id = location.hash.slice(1); if (id && (!cur || cur.id !== id)) select(id, true); });
  var bubs = $("bubbles"); bubs.addEventListener("scroll", bubFade, { passive: true }); window.addEventListener("resize", sizeBubbles); requestAnimationFrame(sizeBubbles);
  var start = location.hash.slice(1);
  select(PL.some(function (p) { return p.id === start; }) ? start : PL[0].id, true);
}
/* Bubblornas bredd räknas så att en halv bubbla alltid sticker fram i kanten: då syns det att raden går att svepa */
function sizeBubbles() {
  var r = $("bubbles"); if (!r) return;
  var R = r.clientWidth, pad = matchMedia("(hover:hover)").matches ? 38 : 20, gap = 12, k = Math.max(3, Math.floor((R - pad) / 72));
  r.style.setProperty("--bw", Math.min(76, Math.max(52, (R - pad - gap * k) / (k + 0.5))) + "px");
  bubFade();
}
/* Kantskuggor som visar att raden med spelare fortsätter åt det håll man kan scrolla */
function bubFade() {
  var r = $("bubbles"), w = $("bubfade"); if (!r || !w) return;
  w.classList.toggle("more-l", r.scrollLeft > 4);
  w.classList.toggle("more-r", r.scrollLeft + r.clientWidth < r.scrollWidth - 4);
}
function step(n) { var i = PL.indexOf(cur) + n; select(PL[(i + PL.length) % PL.length].id); }
function replay(el) { el.classList.remove("swap"); void el.offsetWidth; el.classList.add("swap"); }
function yearCards(p) { return order(p).filter(function (x) { return /^\d{4}$/.test(x.serie); }); }
function select(id, quiet) {
  var p = PL.filter(function (x) { return x.id === id; })[0]; if (!p || p === cur) return;
  var dir = cur ? (PL.indexOf(p) > PL.indexOf(cur) ? 1 : -1) : 0;
  cur = p;
  document.querySelectorAll(".bub").forEach(function (b) { b.setAttribute("aria-current", b.dataset.id === id ? "true" : "false"); });
  var bub = document.querySelector('.bub[aria-current="true"]'), row = $("bubbles");
  if (bub && row) { row.scrollTo({ left: bub.offsetLeft - row.clientWidth / 2 + bub.offsetWidth / 2, behavior: dir ? "smooth" : "auto" }); setTimeout(bubFade, 60); requestAnimationFrame(bubFade); }
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
