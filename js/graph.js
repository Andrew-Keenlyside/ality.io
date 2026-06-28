/* Ality Logistics — live supply-chain graph logic */

const STATUS = {
  ok:    { c: "#3f8f5f", label: "Operational" },
  risk:  { c: "#c08a2e", label: "At risk" },
  fault: { c: "#b8483f", label: "Disrupted" },
  new:   { c: "#2f7d8a", label: "Candidate" },
};
// node tiers: 0 OEM, 1, 2, 3
const NODES = [
  { id:"oem", label:"Ørsted OEM", x:480, y:330, tier:0, status:"ok", part:"Asset owner", region:"Denmark", lead:"—", otd:"—", spend:"—", alt:"—", conc:20 },
  { id:"blades", label:"LM Wind", x:230, y:170, tier:1, status:"ok", part:"Rotor blades", region:"Spain", lead:"16 wks", otd:"97.1%", spend:"€62M", alt:"2", conc:34 },
  { id:"towers", label:"Welcon", x:250, y:500, tier:1, status:"risk", part:"Towers", region:"Denmark", lead:"19 wks", otd:"91.4%", spend:"€48M", alt:"1", conc:64 },
  { id:"nacelle", label:"Siemens Gamesa", x:740, y:180, tier:1, status:"ok", part:"Nacelle", region:"Germany", lead:"22 wks", otd:"95.8%", spend:"€140M", alt:"2", conc:41 },
  { id:"gearbox", label:"ZF Wind", x:760, y:470, tier:1, status:"ok", part:"Gearbox", region:"Germany", lead:"14 wks", otd:"96.4%", spend:"€48M", alt:"3", conc:28 },
  { id:"resin", label:"Olin Epoxy", x:60, y:90, tier:2, status:"risk", part:"Resin", region:"USA", lead:"11 wks", otd:"89.0%", spend:"€12M", alt:"3", conc:58 },
  { id:"balsa", label:"3A Composites", x:70, y:300, tier:2, status:"ok", part:"Balsa core", region:"Ecuador", lead:"13 wks", otd:"94.2%", spend:"€9M", alt:"2", conc:30 },
  { id:"steel", label:"Dillinger", x:120, y:620, tier:2, status:"fault", part:"Steel plate", region:"Germany", lead:"17 wks", otd:"82.3%", spend:"€31M", alt:"3", conc:88 },
  { id:"magnets", label:"Vacuumschmelze", x:960, y:90, tier:2, status:"ok", part:"Magnets", region:"Germany", lead:"20 wks", otd:"93.5%", spend:"€22M", alt:"1", conc:55 },
  { id:"rareearth", label:"Lynas Rare Earths", x:1040, y:260, tier:3, status:"new", part:"NdPr oxide", region:"Australia", lead:"26 wks", otd:"—", spend:"€8M", alt:"2", conc:72 },
  { id:"bearings", label:"Schaeffler", x:980, y:560, tier:2, status:"ok", part:"Bearings", region:"Germany", lead:"15 wks", otd:"96.0%", spend:"€18M", alt:"3", conc:33 },
  { id:"cable", label:"NKT Cables", x:470, y:600, tier:1, status:"ok", part:"Array cable", region:"Denmark", lead:"24 wks", otd:"94.9%", spend:"€80M", alt:"2", conc:46 },
  { id:"copper", label:"Aurubis", x:470, y:760, tier:2, status:"risk", part:"Copper", region:"Germany", lead:"12 wks", otd:"90.2%", spend:"€26M", alt:"2", conc:60 },
];
const EDGES = [
  ["blades","oem"],["towers","oem"],["nacelle","oem"],["gearbox","oem"],["cable","oem"],
  ["resin","blades"],["balsa","blades"],["steel","towers"],
  ["magnets","nacelle"],["rareearth","magnets"],["bearings","gearbox"],["nacelle","gearbox"],
  ["copper","cable"],
];
const SIGNALS = {
  risk: [["schedule","Lead time +3 wks vs baseline","#c08a2e"],["public","Single-region dependency","#c08a2e"],["verified","ISO 9001 verified","#3f8f5f"]],
  fault:[["error","Delivery halted — force majeure","#b8483f"],["public","Single-source for this part","#b8483f"],["trending_down","On-time rate falling","#b8483f"]],
  ok:   [["verified","ISO 9001 verified","#3f8f5f"],["trending_up","On-time rate improving","#3f8f5f"],["route","Qualified alternatives available","#586572"]],
  new:  [["new_releases","Candidate — not yet integrated","#2f7d8a"],["public","Diversifies rare-earth supply","#3f8f5f"],["schedule","Long qualification lead time","#c08a2e"]],
};

const SVGNS = "http://www.w3.org/2000/svg";
const svg = document.getElementById("net");
const byId = Object.fromEntries(NODES.map(n => [n.id, n]));
const R = { 0:36, 1:27, 2:20, 3:18 };
let view = { x: 0, y: 0, k: 1 };
let selected = null, hovered = null;
const activeStatus = new Set(["ok","risk","fault","new"]);
const activeTier = new Set([0,1,2,3]);

// build static layers
let gRoot, gEdges, gNodes;
function buildScaffold() {
  svg.innerHTML = "";
  const defs = document.createElementNS(SVGNS, "defs");
  defs.innerHTML = `<pattern id="grid" width="34" height="34" patternUnits="userSpaceOnUse">
    <path d="M34 0H0V34" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="1"/></pattern>`;
  svg.appendChild(defs);
  const bg = document.createElementNS(SVGNS, "rect");
  bg.setAttribute("x","-4000"); bg.setAttribute("y","-4000"); bg.setAttribute("width","8000"); bg.setAttribute("height","8000");
  bg.setAttribute("fill","url(#grid)"); bg.setAttribute("class","bgrect");
  gRoot = document.createElementNS(SVGNS, "g");
  gEdges = document.createElementNS(SVGNS, "g");
  gNodes = document.createElementNS(SVGNS, "g");
  gRoot.appendChild(bg); gRoot.appendChild(gEdges); gRoot.appendChild(gNodes);
  svg.appendChild(gRoot);
}

function visible(n){ return activeStatus.has(n.status) && activeTier.has(n.tier); }

function render() {
  gRoot.setAttribute("transform", `translate(${view.x},${view.y}) scale(${view.k})`);
  // edges
  gEdges.innerHTML = "";
  EDGES.forEach(([a,b]) => {
    const p = byId[a], q = byId[b];
    if (!visible(p) || !visible(q)) return;
    const hot = hovered && (hovered===a||hovered===b) || selected && (selected===a||selected===b);
    const line = document.createElementNS(SVGNS,"line");
    line.setAttribute("x1",p.x); line.setAttribute("y1",p.y);
    line.setAttribute("x2",q.x); line.setAttribute("y2",q.y);
    line.setAttribute("stroke", hot ? "#84a3c4" : "rgba(174,196,219,0.28)");
    line.setAttribute("stroke-width", hot ? 2.4 : 1.4);
    gEdges.appendChild(line);
  });
  // nodes
  gNodes.innerHTML = "";
  NODES.forEach(n => {
    if (!visible(n)) return;
    const s = STATUS[n.status], r = R[n.tier];
    const g = document.createElementNS(SVGNS,"g");
    g.setAttribute("transform", `translate(${n.x},${n.y})`);
    g.style.cursor = "pointer";
    g.dataset.id = n.id;
    const isSel = selected===n.id;
    if (isSel){ const halo=document.createElementNS(SVGNS,"circle"); halo.setAttribute("r",r+8); halo.setAttribute("fill","none"); halo.setAttribute("stroke","#84a3c4"); halo.setAttribute("stroke-width","2"); halo.setAttribute("opacity","0.6"); g.appendChild(halo); }
    const c = document.createElementNS(SVGNS,"circle");
    c.setAttribute("r", r);
    c.setAttribute("fill", n.tier===0 ? "#224360" : "#0f2c44");
    c.setAttribute("stroke", n.tier===0 ? "#84a3c4" : s.c);
    c.setAttribute("stroke-width", n.tier===0 ? 3 : 2.5);
    g.appendChild(c);
    if (n.tier!==0){ const d=document.createElementNS(SVGNS,"circle"); d.setAttribute("cx",r-5); d.setAttribute("cy",-(r-5)); d.setAttribute("r","5"); d.setAttribute("fill",s.c); d.setAttribute("stroke","#0d2236"); d.setAttribute("stroke-width","1.5"); g.appendChild(d); }
    const t = document.createElementNS(SVGNS,"text");
    t.setAttribute("y", r+16); t.setAttribute("text-anchor","middle");
    t.setAttribute("fill", "rgba(255,255,255,0.82)");
    t.setAttribute("font-size","12"); t.setAttribute("font-weight","500");
    t.setAttribute("font-family","var(--font-sans)");
    t.textContent = n.label;
    g.appendChild(t);
    if (n.tier===0){ const o=document.createElementNS(SVGNS,"text"); o.setAttribute("text-anchor","middle"); o.setAttribute("y","4"); o.setAttribute("fill","#fff"); o.setAttribute("font-size","11"); o.setAttribute("font-weight","700"); o.setAttribute("letter-spacing","0.5"); o.textContent="OEM"; g.appendChild(o); }
    gNodes.appendChild(g);
  });
}

/* ---------- interaction: pan, zoom, node drag, hover, select ---------- */
let panning = false, dragNode = null, last = null, moved = false;

function toWorld(clientX, clientY){
  const rect = svg.getBoundingClientRect();
  return { x: (clientX-rect.left-view.x)/view.k, y: (clientY-rect.top-view.y)/view.k };
}
function nodeAt(target){
  let el = target;
  while (el && el !== svg){ if (el.dataset && el.dataset.id) return el.dataset.id; el = el.parentNode; }
  return null;
}

svg.addEventListener("mousedown", (e) => {
  moved = false; last = { x: e.clientX, y: e.clientY };
  const id = nodeAt(e.target);
  if (id){ dragNode = id; }
  else { panning = true; svg.classList.add("grabbing"); }
});
window.addEventListener("mousemove", (e) => {
  if (!last) return;
  const dx = e.clientX-last.x, dy = e.clientY-last.y;
  if (Math.abs(dx)+Math.abs(dy) > 3) moved = true;
  if (dragNode){ const n = byId[dragNode]; n.x += dx/view.k; n.y += dy/view.k; render(); }
  else if (panning){ view.x += dx; view.y += dy; render(); }
  last = { x: e.clientX, y: e.clientY };
});
window.addEventListener("mouseup", (e) => {
  if (dragNode && !moved){ select(dragNode); }
  else if (panning && !moved){ select(null); }
  dragNode = null; panning = false; last = null; svg.classList.remove("grabbing");
});
svg.addEventListener("mousemove", (e) => {
  if (dragNode || panning) return;
  const id = nodeAt(e.target);
  if (id !== hovered){ hovered = id; render(); }
});
svg.addEventListener("mouseleave", () => { if (hovered){ hovered=null; render(); } });

svg.addEventListener("wheel", (e) => {
  e.preventDefault();
  const w = toWorld(e.clientX, e.clientY);
  const factor = e.deltaY < 0 ? 1.12 : 0.89;
  const nk = Math.max(0.4, Math.min(2.4, view.k*factor));
  const rect = svg.getBoundingClientRect();
  view.x = (e.clientX-rect.left) - w.x*nk;
  view.y = (e.clientY-rect.top) - w.y*nk;
  view.k = nk; render();
}, { passive: false });

function zoomBy(f){ const rect=svg.getBoundingClientRect(); const cx=rect.width/2, cy=rect.height/2; const w={x:(cx-view.x)/view.k,y:(cy-view.y)/view.k}; const nk=Math.max(0.4,Math.min(2.4,view.k*f)); view.x=cx-w.x*nk; view.y=cy-w.y*nk; view.k=nk; render(); }
document.getElementById("zin").onclick = () => zoomBy(1.2);
document.getElementById("zout").onclick = () => zoomBy(0.83);
document.getElementById("zreset").onclick = () => fit();

/* ---------- selection + panel ---------- */
function neighboursOf(id){
  const out = [];
  EDGES.forEach(([a,b]) => { if (a===id) out.push(b); else if (b===id) out.push(a); });
  return out.map(x => byId[x]);
}
function select(id){
  selected = id; render(); renderPanel();
}
function renderPanel(){
  const empty = document.getElementById("panelEmpty");
  const content = document.getElementById("panelContent");
  if (!selected){ empty.style.display="flex"; content.style.display="none"; return; }
  const n = byId[selected]; const s = STATUS[n.status];
  empty.style.display="none"; content.style.display="flex";
  const toneBg = { ok:"#dcefe2", risk:"#f5e8cf", fault:"#f3dad7", new:"#c8e4e5" }[n.status];
  const toneFg = { ok:"#1f5b38", risk:"#7a5410", fault:"#7d2820", new:"#1f555f" }[n.status];
  const meterColor = n.conc>75 ? "#b8483f" : n.conc>50 ? "#c08a2e" : "#3f8f5f";
  const sigs = SIGNALS[n.status].map(([ic,tx,cl]) => `<div class="sig"><span class="material-symbols-outlined" style="color:${cl}">${ic}</span>${tx}</div>`).join("");
  const nbs = neighboursOf(n.id).map(m => `<div class="nb" data-go="${m.id}"><span class="dot" style="width:8px;height:8px;border-radius:50%;background:${STATUS[m.status].c};display:inline-block"></span><span class="nm">${m.label}</span><span class="rg">${m.region}</span></div>`).join("");
  const initials = n.label.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
  content.innerHTML = `
    <div class="ph-head">
      <div class="ph-avatar" style="background:${n.tier===0?'#d6e2ee':'#e2e7ed'};color:${n.tier===0?'#224360':'#3e4854'}">${initials}</div>
      <div style="flex:1;min-width:0">
        <div class="ph-title">${n.label}</div>
        <div class="ph-sub">${n.part} · ${n.region}</div>
      </div>
    </div>
    <div class="badges">
      <span class="pill" style="background:${toneBg};color:${toneFg}"><span class="dot" style="background:${s.c}"></span>${s.label}</span>
      <span class="pill" style="background:var(--grey-100);color:var(--grey-700)">Tier ${n.tier}</span>
    </div>
    <div class="ph-body">
      <div class="kv">
        <div class="cell"><div class="k">Lead time</div><div class="v">${n.lead}</div></div>
        <div class="cell"><div class="k">On-time</div><div class="v">${n.otd}</div></div>
        <div class="cell"><div class="k">Spend / yr</div><div class="v">${n.spend}</div></div>
        <div class="cell"><div class="k">Alt. sources</div><div class="v">${n.alt}</div></div>
      </div>
      <div>
        <div class="meter-lbl"><span>Concentration risk</span><span style="font-family:var(--font-mono);color:${meterColor}">${n.conc}%</span></div>
        <div class="meter"><i style="width:${n.conc}%;background:${meterColor}"></i></div>
      </div>
      <div>
        <div class="meter-lbl"><span>Signals</span></div>
        <div style="display:flex;flex-direction:column;gap:9px">${sigs}</div>
      </div>
      <div>
        <div class="meter-lbl"><span>Connected (${neighboursOf(n.id).length})</span></div>
        <div class="neighbours">${nbs || '<div style="color:var(--text-tertiary);font-size:12px">No linked nodes in view</div>'}</div>
      </div>
    </div>
    <div class="ph-foot">
      <button><span class="material-symbols-outlined">route</span>Find alt.</button>
      <button class="primary"><span class="material-symbols-outlined">link</span>Integrate</button>
    </div>`;
  content.querySelectorAll("[data-go]").forEach(el => el.onclick = () => { select(el.dataset.go); focusNode(byId[el.dataset.go]); });
}

/* ---------- filters ---------- */
function buildFilters(){
  const sc = document.getElementById("statusFilters");
  Object.entries(STATUS).forEach(([k,v]) => {
    const count = NODES.filter(n=>n.status===k).length;
    const el = document.createElement("div");
    el.className = "filt"; el.dataset.status = k;
    el.innerHTML = `<span class="sw" style="background:${v.c}"></span>${v.label}<span class="ct">${count}</span>`;
    el.onclick = () => { el.classList.toggle("off"); if (activeStatus.has(k)) activeStatus.delete(k); else activeStatus.add(k); render(); };
    sc.appendChild(el);
  });
  const tc = document.getElementById("tierFilters");
  [["0","OEM"],["1","Tier 1"],["2","Tier 2"],["3","Tier 3"]].forEach(([t,lbl]) => {
    const count = NODES.filter(n=>n.tier===+t).length;
    const el = document.createElement("div");
    el.className = "filt"; el.innerHTML = `<span class="sw" style="background:#5a7fa0"></span>${lbl}<span class="ct">${count}</span>`;
    el.onclick = () => { el.classList.toggle("off"); if (activeTier.has(+t)) activeTier.delete(+t); else activeTier.add(+t); render(); };
    tc.appendChild(el);
  });
}

/* ---------- fit / center ---------- */
function fit(){
  const rect = svg.getBoundingClientRect();
  const xs = NODES.map(n=>n.x), ys = NODES.map(n=>n.y);
  const minX=Math.min(...xs)-60, maxX=Math.max(...xs)+60, minY=Math.min(...ys)-60, maxY=Math.max(...ys)+60;
  const w = maxX-minX, h = maxY-minY;
  const k = Math.min(rect.width/w, rect.height/h, 1.4);
  view.k = k;
  view.x = (rect.width - w*k)/2 - minX*k;
  view.y = (rect.height - h*k)/2 - minY*k;
  render();
}
function focusNode(n){
  const rect = svg.getBoundingClientRect();
  view.x = rect.width/2 - n.x*view.k;
  view.y = rect.height/2 - n.y*view.k;
  render();
}
