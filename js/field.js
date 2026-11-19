/* Ality contour field: abstract seabed contours.
   A slowly moving, tide-like height field drawn as evenly spaced depth contours
   (WebGL), with the shallows tinted a little bluer, and nodes on the 2-D canvas
   on top that ride the contours and link when they come close. The field is analytic (a sum of slow plane waves plus shaped
   rises and hollows), so the GPU and the CPU evaluate the same function.
   Colours come from CSS custom properties on the host element:
   --field-bg, --field-line, --field-node, --field-link, --field-shoal, --field-shoal-2.
   The two shoal tints start at contour 12 and contour 15 counted up from lo. */
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
  function prop(el, name, fb) { var v = getComputedStyle(el).getPropertyValue(name).trim(); return v || fb; }
  function rng(seed) { var s = seed >>> 0; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

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
    "uniform vec4 uP;uniform vec3 uLev;", // lo, hi, step
    "uniform vec3 cBg,cLine,cShoal,cShoal2;uniform vec2 uShoal;uniform float uAlpha;",
    "void field(vec2 p,out float f,out vec2 g){",
    "  f=0.5+uTide;g=vec2(0.);",
    "  for(int i=0;i<" + NW + ";i++){vec4 w=uW[i];float ar=dot(w.xy,p)+uOm[i]*uT+w.w;f+=w.z*cos(ar);g-=w.z*sin(ar)*w.xy;}",
    "  for(int j=0;j<" + NB + ";j++){if(uBa[j]==0.)continue;vec4 b=uB[j];vec2 d=(p-b.xy)/b.zw;float q=max(dot(d,d),1e-6);float qp=pow(q,uBp[j]);float e=uBa[j]*exp(-qp);f+=e;g+=e*(-2.*uBp[j]*qp/q)*d/b.zw;}",
    "  if(uP.w!=0.){vec2 d=p-uP.xy;float r2=uP.z*uP.z;float e=uP.w*exp(-dot(d,d)/r2);f+=e;g+=e*(-2.*d/r2);}",
    "}",
    "void main(){",
    "  vec2 p=vec2(gl_FragCoord.x,uRes.y*uDpr-gl_FragCoord.y)/uDpr;",
    "  float f;vec2 g;field(p,f,g);float gl=max(length(g),1e-6);",
    "  float u=(f-uLev.x)/uLev.z;float k=floor(u+0.5);",
    "  float d=abs(u-k)*uLev.z/gl*uDpr;",                       // distance to the nearest line in device px
    "  bool idx=mod(k,5.)<0.5;",
    "  float hw=(idx?0.62:0.36)*uDpr;",
    "  float a=clamp(hw+0.5-d,0.,1.)*(idx?1.:0.55);",
    "  float fade=smoothstep(uLev.x-uLev.z,uLev.x+uLev.z*1.5,f)*(1.-smoothstep(uLev.y-uLev.z*1.5,uLev.y+uLev.z,f));",
    "  float s1=clamp((f-uShoal.x)/gl*uDpr+0.5,0.,1.),s2=clamp((f-uShoal.y)/gl*uDpr+0.5,0.,1.);",
    "  vec3 bg=mix(mix(cBg,cShoal,s1),cShoal2,s2);",               // shallow water tinted, two bands
    "  gl_FragColor=vec4(mix(bg,cLine,a*fade*uAlpha),1.);",
    "}"
  ].join("\n");

  function Field(root, opts) {
    this.root = root;
    this.o = Object.assign({
      seed: 7, nodes: 0, linkDist: 96, banks: function () { return []; }, pointer: false, speed: 1,
      exclude: [], still: false, extra: null, lo: 0.2, hi: 0.86, step: 0.034, alpha: 1,
      shoal: [12, 15]
    }, opts || {});
    this.waves = makeWaves(this.o.seed);
    this.t = (this.o.seed % 13) * 7; this.tide = 0; this.pointer = { x: 0, y: 0, amp: 0, target: 0 };
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
      var host = this.o.pointer === true ? root : this.o.pointer;
      host.addEventListener("pointermove", function (e) {
        if (e.pointerType !== "mouse") return;
        var r = self.gl.getBoundingClientRect();
        self.pointer.x = e.clientX - r.left; self.pointer.y = e.clientY - r.top; self.pointer.target = 0.16;
      });
      host.addEventListener("pointerleave", function () { self.pointer.target = 0; });
    }
    this.frame(0, true);
    this.kick();
  }

  Field.prototype.readColours = function () {
    var el = this.root;
    this.cBg = prop(el, "--field-bg", "#fbfbf8");
    this.cLine = prop(el, "--field-line", "#22313a");
    this.cNode = prop(el, "--field-node", this.cLine);
    this.cLink = prop(el, "--field-link", "#1f5bd6");
    this.cShoal = prop(el, "--field-shoal", this.cBg);
    this.cShoal2 = prop(el, "--field-shoal-2", this.cShoal);
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
    ["uRes", "uDpr", "uT", "uTide", "uW", "uOm", "uB", "uBa", "uBp", "uP", "uLev", "cBg", "cLine", "cShoal", "cShoal2", "uShoal", "uAlpha"].forEach(function (n) { u[n] = gl.getUniformLocation(p, n); });
    var W = [], O = [];
    this.waves.forEach(function (w) { W.push(w.kx, w.ky, w.amp, w.ph); O.push(w.om); });
    gl.uniform4fv(u.uW, W); gl.uniform1fv(u.uOm, O);
    gl.uniform3f(u.uLev, this.o.lo, this.o.hi, this.o.step);
    gl.uniform3fv(u.cBg, rgb(this.cBg)); gl.uniform3fv(u.cLine, rgb(this.cLine)); gl.uniform1f(u.uAlpha, this.o.alpha);
    gl.uniform3fv(u.cShoal, rgb(this.cShoal)); gl.uniform3fv(u.cShoal2, rgb(this.cShoal2));
    var sh = this.o.shoal || [99, 99];
    gl.uniform2f(u.uShoal, this.o.lo + this.o.step * sh[0], this.o.lo + this.o.step * sh[1]);
    this.glc = gl; this.u = u;
  };

  Field.prototype.resize = function () {
    var r = this.gl.getBoundingClientRect();
    this.W = Math.max(1, r.width); this.H = Math.max(1, r.height);
    this.dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    [this.gl, this.ov].forEach(function (c) { if (c) { c.width = Math.round(this.W * this.dpr); c.height = Math.round(this.H * this.dpr); } }, this);
    this.banks = this.o.banks(this.W, this.H) || [];
    if (this.glc) {
      var B = [], A = [], E = [];
      for (var i = 0; i < NB; i++) { var b = this.banks[i]; if (b) { B.push(b.x, b.y, b.rx, b.ry); A.push(b.amp); E.push(b.p || 1); } else { B.push(0, 0, 1, 1); A.push(0); E.push(1); } }
      this.glc.uniform4fv(this.u.uB, B); this.glc.uniform1fv(this.u.uBa, A); this.glc.uniform1fv(this.u.uBp, E);
      this.glc.viewport(0, 0, this.gl.width, this.gl.height);
    }
    this.exclude = (typeof this.o.exclude === "function" ? this.o.exclude() : this.o.exclude) || [];
    this.seedNodes();
  };

  // the same field on the CPU: [f, df/dx, df/dy]
  Field.prototype.field = function (x, y) {
    var f = 0.5 + this.tide, gx = 0, gy = 0, t = this.t;
    for (var i = 0; i < this.waves.length; i++) {
      var w = this.waves[i], ar = w.kx * x + w.ky * y + w.om * t + w.ph, s = Math.sin(ar);
      f += w.amp * Math.cos(ar); gx -= w.amp * s * w.kx; gy -= w.amp * s * w.ky;
    }
    for (var j = 0; j < this.banks.length; j++) {
      var b = this.banks[j], P = b.p || 1, dx = (x - b.x) / b.rx, dy = (y - b.y) / b.ry;
      var q = Math.max(dx * dx + dy * dy, 1e-6), qp = Math.pow(q, P), e = b.amp * Math.exp(-qp), k = -2 * P * qp / q;
      f += e; gx += e * k * dx / b.rx; gy += e * k * dy / b.ry;
    }
    var Pt = this.pointer;
    if (Pt.amp > 0.0005) {
      var px = x - Pt.x, py = y - Pt.y, r2 = 170 * 170, ep = Pt.amp * Math.exp(-(px * px + py * py) / r2);
      f += ep; gx += ep * (-2 * px / r2); gy += ep * (-2 * py / r2);
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

  Field.prototype.spawn = function (n) {
    var o = this.o, count = Math.floor((o.hi - o.lo) / o.step), pad = 18;
    for (var tries = 0; tries < 40; tries++) {
      n.x = Math.random() * this.W; n.y = Math.random() * this.H;
      n.L = o.lo + o.step * (1 + Math.floor(Math.random() * (count - 1)));
      if (this.project(n, 10) && n.x > pad && n.y > pad && n.x < this.W - pad && n.y < this.H - pad && !this.inExclude(n.x, n.y, pad)) {
        n.dir = Math.random() < 0.5 ? -1 : 1; n.v = 0.4 + Math.random() * 0.5; n.age = 0; return;
      }
    }
    n.x = -999; n.y = -999;
  };

  Field.prototype.seedNodes = function () {
    var count = Math.round(this.o.nodes * Math.max(0.45, Math.min(1.25, (this.W * this.H) / (1440 * 860))));
    this.nodes = [];
    for (var i = 0; i < count; i++) { var n = {}; this.spawn(n); n.age = 1 + Math.random(); this.nodes.push(n); }
  };

  Field.prototype.kick = function () {
    var should = this.visible && !document.hidden && !REDUCED && !this.o.still;
    if (should && !this.running) { this.running = true; this.last = performance.now(); var self = this; requestAnimationFrame(function (t) { self.loop(t); }); }
    if (!should) this.running = false;
  };

  Field.prototype.loop = function (now) {
    if (!this.running) return;
    var dt = Math.min(0.1, (now - this.last) / 1000);
    if (dt >= 1 / 45) { this.last = now; this.frame(dt, false); }
    var self = this; requestAnimationFrame(function (t) { self.loop(t); });
  };

  Field.prototype.frame = function (dt, still) {
    this.t += dt * this.o.speed;
    this.tide = 0.05 * Math.sin(this.t * 0.12);   // the whole field rises and falls like a tide
    var P = this.pointer; P.amp += (P.target - P.amp) * Math.min(1, dt * 2.4);
    var gl = this.glc;
    if (gl) {
      gl.uniform2f(this.u.uRes, this.W, this.H); gl.uniform1f(this.u.uDpr, this.dpr);
      gl.uniform1f(this.u.uT, this.t); gl.uniform1f(this.u.uTide, this.tide);
      gl.uniform4f(this.u.uP, P.x, P.y, 170, P.amp);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    if (!this.ctx) return;
    var c = this.ctx, d = this.dpr;
    c.setTransform(d, 0, 0, d, 0, 0);
    c.clearRect(0, 0, this.W, this.H);
    if (this.o.extra) this.o.extra(c, this.W, this.H, this);

    var N = this.nodes, LD = this.o.linkDist;
    if (!N.length) return;
    for (var i = 0; i < N.length; i++) {
      var n = N[i];
      if (!still) {
        n.age += dt;
        var F = this.field(n.x, n.y), g = Math.hypot(F[1], F[2]);
        if (g > 1e-6) { var step = n.v * 24 * dt * n.dir; n.x += -F[2] / g * step; n.y += F[1] / g * step; }
        if (!this.project(n, 2)) n.x = -999;
      }
      if (n.x < -8 || n.y < -8 || n.x > this.W + 8 || n.y > this.H + 8 || this.inExclude(n.x, n.y, 6)) this.spawn(n);
      n.linked = 0;
    }
    c.lineWidth = 1; c.strokeStyle = this.cLink;
    for (var a = 0; a < N.length; a++) {
      for (var b = a + 1; b < N.length; b++) {
        var A = N[a], B = N[b];
        if (A.L === B.L || A.linked >= 3 || B.linked >= 3) continue;
        var dx = A.x - B.x, dy = A.y - B.y, dd = dx * dx + dy * dy;
        if (dd > LD * LD) continue;
        var k = 1 - Math.sqrt(dd) / LD;
        c.globalAlpha = Math.min(1, k * 1.4) * Math.min(1, A.age, B.age);
        c.beginPath(); c.moveTo(A.x, A.y); c.lineTo(B.x, B.y); c.stroke();
        A.linked++; B.linked++;
      }
    }
    for (var m = 0; m < N.length; m++) {
      var q = N[m];
      c.globalAlpha = Math.min(1, q.age);
      c.beginPath(); c.arc(q.x, q.y, q.linked ? 2.8 : 2, 0, Math.PI * 2);
      c.fillStyle = q.linked ? this.cLink : this.cNode; c.fill();
    }
    c.globalAlpha = 1;
  };

  window.AlityField = Field;
})();
