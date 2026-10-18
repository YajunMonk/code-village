/* ============================================================
 * 21 美术：树、房屋、道具、图标
 * ============================================================ */
const LEAF = {
  oak: ['#263f39', '#3d5e4c', '#5c7c57', '#819b6b', '#b1bf87'],
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
  const L = night ? LEAF.night : ['#253e39', '#375749', '#4f7458', '#70906a', '#a0b688'];
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
  const w = o.w || 96, wallH = Math.max(52, o.wallH || 52), roofH = Math.max(44, o.roofH || 44);
  const W = w + 10, H = roofH + wallH + 2, wx0 = 5, wy0 = roofH - 4, wy1 = H - 1;
  const rf = o.roof, arch = o.arch || 'cottage', timber = ['#483b32', '#796047', '#b68c60'];
  const out = { lights: [], door: null, chimney: null, arch };
  out.canvas = spr(W, H, A => {
    const { R, P, L, E } = A;
    // 石基、抹灰和木墙使用成片材质；只在接缝和受光边缘放细节。
    if (o.wall === 'stone') {
      const st = arch === 'library' ? ['#6b7281', '#a1a5ac', '#c7c4b8'] : ['#626c72', '#8d9697', '#b9bdb2'];
      R(wx0, wy0, w, wy1 - wy0, st[0]);
      for (let y = wy0, row = 0; y < wy1; y += 7, row++) for (let x = wx0 - (row % 2) * 6; x < wx0 + w; x += 12) {
        const x1 = Math.max(wx0, x + 1), ww = Math.min(10, wx0 + w - x1), c = mix(st[1], st[2], hash2(x, y, 3) * .24);
        if (ww <= 0) continue; R(x1, y + 1, ww, 5, c); R(x1, y + 1, ww, 1, st[2]); P(x1 + 1, y + 5, st[0]);
      }
    } else if (o.wall === 'plaster' || o.wall === 'white') {
      const plaster = o.wall === 'white' ? ['#a8b7b6', '#d5ded4', '#eef0df'] : ['#b7a086', '#dfcfac', '#f1e3bf'];
      R(wx0, wy0, w, wy1 - wy0, plaster[1]); R(wx0, wy0, 3, wy1 - wy0, plaster[2]); R(wx0 + w - 5, wy0, 5, wy1 - wy0, plaster[0]);
      for (let i = 0; i < 26; i++) { const x = wx0 + 5 + Math.floor(hash2(i, w, 2) * (w - 10)), y = wy0 + 10 + Math.floor(hash2(i, w, 8) * (wallH - 12)); R(x, y, 2 + i % 3, 1, mix(plaster[1], plaster[0], .5)); }
      if (o.wall === 'plaster') {
        [wx0 + 1, wx0 + w - 4].forEach(x => { R(x, wy0, 3, wy1 - wy0, timber[0]); P(x + 1, wy0 + 5, timber[2]); });
        R(wx0, wy0 + 6, w, 3, timber[1]); R(wx0, wy1 - 12, w, 2, timber[1]);
        L(wx0 + 3, wy0 + 9, wx0 + 16, wy0 + 22, timber[1]); L(wx0 + w - 4, wy0 + 9, wx0 + w - 17, wy0 + 22, timber[1]);
      }
    } else {
      const wood = o.wood || ['#594333', '#8d6a47', '#b48e61'];
      R(wx0, wy0, w, wy1 - wy0, wood[1]);
      for (let y = wy0 + 4; y < wy1; y += 6) { R(wx0, y, w, 1, wood[0]); R(wx0, y + 1, w, 1, wood[2]); for (let x = wx0 + 8 + y % 7; x < wx0 + w - 3; x += 19) { R(x, y + 3, 5, 1, mix(wood[0], wood[1], .5)); P(x + 2, y + 2, wood[0]); } }
      R(wx0, wy0, 3, wy1 - wy0, wood[0]); R(wx0 + w - 3, wy0, 3, wy1 - wy0, wood[0]);
    }
    // 重叠的檐影、排水管、墙角石和三层台基建立厚度。
    R(wx0, wy0 + 4, w, 4, '#665e4d'); R(wx0, wy0 + 8, w, 2, '#96866b');
    R(wx0 + w - 2, wy0 + 9, 2, wallH - 10, '#566365'); P(wx0 + w - 1, wy0 + 12, '#9fadaa');
    for (let y = wy0 + 10; y < wy1 - 6; y += 8) {
      R(wx0 - 1, y, 5, 5, '#b7b4a5'); R(wx0 - 1, y, 5, 1, '#ddd4b9');
      R(wx0 + w - 4, y, 5, 5, '#939990'); R(wx0 + w - 4, y, 5, 1, '#b7b4a5');
    }
    R(wx0 - 1, wy1 - 7, w + 2, 7, '#596562'); R(wx0 - 1, wy1 - 7, w + 2, 2, '#9ba494'); R(wx0 - 2, wy1 - 2, w + 4, 2, '#758173');
    for (let x = wx0 + 5; x < wx0 + w; x += 11) { P(x, wy1 - 4, '#424e4c'); P(x + 1, wy1 - 2, '#9cac87'); }
    // 每种建筑有独立窗体与分格，暖色窗内有窗台和生活物件。
    (o.windows || []).forEach((wx, index) => {
      const x = wx0 + wx, y = wy0 + 14, ww = arch === 'workshop' ? 18 : 14, hh = arch === 'library' ? 25 : 20;
      const frame = arch === 'lab' ? ['#485e67', '#8ca9a7', '#c3d0bf'] : timber;
      R(x - 2, y - 2, ww + 4, hh + 4, frame[0]); R(x - 1, y - 1, ww + 2, hh + 2, frame[1]);
      R(x, y, ww, hh, arch === 'lab' ? '#315b6b' : '#514d46');
      R(x + 1, y + 1, ww - 2, hh - 2, arch === 'lab' ? '#51818c' : '#ac9469');
      R(x + 2, y + 2, 3, hh - 4, arch === 'lab' ? '#87b9bc' : '#e1c18b');
      for (let yy = 2; yy < hh - 3; yy++) if (yy < ww - 4) P(x + ww - yy - 2, y + yy, arch === 'lab' ? '#a1cecb' : '#e8cea0');
      R(x + Math.floor(ww / 2) - 1, y, 2, hh, frame[0]); R(x, y + 7, ww, 2, frame[0]); R(x, y + 14, ww, 1, frame[1]);
      R(x - 3, y + hh + 1, ww + 6, 3, frame[1]); R(x - 3, y + hh + 1, ww + 6, 1, frame[2]);
      if (arch === 'library') {
        for (let i = 0; i < 4; i++) { const bc = ['#a45f56', '#74988e', '#c8aa6b', '#7c83a4'][i]; R(x + 1 + i * 3, y + 18 - i % 2, 2, 6 + i % 2, bc); P(x + 1 + i * 3, y + 20, '#dfc890'); }
        E(x + ww / 2, y - 2, ww / 2 + 2, 5, frame[0]); E(x + ww / 2, y - 2, ww / 2, 3, '#c3ad75'); R(x - 2, y - 1, ww + 4, 2, frame[0]);
      } else if (arch !== 'lab' && arch !== 'workshop') {
        R(x + 1, y + 1, 2, 13, '#d4a792'); R(x + ww - 3, y + 1, 2, 13, '#ba8d79');
        R(x - 1, y + hh + 4, ww + 2, 4, '#835c45');
        for (let i = 0; i < 5; i++) { const fx = x + i * 3; P(fx, y + hh + 2, '#7b9d62'); P(fx + 1, y + hh + 3, ['#d78f87', '#dfc17b', '#a9bb90'][i % 3]); }
      }
      if (o.shutters && arch !== 'lab') [x - 6, x + ww + 2].forEach((sx, side) => { R(sx, y - 1, 4, hh + 2, rf[0]); R(sx + 1, y, 2, hh, rf[1]); for (let yy = 3; yy < hh; yy += 4) R(sx + 1, y + yy, 2, 1, side ? rf[0] : rf[2]); });
      out.lights.push({ x: x + ww / 2, y: y + hh / 2 });
    });
    if (o.door !== false) {
      const dx = wx0 + (o.doorX !== undefined ? o.doorX : Math.round(w / 2 - 8)), dy = wy1 - 38;
      const dc = o.doorC || ['#4c3c30', '#806244', '#b48e60'];
      R(dx - 3, dy - 3, 22, 38, '#3e3c35'); R(dx - 2, dy - 2, 20, 36, '#ac9875'); R(dx, dy, 16, 34, dc[1]); R(dx, dy, 1, 34, dc[2]);
      R(dx + 2, dy + 3, 12, 10, '#334e54'); R(dx + 3, dy + 4, 4, 8, '#b4c6ad'); R(dx + 8, dy + 4, 5, 8, '#6f9692');
      R(dx + 7, dy + 3, 1, 10, dc[0]); R(dx + 2, dy + 8, 12, 1, dc[0]);
      [3, 9].forEach(xx => { R(dx + xx - 1, dy + 17, 5, 12, dc[0]); R(dx + xx, dy + 18, 3, 10, dc[1]); P(dx + xx, dy + 18, dc[2]); });
      R(dx + 12, dy + 17, 2, 3, '#b89858'); P(dx + 12, dy + 17, '#ead29a');
      R(dx - 5, wy1 - 4, 26, 4, '#8a9487'); R(dx - 5, wy1 - 4, 26, 1, '#c6c6ab'); R(dx - 3, wy1 - 1, 22, 1, '#59665d');
      // 钢制门灯和小雨檐都在建筑本身的画布内，不增加碰撞。
      R(dx - 7, dy + 5, 2, 12, '#404947'); L(dx - 6, dy + 5, dx - 11, dy + 5, '#404947'); R(dx - 13, dy + 7, 5, 8, '#5e6150'); R(dx - 12, dy + 8, 3, 5, '#e6b978'); P(dx - 11, dy + 8, '#fff0b4'); R(dx - 14, dy + 6, 7, 1, '#404947');
      out.lights.push({ x: dx - 10, y: dy + 11 });
      if (arch !== 'kitchen') { R(dx - 6, dy - 7, 28, 4, rf[1]); R(dx - 6, dy - 7, 28, 1, rf[2]); R(dx - 7, dy - 3, 30, 2, rf[0]); L(dx - 3, dy - 1, dx, dy + 3, timber[0]); L(dx + 19, dy - 1, dx + 16, dy + 3, timber[0]); }
      out.door = { x: dx + 8, y: wy1 };
      if (o.sign) { const sx = Math.min(W - 15, dx + 23), sy = dy + 1; R(sx - 2, sy - 3, 14, 1, timber[0]); R(sx, sy - 2, 1, 4, '#737a71'); R(sx + 8, sy - 2, 1, 4, '#737a71'); R(sx - 1, sy + 2, 12, 12, timber[1]); R(sx - 1, sy + 2, 12, 1, timber[2]); R(sx, sy + 3, 10, 9, '#dfcfa5'); o.sign(A, sx + 1, sy + 4); }
    }
    drawVillageRoof(A, W, roofH, rf, arch);
    if (arch === 'kitchen') {
      // 条纹布雨篷、垂边和木支撑形成咖啡馆的第二层轮廓。
      for (let x = 3; x < W - 3; x++) { const stripe = Math.floor((x - 3) / 7) % 2; R(x, wy0 + 6, 1, 7, stripe ? '#c57f66' : '#e7d7b2'); R(x, wy0 + 12, 1, 2 + (stripe ? 0 : 1), stripe ? '#9b5d4f' : '#b7aa8b'); }
      R(3, wy0 + 5, W - 6, 1, '#705747'); L(7, wy0 + 14, 12, wy0 + 19, '#765d42'); L(W - 8, wy0 + 14, W - 13, wy0 + 19, '#765d42');
    } else if (arch === 'library') {
      [wx0 + 2, wx0 + w - 7].forEach(x => { R(x, wy0 + 8, 5, wallH - 12, '#bac0b5'); R(x, wy0 + 8, 1, wallH - 12, '#e1ddc5'); R(x - 2, wy0 + 8, 9, 3, '#cccbb8'); R(x - 2, wy1 - 9, 9, 3, '#c0c3af'); });
    } else if (arch === 'lab') {
      R(wx0 + 2, wy0 + 10, w - 4, 2, '#5e9294'); R(wx0 + 3, wy0 + 12, w - 6, 1, '#a7cdc0');
      R(W - 15, wy0 + 18, 6, 13, '#536a6d'); R(W - 14, wy0 + 20, 4, 3, '#a0cfb4'); R(W - 14, wy0 + 26, 4, 1, '#91b4b2');
    } else if (arch === 'workshop') {
      R(wx0, wy0 + 7, w, 4, timber[0]); R(wx0, wy0 + 7, w, 1, timber[2]);
      [wx0 + 5, wx0 + w - 9].forEach(x => { R(x, wy0 + 10, 4, wallH - 15, timber[1]); R(x, wy0 + 10, 1, wallH - 15, timber[2]); P(x + 2, wy0 + 12, '#c4bc9a'); });
      for (let i = 0; i < 3; i++) { R(W - 21 + i * 3, wy1 - 18, 2, 10, '#536568'); P(W - 21 + i * 3, wy1 - 19, '#b6c2b3'); }
    }
    if (o.chimney) {
      const cx = W - 26, cc = arch === 'workshop' ? ['#4c5b62', '#82918f', '#b9c1ad'] : ['#765041', '#a57659', '#d2aa7d'];
      R(cx, 4, 11, 22, cc[0]); R(cx + 1, 4, 8, 21, cc[1]);
      for (let y = 7; y < 25; y += 4) { R(cx + 1, y, 8, 1, cc[0]); P(cx + (y % 8 ? 4 : 7), y + 2, cc[0]); }
      R(cx - 2, 2, 15, 4, cc[0]); R(cx - 2, 2, 15, 1, cc[2]); R(cx + 1, 3, 9, 1, '#333a36'); out.chimney = { x: cx + 5, y: 2 };
    }
    // 檐角爬藤与墙边苔痕，让建筑落在环境里。
    if (arch !== 'lab' && arch !== 'workshop') for (let i = 0; i < 11; i++) { const vx = wx0 + w - 7 - (i % 3), vy = wy1 - 12 - i * 3; if (vy < wy0 + 10) break; P(vx, vy, '#45674f'); R(vx - 2, vy - 1, 2, 1, '#799365'); P(vx + 1, vy - 2, '#9ca97a'); }
    if (o.deco) o.deco(A, W, H, wx0, wy0, wy1);
  });
  out.w = W; out.h = H;
  return out;
}

function drawVillageRoof(A, W, roofH, palette, arch) {
  const { R, P, L, E } = A;
  const rf = palette.map((c, i) => mix(c, ['#46545b', '#8b7663', '#c1b28c'][i], .22));
  for (let y = 0; y < roofH; y++) for (let x = 0; x < W; x++) {
    const inset = arch === 'lab' ? 2 : arch === 'library' ? Math.max(0, Math.round((1 - y / roofH) * 12)) : Math.round((1 - y / roofH) * 9);
    const saw = arch === 'workshop' ? 4 + Math.floor((27 - ((x + 3) % 28)) * .45) : arch === 'lab' ? 8 : 0;
    if (x < inset || x >= W - inset || y < saw) continue;
    const row = Math.floor(y / 5), tx = (x + (row % 2) * 5) % 10, ry = y % 5;
    let c = ry === 4 || tx === 0 ? rf[0] : ry === 0 ? rf[2] : rf[1];
    if (ry > 0 && ry < 4 && tx > 1 && hash2(Math.floor(x / 10), row, 17) > .78) c = mix(rf[1], rf[2], .26);
    if (x > W * .7) c = shade(c, .87); P(x, y, c);
  }
  R(0, roofH - 3, W, 3, rf[0]); R(0, roofH - 3, W, 1, rf[2]); R(2, roofH, W - 4, 2, '#463f35');
  if (arch === 'lab') {
    // 低平金属屋顶嵌入倾斜玻璃天窗和小型观测穹顶。
    R(1, 7, W - 2, 3, '#46646c'); R(1, 7, W - 2, 1, '#a3bcaf');
    const gx = 12, gy = 16, gw = Math.max(36, W - 54);
    R(gx - 2, gy - 2, gw + 4, 20, '#354e59'); R(gx, gy, gw, 16, '#477f8c');
    for (let x = gx; x < gx + gw; x += 8) { R(x, gy, 2, 16, '#c0ccbd'); L(x + 2, gy + 14, x + 7, gy + 2, '#7db6b7'); }
    R(gx, gy + 7, gw, 2, '#75978f'); R(gx - 2, gy + 17, gw + 4, 2, '#a5b8a7');
    const cx = W - 27; E(cx, 20, 14, 12, '#687f83'); E(cx - 2, 18, 11, 10, '#9fb9b2'); R(cx - 14, 20, 28, 9, '#667f82'); R(cx - 12, 22, 24, 2, '#b2c8b7'); L(cx, 7, cx, 18, '#d0d8bd'); P(cx, 5, '#e5bf83');
  } else if (arch === 'workshop') {
    // 锯齿形工业屋顶，每段朝北的玻璃面与瓦面有不同倾角。
    for (let x = 5; x < W - 10; x += 28) { L(x, 15, x + 23, 4, '#b7c1ac'); R(x + 22, 5, 3, 13, '#394f5a'); R(x + 23, 7, 1, 8, '#89aead'); L(x, 16, x + 23, 5, '#5e7580'); }
    R(8, roofH - 11, W - 16, 2, '#89958b');
  } else {
    // 交叉山墙/中央藏书阁的前脸，建立第二个屋顶体积。
    const cx = arch === 'library' ? W / 2 : W * .33, half = arch === 'library' ? 22 : 17, top = arch === 'library' ? 4 : 9, bottom = roofH - 5;
    for (let y = top; y < bottom; y++) { const hw = Math.min(half, (y - top) * .85); R(cx - hw, y, hw * 2 + 1, 1, arch === 'library' ? '#b8b7a1' : '#c9b38c'); }
    L(cx, top - 2, cx - half - 3, top + half * 1.2, rf[0]); L(cx, top - 3, cx + half + 3, top + half * 1.2, rf[0]);
    L(cx, top - 4, cx - half - 3, top + half * 1.2 - 2, rf[2]); L(cx, top - 4, cx + half + 3, top + half * 1.2 - 2, rf[2]);
    R(cx - half, bottom - 2, half * 2, 2, '#665a45');
    if (arch === 'library') {
      E(cx, top + 20, 9, 9, '#59594d'); E(cx, top + 20, 7, 7, '#dfcfa1'); E(cx, top + 20, 5.5, 5.5, '#8fa7a0');
      L(cx, top + 20, cx, top + 15, '#3e5055'); L(cx, top + 20, cx + 4, top + 22, '#3e5055'); P(cx, top + 20, '#f3ddb1');
      for (const x of [8, W - 11]) { R(x, 3, 3, 13, '#a5ad9d'); R(x - 1, 1, 5, 3, '#d1cfb5'); }
    } else {
      R(cx - 6, top + 17, 12, 13, '#5d4e3c'); R(cx - 4, top + 19, 8, 9, '#688787'); R(cx - 3, top + 19, 2, 8, '#b6c6a6'); R(cx - 1, top + 19, 1, 9, '#4e5143'); R(cx - 4, top + 23, 8, 1, '#4e5143'); R(cx - 8, top + 29, 16, 2, '#a28560');
      L(cx, top + 5, cx, top + 15, '#7a6247');
    }
  }
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
  buildVillageProps();
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


/* ---------- 村民日常物件：同一套原生像素调色与轮廓 ---------- */
function buildVillageProps() {
  PROP.flowerbed = spr(34, 16, A => {
    A.R(1, 10, 32, 6, '#79513e'); A.R(0, 9, 34, 2, '#bd8a5f'); A.R(2, 12, 30, 1, '#9c6b4c');
    for (let i = 0; i < 7; i++) { const x = 3 + i * 4, y = 3 + i % 3; A.R(x, y, 1, 8 - y, '#416c43'); A.P(x - 1, y + 3, '#80aa62'); A.P(x + 1, y + 4, '#80aa62'); const c = ['#ed998b', '#f4d68c', '#b49dca'][i % 3]; A.R(x - 1, y, 3, 1, c); A.R(x, y - 1, 1, 3, c); A.P(x, y, '#fff1be'); }
  });
  PROP.basket = spr(20, 17, A => {
    A.E(10, 8, 8, 7, '#a57445'); A.E(10, 7, 6, 5, '#4c3c2f'); A.R(2, 8, 16, 8, '#c29359');
    for (let y = 9; y < 16; y += 3) A.R(3, y, 14, 1, '#e1b97c');
    for (let x = 4; x < 17; x += 4) A.R(x, 9, 1, 6, '#9a6c42');
    [[5, 6], [9, 7], [13, 5], [15, 7]].forEach(([x, y], i) => { A.E(x, y, 2.6, 2.6, i % 2 ? '#e5ae55' : '#c96350'); A.P(x - 1, y - 1, '#f5ca8b'); A.P(x, y - 3, '#54764a'); });
  });
  PROP.wateringcan = spr(19, 16, A => {
    A.E(7, 9, 6, 6, '#548f91'); A.R(3, 6, 8, 8, '#72b1a7'); A.R(4, 6, 2, 7, '#a4d0bc'); A.R(1, 14, 12, 2, '#3c676d');
    A.L(12, 11, 16, 5, '#548f91'); A.L(13, 11, 17, 5, '#72b1a7'); A.R(15, 3, 4, 3, '#a4d0bc');
    A.R(4, 1, 6, 1, '#3c676d'); A.R(3, 2, 1, 5, '#548f91'); A.R(10, 2, 1, 5, '#548f91');
  });
  PROP.bicycle = spr(32, 22, A => {
    [7, 25].forEach(x => { A.E(x, 15, 6, 6, '#3a3446'); A.E(x, 15, 4.5, 4.5, '#bbc0ad'); A.E(x, 15, 3.5, 3.5, '#62815a'); A.L(x, 11, x, 19, '#d3d0b9'); A.L(x - 4, 15, x + 4, 15, '#d3d0b9'); });
    A.L(7, 15, 12, 7, '#cc735a'); A.L(12, 7, 17, 15, '#cc735a'); A.L(17, 15, 7, 15, '#edac7c'); A.L(12, 7, 23, 7, '#edac7c'); A.L(17, 15, 23, 7, '#cc735a'); A.L(25, 15, 22, 4, '#9ca99d');
    A.R(9, 5, 7, 2, '#3a3446'); A.R(21, 2, 6, 2, '#3a3446'); A.R(24, 4, 6, 5, '#c59b62'); A.R(25, 5, 4, 1, '#e1bf82');
  });
  PROP.teatable = spr(31, 23, A => {
    A.R(3, 13, 3, 10, BARK[1]); A.R(25, 13, 3, 10, BARK[1]); A.R(0, 8, 31, 6, BARK[2]); A.R(0, 8, 31, 2, BARK[3]);
    A.R(10, 8, 11, 7, '#d7b9a0'); A.R(11, 9, 2, 6, '#f0ddbc'); A.R(18, 9, 2, 6, '#f0ddbc');
    A.E(15, 5, 4, 3, '#629b94'); A.R(14, 1, 3, 2, '#a3c7b0'); A.R(19, 4, 3, 1, '#629b94'); A.R(5, 5, 3, 3, '#f4e6c5'); A.R(24, 5, 3, 3, '#f4e6c5'); A.P(6, 5, '#ac7946'); A.P(25, 5, '#ac7946');
  });
  PROP.bookcart = spr(25, 29, A => {
    A.R(2, 2, 2, 23, '#9b704c'); A.R(21, 2, 2, 23, '#9b704c'); A.R(0, 1, 25, 2, '#c49a65');
    for (let row = 0; row < 2; row++) { const y = 4 + row * 11; for (let i = 0; i < 6; i++) { const c = ['#9bba9c', '#d99a78', '#83a9bc', '#c7af75'][i % 4]; A.R(4 + i * 3, y + i % 3, 2, 8 - i % 3, c); A.P(4 + i * 3, y + 5, '#eee0bb'); } A.R(2, y + 8, 21, 2, '#c49a65'); }
    A.R(2, 25, 21, 2, '#6e5542'); A.R(4, 27, 3, 2, '#353343'); A.R(18, 27, 3, 2, '#353343');
  });
  PROP.picnic = spr(34, 18, A => {
    A.R(1, 2, 32, 15, '#e4cba5'); for (let y = 2; y < 17; y += 3) for (let x = 1; x < 33; x += 4) if ((x + y) % 3) A.R(x, y, 3, 2, '#bd7a69');
    A.E(11, 9, 5, 3, '#f3e8c8'); A.E(11, 8, 3.5, 2, '#d5ab60'); A.R(23, 4, 4, 6, '#6e9c91'); A.R(24, 3, 2, 1, '#e6d4a9'); A.R(21, 12, 6, 3, '#edc070'); A.P(22, 12, '#8c6845');
  });
}

function makeVillageAnimal(kind, frame = 0) {
  return spr(kind === 'cat' ? 22 : 16, kind === 'cat' ? 15 : 14, A => {
    if (kind === 'cat') {
      A.E(10, 10, 7, 4, '#d39d69'); A.R(5, 11, 3, 4 - frame, '#bd845a'); A.R(13, 11, 3, 4 - (1 - frame), '#bd845a');
      A.E(5, 6, 4.5, 4, '#e7b582'); A.R(1, 1, 2, 4, '#d39d69'); A.R(7, 1, 2, 4, '#d39d69'); A.P(2, 2, '#edb6ac'); A.P(7, 2, '#edb6ac');
      A.P(3, 6, '#34313c'); A.P(7, 6, '#34313c'); A.P(5, 8, '#9c6257'); A.R(4, 9, 3, 1, '#f6d9ab'); A.L(16, 10, 20, 6 + frame, '#d39d69'); A.R(20, 3 + frame, 2, 4, '#d39d69');
      A.R(10, 7, 2, 3, '#a96e49'); A.R(14, 8, 1, 3, '#a96e49');
    } else {
      A.E(8, 8, 5.5, 4.5, '#e7dec1'); A.E(11, 4, 3, 3.5, '#f7ebce'); A.R(9, 0, 3, 2, '#c46352'); A.P(12, 3, '#34313c'); A.R(14, 4, 2, 1, '#e4a64c'); A.P(12, 7, '#c46352');
      A.L(3, 7, 1, 4, '#b9b6a4'); A.L(5, 8, 2, 3, '#e7dec1'); A.R(5, 11, 1, 3 - frame, '#ce9a58'); A.R(10, 11, 1, 2 + frame, '#ce9a58'); A.R(5, 8, 4, 1, '#b9b6a4');
    }
  });
}
