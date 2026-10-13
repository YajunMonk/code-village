/* ============================================================
 * 35 角色与世界场景：玩家、小 A、村民、镜头、绘制
 * ============================================================ */
const FRAMES = new Map();
const cached = (k, f) => { let v = FRAMES.get(k); if (!v) { v = f(); FRAMES.set(k, v); } return v; };
const duckFrame = (f = 0, t = 0) => cached(`duck${f}${t ? 1 : 0}`, () => makeDuck(f, t ? 1 : 0));
const duckFrameL = (f = 0, t = 0) => cached(`duckL${f}${t ? 1 : 0}`, () => flipH(duckFrame(f, t)));
const chefFrame = (f = 0, t = 0, b = false) => cached(`chef${f}${t ? 1 : 0}${b}`, () => makeChefBot(f, t ? 1 : 0, b));
const runnerFrame = (f = 0, t = 0) => cached(`run${f}${t ? 1 : 0}`, () => makeRunner(f, t ? 1 : 0));
const stickyFrame = (f = 0, t = 0) => cached(`stk${f}${t ? 1 : 0}`, () => makeSticky(f, t ? 1 : 0));
const xaFrame = (f = 0, t = 0, m = 'ok') => cached(`xa${f}${t ? 1 : 0}${m}`, () => makeXA(f, t ? 1 : 0, m));
const snailFrame = (f = 0, t = 0) => cached(`sn${f}${t ? 1 : 0}`, () => makeSnail(f, t ? 1 : 0));
const bossFrame = (f = 0, h = false, kind = 'final') => cached(`boss${kind}${f}${h}`, () => makeBossKind(kind, f, h));
const hatImg = k => cached('hat' + k, () => makeHat(k));
const hatImgL = k => cached('hatL' + k, () => flipH(makeHat(k)));
const BUGIMG = () => cached('bug', makeBug);

/* ---------- 存档状态 ---------- */
const SAVE_KEY = 'code-village-v3';
const freshState = () => ({ done: 0, terms: [], side: [], ach: [], hats: [], hat: '', signs: [], wrong: 0, t: 0, px: 0, py: 0 });
let G = freshState();
/* 存档只放在本机浏览器里 */
let saveFx = 0;
const validSave = s => s && typeof s.done === 'number' && Array.isArray(s.terms);
function save(important) {
  G.px = player.x; G.py = player.y; G.savedAt = Date.now();
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(G)); } catch (e) {}
  if (important) saveFx = 1.8;
}
function loadSave() { try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); if (validSave(s)) return s; } catch (e) {} return null; }
function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} }
const hasProgress = s => !!(s && (s.done > 0 || (s.terms && s.terms.length)));
window.addEventListener('pagehide', () => { if (scene === 'world') save(true); });
document.addEventListener('visibilitychange', () => { if (document.hidden && scene === 'world') save(true); });

/* ---------- 玩家 & 同伴 ---------- */
const player = { x: 0, y: 0, dir: 3, frame: 0, walkT: 0, moving: false, stepT: 0, idleT: 0 };
const trail = [];
const xa = { x: 0, y: 0, f: 1, mood: 'ok' };
let cam = { x: 0, y: 0 };
let curZone = -1, bannerT = 0, bannerText = '', curRegion = -1, chapterT = 0, chapterR = 0;
let doorOpen = false;
const chatter = { t: 14, who: null, text: '', life: 0 };

/* ---------- 村民 ---------- */
const MAIN_WHO = ['xa', 'chef', 'pm', 'snail', 'boss', 'webkid', 'cook', 'waiter', 'builder', 'boss', 'prof', 'granny', 'detective', 'zero', 'runner', 'boss', 'priest', 'merchant', 'banker', 'doc', 'boss', 'homebody', 'postman', 'astro', 'boss', 'boss', 'door'];
const SIDES = [['responsive', 'kidB', 5], ['cache', 'iceKid', 6], ['cookie', 'kidD', 8], ['vector', 'kidA', 13], ['opensource', 'kidC', 17], ['comment', 'sticky', 19]];
const npcs = [];
function setupNPCs() {
  npcs.length = 0;
  MAIN_WHO.forEach((who, z) => {
    const s = NPC_SPOTS[z];
    const n = { id: z, who, kind: 'main', x: s.x, y: s.y, dir: 0, range: 26, blinkT: rand(2, 5) };
    if (who === 'xa') { n.kind = 'xaNpc'; n.x = (10 + 0.5) * TILE; n.y = 13 * TILE + 12; }
    if (who === 'boss') { n.boss = BOSS_ZONES[z]; n.range = 46; n.solid = [-26, -12, 52, 12]; }
    if (who === 'door') { n.range = 48; n.solid = [-32, -14, 64, 14]; }
    npcs.push(n);
  });
  SIDES.forEach(([sid, who, z]) => { const s = SIDE_SPOTS[z]; npcs.push({ id: 'side-' + sid, sid, who, kind: 'side', x: s.x, y: s.y, dir: 0, range: 26, blinkT: rand(2, 5) }); });
}
const npcVisible = n => !(n.kind === 'xaNpc' && G.done >= 1) && !(n.boss && n.boss !== 'final' && G.done > n.id);
const bossAlive = n => n.boss && G.done <= n.id;
const sideDone = sid => G.side.includes(sid);
function npcRect(n) { if (n.boss && !bossAlive(n)) return [-6, -4, 12, 4]; return n.solid || [-6, -5, 12, 5]; }

/* ---------- 碰撞 ---------- */
const wallActive = w => G.done <= w.zone;
let lastBump = 0;
function blocked(x, y) {
  for (const [dx, dy] of [[-5, -4], [5, -4], [-5, 0], [5, 0]]) if (solidAtPx(x + dx, y + dy)) return 'x';
  for (const w of walls) if (wallActive(w) && x + 5 > w.x && x - 5 < w.x + 16 && y > 4 * TILE && y < 26 * TILE) return 'wall';
  for (const n of npcs) { if (!npcVisible(n)) continue; const [rx, ry, rw, rh] = npcRect(n); if (x + 5 > n.x + rx && x - 5 < n.x + rx + rw && y > n.y + ry && y - 4 < n.y + ry + rh) return 'x'; }
  return null;
}
function tryMove(dx, dy) {
  const nx = player.x + dx, ny = player.y + dy, b = blocked(nx, ny);
  if (b) { if (b === 'wall' && performance.now() - lastBump > 3000) { lastBump = performance.now(); Audio.sfx('glitch'); shake(2); toast('乱码墙挡住了路，先帮帮这一片的村民吧'); } return false; }
  player.x = nx; player.y = ny; return true;
}

/* ---------- 互动 ---------- */
function interactTarget() {
  let best = null, bd = 1e9;
  for (const n of npcs) { if (!npcVisible(n)) continue; const d = Math.hypot(n.x - player.x, (n.y - 4) - (player.y - 4)); if (d < n.range && d < bd) { bd = d; best = { type: 'npc', n }; } }
  for (const o of objects) { if (!o.interact) continue; const d = Math.hypot(o.x - player.x, o.y - player.y); if (d < 24 && d < bd) { bd = d; best = { type: 'sign', o }; } }
  return best;
}

/* ---------- 世界更新 ---------- */
let worldT = 0, chirpT = 6;
function follow(o, trailBack, dt) {
  const tgt = trail.length > trailBack ? trail[trail.length - 1 - trailBack] : null;
  if (tgt) { const dx = tgt.x - o.x, dy = tgt.y - o.y; if (Math.hypot(dx, dy) > 1) { const k = Math.min(1, dt * 7); o.x += dx * k; o.y += dy * k; if (Math.abs(dx) > .5) o.f = dx > 0 ? 1 : -1; } }
  if (Math.hypot(o.x - player.x, o.y - player.y) > 140) { o.x = player.x - 18 - trailBack; o.y = player.y; }
}
function updateWorld(dt, free) {
  worldT += dt;
  player.moving = false;
  if (free) {
    let dx = (Input.held.right ? 1 : 0) - (Input.held.left ? 1 : 0), dy = (Input.held.down ? 1 : 0) - (Input.held.up ? 1 : 0);
    if (dx || dy) {
      const l = Math.hypot(dx, dy); dx /= l; dy /= l;
      const run = Input.held.run, sp = (run ? 140 : 92) * dt;
      const a = tryMove(dx * sp, 0), b = tryMove(0, dy * sp);
      player.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 3 : 2) : (dy > 0 ? 0 : 1);
      if (a || b) {
        player.moving = true; player.walkT += dt * (run ? 1.5 : 1); player.stepT -= dt * (run ? 1.5 : 1);
        if (player.stepT <= 0) { player.stepT = .3; Audio.sfx('step'); emit({ x: player.x + rand(-3, 3), y: player.y - 1, vx: rand(-8, 8), vy: rand(-10, -4), life: .4, max: .4, c: dustColor(), size: 2, kind: 'spark' }); }
        trail.push({ x: player.x, y: player.y }); if (trail.length > 80) trail.shift();
      }
    }
  }
  player.frame = player.moving ? [1, 0, 3, 0][Math.floor(player.walkT / .13) % 4] : 0;
  if (G.done >= 1) {
    follow(xa, 16, dt);
    // 小 A 的自言自语
    if (free && scene === 'world') { chatter.t -= dt; if (chatter.t < 0) { chatter.t = rand(16, 26); const line = pickChatter(); if (line) { chatter.who = line[0]; chatter.text = line[1]; chatter.life = 4.5; } } }
    if (chatter.life > 0) chatter.life -= dt;
  }
  for (const n of npcs) { n.blinkT -= dt; if (n.blinkT < -.12) n.blinkT = rand(2, 5); }
  // 镜头
  if (scene !== 'title') {
    const look = player.dir === 3 ? 18 : player.dir === 2 ? -18 : 0;
    let tx = player.x + look - VW / 2, ty = player.y - 12 - VH / 2;
    tx = clamp(tx, 0, MAPW - VW); ty = VH >= MAPH ? (MAPH - VH) / 2 : clamp(ty, 0, MAPH - VH);
    const k = 1 - Math.exp(-dt * 6); cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k;
  }
  // 区域 & 章节
  const z = clamp(Math.floor(player.x / (ZW * TILE)), 0, NZ - 1);
  if (z !== curZone && scene === 'world') {
    curZone = z; bannerT = 3; bannerText = ZONE_NAME[z]; Audio.play(zoneMusic(z));
    const r = regionOf(z); if (r !== curRegion) { if (curRegion >= 0 || z > 0) { chapterT = 4; chapterR = r; bannerT = 0; } curRegion = r; }
  }
  if (bannerT > 0) bannerT -= dt;
  if (chapterT > 0) chapterT -= dt;
  ambientParticles(dt);
  updateParts(dt);
  for (const c of clouds) { c.x += c.v * dt; if (c.x > MAPW + 200) c.x = -200; }
  if (Audio.music) { chirpT -= dt; if (chirpT < 0) { chirpT = rand(5, 12); if (z <= 8 && !BOSS_ZONES[z]) Audio.sfx('chirp'); } }
  bakeIdle(scene === 'title' ? 7 : 4);
}
function dustColor() { const z = curZone; return z === 9 ? '#3a4a8a' : z === 24 ? '#6a2a1a' : z === 25 ? '#4e4270' : z === 20 ? '#6a5464' : z === 16 || z === 23 ? '#9ea3bc' : '#c9a878'; }
function zoneMusic(z) {
  if (z === 26) return 'dawn';
  if (BOSS_ZONES[z] && G.done <= z) return 'dark';
  return REGIONS[regionOf(z)].music;
}
function ambientParticles(dt) {
  const cz = clamp(Math.floor((cam.x + VW / 2) / (ZW * TILE)), 0, NZ - 1), dark = 1 - lum(ambientAt(cam.x + VW / 2));
  const E = (o) => emit(Object.assign({ seed: rand(9), fade: 1 }, o));
  if (cz <= 8 && cz !== 4 && Math.random() < dt * 1.2) E({ kind: 'leaf', x: cam.x + rand(-20, VW), y: cam.y - 10, vx: 10, vy: rand(12, 22), life: rand(6, 10), max: 10, c: pick(['#6cb85a', '#a4dc76', '#43914e']) });
  if (cz >= 13 && cz <= 15 && Math.random() < dt * 2) E({ kind: 'leaf', x: cam.x + rand(-20, VW), y: cam.y - 10, vx: 10, vy: rand(12, 22), life: rand(6, 10), max: 10, c: pick(['#e07a2a', '#f4a83a', '#c04a22']) });
  if ((cz === 12 || cz === 16 || cz === 26) && Math.random() < dt * 2.5) E({ kind: 'leaf', x: cam.x + rand(-20, VW), y: cam.y - 10, vx: 10, vy: rand(10, 18), life: rand(6, 10), max: 10, c: pick(['#ffbcd4', '#fff0f6', '#e888ac']) });
  if (dark > .15 && Math.random() < dt * dark * 6) E({ kind: 'firefly', x: cam.x + rand(VW), y: cam.y + rand(40, VH), vx: rand(-5, 5), vy: rand(-5, 5), life: rand(3, 6), max: 6, c: cz === 25 ? '#ff7ae0' : cz === 9 ? '#8ab0ff' : cz === 24 ? '#ffb43a' : '#d8ff7a' });
  if (cz === 25 && Math.random() < dt * 5) E({ kind: 'spark', x: cam.x + rand(VW), y: cam.y + VH + 4, vx: rand(-4, 4), vy: rand(-22, -10), life: rand(2, 5), max: 5, c: pick(['#b05aff', '#ff4ac8', '#7a3aff']), size: 1, glow: true });
  if (cz === 24 && Math.random() < dt * 8) E({ kind: 'spark', x: cam.x + rand(VW), y: cam.y + VH + 4, vx: rand(-6, 6), vy: rand(-30, -14), life: rand(2, 5), max: 5, c: pick(['#ff5a1a', '#ffb43a', '#ff8a3a']), size: 1, glow: true });
  if (cz === 24 && Math.random() < dt * 3) E({ kind: 'smoke', x: cam.x + rand(VW), y: cam.y + VH, vx: rand(-4, 4), vy: rand(-14, -8), life: rand(3, 5), max: 5, c: pick(['#3a2a2a', '#4a3a3a']), size: 4, fade: 1.5 });
  if (cz === 12 && Math.random() < dt * 4) E({ kind: 'spark', x: cam.x + rand(VW), y: cam.y + rand(VH), vx: 0, vy: rand(-6, -2), life: rand(1, 2), max: 2, c: pick(['#ffd0f0', '#c8a0ff', '#ffffff']), size: 1, glow: true });
  if (cz === 4 && Math.random() < dt * 3) E({ kind: 'smoke', x: cam.x + rand(VW), y: cam.y + rand(VH), vx: rand(6, 14), vy: rand(-2, 2), life: rand(3, 6), max: 6, c: '#e8e8f4', size: 6, fade: 2 });
  for (const c of chimneys) if (Math.abs(c.x - cam.x - VW / 2) < VW && Math.random() < dt * 2.5) E({ kind: 'smoke', x: c.x + rand(-2, 2), y: c.y, vx: rand(4, 10), vy: rand(-16, -10), life: rand(1.8, 3), max: 3, c: pick(['#d8d4e4', '#c4c0d4', '#eeeaf6']), size: 3, fade: 1.2 });
  for (const s of sparkSpots) if (Math.abs(s.x - cam.x - VW / 2) < VW && Math.random() < dt * 1.5) burst(s.x, s.y, 3, { colors: ['#a0f0ff', '#ffffff', '#5ad1ff'], min: 10, max: 40, g: 80, life: .6, size: 1, glow: true });
}

/* ---------- 世界绘制 ---------- */
function isTalking(who) { return talkingWho && WHO[talkingWho] && WHO[talkingWho].id === who && Math.floor(worldT * 8) % 2; }
function npcSprite(n) {
  const talking = isTalking(n.who), blink = n.blinkT < 0;
  switch (n.who) {
    case 'xa': return xaFrame(Math.floor(worldT * 4) % 2, talking, 'ok');
    case 'chef': return chefFrame(Math.floor(worldT * 2) % 2, talking, blink);
    case 'runner': return runnerFrame(Math.floor(worldT * 6) % 4, talking);
    case 'sticky': return stickyFrame(Math.floor(worldT * 2) % 2, talking);
    case 'snail': return snailFrame(Math.floor(worldT * 2) % 2, talking);
    default: return charFrame(n.who, n.dir, 0, talking ? 1 : 0, blink);
  }
}
function shadowAt(g, x, y, rx, ry) { g.fillStyle = 'rgba(16,10,30,.24)'; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 6.283); g.fill(); }
function bubble(g, x, y, kind) {
  const b = Math.round(Math.sin(worldT * 5) * 1.5);
  g.fillStyle = OUTLINE; g.fillRect(x - 5, y - 15 + b, 11, 12); g.fillRect(x - 1, y - 3 + b, 3, 2);
  g.fillStyle = '#fffaf0'; g.fillRect(x - 4, y - 14 + b, 9, 10); g.fillRect(x, y - 4 + b, 1, 1);
  g.fillStyle = kind === '!' ? '#e8a020' : '#3a8ad0';
  if (kind === '!') { g.fillRect(x - 1, y - 12 + b, 3, 4); g.fillRect(x - 1, y - 7 + b, 3, 2); }
  else { g.fillRect(x - 2, y - 12 + b, 5, 1); g.fillRect(x + 2, y - 11 + b, 1, 2); g.fillRect(x, y - 9 + b, 2, 1); g.fillRect(x, y - 7 + b, 2, 2); }
}
function speech(g, x, y, text) {
  const w = textW(text) + 10, bx = Math.round(clamp(x - w / 2, 2, VW - w - 2)), by = Math.round(y - 20);
  g.fillStyle = OUTLINE; g.fillRect(bx, by, w, 17); g.fillStyle = '#fffaf0'; g.fillRect(bx + 1, by + 1, w - 2, 15);
  g.fillStyle = OUTLINE; g.fillRect(Math.round(x) - 1, by + 17, 3, 2); g.fillStyle = '#fffaf0'; g.fillRect(Math.round(x), by + 16, 1, 2);
  txt(g, text, bx + 5, by + 3, '#2a2030', { shadow: null });
}
function drawWorld(g, dt) {
  const sk = fx.shake > 0 ? fx.shake : 0;
  const ix = Math.round(cam.x + (sk ? rand(-sk, sk) : 0)), iy = Math.round(cam.y + (sk ? rand(-sk, sk) : 0));
  g.fillStyle = '#16301f'; g.fillRect(0, 0, VW, VH);
  drawGround(g, ix, iy);
  if (iy < 0 || iy + VH > MAPH) {
    if (!FOREST) makeForest();
    const ox = -((ix % 192) + 192) % 192;
    for (let y = -iy - 56; y > -72; y -= 52) for (let x = ox; x < VW; x += 192) g.drawImage(FOREST, x, y);
    for (let y = MAPH - iy - 16; y < VH; y += 52) for (let x = ox; x < VW; x += 192) g.drawImage(FOREST, x, y);
  }
  for (const w of waterSpots) { const sx = w.x - ix, sy = w.y - iy; if (sx < 0 || sy < 0 || sx > VW || sy > VH) continue; const ph = Math.sin(worldT * 2 + w.x * .3 + w.y * .2); if (w.edge) { if (ph > .6) { g.fillStyle = '#ffffff'; g.fillRect(sx, sy, 1, 1); } } else if (ph > .3) { g.fillStyle = '#d8f4ff'; g.fillRect(sx, sy, 2, 1); } }
  const ON_TOP = new Set(['lanterns', 'flag', 'flagpole', 'fogpuff', 'foxfire']);
  for (const d of decor) { const dx = (d.x || d.x1) - ix; if (dx < -400 || dx > VW + 400) continue; if (!ON_TOP.has(d.kind)) drawDecor(g, d, ix, iy, worldT); }
  const list = [];
  for (const o of objects) { const sx = o.x - ix; if (sx < -80 || sx > VW + 80 || o.y - iy < -10 || o.y + o.oy - iy > VH + 10) continue; list.push({ y: o.y, o }); }
  for (const d of decor) if ((d.kind === 'flag' || d.kind === 'flagpole') && Math.abs(d.x - ix - VW / 2) < VW) list.push({ y: d.y, d });
  for (const n of npcs) if (npcVisible(n) && Math.abs(n.x - ix - VW / 2) < VW) list.push({ y: n.y, n });
  if (scene === 'world' || scene === 'intro') list.push({ y: player.y + .1, p: true });
  if (G.done >= 1 && scene === 'world') list.push({ y: xa.y, xa: true });
  list.sort((a, b) => a.y - b.y);
  for (const e of list) {
    if (e.o) {
      const o = e.o, sx = Math.round(o.x - ix), sy = Math.round(o.y - iy);
      if (o.shadow) shadowAt(g, sx, sy - 1, o.shadow[0], o.shadow[1]);
      if (o.draw) { o.draw(g, sx, sy); continue; }
      if (o.sway) { const s = Math.round(Math.sin(worldT * 1.3 + o.x * .07) * .8); const cut = o.img.height - 16; g.drawImage(o.img, 0, 0, o.img.width, cut, sx + o.ox + s, sy + o.oy, o.img.width, cut); g.drawImage(o.img, 0, cut, o.img.width, 16, sx + o.ox, sy + o.oy + cut, o.img.width, 16); }
      else g.drawImage(o.img, sx + o.ox, sy + o.oy);
      if (o.glow) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = .25 + Math.sin(worldT * 3 + o.x) * .1; g.drawImage(glowSprite('#b05aff'), sx - 14, sy - 30, 28, 28); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
    } else if (e.d) drawDecor(g, e.d, ix, iy, worldT);
    else if (e.n) drawNpc(g, e.n, ix, iy);
    else if (e.p) { const im = charFrame('player', player.dir, player.frame); shadowAt(g, Math.round(player.x - ix), Math.round(player.y - iy) - 1, 6, 2); g.drawImage(im, Math.round(player.x - ix) - 9, Math.round(player.y - iy) - 29); }
    else if (e.xa) {
      const hov = Math.round(Math.sin(worldT * 3) * 1.5), im = xaFrame(Math.floor(worldT * 4) % 2, isTalking('xa'), xa.mood);
      shadowAt(g, Math.round(xa.x - ix), Math.round(xa.y - iy) - 1, 5, 2);
      const xx = Math.round(xa.x - ix) - 9, xy = Math.round(xa.y - iy) - 26 + hov, fb = Math.floor(worldT * 4) % 2;
      g.drawImage(xa.f < 0 ? cached('xaL' + im.width + xa.mood + fb + isTalking('xa'), () => flipH(im)) : im, xx, xy);
      if (G.hat) g.drawImage(xa.f < 0 ? hatImgL(G.hat) : hatImg(G.hat), xx + 2, xy - 4 + fb);
    }
  }
  for (const d of decor) if ((d.kind === 'lanterns' && Math.abs(d.x1 - ix) < VW + 200) || ((d.kind === 'fogpuff' || d.kind === 'foxfire') && Math.abs(d.x - ix - VW / 2) < VW)) drawDecor(g, d, ix, iy, worldT);
  drawParts(g, ix, iy, 'world');
  const amb = ambientAt(ix + VW / 2), dark = 1 - lum(amb);
  if (dark < .3) { g.globalAlpha = 1 - dark * 3; for (const c of clouds) { const sx = c.x - ix, sy = c.y - iy; if (sx < -260 || sx > VW + 20) continue; g.drawImage(CLOUD, Math.round(sx), Math.round(sy), 160 * c.s, 70 * c.s); } g.globalAlpha = 1; }
  // 光照
  lightCx.globalCompositeOperation = 'source-over'; lightCx.fillStyle = amb; lightCx.fillRect(0, 0, VW, VH);
  lightCx.globalCompositeOperation = 'lighter';
  const nightK = clamp((dark - .05) * 2.4, 0, 1), glows = [];
  for (const L of lights) {
    const sx = L.x - ix, sy = L.y - iy; if (sx < -L.r || sx > VW + L.r || sy < -L.r || sy > VH + L.r) continue;
    let k = L.always ? .45 + dark * .9 : nightK; if (k <= 0) continue;
    if (L.flicker) k *= 1 - L.flicker + Math.random() * L.flicker * 2;
    lightCx.globalAlpha = clamp(k, 0, 1); lightCx.drawImage(glowSprite(L.c), sx - L.r, sy - L.r, L.r * 2, L.r * 2);
    glows.push([L, sx, sy, k]);
  }
  if (dark > .25) { lightCx.globalAlpha = clamp(dark, 0, .8); lightCx.drawImage(glowSprite('#ffe8c8'), player.x - ix - 56, player.y - iy - 70, 112, 112); if (G.done >= 1) { lightCx.globalAlpha = clamp(dark * .6, 0, .5); lightCx.drawImage(glowSprite('#7af8ff'), xa.x - ix - 24, xa.y - iy - 40, 48, 48); } }
  lightCx.globalAlpha = 1;
  g.globalCompositeOperation = 'multiply'; g.drawImage(lightCv, 0, 0);
  g.globalCompositeOperation = 'lighter';
  for (const [L, sx, sy, k] of glows) { g.globalAlpha = clamp(k * .28, 0, .5); const r = L.r * .45; g.drawImage(glowSprite(L.c), sx - r, sy - r, r * 2, r * 2); }
  const cz = Math.floor((ix + VW / 2) / (ZW * TILE));
  if (cz === 26 || cz === 16 || cz === 0 || cz === 10) {
    g.globalAlpha = .07;
    for (let i = 0; i < 5; i++) { const x0 = ((i * 137 + worldT * 6 - ix * .3) % (VW + 200)) - 100; g.fillStyle = cz === 0 ? '#fff6d0' : '#ffd0b0'; g.beginPath(); g.moveTo(x0, 0); g.lineTo(x0 + 26, 0); g.lineTo(x0 + 26 + VH * .6, VH); g.lineTo(x0 + VH * .6, VH); g.fill(); }
  }
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  if (scene !== 'title') for (const w of walls) if (wallActive(w)) drawGlitchWall(g, w.x - ix, 4 * TILE - iy, 22 * TILE);
  // 同伴的闲聊气泡
  if (chatter.life > 0 && scene === 'world' && !screens.length) { g.globalAlpha = clamp(chatter.life, 0, 1); speech(g, xa.x - ix, xa.y - iy - 30, chatter.text); g.globalAlpha = 1; }
  drawParts(g, ix, iy, 'top');
  g.drawImage(vigCv, 0, 0);
}
function drawNpc(g, n, ix, iy) {
  const sx = Math.round(n.x - ix), sy = Math.round(n.y - iy);
  if (n.boss) {
    if (!bossAlive(n)) { if (n.boss === 'final') { const im = BUGIMG(); shadowAt(g, sx, sy - 2, 7, 2); g.drawImage(im, sx - 9, sy - 18 - (Math.floor(worldT * 3) % 2)); } return; }
    shadowAt(g, sx, sy - 2, 30, 6);
    const im = bossFrame(Math.floor(worldT * 4) % 4, false, n.boss), by = Math.round(Math.sin(worldT * 2) * 2);
    for (let i = 0; i < 29; i++) { const off = Math.round(Math.sin(worldT * 4 + i * .4) * (i % 7 === 0 ? 2 : .6)); g.drawImage(im, 0, i * 2, 66, 2, sx - 33 + off, sy - 60 + by + i * 2, 66, 2); }
    if (G.done === n.id && scene === 'world' && promptTarget !== n) bubble(g, sx, sy - 62, '!');
    return;
  }
  if (n.who === 'door') { drawDoor(g, sx, sy); if (G.done === n.id && scene === 'world' && promptTarget !== n) bubble(g, sx, sy - 84, '!'); return; }
  const im = npcSprite(n);
  shadowAt(g, sx, sy - 1, 6, 2);
  const h = im.height;
  g.drawImage(im, sx - Math.round(im.width / 2), sy - h + 1);
  if (scene === 'world' && promptTarget !== n) {
    if (n.kind === 'side' && !sideDone(n.sid)) bubble(g, sx, sy - h - 1, '?');
    else if (n.id === G.done) bubble(g, sx, sy - h - 1, '!');
  }
}
function drawDoor(g, sx, sy) {
  const x = sx - 32, y = sy - 80;
  g.fillStyle = 'rgba(16,10,30,.3)'; g.beginPath(); g.ellipse(sx, sy - 2, 36, 6, 0, 0, 6.28); g.fill();
  g.fillStyle = '#2a2a3a'; g.fillRect(x - 2, y + 4, 68, 78);
  g.fillStyle = '#5a5f78'; g.fillRect(x, y + 2, 64, 76); g.fillStyle = '#8a8fa8'; g.fillRect(x, y + 2, 64, 3); g.fillRect(x, y + 2, 3, 76);
  g.fillStyle = '#3a3e52'; g.fillRect(x + 6, y + 10, 52, 54);
  const open = doorOpen || G.done >= NZ;
  if (open) {
    const gr = g.createRadialGradient(sx, y + 37, 2, sx, y + 37, 40); gr.addColorStop(0, '#ffffff'); gr.addColorStop(.5, '#fff2b0'); gr.addColorStop(1, '#ffb070'); g.fillStyle = gr; g.fillRect(x + 8, y + 12, 48, 50);
    g.globalCompositeOperation = 'lighter'; g.globalAlpha = .5; for (let i = 0; i < 8; i++) { const a = worldT * .5 + i * .785; g.fillStyle = '#fff4c0'; g.beginPath(); g.moveTo(sx, y + 37); g.lineTo(sx + Math.cos(a) * 90, y + 37 + Math.sin(a) * 90); g.lineTo(sx + Math.cos(a + .12) * 90, y + 37 + Math.sin(a + .12) * 90); g.fill(); } g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  } else {
    g.fillStyle = '#071008'; g.fillRect(x + 8, y + 12, 48, 50);
    g.fillStyle = '#1e5a34'; for (let i = 0; i < 6; i++) g.fillRect(x + 12, y + 16 + i * 6, 10 + ((i * 13) % 26), 2);
    txt(g, '>', x + 12, y + 48, '#7dffa6', { shadow: null }); g.fillStyle = '#7dffa6'; if (Math.floor(worldT * 2) % 2) g.fillRect(x + 20, y + 57, 6, 2);
    g.fillStyle = 'rgba(125,255,166,.06)'; for (let yy = y + 12; yy < y + 62; yy += 2) g.fillRect(x + 8, yy, 48, 1);
  }
  g.fillStyle = '#7a7f98'; g.fillRect(x - 6, y + 74, 76, 6); g.fillStyle = '#a0a4bc'; g.fillRect(x - 6, y + 74, 76, 1);
  g.fillStyle = open ? '#ffe07a' : '#5ad1ff'; const p = Math.floor(worldT * 8) % 20;
  [[x + 2, y + 20], [x + 60, y + 30], [x + 2, y + 50], [x + 60, y + 60]].forEach(([a, b], i) => { g.fillRect(a, b, 2, 10); if ((p + i * 5) % 20 < 3) { g.globalAlpha = .6; g.fillRect(a - 1, b - 1, 4, 12); g.globalAlpha = 1; } });
}
const GLYPHS = [DIGITS[0], DIGITS[1], ['010', '111', '010', '111', '010'], ['111', '001', '010', '000', '010'], ['101', '010', '101', '010', '101']];
function drawGlitchWall(g, sx, sy, h) {
  if (sx < -40 || sx > VW + 40) return;
  const t = worldT;
  g.fillStyle = 'rgba(20,6,40,.55)'; g.fillRect(sx - 2, sy, 20, h);
  g.globalCompositeOperation = 'lighter';
  g.globalAlpha = .35; g.drawImage(glowSprite('#ff2fa0'), sx - 20, sy - 10, 56, h + 20); g.globalAlpha = 1;
  for (let col = 0; col < 4; col++) {
    const speed = 30 + col * 17, off = (t * speed + col * 37) % 8;
    for (let r = -1; r < h / 8; r++) {
      const y = sy + r * 8 + off, k = Math.floor(r - t * speed / 8);
      const gl = GLYPHS[Math.floor(hash2(col, k, 3) * GLYPHS.length)], c = hash2(col, k, 9) > .5 ? '#ff2fa0' : '#22e6d0';
      const bright = hash2(col, k, 4) > .85 ? '#ffffff' : c;
      gl.forEach((row, ry) => row.split('').forEach((v, rx) => { if (v === '1') { g.fillStyle = bright; g.fillRect(sx + col * 4 + rx, y + ry, 1, 1); } }));
    }
  }
  g.globalCompositeOperation = 'source-over';
  if (hash2(Math.floor(t * 12), 1, sx | 0) > .8) { const yy = sy + hash2(Math.floor(t * 12), 2, 3) * h, hh = 3 + hash2(Math.floor(t * 12), 3, 4) * 8; g.drawImage(cv, Math.max(0, sx - 30), yy, 76, hh, Math.max(0, sx - 30) + (hash2(Math.floor(t * 12), 5, 6) * 10 - 5), yy, 76, hh); }
  g.fillStyle = '#ff2fa0'; g.fillRect(sx - 2, sy, 1, h); g.fillStyle = '#22e6d0'; g.fillRect(sx + 17, sy, 1, h);
}

/* ---------- HUD ---------- */
let HB = null;
const hudBtns = { get app() { mkHB(); return HB.app; }, get note() { mkHB(); return HB.note; }, get menu() { mkHB(); return HB.menu; } };
function mkHB() { if (!HB) HB = { app: new Btn({ w: 22, h: 18 }), note: new Btn({ w: 54, h: 18 }), menu: new Btn({ w: 20, h: 18 }) }; }
function drawHUD(g, dt) {
  if (saveFx > 0) {
    saveFx -= dt; const a = clamp(saveFx * 2, 0, 1), label = '已存档', w = textW(label) + 24, x = VW - w - 4, y = 26;
    g.globalAlpha = a; win(g, x, y, w, 18, 'dark');
    g.fillStyle = UIC.mint; g.fillRect(x + 7, y + 5, 8, 8); g.fillStyle = '#123a26'; g.fillRect(x + 9, y + 6, 4, 3); g.fillRect(x + 9, y + 10, 4, 2);
    txt(g, label, x + 19, y + 3, UIC.text); g.globalAlpha = 1;
  }
  const goal = goalText();
  const gw = Math.min(VW - 120, textW(goal) + 26);
  win(g, 4, 4, gw, 20, 'dlg');
  g.fillStyle = UIC.gold; g.fillRect(10, 9, 3, 6); g.fillRect(10, 16, 3, 2);
  g.save(); g.beginPath(); g.rect(16, 4, gw - 18, 20); g.clip(); txt(g, goal, 18, 8, UIC.text); g.restore();
  const nb = hudBtns.note; nb.label = `${mainCount()}/${TERMS.length}`; nb.w = textW(nb.label) + 30; nb.x = VW - 28 - nb.w; nb.y = 4; nb.icon = 'context'; nb.align = 'left';
  nb.draw(g, false, worldT);
  const ab = hudBtns.app; ab.x = nb.x - 26; ab.y = 4; ab.draw(g, false, worldT);
  g.fillStyle = '#1a1222'; g.fillRect(ab.x + 7, ab.y + 3, 8, 12); g.fillStyle = appStage() ? '#5af0ff' : '#5a5f78'; g.fillRect(ab.x + 8, ab.y + 4, 6, 9); g.fillStyle = '#ffd23f'; g.fillRect(ab.x + 10, ab.y + 13, 2, 1);
  if (appNew) { g.fillStyle = UIC.rose; g.fillRect(ab.x + 16, ab.y + 1, 4, 4); }
  const mb = hudBtns.menu; mb.x = VW - 24; mb.y = 4;
  mb.draw(g, false, worldT); g.fillStyle = UIC.text; for (let i = 0; i < 3; i++) g.fillRect(mb.x + 6, mb.y + 5 + i * 3, 8, 1);
  if (chapterT > 0) {
    const R = REGIONS[chapterR], a = chapterT > 3.4 ? (4 - chapterT) / .6 : chapterT < .8 ? chapterT / .8 : 1;
    g.globalAlpha = clamp(a, 0, 1);
    const y = Math.round(VH * .3);
    g.fillStyle = 'rgba(10,8,24,.7)'; g.fillRect(0, y, VW, 46);
    g.fillStyle = UIC.gold; g.fillRect(0, y, VW, 1); g.fillRect(0, y + 45, VW, 1);
    if (!R._logo) R._logo = makeLogo(R.name, 2);
    g.drawImage(R._logo, Math.round(VW / 2 - R._logo.width / 2), y + 2);
    txt(g, R.sub, VW / 2, y + 32, UIC.text, { align: 'center' });
    g.globalAlpha = 1;
  } else if (bannerT > 0) {
    const a = bannerT > 2.5 ? (3 - bannerT) / .5 : bannerT < .6 ? bannerT / .6 : 1;
    g.globalAlpha = clamp(a, 0, 1);
    const w = textW(bannerText) + 40, x = Math.round((VW - w) / 2), y = 54;
    g.fillStyle = 'rgba(10,8,24,.6)'; g.fillRect(x, y, w, 20);
    g.fillStyle = UIC.gold; g.fillRect(x, y, w, 1); g.fillRect(x, y + 19, w, 1); g.fillRect(x + 6, y + 9, 8, 1); g.fillRect(x + w - 14, y + 9, 8, 1);
    txt(g, bannerText, VW / 2, y + 4, UIC.text, { align: 'center' });
    g.globalAlpha = 1;
  }
}
let promptTarget = null;
function drawPrompt(g) {
  const t = interactTarget(); promptTarget = t && t.n; if (!t) return;
  const ix = Math.round(cam.x), iy = Math.round(cam.y);
  let x, y;
  if (t.type === 'npc') { x = t.n.x - ix; y = t.n.y - iy - (t.n.boss ? 64 : t.n.who === 'door' ? 86 : 36); }
  else { x = t.o.x - ix; y = t.o.y - iy - 26; }
  const key = Input.device === 'touch' || TOUCH ? 'A' : '空格', label = t.type === 'sign' ? '看看' : t.n.boss && bossAlive(t.n) ? '挑战' : t.n.who === 'door' ? '打开' : '说话';
  const w = textW(key) + textW(label) + 18, bx = Math.round(x - w / 2), by = Math.round(y - 18 + Math.sin(worldT * 4));
  win(g, bx, by, w, 17, 'dlg');
  g.fillStyle = UIC.gold; g.fillRect(bx + 4, by + 3, textW(key) + 6, 11); txt(g, key, bx + 7, by + 3, '#2a1e10', { shadow: null });
  txt(g, label, bx + textW(key) + 14, by + 3, UIC.text);
}
