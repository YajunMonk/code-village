/* ============================================================
 * 20 美术：像素画笔、角色、生物
 * ============================================================ */
const OUTLINE = '#1a1222';
function spr(w, h, fn, { outline = true } = {}) {
  const buf = new Array(w * h).fill(null);
  const api = {
    w, h,
    P(x, y, c) { x = Math.round(x); y = Math.round(y); if (c && x >= 0 && y >= 0 && x < w && y < h) buf[y * w + x] = c; },
    R(x, y, ww, hh, c) { for (let j = 0; j < hh; j++) for (let i = 0; i < ww; i++) api.P(x + i, y + j, c); },
    E(cx, cy, rx, ry, c) { for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) { const dx = (x + .5 - cx) / rx, dy = (y + .5 - cy) / ry; if (dx * dx + dy * dy <= 1) api.P(x, y, c); } },
    G(x, y) { return (x >= 0 && y >= 0 && x < w && y < h) ? buf[y * w + x] : null; },
    X(x, y) { if (x >= 0 && y >= 0 && x < w && y < h) buf[y * w + x] = null; },
    L(x0, y0, x1, y1, c) { x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0; const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy; for (;;) { api.P(x0, y0, c); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } } },
    // 在已有像素上做明暗：只改已经画了的像素
    T(x, y, c) { if (api.G(x, y)) api.P(x, y, c); },
  };
  fn(api);
  const pad = outline ? 1 : 0, W = w + pad * 2, H = h + pad * 2;
  const [c, x] = makeCanvas(W, H); const img = x.createImageData(W, H), d = img.data;
  const put = (px, py, col) => { const [r, g, b] = hex2rgb(col); const i = (py * W + px) * 4; d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255; };
  for (let y = 0; y < h; y++) for (let x2 = 0; x2 < w; x2++) if (buf[y * w + x2]) put(x2 + pad, y + pad, buf[y * w + x2]);
  if (outline) {
    const g = (x2, y) => (x2 >= 0 && y >= 0 && x2 < w && y < h) ? buf[y * w + x2] : null;
    for (let Y = 0; Y < H; Y++) for (let X = 0; X < W; X++) {
      const bx = X - pad, by = Y - pad; if (g(bx, by)) continue;
      const n = g(bx, by + 1) || g(bx - 1, by) || g(bx + 1, by) || g(bx, by - 1);
      if (n) put(X, Y, mix(shade(n, .35), OUTLINE, .55));
    }
  }
  x.putImageData(img, 0, 0);
  return c;
}

/* ---------- 调色板 ---------- */
const SKIN = ['#c9876a', '#eab08c', '#ffd7b5'];
const C = {
  ink: '#1c1428', white: '#fffaf0', blush: '#f58f9a', mouth: '#7a2e3a', tongue: '#e8606c',
  gold: ['#9c6a12', '#e0a92a', '#ffe07a'],
};

/* ---------- 人物 ----------
 * 16×28，头顶从 y=5 开始，脚在 y=27。dir: 0下 1上 2左（右=翻转）。frame: 0站 1迈左 2站 3迈右
 */
function drawPerson(o, dir, frame, talk = 0, blink = false) {
  return spr(16, 28, A => {
    const { P, R } = A;
    const HY = 5 + (o.short ? 1 : 0);
    const bob = (frame === 1 || frame === 3) ? -1 : 0;
    const hy = HY + bob;
    const sk = o.skin || SKIN, hr = o.hair, sh = o.shirt, pa = o.pants || ['#2a2f4a', '#3b4266'], shoe = o.shoes || '#2b2230';
    // —— 腿和鞋 ——
    if (!o.robe) {
      R(4, 22, 8, 2, pa[0]); R(5, 22, 6, 1, pa[1]);
      if (dir === 2) {
        if (frame === 1) { R(3, 24, 3, 2, pa[1]); R(2, 26, 4, 1, shoe); R(9, 24, 3, 2, pa[0]); R(9, 26, 4, 1, shade(shoe, .8)); }
        else if (frame === 3) { R(9, 24, 3, 2, pa[1]); R(9, 26, 3, 1, shoe); R(4, 24, 3, 2, pa[0]); R(3, 26, 4, 1, shade(shoe, .8)); }
        else { R(6, 24, 4, 2, pa[1]); R(5, 26, 5, 1, shoe); }
      } else {
        const lL = frame === 1 ? 1 : 0, lR = frame === 3 ? 1 : 0;
        R(4, 24, 3, 2 - lL, pa[1]); R(4, 26 - lL, 3, 1, shoe);
        R(9, 24, 3, 2 - lR, pa[1]); R(9, 26 - lR, 3, 1, shoe);
        R(4, 24, 1, 2 - lL, pa[0]); R(11, 24, 1, 2 - lR, pa[0]);
      }
    } else {
      // 长袍
      R(4, 22, 8, 4, sh[1]); R(3, 24, 10, 2, sh[1]); R(3, 25, 10, 1, sh[0]); R(4, 22, 1, 3, sh[2]);
      if (o.trim) R(3, 25, 10, 1, o.trim);
      const step = frame === 1 ? -1 : frame === 3 ? 1 : 0;
      R(5 + step, 26, 3, 1, shoe); R(9 - step, 26, 3, 1, shoe);
    }
    // —— 身体 ——
    const by = 16 + bob;
    if (o.wide) { R(3, by + 1, 10, 6, sh[1]); R(4, by, 8, 1, sh[1]); }
    else { R(4, by + 1, 8, 6, sh[1]); R(5, by, 6, 1, sh[1]); }
    R(4, by + 1, 1, 5, sh[2]); R(11, by + 1, 1, 6, sh[0]); R(5, by + 6, 6, 1, sh[0]);
    if (dir === 0 && o.body) o.body(A, by, frame);
    if (dir === 2 && o.bodySide) o.bodySide(A, by, frame);
    if (dir === 1 && o.bodyBack) o.bodyBack(A, by, frame);
    // —— 手臂 ——
    const sw = frame === 1 ? 1 : frame === 3 ? -1 : 0;
    if (dir === 2) {
      const ax = 7 - sw * 2;
      R(ax, by + 1, 2, 3, sh[0]); R(ax, by + 4, 2, 1, sk[1]);
    } else {
      R(3, by + 1 + sw, 1, 3, sh[0]); P(3, by + 4 + sw, sk[1]);
      R(12, by + 1 - sw, 1, 3, sh[0]); P(12, by + 4 - sw, sk[1]);
    }
    // —— 头 ——
    const head = [[4, 11], [3, 12], [2, 13], [2, 13], [2, 13], [2, 13], [2, 13], [2, 13], [2, 13], [2, 13], [3, 12], [4, 11]];
    head.forEach(([a, b], r) => R(a, hy + r, b - a + 1, 1, sk[1]));
    R(13, hy + 4, 1, 6, sk[0]); R(4, hy + 11, 8, 1, sk[0]); R(12, hy + 10, 1, 1, sk[0]);
    R(3, hy + 3, 1, 3, sk[2]);
    // 脸
    if (dir === 0) {
      if (o.eyes === 'shades') { R(3, hy + 6, 10, 2, C.ink); P(4, hy + 6, '#6a7090'); P(10, hy + 6, '#6a7090'); }
      else if (blink) { R(4, hy + 7, 2, 1, C.ink); R(10, hy + 7, 2, 1, C.ink); }
      else { R(4, hy + 6, 2, 2, C.ink); R(10, hy + 6, 2, 2, C.ink); P(4, hy + 6, C.white); P(10, hy + 6, C.white); }
      if (o.eyes === 'glasses') { const g = o.glassC || '#e8ecf8'; [3, 9].forEach(x => { R(x, hy + 5, 4, 1, g); R(x, hy + 8, 4, 1, g); P(x, hy + 6, g); P(x, hy + 7, g); P(x + 3, hy + 6, g); P(x + 3, hy + 7, g); }); P(7, hy + 6, g); P(8, hy + 6, g); }
      P(3, hy + 8, C.blush); P(12, hy + 8, C.blush);
      if (o.beard) R(5, hy + 9, 6, 1, o.beard);
      if (talk) { R(7, hy + 9, 2, 2, C.mouth); P(7, hy + 10, C.tongue); } else R(7, hy + 9, 2, 1, C.mouth);
    } else if (dir === 2) {
      if (o.eyes === 'shades') R(2, hy + 6, 5, 2, C.ink);
      else if (blink) R(3, hy + 7, 2, 1, C.ink); else { R(3, hy + 6, 2, 2, C.ink); P(3, hy + 6, C.white); }
      if (o.eyes === 'glasses') { const g = o.glassC || '#e8ecf8'; R(2, hy + 5, 4, 1, g); R(2, hy + 8, 4, 1, g); P(5, hy + 6, g); P(5, hy + 7, g); R(6, hy + 6, 4, 1, g); }
      P(4, hy + 8, C.blush);
      if (o.beard) R(2, hy + 9, 4, 1, o.beard);
      if (talk) R(2, hy + 9, 2, 2, C.mouth); else R(2, hy + 9, 2, 1, C.mouth);
      P(9, hy + 6, sk[0]); P(9, hy + 7, sk[0]);
    }
    // —— 头发 / 帽子 ——
    hairStyles[o.style || 'short'](A, hy, dir, hr, o);
    if (o.extra) o.extra(A, hy, dir, frame, by);
  });
}
const hairStyles = {
  short(A, y, dir, h) {
    const { R, P } = A;
    R(4, y - 1, 8, 1, h[1]); R(3, y, 10, 1, h[1]); R(2, y + 1, 12, 3, h[1]);
    if (dir === 0) {
      '111011011011'.split('').forEach((v, i) => { if (v === '1') P(2 + i, y + 4, h[0]); });
      R(2, y + 4, 1, 4, h[1]); R(13, y + 4, 1, 4, h[0]);
    } else if (dir === 1) { R(2, y + 1, 12, 9, h[1]); R(3, y + 10, 10, 1, h[0]); R(12, y + 2, 2, 7, h[0]); }
    else { R(7, y + 1, 7, 8, h[1]); R(12, y + 3, 2, 6, h[0]); '1101101'.split('').forEach((v, i) => { if (v === '1') P(2 + i, y + 4, h[0]); }); R(2, y + 4, 1, 2, h[1]); }
    R(5, y, 3, 1, h[2]); R(4, y + 1, 2, 1, h[2]); P(8, y, h[2]);
  },
  spiky(A, y, dir, h) {
    const { R, P } = A;
    hairStyles.short(A, y, dir, h);
    [[3, -2], [6, -3], [9, -3], [12, -2], [4, -2], [10, -2]].forEach(([x, d]) => { P(x, y + d, h[1]); P(x, y + d + 1, h[1]); });
    P(6, y - 3, h[2]); P(9, y - 3, h[2]);
  },
  long(A, y, dir, h) {
    const { R } = A;
    hairStyles.short(A, y, dir, h);
    if (dir === 0) { R(1, y + 3, 2, 10, h[1]); R(13, y + 3, 2, 10, h[0]); }
    else if (dir === 1) R(2, y + 1, 12, 13, h[1]);
    else R(8, y + 2, 6, 12, h[1]);
  },
  bun(A, y, dir, h) {
    const { R, E } = A;
    E(8, y - 2, 3, 2.5, h[1]); A.P(7, y - 3, h[2]);
    hairStyles.short(A, y, dir, h);
    if (dir === 0) { R(4, y + 3, 8, 1, h[1]); }
  },
  cap(A, y, dir, h, o) {
    const { R, P } = A;
    R(4, y - 2, 8, 1, h[1]); R(3, y - 1, 10, 3, h[1]); R(3, y - 1, 10, 1, h[2]); R(2, y + 2, 12, 1, h[0]);
    if (dir === 0) { R(1, y + 3, 14, 1, h[0]); P(7, y, C.gold[2]); P(8, y, C.gold[1]); P(7, y + 1, C.gold[1]); P(8, y + 1, C.gold[0]); }
    else if (dir === 2) { R(0, y + 3, 7, 1, h[0]); R(10, y + 3, 4, 3, (o.hairUnder || '#2e2430')); }
    else R(2, y + 3, 12, 4, o.hairUnder || '#2e2430');
  },
  chef(A, y, dir, h, o) {
    const { R, E, P } = A;
    hairStyles.short(A, y + 1, dir, o.hairUnder);
    const w = ['#c9cfe0', '#eef1f8', '#ffffff'];
    R(3, y, 10, 3, w[1]); R(3, y + 2, 10, 1, w[0]);
    E(5, y - 2, 3, 3, w[1]); E(11, y - 2, 3, 3, w[1]); E(8, y - 3, 3.5, 3, w[2]);
    P(6, y - 3, w[2]); R(10, y - 1, 3, 1, w[0]);
  },
  bandana(A, y, dir, h, o) {
    const { R, P } = A;
    hairStyles.short(A, y, dir, o.hairUnder);
    R(3, y - 1, 10, 3, h[1]); R(2, y + 1, 12, 1, h[0]); R(5, y - 1, 3, 1, h[2]);
    if (dir === 0) { P(5, y, h[2]); P(10, y + 1, '#fff'); P(6, y + 1, '#fff'); }
    if (dir !== 0) { R(12, y + 1, 3, 2, h[1]); P(14, y + 3, h[0]); }
  },
  hood(A, y, dir, h) {
    const { R } = A;
    R(3, y - 2, 10, 1, h[1]); R(2, y - 1, 12, 2, h[1]); R(1, y + 1, 14, 3, h[1]);
    if (dir === 0) { R(1, y + 4, 2, 8, h[1]); R(13, y + 4, 2, 8, h[0]); R(3, y + 3, 10, 1, h[0]); }
    else if (dir === 1) R(1, y + 1, 14, 11, h[1]);
    else { R(7, y + 1, 8, 11, h[1]); R(1, y + 3, 6, 1, h[0]); }
    R(4, y - 1, 4, 1, h[2]);
  },
  hat(A, y, dir, h, o) {
    const { R, P } = A;
    hairStyles.short(A, y + 1, dir, o.hairUnder);
    R(4, y - 3, 8, 4, h[1]); R(4, y - 3, 8, 1, h[2]); R(4, y, 8, 1, h[0]);
    R(0, y + 1, 16, 2, h[1]); R(0, y + 2, 16, 1, h[0]); P(5, y - 1, '#d04545'); P(6, y - 1, '#d04545');
  },
  slick(A, y, dir, h) {
    const { R } = A;
    R(4, y - 1, 8, 1, h[1]); R(3, y, 10, 1, h[1]); R(2, y + 1, 12, 3, h[1]);
    if (dir === 0) { R(2, y + 3, 7, 1, h[1]); R(2, y + 4, 1, 3, h[1]); R(13, y + 4, 1, 3, h[0]); }
    else if (dir === 1) R(2, y + 1, 12, 9, h[1]);
    else R(7, y + 1, 7, 7, h[1]);
    R(9, y, 3, 1, h[2]);
  },
};

/* ---------- 角色设定 ---------- */
const CHAR = {
  player: { hair: ['#3b2418', '#5c3a26', '#86583a'], shirt: ['#aeb6d0', '#e6eaf5', '#ffffff'], pants: ['#26386a', '#3d5a98'],
    body(A, by) { A.P(6, by + 2, '#9aa3c0'); A.P(9, by + 2, '#9aa3c0'); A.P(6, by + 3, '#9aa3c0'); A.P(9, by + 3, '#9aa3c0'); A.R(6, by + 5, 4, 1, '#c3cae0'); } },
  granny: { style: 'bun', hair: ['#9a9ab8', '#cfd0e2', '#f4f4ff'], shirt: ['#4e2f7a', '#7550a8', '#9b7ad0'], pants: ['#3e2a5e', '#56397e'], eyes: 'glasses', glassC: '#f2d27a', robe: true, trim: '#f2d27a',
    body(A, by) { A.R(6, by + 1, 4, 1, '#f4eeff'); } },
  guard: { style: 'cap', hair: ['#14204a', '#24356e', '#3d55a0'], hairUnder: '#3a2a22', shirt: ['#1e2f66', '#2c4796', '#4566c0'], pants: ['#141c3a', '#1f2a52'],
    body(A, by) { A.R(4, by + 5, 8, 1, '#3a2a22'); A.R(7, by + 5, 2, 1, C.gold[1]); A.P(5, by + 2, C.gold[2]); A.R(7, by, 2, 6, '#22366e'); } },
  tea: { style: 'bandana', hair: ['#9e2b2b', '#d04545', '#ef7070'], hairUnder: ['#1e1a24', '#2e2836', '#4a4058'], shirt: ['#6b4126', '#94603a', '#b8804f'], pants: ['#3a2a22', '#4f3a2e'],
    body(A, by) { A.R(5, by + 2, 6, 5, '#f6ecd2'); A.R(5, by + 2, 6, 1, '#ffffff'); A.R(10, by + 3, 1, 4, '#d8c8a8'); A.P(7, by + 4, '#c98b52'); A.P(8, by + 4, '#c98b52'); } },
  zero: { style: 'spiky', hair: ['#145a44', '#1f8a64', '#46c08e'], shirt: ['#1d4f6b', '#2f7a9a', '#56a6c2'], pants: ['#22303e', '#33465a'], eyes: 'glasses', glassC: '#ffffff',
    body(A, by) { A.R(7, by + 2, 2, 3, '#ffd23f'); A.P(7, by + 3, '#7a5a10'); } },
  doc: { style: 'slick', hair: ['#6a6a7a', '#9a9aaa', '#c8c8d6'], shirt: ['#aeb6d0', '#eef1f8', '#ffffff'], pants: ['#4a5068', '#636a86'], eyes: 'glasses',
    body(A, by) { A.R(7, by + 2, 2, 4, '#e04848'); A.R(6, by + 3, 4, 2, '#e04848'); A.R(7, by, 2, 2, '#6fa0d8'); } },
  cook: { style: 'chef', hairUnder: ['#1e1a24', '#2e2836', '#4a4058'], hair: ['#1e1a24', '#2e2836', '#4a4058'], shirt: ['#8e2424', '#c43a3a', '#e8605a'], pants: ['#2a2430', '#3a3444'], beard: '#2e2836', wide: true,
    body(A, by) { A.R(5, by + 3, 6, 4, '#f6ecd2'); A.R(5, by + 3, 6, 1, '#ffffff'); A.P(7, by + 1, '#ffd23f'); } },
  priest: { style: 'hood', hair: ['#9c7416', '#d4a326', '#f2cf5a'], shirt: ['#b8ae94', '#e6dcc2', '#fff6de'], robe: true, trim: '#d4a326',
    body(A, by) { A.R(7, by, 2, 7, '#d4a326'); A.P(7, by + 2, '#fff6de'); } },
  webkid: { style: 'spiky', hair: ['#a8381c', '#e34c26', '#ff7a4f'], shirt: ['#1a3a9c', '#264de4', '#5578ff'], pants: ['#9a861a', '#d8bc2a'],
    body(A, by) { A.R(6, by + 2, 4, 2, '#ffffff'); A.P(6, by + 2, '#e34c26'); A.P(9, by + 3, '#d8bc2a'); },
    extra(A, y, dir) { if (dir !== 1) { A.R(1, y + 4, 2, 4, '#2a2a3a'); A.R(13, y + 4, 2, 4, '#2a2a3a'); A.R(2, y - 1, 12, 1, '#2a2a3a'); } } },
  merchant: { style: 'hat', hair: ['#4a3020', '#6b4a2b', '#8f6a40'], hairUnder: ['#2e2010', '#4a3020', '#6b4a2b'], shirt: ['#2c5c3a', '#3f7d4f', '#5ea06a'], pants: ['#3e2e22', '#55402e'], beard: '#4a3020',
    body(A, by) { A.R(4, by + 1, 1, 6, '#6b4a2b'); A.R(11, by + 1, 1, 6, '#6b4a2b'); A.R(6, by + 4, 4, 2, '#c98e57'); },
    bodySide(A, by) { A.R(9, by - 1, 5, 7, '#8a5a32'); A.R(9, by - 1, 5, 1, '#b07a48'); A.R(10, by + 2, 3, 1, '#5a3a20'); },
    bodyBack(A, by) { A.R(3, by - 1, 10, 8, '#8a5a32'); A.R(3, by - 1, 10, 1, '#b07a48'); A.R(5, by + 2, 6, 1, '#5a3a20'); A.R(7, by + 3, 2, 2, C.gold[1]); } },
  keeper: { style: 'slick', hair: ['#14121a', '#24202e', '#3c3650'], shirt: ['#2c3042', '#454b62', '#61688a'], pants: ['#1c1e2a', '#2a2d3e'], eyes: 'shades',
    body(A, by) { A.R(7, by, 2, 1, '#ffffff'); A.R(7, by + 1, 2, 4, '#c43a3a'); A.P(6, by, '#ffffff'); A.P(9, by, '#ffffff'); } },
  kidA: { style: 'short', hair: ['#2a1a10', '#4a3020', '#6b4a2b'], shirt: ['#2a7a3a', '#3fa050', '#6ac878'], pants: ['#2a3050', '#3a4470'], short: true },
  kidB: { style: 'long', hair: ['#5a1a2a', '#8a2a40', '#b04a60'], shirt: ['#b03a6a', '#e05a8a', '#ff8ab0'], pants: ['#3a2a4a', '#4a3a5e'], short: true },
  kidC: { style: 'spiky', hair: ['#5a3a10', '#8a5a1a', '#b88030'], shirt: ['#2a5ab0', '#3a7ae0', '#6aa0ff'], pants: ['#3a3020', '#504430'], short: true },
  kidD: { style: 'bun', hair: ['#1a1420', '#2a2034', '#40344e'], shirt: ['#c08a1a', '#e8b030', '#ffd860'], pants: ['#4a2a2a', '#663a3a'], short: true },
};
const CHAR_CACHE = new Map();
function charFrame(id, dir, frame, talk = 0, blink = false) {
  const flip = dir === 3, d = flip ? 2 : dir;
  const key = `${id}|${d}|${frame}|${talk}|${blink}|${flip}`;
  let c = CHAR_CACHE.get(key);
  if (!c) { c = drawPerson(CHAR[id], d, frame, talk, blink); if (flip) c = flipH(c); CHAR_CACHE.set(key, c); }
  return c;
}

/* ---------- 生物 & 特殊角色 ---------- */
const DUCK_Y = ['#c98a1a', '#ffd23f', '#fff09a'];
function makeDuck(frame = 0, talk = 0) {
  return spr(16, 15, A => {
    const { R, E, P } = A; const y = frame ? 1 : 0;
    E(8, 10 + y, 6.5, 4.3, DUCK_Y[1]);
    E(4, 8 + y, 2, 2, DUCK_Y[1]); P(2, 7 + y, DUCK_Y[1]); P(1, 6 + y, DUCK_Y[1]);
    E(10, 4.5 + y, 3.6, 3.6, DUCK_Y[1]);
    for (let x = 3; x < 15; x++) A.T(x, 13 + y, DUCK_Y[0]); for (let x = 5; x < 13; x++) A.T(x, 14 + y, DUCK_Y[0]);
    A.T(13, 11 + y, DUCK_Y[0]); A.T(14, 10 + y, DUCK_Y[0]); A.T(12, 6 + y, DUCK_Y[0]); A.T(13, 5 + y, DUCK_Y[0]);
    R(8, 2 + y, 3, 1, DUCK_Y[2]); P(7, 3 + y, DUCK_Y[2]); R(5, 8 + y, 4, 1, DUCK_Y[2]);
    R(6, 10 + y, 5, 1, DUCK_Y[0]); P(10, 9 + y, DUCK_Y[0]); P(5, 11 + y, DUCK_Y[0]);
    R(11, 3 + y, 2, 2, C.ink); P(11, 3 + y, C.white);
    P(10, 6 + y, C.blush);
    const bk = ['#c45a10', '#ff8c2a', '#ffb060'];
    R(13, 5 + y, 3, 1, bk[1]); R(13, 4 + y, 2, 1, bk[2]);
    if (talk) { R(13, 6 + y, 3, 1, bk[0]); P(15, 7 + y, bk[0]); } else R(13, 6 + y, 2, 1, bk[0]);
    R(5, 15 - 1, 2, 1, bk[1]); R(10, 15 - 1, 2, 1, bk[1]);
  });
}
function makeChefBot(frame = 0, talk = 0, blink = false) {
  return spr(18, 30, A => {
    const { R, E, P } = A; const m = ['#5a6680', '#8e9ab4', '#c7d0e2', '#eef2fa'], b = frame ? 1 : 0;
    // 厨师帽
    E(6, 4, 3, 3, '#eef1f8'); E(12, 4, 3, 3, '#eef1f8'); E(9, 3, 3.5, 3, '#ffffff'); R(5, 5, 9, 3, '#eef1f8'); R(5, 7, 9, 1, '#c9cfe0');
    // 头
    R(3, 8 + b, 12, 9, m[2]); R(4, 7 + b, 10, 1, m[2]); R(3, 8 + b, 1, 9, m[3]); R(14, 8 + b, 1, 9, m[1]); R(3, 16 + b, 12, 1, m[1]);
    R(5, 10 + b, 8, 4, '#1a2440');
    if (blink) { R(6, 12 + b, 2, 1, '#5ad1ff'); R(10, 12 + b, 2, 1, '#5ad1ff'); }
    else { R(6, 11 + b, 2, 2, '#5ad1ff'); R(10, 11 + b, 2, 2, '#5ad1ff'); P(6, 11 + b, '#c8f4ff'); P(10, 11 + b, '#c8f4ff'); }
    if (talk) R(8, 13 + b, 2, 1, '#5ad1ff');
    P(2, 11 + b, m[1]); P(15, 11 + b, m[1]); P(1, 11 + b, '#ff6b6b'); P(16, 11 + b, '#ff6b6b');
    // 身体
    R(4, 18, 10, 7, m[2]); R(4, 18, 1, 7, m[3]); R(13, 18, 1, 7, m[1]); R(5, 19, 8, 6, '#f6ecd2'); R(5, 19, 8, 1, '#ffffff');
    R(8, 21, 2, 2, '#e8a030');
    // 手
    R(1, 19 + b, 2, 4, m[1]); R(15, 19 - b, 2, 4, m[1]); R(0, 23 + b, 3, 2, m[0]); R(15, 23 - b, 3, 2, m[0]);
    // 轮子
    R(5, 26, 8, 2, m[0]); E(6, 28, 1.6, 1.6, '#2a2a3a'); E(12, 28, 1.6, 1.6, '#2a2a3a');
  });
}
function makeRunner(frame = 0, talk = 0) {
  return spr(16, 24, A => {
    const { R, E, P } = A; const o = ['#b5501a', '#ff8c3a', '#ffbc70'], j = [0, -2, 0, -1][frame % 4];
    E(8, 11 + j, 6.5, 6.5, o[1]);
    for (let y = 4; y < 19; y++) for (let x = 1; x < 16; x++) { if (!A.G(x, y + j)) continue; const dx = x - 8, dy = y - 11; if (dx + dy > 5) A.P(x, y + j, o[0]); else if (dx + dy < -6) A.P(x, y + j, o[2]); }
    R(2, 7 + j, 12, 2, '#e04848'); R(2, 7 + j, 12, 1, '#ff7070'); P(14, 8 + j, '#e04848'); P(15, 9 + j, '#e04848');
    R(4, 10 + j, 8, 4, '#1a2440'); R(5, 11 + j, 2, 2, '#7dffb0'); R(9, 11 + j, 2, 2, '#7dffb0');
    if (talk) R(7, 13 + j, 2, 1, '#7dffb0');
    P(8, 3 + j, '#888'); P(8, 2 + j, '#888'); E(8, 1 + j, 1.2, 1.2, '#ffd23f');
    const lf = frame % 2;
    R(4, 18 + j, 2, 3 - lf, '#5a6680'); R(10, 18 + j, 2, 2 + lf, '#5a6680');
    R(3, 21 - lf + j, 4, 1, '#2a2a3a'); R(9, 20 + lf + j, 4, 1, '#2a2a3a');
  });
}
function makeSticky(frame = 0, talk = 0) {
  return spr(16, 22, A => {
    const { R, P } = A; const y = frame ? 1 : 0, s = ['#c9b030', '#fff27a', '#fffbc8'];
    R(1, 1 + y, 14, 14, s[1]); R(1, 1 + y, 14, 2, s[2]); R(1, 13 + y, 14, 2, s[0]);
    for (let i = 0; i < 4; i++) for (let k = 0; k <= i; k++) A.X(14 - k, 1 + y + i - k);
    P(11, 2 + y, s[0]); P(12, 3 + y, s[0]); P(13, 4 + y, s[0]); R(11, 3 + y, 1, 2, s[0]); R(11, 4 + y, 3, 1, s[0]);
    R(3, 5 + y, 8, 1, '#b8a040'); R(3, 7 + y, 5, 1, '#b8a040');
    R(4, 9 + y, 2, 2, C.ink); R(10, 9 + y, 2, 2, C.ink); P(4, 9 + y, C.white); P(10, 9 + y, C.white);
    P(3, 11 + y, C.blush); P(12, 11 + y, C.blush);
    if (talk) R(7, 11 + y, 2, 2, C.mouth); else R(7, 12 + y, 2, 1, C.mouth);
    R(5, 15 + y, 1, 5 - y, C.ink); R(10, 15 + y, 1, 5 - y, C.ink); R(4, 20, 2, 1, C.ink); R(10, 20, 2, 1, C.ink);
  });
}
function makeBug() {
  return spr(16, 14, A => {
    const { R, E, P } = A;
    E(8, 8, 6, 5, '#d83a3a'); R(7.5, 3, 1, 10, C.ink);
    for (let y = 3; y < 14; y++) for (let x = 2; x < 15; x++) if (A.G(x, y) === '#d83a3a' && x + y < 11) A.P(x, y, '#ff6a6a');
    E(4.5, 7, 1.2, 1.2, C.ink); E(11.5, 8, 1.3, 1.3, C.ink); E(6, 11, 1, 1, C.ink);
    E(8, 3, 3, 2.2, '#2a2034'); P(6, 2, C.white); P(10, 2, C.white);
    P(5, 0, C.ink); P(4, 0, C.ink); P(11, 0, C.ink); P(12, 0, C.ink);
    R(0, 7, 2, 1, C.ink); R(14, 7, 2, 1, C.ink); R(1, 10, 2, 1, C.ink); R(13, 10, 2, 1, C.ink);
  });
}
// 大 Bug 魔王：64×56，4 帧
function makeBoss(frame = 0, hurt = false) {
  return spr(64, 56, A => {
    const { R, E, P } = A;
    const u = hurt ? ['#ffffff', '#ffffff', '#ffffff', '#ffffff'] : ['#2a0f5a', '#4a1a9e', '#7b2cff', '#b07aff'];
    const t = frame * Math.PI / 2;
    // 触手
    for (let k = 0; k < 4; k++) {
      const bx = [10, 22, 42, 54][k], ph = t + k * 1.3;
      for (let i = 0; i < 12; i++) { const x = bx + Math.sin(ph + i * .5) * 2.5 * (i / 12), y = 40 + i; E(x, y, 3 - i * .18, 1.2, i > 8 ? u[0] : u[1]); }
    }
    // 身体
    E(32, 30, 26, 19, u[1]); E(32, 27, 24, 16, u[2]);
    for (let y = 8; y < 50; y++) for (let x = 4; x < 60; x++) { if (A.G(x, y) !== u[2]) continue; const n = hash2(x >> 1, y >> 1, 9); if (x + y < 42 && n > .4) A.P(x, y, u[3]); else if (n > .9) A.P(x, y, u[1]); }
    // 角
    for (let i = 0; i < 9; i++) { R(12 - i * .3, 12 - i, 4 - i * .35, 1, i > 5 ? '#ffd0f0' : '#e8d8ff'); R(48 + i * .3, 12 - i, 4 - i * .35, 1, i > 5 ? '#ffd0f0' : '#e8d8ff'); }
    // 眼睛
    const blink = frame === 3 && !hurt;
    [[21, 24], [43, 24]].forEach(([x, y]) => {
      if (blink) { R(x - 5, y, 10, 2, '#1a0a2a'); return; }
      E(x, y, 6, 5, '#1a0a2a'); E(x, y, 4.5, 3.6, hurt ? '#ffffff' : '#ff2f7a'); E(x + 1, y, 2, 2.5, '#ffe0f0'); P(x - 2, y - 2, '#ffffff');
    });
    R(27, 19, 10, 1, '#1a0a2a');
    // 嘴
    E(32, 38, 12, 5, '#1a0a2a');
    for (let i = 0; i < 7; i++) { const x = 22 + i * 3; R(x, 34, 2, 2 + (i % 2), '#fff0f8'); R(x + 1, 41, 2, 2 - (i % 2), '#fff0f8'); }
    // 故障像素
    for (let i = 0; i < 14; i++) { const x = (hash2(i, frame, 3) * 60) | 0, y = (hash2(i, frame, 5) * 50) | 0; if (A.G(x, y)) A.P(x, y, pick(['#22e6d0', '#ff2fa0', '#ffffff'])); }
  });
}
// 字体/图标会用到的小图形
function makeHeart(full = true) {
  return spr(9, 8, A => { const c = full ? ['#a8203a', '#ff3b6b', '#ffa0b8'] : ['#3a2a44', '#4e3a5c', '#6a5478'];
    A.R(1, 0, 3, 1, c[1]); A.R(5, 0, 3, 1, c[1]); A.R(0, 1, 9, 3, c[1]); A.R(1, 4, 7, 1, c[1]); A.R(2, 5, 5, 1, c[1]); A.R(3, 6, 3, 1, c[1]); A.P(4, 7, c[1]);
    A.P(1, 1, c[2]); A.P(2, 1, c[2]); A.P(1, 2, c[2]); A.R(6, 3, 2, 1, c[0]); A.R(4, 6, 2, 1, c[0]); });
}
