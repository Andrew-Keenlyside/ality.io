/* Ality site — nav background on scroll + reveal-on-scroll + loading screen. */
(function () {
  // hide loading screen once the page is ready
  function hideLoader() {
    const l = document.getElementById("loading");
    if (!l) return;
    setTimeout(() => {
      l.classList.add("hidden");
      l.style.opacity = "0"; l.style.visibility = "hidden"; l.style.pointerEvents = "none";
      setTimeout(() => { if (l.parentNode) l.parentNode.removeChild(l); }, 700);
    }, 650);
  }
  if (document.readyState === "complete") hideLoader();
  else window.addEventListener("load", hideLoader);

  const nav = document.getElementById("nav");
  if (nav) {
    const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }
  const reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && reveals.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    reveals.forEach((r) => io.observe(r));
  } else {
    reveals.forEach((r) => r.classList.add("in"));
  }
})();
