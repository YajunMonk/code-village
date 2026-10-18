/* ============================================================
 * 30 世界：地图、地面、物件、碰撞、光照、粒子
 * ============================================================ */
const TILE = 16, ZW = 24, NZ = 27, COLS = ZW * NZ, ROWS = 30, MAPW = COLS * TILE, MAPH = ROWS * TILE;
const ROAD = 14; // 主路占 14、15 两行
const ZONES = [
  ['醒来的池塘', '#fff4e6'], ['锅锅的小厨房', '#fffaf0'], ['点子小屋', '#ffffff'], ['MVP 集市', '#ffffff'], ['迷雾谷', '#c4c8dc'],
  ['网页画室', '#ffffff'], ['全栈饭馆', '#fffaf2'], ['送餐柜台', '#fff6ea'], ['框架工地', '#fff0e0'], ['404 鬼屋', '#5a68a8'],
  ['AI 研究所', '#ffe8d0'], ['记事本小屋', '#ffdcc0'], ['幻觉森林', '#e0b0d8'], ['知识库图书馆', '#ffc8a0'], ['智能体车间', '#f4b490'], ['狐狸巢穴', '#e08868'],
  ['存档神殿', '#b49ccc'], ['零件商店', '#8a80b8'], ['保险箱银行', '#7a72aa'], ['Bug 诊所', '#7068a4'], ['冲突峡谷', '#4e4a80'],
  ['本地小屋', '#5a5490'], ['域名邮局', '#6a5f98'], ['发射场', '#5e5896'], ['事故火山', '#a04a40'], ['黑话魔王城', '#4a3e7c'], ['黎明之丘', '#ffc8b0'],
].map(([name, amb], i) => ({ name, amb, i }));
const REGIONS = [
  { name: '第一章 · 点子工坊', sub: '想清楚要做什么', from: 0, to: 4, music: 'village', hat: 'straw' },
  { name: '第二章 · 网络小镇', sub: '网页、后厨和仓库', from: 5, to: 9, music: 'village', hat: 'beret' },
  { name: '第三章 · AI 研究所', sub: '认识你的 AI 搭档', from: 10, to: 15, music: 'lab', hat: 'grad' },
  { name: '第四章 · 工程工坊', sub: '安全地改代码', from: 16, to: 20, music: 'night', hat: 'hard' },
  { name: '第五章 · 发射台', sub: '让全世界都能用', from: 21, to: 26, music: 'launch', hat: 'astro' },
];
const BOSS_ZONES = { 4: 'fog', 9: 'ghost', 15: 'fox', 20: 'dragon2', 24: 'fire', 25: 'final' };
const regionOf = z => REGIONS.findIndex(r => z >= r.from && z <= r.to);
const ZONE_NAME = ZONES.map(z => z.name);
const AMB = ZONES.map(z => z.amb);
const ground = { chunks: [] };
const objects = [], lights = [], waterSpots = [], decor = [], chimneys = [], sparkSpots = [];
let solid = null; const SG = 8, SGW = MAPW / SG, SGH = MAPH / SG;
const tiles = [];
const reserved = [];
const NPC_SPOTS = {}, SIDE_SPOTS = {};
const ponds = [];
function pond(cx, cy, rx, ry) { ponds.push({ cx: cx * TILE, cy: cy * TILE, rx: rx * TILE, ry: ry * TILE }); for (let j = Math.floor(cy - ry); j <= Math.ceil(cy + ry); j++) for (let i = Math.floor(cx - rx); i <= Math.ceil(cx + rx); i++) if (i >= 0 && j >= 0 && i < COLS && j < ROWS) reserved[j * COLS + i] = 1; }
function inPond(x, y, pad = 0) { for (const p of ponds) { const dx = (x - p.cx) / (p.rx - pad), dy = (y - p.cy) / (p.ry - pad); const wob = (vnoise(x / 18, y / 18, 77) - .5) * .28; if (dx * dx + dy * dy < 1 + wob) return true; } return false; }
let walls = []; // {zone, x}

function T(x, y) { return (x >= 0 && y >= 0 && x < COLS && y < ROWS) ? tiles[y][x] : 'g'; }
function fillT(x, y, w, h, t) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (i >= 0 && j >= 0 && i < COLS && j < ROWS) tiles[j][i] = t; }
function ellT(cx, cy, rx, ry, t) { for (let j = Math.floor(cy - ry); j <= Math.ceil(cy + ry); j++) for (let i = Math.floor(cx - rx); i <= Math.ceil(cx + rx); i++) { const dx = (i + .5 - cx) / rx, dy = (j + .5 - cy) / ry; if (dx * dx + dy * dy <= 1 && i >= 0 && j >= 0 && i < COLS && j < ROWS) tiles[j][i] = t; } }
function reserve(x, y, w, h) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) reserved[j * COLS + i] = 1; }
const isRes = (x, y) => reserved[y * COLS + x] === 1;
function markSolid(x, y, w, h) { for (let j = Math.floor(y / SG); j < Math.ceil((y + h) / SG); j++) for (let i = Math.floor(x / SG); i < Math.ceil((x + w) / SG); i++) if (i >= 0 && j >= 0 && i < SGW && j < SGH) solid[j * SGW + i] = 1; }

/* 物件：x,y 是脚底中心（世界像素） */
function addObj(o) {
  o.ox = o.ox !== undefined ? o.ox : -(o.img ? o.img.width / 2 : 0) | 0;
  o.oy = o.oy !== undefined ? o.oy : -(o.img ? o.img.height : 0);
  o.layer = o.layer || 'main';
  objects.push(o);
  if (o.solid) { const [sx, sy, sw, sh] = o.solid; markSolid(o.x + sx, o.y + sy, sw, sh); }
  return o;
}
const TREE_CACHE = {};
function treeImg(kind, v) { const k = kind + v; if (!TREE_CACHE[k]) TREE_CACHE[k] = kind === 'pine' ? makePine(v) : kind === 'pineN' ? makePine(v, true) : kind === 'dead' ? makeDeadTree(v) : makeTree(kind, v); return TREE_CACHE[k]; }
function addTree(x, y, kind = 'oak', v = 1) {
  const img = treeImg(kind, v);
  return addObj({ x, y, img, ox: -(img.width / 2) | 0, oy: -img.height + 2, solid: [-5, -5, 10, 5], shadow: [14, 4], kind: 'tree', sway: kind !== 'dead' });
}
function tileFree(x, y, w = 1, h = 1) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (isRes(i, j) || T(i, j) !== 'g' && T(i, j) !== 'm' && T(i, j) !== 'd') return false; return true; }

/* ---------- 地图生成 ---------- */
const HOUSES = {};
function buildWorld() {
  solid = new Uint8Array(SGW * SGH);
  for (let y = 0; y < ROWS; y++) { tiles.push([]); for (let x = 0; x < COLS; x++) tiles[y].push('g'); }
  fillT(0, ROAD, COLS, 2, 'p');
  markSolid(0, 0, MAPW, 4 * TILE); markSolid(0, 26 * TILE, MAPW, 4 * TILE);
  markSolid(0, 0, 8, MAPH); markSolid(MAPW - 8, 0, 8, MAPH);
  const rnd = mulberry32(2024);
  for (let z = 0; z < NZ; z++) buildZone(z, z * ZW, rnd);
  // 边缘森林
  for (let x = -10; x < MAPW + 20; x += 18 + ((rnd() * 10) | 0)) {
    const z = clamp(Math.floor(x / (ZW * TILE)), 0, NZ - 1), k = zoneTree(z, rnd);
    const k2 = k === 'dead' ? 'dead' : 'pine';
    addTree(x, 3 * TILE + 10 + ((rnd() * 10) | 0), k, 1 + ((rnd() * 4) | 0));
    addTree(x + 9, 1 * TILE + 12 + ((rnd() * 10) | 0), k2, 1 + ((rnd() * 4) | 0));
    addTree(x + 4, 27 * TILE + 10 + ((rnd() * 8) | 0), k, 1 + ((rnd() * 4) | 0));
    addTree(x + 12, 29 * TILE + 8, k2, 1 + ((rnd() * 4) | 0));
  }
  for (let z = 0; z < NZ; z++) ground.chunks.push({ z, canvas: null, row: 0, ty: null });
  for (let j = 0; j < SGH; j++) for (let i = 0; i < SGW; i++) if (inPond(i * SG + 4, j * SG + 4, 6)) solid[j * SGW + i] = 1;
}
function zoneTree(z, rnd) {
  if (z === 24 || z === 25 || z === 4) return 'dead';
  if (z === 26 || z === 16 || z === 12) return rnd() < .6 ? 'blossom' : 'oak';
  if (z >= 13 && z <= 15) return rnd() < .6 ? 'autumn' : 'oak';
  if (z === 9 || z === 20) return 'pine';
  return rnd() < .3 ? 'pine' : 'oak';
}

function lamp(x, row) { const px = x * TILE + 8, py = row * TILE + 14; addObj({ x: px, y: py, img: PROP.lamp, solid: [-3, -3, 6, 3], shadow: [5, 2] }); lights.push({ x: px, y: py - 30, r: 70, c: '#ffcf7a', night: true, flicker: .05 }); }
function sign(z, tx, ty, text) { const px = tx * TILE + 8, py = ty * TILE + 14; addObj({ x: px, y: py, img: PROP.sign, solid: [-8, -4, 16, 4], shadow: [8, 2], interact: { type: 'sign', text, z } }); reserve(tx, ty, 1, 1); }
function house(z, tx, baseRow, opts, key) {
  const H = makeHouse(opts), px = tx * TILE, py = baseRow * TILE;
  const o = addObj({ x: px + H.w / 2, y: py, img: H.canvas, ox: -(H.w / 2) | 0, oy: -H.h, solid: [-(H.w / 2) + 5, -(opts.wallH || 40) + 10, H.w - 10, (opts.wallH || 40) - 10], kind: 'house', arch: H.arch });
  if (H.door) o.doorWorld = { x: px + H.door.x, y: py + 8 };
  H.lights.forEach(l => lights.push({ x: px + l.x, y: py - H.h + l.y, r: 46, c: '#ffc070', night: true, win: true }));
  if (H.chimney) chimneys.push({ x: px + H.chimney.x, y: py - H.h + H.chimney.y });
  reserve(tx - 1, baseRow - Math.ceil(H.h / TILE), Math.ceil(H.w / TILE) + 2, Math.ceil(H.h / TILE) + 1);
  if (H.door) { const dx = Math.floor((px + H.door.x) / TILE); fillT(dx, baseRow, 1, ROAD - baseRow, 'p'); reserve(dx, baseRow, 1, ROAD - baseRow); }
  if (key) HOUSES[key] = { x: px, y: py, H };
  return o;
}

function prop(x, y, img, solidW = 14, solidH = 4, shadow = null, extra = {}) {
  return addObj(Object.assign({ x: x * TILE, y: y * TILE, img, solid: solidW ? [-solidW / 2, -solidH, solidW, solidH] : null, shadow: shadow === null ? [Math.max(4, solidW / 2 + 2), 2] : shadow }, extra));
}
function torch(x, y, c = '#ff9a3a') {
  addObj({ x: x * TILE + 8, y: y * TILE + 8, img: PROP.torch, solid: [-3, -3, 6, 3], shadow: [4, 1] });
  decor.push({ kind: 'flame', x: x * TILE + 8, y: y * TILE - 6, c });
  lights.push({ x: x * TILE + 8, y: y * TILE - 6, r: 60, c, flicker: .15, always: true });
}
function buildZone(z, x0, rnd) {
  const R = (a, b) => a + ((rnd() * (b - a + 1)) | 0);
  // 预留：主路、NPC 位、告示牌、墙
  reserve(x0, ROAD - 1, ZW, 4);
  NPC_SPOTS[z] = { x: (x0 + 13) * TILE + 8, y: 13 * TILE + 13 };
  reserve(x0 + 12, 11, 3, 3);
  if (z < NZ - 1) { walls.push({ zone: z, x: (x0 + ZW - 1) * TILE }); reserve(x0 + ZW - 2, 4, 2, 22); }
  if (z === 0) reserve(x0, 4, 3, 22);
  if ([5, 6, 8, 13, 17, 19].includes(z)) { SIDE_SPOTS[z] = { x: (x0 + 18) * TILE + 8, y: 20 * TILE + 13 }; reserve(x0 + 16, 18, 5, 4); }
  const boss = BOSS_ZONES[z];
  if (!boss && z !== 26) [x0 + 1, x0 + 19].forEach((lx, i) => { if (!(z === 0 && i === 0)) lamp(lx, i ? ROAD + 2 : ROAD - 1); });
  if (boss) { NPC_SPOTS[z] = { x: (x0 + 12.5) * TILE, y: 12 * TILE + 10 }; reserve(x0 + 9, 7, 8, 6); }
  const flowers = ['#ff6b8b', '#ffd23f', '#ffffff', '#b48cff', '#ff9a4a'];
  switch (z) {
    case 0: {
      pond(x0 + 9, 21.5, 5.8, 3.3); pond(x0 + 13.5, 22.6, 3.2, 2.2); reserve(x0 + 2, 17, 16, 9);
      for (let k = 0; k < 7; k++) decor.push({ kind: 'lily', x: (x0 + 5 + rnd() * 9) * TILE, y: (20 + rnd() * 3) * TILE });
      for (let k = 0; k < 8; k++) decor.push({ kind: 'reed', x: (x0 + 3.5 + rnd() * 13) * TILE, y: (18.6 + (k % 2) * 6) * TILE });
      fillT(x0 + 3, 5, 9, 6, 'm');
      addObj({ x: (x0 + 5) * TILE, y: 12 * TILE + 4, img: PROP.monitor, solid: [-12, -6, 24, 6], shadow: [14, 3] });
      sparkSpots.push({ x: (x0 + 5) * TILE + 2, y: 12 * TILE - 14 });
      reserve(x0 + 3, 10, 5, 3);
      addObj({ x: (x0 + 16) * TILE, y: 10 * TILE + 14, img: PROP.well, solid: [-12, -12, 24, 12], shadow: [14, 3] }); reserve(x0 + 15, 8, 3, 3);
      addObj({ x: (x0 + 19) * TILE, y: 12 * TILE + 6, img: PROP.mailbox, solid: [-3, -3, 6, 3], shadow: [5, 2] }); reserve(x0 + 19, 11, 1, 2);
      break;
    }
    case 1: {
      house(z, x0 + 3, 12, { arch: 'kitchen', w: 96, roof: ['#7a2a2a', '#c4473d', '#e8786a'], wall: 'plaster', windows: [8, 70], chimney: true, shutters: true, sign: (A, x, y) => { A.E(x + 4, y + 4, 4, 2.5, '#e8e8f0'); A.R(x + 1, y + 2, 7, 1, '#f4c060'); A.R(x + 6, y - 2, 1, 4, '#8a5a3a'); } });
      fillT(x0 + 3, 18, 10, 6, 'f'); reserve(x0 + 2, 17, 12, 8);
      for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) addObj({ x: (x0 + 4 + c * 2.4) * TILE, y: (19 + r * 2) * TILE + 10, img: (r + c) % 2 ? PROP.crops : PROP.cabbage, shadow: null });
      for (let i = 0; i < 11; i++) addObj({ x: (x0 + 2.5 + i) * TILE + 8, y: 17 * TILE + 8, img: PROP.fence, solid: [-8, -3, 16, 3] });
      prop(x0 + 11, 12.1, PROP.barrel, 12);
      break;
    }
    case 2: {
      house(z, x0 + 3, 12, { w: 96, roof: ['#a87a10', '#e0b02a', '#ffd870'], wall: 'wood', wood: ['#5a3a26', '#8a5a3a', '#a8744c'], windows: [8, 70], chimney: false, shutters: true, sign: (A, x, y) => { A.E(x + 4, y + 3, 3, 3, '#fff27a'); A.R(x + 3, y + 6, 3, 2, '#8a8fa8'); } });
      prop(x0 + 10.5, 12, PROP.board, 20, 4, [14, 2]); reserve(x0 + 9, 10, 3, 3);
      fillT(x0 + 3, 18, 14, 7, 'm');
      prop(x0 + 6, 21, PROP.bench, 26, 5);
      break;
    }
    case 3: {
      [[x0 + 4, 20, 'stallR'], [x0 + 9.5, 21.5, 'stallB'], [x0 + 15, 20, 'stallG']].forEach(([x, y, k]) => { prop(x, y, PROP[k], 40, 6, [22, 3]); reserve(Math.floor(x) - 2, Math.floor(y) - 2, 5, 3); });
      [[x0 + 3, 11.5, 'crate'], [x0 + 4, 11.6, 'sack'], [x0 + 9, 11.8, 'barrel'], [x0 + 7, 23.6, 'crate'], [x0 + 12, 23.8, 'sack']].forEach(([x, y, k]) => prop(x, y, PROP[k]));
      for (let i = 0; i < 4; i++) decor.push({ kind: 'bunting', x: (x0 + 3 + i * 4) * TILE, y: 17.6 * TILE });
      break;
    }
    case 4: {
      for (let k = 0; k < 10; k++) decor.push({ kind: 'fogpuff', x: (x0 + rnd() * ZW) * TILE, y: (5 + rnd() * 20) * TILE, s: rnd() * 6 });
      [[x0 + 4, 10], [x0 + 19, 9], [x0 + 6, 20], [x0 + 16, 22]].forEach(([x, y], i) => { prop(x, y, makeRock(90 + i), 14); reserve(x, y - 1, 1, 2); });
      break;
    }
    case 5: {
      house(z, x0 + 3, 12, { w: 96, roof: ['#1e4a9a', '#3a7ae0', '#7ab0ff'], wall: 'white', windows: [8, 70], doorX: 40, shutters: true, sign: (A, x, y) => { A.E(x + 4, y + 3, 4, 3, '#e8c890'); A.P(x + 2, y + 2, '#e05a5a'); A.P(x + 5, y + 2, '#3a7ae0'); A.P(x + 3, y + 4, '#ffd23f'); } });
      prop(x0 + 10.5, 12.2, PROP.easel, 12, 3); prop(x0 + 4, 20, PROP.easel, 12, 3); prop(x0 + 8, 21, PROP.easel, 12, 3);
      for (let k = 0; k < 8; k++) decor.push({ kind: 'paint', x: (x0 + 3 + rnd() * 10) * TILE, y: (18 + rnd() * 6) * TILE, c: pick(['#e05a5a', '#3a7ae0', '#ffd23f', '#5ad06a', '#ff8ab0']) });
      reserve(x0 + 3, 18, 7, 5);
      break;
    }
    case 6: {
      house(z, x0 + 1, 12, { arch: 'kitchen', w: 128, roof: ['#7a1e1e', '#c43a3a', '#ec6a5a'], wall: 'plaster', windows: [8, 40, 100], doorX: 70, chimney: true, shutters: true, sign: (A, x, y) => { A.E(x + 4, y + 3, 4, 3, '#ffd23f'); A.R(x + 2, y + 2, 5, 1, '#c43a3a'); } });
      [[x0 + 4, 21], [x0 + 9, 21.5]].forEach(([x, y]) => { prop(x, y, PROP.umbrella, 20, 6, [12, 3]); reserve(Math.floor(x) - 1, Math.floor(y) - 2, 3, 3); });
      decor.push({ kind: 'lanterns', x1: (x0 + 1) * TILE + 6, x2: (x0 + 10) * TILE + 6, y: 8 * TILE });
      for (let i = 0; i < 6; i++) lights.push({ x: (x0 + 1.4 + i * 1.6) * TILE, y: 8.6 * TILE, r: 34, c: '#ff9a5a', night: true });
      break;
    }
    case 7: {
      house(z, x0 + 3, 12, { w: 80, roof: ['#2a6a6a', '#3aa8a0', '#7ad8c8'], wall: 'white', windows: [8], doorX: 52, sign: (A, x, y) => { A.R(x + 1, y, 7, 7, '#ffffff'); A.R(x + 2, y + 1, 5, 2, '#e04848'); A.R(x + 2, y + 4, 4, 1, '#7a86a8'); },
        deco(A, W, H, wx0, wy0) { for (let x = wx0 - 2; x < W - 3; x++) { const c = Math.floor((x - wx0) / 6) % 2 ? '#3aa8a0' : '#ffffff'; A.R(x, wy0 + 2, 1, 7, c); } } });
      prop(x0 + 10.5, 12.3, PROP.signpost, 4, 3, [6, 2]);
      [[x0 + 4, 20, 'crate'], [x0 + 5, 20.2, 'crate'], [x0 + 4.5, 19.3, 'crate'], [x0 + 8, 21, 'sack'], [x0 + 12, 22, 'barrel']].forEach(([x, y, k]) => prop(x, y, PROP[k]));
      prop(x0 + 14, 20, PROP.umbrella, 20, 6, [12, 3]); reserve(x0 + 13, 18, 3, 3);
      break;
    }
    case 8: {
      fillT(x0 + 2, 6, 10, 7, 'p');
      prop(x0 + 6.5, 12.4, PROP.scaffold, 52, 6, [28, 3]); reserve(x0 + 2, 7, 10, 6);
      [[x0 + 11, 12], [x0 + 2, 12.5], [x0 + 4, 19], [x0 + 10, 21]].forEach(([x, y]) => prop(x, y, PROP.cone, 6, 3, [4, 1]));
      [[x0 + 6, 20], [x0 + 7.4, 20.2], [x0 + 12, 22]].forEach(([x, y]) => prop(x, y, PROP.bricks, 16));
      prop(x0 + 3, 22.5, PROP.crate);
      break;
    }
    case 9: {
      fillT(x0, 4, ZW, 22, 'b'); fillT(x0, ROAD, ZW, 2, 'q');
      house(z, x0 + 2, 11, { w: 80, roof: ['#141a3a', '#242c5a', '#3a4478'], wall: 'wood', wood: ['#1a1a2a', '#2a2a40', '#3a3a58'], windows: [8, 56], doorX: 32, doorC: ['#141420', '#24243a', '#34344e'] });
      [[x0 + 5, 19], [x0 + 9, 21], [x0 + 14, 18.5], [x0 + 18, 22.5], [x0 + 3, 23]].forEach(([x, y]) => { prop(x, y, PROP.grave404, 10, 3, [6, 2]); reserve(Math.floor(x), Math.floor(y) - 1, 1, 2); });
      for (let k = 0; k < 6; k++) lights.push({ x: (x0 + 3 + k * 3.5) * TILE, y: (8 + (k % 3) * 6) * TILE, r: 40, c: '#5a8aff', always: true, flicker: .2 });
      break;
    }
    case 10: {
      house(z, x0 + 2, 12, { arch: 'lab', w: 112, roof: ['#1e5a6a', '#2a8aa0', '#5ac8d8'], wall: 'white', windows: [8, 40, 86], doorX: 62, sign: (A, x, y) => { A.R(x + 1, y, 7, 7, '#1a2440'); A.R(x + 2, y + 2, 2, 2, '#5af0ff'); A.R(x + 5, y + 2, 2, 2, '#5af0ff'); } });
      prop(x0 + 17, 10.8, PROP.dish, 20, 6, [12, 3]); reserve(x0 + 16, 8, 3, 3);
      prop(x0 + 5, 21, PROP.server2, 34, 6, [18, 3]); reserve(x0 + 3, 19, 5, 3);
      for (let k = 0; k < 2; k++) lights.push({ x: (x0 + 4.5 + k * 1.2) * TILE, y: 20 * TILE, r: 26, c: '#5ad06a', always: true, flicker: .3 });
      break;
    }
    case 11: {
      house(z, x0 + 3, 12, { w: 96, roof: ['#6a3a7a', '#9a5ab0', '#c88ad8'], wall: 'plaster', windows: [8, 70], chimney: true, sign: (A, x, y) => { A.R(x + 1, y, 7, 7, '#fff8e4'); A.R(x + 1, y, 1, 7, '#e05a5a'); A.R(x + 3, y + 2, 4, 1, '#7a86a8'); A.R(x + 3, y + 4, 3, 1, '#7a86a8'); } });
      prop(x0 + 10.6, 12.2, PROP.shelf, 26, 4, [14, 2]); reserve(x0 + 9, 10, 3, 3);
      prop(x0 + 5, 20, PROP.bench, 26, 5); prop(x0 + 9, 21, PROP.bench, 26, 5);
      break;
    }
    case 12: {
      fillT(x0 + 1, 4, 22, 9, 'm'); fillT(x0 + 1, 17, 22, 9, 'm');
      for (let k = 0; k < 9; k++) { const x = x0 + 2 + rnd() * 19, y = rnd() < .5 ? 6 + rnd() * 5 : 18 + rnd() * 7; if (!tileFree(Math.floor(x), Math.floor(y), 1, 1)) continue; prop(x, y, PROP.mushroom, 6, 3, [4, 1]); lights.push({ x: x * TILE, y: y * TILE - 6, r: 30, c: '#ff6ac8', always: true, flicker: .2 }); reserve(Math.floor(x), Math.floor(y), 1, 1); }
      break;
    }
    case 13: {
      house(z, x0 + 1, 12, { arch: 'library', w: 128, wallH: 44, roofH: 40, roof: ['#1a3a7a', '#2a5ab0', '#5a8ae0'], wall: 'stone', windows: [10, 44, 100], doorX: 64, sign: (A, x, y) => { A.R(x + 1, y, 7, 7, '#3a7ae0'); A.R(x + 2, y + 1, 5, 5, '#fff8e4'); A.R(x + 4, y + 1, 1, 5, '#c8cde0'); } });
      [[x0 + 3, 20], [x0 + 6, 20], [x0 + 9, 20]].forEach(([x, y]) => prop(x, y, PROP.shelf, 26, 4, [14, 2]));
      prop(x0 + 6, 23, PROP.bench, 26, 5); reserve(x0 + 2, 18, 9, 6);
      break;
    }
    case 14: {
      house(z, x0 + 2, 12, { arch: 'workshop', w: 112, roof: ['#3a3e52', '#5a5f78', '#8a8fa8'], wall: 'stone', windows: [10, 88], doorX: 46, chimney: true, sign: (A, x, y) => { A.E(x + 4, y + 3, 3, 3, '#8a8fa8'); A.E(x + 4, y + 3, 1, 1, '#3a3e52'); } });
      prop(x0 + 16.5, 11.4, PROP.gear, 14, 4, [8, 2]); reserve(x0 + 16, 10, 2, 2);
      [[x0 + 4, 20, 'toolbox'], [x0 + 7, 21, 'gear'], [x0 + 10, 20, 'crate'], [x0 + 11, 20.2, 'toolbox'], [x0 + 13, 22, 'barrel']].forEach(([x, y, k]) => prop(x, y, PROP[k]));
      break;
    }
    case 15: {
      for (let k = 0; k < 8; k++) lights.push({ x: (x0 + 2 + k * 2.6) * TILE, y: (7 + (k % 4) * 5) * TILE, r: 34, c: k % 2 ? '#ff8a3a' : '#b05aff', always: true, flicker: .25 });
      for (let k = 0; k < 6; k++) decor.push({ kind: 'foxfire', x: (x0 + 2 + k * 3.5) * TILE, y: (7 + (k % 4) * 5) * TILE, s: k });
      break;
    }
    case 16: {
      fillT(x0 + 1, 5, 22, 13, 's'); fillT(x0, ROAD, ZW, 2, 's');
      house(z, x0 + 7, 11, { w: 112, roof: ['#9c6a12', '#e0a92a', '#ffe07a'], wall: 'stone', windows: [10, 88], doorX: 48, doorC: ['#5a1e1e', '#9a2a2a', '#c84a4a'] });
      [x0 + 5, x0 + 15].forEach(x => { addObj({ x: x * TILE + 8, y: 12 * TILE + 8, img: PROP.pillar, solid: [-6, -5, 12, 5], shadow: [7, 2] }); reserve(x, 9, 1, 4); });
      addObj({ x: (x0 + 11.5) * TILE, y: 20 * TILE, img: PROP.statue, solid: [-14, -12, 28, 12], shadow: [15, 3] }); reserve(x0 + 10, 17, 4, 4);
      fillT(x0 + 8, 16, 8, 6, 's');
      [[x0 + 8, 18], [x0 + 15, 18], [x0 + 3, 9], [x0 + 20, 9]].forEach(([x, y]) => { torch(x, y); reserve(x, y - 1, 1, 2); });
      break;
    }
    case 17: {
      house(z, x0 + 3, 12, { w: 96, roof: ['#1e5a2e', '#2e8a46', '#5ac070'], wall: 'wood', windows: [8, 70], chimney: true, sign: (A, x, y) => { A.R(x + 1, y + 2, 7, 4, '#e05a5a'); [1, 4].forEach(dx => A.R(x + 1 + dx, y + 1, 2, 1, '#e05a5a')); } });
      [[x0 + 4, 20], [x0 + 5.3, 20.3], [x0 + 9, 21], [x0 + 12, 19.5]].forEach(([x, y]) => prop(x, y, PROP.bricks, 16));
      [[x0 + 10.5, 12.2, 'crate'], [x0 + 7, 23, 'crate'], [x0 + 8, 23.2, 'sack']].forEach(([x, y, k]) => prop(x, y, PROP[k]));
      break;
    }
    case 18: {
      house(z, x0 + 2, 12, { w: 112, roof: ['#8a6a10', '#d4a326', '#ffe07a'], wall: 'stone', windows: [10, 88], doorX: 46, doorC: ['#5a4a10', '#8a7020', '#b89a3a'] });
      prop(x0 + 4, 20.5, PROP.vault, 28, 6, [16, 3]); reserve(x0 + 2, 18, 5, 4);
      [[x0 + 9, 20], [x0 + 12, 21]].forEach(([x, y]) => { addObj({ x: x * TILE + 8, y: y * TILE + 8, img: PROP.pillar, solid: [-6, -5, 12, 5], shadow: [7, 2] }); reserve(x, y - 2, 1, 3); });
      break;
    }
    case 19: {
      house(z, x0 + 3, 12, { w: 96, roof: ['#2a3e7a', '#4a68c0', '#8aa8f0'], wall: 'white', windows: [8, 70], doorC: ['#8aa0c0', '#c8d4e8', '#ffffff'], sign: (A, x, y) => { A.R(x + 3, y, 3, 7, '#e04848'); A.R(x + 1, y + 2, 7, 3, '#e04848'); } });
      prop(x0 + 4, 19, PROP.bench, 26, 5); prop(x0 + 8, 19, PROP.bench, 26, 5);
      [x0 + 2.5, x0 + 10].forEach(x => prop(x, 12.25, PROP.pot, 10, 3, [5, 2]));
      reserve(x0 + 2, 18, 9, 2);
      break;
    }
    case 20: {
      fillT(x0, 4, ZW, 22, 'c'); fillT(x0, ROAD, ZW, 2, 'q');
      [[x0 + 3, 9], [x0 + 6, 21], [x0 + 18, 10], [x0 + 15, 23], [x0 + 20, 19]].forEach(([x, y], i) => { prop(x, y, makeRock(200 + i), 14); reserve(x, y - 1, 1, 2); });
      [[x0 + 8, 9], [x0 + 17, 18]].forEach(([x, y]) => { torch(x, y, '#ffb050'); reserve(x, y - 1, 1, 2); });
      decor.push({ kind: 'chasm', x: (x0 + 3) * TILE, y: 18 * TILE });
      break;
    }
    case 21: {
      house(z, x0 + 3, 12, { w: 80, roof: ['#3a2a6a', '#5a48a0', '#8a7ad0'], wall: 'plaster', windows: [8, 56], doorX: 32, sign: (A, x, y) => { A.R(x + 1, y + 1, 7, 5, '#3a3e52'); A.R(x + 2, y + 2, 5, 3, '#7dffa6'); } });
      prop(x0 + 10.4, 12.3, PROP.desk, 26, 4, [14, 2]); reserve(x0 + 9, 10, 3, 3);
      lights.push({ x: (x0 + 10.4) * TILE, y: 11.3 * TILE, r: 40, c: '#7dffd8', always: true, flicker: .05 });
      prop(x0 + 5, 20, PROP.rack, 14, 4); prop(x0 + 6.3, 20, PROP.rack, 14, 4);
      break;
    }
    case 22: {
      house(z, x0 + 3, 12, { w: 96, roof: ['#8a1e1e', '#d43a2a', '#ff7a5a'], wall: 'stone', windows: [8, 70], doorX: 40, chimney: true, sign: (A, x, y) => { A.R(x + 1, y + 1, 7, 5, '#ffffff'); A.L(x + 1, y + 1, x + 4, y + 4, '#e04848'); A.L(x + 7, y + 1, x + 4, y + 4, '#e04848'); } });
      [[x0 + 10.5, 12.2], [x0 + 4, 20], [x0 + 6, 20.3], [x0 + 8, 20]].forEach(([x, y]) => prop(x, y, PROP.mailbox, 6, 3, [5, 2]));
      prop(x0 + 12, 22, PROP.signpost, 4, 3, [6, 2]);
      break;
    }
    case 23: {
      fillT(x0 + 9, 16, 13, 10, 's');
      house(z, x0 + 2, 12, { w: 80, roof: ['#5a5f78', '#8a8fa8', '#c8cde0'], wall: 'white', windows: [8, 56], doorX: 32 });
      prop(x0 + 16, 23.5, PROP.rocket, 18, 8, [16, 4]); prop(x0 + 19.5, 23.5, PROP.tower, 16, 4, [10, 2]); reserve(x0 + 13, 17, 9, 8);
      [[x0 + 11, 18], [x0 + 21, 18]].forEach(([x, y]) => { lamp(x, y); });
      break;
    }
    case 24: {
      fillT(x0, 4, ZW, 22, 'v'); fillT(x0, ROAD, ZW, 2, 'q');
      for (let k = 0; k < 7; k++) { const x = x0 + 2 + k * 3, y = k % 2 ? 9 : 21; lights.push({ x: x * TILE, y: y * TILE, r: 50, c: '#ff5a1a', always: true, flicker: .2 }); }
      [[x0 + 4, 10], [x0 + 18, 9], [x0 + 7, 22], [x0 + 16, 21]].forEach(([x, y], i) => { prop(x, y, makeRock(300 + i, true), 14); reserve(x, y - 1, 1, 2); });
      break;
    }
    case 25: {
      fillT(x0, 4, ZW, 22, 'd'); fillT(x0, ROAD, ZW, 2, 'q');
      decor.push({ kind: 'castle', x: x0 * TILE, y: 4 * TILE }); markSolid(x0 * TILE, 4 * TILE, ZW * TILE, 4 * TILE); reserve(x0, 4, ZW, 5);
      [[x0 + 4, 11], [x0 + 19, 10], [x0 + 6, 19], [x0 + 15, 22], [x0 + 20, 18], [x0 + 3, 23], [x0 + 10, 24]].forEach(([x, y], i) => { addObj({ x: x * TILE + 8, y: y * TILE + 8, img: PROP.crystal, solid: [-5, -4, 10, 4], shadow: [6, 2], glow: true }); lights.push({ x: x * TILE + 8, y: y * TILE - 2, r: 56, c: i % 2 ? '#b05aff' : '#ff4ac8', always: true, flicker: .08 }); reserve(x, y - 1, 1, 2); });
      for (let k = 0; k < 5; k++) decor.push({ kind: 'puddle', x: (x0 + 3 + k * 4 + rnd() * 2) * TILE, y: (17 + (k % 3) * 3) * TILE });
      break;
    }
    case 26: {
      fillT(x0 + 1, 4, 22, 9, 'm'); fillT(x0 + 1, 17, 22, 9, 'm');
      NPC_SPOTS[z] = { x: (x0 + 12.5) * TILE, y: 12 * TILE + 12 };
      reserve(x0 + 8, 6, 9, 8);
      break;
    }
  }
  // 告示牌
  if (SIGN_TEXT[z]) sign(z, x0 + 16, ROAD + 2, SIGN_TEXT[z]);
  dressVillage(z, x0);
  // 随机装饰
  const darkZ = [9, 20, 24, 25].includes(z);
  const tries = darkZ ? 22 : 34;
  for (let k = 0; k < tries; k++) {
    const tx = x0 + R(1, ZW - 3), ty = rnd() < .5 ? R(5, 11) : R(18, 25);
    if (!tileFree(tx - 1, ty - 1, 3, 2)) continue;
    reserve(tx - 1, ty - 1, 3, 2);
    const r = rnd();
    if (r < (z === 12 || z === 15 ? .6 : .38)) addTree(tx * TILE + 8, ty * TILE + 12, z === 9 || z === 20 ? 'pine' : rnd() < .2 && !darkZ ? 'pine' : zoneTree(z, rnd), 1 + ((rnd() * 5) | 0));
    else if (r < .58) addObj({ x: tx * TILE + 8, y: ty * TILE + 12, img: makeBush(k + z * 50, darkZ ? null : rnd() < .5 ? pick(flowers) : null), solid: [-9, -5, 18, 5], shadow: [10, 2] });
    else if (r < .72) addObj({ x: tx * TILE + 8, y: ty * TILE + 12, img: makeRock(k + z * 50, darkZ), solid: [-7, -4, 14, 4], shadow: [8, 2] });
  }
  // 花和高草（不挡路）
  for (let k = 0; k < 70; k++) {
    const tx = x0 + R(0, ZW - 1), ty = R(4, 25), t = T(tx, ty);
    if (isRes(tx, ty) || (t !== 'g' && t !== 'm' && t !== 'd' && t !== 'b' && t !== 'c' && t !== 'v')) continue;
    const px = tx * TILE + R(2, 14), py = ty * TILE + R(4, 15);
    if (darkZ) { if (rnd() < .5) decor.push({ kind: 'glitchgrass', x: px, y: py }); continue; }
    decor.push(rnd() < .55 ? { kind: 'grass', x: px, y: py, s: rnd() * 6 } : { kind: 'flower', x: px, y: py, c: pick(flowers), s: rnd() * 6 });
  }
}
/* 门前庭院按房屋组织，不把生活物件随机撒在草地上。
 * 铺地与矮景没有碰撞；保留门前 40px 和任务人物周边，装饰区预留给整组家具。 */
function dressCourtyard(z, x0) {
  const h = objects.find(o => o.kind === 'house' && Math.floor(o.x / (ZW * TILE)) === z);
  if (!h || !h.doorWorld) return;
  const left = h.x + h.ox, right = left + h.img.width, gate = h.doorWorld.x;
  const theme = h.arch === 'kitchen' ? 'kitchen' : [11, 13, 16].includes(z) ? 'library' :
    [14, 17, 19].includes(z) ? 'workshop' : [10, 21, 23].includes(z) ? 'lab' : 'cottage';
  const floor = (x, y, w, ht, kind = theme) => {
    decor.push({ kind: 'courtyardFloor', x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(ht), theme: kind });
    reserve(Math.floor(x / TILE), Math.floor(y / TILE), Math.ceil(w / TILE), Math.ceil(ht / TILE));
  };
  const place = (key, x, y) => {
    const img = PROP[key]; if (!img) return;
    // Existing solid props and quest figures keep their visual breathing room.
    if ([NPC_SPOTS[z], SIDE_SPOTS[z]].some(p => p && Math.hypot(p.x - x, p.y - y) < 35)) return;
    if (Math.abs(x - gate) < 23 && Math.abs(y - h.y) < 40) return;
    if (objects.some(o => o.solid && o !== h && Math.abs(o.x - x) < (img.width + Math.min(o.img?.width || 12, 28)) / 2 && Math.abs(o.y - y) < 15)) return;
    addObj({ x, y, img, kind: 'courtyardProp', shadow: key.includes('Fence') ? null : [Math.min(15, img.width / 2), 2] });
  };
  // A shallow porch joins the existing door path. Its border has an actual opening.
  floor(left + 3, h.y - 1, h.img.width - 6, 27);
  decor.push({ kind: 'doorstep', x: gate, y: h.y + 3, end: ROAD * TILE, theme });
  for (const x of [left + 14, right - 14]) {
    if (Math.abs(x - gate) > 31) place(theme === 'kitchen' || theme === 'lab' ? 'yardHerbs' : 'yardFlowers', x, h.y + 23);
  }
  // Choose one lateral alcove. The occupied side of the street stays clear.
  const sideRight = right + 56 < NPC_SPOTS[z].x + 12;
  const sideX = sideRight ? right + 5 : left - 56;
  if (sideX >= x0 * TILE + 12 && sideX + 52 <= (x0 + ZW - 2) * TILE) {
    const sy = h.y - 44;
    floor(sideX, sy, 52, 53);
    place('yardFence', sideX + 26, sy + 8);
    place('yardSideFence', sideX + (sideRight ? 49 : 3), sy + 39);
    const sets = {
      kitchen: [['basket', 14, 27], ['wateringcan', 37, 35], ['yardHerbs', 25, 53]],
      library: [['bookcart', 16, 33], ['wateringcan', 39, 38], ['yardFlowers', 25, 53]],
      workshop: [['crate', 15, 31], ['toolbox', 36, 37], ['yardHerbs', 26, 53]],
      lab: [['wateringcan', 14, 31], ['crate', 36, 35], ['yardHerbs', 25, 53]],
      cottage: [['basket', 14, 31], ['wateringcan', 37, 37], ['yardFlowers', 25, 53]],
    };
    for (const [key, x, y] of sets[theme]) place(key, sideX + x, sy + y);
  }
  // Café seating reads as a small terrace: the existing umbrellas share one paved garden.
  if (z === 6) {
    floor((x0 + 1.5) * TILE, 18.2 * TILE, 154, 74, 'kitchen');
    for (const x of [x0 * TILE + 44, x0 * TILE + 149]) {
      place('yardFence', x, 18.7 * TILE); place('yardFlowers', x, 23.2 * TILE);
    }
    place('wateringcan', x0 * TILE + 183, 22.4 * TILE);
    place('basket', x0 * TILE + 175, 20.7 * TILE);
    decor.push({ kind: 'gardenSteps', x: gate, y: 16.4 * TILE, end: 18.2 * TILE });
  }
  // Continuous curb segments end before doors, noticeboards and quest approaches.
  decor.push({ kind: 'streetEdge', x: x0 * TILE + 32, y: ROAD * TILE - 3, w: (ZW - 4) * TILE,
    gaps: [gate, NPC_SPOTS[z].x], lowerGaps: [gate, (x0 + 16.5) * TILE, SIDE_SPOTS[z]?.x].filter(Number.isFinite) });
}
/* 小镇生活布景只占用空地，不侵入主路、门前和任务人物周边。 */
function dressVillage(z, x0) {
  dressCourtyard(z, x0);
  if (BOSS_ZONES[z] || z === 12) return;
  const items = z === 0 ? ['picnic', 'flowerbed', 'bench'] : z === 1 ? ['basket', 'wateringcan', 'flowerbed'] :
    z === 13 || z === 11 ? ['bookcart', 'teatable', 'flowerbed'] : z === 8 || z === 14 || z === 23 ? ['toolbox', 'bicycle', 'basket'] :
    ['bicycle', 'flowerbed', 'teatable'];
  const sites = [[18, 7], [5, 23], [19, 23], [15, 7], [8, 18], [4, 8]];
  let placed = 0;
  for (const [dx, row] of sites) {
    if (placed >= items.length) break;
    const tx = x0 + dx;
    if (!tileFree(tx - 1, row - 1, 3, 2)) continue;
    const key = items[placed++], img = PROP[key];
    if (!img) continue;
    prop(tx + .4, row + .8, img, Math.max(8, img.width - 5), 4, [Math.max(6, img.width / 2), 2]);
    reserve(tx - 1, row - 1, 3, 2);
    if (key === 'teatable') decor.push({ kind: 'teaSteam', x: (tx + .4) * TILE, y: (row + .8) * TILE - 19, s: z });
  }
  // 每一段故事完成后，这一段灯串点亮；未亮时仍保留纸灯的轮廓。
  if (z < 24) {
    const x1 = (x0 + 3) * TILE, x2 = (x0 + 19) * TILE, y = 7.5 * TILE;
    decor.push({ kind: 'festivalRibbon', x1, x2, y, z });
    for (let i = 0; i < 5; i++) { const f = (i + .5) / 5; lights.push({ x: x1 + (x2 - x1) * f, y: y + Math.sin(f * Math.PI) * 13 + 8, r: 33, c: i % 2 ? '#f4b776' : '#f3d69a', always: true, unlockZone: z, flicker: .025 }); }
  }
  // 两侧小卵石把道路收边，草地与通行区域一眼可分。
  for (let i = 2; i < ZW - 2; i += 3) {
    decor.push({ kind: 'roadstone', x: (x0 + i) * TILE, y: (ROAD + (i % 2 ? 2 : 0)) * TILE + (i % 2 ? 2 : -1), s: z + i });
  }
  for (const [dx, row] of [[18, 20], [6, 18], [18, 10]]) {
    const tx = x0 + dx;
    if (!tileFree(tx - 1, row - 1, 3, 2)) continue;
    const kind = z === 1 || z === 3 ? 'hen' : 'cat', phase = z * .73;
    addObj({ kind: 'villageAnimal', animal: kind, phase, x: (tx + .5) * TILE, y: (row + .8) * TILE, shadow: null, draw(g, sx, sy) {
      const step = Math.sin(worldT * .45 + phase), walking = Math.abs(step) < .8;
      const im = cached('village-' + kind + (walking ? Math.floor(worldT * 3) % 2 : 0), () => makeVillageAnimal(kind, walking ? Math.floor(worldT * 3) % 2 : 0));
      const ox = Math.round(step * 9); shadowAt(g, sx + ox, sy - 1, 7, 2);
      const face = (Math.cos(worldT * .45 + phase) > 0) === (kind === 'cat') ? cached('village-flip-' + kind + (walking ? Math.floor(worldT * 3) % 2 : 0), () => flipH(im)) : im;
      g.drawImage(face, sx + ox - Math.floor(face.width / 2), sy - face.height + 1);
    } });
    break;
  }
  if (z <= 13 || z === 26) decor.push({ kind: 'butterfly', x: (x0 + 18) * TILE, y: 21 * TILE, s: z * .8, c: z % 2 ? '#f5cb88' : '#d6a3cb' });
  if (z === 0) {
    decor.push({ kind: 'pondduck', x: 10 * TILE, y: 21 * TILE, s: 0 });
    decor.push({ kind: 'pondduck', x: 12 * TILE, y: 22 * TILE, s: 2 });
  }
}
const SIGN_TEXT = [
  '【星灯镇】欢迎你！\n把一盏盏灯点亮，让今晚的灯会重新开始。',
  '锅锅的小厨房\n营业时间：灯亮着的时候。',
  '点子小屋\n本屋名言："先想清楚，再动手。"',
  'MVP 集市\n今日特价：先做最重要的那一点点。',
  '前方：迷雾谷\n注意：说不清楚的需求，会变成迷雾。',
  '网页画室\n骨架、衣服、动作，一个都不能少。',
  '全栈饭馆\n大堂、后厨、仓库，一应俱全。',
  '送餐柜台\n点单请按菜单格式。乱写的单子一律退回。',
  '框架工地\n不要从零开始盖房子，用现成的框架！',
  '404 鬼屋\n你要找的页面……不在这里。',
  'AI 研究所\n本所员工：一位记性有限但很能干的实习生。',
  '记事本小屋\n记事本写满了，前面的事就会忘掉。',
  '幻觉森林\n这里的话，一半是真的，一半是编的。',
  '知识库图书馆\n先查资料，再回答。不知道就说不知道。',
  '智能体车间\n给 AI 一套工具，它就能自己去办事。',
  '狐狸巢穴\n小心！狐狸说的话，听起来都很像真的。',
  '存档神殿\n没存档就乱改代码者，后果自负。',
  '零件商店\n别人造好的零件，拿来就能用。',
  '保险箱银行\n钥匙放保险箱，代码里只写去哪儿拿。',
  'Bug 诊所\n本院不治："在我电脑上明明能跑"。',
  '冲突峡谷\n两个人同时改同一行，峡谷就会裂开。',
  '本地小屋\n这里的网站，只有屋主自己能打开。',
  '域名邮局\n好记的名字，帮大家找到你的网站。',
  '发射场\n上线前，请逐项检查发射清单。',
  '事故火山\n上线后着火了？先回滚，再查原因。',
  '黑话魔王城\n满嘴行话的魔王就住在这里。',
  '上线之门\n门的另一边，是现实世界。',
];

/* ---------- 地面烘焙 ---------- */
const GRASS = ['#3d5d46', '#52754f', '#6b895b', '#839b6a', '#acbb85'];
const MEAD = ['#4c6b48', '#628153', '#809763', '#9aac78', '#c1c88b'];
const DIRT = ['#705d44', '#917953', '#b19a70', '#c6b087', '#ddd0a5'];
const DDIRT = ['#1e1630', '#2e2446', '#3e325c', '#4e4270', '#6a5a90'];
const WATER = ['#284b60', '#39697b', '#518795', '#79a9ad', '#b1c9c0'];
const STONE = ['#4e5268', '#7a7f98', '#8c91aa', '#9ea3bc', '#c4c8da'];
const DARK = ['#160f24', '#1e1630', '#261c3c', '#30244a', '#3c2e5a'];
const DARKB = ['#0c1230', '#121a3e', '#18224c', '#1e2a5c', '#2a3a74'];
const VOLC = ['#1a0a08', '#28100c', '#361812', '#441e16', '#5a281c'];
const CANY = ['#2e2434', '#3e3044', '#524052', '#6a5464', '#866a78'];
const TCODE = { g: 0, p: 1, w: 2, s: 3, t: 4, d: 5, f: 6, m: 7, q: 8, b: 9, v: 10, c: 11 };
const NATURAL = new Set([0, 5, 7, 9, 10, 11]);
function typeAtPx(x, y) {
  if (inPond(x, y)) return TCODE.w;
  const t0 = T(x >> 4, y >> 4);
  let t = t0;
  if (t0 !== 's' && t0 !== 't') {
    const jx = (vnoise(x / 7, y / 7, 1) - .5) * 7, jy = (vnoise(x / 7, y / 7, 2) - .5) * 7;
    t = T(Math.floor((x + jx) / 16), Math.floor((y + jy) / 16));
    if (t === 's' || t === 't') t = t0;
  }
  return TCODE[t];
}
const CW_PX = ZW * TILE, MARGIN = 9;
/* 一块一块地烘焙地面：每帧只做一点，不卡顿 */
function bakeChunk(ch, budgetMs) {
  const t0 = performance.now(), W = CW_PX, H = MAPH, X0 = ch.z * W;
  if (!ch.ty) {
    const TW = W + MARGIN * 2, TH = H + MARGIN * 2; ch.tw = TW; ch.ty = new Uint8Array(TW * TH); ch.typeRow = 0;
    [ch.canvas, ch.g] = makeCanvas(W, H); ch.img = ch.g.createImageData(W, 32); ch.row = 0; ch.done = false;
  }
  const TW = ch.tw, TH = H + MARGIN * 2;
  while (ch.typeRow < TH) {
    const yy = ch.typeRow - MARGIN;
    for (let i = 0; i < TW; i++) { const x = X0 + i - MARGIN; ch.ty[ch.typeRow * TW + i] = (x < 0 || yy < 0 || x >= MAPW || yy >= H) ? 0 : typeAtPx(x, yy); }
    ch.typeRow++;
    if (budgetMs && performance.now() - t0 > budgetMs) return false;
  }
  const at = (x, y) => { const i = x - X0 + MARGIN, j = y + MARGIN; return (i < 0 || j < 0 || i >= TW || j >= TH) ? 0 : ch.ty[j * TW + i]; };
  const d = ch.img.data;
  while (ch.row < H) {
    const rows = Math.min(32, H - ch.row);
    for (let ry = 0; ry < rows; ry++) {
      const y = ch.row + ry;
      for (let lx = 0; lx < W; lx++) {
        const x = X0 + lx, col = groundColor(x, y, at(x, y), at, ch.z);
        const [r, g, b] = hex2rgb(col), i = (ry * W + lx) * 4; d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255;
      }
    }
    ch.g.putImageData(ch.img, 0, ch.row, 0, 0, W, rows);
    ch.row += rows;
    if (budgetMs && performance.now() - t0 > budgetMs && ch.row < H) return false;
  }
  ch.done = true; ch.ty = null; ch.img = null;
  return true;
}
function groundColor(x, y, t, at, zone) {
  const h = hash2(x, y, 3);
  if (t === 0 || t === 7) {
    const P = t === 7 ? MEAD : GRASS, f = fbm(x / 46, y / 46, 5);
    let k = f < .38 ? 1 : f < .6 ? 2 : 3;
    if (hash2(x, y, 7) > .984 || hash2(x, y - 1, 7) > .984) k = Math.max(0, k - 1);
    if (hash2(x, y, 8) > .994) k = Math.min(4, k + 1);
    const nb = at(x, y + 2), na = at(x, y - 2);
    if (nb === 1 || nb === 2 || nb === 8 || nb === 3) k = Math.max(0, k - 1);
    if (na === 2) k = Math.max(0, k - 1);
    let col = P[k];
    if (t === 7 && hash2(x >> 1, y >> 1, 9) > .985) col = ['#ff8ab0', '#ffffff', '#ffe060', '#c8a0ff'][(hash2(x >> 1, y >> 1, 10) * 4) | 0];
    if (zone === 0 && Math.hypot(x - (5 * TILE), y - (11.6 * TILE)) < 22 && hash2(x, y, 4) > .3) col = shade(col, .55);
    if (zone === 4) col = mix(col, '#9aa0b8', .35);
    return col;
  }
  if (t === 1 || t === 8) {
    const P = t === 8 ? DDIRT : DIRT, f = fbm(x / 20, y / 20, 6);
    let k = f < .45 ? 2 : 3;
    if (h > .97) k = 4; else if (h < .03) k = 1;
    if (hash2(x, y - 1, 3) > .97) k = 1;
    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) if (NATURAL.has(at(x + dx, y + dy))) { k = 1; break; }
    if (k > 1) for (const [dx, dy] of [[0, -2], [0, 2], [-2, 0], [2, 0]]) if (NATURAL.has(at(x + dx, y + dy))) { k = Math.min(k, 2); if (dy === 2) k = 1; }
    return P[k];
  }
  if (t === 2) {
    let dist = 9;
    for (let r = 1; r <= 8 && dist === 9; r++) if (at(x + r, y) !== 2 || at(x - r, y) !== 2 || at(x, y + r) !== 2 || at(x, y - r) !== 2) dist = r;
    const k = dist <= 1 ? 4 : dist <= 3 ? 3 : dist <= 6 ? 2 : 1;
    let col = WATER[k];
    if (k <= 2 && fbm(x / 9, y / 4, 11) > .62) col = WATER[k + 1];
    if (dist <= 1) { waterSpots.push({ x, y, edge: true }); if (h > .5) col = '#cfeefa'; }
    else if (h > .996) waterSpots.push({ x, y });
    return col;
  }
  if (t === 3) {
    const row = y >> 3, off = (row % 2) * 4, bx = (x + off) >> 3, lx = (x + off) & 7, ly = y & 7;
    if (lx === 0 || ly === 0) return STONE[0];
    const v = hash2(bx, row, 12); let col = v < .33 ? STONE[2] : v < .66 ? STONE[3] : STONE[1];
    if (lx === 1 || ly === 1) col = mix(col, STONE[4], .5); if (lx === 7 || ly === 7) col = mix(col, STONE[0], .35); if (hash2(x, y, 13) > .97) col = '#5e8a5a';
    return col;
  }
  if (t === 6) { const r = y % 5; let col = r === 0 ? '#5a3a26' : r === 1 ? '#8a5e40' : '#6e4a32'; if (h > .96) col = '#9a6e4a'; return col; }
  if (t === 5 || t === 9) {
    const P = t === 5 ? DARK : DARKB, f = fbm(x / 30, y / 30, 21);
    let col = P[f < .4 ? 1 : f < .6 ? 2 : 3];
    const v = Math.abs(fbm(x / 22, y / 22, 33) - .5);
    if (v < .012) col = t === 5 ? '#6a2a8a' : '#3a5ac8'; else if (v < .025) col = t === 5 ? '#3e2058' : '#24306a';
    if (h > .992) col = t === 5 ? '#8a5ac8' : '#8ab0ff';
    return col;
  }
  if (t === 10) {
    const f = fbm(x / 26, y / 26, 41); let col = VOLC[f < .4 ? 1 : f < .6 ? 2 : 3];
    const v = Math.abs(fbm(x / 18, y / 18, 43) - .5);
    if (v < .01) col = '#ffb43a'; else if (v < .022) col = '#ff5a1a'; else if (v < .032) col = '#8a2a10';
    return col;
  }
  if (t === 11) {
    const band = Math.floor((y + fbm(x / 40, y / 40, 51) * 30) / 6) % 4; let col = CANY[1 + band % 3];
    if (h > .97) col = CANY[4]; if (h < .02) col = CANY[0];
    return col;
  }
  return GRASS[2];
}
function chunkCanvas(z, sync) {
  const ch = ground.chunks[z]; if (!ch) return null;
  if (!ch.done) { if (!sync) return null; bakeChunk(ch, 0); }
  return ch.canvas;
}
function bakeIdle(budget = 5) {
  const cz = clamp(Math.floor((cam.x + VW / 2) / CW_PX), 0, NZ - 1);
  let best = null, bd = 1e9;
  for (const ch of ground.chunks) if (!ch.done) { const d = Math.abs(ch.z - cz); if (d < bd) { bd = d; best = ch; } }
  if (best) bakeChunk(best, budget);
}
function drawGround(g, ix, iy) {
  const z0 = Math.floor(ix / CW_PX), z1 = Math.floor((ix + VW - 1) / CW_PX);
  for (let z = Math.max(0, z0); z <= Math.min(NZ - 1, z1); z++) { const c = chunkCanvas(z, true); g.drawImage(c, z * CW_PX - ix, -iy); }
}

/* ---------- 世界内的动态小东西 ---------- */
function drawBarrierPost(g, sx, sy) {
  g.fillStyle = '#5a5f78'; g.fillRect(sx - 3, sy - 14, 6, 14); g.fillStyle = '#8a8fa8'; g.fillRect(sx - 3, sy - 14, 2, 14);
  g.fillStyle = '#e8e8f0'; g.fillRect(sx - 4, sy - 16, 8, 3);
  // 抬起的栏杆
  for (let i = 0; i < 26; i++) { g.fillStyle = Math.floor(i / 4) % 2 ? '#e04848' : '#ffffff'; g.fillRect(sx - 1 + Math.round(i * .25), sy - 16 - i, 3, 1); }
}
function drawDecor(g, d, cx, cy, t) {
  const sx = Math.round(d.x - cx), sy = Math.round(d.y - cy);
  switch (d.kind) {
    case 'courtyardFloor': {
      const warm = d.theme === 'kitchen' || d.theme === 'cottage';
      const palette = warm ? ['#77755d', '#9c9275', '#afa185', '#b9ab8d'] : ['#69736b', '#89938a', '#9da69a', '#aeb5a4'];
      g.fillStyle = palette[0]; g.fillRect(sx, sy, d.w, d.h);
      for (let y = 1; y < d.h - 1; y += 6) for (let x = 1 + ((y / 6 | 0) % 2) * 5; x < d.w - 1; x += 11) {
        const w = Math.min(10, d.w - x - 1), h = Math.min(5, d.h - y - 1);
        g.fillStyle = palette[1 + ((x / 11 | 0) + (y / 6 | 0)) % 2]; g.fillRect(sx + x, sy + y, w, h);
        g.fillStyle = palette[3]; g.fillRect(sx + x + 1, sy + y, Math.max(1, w - 2), 1);
      }
      g.fillStyle = '#66725b'; g.fillRect(sx, sy + d.h, d.w, 2);
      g.fillStyle = '#c0b798'; g.fillRect(sx + 2, sy + d.h - 2, d.w - 4, 1);
      // Short grates make the stone edge feel built, without adding visual noise.
      for (const x of [8, d.w - 18]) { g.fillStyle = '#596356'; g.fillRect(sx + x, sy + d.h - 6, 10, 4); g.fillStyle = '#a1a48c'; for (let i = 1; i < 9; i += 3) g.fillRect(sx + x + i, sy + d.h - 6, 1, 3); }
      break;
    }
    case 'doorstep': {
      const end = d.end - cy;
      g.fillStyle = '#9d967c'; g.fillRect(sx - 11, sy, 23, Math.max(0, end - sy));
      for (let y = sy + 2; y < end; y += 7) { g.fillStyle = '#c2b798'; g.fillRect(sx - 10, y, 21, 1); g.fillStyle = '#807f68'; g.fillRect(sx + (Math.floor(y / 7) % 2 ? -5 : 4), y + 1, 1, 5); }
      g.fillStyle = '#5c695b'; g.fillRect(sx - 10, sy, 21, 7); g.fillStyle = '#a3aa8e'; g.fillRect(sx - 8, sy + 2, 17, 1); g.fillRect(sx - 8, sy + 5, 17, 1);
      break;
    }
    case 'gardenSteps': {
      for (let y = sy; y < d.end - cy; y += 11) { g.fillStyle = '#69705b'; g.fillRect(sx - 10, y + 1, 22, 7); g.fillStyle = '#aaa384'; g.fillRect(sx - 9, y, 20, 6); g.fillStyle = '#cbc0a0'; g.fillRect(sx - 8, y, 18, 1); }
      break;
    }
    case 'streetEdge': {
      for (const [dy, gaps] of [[0, d.gaps], [38, d.lowerGaps]]) for (let x = 0; x < d.w; x += 8) {
        if (gaps.some(gate => Math.abs(d.x + x + 4 - gate) < 24)) continue;
        g.fillStyle = '#68725b'; g.fillRect(sx + x, sy + dy + 2, 8, 3);
        g.fillStyle = '#b1a786'; g.fillRect(sx + x, sy + dy, 7, 3); g.fillStyle = '#c7bc9c'; g.fillRect(sx + x + 1, sy + dy, 5, 1);
        if (x % 48 === 0) { g.fillStyle = '#7b8e64'; g.fillRect(sx + x + 2, sy + dy + 4, 4, 2); }
      }
      break;
    }
    case 'festivalRibbon': {
      const x1 = d.x1 - cx, x2 = d.x2 - cx, y = d.y - cy, lit = G.done > d.z;
      g.fillStyle = '#665d50';
      for (let x = x1; x <= x2; x += 2) { const f = (x - x1) / (x2 - x1); g.fillRect(Math.round(x), Math.round(y + Math.sin(f * Math.PI) * 13), 2, 1); }
      for (let i = 0; i < 5; i++) {
        const f = (i + .5) / 5, lx = Math.round(x1 + (x2 - x1) * f), ly = Math.round(y + Math.sin(f * Math.PI) * 13 + Math.sin(t * 1.8 + i) * .7);
        g.fillStyle = '#665d50'; g.fillRect(lx, ly, 1, 4);
        g.fillStyle = lit ? '#f3bd76' : '#a99178'; g.fillRect(lx - 3, ly + 4, 7, 8); g.fillRect(lx - 2, ly + 3, 5, 10);
        g.fillStyle = lit ? '#fff2bd' : '#c4b597'; g.fillRect(lx - 1, ly + 5, 2, 6);
        g.fillStyle = lit ? '#ba7254' : '#817063'; g.fillRect(lx - 2, ly + 3, 5, 1); g.fillRect(lx - 2, ly + 12, 5, 1); g.fillRect(lx, ly + 13, 1, 3);
      }
      break;
    }
    case 'roadstone': { const c = ['#ae9b7a', '#beac89', '#947f63'][Math.floor(d.s) % 3]; g.fillStyle = '#6b624b'; g.fillRect(sx - 3, sy, 7, 3); g.fillStyle = c; g.fillRect(sx - 2, sy - 1, 5, 3); g.fillStyle = '#d4c5a4'; g.fillRect(sx - 1, sy - 1, 3, 1); break; }
    case 'teaSteam': { const q = (t * 5 + d.s) % 9; g.globalAlpha = (1 - q / 9) * .6; g.fillStyle = '#f4e9d2'; g.fillRect(sx + Math.round(Math.sin(t * 2)) - 1, Math.round(sy - q), 1, 3); g.globalAlpha = 1; break; }
    case 'butterfly': { const x = Math.round(sx + Math.sin(t * .7 + d.s) * 18), y = Math.round(sy - 17 + Math.sin(t * 1.4 + d.s) * 7), wide = Math.floor(t * 7) % 2; g.fillStyle = d.c; g.fillRect(x - (wide ? 3 : 1), y - 1, wide ? 3 : 1, 3); g.fillRect(x + 1, y - 1, wide ? 3 : 1, 3); g.fillStyle = '#655064'; g.fillRect(x, y, 1, 3); break; }
    case 'pondduck': { const x = Math.round(sx + Math.sin(t * .28 + d.s) * 14), y = Math.round(sy + Math.sin(t * .4 + d.s) * 3); g.fillStyle = '#8ac9d1'; g.fillRect(x - 10, y + 2, 18, 1); g.fillRect(x - 7, y + 4, 13, 1); const f=Math.floor(t*2)%2,base=cached('pondduck'+f,()=>makePondDuck(f)),im=Math.cos(t*.28+d.s)>0?base:cached('pondduckL'+f,()=>flipH(base)); g.drawImage(im, x - 7, y - 9, 13, 12); break; }
    case 'grass': { const w = Math.round(Math.sin(t * 2 + d.x * .05 + d.s) * 1.2); g.fillStyle = GRASS[1]; g.fillRect(sx - 2, sy - 3, 1, 3); g.fillRect(sx + 2, sy - 3, 1, 3); g.fillStyle = GRASS[3]; g.fillRect(sx + w, sy - 5, 1, 5); g.fillRect(sx - 1 + w, sy - 4, 1, 2); g.fillStyle = GRASS[4]; g.fillRect(sx + 1 + w, sy - 6, 1, 3); break; }
    case 'flower': { const w = Math.round(Math.sin(t * 2.2 + d.x * .05 + d.s) * 1); g.fillStyle = GRASS[1]; g.fillRect(sx, sy - 4, 1, 4); g.fillStyle = d.c; g.fillRect(sx - 1 + w, sy - 6, 3, 1); g.fillRect(sx + w, sy - 7, 1, 3); g.fillStyle = '#fff6c0'; g.fillRect(sx + w, sy - 6, 1, 1); break; }
    case 'glitchgrass': { if (hash2(d.x, Math.floor(t * 4), 1) > .85) break; g.fillStyle = DARK[4]; g.fillRect(sx, sy - 3, 1, 3); g.fillRect(sx + 2, sy - 2, 1, 2); g.fillStyle = '#8a4ac8'; g.fillRect(sx + 1, sy - 4, 1, 4); break; }
    case 'lily': { g.fillStyle = '#3e8a4a'; g.beginPath(); g.ellipse(sx, sy + Math.sin(t + d.x) * .6, 5, 3, 0, 0, 6.28); g.fill(); g.fillStyle = '#5aa858'; g.fillRect(sx - 3, sy - 2, 3, 1); g.fillStyle = '#25569a'; g.fillRect(sx, sy - 1, 4, 1); if (d.x % 3 < 1) { g.fillStyle = '#ffd0e8'; g.fillRect(sx - 1, sy - 2, 2, 2); } break; }
    case 'reed': { const w = Math.sin(t * 1.5 + d.x) * 1; for (let i = 0; i < 3; i++) { g.fillStyle = i === 1 ? '#6a9a4a' : '#4a7a3a'; g.fillRect(sx + i * 2 + Math.round(w * (i / 2)), sy - 10 + i, 1, 10 - i); } g.fillStyle = '#7a4a2a'; g.fillRect(sx + 2 + Math.round(w), sy - 13, 2, 4); break; }
    case 'flag': case 'flagpole': {
      g.fillStyle = '#c8c8d8'; g.fillRect(sx, sy - 36, 2, 36); g.fillStyle = '#ffd23f'; g.fillRect(sx - 1, sy - 38, 4, 2);
      for (let i = 0; i < 14; i++) { const o = Math.round(Math.sin(t * 5 - i * .5) * 1.5); g.fillStyle = i < 2 ? shade(d.c, .7) : d.c; g.fillRect(sx + 2 + i, sy - 35 + o, 1, 8); g.fillStyle = shade(d.c, 1.3); g.fillRect(sx + 2 + i, sy - 35 + o, 1, 1); }
      break;
    }
    case 'bunting': { const cols = ['#ff6b8b', '#ffd23f', '#5ad06a', '#4aa8ff']; g.fillStyle = '#e8e8f0'; g.fillRect(sx, sy - 18, 24, 1); for (let i = 0; i < 4; i++) { g.fillStyle = cols[(i + Math.floor(d.x)) % 4]; const ox = sx + 2 + i * 6, oy = sy - 17 + Math.round(Math.sin(t * 3 + i) * .6); g.fillRect(ox, oy, 4, 2); g.fillRect(ox + 1, oy + 2, 2, 2); } break; }
    case 'lanterns': {
      const x1 = d.x1 - cx, x2 = d.x2 - cx, y = d.y - cy;
      for (let x = x1; x < x2; x++) { const tt = (x - x1) / (x2 - x1), sag = Math.sin(tt * Math.PI) * 10; g.fillStyle = '#3a3446'; g.fillRect(Math.round(x), Math.round(y + sag), 1, 1); }
      for (let i = 0; i < 6; i++) { const tt = (i + .5) / 6, x = x1 + (x2 - x1) * tt, sag = Math.sin(tt * Math.PI) * 10; g.fillStyle = i % 2 ? '#ff6a4a' : '#ffb43a'; g.fillRect(Math.round(x) - 2, Math.round(y + sag) + 1, 5, 6); g.fillStyle = '#fff0a0'; g.fillRect(Math.round(x) - 1, Math.round(y + sag) + 2, 1, 3); }
      break;
    }
    case 'flame': { const f = Math.floor(t * 10 + d.x) % 3; g.fillStyle = '#ff6a1a'; g.fillRect(sx - 3, sy - 4 - f, 6, 6 + f); g.fillStyle = '#ffb43a'; g.fillRect(sx - 2, sy - 3 - f, 4, 5 + f); g.fillStyle = '#fff4b0'; g.fillRect(sx - 1, sy - 1, 2, 3); break; }
    case 'puddle': { g.fillStyle = 'rgba(160,60,255,.25)'; g.beginPath(); g.ellipse(sx, sy, 14, 5, 0, 0, 6.28); g.fill(); for (let i = 0; i < 6; i++) { if (hash2(i, Math.floor(t * 6), d.x) > .5) { g.fillStyle = pick(['#ff2fa0', '#22e6d0', '#b07aff']); g.fillRect(sx - 10 + i * 4, sy - 2 + (i % 3), 2, 1); } } break; }
    case 'castle': drawCastle(g, sx, sy, t); break;
    case 'fogpuff': { const ox = Math.sin(t * .3 + d.s) * 30; g.globalAlpha = .18; g.drawImage(CLOUD_W || (CLOUD_W = makeFogPuff()), sx - 60 + ox, sy - 30); g.globalAlpha = 1; break; }
    case 'paint': { g.fillStyle = d.c; g.fillRect(sx, sy, 3, 2); g.fillRect(sx + 1, sy - 1, 2, 1); g.fillRect(sx + 4, sy + 1, 1, 1); break; }
    case 'foxfire': { const y = sy + Math.sin(t * 2 + d.s) * 4; g.globalCompositeOperation = 'lighter'; g.globalAlpha = .7; g.drawImage(glowSprite(d.s % 2 ? '#ff8a3a' : '#b05aff'), sx - 8, y - 8, 16, 16); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.fillStyle = '#fff6d0'; g.fillRect(sx, Math.round(y), 2, 2); break; }
    case 'chasm': { g.fillStyle = '#120c18'; for (let i = 0; i < 18; i++) { const w = 6 + Math.sin(i * .7) * 3; g.fillRect(sx + i * 16, sy + Math.round(Math.sin(i * 1.3) * 10), 16, w); } break; }
  }
}
let CASTLE = null, CLOUD_W = null;
function makeFogPuff() { const [c, x] = makeCanvas(120, 60); for (const [bx, by, r] of [[40, 32, 26], [70, 26, 30], [92, 34, 22]]) { const gr = x.createRadialGradient(bx, by, r * .2, bx, by, r); gr.addColorStop(0, 'rgba(240,240,255,1)'); gr.addColorStop(1, 'rgba(240,240,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 120, 60); } return c; }
function drawCastle(g, sx, sy, t) {
  if (!CASTLE) {
    const W = ZW * TILE, H = 80;
    CASTLE = spr(W, H, A => {
      const st = ['#140c22', '#22183a', '#2e2250', '#3e3068'];
      A.R(0, 20, W, 60, st[1]);
      for (let y = 20; y < 80; y += 6) for (let x = (y % 12 ? 0 : 6); x < W; x += 12) { A.R(x + 1, y + 1, 10, 4, st[2]); A.R(x + 1, y + 1, 10, 1, st[3]); }
      for (let x = 0; x < W; x += 16) A.R(x, 14, 9, 6, st[1]);
      [40, 180, 320].forEach(tx => { A.R(tx, 0, 34, 80, st[1]); for (let y = 2; y < 80; y += 6) A.R(tx + 2, y, 30, 4, st[2]); for (let x = 0; x < 34; x += 8) A.R(tx + x, -0, 5, 4, st[0]); A.R(tx + 12, 22, 10, 14, '#ff4ac8'); A.R(tx + 13, 23, 8, 12, '#ffa0ea'); A.R(tx + 16, 22, 2, 14, st[0]); });
      A.R(W / 2 - 22, 40, 44, 40, st[0]); for (let y = 40; y < 80; y += 4) A.R(W / 2 - 20, y, 40, 1, '#3a1a5a');
    }, { outline: false });
  }
  g.drawImage(CASTLE, sx, sy - 16);
  const a = .35 + Math.sin(t * 2) * .15; g.fillStyle = `rgba(255,74,200,${a})`; [40, 180, 320].forEach(tx => g.fillRect(sx + tx + 12, sy - 16 + 22, 10, 14));
}

/* ---------- 碰撞 ---------- */
function solidAtPx(x, y) {
  if (x < 0 || y < 0 || x >= MAPW || y >= MAPH) return true;
  return solid[Math.floor(y / SG) * SGW + Math.floor(x / SG)] === 1;
}

/* ---------- 光照 ---------- */
let lightCv, lightCx, vigCv;
resizeHooks.push(() => {
  [lightCv, lightCx] = makeCanvas(VW, VH);
  const [v, vx] = makeCanvas(VW, VH);
  const gr = vx.createRadialGradient(VW / 2, VH / 2, Math.min(VW, VH) * .35, VW / 2, VH / 2, Math.max(VW, VH) * .75);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(10,6,20,.42)'); vx.fillStyle = gr; vx.fillRect(0, 0, VW, VH); vigCv = v;
});
function ambientAt(wx) {
  const f = clamp(wx / (ZW * TILE) - .5, 0, NZ - 1), i = Math.floor(f), t = f - i;
  const a = AMB[i], b = AMB[Math.min(NZ - 1, i + 1)];
  const k = t < .55 ? 0 : (t - .55) / .45;
  return mix(a, b, easeInOut(k));
}
const lum = c => { const [r, g, b] = hex2rgb(c); return (r * .299 + g * .587 + b * .114) / 255; };
const GLOW_CACHE = new Map();
function glowSprite(c) {
  let s = GLOW_CACHE.get(c); if (s) return s;
  const [cv2, x] = makeCanvas(64, 64); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, rgba(c, 1)); g.addColorStop(.35, rgba(c, .55)); g.addColorStop(1, rgba(c, 0)); x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  GLOW_CACHE.set(c, cv2); return cv2;
}

/* ---------- 粒子 ---------- */
let parts = [];
function emit(p) { if (parts.length < 600) parts.push(p); }
function burst(x, y, n, opts = {}) {
  for (let i = 0; i < n; i++) {
    const a = rand(Math.PI * 2), sp = rand(opts.min || 20, opts.max || 90);
    emit({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (opts.up || 0), g: opts.g || 0, life: rand(.4, opts.life || 1), max: 1, c: pick(opts.colors || ['#ffffff']), size: opts.size || 2, glow: opts.glow, kind: 'spark' });
  }
}
function updateParts(dt) {
  for (const p of parts) {
    p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.g || 0) * dt;
    if (p.kind === 'leaf' || p.kind === 'petal') { p.vx = Math.sin(p.life * 2 + p.seed) * 14 + 8; }
    if (p.kind === 'firefly') { p.vx += (Math.random() - .5) * 30 * dt; p.vy += (Math.random() - .5) * 30 * dt; p.vx *= .98; p.vy *= .98; }
    if (p.drag) { p.vx *= 1 - p.drag * dt; p.vy *= 1 - p.drag * dt; }
  }
  parts = parts.filter(p => p.life > 0);
}
function drawParts(g, cx, cy, layer) {
  for (const p of parts) {
    if ((p.layer || 'world') !== layer) continue;
    const x = Math.round(p.x - (layer === 'world' ? cx : 0)), y = Math.round(p.y - (layer === 'world' ? cy : 0));
    if (x < -10 || y < -10 || x > VW + 10 || y > VH + 10) continue;
    const a = clamp(p.life / (p.fade || .4), 0, 1);
    g.globalAlpha = a;
    if (p.kind === 'smoke') { g.fillStyle = p.c; const s = Math.round(p.size + (1 - p.life / p.max) * 4); g.fillRect(x - s / 2, y - s / 2, s, s); }
    else if (p.kind === 'leaf') { g.fillStyle = p.c; g.fillRect(x, y, 2, 1); g.fillRect(x + (Math.sin(p.life * 6) > 0 ? 1 : 0), y + 1, 1, 1); }
    else if (p.kind === 'firefly') { const f = .5 + .5 * Math.sin(p.life * 5 + p.seed); g.globalAlpha = a * f; g.drawImage(glowSprite(p.c), x - 6, y - 6, 12, 12); g.fillStyle = '#ffffe0'; g.fillRect(x, y, 1, 1); }
    else { g.fillStyle = p.c; g.fillRect(x, y, p.size, p.size); if (p.glow) { g.globalAlpha = a * .5; g.drawImage(glowSprite(p.c), x - 5, y - 5, 10, 10); } }
  }
  g.globalAlpha = 1;
}

/* ---------- 云影 ---------- */
let CLOUD = null; const clouds = [];
let FOREST = null;
function makeForest() {
  const [c, x] = makeCanvas(192, 72);
  x.fillStyle = '#16301f'; x.fillRect(0, 0, 192, 72);
  const rnd = mulberry32(99);
  for (let row = 0; row < 4; row++) for (let i = -1; i < 8; i++) {
    const kind = rnd() < .45 ? 'pine' : 'oak', img = treeImg(kind, 1 + ((rnd() * 4) | 0));
    const tx = i * 26 + (row % 2) * 13 + ((rnd() * 6) | 0), ty = row * 20 - 20;
    for (const dx of [-192, 0, 192]) x.drawImage(img, tx + dx - img.width / 2, ty);
  }
  FOREST = c;
}
function initClouds() {
  const [c, x] = makeCanvas(160, 70);
  const blobs = [[50, 40, 32], [85, 30, 36], [120, 42, 28], [70, 48, 26], [104, 50, 24]];
  for (const [bx, by, r] of blobs) { const g = x.createRadialGradient(bx, by, r * .3, bx, by, r); g.addColorStop(0, 'rgba(20,30,70,.16)'); g.addColorStop(1, 'rgba(20,30,70,0)'); x.fillStyle = g; x.fillRect(0, 0, 160, 70); }
  CLOUD = c;
  for (let i = 0; i < 18; i++) clouds.push({ x: rand(MAPW), y: rand(-40, MAPH), s: rand(.8, 1.6), v: rand(5, 9) });
}
