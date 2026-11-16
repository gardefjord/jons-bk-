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
/* Spelarlista med kortlåda: ett tryck öppnar spelarens kort som en låda över hela skärmen */
var SHORTP = { ST: "Anfallare", LW: "Vänsterytter", RW: "Högerytter", CM: "Mittfältare", LB: "Vänsterback", RB: "Högerback", CB: "Mittback", MB: "Mittback", GK: "Målvakt" };
function pos(p) { return SHORTP[pick(p, "2026").pos] || ""; }
var SHEET = '<div class="sheet-backdrop" id="sbk"></div>' +
  '<div class="sheet" id="sheet" role="dialog" aria-modal="true" aria-label="Spelarkort" aria-hidden="true" tabindex="-1">' +
  '<div class="sheet-head" id="shead"><span class="grab"></span><button type="button" class="sx" id="sclose" aria-label="Stäng">&times;</button></div>' +
  '<div class="sheet-body" id="sbody">' +
  '<div class="stage" id="stage"><img id="dimg" alt=""></div>' +
  '<div class="pager"><button type="button" class="pg" data-go="-1" aria-label="Föregående spelare">&larr;</button><p class="count" id="count" aria-live="polite"></p><button type="button" class="pg" data-go="1" aria-label="Nästa spelare">&rarr;</button></div>' +
  '<div class="who" id="who"><h2 id="dn"></h2><p id="dpos"></p></div>' +
  '<div class="detail"><div class="chips" id="chips" role="group" aria-label="Kortserie"></div><h4 id="sh"></h4><p class="legend" id="legend"></p><ul class="bars" id="dbars"></ul><div id="extra"></div>' +
  '<div class="lovemeter">Kärlek 100 av 100<div class="bar" role="img" aria-label="Kärlek: 100 av 100"></div></div></div>' +
  '</div></div>';

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
  document.body.insertAdjacentHTML("beforeend", SHEET);

  var sheet = $("sheet"), sbody = $("sbody"), shead = $("shead"), bk = $("sbk"), isOpen = false, opener = null;
  function go(n) { var i = (PL.indexOf(cur) + n + PL.length) % PL.length; select(PL[i].id, true); try { history.replaceState({ sheet: PL[i].id }, "", "#" + PL[i].id); } catch (e) {} sbody.scrollTo({ top: 0, behavior: "smooth" }); }
  var OPEN_MS = 520, CLOSE_MS = 440, moveTimer = null;
  function insetFor(r) { return "inset(" + Math.max(0, r.top) + "px " + Math.max(0, innerWidth - r.right) + "px " + Math.max(0, innerHeight - r.bottom) + "px " + Math.max(0, r.left) + "px round 2px)"; }
  function rowEl(id) { return document.querySelector('.prow[data-id="' + id + '"]'); }
  function reduced() { return matchMedia("(prefers-reduced-motion: reduce)").matches; }
  function openSheet(id, fromHash) {
    select(id, true); isOpen = true; sbody.scrollTop = 0; sheet.style.transform = ""; bk.style.opacity = "";
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
    if (!fromHash) { try { history.pushState({ sheet: id }, "", "#" + id); } catch (e) {} }
  }
  function finishClose() {
    sheet.classList.remove("morph-close"); sheet.style.clipPath = ""; sheet.style.removeProperty("--sheet-bg"); sheet.style.transition = "none";
    void sheet.offsetWidth; sheet.style.transition = "";
  }
  function closeSheet(fromPop, slide) {
    if (!isOpen) return; isOpen = false;
    sheet.classList.remove("dragging"); bk.style.opacity = "";
    var row = !slide && cur ? rowEl(cur.id) : null, morph = row && !reduced();
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
    if (opener) { try { (rowEl(cur ? cur.id : "") || opener).focus({ preventScroll: true }); } catch (e) {} }
    if (!fromPop) { try { if (history.state && history.state.sheet) history.back(); else history.replaceState(null, "", location.pathname + location.search); } catch (e) {} }
  }
  window.addEventListener("popstate", function () {
    var s = history.state && history.state.sheet;
    if (isOpen && !s) closeSheet(true); else if (!isOpen && s) openSheet(s, true);
  });
  window.addEventListener("hashchange", function () { var id = location.hash.slice(1); if (!isOpen && PL.some(function (p) { return p.id === id; })) openSheet(id, true); });
  root.addEventListener("click", function (e) { var r = e.target.closest(".prow"); if (r) { opener = r; openSheet(r.dataset.id); } });
  sheet.addEventListener("click", function (e) {
    if (e.target.closest("#sclose")) return closeSheet();
    var g = e.target.closest("[data-go]"); if (g) return go(+g.dataset.go);
    var c = e.target.closest(".chip"); if (c) showSerie(c.dataset.s, 0);
  });
  document.addEventListener("keydown", function (e) {
    if (!isOpen) return;
    if (e.key === "Escape") closeSheet(); else if (e.key === "ArrowLeft") go(-1); else if (e.key === "ArrowRight") go(1);
  });

  /* dra ner för att stänga: i handtaget (mus och touch) och i innehållet när det ligger längst upp */
  var drag = null;
  function dStart(y) { drag = { y0: y, dy: 0, t0: performance.now() }; sheet.classList.add("dragging"); }
  function dMove(y) { drag.dy = Math.max(0, y - drag.y0); sheet.style.transform = "translateY(" + drag.dy + "px)"; bk.style.opacity = String(1 - Math.min(0.6, drag.dy / (innerHeight * 0.9))); }
  function dEnd() {
    if (!drag) return; var dy = drag.dy, v = dy / Math.max(1, performance.now() - drag.t0); drag = null;
    sheet.classList.remove("dragging");
    if (dy > 110 || (dy > 30 && v > 0.55)) closeSheet(false, true); else { sheet.style.transform = ""; bk.style.opacity = ""; }
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
    else if (mode === "x" && e.target.closest("#stage")) { var dx = e.changedTouches[0].clientX - tx; if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1); }
    ty = null; mode = null;
  }, { passive: true });
  bk.addEventListener("click", function () { closeSheet(); });

  var h0 = location.hash.slice(1);
  if (h0 && PL.some(function (p) { return p.id === h0; })) { opener = null; openSheet(h0, true); try { history.replaceState({ sheet: h0 }, "", "#" + h0); } catch (e) {} }
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
