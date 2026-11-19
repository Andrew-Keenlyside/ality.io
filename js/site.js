/* Ality site: the seabed, the intro, the chapters, the menu and reveals. */
(function () {
  "use strict";
  var REDUCED = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var Field = window.AlityField;
  var root = document.documentElement;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function rel(el, host) {
    var c = host.getBoundingClientRect(), r = el.getBoundingClientRect();
    return { x: r.left - c.left, y: r.top - c.top, w: r.width, h: r.height };
  }

  /* ---------- small-screen menu ---------- */
  var navEl = $(".nav"), menuBtn = $(".menu-btn");
  if (navEl && menuBtn) {
    var setMenu = function (open) { navEl.classList.toggle("open", open); menuBtn.setAttribute("aria-expanded", open ? "true" : "false"); };
    menuBtn.addEventListener("click", function () { setMenu(!navEl.classList.contains("open")); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && navEl.classList.contains("open")) { setMenu(false); menuBtn.focus(); } });
    document.addEventListener("click", function (e) { if (!navEl.contains(e.target)) setMenu(false); });
    $$("#menu a").forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });
    navEl.addEventListener("focusout", function (e) { if (e.relatedTarget && !navEl.contains(e.relatedTarget)) setMenu(false); });
  }

  /* ---------- headings that arrive word by word ---------- */
  var wordHeads = $$("[data-words]");
  if (!REDUCED) wordHeads.forEach(function (h) {
    var words = h.textContent.trim().split(/\s+/);
    h.textContent = "";
    words.forEach(function (w, i) {
      var s = document.createElement("span"); s.className = "w"; s.style.setProperty("--i", i); s.textContent = w; h.appendChild(s);
      if (i < words.length - 1) h.appendChild(document.createTextNode(" "));
    });
  });

  var fields = [];
  var home = document.body.classList.contains("page-home");
  var about = document.body.classList.contains("page-about");

  /* ---------- home: one seabed the whole page travels over ---------- */
  var sea = $(".sea"), seaField = null;
  if (home && sea && Field) {
    var chapters = $$("[data-chapter]"), railLinks = $$(".rail a"), rail = $(".rail");
    var calm = $$("[data-calm]"), band = $(".close-band");
    var active = -1, flashT = 0, cache = [], cacheAt = -1;
    // the text blocks on screen, measured once a frame: the field falls quiet behind them
    var onScreen = function () {
      var now = performance.now();
      if (now - cacheAt < 6) return cache;
      var H = window.innerHeight, out = [];
      calm.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.width && r.bottom > -160 && r.top < H + 160) out.push({ x: r.left, y: r.top, w: r.width, h: r.height });
      });
      cache = out; cacheAt = now; return out;
    };
    var setChapter = function (i) {
      active = i;
      railLinks.forEach(function (a, k) { if (k === i) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current"); });
      if (rail) {
        rail.classList.toggle("deep", chapters[i].getAttribute("data-chapter") === "contact");
        rail.style.setProperty("--progress", i / Math.max(1, chapters.length - 1));
        // say the chapter's name for a moment as it arrives
        rail.classList.add("flash"); clearTimeout(flashT); flashT = setTimeout(function () { rail.classList.remove("flash"); }, 1600);
      }
    };
    // the chapters' relief: one seabed pinned beside them that changes shape with each
    var stageEl = $(".stage"), story = $(".story"), relief = null;
    if (stageEl && window.AlityRelief) {
      relief = new window.AlityRelief(stageEl, $$(".story > .sec"));
      if (!relief.ok) { relief = null; story.classList.add("flat"); }
    } else if (story) story.classList.add("flat");
    // what we look at: the row under the pointer lifts its ridge
    $$("#covers dl > div").forEach(function (row, i) {
      row.addEventListener("mouseenter", function () { if (relief) { relief.lit = i; relief.kick(); } });
      row.addEventListener("mouseleave", function () { if (relief) { relief.lit = -1; relief.kick(); } });
    });
    var smoothS = function (a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    seaField = new Field(sea, {
      seed: 7, nodes: 72, minNodes: 40, linkDist: 96, pointer: window, liveBanks: true, deep: true, deepAlpha: 0.78,
      banks: function () {
        return onScreen().slice(0, 8).map(function (r) {
          return { x: r.x + r.w / 2, y: r.y + r.h / 2, rx: r.w * 0.62 + 56, ry: r.h * 0.66 + 44, amp: -0.66, p: 2 };
        });
      },
      exclude: function () { return onScreen(); },
      tick: function (f, dt) {
        var H = window.innerHeight, y = window.scrollY || window.pageYOffset || 0;
        f.cam.y = y * 0.32;                                   // the seabed drifts past slower than the page: you travel over it
        if (band) { f.deepY = band.getBoundingClientRect().top + 20; f.deepSoft = 110; }   // deep water begins above the close
        var idx = 0;
        chapters.forEach(function (c, i) { if (c.getBoundingClientRect().top <= H * 0.55) idx = i; });
        if (idx !== active) setChapter(idx);
        // the seabed belongs to the hero, and to the deep water of the close; between them the relief beside the chapters carries it
        f.lines.paper = 1 - smoothS(H * 0.1, H * 0.85, y); f.lines.deep = 1;
      }
    });
    fields.push(seaField);
    if (seaField.glc) root.classList.add("sea-live");
    // with motion reduced the field holds still, but it still follows the page
    if (REDUCED) {
      var pending = false;
      window.addEventListener("scroll", function () { if (!pending) { pending = true; requestAnimationFrame(function () { pending = false; seaField.render(); }); } }, { passive: true });
    }
  }

  /* ---------- the intro: one camera move from the mark out to the hero ----------
     The mark's four points are points of the network. The view starts close in on
     them and pulls back; the nav and the hero copy sit on the same plane, so they
     scale down into place with the seabed and come into view as it opens. */
  var enter = $$("[data-enter]");
  var showTitle = function () { enter.forEach(function (e) { e.classList.add("in"); }); };
  var smooth = function (a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  if (root.classList.contains("intro") && seaField && (window.scrollY || 0) < 40) {
    var mark = $(".intro-mark"), done = false;
    var W = window.innerWidth, H = window.innerHeight;
    // from layout, not the bounding box: the mark is still turning in when this runs
    var size = parseFloat(getComputedStyle(mark).width) || 140, s = size / 100;
    var hub = { x: W / 2 - size / 2 + 50 * s, y: H / 2 - size / 2 + 59 * s };
    var pts = [hub].concat([-90, 30, 150].map(function (a) { var t = a * Math.PI / 180; return { x: hub.x + Math.cos(t) * 42 * s, y: hub.y + Math.sin(t) * 42 * s }; }));
    // where the mark's hub comes to rest: open water in the hero, clear of the words
    var rest = W < 700 ? { x: W * 0.76, y: H * 0.19 } : { x: W * 0.76, y: H * 0.36 };
    var layers = [$(".nav"), $(".hero-copy")].filter(Boolean).map(function (el) { var b = el.getBoundingClientRect(); return { el: el, x: b.left, y: b.top }; });
    showTitle();
    var finish = function () {
      if (done) return; done = true;
      layers.forEach(function (L) { L.el.style.transform = ""; L.el.style.transformOrigin = ""; L.el.style.opacity = ""; });
      mark.classList.add("out");
      root.classList.remove("intro");
      try { sessionStorage.setItem("ality-intro", "1"); } catch (e) {}
    };
    seaField.o.onIntro = function (I) {
      if (I.t >= 1.0) mark.classList.add("out");                   // the field's points take over from the drawn mark
      var op = smooth(1.7, 2.8, I.t);
      layers.forEach(function (L) {
        L.el.style.transformOrigin = (I.F.x - L.x) + "px " + (I.F.y - L.y) + "px";
        L.el.style.transform = "translate(" + (I.S.x - I.F.x) + "px," + (I.S.y - I.F.y) + "px) scale(" + I.z + ")";
        L.el.style.opacity = op;
      });
      if (I.t >= 3.0) finish();
    };
    seaField.startIntro(pts, size, rest);
    setTimeout(finish, 6000);                                         // never leave the page hidden
    var skip = function () { if (!done) { seaField.skipIntro(); finish(); } };
    ["wheel", "touchstart", "keydown", "pointerdown"].forEach(function (ev) { window.addEventListener(ev, skip, { once: true, passive: true }); });
  } else {
    root.classList.remove("intro");
    setTimeout(showTitle, 150);
  }

  /* ---------- about: the hero field and the close on the night field ---------- */
  var hero = $("#hero");
  if (about && hero && Field) {
    var copy = $(".hero-copy .inner", hero), nav = $(".nav", hero);
    fields.push(new Field(hero, {
      seed: 23, nodes: 46, linkDist: 92, pointer: true,
      banks: function (W, H) {
        var c = rel(copy, hero), br = rel($(".brand", hero), hero);
        return [
          { x: br.x + br.w / 2, y: br.y + br.h / 2, rx: br.w * 0.8 + 30, ry: br.h + 30, amp: -0.3, p: 2 },
          { x: c.x + c.w * 0.45, y: c.y + c.h * 0.55, rx: c.w * 0.74 + 50, ry: c.h * 0.8 + 40, amp: -0.62, p: 2 },
          { x: W * 0.5, y: 0, rx: W * 0.8, ry: 70, amp: -0.2, p: 2 },
          { x: W * 0.8, y: H * 0.42, rx: W * 0.2, ry: H * 0.28, amp: 0.22, p: 2 }
        ];
      },
      exclude: function () { return [rel(copy, hero), rel(nav, hero)]; }
    }));
  }
  var closeBand = $(".close-band.field-host");
  if (closeBand && Field) {
    var closeCopy = $(".close", closeBand);
    fields.push(new Field(closeBand, {
      seed: 31, nodes: 46, linkDist: 92, speed: 0.75, alpha: 0.78, pointer: true,
      banks: function (W, H) {
        var c = rel(closeCopy, closeBand);
        return [
          { x: c.x + c.w * 0.4, y: c.y + c.h * 0.5, rx: c.w * 0.55 + 40, ry: c.h * 0.62 + 30, amp: -0.5, p: 2 },
          { x: W * 0.86, y: H * 0.2, rx: W * 0.16, ry: H * 0.32, amp: 0.2, p: 2 },
          { x: W * 0.12, y: H * 0.95, rx: W * 0.2, ry: H * 0.22, amp: 0.16, p: 2 }
        ];
      },
      exclude: function () { return [rel(closeCopy, closeBand)]; }
    }));
  }
  // banks and keep-clear areas follow the text, so measure again once the font is in
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { fields.forEach(function (f) { f.resize(); if (!f.running) f.render(); }); });

  /* ---------- portraits: still fields until photographs arrive ---------- */
  $$(".portrait[data-seed]").forEach(function (p) {
    if (!Field) return;
    new Field(p, { seed: +p.getAttribute("data-seed"), still: true, alpha: 0.6, step: 0.03,
      banks: function (W, H) { return [{ x: W * 0.15, y: H * 0.9, rx: W * 0.5, ry: H * 0.25, amp: -0.4, p: 2 }]; } });
  });

  /* ---------- reveals ---------- */
  var watch = function (els, cls, threshold, stagger) {
    if (!("IntersectionObserver" in window) || REDUCED) { els.forEach(function (r) { r.classList.add(cls); }); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        if (stagger) e.target.style.transitionDelay = ((els.indexOf(e.target) % 5) * 60) + "ms";
        e.target.classList.add(cls); io.unobserve(e.target);
      });
    }, { threshold: threshold });
    els.forEach(function (r) { io.observe(r); });
  };
  watch($$("[data-reveal]"), "in", 0.2, true);
  watch(wordHeads, "in", 0.5, false);

  $$("[data-year]").forEach(function (y) { y.textContent = new Date().getFullYear(); });
})();
