/* Ality site: the seabed fields, the menu, reveals. */
(function () {
  "use strict";
  var REDUCED = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var Field = window.AlityField;
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

  /* ---------- hero: lines fall quiet behind the words ---------- */
  var fields = [];
  var about = document.body.classList.contains("page-about");
  var hero = $("#hero");
  if (hero && Field) {
    var copy = $(".hero-copy .inner", hero), nav = $(".nav", hero);
    fields.push(new Field(hero, {
      seed: about ? 23 : 7, nodes: about ? 46 : 64, linkDist: 92, pointer: true,
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

  /* ---------- the close: the conversation set on the night field ---------- */
  var band = $(".close-band");
  if (band && Field) {
    var closeCopy = $(".close", band);
    fields.push(new Field(band, {
      seed: about ? 31 : 57, nodes: 46, linkDist: 92, speed: 0.75, alpha: 0.78, pointer: true,
      banks: function (W, H) {
        var c = rel(closeCopy, band);
        return [
          { x: c.x + c.w * 0.4, y: c.y + c.h * 0.5, rx: c.w * 0.55 + 40, ry: c.h * 0.62 + 30, amp: -0.5, p: 2 },
          { x: W * 0.86, y: H * 0.2, rx: W * 0.16, ry: H * 0.32, amp: 0.2, p: 2 },
          { x: W * 0.12, y: H * 0.95, rx: W * 0.2, ry: H * 0.22, amp: 0.16, p: 2 }
        ];
      },
      exclude: function () { return [rel(closeCopy, band)]; }
    }));
  }
  // banks and keep-clear areas follow the text, so measure again once the font is in
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { fields.forEach(function (f) { f.resize(); f.frame(0, true); }); });

  /* ---------- portraits: still fields until photographs arrive ---------- */
  $$(".portrait[data-seed]").forEach(function (p) {
    if (!Field) return;
    new Field(p, { seed: +p.getAttribute("data-seed"), still: true, alpha: 0.6, step: 0.03,
      banks: function (W, H) { return [{ x: W * 0.15, y: H * 0.9, rx: W * 0.5, ry: H * 0.25, amp: -0.4, p: 2 }]; } });
  });

  /* ---------- entrances and reveals ---------- */
  var enter = $$("[data-enter]");
  setTimeout(function () { enter.forEach(function (e) { e.classList.add("in"); }); }, 150);
  var rev = $$("[data-reveal]");
  if ("IntersectionObserver" in window && !REDUCED) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { var i = rev.indexOf(e.target) % 5; e.target.style.transitionDelay = (i * 60) + "ms"; e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.2 });
    rev.forEach(function (r) { io.observe(r); });
  } else rev.forEach(function (r) { r.classList.add("in"); });

  $$("[data-year]").forEach(function (y) { y.textContent = new Date().getFullYear(); });
})();
