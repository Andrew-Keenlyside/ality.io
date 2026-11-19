/* Ality relief: the seabed seen from a low angle, pinned beside the chapters.
   One terrain, drawn as depth contours in perspective (WebGL), with the network's
   points sitting on it (2-D canvas on top). As the reader moves through the
   chapters the same terrain changes shape, rather than one drawing replacing another:
     0  the problem: one broad rise, the supply chain, carrying a large network;
        a small new rise, a supplier, comes in from the edge as the chapter
        arrives. Each links only among its own points
     1  confidential by design: the two draw a little apart and a pale boundary
        stands in the trench between them; one link arcs over it, and only that
        link crosses
     2  what we look at: the terrain settles into five ridges from a centre; the
        page can lift one ridge (relief.lit = 0..4, or -1)
   The height function is written twice, in GLSL and in JS, and must stay the same:
   the points are placed and hidden behind rises on the CPU.
   Colours come from the stage's CSS custom properties: --field-bg, --field-line,
   --field-shoal, --field-shoal-2, --field-link. */
(function () {
  "use strict";

  var REDUCED = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var DEG = Math.PI / 180;

  function smooth(a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
  function easeInOut(x) { x = Math.max(0, Math.min(1, x)); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
  function rgb(c) {
    c = c.trim();
    if (c.charAt(0) === "#") {
      if (c.length === 4) c = "#" + c[1] + c[1] + c[2] + c[2] + c[3] + c[3];
      var n = parseInt(c.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
    }
    var m = c.match(/[\d.]+/g) || [0, 0, 0]; return [m[0] / 255, m[1] / 255, m[2] / 255];
  }
  function prop(el, name, fb) { var v = getComputedStyle(el).getPropertyValue(name).trim(); return v || fb; }

  /* ---------- the terrain's height, in GLSL ---------- */
  var GLSL_H = [
    "uniform vec3 uW;uniform vec3 uS0,uS1;uniform float uT;uniform float uLift[5];uniform float uRA[5];uniform float uRL[5];",
    "float g2(vec2 d,float s){return exp(-dot(d,d)/(2.*s*s));}",
    // the supply chain (a broad rise with shoulders at s.x) and a new supplier (a small rise at s.y, s.z high)
    "float chain(vec2 p,vec3 s){float b=s.x;",
    "  return 0.36*g2(p-vec2(b,0.04),0.22)+0.25*g2(p-vec2(b-0.18,-0.3),0.17)+0.23*g2(p-vec2(b+0.17,0.3),0.16)",
    "        +0.19*g2(p-vec2(b-0.3,0.24),0.15)+0.17*g2(p-vec2(b+0.21,-0.24),0.14)",
    "        +s.z*g2(p-vec2(s.y,-0.06),0.12)-0.07*g2(vec2(p.x-0.2,0.),0.06);}",
    "float hub(vec2 p){float h=0.34*g2(p,0.16);",
    "  for(int k=0;k<5;k++){float a=uRA[k],L=uRL[k];vec2 d=vec2(cos(a),sin(a));float al=dot(p,d);vec2 q=p-d*al;",
    "    h+=(0.16+0.16*uLift[k])*exp(-dot(q,q)/0.0061)*smoothstep(-0.05,0.15,al)*(1.-smoothstep(0.5*L,0.86*L,al))*(1.-0.35*al/L);}",
    "  return h;}",
    "float H(vec2 p){float r=length(p);",
    "  float b=0.03*sin(3.1*p.x+0.5*uT+1.4*sin(2.3*p.y+0.2*uT))+0.025*sin(2.6*p.y-0.4*uT+1.2*p.x)+0.012*sin(5.3*(p.x+p.y)+0.7*uT);",
    "  float s=uW.x*chain(p,uS0)+uW.y*chain(p,uS1)+uW.z*hub(p);",
    "  return (b+s*(1.+0.04*sin(uT*0.6)))*(1.-smoothstep(0.62,1.,r));}"
  ].join("\n");

  /* ---------- and the same in JS ---------- */
  function g2(dx, dz, s) { return Math.exp(-(dx * dx + dz * dz) / (2 * s * s)); }
  var BX = 0.2;   // where the boundary stands, in the trench between the two
  function chain(x, z, s) {
    var b = s[0];
    return 0.36 * g2(x - b, z - 0.04, 0.22) + 0.25 * g2(x - b + 0.18, z + 0.3, 0.17) + 0.23 * g2(x - b - 0.17, z - 0.3, 0.16)
      + 0.19 * g2(x - b + 0.3, z - 0.24, 0.15) + 0.17 * g2(x - b - 0.21, z + 0.24, 0.14)
      + s[2] * g2(x - s[1], z + 0.06, 0.12) - 0.07 * g2(x - BX, 0, 0.06);
  }
  // the five ridges: a little uneven in angle and length, so they read as ground rather than a star
  var RA = [0.10, -0.14, 0.08, -0.06, 0.16].map(function (j, k) { return -1.5708 + k * 1.25664 + j; });
  var RL = [1.0, 0.82, 1.08, 0.9, 0.96];
  function hub(x, z, lift) {
    var h = 0.34 * g2(x, z, 0.16);
    for (var k = 0; k < 5; k++) {
      var a = RA[k], L = RL[k], dx = Math.cos(a), dz = Math.sin(a), al = x * dx + z * dz, qx = x - dx * al, qz = z - dz * al;
      h += (0.16 + 0.16 * lift[k]) * Math.exp(-(qx * qx + qz * qz) / 0.0061) * smooth(-0.05, 0.15, al) * (1 - smooth(0.5 * L, 0.86 * L, al)) * (1 - 0.35 * al / L);
    }
    return h;
  }
  function height(x, z, S) {
    var r = Math.hypot(x, z), t = S.t;
    var b = 0.03 * Math.sin(3.1 * x + 0.5 * t + 1.4 * Math.sin(2.3 * z + 0.2 * t)) + 0.025 * Math.sin(2.6 * z - 0.4 * t + 1.2 * x) + 0.012 * Math.sin(5.3 * (x + z) + 0.7 * t);
    var s = (S.W[0] ? S.W[0] * chain(x, z, S.s0) : 0) + (S.W[1] ? S.W[1] * chain(x, z, S.s1) : 0) + (S.W[2] ? S.W[2] * hub(x, z, S.lift) : 0);
    return (b + s * (1 + 0.04 * Math.sin(t * 0.6))) * (1 - smooth(0.62, 1, r));
  }

  var VS_T = [
    "attribute vec2 a;uniform mat4 uM;varying float vH;varying vec2 vP;varying vec3 vN;",
    GLSL_H,
    "void main(){float h=H(a);float e=0.01;float hx=H(a+vec2(e,0.))-h,hz=H(a+vec2(0.,e))-h;",
    "  vN=normalize(vec3(-hx,e,-hz));vH=h;vP=a;gl_Position=uM*vec4(a.x,h,a.y,1.);}"
  ].join("\n");
  var FS_T = [
    "#extension GL_OES_standard_derivatives : enable",
    "precision highp float;",
    "uniform vec3 cBg,cLine,cSh1,cSh2,cBlue;uniform float uStep,uDpr,uBnd;",
    "varying float vH;varying vec2 vP;varying vec3 vN;",
    "void main(){",
    "  float r=length(vP);if(r>1.)discard;",
    "  float edge=1.-smoothstep(0.66,0.97,r);",                                  // the relief dissolves into the paper at its rim
    "  float u=vH/uStep;float k=floor(u+0.5);float d=abs(u-k)/max(fwidth(u),1e-5);",
    "  bool idx=mod(k,5.)<0.5&&k>0.5;",                                       // heavier every fifth level, never on the floor
    "  float hw=(idx?0.62:0.36)*uDpr;",
    "  float a=clamp(hw+0.5-d,0.,1.)*(idx?1.:0.5)*edge*mix(0.3,1.,smoothstep(0.015,0.05,vH));",   // the floor stays faint; the shapes carry the lines
    "  float fw=max(fwidth(vH),1e-5);",
    "  float s1=clamp((vH-uStep*7.5)/fw+0.5,0.,1.)*edge,s2=clamp((vH-uStep*13.5)/fw+0.5,0.,1.)*edge;",  // the shallows a little bluer, as in the hero
    "  vec3 bg=mix(mix(cBg,cSh1,s1),cSh2,s2);",
    "  float sh=clamp(dot(vN,normalize(vec3(-0.45,0.75,0.5))),0.,1.);",
    "  bg*=mix(1.,0.955+0.045*sh,edge);",                                         // just enough shade for the shape to read
    "  vec3 col=mix(bg,cLine,a);",
    "  float bx=abs(vP.x-0.2)/max(fwidth(vP.x),1e-5);",                              // the boundary, traced along the floor of the trench
    "  float bl=clamp(1.3-bx,0.,1.)*step(0.42,fract(vP.y*15.))*uBnd*edge;",
    "  gl_FragColor=vec4(mix(col,cBlue,bl),1.);",
    "}"
  ].join("\n");
  var VS_B = "attribute vec2 a;uniform mat4 uM;varying vec2 vQ;void main(){vQ=a;gl_Position=uM*vec4(0.2,-0.16+a.y*0.78,a.x,1.);}";
  var FS_B = [
    "#extension GL_OES_standard_derivatives : enable",
    "precision highp float;uniform vec3 cBlue;uniform float uBnd;varying vec2 vQ;",
    "void main(){",
    "  float fz=1.-smoothstep(0.5,0.82,abs(vQ.x));",
    "  float fill=0.075*(0.35+0.65*vQ.y)*fz;",
    "  float dt=(1.-vQ.y)/max(fwidth(vQ.y),1e-5);",
    "  float line=clamp(1.4-dt,0.,1.)*step(0.42,fract(vQ.x*15.))*fz*0.85;",      // a dashed top edge, like the boundary on the page
    "  float al=max(fill,line)*uBnd;gl_FragColor=vec4(cBlue*al,al);",
    "}"
  ].join("\n");

  /* ---------- small matrix helpers (column-major) ---------- */
  function perspective(fovy, aspect, near, far) {
    var f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
    return [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0];
  }
  function lookAt(e, t) {
    var zx = e[0] - t[0], zy = e[1] - t[1], zz = e[2] - t[2], zl = Math.hypot(zx, zy, zz); zx /= zl; zy /= zl; zz /= zl;
    var xx = zz, xy = 0, xz = -zx, xl = Math.hypot(xx, xz); xx /= xl; xz /= xl;          // up = +y
    var yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    return [xx, yx, zx, 0, xy, yy, zy, 0, xz, yz, zz, 0,
      -(xx * e[0] + xy * e[1] + xz * e[2]), -(yx * e[0] + yy * e[1] + yz * e[2]), -(zx * e[0] + zy * e[1] + zz * e[2]), 1];
  }
  function mul(a, b) {
    var o = new Array(16);
    for (var c = 0; c < 4; c++) for (var r = 0; r < 4; r++) {
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
    return o;
  }

  /* ---------- the network on each shape, in terrain coordinates (x, z) ---------- */
  function nearest(pts, p, list) {
    var best = list[0], bd = 1e9;
    list.forEach(function (k) { var dd = Math.hypot(pts[k][0] - p[0], pts[k][1] - p[1]); if (dd < bd) { bd = dd; best = k; } });
    return best;
  }
  // the supply chain's network: a hub, an inner ring of five, an outer ring of ten over its shoulders, each tied inward
  function bigCluster(pts, edges, cx, cz) {
    var h = pts.length, inner = [], outer = []; pts.push([cx, cz]);
    [0.3, 1.5, 2.6, 3.8, 5.0].forEach(function (a) { pts.push([cx + Math.cos(a) * 0.14, cz + Math.sin(a) * 0.14]); inner.push(pts.length - 1); edges.push([h, pts.length - 1]); });
    inner.forEach(function (k, i) { if (i % 2 === 0) edges.push([k, inner[(i + 1) % inner.length]]); });
    [0.1, 0.65, 1.2, 1.8, 2.35, 2.95, 3.55, 4.15, 4.8, 5.5].forEach(function (a, i) { var rr = 0.27 + (i % 2) * 0.08; pts.push([cx + Math.cos(a) * rr, cz + Math.sin(a) * rr]); outer.push(pts.length - 1); });
    outer.forEach(function (k, i) { edges.push([k, outer[(i + 1) % outer.length]]); if (i % 2 === 0 || i === 5) edges.push([k, nearest(pts, pts[k], inner)]); });
    return h;
  }
  // the new supplier's: a hub and four around it
  function smallCluster(pts, edges, cx, cz, small) {
    var h = pts.length; pts.push([cx, cz]); small[h] = 1;
    for (var k = 0; k < 4; k++) { var a = 0.4 + k * 1.5708; pts.push([cx + Math.cos(a) * 0.085, cz + Math.sin(a) * 0.085]); small[h + 1 + k] = 1; edges.push([h, h + 1 + k]); edges.push([h + 1 + k, h + 1 + (k + 1) % 4]); }
    return h;
  }
  function chainNet(b, sx, cross) {
    var pts = [], edges = [], small = {};
    var a = bigCluster(pts, edges, b, 0.04), n = smallCluster(pts, edges, sx, -0.06, small);
    if (cross) edges.push([n, a, 1]);
    return { pts: pts, edges: edges, hubs: [a, n], small: small, sx: sx };
  }
  function hubNet() {
    var pts = [[0, 0]], edges = [], ridge = [];
    for (var k = 0; k < 5; k++) {
      var a = RA[k], L = RL[k], dx = Math.cos(a), dz = Math.sin(a), row = [];
      [0.17, 0.33 * L, 0.49 * L, 0.65 * L].forEach(function (al, i) { pts.push([dx * al, dz * al]); row.push(pts.length - 1); edges.push([i ? pts.length - 2 : 0, pts.length - 1, 0, k]); });
      ridge.push(row);
    }
    for (var k2 = 0; k2 < 5; k2++) edges.push([ridge[k2][0], ridge[(k2 + 1) % 5][0], 0, -1]);
    return { pts: pts, edges: edges, hubs: [0] };
  }
  // carry each point to the nearest free place in the next shape, so the network flows rather than shuffles
  function match(from, to) {
    var pairs = [], perm = new Array(to.pts.length), usedF = {}, usedT = {};
    for (var i = 0; i < from.pts.length; i++) for (var j = 0; j < to.pts.length; j++) {
      pairs.push([Math.hypot(from.pts[i][0] - to.pts[j][0], from.pts[i][1] - to.pts[j][1]), i, j]);
    }
    pairs.sort(function (a, b) { return a[0] - b[0]; });
    pairs.forEach(function (p) { if (!usedF[p[1]] && !usedT[p[2]]) { usedF[p[1]] = usedT[p[2]] = 1; perm[p[2]] = p[1]; } });
    var pts = new Array(from.pts.length);
    for (var j2 = 0; j2 < to.pts.length; j2++) pts[perm[j2]] = to.pts[j2];
    return { pts: pts, hubs: to.hubs.map(function (h) { return perm[h]; }), edges: to.edges.map(function (e) { return [perm[e[0]], perm[e[1]], e[2] || 0, e[3] === undefined ? -1 : e[3]]; }) };
  }

  /* ---------- the stage ---------- */
  function Relief(stage, sections) {
    this.stage = stage; this.sections = sections;
    this.cv = stage.querySelector("canvas.relief"); this.ov = stage.querySelector("canvas.net");
    var gl = this.cv.getContext("webgl", { antialias: true, alpha: true, premultipliedAlpha: true });
    if (!gl || !gl.getExtension("OES_standard_derivatives")) { this.ok = false; return; }
    this.gl = gl; this.ctx = this.ov.getContext("2d");
    this.S = { W: [1, 0, 0], s0: [-0.3, 0.55, 0.22], s1: [-0.34, 0.6, 0.22], t: 4, lift: [0, 0, 0, 0, 0] };
    this.lit = -1; this.p = 0; this.pp = null; this.par = { x: 0, y: 0, tx: 0, ty: 0 };
    var A = chainNet(-0.3, 0.55, false), B = chainNet(-0.34, 0.6, true);
    this.nets = [A, B, match(B, hubNet())];
    this.nodes = A.pts.map(function () { return { r: Math.random(), vis: 1 }; });
    if (!this.build()) { this.ok = false; return; }
    this.ok = true;
    this.colours();
    var self = this;
    this.resize();
    window.addEventListener("resize", function () { self.resize(); self.kick(); });
    if (!REDUCED) window.addEventListener("pointermove", function (e) {
      self.par.tx = (e.clientX / window.innerWidth - 0.5) * 2; self.par.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });
    window.addEventListener("scroll", function () { self.kick(); }, { passive: true });
    this.seen = true;
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) { self.seen = es[es.length - 1].isIntersecting; self.kick(); }).observe(stage);
    }
    document.addEventListener("visibilitychange", function () { self.kick(); });
    this.kick();
  }

  Relief.prototype.build = function () {
    var gl = this.gl;
    function prog(vs, fs) {
      var p = gl.createProgram();
      [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]].forEach(function (s) {
        var sh = gl.createShader(s[0]); gl.shaderSource(sh, s[1]); gl.compileShader(sh);
        if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) { if (window.console) console.warn(gl.getShaderInfoLog(sh)); }
        gl.attachShader(p, sh);
      });
      gl.linkProgram(p);
      return gl.getProgramParameter(p, gl.LINK_STATUS) ? p : null;
    }
    this.pT = prog(VS_T, FS_T); this.pB = prog(VS_B, FS_B);
    if (!this.pT || !this.pB) return false;
    // the terrain mesh: a square grid over [-1, 1]; the shader cuts it to a disc
    var G = 150, v = new Float32Array((G + 1) * (G + 1) * 2), ix = new Uint16Array(G * G * 6), n = 0;
    for (var j = 0; j <= G; j++) for (var i = 0; i <= G; i++) { v[n++] = i / G * 2 - 1; v[n++] = j / G * 2 - 1; }
    n = 0;
    for (var j2 = 0; j2 < G; j2++) for (var i2 = 0; i2 < G; i2++) {
      var a = j2 * (G + 1) + i2, b = a + 1, c = a + G + 1, d = c + 1;
      ix[n++] = a; ix[n++] = c; ix[n++] = b; ix[n++] = b; ix[n++] = c; ix[n++] = d;
    }
    this.vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this.vb); gl.bufferData(gl.ARRAY_BUFFER, v, gl.STATIC_DRAW);
    this.ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, ix, gl.STATIC_DRAW);
    this.nIdx = ix.length;
    // the boundary: one upright sheet across the trench (z along it, v up it)
    this.bb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this.bb);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-0.86, 0, 0.86, 0, -0.86, 1, 0.86, 1]), gl.STATIC_DRAW);
    var self = this;
    this.uT = {}; ["uM", "uW", "uS0", "uS1", "uT", "uLift", "uRA", "uRL", "cBg", "cLine", "cSh1", "cSh2", "cBlue", "uStep", "uDpr", "uBnd"].forEach(function (k) { self.uT[k] = gl.getUniformLocation(self.pT, k); });
    this.uB = {}; ["uM", "cBlue", "uBnd"].forEach(function (k) { self.uB[k] = gl.getUniformLocation(self.pB, k); });
    this.aT = gl.getAttribLocation(this.pT, "a"); this.aB = gl.getAttribLocation(this.pB, "a");
    return true;
  };

  Relief.prototype.colours = function () {
    var el = this.stage;
    this.c = {
      bg: rgb(prop(el, "--field-bg", "#f8f8f5")), line: rgb(prop(el, "--field-line", "#23404e")),
      sh1: rgb(prop(el, "--field-shoal", "#eef2f6")), sh2: rgb(prop(el, "--field-shoal-2", "#e3eaf2")),
      blue: rgb(prop(el, "--field-link", "#406bb5")), paper: prop(el, "--field-bg", "#f8f8f5"), link: prop(el, "--field-link", "#406bb5")
    };
  };

  Relief.prototype.resize = function () {
    var r = this.stage.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1);
    this.W = Math.max(1, r.width); this.H = Math.max(1, r.height); this.dpr = d;
    [this.cv, this.ov].forEach(function (c) { c.width = Math.round(r.width * d); c.height = Math.round(r.height * d); });
  };

  Relief.prototype.kick = function () {
    if (!this.ok) return;
    var on = this.seen && !document.hidden;
    if (REDUCED) {                     // held still: draw once on the next frame after anything changes
      if (on && !this.pending) { this.pending = true; var me = this; requestAnimationFrame(function () { me.pending = false; me.frame(0); }); }
      return;
    }
    if (on && !this.running) {
      this.running = true; this.last = performance.now(); var self = this;
      requestAnimationFrame(function loop(now) {
        if (!(self.seen && !document.hidden)) { self.running = false; return; }
        var dt = Math.min(0.05, (now - self.last) / 1000); self.last = now;
        self.frame(dt);
        requestAnimationFrame(loop);
      });
    }
  };

  // where the reader is: 0 at the first chapter's middle, 1 at the second's, 2 at the third's;
  // below 0 (down to -1) while the first chapter is still coming up the screen
  Relief.prototype.progress = function () {
    // measured against the middle of where the chapters are read: the screen centre, or on phones (relief along the foot) the upper part
    var H = window.innerHeight, ref = this.W > window.innerWidth * 0.9 ? H * 0.32 : H / 2;
    var c = this.sections.map(function (s) { var b = s.getBoundingClientRect(); return b.top + b.height / 2 - ref; });
    if (c[0] >= 0) return -Math.min(1, c[0] / (H * 0.9));
    for (var i = 0; i < c.length - 1; i++) if (c[i] <= 0 && c[i + 1] > 0) return i + (-c[i]) / (c[i + 1] - c[i]);
    return c.length - 1;
  };

  Relief.prototype.frame = function (dt) {
    var S = this.S, still = REDUCED || !dt;
    if (!still) S.t += dt * 0.6;
    var target = this.progress();
    this.p = this.pp === null || still ? target : this.p + (target - this.p) * Math.min(1, dt * 2.8);   // the relief settles just after the scroll, never jumps with it
    this.pp = this.p;
    var pc = Math.max(0, this.p), i0 = Math.min(1, Math.floor(pc)), m = smooth(0.3, 0.7, pc - i0);
    // the new supplier comes in from the edge and rises as the first chapter arrives
    var arrive = smooth(-0.9, -0.08, this.p);
    S.s0 = [-0.3, 0.55 + 0.4 * (1 - arrive), 0.03 + 0.19 * arrive];
    this.nets[0].shift = S.s0[1] - this.nets[0].sx;
    S.W = [0, 0, 0]; S.W[i0] = 1 - m; S.W[i0 + 1] = m;
    for (var k = 0; k < 5; k++) S.lift[k] += ((k === this.lit ? 1 : 0) - S.lift[k]) * (still ? 1 : Math.min(1, dt * 5));
    var P = this.par; P.x += (P.tx - P.x) * (still ? 1 : Math.min(1, dt * 2)); P.y += (P.ty - P.y) * (still ? 1 : Math.min(1, dt * 2));

    // the view: each shape is seen from the angle that shows it best
    var yaws = [14, 64, -6], els = [27, 23, 40];   // the second turns the view to face the boundary
    var yaw = (yaws[i0] * (1 - m) + yaws[i0 + 1] * m + P.x * 5 + (still ? 0 : Math.sin(S.t * 0.09) * 2)) * DEG;
    var el = (els[i0] * (1 - m) + els[i0 + 1] * m - P.y * 3) * DEG;
    var W = this.W, H = this.H, asp = W / H, fov = 32 * DEG, ty = Math.tan(fov / 2), tx = ty * asp;
    var D = Math.max(0.94 / tx, 0.84 / ty);
    var tgt = [0, 0.08, 0], eye = [tgt[0] + D * Math.sin(yaw) * Math.cos(el), tgt[1] + D * Math.sin(el), tgt[2] + D * Math.cos(yaw) * Math.cos(el)];
    var M = mul(perspective(fov, asp, 0.1, 40), lookAt(eye, tgt));
    this.M = M; this.eye = eye;

    var gl = this.gl, c = this.c, bnd = S.W[1];
    gl.viewport(0, 0, this.cv.width, this.cv.height);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.disable(gl.BLEND);
    gl.useProgram(this.pT);
    var u = this.uT;
    gl.uniformMatrix4fv(u.uM, false, new Float32Array(M));
    gl.uniform3f(u.uW, S.W[0], S.W[1], S.W[2]); gl.uniform3fv(u.uS0, S.s0); gl.uniform3fv(u.uS1, S.s1); gl.uniform1f(u.uT, S.t); gl.uniform1fv(u.uLift, S.lift); gl.uniform1fv(u.uRA, RA); gl.uniform1fv(u.uRL, RL);
    gl.uniform3fv(u.cBg, c.bg); gl.uniform3fv(u.cLine, c.line); gl.uniform3fv(u.cSh1, c.sh1); gl.uniform3fv(u.cSh2, c.sh2); gl.uniform3fv(u.cBlue, c.blue);
    gl.uniform1f(u.uStep, 0.021); gl.uniform1f(u.uDpr, this.dpr); gl.uniform1f(u.uBnd, bnd);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vb); gl.enableVertexAttribArray(this.aT); gl.vertexAttribPointer(this.aT, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ib);
    gl.drawElements(gl.TRIANGLES, this.nIdx, gl.UNSIGNED_SHORT, 0);
    if (bnd > 0.01) {
      gl.useProgram(this.pB); gl.depthMask(false); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.uniformMatrix4fv(this.uB.uM, false, new Float32Array(M)); gl.uniform3fv(this.uB.cBlue, c.blue); gl.uniform1f(this.uB.uBnd, bnd);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.bb); gl.enableVertexAttribArray(this.aB); gl.vertexAttribPointer(this.aB, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    this.drawNet(dt, still, i0, m);
  };

  Relief.prototype.project = function (x, y, z) {
    var M = this.M, cx = M[0] * x + M[4] * y + M[8] * z + M[12], cy = M[1] * x + M[5] * y + M[9] * z + M[13], cw = M[3] * x + M[7] * y + M[11] * z + M[15];
    return [(cx / cw * 0.5 + 0.5) * this.W, (0.5 - cy / cw * 0.5) * this.H];
  };

  // is a point on the terrain hidden from the eye by a rise in front of it?
  Relief.prototype.hidden = function (x, y, z) {
    var e = this.eye, S = this.S, top = 0.62;
    if (e[1] <= y) return false;
    var tm = Math.min(1, (top - y) / (e[1] - y));
    for (var s = 1; s <= 22; s++) {
      var t = 0.015 + (tm - 0.015) * s / 22, px = x + (e[0] - x) * t, py = y + (e[1] - y) * t, pz = z + (e[2] - z) * t;
      if (height(px, pz, S) > py + 0.004) return true;
    }
    return false;
  };

  Relief.prototype.drawNet = function (dt, still, i0, m) {
    var c = this.ctx, d = this.dpr, S = this.S, N = this.nodes, A = this.nets[i0], B = this.nets[i0 + 1], self = this;
    c.setTransform(d, 0, 0, d, 0, 0); c.clearRect(0, 0, this.W, this.H);
    function at(net, i) { var p = net.pts[i]; return net.shift && net.small && net.small[i] ? [p[0] + net.shift, p[1]] : p; }
    // each point flows from its place in one shape to its place in the next, a little out of step with the rest
    N.forEach(function (n, i) {
      var k = easeInOut(m * 1.3 - n.r * 0.3), pa = at(A, i), pb = at(B, i);
      var x = pa[0] + (pb[0] - pa[0]) * k + Math.sin(S.t * 0.8 + n.r * 9) * 0.006, z = pa[1] + (pb[1] - pa[1]) * k + Math.cos(S.t * 0.7 + n.r * 7) * 0.006;
      var y = height(x, z, S) + 0.012;
      n.x = x; n.y = y; n.z = z; var q = self.project(x, y, z); n.sx = q[0]; n.sy = q[1];
      var tv = self.hidden(x, y, z) ? 0 : 1 - smooth(0.7, 0.92, Math.hypot(x, z));   // nothing shows beyond the relief's rim
      n.vis += (tv - n.vis) * (still ? 1 : Math.min(1, dt * 6));
    });
    var lit = this.lit;
    function edges(net, alpha) {
      if (alpha < 0.01) return;
      net.edges.forEach(function (e) {
        var a = N[e[0]], b = N[e[1]], w = alpha * Math.min(a.vis, b.vis), on = e[3] >= 0 && e[3] === lit;
        if (e[2]) { self.bridge(a, b, alpha); return; }
        if (w < 0.01) return;
        c.globalAlpha = w * (on ? 1 : 0.62); c.lineWidth = on ? 2 : 1; c.strokeStyle = self.c.link;
        c.beginPath(); c.moveTo(a.sx, a.sy); c.lineTo(b.sx, b.sy); c.stroke();
      });
    }
    // the old shape's links let go as it starts to change; the new shape's links join once its points have arrived
    edges(A, 1 - smooth(0, 0.3, m));
    edges(B, smooth(0.75, 1, m));
    c.lineWidth = 1;
    var big = {};
    if (lit >= 0 && i0 + 1 === 2) B.edges.forEach(function (e) { if (e[3] === lit) { big[e[0]] = big[e[1]] = 1; } });
    N.forEach(function (n, i) {
      if (n.vis < 0.02) return;
      var mm = smooth(0.3, 0.7, m), r = (A.hubs.indexOf(i) >= 0 ? 3.4 : 2.7) * (1 - mm) + (B.hubs.indexOf(i) >= 0 ? 3.4 : 2.7) * mm;
      if (big[i]) r += 1.3 * mm;
      c.globalAlpha = n.vis; c.fillStyle = self.c.paper; c.beginPath(); c.arc(n.sx, n.sy, r + 2, 0, Math.PI * 2); c.fill();
      c.fillStyle = self.c.link; c.beginPath(); c.arc(n.sx, n.sy, r, 0, Math.PI * 2); c.fill();
    });
    c.globalAlpha = 1;
  };

  // the one link that crosses: an arc over the boundary, with the result running along it
  Relief.prototype.bridge = function (a, b, alpha) {
    var c = this.ctx, S = this.S, pts = [], lift = 0.24, cross = -1;
    for (var s = 0; s <= 24; s++) {
      var t = s / 24, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t, y = a.y + (b.y - a.y) * t + Math.sin(t * Math.PI) * lift;
      pts.push(this.project(x, y, z));
      if (cross < 0 && (a.x - BX) * ((a.x + (b.x - a.x) * t) - BX) <= 0) cross = s;
    }
    c.globalAlpha = alpha; c.strokeStyle = this.c.link; c.lineWidth = 2;
    c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.stroke();
    c.lineWidth = 1;
    if (cross >= 0) { c.beginPath(); c.arc(pts[cross][0], pts[cross][1], 6, 0, Math.PI * 2); c.stroke(); }
    if (!REDUCED) {
      var f = (S.t / 1.6) % 1, at = f * 24, k = Math.floor(at), r = at - k, p0 = pts[k], p1 = pts[Math.min(24, k + 1)];
      var px = p0[0] + (p1[0] - p0[0]) * r, py = p0[1] + (p1[1] - p0[1]) * r;
      c.globalAlpha = alpha * Math.sin(f * Math.PI); c.fillStyle = this.c.link;
      c.beginPath(); c.arc(px, py, 3.6, 0, Math.PI * 2); c.fill();
    }
  };

  window.AlityRelief = Relief;
})();
