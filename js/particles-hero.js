/* Ality hero — interactive supply-chain graph background.
   Built on particles.js v2.0.0 (the line-linked "network" effect),
   themed in Ality steel-blues over the offshore navy hero.
   Loads particles.js from CDN before this file. */
(function () {
  function init() {
    if (typeof particlesJS === "undefined") { setTimeout(init, 80); return; }
    particlesJS("particles-js", {
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
        events: {
          onhover: { enable: true, mode: "grab" },
          onclick: { enable: true, mode: "push" },
          resize: true
        },
        modes: {
          grab: { distance: 170, line_linked: { opacity: 0.9 } },
          push: { particles_nb: 4 }
        }
      },
      retina_detect: true
    });
  }
  init();
})();
