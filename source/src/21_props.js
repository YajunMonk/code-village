/* ============================================================
 * 21 美术：树、房屋、道具、图标
 * ============================================================ */
const LEAF = {
  oak: ['#1d4a3a', '#2c6b44', '#43914e', '#6cb85a', '#a4dc76'],
  blossom: ['#8a3a62', '#c25a88', '#e888ac', '#ffbcd4', '#fff0f6'],
  autumn: ['#7a2e1e', '#b04a22', '#e07a2a', '#f4a83a', '#ffd870'],
  night: ['#1e1838', '#2e2654', '#463a7a', '#5e52a0', '#8a7ac8'],
};
const BARK = ['#3a2418', '#5a3a26', '#7e5434', '#a0724a'];

function makeTree(kind = 'oak', seed = 1) {
  const L = LEAF[kind] || LEAF.oak, W = 36, H = 48, rnd = mulberry32(seed * 977 + 13);
  return spr(W, H, A => {
    const { R, P } = A;
    // 树干
    const tx = 15;
    R(tx, 30, 6, 18, BARK[1]); R(tx, 30, 2, 18, BARK[2]); R(tx + 5, 30, 1, 18, BARK[0]);
    R(tx - 2, 45, 10, 3, BARK[1]); R(tx - 3, 47, 3, 1, BARK[1]); R(tx + 7, 47, 3, 1, BARK[0]);
    for (let y = 32; y < 46; y += 3) P(tx + 1 + ((y * 7) % 3), y, BARK[0]);
    P(tx + 3, 38, BARK[3]); P(tx + 1, 42, BARK[3]);
    // 树冠：几个圆叠起来
    const blobs = [[18, 15, 14], [8, 22, 8.5], [28, 22, 8.5], [18, 25, 11], [11, 11, 8], [25, 10, 8]].map(([x, y, r]) => [x + (rnd() - .5) * 2, y + (rnd() - .5) * 2, r + (rnd() - .5) * 1.5]);
    const inC = (x, y) => { for (const [cx, cy, r] of blobs) { const d = Math.hypot(x + .5 - cx, y + .5 - cy); if (d < r + (hash2(x, y, seed) - .5) * 1.6) return [cx, cy, r]; } return null; };
    for (let y = 0; y < 34; y++) for (let x = 0; x < W; x++) {
      const b = inC(x, y); if (!b) continue;
      const [cx, cy, r] = b, nx = (x - cx) / r, ny = (y - cy) / r;
      let l = -(nx * .55 + ny * .85) + (fbm(x / 5, y / 5, seed) - .5) * .9;
      if (y > 26) l -= .5;
      const i = l > .62 ? 4 : l > .25 ? 3 : l > -.2 ? 2 : l > -.6 ? 1 : 0;
      P(x, y, L[i]);
    }
    // 叶团纹理
    for (let k = 0; k < 40; k++) { const x = (rnd() * W) | 0, y = (rnd() * 32) | 0; if (A.G(x, y) === L[2] || A.G(x, y) === L[3]) { P(x, y, L[1]); P(x + 1, y, L[2]); } }
    for (let k = 0; k < 18; k++) { const x = (rnd() * W) | 0, y = (rnd() * 20) | 0; if (A.G(x, y) === L[3]) P(x, y, L[4]); }
    if (kind === 'oak' && seed % 3 === 0) for (let k = 0; k < 7; k++) { const x = 6 + (rnd() * 24) | 0, y = 8 + (rnd() * 18) | 0; if (A.G(x, y)) { P(x, y, '#e04848'); P(x, y - 1, '#ff8a8a'); } }
    if (kind === 'blossom') for (let k = 0; k < 14; k++) { const x = 4 + (rnd() * 28) | 0, y = 4 + (rnd() * 24) | 0; if (A.G(x, y)) P(x, y, '#ffffff'); }
  });
}
function makePine(seed = 1, night = false) {
  const L = night ? LEAF.night : ['#173d36', '#22584a', '#327a58', '#4e9a64', '#7cc07a'];
  return spr(26, 46, A => {
    const { R, P } = A;
    R(11, 36, 4, 10, BARK[1]); R(11, 36, 1, 10, BARK[2]);
    for (let t = 0; t < 4; t++) {
      const top = 2 + t * 8, h = 14, w0 = 3 + t * 2;
      for (let y = 0; y < h; y++) { const hw = Math.round(w0 * .4 + (y / h) * (6 + t * 2)); for (let x = -hw; x <= hw; x++) { const l = -x / (hw + 1) * .8 - y / h * .4 + (hash2(x, y + top, seed) - .5) * .5; P(13 + x, top + y, L[l > .45 ? 4 : l > .1 ? 3 : l > -.3 ? 2 : 1]); } }
      R(13 - (6 + t * 2) + 1, top + h - 1, (6 + t * 2) * 2 - 1, 1, L[0]);
    }
    P(13, 1, L[4]);
  });
}
function makeDeadTree(seed = 1) {
  const rnd = mulberry32(seed * 31);
  return spr(30, 44, A => {
    const c = ['#1a1428', '#2e2444', '#463a62', '#5e5080'];
    A.R(13, 18, 4, 26, c[1]); A.R(13, 18, 1, 26, c[2]); A.R(10, 41, 10, 3, c[1]);
    const br = (x, y, dx, dy, n) => { for (let i = 0; i < n; i++) { A.P(x, y, c[1]); A.P(x + 1, y, c[2]); x += dx; y += dy; if (rnd() < .3) dx = -dx * .5 + (rnd() - .5); } };
    br(14, 20, -1, -1, 10); br(16, 18, 1, -1.2, 10); br(15, 14, .2, -1, 12); br(13, 26, -1.2, -.6, 8); br(17, 24, 1.3, -.5, 9);
    for (let i = 0; i < 6; i++) { const x = (rnd() * 28) | 0, y = (rnd() * 20) | 0; if (A.G(x, y)) A.P(x, y, '#ff5ac8'); }
  });
}
function makeBush(seed = 1, flowers = null) {
  const L = LEAF.oak;
  return spr(20, 14, A => {
    const { E, P } = A;
    E(6, 8, 6, 5.5, L[2]); E(14, 8, 6, 5.5, L[2]); E(10, 6, 6.5, 5.5, L[2]);
    for (let y = 0; y < 14; y++) for (let x = 0; x < 20; x++) { const g = A.G(x, y); if (!g) continue; const l = -(x - 8) / 12 - (y - 6) / 6 + (hash2(x, y, seed) - .5) * .8; P(x, y, L[l > .7 ? 4 : l > .2 ? 3 : l > -.5 ? 2 : 1]); }
    for (let x = 1; x < 19; x++) if (A.G(x, 13)) P(x, 13, L[0]);
    if (flowers) for (let k = 0; k < 6; k++) { const x = 3 + ((hash2(k, seed, 2) * 14) | 0), y = 3 + ((hash2(k, seed, 5) * 7) | 0); P(x, y, flowers); P(x + 1, y, '#fff6c0'); }
  });
}
function makeRock(seed = 1, dark = false) {
  const c = dark ? ['#241c38', '#3a2e56', '#54467a', '#7a68a8'] : ['#3e4258', '#62677e', '#8d93ab', '#bfc4d8'];
  return spr(16, 11, A => {
    A.E(8, 6, 7.5, 5, c[1]);
    for (let y = 0; y < 11; y++) for (let x = 0; x < 16; x++) { if (!A.G(x, y)) continue; const l = -(x - 6) / 8 - (y - 4) / 4 + (hash2(x, y, seed) - .5) * .5; A.P(x, y, c[l > .9 ? 3 : l > 0 ? 2 : l > -1 ? 1 : 0]); }
    if (!dark) { A.P(4, 8, '#5e9a52'); A.P(5, 9, '#5e9a52'); A.P(11, 9, '#5e9a52'); }
  });
}

/* ---------- 房屋 ---------- */
function makeHouse(o) {
  const w = o.w || 96, wallH = o.wallH || 40, roofH = o.roofH || 40, W = w + 10, H = roofH + wallH + 2;
  const out = { lights: [], door: null, chimney: null };
  const rf = o.roof, wx0 = 5, wy0 = roofH - 4, wy1 = H - 1;
  out.canvas = spr(W, H, A => {
    const { R, P } = A;
    // 墙
    if (o.wall === 'plaster' || o.wall === 'white') {
      const pc = o.wall === 'white' ? ['#c8ccd8', '#eef0f6', '#ffffff'] : ['#d8c8a4', '#f2e4c2', '#fff4dc'];
      R(wx0, wy0, w, wy1 - wy0, pc[1]);
      for (let y = wy0; y < wy1; y++) for (let x = wx0; x < wx0 + w; x++) if (hash2(x, y, 4) > .93) P(x, y, pc[0]);
      if (o.wall === 'plaster') { R(wx0, wy0 + 4, w, 2, BARK[1]); [0, w / 2 - 1, w - 2].forEach(x => R(wx0 + x, wy0, 2, wy1 - wy0, BARK[1])); for (let i = 0; i < w - 2; i += 2) P(wx0 + 1 + i, wy0 + 6, BARK[0]); }
    } else if (o.wall === 'stone') {
      R(wx0, wy0, w, wy1 - wy0, '#7a7f98');
      for (let y = wy0, row = 0; y < wy1; y += 6, row++) for (let x = wx0 - (row % 2) * 6; x < wx0 + w; x += 12) {
        const c = ['#868ca6', '#9399b2', '#7f849e'][(hash2(x, y, 3) * 3) | 0];
        R(Math.max(wx0, x + 1), y + 1, Math.min(10, wx0 + w - x - 1), 4, c); R(Math.max(wx0, x + 1), y + 1, Math.min(10, wx0 + w - x - 1), 1, '#aab0c8');
      }
    } else {
      const wc = o.wood || ['#5a3a26', '#8a5a3a', '#a8744c'];
      R(wx0, wy0, w, wy1 - wy0, wc[1]);
      for (let x = wx0; x < wx0 + w; x += 6) { R(x, wy0, 1, wy1 - wy0, wc[0]); const k = hash2(x, 1, 7); if (k > .6) R(x + 1, wy0, 5, wy1 - wy0, mix(wc[1], wc[2], .5)); }
      for (let y = wy0 + 3; y < wy1; y += 7) for (let x = wx0 + 2; x < wx0 + w; x += 6) if (hash2(x, y, 2) > .7) P(x + 2, y, wc[0]);
    }
    // 屋檐阴影
    for (let x = wx0; x < wx0 + w; x++) { A.T(x, wy0 + 4, shade(A.G(x, wy0 + 4) || '#000000', .7)); A.T(x, wy0 + 5, shade(A.G(x, wy0 + 5) || '#000000', .82)); }
    // 地基
    R(wx0 - 1, wy1 - 4, w + 2, 4, '#6a6e84'); R(wx0 - 1, wy1 - 4, w + 2, 1, '#9aa0b8');
    for (let x = wx0; x < wx0 + w; x += 7) P(x, wy1 - 2, '#4e5266');
    // 窗
    (o.windows || []).forEach(wx => {
      const x = wx0 + wx, y = wy0 + 10;
      R(x - 1, y - 1, 16, 14, BARK[0]); R(x, y, 14, 12, '#2a4060');
      for (let yy = 0; yy < 12; yy++) for (let xx = 0; xx < 14; xx++) if (xx - yy > 2 && xx - yy < 6) P(x + xx, y + yy, '#5a88b8');
      R(x, y, 14, 1, '#9ac4e8'); R(x + 6, y, 2, 12, BARK[1]); R(x, y + 5, 14, 2, BARK[1]);
      R(x - 2, y + 12, 18, 2, BARK[2]); R(x - 2, y + 12, 18, 1, BARK[3]);
      R(x - 1, y + 14, 16, 3, '#6a4a2e'); [1, 4, 7, 10, 13].forEach((fx, i) => { P(x - 1 + fx, y + 13, ['#ff6b8b', '#ffd23f', '#ffffff', '#b48cff', '#ff8c3a'][i]); P(x - 1 + fx, y + 14, '#3f8a4f'); });
      if (o.shutters) { R(x - 5, y - 1, 4, 14, rf[1]); R(x + 15, y - 1, 4, 14, rf[1]); R(x - 5, y - 1, 1, 14, rf[2]); R(x + 18, y - 1, 1, 14, rf[0]); }
      out.lights.push({ x: x + 7, y: y + 6 });
    });
    // 门
    if (o.door !== false) {
      const dx = wx0 + (o.doorX !== undefined ? o.doorX : Math.round(w / 2 - 8)), dy = wy1 - 26;
      R(dx - 2, dy - 2, 20, 26, BARK[0]); R(dx - 1, dy - 3, 18, 1, BARK[0]);
      const dc = o.doorC || ['#5a2e1e', '#8a4a2a', '#b06a3a'];
      R(dx, dy, 16, 22, dc[1]); R(dx + 1, dy - 1, 14, 1, dc[1]);
      for (let x = dx + 3; x < dx + 16; x += 4) R(x, dy, 1, 22, dc[0]);
      R(dx, dy, 1, 22, dc[2]); R(dx + 12, dy + 11, 2, 2, C.gold[1]); P(dx + 12, dy + 11, C.gold[2]);
      R(dx - 3, wy1 - 3, 22, 3, '#9aa0b8'); R(dx - 3, wy1 - 3, 22, 1, '#c8cde0');
      out.door = { x: dx + 8, y: wy1 };
      if (o.sign) { const sx = dx + 20, sy = dy - 2; R(sx, sy, 8, 1, BARK[0]); P(sx + 1, sy + 1, BARK[0]); P(sx + 6, sy + 1, BARK[0]); R(sx - 1, sy + 2, 12, 11, BARK[2]); R(sx - 1, sy + 2, 12, 1, BARK[3]); R(sx, sy + 3, 10, 9, '#f2e4c2'); o.sign(A, sx + 1, sy + 4); }
    }
    // 屋顶
    for (let y = 0; y < roofH; y++) {
      const t = y / roofH, inset = Math.round((1 - t) * 8), x0 = inset, x1 = W - inset;
      const row = Math.floor(y / 5), ry = y % 5;
      for (let x = x0; x < x1; x++) {
        const sx = x + (row % 2) * 4, edge = sx % 8 === 0;
        let c = ry === 4 ? rf[0] : ry === 0 ? rf[2] : rf[1];
        if (edge && ry > 0) c = rf[0];
        if (hash2(Math.floor(sx / 8), row, 11) > .8 && ry > 0 && ry < 4 && !edge) c = mix(rf[1], rf[2], .5);
        if (x === x0 || x === x1 - 1) c = rf[0];
        P(x, y, c);
      }
    }
    R(8, 0, W - 16, 3, rf[0]); R(8, 0, W - 16, 1, rf[2]);
    R(0, roofH - 2, W, 2, rf[0]);
    if (o.chimney) { const cx = W - 26; R(cx, -0 + 2, 9, 12, '#8a4a3a'); R(cx, 2, 9, 1, '#b06a5a'); R(cx - 1, 0, 11, 3, '#5a3a32'); for (let y = 5; y < 14; y += 3) R(cx + ((y % 2) * 3), y, 4, 1, '#6a3a2e'); out.chimney = { x: cx + 4, y: 0 }; }
    if (o.deco) o.deco(A, W, H, wx0, wy0, wy1);
  });
  out.w = W; out.h = H;
  return out;
}

/* ---------- 小道具 ---------- */
const PROP = {};
function buildProps() {
  PROP.fence = spr(16, 13, A => { A.R(1, 0, 3, 13, BARK[2]); A.R(12, 0, 3, 13, BARK[2]); A.R(1, 0, 1, 13, BARK[3]); A.R(0, 3, 16, 2, BARK[2]); A.R(0, 8, 16, 2, BARK[2]); A.R(0, 3, 16, 1, BARK[3]); A.R(0, 8, 16, 1, BARK[3]); A.R(1, 12, 3, 1, BARK[0]); A.R(12, 12, 3, 1, BARK[0]); }, { outline: true });
  PROP.lamp = spr(10, 34, A => { A.R(4, 8, 2, 25, '#3a3446'); A.R(4, 8, 1, 25, '#5a5470'); A.R(2, 31, 6, 3, '#3a3446'); A.R(1, 1, 8, 1, '#3a3446'); A.R(2, 2, 6, 6, '#ffe8a0'); A.R(2, 2, 2, 6, '#fff6d0'); A.R(1, 7, 8, 1, '#3a3446'); A.R(3, 0, 4, 1, '#3a3446'); A.R(4, 2, 2, 6, '#3a3446'); });
  PROP.crate = spr(16, 15, A => { A.R(0, 0, 16, 15, BARK[2]); A.R(0, 0, 16, 2, BARK[3]); A.R(0, 13, 16, 2, BARK[1]); A.R(0, 0, 2, 15, BARK[1]); A.R(14, 0, 2, 15, BARK[1]); A.L(2, 2, 13, 12, BARK[1]); A.L(3, 2, 14, 12, BARK[1]); A.R(0, 6, 16, 1, BARK[1]); });
  PROP.barrel = spr(13, 16, A => { A.E(6.5, 8, 6.5, 8, BARK[2]); for (let y = 0; y < 16; y++) { A.T(1, y, BARK[1]); A.T(11, y, BARK[1]); A.T(3, y, BARK[3]); } A.R(0, 3, 13, 1, '#5a5a6a'); A.R(0, 12, 13, 1, '#5a5a6a'); A.E(6.5, 1.5, 5, 1.5, BARK[3]); });
  PROP.sack = spr(14, 13, A => { A.E(7, 8, 6.5, 5, '#c9b088'); A.R(5, 1, 4, 3, '#c9b088'); A.R(5, 3, 4, 1, '#8a6a4a'); for (let y = 4; y < 13; y++) A.T(10, y, '#a88e68'); A.P(4, 6, '#e8d4b0'); });
  PROP.sign = spr(18, 20, A => { A.R(8, 10, 2, 10, BARK[1]); A.R(0, 1, 18, 11, BARK[2]); A.R(0, 1, 18, 1, BARK[3]); A.R(0, 11, 18, 1, BARK[0]); A.R(2, 3, 14, 7, '#e9d3a0'); A.R(3, 4, 10, 1, '#8a6a4a'); A.R(3, 6, 12, 1, '#8a6a4a'); A.R(3, 8, 7, 1, '#8a6a4a'); A.R(6, 19, 6, 1, BARK[0]); });
  PROP.bench = spr(28, 14, A => { A.R(0, 2, 28, 3, BARK[2]); A.R(0, 2, 28, 1, BARK[3]); A.R(0, 7, 28, 3, BARK[2]); A.R(0, 7, 28, 1, BARK[3]); A.R(2, 10, 2, 4, '#3a3446'); A.R(24, 10, 2, 4, '#3a3446'); A.R(2, 0, 2, 8, '#3a3446'); A.R(24, 0, 2, 8, '#3a3446'); });
  PROP.pot = spr(12, 16, A => { A.R(2, 10, 8, 6, '#b8603a'); A.R(1, 9, 10, 2, '#d8805a'); A.R(2, 10, 2, 6, '#d8805a'); A.E(6, 6, 5, 4.5, LEAF.oak[2]); A.E(5, 4, 3, 3, LEAF.oak[3]); A.P(7, 3, '#ff6b8b'); A.P(3, 6, '#ff6b8b'); A.P(8, 7, '#ffd23f'); });
  PROP.well = spr(26, 30, A => { A.R(2, 16, 22, 14, '#8a8fa8'); for (let y = 16; y < 30; y += 4) for (let x = 2 + (y % 8 ? 0 : 3); x < 24; x += 6) A.R(x, y, 5, 3, '#9aa0b8'); A.E(13, 16, 11, 3, '#2a4060'); A.E(13, 16, 11, 3, '#6a6e84'); A.E(13, 16, 9, 2, '#1a2a40'); A.R(3, 2, 2, 14, BARK[1]); A.R(21, 2, 2, 14, BARK[1]); A.R(0, 0, 26, 4, '#b04a3a'); A.R(0, 0, 26, 1, '#d06a5a'); A.R(12, 4, 2, 8, '#8a6a4a'); A.R(10, 10, 6, 4, BARK[2]); });
  PROP.mailbox = spr(10, 18, A => { A.R(4, 8, 2, 10, BARK[1]); A.R(0, 1, 10, 7, '#3a7ae0'); A.R(0, 1, 10, 2, '#6aa0ff'); A.R(1, 0, 8, 1, '#3a7ae0'); A.R(8, 2, 1, 4, '#e04848'); A.R(8, 2, 2, 1, '#e04848'); });
  PROP.crops = spr(16, 12, A => { for (let i = 0; i < 3; i++) { const x = 2 + i * 5; A.E(x + 1, 7, 2.4, 3, LEAF.oak[3]); A.P(x + 1, 4, LEAF.oak[4]); A.R(x, 9, 3, 2, '#ff8c3a'); } });
  PROP.cabbage = spr(16, 12, A => { for (let i = 0; i < 2; i++) { const x = 4 + i * 8; A.E(x, 7, 3.5, 3.5, '#7ac860'); A.E(x, 6, 2, 2, '#b8e890'); A.P(x - 1, 5, '#e8ffd0'); } });
  PROP.umbrella = spr(34, 34, A => { A.R(16, 10, 2, 22, '#e8e8f0'); A.E(17, 30, 9, 3, '#e8e8f0'); A.E(17, 30, 8, 2, '#c8c8d8'); for (let y = 0; y < 12; y++) { const hw = 3 + y * 1.2; for (let x = -hw; x <= hw; x++) A.P(17 + x, y + 1, (Math.floor((x + 20) / 5) % 2) ? '#ff6b8b' : '#fff6f0'); } A.R(4, 13, 27, 1, '#c84a6a'); A.R(16, 0, 2, 2, '#c84a6a'); A.R(8, 22, 18, 3, '#f6ecd2'); A.R(8, 22, 18, 1, '#ffffff'); A.R(9, 25, 2, 6, '#bcae90'); A.R(23, 25, 2, 6, '#bcae90'); A.R(13, 19, 3, 3, '#c98b52'); A.P(14, 18, '#ffffff'); A.R(19, 20, 3, 2, '#ffd23f'); });
  PROP.lockers = spr(76, 40, A => {
    const cols = ['#e05a5a', '#ffb43a', '#ffe04a', '#5ad06a', '#4aa8ff', '#9a6aff'];
    for (let i = 0; i < 6; i++) { const x = 1 + i * 12, c = cols[i]; A.R(x, 2, 11, 36, c); A.R(x, 2, 11, 2, mix(c, '#ffffff', .4)); A.R(x + 10, 2, 1, 36, shade(c, .7)); A.R(x + 2, 8, 7, 1, shade(c, .6)); A.R(x + 2, 10, 7, 1, shade(c, .6)); A.R(x + 8, 20, 2, 4, '#3a3446');
      const dg = DIGITS[i]; dg.forEach((row, ry) => row.split('').forEach((v, rx) => { if (v === '1') A.P(x + 3 + rx, 26 + ry, '#ffffff'); })); }
    A.R(0, 0, 74, 2, '#5a5f78'); A.R(0, 38, 74, 2, '#3a3446');
  });
  PROP.crystal = spr(14, 22, A => { const c = ['#4a1a8a', '#8a3aff', '#c88aff', '#f4e0ff']; for (let y = 0; y < 22; y++) { const hw = y < 8 ? y * .55 : y < 18 ? 4.4 : 4.4 - (y - 18) * .6; for (let x = -hw; x <= hw; x++) A.P(7 + x, y, x < -1 ? c[3] : x < 1 ? c[2] : c[1]); } A.R(5, 20, 5, 2, c[0]); A.L(7, 2, 7, 18, c[2]); });
  PROP.pillar = spr(14, 44, A => { const s = ['#8c8a9c', '#c4c0d0', '#ece8f4']; A.R(1, 0, 12, 4, s[1]); A.R(1, 0, 12, 1, s[2]); A.R(2, 4, 10, 36, s[1]); A.R(2, 4, 3, 36, s[2]); A.R(10, 4, 2, 36, s[0]); for (let x = 5; x < 10; x += 2) A.R(x, 5, 1, 34, s[0]); A.R(0, 40, 14, 4, s[1]); A.R(0, 40, 14, 1, s[2]); });
  PROP.torch = spr(8, 22, A => { A.R(3, 6, 2, 16, BARK[1]); A.R(1, 4, 6, 3, '#5a5470'); A.R(2, 21, 4, 1, BARK[0]); });
  PROP.monitor = spr(28, 24, A => { A.R(1, 2, 26, 18, '#c8c4b4'); A.R(1, 2, 26, 2, '#e8e4d4'); A.R(4, 5, 20, 12, '#141c2a'); A.L(6, 7, 14, 15, '#a0f0ff'); A.L(14, 6, 18, 14, '#a0f0ff'); A.L(18, 14, 22, 9, '#a0f0ff'); A.R(9, 20, 10, 2, '#a8a494'); A.R(5, 22, 18, 2, '#8a8678'); A.P(22, 18, '#5ad06a'); });
  PROP.statue = spr(30, 44, A => {
    const g = C.gold;
    A.R(2, 30, 26, 14, '#8a8fa8'); A.R(2, 30, 26, 2, '#b8bcd0'); A.R(0, 40, 30, 4, '#6a6e84'); A.R(6, 34, 18, 4, '#6a6e84'); A.R(7, 35, 16, 2, '#4a4e60');
    A.E(15, 22, 10, 7, g[1]); A.E(9, 19, 3, 3, g[1]); A.E(18, 12, 6, 6, g[1]); A.R(23, 12, 5, 2, g[1]); A.R(23, 14, 4, 1, g[0]);
    for (let y = 4; y < 30; y++) for (let x = 2; x < 28; x++) { const c = A.G(x, y); if (c === g[1]) { if (x + y < 26) A.P(x, y, g[2]); else if (x + y > 44) A.P(x, y, g[0]); } }
    A.R(19, 10, 2, 2, '#5a3a0a');
  });
  PROP.flag = null;
}
const DIGITS = [['111', '101', '101', '101', '111'], ['010', '110', '010', '010', '111'], ['111', '001', '111', '100', '111'], ['111', '001', '111', '001', '111'], ['101', '101', '111', '001', '001'], ['111', '100', '111', '001', '111']];

/* ---------- 知识卡图标 16×16 ---------- */
const ICON = {};
function buildIcons() {
  const I = (id, fn) => { ICON[id] = spr(16, 16, fn); };
  I('program', A => { A.R(3, 1, 10, 14, '#f6ecd2'); A.R(3, 1, 10, 2, '#ffffff'); A.R(2, 0, 12, 2, '#c98e57'); A.R(2, 14, 12, 2, '#c98e57'); [4, 6, 8, 10].forEach(y => { A.R(5, y, 1, 1, '#e04848'); A.R(7, y, 5 - (y % 4 ? 2 : 0), 1, '#6a5a4a'); }); });
  I('seq', A => { A.E(8, 10, 7, 5, '#e8e8f0'); A.R(1, 8, 14, 2, '#ffffff'); A.E(8, 8, 6, 2, '#f4c060'); A.L(4, 7, 11, 7, '#ffe090'); A.L(3, 8, 12, 9, '#ffe090'); A.R(10, 1, 1, 7, '#8a5a3a'); A.R(12, 0, 1, 8, '#8a5a3a'); A.R(4, 14, 8, 1, '#c8c8d8'); A.P(5, 6, '#e04848'); });
  I('var', A => { A.R(1, 5, 14, 10, '#c98e57'); A.R(1, 5, 14, 2, '#e8b078'); A.R(0, 3, 16, 3, '#a8744c'); A.R(0, 3, 16, 1, '#e8b078'); A.R(4, 8, 8, 4, '#f6ecd2'); A.R(5, 9, 2, 2, '#3a7ae0'); A.R(8, 9, 3, 1, '#6a5a4a'); A.R(8, 11, 2, 1, '#6a5a4a'); });
  I('type', A => { A.R(0, 8, 7, 7, '#3a7ae0'); A.R(0, 8, 7, 1, '#6aa0ff'); A.R(2, 10, 3, 3, '#ffffff'); A.R(8, 8, 8, 7, '#e05a8a'); A.R(8, 8, 8, 1, '#ff8ab0'); A.R(10, 10, 1, 3, '#ffffff'); A.R(13, 10, 1, 3, '#ffffff'); A.R(4, 1, 8, 6, '#5ad06a'); A.R(4, 1, 8, 1, '#8ae89a'); A.R(6, 3, 4, 1, '#ffffff'); A.R(7, 3, 1, 3, '#ffffff'); });
  I('if', A => { A.R(7, 6, 2, 10, '#8a5a3a'); A.R(1, 1, 7, 5, '#5ad06a'); A.P(0, 3, '#5ad06a'); A.R(8, 4, 7, 5, '#e05a5a'); A.P(15, 6, '#e05a5a'); A.R(2, 3, 4, 1, '#ffffff'); A.R(9, 6, 4, 1, '#ffffff'); });
  I('loop', A => { for (let a = 0; a < 300; a += 6) { const r = a * Math.PI / 180; A.P(8 + Math.cos(r) * 6, 8 + Math.sin(r) * 6, '#4aa8ff'); A.P(8 + Math.cos(r) * 5, 8 + Math.sin(r) * 5, '#9ad0ff'); } A.R(12, 1, 4, 2, '#4aa8ff'); A.R(13, 3, 2, 3, '#4aa8ff'); A.R(6, 6, 4, 4, '#ffd23f'); });
  I('func', A => { A.R(4, 4, 9, 11, '#e8e8f0'); A.R(4, 4, 2, 11, '#ffffff'); A.R(5, 7, 7, 7, '#c98b52'); A.R(5, 7, 7, 1, '#e8b078'); A.R(3, 2, 11, 2, '#ff8ab0'); A.R(9, 0, 1, 4, '#e05a5a'); [[6, 12], [8, 11], [10, 12]].forEach(([x, y]) => A.R(x, y, 1, 1, '#3a2418')); });
  I('list', A => { ['#e05a5a', '#ffb43a', '#5ad06a', '#4aa8ff'].forEach((c, i) => { A.R(i * 4, 2, 3, 12, c); A.R(i * 4, 2, 3, 1, mix(c, '#ffffff', .5)); A.P(i * 4 + 1, 9, '#3a3446'); }); A.R(0, 0, 1, 1, '#ffffff'); A.R(1, 15, 1, 1, '#ffffff'); });
  I('debug', A => { A.E(8, 9, 5, 5, '#d83a3a'); A.R(7.5, 4, 1, 10, C.ink); A.E(8, 4, 3, 2, '#2a2034'); A.P(5, 8, C.ink); A.P(11, 10, C.ink); A.R(0, 8, 3, 1, C.ink); A.R(13, 8, 3, 1, C.ink); A.R(1, 12, 3, 1, C.ink); A.R(12, 12, 3, 1, C.ink); A.P(6, 1, C.ink); A.P(10, 1, C.ink); A.P(6, 7, '#ff8a8a'); });
  I('stack', A => { A.R(1, 6, 14, 9, '#f2e4c2'); A.R(0, 3, 16, 4, '#d9483b'); A.R(0, 3, 16, 1, '#ff7a6a'); A.R(6, 9, 4, 6, '#8a4a2a'); A.R(2, 8, 3, 3, '#9ac4e8'); A.R(11, 8, 3, 3, '#9ac4e8'); A.R(5, 0, 6, 3, '#ffffff'); });
  I('git', A => { A.R(1, 1, 14, 14, '#3a4a8a'); A.R(1, 1, 14, 1, '#5a6aba'); A.R(4, 1, 8, 5, '#c8cde0'); A.R(9, 2, 2, 3, '#3a4a8a'); A.R(3, 9, 10, 6, '#f6ecd2'); A.R(4, 11, 8, 1, '#8a8fa8'); A.R(4, 13, 6, 1, '#8a8fa8'); });
  I('ai', A => { A.R(2, 4, 12, 10, '#8e9ab4'); A.R(2, 4, 12, 1, '#c7d0e2'); A.R(4, 6, 8, 5, '#1a2440'); A.R(5, 7, 2, 2, '#5ad1ff'); A.R(9, 7, 2, 2, '#5ad1ff'); A.R(7, 1, 2, 3, '#8e9ab4'); A.P(7, 0, '#ffd23f'); A.P(8, 0, '#ffd23f'); A.P(14, 1, '#fff6a0'); A.P(13, 0, '#fff6a0'); A.P(15, 2, '#fff6a0'); });
  I('deploy', A => { A.E(8, 7, 3.5, 6.5, '#eef1f8'); A.R(6, 4, 4, 2, '#5ad1ff'); A.R(3, 9, 2, 4, '#e04848'); A.R(11, 9, 2, 4, '#e04848'); A.R(6, 13, 4, 1, '#c8c8d8'); A.R(7, 14, 2, 2, '#ff8c3a'); A.P(7, 15, '#ffd23f'); A.P(8, 0, '#e04848'); });
  I('web', A => { A.R(0, 2, 16, 12, '#eef1f8'); A.R(0, 2, 16, 3, '#3a4a8a'); A.P(2, 3, '#e04848'); A.P(4, 3, '#ffd23f'); A.P(6, 3, '#5ad06a'); A.R(2, 7, 5, 2, '#e34c26'); A.R(8, 7, 6, 2, '#264de4'); A.R(2, 10, 12, 2, '#e0c42a'); });
  I('comment', A => { A.R(1, 1, 14, 14, '#fff27a'); A.R(1, 1, 14, 2, '#fffbc8'); A.R(3, 5, 2, 1, '#8a8040'); A.R(6, 5, 7, 1, '#b8a040'); A.R(3, 8, 9, 1, '#b8a040'); A.R(3, 11, 6, 1, '#b8a040'); A.R(12, 12, 3, 3, '#d9c64a'); });
  I('lib', A => { A.R(1, 6, 14, 9, '#e05a5a'); A.R(1, 6, 14, 2, '#ff8a8a'); [2, 7, 12].forEach(x => { A.R(x, 3, 3, 3, '#e05a5a'); A.R(x, 3, 3, 1, '#ff8a8a'); }); A.R(1, 13, 14, 2, '#a83a3a'); });
  I('secret', A => { A.E(5, 7, 4, 4, C.gold[1]); A.E(5, 7, 1.6, 1.6, '#3a2a10'); A.R(8, 6, 7, 2, C.gold[1]); A.R(12, 8, 2, 3, C.gold[1]); A.R(9, 8, 1, 2, C.gold[1]); A.P(3, 5, C.gold[2]); A.R(8, 6, 7, 1, C.gold[2]); });
  I('lock', A => { A.R(3, 7, 10, 8, '#5a5f78'); A.R(3, 7, 10, 1, '#8a8fa8'); A.R(5, 2, 1, 5, '#8a8fa8'); A.R(10, 2, 1, 5, '#8a8fa8'); A.R(5, 1, 6, 1, '#8a8fa8'); A.R(7, 10, 2, 3, '#2a2034'); });
}
