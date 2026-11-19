/* Ality contour field: abstract seabed contours with a network riding them.
   A slowly moving, tide-like height field drawn as evenly spaced depth contours
   (WebGL), with the shallows tinted a little bluer, and nodes on the 2-D canvas
   on top that ride the contours and link when they come close. The field is
   analytic (a sum of slow plane waves plus shaped rises and hollows), so the
   GPU and the CPU evaluate the same function.

   Two coordinate spaces: screen (CSS px of the canvas) and sea. The waves live
   in sea space, seen through a camera (offset and zoom about a centre), so the
   seabed can drift as the page scrolls and the intro can pull back from close
   up. Banks (keep-clear hollows behind text) and the pointer swell
   live in screen space, so they stay with what is on screen.

   Colours come from CSS custom properties on the host element:
   --field-bg, --field-line, --field-node, --field-link, --field-shoal, --field-shoal-2,
   and for a host that darkens into deep water lower down (opts.deep):
   --deep-bg, --deep-line, --deep-link, --deep-shoal, --deep-shoal-2.

   Behaviour that the page steers each frame through opts.tick(field, dt):
   field.cam {x, y, zoom}; field.deep (screen y where deep water starts);
   field.lines {paper, deep}: how strongly the seabed (contours and network) shows
   above and below the deep-water edge; the page fades it out below the hero. */
(function () {
  "use strict";

  var NW = 16;   // plane waves: 11 swells and 5 short waves
  var NB = 8;    // shaped rises (+) and hollows (-)
  var REDUCED = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function rgb(c) {
    c = (c || "").trim();
    if (c[0] === "#") { var n = parseInt(c.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; }
    var m = c.match(/[\d.]+/g) || [0, 0, 0]; return [m[0] / 255, m[1] / 255, m[2] / 255];
  }
  function css(a, b, k) {
    return "rgb(" + Math.round((a[0] + (b[0] - a[0]) * k) * 255) + "," + Math.round((a[1] + (b[1] - a[1]) * k) * 255) + "," + Math.round((a[2] + (b[2] - a[2]) * k) * 255) + ")";
  }
  function prop(el, name, fb) { var v = getComputedStyle(el).getPropertyValue(name).trim(); return v || fb; }
  function rng(seed) { var s = seed >>> 0; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function smooth(a, b, x) { var t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); }
  function easeOut(t) { t = clamp01(t); return 1 - Math.pow(1 - t, 3); }
  function easeInOut(t) { t = clamp01(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  function makeWaves(seed) {
    var r = rng(seed), w = [], total = 0;
    for (var i = 0; i < NW; i++) {
      var short = i >= 11;
      var lambda = short ? 140 + r() * 200 : 320 + Math.pow(r(), 1.3) * 1400;
      var k = 2 * Math.PI / lambda, a = r() * Math.PI * 2;
      var amp = short ? 0.12 : Math.pow(lambda / 1000, 0.9);
      total += amp * amp;
      w.push({ kx: Math.cos(a) * k, ky: Math.sin(a) * k, amp: amp, ph: r() * Math.PI * 2, om: (r() - 0.5) * (short ? 0.5 : 0.22) });
    }
    var norm = 0.15 / Math.sqrt(total / 2);
    w.forEach(function (x) { x.amp *= norm; });
    return w;
  }

  var VS = "attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}";
  var FS = [
    "precision highp float;",
    "uniform vec2 uRes;uniform float uDpr;uniform float uT;uniform float uTide;",
    "uniform vec4 uW[" + NW + "];uniform float uOm[" + NW + "];",
    "uniform vec4 uB[" + NB + "];uniform float uBa[" + NB + "];uniform float uBp[" + NB + "];",
    "uniform vec4 uP;uniform vec3 uLev;",                               // pointer x,y,r,amp; levels lo,hi,step
    "uniform vec3 cBg,cLine,cShoal,cShoal2,dBg,dLine,dShoal,dShoal2;",
    "uniform vec2 uShoal;uniform float uAlpha,uDAlpha;",
    "uniform vec3 uCam;uniform vec2 uCen;uniform vec2 uDeep;uniform vec2 uLines;uniform vec3 uReveal;",
    "void field(vec2 p,out float f,out vec2 g){",
    "  vec2 q=(p-uCen)/uCam.z+uCen+uCam.xy;",                               // screen -> sea
    "  f=0.5+uTide;vec2 gq=vec2(0.);",
    "  for(int i=0;i<" + NW + ";i++){vec4 w=uW[i];float ar=dot(w.xy,q)+uOm[i]*uT+w.w;f+=w.z*cos(ar);gq-=w.z*sin(ar)*w.xy;}",
    "  g=gq/uCam.z;",
    "  for(int j=0;j<" + NB + ";j++){if(uBa[j]==0.)continue;vec4 b=uB[j];vec2 d=(p-b.xy)/b.zw;float s=max(dot(d,d),1e-6);float sp=pow(s,uBp[j]);float e=uBa[j]*exp(-sp);f+=e;g+=e*(-2.*uBp[j]*sp/s)*d/b.zw;}",
    "  if(uP.w!=0.){vec2 d=p-uP.xy;float r2=uP.z*uP.z;float e=uP.w*exp(-dot(d,d)/r2);f+=e;g+=e*(-2.*d/r2);}",
    "}",
    "void main(){",
    "  vec2 p=vec2(gl_FragCoord.x,uRes.y*uDpr-gl_FragCoord.y)/uDpr;",
    "  float f;vec2 g;field(p,f,g);float gl=max(length(g),1e-6);",
    "  float u=(f-uLev.x)/uLev.z;float k=floor(u+0.5);",
    "  float d=abs(u-k)*uLev.z/gl*uDpr;",                               // distance to the nearest line in device px
    "  bool idx=mod(k,5.)<0.5;",
    "  float hw=(idx?0.62:0.36)*uDpr;",
    "  float a=clamp(hw+0.5-d,0.,1.)*(idx?1.:0.55);",
    "  float fade=smoothstep(uLev.x-uLev.z,uLev.x+uLev.z*1.5,f)*(1.-smoothstep(uLev.y-uLev.z*1.5,uLev.y+uLev.z,f));",
    "  float s1=clamp((f-uShoal.x)/gl*uDpr+0.5,0.,1.),s2=clamp((f-uShoal.y)/gl*uDpr+0.5,0.,1.);",
    "  float rv=uReveal.z<0.?1.:1.-smoothstep(uReveal.z-180.,uReveal.z,length(p-uReveal.xy));", // the intro opens outward from the mark
    "  float dk=smoothstep(uDeep.x-uDeep.y,uDeep.x+uDeep.y,p.y);",           // deep water lower down the page
    "  float ln=mix(uLines.x,uLines.y,dk);rv*=ln;",                         // how much of the seabed shows here
    "  s1*=rv;s2*=rv;",
    "  vec3 bg=mix(mix(mix(cBg,cShoal,s1),cShoal2,s2),mix(mix(dBg,dShoal,s1),dShoal2,s2),dk);",
    "  gl_FragColor=vec4(mix(bg,mix(cLine,dLine,dk),a*fade*rv*mix(uAlpha,uDAlpha,dk)),1.);",
    "}"
  ].join("\n");

  function Field(root, opts) {
    this.root = root;
    this.o = Object.assign({
      seed: 7, nodes: 0, linkDist: 96, banks: function () { return []; }, liveBanks: false, pointer: false, speed: 1,
      exclude: [], still: false, extra: null, tick: null, deep: false, lo: 0.2, hi: 0.86, step: 0.034, alpha: 1,
      deepAlpha: 0.6, shoal: [12, 15]
    }, opts || {});
    this.waves = makeWaves(this.o.seed);
    this.t = (this.o.seed % 13) * 7; this.tide = 0;
    this.cam = { x: 0, y: 0, zoom: 1 };
    this.deepY = 1e6; this.deepSoft = 160;
    this.lines = { paper: 1, deep: 1 };
    this.pointer = { x: 0, y: 0, sx: 0, sy: 0, amp: 0, target: 0, on: 0, onTarget: 0 };
    this.intro = null;
    this.nodes = []; this.banks = []; this.running = false; this.visible = true;
    this.gl = root.querySelector("canvas.field");
    this.ov = root.querySelector("canvas.overlay");
    this.ctx = this.ov ? this.ov.getContext("2d") : null;
    this.readColours();
    this.initGL();
    this.resize();
    var self = this;
    if ("ResizeObserver" in window) new ResizeObserver(function () { self.resize(); if (!self.running) self.frame(0, true); }).observe(root);
    if ("IntersectionObserver" in window) new IntersectionObserver(function (e) { self.visible = e[0].isIntersecting; self.kick(); }, { rootMargin: "80px" }).observe(root);
    document.addEventListener("visibilitychange", function () { self.kick(); });
    if (this.o.pointer && !REDUCED) {
      var host = this.o.pointer === true ? root : this.o.pointer, P = this.pointer;
      host.addEventListener("pointermove", function (e) {
        if (e.pointerType !== "mouse") return;
        var r = self.gl.getBoundingClientRect();
        P.x = e.clientX - r.left; P.y = e.clientY - r.top;
        if (!P.on && !P.onTarget) { P.sx = P.x; P.sy = P.y; }
        P.target = 0.12; P.onTarget = 1;
      });
      var leave = function () { P.target = 0; P.onTarget = 0; };
      if (host === window || host === document) document.documentElement.addEventListener("mouseleave", leave);
      else host.addEventListener("pointerleave", leave);
    }
    this.frame(0, true);
    this.kick();
  }

  Field.prototype.readColours = function () {
    var el = this.root;
    this.cBg = rgb(prop(el, "--field-bg", "#fbfbf8"));
    this.cLine = rgb(prop(el, "--field-line", "#22313a"));
    this.cLink = rgb(prop(el, "--field-link", "#406bb5"));
    this.cShoal = rgb(prop(el, "--field-shoal", prop(el, "--field-bg", "#fbfbf8")));
    this.cShoal2 = rgb(prop(el, "--field-shoal-2", prop(el, "--field-shoal", prop(el, "--field-bg", "#fbfbf8"))));
    if (this.o.deep) {
      this.dBg = rgb(prop(el, "--deep-bg", "#121a1f"));
      this.dLine = rgb(prop(el, "--deep-line", "#9db3bd"));
      this.dLink = rgb(prop(el, "--deep-link", "#9cb0d3"));
      this.dShoal = rgb(prop(el, "--deep-shoal", "#16222a"));
      this.dShoal2 = rgb(prop(el, "--deep-shoal-2", "#1b2a34"));
    } else {
      this.dBg = this.cBg; this.dLine = this.cLine; this.dLink = this.cLink; this.dShoal = this.cShoal; this.dShoal2 = this.cShoal2;
    }
  };

  Field.prototype.initGL = function () {
    var gl = null;
    try { gl = this.gl.getContext("webgl", { antialias: false, premultipliedAlpha: false }); } catch (e) { gl = null; }
    if (!gl) { this.glc = null; return; }
    function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
    var p = gl.createProgram();
    try { gl.attachShader(p, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(p); }
    catch (e) { if (window.console) console.warn(e); this.glc = null; return; }
    gl.useProgram(p);
    var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(p, "a"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var u = {};
    ["uRes", "uDpr", "uT", "uTide", "uW", "uOm", "uB", "uBa", "uBp", "uP", "uLev", "cBg", "cLine", "cShoal", "cShoal2", "dBg", "dLine", "dShoal", "dShoal2",
      "uShoal", "uAlpha", "uDAlpha", "uCam", "uCen", "uDeep", "uLines", "uReveal"].forEach(function (n) { u[n] = gl.getUniformLocation(p, n); });
    var W = [], O = [];
    this.waves.forEach(function (w) { W.push(w.kx, w.ky, w.amp, w.ph); O.push(w.om); });
    gl.uniform4fv(u.uW, W); gl.uniform1fv(u.uOm, O);
    gl.uniform3f(u.uLev, this.o.lo, this.o.hi, this.o.step);
    gl.uniform3fv(u.cBg, this.cBg); gl.uniform3fv(u.cLine, this.cLine); gl.uniform3fv(u.cShoal, this.cShoal); gl.uniform3fv(u.cShoal2, this.cShoal2);
    gl.uniform3fv(u.dBg, this.dBg); gl.uniform3fv(u.dLine, this.dLine); gl.uniform3fv(u.dShoal, this.dShoal); gl.uniform3fv(u.dShoal2, this.dShoal2);
    gl.uniform1f(u.uAlpha, this.o.alpha); gl.uniform1f(u.uDAlpha, this.o.deep ? this.o.deepAlpha : this.o.alpha);
    var sh2 = this.o.shoal || [99, 99];
    gl.uniform2f(u.uShoal, this.o.lo + this.o.step * sh2[0], this.o.lo + this.o.step * sh2[1]);
    this.glc = gl; this.u = u;
  };

  Field.prototype.uploadBanks = function () {
    if (!this.glc) return;
    var B = [], A = [], E = [];
    for (var i = 0; i < NB; i++) { var b = this.banks[i]; if (b) { B.push(b.x, b.y, b.rx, b.ry); A.push(b.amp); E.push(b.p || 1); } else { B.push(0, 0, 1, 1); A.push(0); E.push(1); } }
    this.glc.uniform4fv(this.u.uB, B); this.glc.uniform1fv(this.u.uBa, A); this.glc.uniform1fv(this.u.uBp, E);
  };

  Field.prototype.measure = function () {
    this.banks = (this.o.banks(this.W, this.H) || []).slice(0, NB);
    this.exclude = (typeof this.o.exclude === "function" ? this.o.exclude() : this.o.exclude) || [];
    this.uploadBanks();
  };

  Field.prototype.resize = function () {
    var r = this.gl.getBoundingClientRect(), oldW = this.W, oldH = this.H;
    this.W = Math.max(1, r.width); this.H = Math.max(1, r.height);
    this.dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    [this.gl, this.ov].forEach(function (c) { if (c) { c.width = Math.round(this.W * this.dpr); c.height = Math.round(this.H * this.dpr); } }, this);
    if (this.glc) this.glc.viewport(0, 0, this.gl.width, this.gl.height);
    this.measure();
    // a phone's toolbar sliding in and out changes only the height a little: keep the network
    if (!(this.nodes.length && oldW === this.W && Math.abs(oldH - this.H) < 140)) this.seedNodes();
  };

  // camera: sea <-> screen
  Field.prototype.toScreenX = function (qx) { return (qx - this.cam.x - this.W / 2) * this.cam.zoom + this.W / 2; };
  Field.prototype.toScreenY = function (qy) { return (qy - this.cam.y - this.H / 2) * this.cam.zoom + this.H / 2; };
  Field.prototype.toSeaX = function (x) { return (x - this.W / 2) / this.cam.zoom + this.W / 2 + this.cam.x; };
  Field.prototype.toSeaY = function (y) { return (y - this.H / 2) / this.cam.zoom + this.H / 2 + this.cam.y; };

  // the same field on the CPU, at a sea point: [f, df/dqx, df/dqy]
  Field.prototype.field = function (qx, qy) {
    var f = 0.5 + this.tide, gx = 0, gy = 0, t = this.t, z = this.cam.zoom;
    for (var i = 0; i < this.waves.length; i++) {
      var w = this.waves[i], ar = w.kx * qx + w.ky * qy + w.om * t + w.ph, s = Math.sin(ar);
      f += w.amp * Math.cos(ar); gx -= w.amp * s * w.kx; gy -= w.amp * s * w.ky;
    }
    var x = this.toScreenX(qx), y = this.toScreenY(qy);
    for (var j = 0; j < this.banks.length; j++) {
      var b = this.banks[j], P = b.p || 1, dx = (x - b.x) / b.rx, dy = (y - b.y) / b.ry;
      var q = Math.max(dx * dx + dy * dy, 1e-6), qp = Math.pow(q, P), e = b.amp * Math.exp(-qp), k = -2 * P * qp / q;
      f += e; gx += e * k * dx / b.rx * z; gy += e * k * dy / b.ry * z;
    }
    var Pt = this.pointer;
    if (Pt.amp > 0.0005) {
      var px = x - Pt.sx, py = y - Pt.sy, r2 = 170 * 170, ep = Pt.amp * Math.exp(-(px * px + py * py) / r2);
      f += ep; gx += ep * (-2 * px / r2) * z; gy += ep * (-2 * py / r2) * z;
    }
    return [f, gx, gy];
  };

  Field.prototype.inExclude = function (x, y, pad) {
    pad = pad || 0;
    for (var i = 0; i < this.exclude.length; i++) { var e = this.exclude[i]; if (x > e.x - pad && x < e.x + e.w + pad && y > e.y - pad && y < e.y + e.h + pad) return true; }
    return false;
  };

  Field.prototype.project = function (n, iters) {
    for (var k = 0; k < iters; k++) {
      var F = this.field(n.x, n.y), g2 = F[1] * F[1] + F[2] * F[2];
      if (g2 < 1e-10) return false;
      var s = (F[0] - n.L) / g2;
      var dx = s * F[1], dy = s * F[2], m = Math.hypot(dx, dy);
      if (m > 30) { dx *= 30 / m; dy *= 30 / m; }
      n.x -= dx; n.y -= dy;
    }
    return Math.abs(this.field(n.x, n.y)[0] - n.L) < 0.003;
  };

  // place a node on a random contour somewhere on screen (sea coordinates kept on the node)
  Field.prototype.spawn = function (n) {
    var o = this.o, count = Math.floor((o.hi - o.lo) / o.step), pad = 18;
    for (var tries = 0; tries < 40; tries++) {
      n.x = this.toSeaX(Math.random() * this.W); n.y = this.toSeaY(Math.random() * this.H);
      n.L = o.lo + o.step * (1 + Math.floor(Math.random() * (count - 1)));
      if (!this.project(n, 10)) continue;
      var sx = this.toScreenX(n.x), sy = this.toScreenY(n.y);
      if (sx > pad && sy > pad && sx < this.W - pad && sy < this.H - pad && !this.inExclude(sx, sy, pad)) {
        n.dir = Math.random() < 0.5 ? -1 : 1; n.v = 0.4 + Math.random() * 0.5; n.age = 0; n.vis = 0; n.cw = 0;
        return;
      }
    }
    n.x = -1e5; n.y = -1e5;
  };

  Field.prototype.seedNodes = function () {
    var count = Math.max(this.o.minNodes || 0, Math.round(this.o.nodes * Math.max(0.45, Math.min(1.25, (this.W * this.H) / (1440 * 860)))));
    this.nodes = []; this.pa = null;
    for (var i = 0; i < count; i++) { var n = {}; this.spawn(n); n.age = 1 + Math.random(); n.r = Math.random(); this.nodes.push(n); }
  };

  /* ---------- the intro: one camera move from the mark out to the hero ----------
     The mark's hub and three ring centres become four real points of the network,
     placed in the sea so that, seen from close up (zoom Z0) with the hub at the
     middle of the screen, they sit exactly on the mark. The camera then pulls back
     and pans until the hub rests at F, its place in the hero, and the four points
     carry on as part of the network. pts: hub first, in screen px; size: the mark's
     drawn size; F: where the hub ends up on screen. opts.onIntro(I) is called each
     frame with I.z (zoom), I.S (the hub on screen now), I.F and I.t (seconds). */
  Field.prototype.startIntro = function (pts, size, F, Z0) {
    Z0 = Z0 || 3.2;
    var I = this.intro = { t: 0, pts: pts, size: size, Z0: Z0, F: F, S0: { x: pts[0].x, y: pts[0].y },
      qc: { x: F.x + this.cam.x, y: F.y + this.cam.y }, z: Z0, S: { x: pts[0].x, y: pts[0].y } };
    this.nodes.sort(function (a, b) { return (a.x < -5e4) - (b.x < -5e4); });
    this.pa = null;
    var save = { x: this.cam.x, y: this.cam.y, zoom: this.cam.zoom };
    this.introCam();
    for (var i = 0; i < 4 && i < this.nodes.length; i++) {
      var n = this.nodes[i];
      n.x = I.qc.x + (pts[i].x - pts[0].x) / Z0; n.y = I.qc.y + (pts[i].y - pts[0].y) / Z0;
      // each rides the level of the seabed exactly where it sits, so it is already on its line
      n.L = this.field(n.x, n.y)[0];
      n.logo = true; n.age = 2; n.vis = 0;
    }
    this.cam.x = save.x; this.cam.y = save.y; this.cam.zoom = save.zoom;
    this.kick();
  };
  Field.prototype.introCam = function () {
    var I = this.intro, k = easeInOut((I.t - 1.3) / 1.7), z = I.Z0 + (1 - I.Z0) * k;
    I.z = z; I.S = { x: I.S0.x + (I.F.x - I.S0.x) * k, y: I.S0.y + (I.F.y - I.S0.y) * k };
    this.cam.zoom = z;
    this.cam.x = I.qc.x - this.W / 2 - (I.S.x - this.W / 2) / z;
    this.cam.y = I.qc.y - this.H / 2 - (I.S.y - this.H / 2) / z;
  };
  Field.prototype.skipIntro = function () { if (this.intro) this.intro.t = Math.max(this.intro.t, 9); };

  Field.prototype.kick = function () {
    var should = this.visible && !document.hidden && !REDUCED && !this.o.still;
    if (should && !this.running) { this.running = true; this.last = performance.now(); var self = this; requestAnimationFrame(function (t) { self.loop(t); }); }
    if (!should) this.running = false;
  };

  Field.prototype.loop = function (now) {
    if (!this.running) return;
    var dt = Math.min(0.1, (now - this.last) / 1000);
    // at rest the seabed is slow and can draw every other frame; while the page moves (or in the intro)
    // it draws every frame, so the clear water behind the text keeps up with the text
    var lively = this.intro || now - (this.movedAt || 0) < 600;
    if (dt >= 1 / 45 || (lively && dt > 0.004)) { this.last = now; this.frame(dt, false); }
    var self = this; requestAnimationFrame(function (t) { self.loop(t); });
  };

  // draw once now (used while motion is reduced, e.g. on scroll)
  Field.prototype.render = function () { this.frame(0, true); };

  Field.prototype.frame = function (dt, still) {
    if (this.o.tick) this.o.tick(this, dt);
    if (this.o.liveBanks) this.measure();
    var I = this.intro, cam0 = { x: this.cam.x, y: this.cam.y, zoom: this.cam.zoom }, reveal = -1, self = this;
    var restore = function () { self.cam.x = cam0.x; self.cam.y = cam0.y; self.cam.zoom = cam0.zoom; };
    if (I) {
      I.t += dt;
      this.introCam();
      // the contours open outward from the mark, then the view pulls back over them
      reveal = I.t >= 3.0 ? -1 : (I.t < 1.0 ? 0 : easeOut((I.t - 1.0) / 1.8) * Math.hypot(this.W, this.H) * 1.1);
      if (this.o.onIntro) this.o.onIntro(I);
      if (I.t > 3.4) {
        this.intro = null;
        this.nodes.forEach(function (n) { n.logo = false; });
      }
    }
    if (!I) this.t += dt * this.o.speed;   // the seabed holds still while the camera moves
    this.tide = 0.05 * Math.sin(this.t * 0.12);   // the whole field rises and falls like a tide
    var P = this.pointer, ks = still ? 1 : Math.min(1, dt * 5);
    P.amp += (P.target - P.amp) * (still ? 1 : Math.min(1, dt * 2.4));
    P.on += (P.onTarget - P.on) * (still ? 1 : Math.min(1, dt * 3));
    P.sx += (P.x - P.sx) * ks; P.sy += (P.y - P.sy) * ks;     // the swell trails the cursor a little, like water
    var dY = this.o.deep ? this.deepY : 1e6;
    var gl = this.glc;
    if (gl) {
      gl.uniform2f(this.u.uRes, this.W, this.H); gl.uniform1f(this.u.uDpr, this.dpr);
      gl.uniform1f(this.u.uT, this.t); gl.uniform1f(this.u.uTide, this.tide);
      gl.uniform4f(this.u.uP, P.sx, P.sy, 170, P.amp);
      gl.uniform3f(this.u.uCam, this.cam.x, this.cam.y, this.cam.zoom);
      gl.uniform2f(this.u.uCen, this.W / 2, this.H / 2);
      gl.uniform2f(this.u.uDeep, dY, this.deepSoft);
      gl.uniform2f(this.u.uLines, this.lines.paper, this.lines.deep);
      gl.uniform3f(this.u.uReveal, I ? I.S.x : 0, I ? I.S.y : 0, reveal);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    if (!this.ctx) { restore(); return; }
    var c = this.ctx, d = this.dpr;
    c.setTransform(d, 0, 0, d, 0, 0);
    c.clearRect(0, 0, this.W, this.H);
    if (this.o.extra) this.o.extra(c, this.W, this.H, this);
    function deepK(y) { return smooth(dY - self.deepSoft, dY + self.deepSoft, y); }
    var LP = this.lines.paper, LQ = this.lines.deep;
    function lnK(y) { return LP + (LQ - LP) * deepK(y); }    // how much of the network shows here

    var N = this.nodes, LD = this.o.linkDist, NN = N.length;
    if (!NN) { restore(); return; }
    for (var i = 0; i < NN; i++) {
      var n = N[i];
      if (!still) n.age += dt;
      if (!still && !I) {              // in the intro the points hold their places; the view moves, not them
        var F = this.field(n.x, n.y), g = Math.hypot(F[1], F[2]);
        if (g > 1e-6) { var step = n.v * 24 * dt * n.dir / this.cam.zoom; n.x += -F[2] / g * step; n.y += F[1] / g * step; }
        if (!this.project(n, 2)) n.x = -1e5;
      }
      n.sx = this.toScreenX(n.x); n.sy = this.toScreenY(n.y);
      // with live banks the text moves over the network, so points under it fade rather than jump away
      n.ex = this.inExclude(n.sx, n.sy, 14);
      if (!I && (n.sx < -8 || n.sy < -8 || n.sx > this.W + 8 || n.sy > this.H + 8 || (n.ex && !this.o.liveBanks))) {
        this.spawn(n); n.sx = this.toScreenX(n.x); n.sy = this.toScreenY(n.y); n.ex = false;
      }
      n.dx = n.sx; n.dy = n.sy; n.ia = 1;
      if (n.x < -5e4) n.ex = true;                       // a point that found no contour stays hidden
      if (I) {
        // the other points come into view as the opening contours reach them
        n.ia = n.logo ? (I.t < 1.0 ? 0 : 1) : reveal < 0 ? 1 : 1 - smooth(Math.max(0, reveal - 160), Math.max(1, reveal - 10), Math.hypot(n.sx - I.S.x, n.sy - I.S.y));
      }
      n.ia *= lnK(n.sy);
      n.linked = 0; n.ls = 0;
    }

    // links ease in and out rather than switching, so nothing pops
    var ease = still || I ? 1 : Math.min(1, dt * 4);   // in the intro links follow at once, or they would stretch
    if (!this.pa || this.pa.length !== NN * NN) this.pa = new Float32Array(NN * NN);
    c.lineWidth = 1;
    for (var a = 0; a < NN; a++) {
      for (var b = a + 1; b < NN; b++) {
        var A = N[a], B = N[b], ix = a * NN + b, tgt = 0;
        if (A.L !== B.L && !A.ex && !B.ex && A.linked < 3 && B.linked < 3) {
          var dx = A.dx - B.dx, dy = A.dy - B.dy, dd = dx * dx + dy * dy;
          if (dd < LD * LD && !this.inExclude((A.dx + B.dx) / 2, (A.dy + B.dy) / 2, 16)) {   // no link across the words
            tgt = Math.min(1, (1 - Math.sqrt(dd) / LD) * 1.4); A.linked++; B.linked++; }
        }
        var v = this.pa[ix] += (tgt - this.pa[ix]) * ease;
        if (v < 0.01) continue;
        var w = v * Math.min(1, A.age, B.age) * A.ia * B.ia;
        if (w > A.ls) A.ls = w;
        if (w > B.ls) B.ls = w;
        if (w < 0.01) continue;
        c.globalAlpha = w; c.strokeStyle = css(this.cLink, this.dLink, deepK((A.dy + B.dy) / 2));
        c.beginPath(); c.moveTo(A.dx, A.dy); c.lineTo(B.dx, B.dy); c.stroke();
      }
    }

    // the cursor is a node too: points near it link to it while it stays
    if (P.on > 0.01) {
      var CL = LD * 1.35;
      for (var m = 0; m < NN; m++) {
        var q = N[m], ddx = q.dx - P.x, ddy = q.dy - P.y, dist = Math.hypot(ddx, ddy);
        var tc = dist < CL && !q.ex ? Math.min(1, (1 - dist / CL) * 1.6) * P.on : 0;
        q.cw += (tc - q.cw) * (still ? 1 : Math.min(1, dt * 5));
        if (q.cw < 0.01) continue;
        var cw = q.cw * Math.min(1, q.age) * q.ia;
        q.ls = Math.max(q.ls, cw);
        c.globalAlpha = cw * 0.9; c.strokeStyle = css(this.cLink, this.dLink, deepK(q.dy));
        c.beginPath(); c.moveTo(P.x, P.y); c.lineTo(q.dx, q.dy); c.stroke();
      }
    }

    // the mark's three edges, drawn at the mark's weight and thinning with the zoom into ordinary links
    if (I && I.t >= 1.0 && N[0].logo) {
      var sc = I.z / I.Z0, keep = 1 - smooth(2.7, 3.2, I.t);
      if (keep > 0.01) {
        c.globalAlpha = keep; c.strokeStyle = css(this.cLink, this.cLink, 0); c.lineWidth = Math.max(1, I.size * 0.042 * sc);
        for (var e = 1; e < 4; e++) { c.beginPath(); c.moveTo(N[0].dx, N[0].dy); c.lineTo(N[e].dx, N[e].dy); c.stroke(); }
        c.lineWidth = 1;
      }
    }

    // a point shows only while it is joined to another, fading in and out with its links
    var fade = still ? 1 : Math.min(1, dt * 3);
    for (var k2 = 0; k2 < NN; k2++) {
      var p = N[k2], tv = p.ex ? 0 : Math.min(1, p.ls * 1.6);
      if (I && p.logo && I.t >= 1.0) tv = 1;
      else if (I && !p.ex) tv = Math.max(tv, 0.5 * p.ia * (1 - smooth(2.6, 3.3, I.t)));   // the network shows as it comes into view
      p.vis += (tv - p.vis) * fade;
      if (p.vis < 0.02) continue;
      c.fillStyle = css(this.cLink, this.dLink, deepK(p.dy));
      if (I && p.logo && I.t >= 1.0) {
        // the mark's rings, at the mark's size, shrinking with the zoom and closing into points
        var scl = I.z / I.Z0, hubR = k2 === 0, mm = smooth(1.8, 2.8, I.t);
        var rr = Math.max(2.8, I.size * (hubR ? 0.078 : 0.054) * scl), lw = Math.max(1, I.size * (hubR ? 0.05 : 0.042) * scl);
        c.globalAlpha = p.vis * (1 - mm); c.strokeStyle = c.fillStyle; c.lineWidth = lw;
        c.beginPath(); c.arc(p.dx, p.dy, rr, 0, Math.PI * 2); c.stroke(); c.lineWidth = 1;
        c.globalAlpha = p.vis * mm; c.beginPath(); c.arc(p.dx, p.dy, 2.8, 0, Math.PI * 2); c.fill();
        continue;
      }
      c.globalAlpha = p.vis * Math.min(1, p.age) * p.ia;
      c.beginPath(); c.arc(p.dx, p.dy, 2 + 0.8 * p.vis, 0, Math.PI * 2); c.fill();
    }
    if (P.on > 0.01) {
      var any = 0; for (var z = 0; z < NN; z++) any = Math.max(any, N[z].cw);
      if (any > 0.02) { c.globalAlpha = Math.min(1, any * 1.5) * P.on * lnK(P.y); c.fillStyle = css(this.cLink, this.dLink, deepK(P.y)); c.beginPath(); c.arc(P.x, P.y, 2.8, 0, Math.PI * 2); c.fill(); }
    }
    c.globalAlpha = 1;
    restore();
  };

  window.AlityField = Field;
})();
