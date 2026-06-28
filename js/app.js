/* Ality single-page app — hero particle backgrounds + client-side view router.
   Loads after the inline graph script (so buildScaffold/fit/select exist). */

/* ---- particle graph backgrounds (home + about heroes) ---- */
(function () {
  function cfg() {
    return {
      particles: {
        number: { value: 156, density: { enable: true, value_area: 900 } },
        color: { value: ["#aec4db", "#84a3c4", "#63aab0"] },
        shape: { type: "circle" },
        opacity: { value: 0.55, random: true, anim: { enable: true, speed: 0.6, opacity_min: 0.2, sync: false } },
        size: { value: 3.2, random: true },
        line_linked: { enable: true, distance: 150, color: "#5a7fa0", opacity: 0.4, width: 1 },
        move: { enable: true, speed: 1.6, direction: "none", random: false, straight: false, out_mode: "out", bounce: false }
      },
      interactivity: {
        detect_on: "window",
        events: { onhover: { enable: true, mode: "grab" }, onclick: { enable: true, mode: "push" }, resize: true },
        modes: { grab: { distance: 170, line_linked: { opacity: 0.9 } }, push: { particles_nb: 4 } }
      },
      retina_detect: true
    };
  }
  function init() {
    if (typeof particlesJS === "undefined") { setTimeout(init, 80); return; }
    ["particles-js", "particles-about"].forEach((id) => { if (document.getElementById(id)) particlesJS(id, cfg()); });
  }
  init();
})();

/* ---- view router (no external page navigation) ---- */
(function () {
  function initGraph() {
    if (typeof buildScaffold === "function") {
      try { buildScaffold(); buildFilters(); select("steel"); } catch (e) {}
    }
  }
  function show(name) {
    document.querySelectorAll(".view").forEach(function (v) { v.classList.remove("active"); });
    const el = document.getElementById("view-" + name);
    if (el) el.classList.add("active");
    document.body.classList.toggle("graph-mode", name === "graph");
    document.querySelectorAll("#view-" + name + " .reveal").forEach(function (r) { r.classList.add("in"); });
    if (name === "graph") {
      requestAnimationFrame(function () {
        if (typeof fit === "function") fit();
        requestAnimationFrame(function () { if (typeof fit === "function") fit(); });
      });
    }
  }
  function route() {
    const h = location.hash || "";
    if (h.indexOf("/about") > -1) { show("about"); window.scrollTo(0, 0); }
    else if (h.indexOf("/graph") > -1) { show("graph"); }
    else {
      show("home");
      const anchor = (h && h.charAt(0) === "#" && h.indexOf("/") === -1) ? h.slice(1) : "";
      const t = anchor ? document.getElementById(anchor) : null;
      if (t) { window.scrollTo({ top: t.getBoundingClientRect().top + window.pageYOffset - 60, behavior: "smooth" }); }
      else window.scrollTo(0, 0);
    }
  }
  initGraph();
  route();
  window.addEventListener("hashchange", route);
  window.addEventListener("resize", function () {
    if (document.body.classList.contains("graph-mode") && typeof fit === "function") fit();
  });
})();
