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
const freshState = () => ({ done: 0, terms: [], side: [], ach: [], hats: [], hat: '', signs: [], comics: [], keepsakes: [], roomsVisited: [], residentsSeen: [], residentVisits: {}, wrong: 0, t: 0, px: 0, py: 0 });
let G = freshState();
/* 存档只放在本机浏览器里 */
let saveFx = 0;
const validSave = s => !!(s && typeof s === 'object' && !Array.isArray(s) && Number.isInteger(s.done) && s.done >= 0 && s.done <= NZ && Array.isArray(s.terms));
function normalizeSave(s) {
  if (!validSave(s)) return null;
  const next = { ...freshState(), ...s, version: 4 };
  const ids = (value, allowed) => [...new Set((Array.isArray(value) ? value : []).filter(v => typeof v === 'string' && v.length <= 100 && (!allowed || allowed.has(v))))].slice(0, 512);
  next.terms = ids(s.terms, typeof TERMS !== 'undefined' ? new Set([...TERMS, ...HIDDEN].map(t => t.id)) : null);
  next.ach = ids(s.ach, typeof ACH !== 'undefined' ? new Set(ACH.map(a => a.id)) : null);
  next.hats = ids(s.hats, typeof HATS !== 'undefined' ? new Set(Object.keys(HATS)) : null);
  next.hat = typeof s.hat === 'string' && next.hats.includes(s.hat) ? s.hat : '';
  next.side = ids(s.side, new Set(SIDES.map(row => row[0])));
  next.signs = [...new Set((Array.isArray(s.signs) ? s.signs : []).filter(z => Number.isInteger(z) && z >= 0 && z < NZ))];
  next.comics = ids(s.comics, typeof COMICS !== 'undefined' ? new Set(Object.keys(COMICS)) : null);
  next.roomsVisited = ids(s.roomsVisited, typeof INTERIORS !== 'undefined' ? new Set(Object.keys(INTERIORS)) : null);
  next.keepsakes = ids(s.keepsakes, typeof INTERIORS !== 'undefined' ? new Set(Object.entries(INTERIORS).flatMap(([key, room]) => room.spots.map(spot => `${key}:${spot.id}`))) : null);
  next.residentsSeen = ids(s.residentsSeen, typeof RESIDENTS !== 'undefined' ? new Set(Object.keys(RESIDENTS)) : null);
  next.residentVisits = {};
  if (s.residentVisits && typeof s.residentVisits === 'object' && !Array.isArray(s.residentVisits)) {
    for (const [k, v] of Object.entries(s.residentVisits).slice(0, 256)) if (/^[a-zA-Z0-9_-]+:(before|after)$/.test(k) && Number.isSafeInteger(v) && v >= 0) next.residentVisits[k] = v;
  }
  next.wrong = Number.isSafeInteger(s.wrong) && s.wrong >= 0 ? s.wrong : 0;
  next.t = Number.isFinite(s.t) && s.t >= 0 ? s.t : 0;
  next.savedAt = Number.isFinite(s.savedAt) && s.savedAt >= 0 ? s.savedAt : 0;
  const maxX = (Math.min(next.done, NZ - 1) + 1) * ZW * TILE - 24;
  const validPosition = Number.isFinite(s.px) && Number.isFinite(s.py) && s.px >= 12 && s.px <= maxX && s.py >= 4 * TILE + 8 && s.py <= 26 * TILE - 8;
  if (!validPosition || (solid && blocked(s.px, s.py, next.done))) {
    const baseX = Math.min(next.done, NZ - 1) * ZW * TILE + 6 * TILE;
    next.px = baseX; next.py = 15 * TILE - 2;
    if (solid) for (let dx = 0; dx <= 160; dx += 8) {
      if (baseX + dx <= maxX && !blocked(baseX + dx, next.py, next.done)) { next.px = baseX + dx; break; }
    }
  }
  return next;
}
function save(important) {
  G.px = player.x; G.py = player.y; G.savedAt = Date.now();
  G.version = 4;
  try { const data = JSON.stringify(G); localStorage.setItem(SAVE_KEY, data); if (localStorage.getItem(SAVE_KEY) !== data) return false; } catch (e) { return false; }
  if (important) saveFx = 1.8;
  return true;
}
function loadSave() { try { return normalizeSave(JSON.parse(localStorage.getItem(SAVE_KEY) || 'null')); } catch (e) { return null; } }
function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} }
const hasProgress = s => !!(s && (s.done > 0 || s.terms?.length || s.comics?.length || s.roomsVisited?.length));

/* 文件存档不依赖服务器账号。预览只解析；确认导入才备份并写入。 */
const SaveTransfer = (() => {
  const MAX_BYTES = 128 * 1024, BACKUP_KEY = SAVE_KEY + '-before-import';
  const fields = new Set(['done', 'terms', 'side', 'ach', 'hats', 'hat', 'signs', 'comics', 'keepsakes', 'roomsVisited', 'residentsSeen', 'residentVisits', 'wrong', 't', 'px', 'py', 'savedAt', 'version']);
  const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const record = o => o !== null && typeof o === 'object' && !Array.isArray(o);
  const fail = (code, message) => { const e = new Error(message); e.code = code; throw e; };
  const bytes = text => new TextEncoder().encode(text).byteLength;
  function read(key) {
    try { return localStorage.getItem(key); }
    catch (e) { return fail('STORAGE_READ', '浏览器不允许读取本地存档，请检查隐私或存储设置。'); }
  }
  function writeRaw(key, raw) {
    if (raw === null) localStorage.removeItem(key); else localStorage.setItem(key, raw);
    if (localStorage.getItem(key) !== raw) throw new Error('Storage verification failed');
  }
  function rollback(key, raw) {
    try { if (localStorage.getItem(key) !== raw) writeRaw(key, raw); return true; }
    catch (e) { return false; }
  }
  function validateState(s) {
    if (!record(s) || Object.keys(s).some(k => !fields.has(k))) fail('STATE_FIELDS', '存档包含无法识别的进度字段。');
    if (!Number.isInteger(s.done) || s.done < 0 || s.done > NZ || !Array.isArray(s.terms)) fail('STATE_PROGRESS', '存档的章节或术语记录不完整。');
    if (own(s, 'version') && (!Number.isInteger(s.version) || s.version < 1 || s.version > 4)) fail('STATE_VERSION', '此存档来自不支持的游戏版本，请使用对应版本打开。');
    const allowed = {
      terms: new Set([...TERMS, ...HIDDEN].map(t => t.id)), side: new Set(SIDES.map(r => r[0])),
      ach: new Set(ACH.map(a => a.id)), hats: new Set(Object.keys(HATS)), comics: new Set(Object.keys(COMICS)),
      roomsVisited: new Set(Object.keys(INTERIORS)), residentsSeen: new Set(Object.keys(RESIDENTS)),
      keepsakes: new Set(Object.entries(INTERIORS).flatMap(([key, room]) => room.spots.map(spot => `${key}:${spot.id}`))),
    };
    for (const [key, ids] of Object.entries(allowed)) {
      if (!own(s, key)) continue; // 旧存档缺少后续加入的收藏字段时，按空记录迁移。
      if (!Array.isArray(s[key]) || s[key].length > 512 || s[key].some(id => typeof id !== 'string' || !ids.has(id))) fail('STATE_IDS', '存档包含无法识别的收藏或任务记录。');
    }
    if (own(s, 'hat') && (typeof s.hat !== 'string' || (s.hat !== '' && !(s.hats || []).includes(s.hat)))) fail('STATE_HAT', '存档中的帽子记录不一致。');
    if (own(s, 'signs') && (!Array.isArray(s.signs) || s.signs.length > NZ * 2 || s.signs.some(z => !Number.isInteger(z) || z < 0 || z >= NZ))) fail('STATE_SIGNS', '存档中的路牌记录无效。');
    if (own(s, 'residentVisits')) {
      if (!record(s.residentVisits) || Object.keys(s.residentVisits).length > 256) fail('STATE_VISITS', '存档中的居民对话记录无效。');
      for (const [key, count] of Object.entries(s.residentVisits)) {
        const match = /^([a-zA-Z0-9_-]+):(before|after)$/.exec(key);
        if (!match || !own(RESIDENTS, match[1]) || !Number.isSafeInteger(count) || count < 0) fail('STATE_VISITS', '存档中的居民对话记录无效。');
      }
    }
    for (const key of ['wrong', 't', 'savedAt']) {
      if (!own(s, key)) continue;
      const v = s[key], valid = key === 'wrong' ? Number.isSafeInteger(v) : Number.isFinite(v);
      if (!valid || v < 0 || v > (key === 'savedAt' ? 8640000000000000 : Number.MAX_SAFE_INTEGER)) fail('STATE_NUMBER', '存档中的时间或计数记录无效。');
    }
    for (const [key, max] of [['px', NZ * ZW * TILE], ['py', 30 * TILE]]) {
      if (own(s, key) && (!Number.isFinite(s[key]) || s[key] < 0 || s[key] > max)) fail('STATE_POSITION', '存档中的角色位置无效。');
    }
    // 复用旧档迁移与安全落点；只返回新对象，不修改传入对象或运行中的 G。
    return normalizeSave(JSON.parse(JSON.stringify(s)));
  }
  function summary(s) {
    const state = validateState(s), zone = Math.min(state.done, NZ - 1);
    return { done: state.done, chapter: state.done === NZ ? '已通关' : REGIONS[regionOf(zone)].name,
      terms: state.terms.length, seconds: state.t, savedAt: state.savedAt };
  }
  function envelope(state, exportedAt = new Date().toISOString()) {
    return { gameId: 'code-village', formatVersion: 1, gameVersion: GAME_VERSION, exportedAt, state };
  }
  function parse(text) {
    if (typeof text !== 'string' || !text.trim()) fail('EMPTY_FILE', '文件是空的，请选择导出的 JSON 存档。');
    if (bytes(text) > MAX_BYTES) fail('FILE_TOO_LARGE', '文件超过 128 KB，请选择游戏导出的 JSON 存档。');
    let value;
    try { value = JSON.parse(text.replace(/^\uFEFF/, '')); }
    catch (e) { return fail('INVALID_JSON', '无法读取这个文件，请选择完整的 JSON 存档。'); }
    if (!record(value)) fail('INVALID_FILE', '这不是有效的游戏存档。');
    const wrapped = own(value, 'gameId') || own(value, 'formatVersion') || own(value, 'state');
    if (wrapped) {
      if (Object.keys(value).some(key => !['gameId', 'formatVersion', 'gameVersion', 'exportedAt', 'state'].includes(key))) fail('FILE_METADATA', '存档包含无法识别的文件信息。');
      if (value.gameId !== 'code-village') fail('WRONG_GAME', '这个存档不属于《代码物语》。');
      if (value.formatVersion !== 1) fail('FORMAT_VERSION', '不支持此存档格式，请使用对应版本的游戏。');
      if (typeof value.gameVersion !== 'string' || !value.gameVersion.trim() || value.gameVersion.length > 80 ||
          typeof value.exportedAt !== 'string' || !/^\d{4}-\d\d-\d\dT/.test(value.exportedAt) || !Number.isFinite(Date.parse(value.exportedAt))) fail('FILE_METADATA', '存档的版本或导出时间无效。');
    }
    const state = validateState(wrapped ? value.state : value);
    return { envelope: wrapped ? { ...value, state } : envelope(state), state, summary: summary(state), legacy: !wrapped };
  }
  function currentState(exporting = false) {
    if (scene === 'world') return validateState({ ...G, px: player.x, py: player.y, savedAt: exporting ? Date.now() : G.savedAt || 0, version: 4 });
    const raw = read(SAVE_KEY);
    if (raw === null) return null;
    return parse(raw).state;
  }
  function currentSummary() { const state = currentState(); return state ? summary(state) : null; }
  function exportCurrent() {
    const state = currentState(true);
    if (!state) fail('NO_SAVE', '还没有存档，开始冒险后再来导出。');
    const data = envelope(state), text = JSON.stringify(data, null, 2);
    if (bytes(text) > MAX_BYTES) fail('FILE_TOO_LARGE', '当前存档超出支持大小，未生成文件。');
    return { envelope: data, text, filename: `代码物语-存档-${data.exportedAt.replace(/[:.]/g, '-')}.json`, summary: summary(state) };
  }
  function importState(value) {
    const state = validateState(value), raw = JSON.stringify(state);
    if (bytes(raw) > MAX_BYTES) fail('FILE_TOO_LARGE', '存档超出支持大小，未导入。');
    const old = read(SAVE_KEY), previousBackup = read(BACKUP_KEY);
    const backupRaw = scene === 'world' ? JSON.stringify(currentState()) : old;
    const backup = JSON.stringify({ gameId: 'code-village', formatVersion: 1, createdAt: new Date().toISOString(), raw: backupRaw });
    try { writeRaw(BACKUP_KEY, backup); }
    catch (e) {
      const backupRestored = rollback(BACKUP_KEY, previousBackup);
      return fail('BACKUP_WRITE', backupRestored ? '未能备份原进度，导入已取消。原存档保持不变。' : '未能备份原进度，导入已取消。原存档未改动，但恢复备份无法确认，请先导出当前存档。');
    }
    try { writeRaw(SAVE_KEY, raw); }
    catch (e) {
      const restored = rollback(SAVE_KEY, old);
      const backupRestored = restored && rollback(BACKUP_KEY, previousBackup);
      return fail(restored ? 'IMPORT_WRITE' : 'IMPORT_ROLLBACK', restored
        ? (backupRestored ? '导入未能保存，原存档已保留。请检查浏览器存储空间。' : '导入未能保存，原存档已保留，但恢复备份未能还原。请先导出当前存档。')
        : '导入未能保存，原进度已留在恢复备份中。请勿关闭页面，先尝试恢复备份。');
    }
    return { state, summary: summary(state) };
  }
  function recovery() {
    const raw = read(BACKUP_KEY);
    if (raw === null) return null;
    let value;
    try { value = JSON.parse(raw); } catch (e) { return fail('BACKUP_INVALID', '导入前备份已损坏，当前存档未改动。'); }
    if (!record(value) || value.gameId !== 'code-village' || value.formatVersion !== 1 ||
        typeof value.createdAt !== 'string' || !Number.isFinite(Date.parse(value.createdAt)) ||
        (value.raw !== null && typeof value.raw !== 'string')) fail('BACKUP_INVALID', '导入前备份格式无效，当前存档未改动。');
    if (value.raw === null) return null;
    const parsed = parse(value.raw);
    return { state: parsed.state, summary: parsed.summary, createdAt: value.createdAt };
  }
  function restore() {
    const backup = recovery();
    if (!backup) fail('NO_BACKUP', '还没有可恢复的导入前存档。');
    const old = read(SAVE_KEY), raw = JSON.stringify(backup.state);
    try { writeRaw(SAVE_KEY, raw); }
    catch (e) {
      const restored = rollback(SAVE_KEY, old);
      return fail(restored ? 'RESTORE_WRITE' : 'RESTORE_ROLLBACK', restored ? '恢复未能保存，当前进度未改动。' : '恢复未能保存。导入前备份仍在，请检查浏览器存储设置后重试。');
    }
    // 恢复不能覆盖备份；重复点击恢复仍指向同一个导入前进度。
    return { state: backup.state, summary: backup.summary };
  }
  return { MAX_BYTES, BACKUP_KEY, parse, summary, currentSummary, exportCurrent, import: importState, recovery, restore };
})();
window.addEventListener('pagehide', () => { if (scene === 'world') save(true); });
document.addEventListener('visibilitychange', () => { if (document.hidden && scene === 'world') save(true); });

/* ---------- 玩家 & 同伴 ---------- */
const player = { x: 0, y: 0, dir: 3, frame: 0, walkT: 0, moving: false, stepT: 0, idleT: 0 };
const trail = [];
const xa = { x: 0, y: 0, f: 1, mood: 'ok' };
let cam = { x: 0, y: 0 };
// 旋转或改变视口时立即安置镜头，避免恢复首帧 dt=0 仍沿用旧视高而藏住角色。
resizeHooks.push(() => { if (scene === 'world') cam.y = worldCameraY(player.y); });
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
const npcVisible = (n, done = G.done) => !(n.kind === 'xaNpc' && done >= 1) && !(n.boss && n.boss !== 'final' && done > n.id);
const bossAlive = (n, done = G.done) => n.boss && done <= n.id;
const sideDone = sid => G.side.includes(sid);
function npcRect(n, done = G.done) { if (n.boss && !bossAlive(n, done)) return [-6, -4, 12, 4]; return n.solid || [-6, -5, 12, 5]; }

/* ---------- 碰撞 ---------- */
const wallActive = w => G.done <= w.zone;
let lastBump = 0;
function blocked(x, y, done = G.done) {
  for (const [dx, dy] of [[-5, -4], [5, -4], [-5, 0], [5, 0]]) if (solidAtPx(x + dx, y + dy)) return 'x';
  for (const w of walls) if (done <= w.zone && x + 5 > w.x && x - 5 < w.x + 16 && y > 4 * TILE && y < 26 * TILE) return 'wall';
  for (const n of npcs) { if (!npcVisible(n, done)) continue; const [rx, ry, rw, rh] = npcRect(n, done); if (x + 5 > n.x + rx && x - 5 < n.x + rx + rw && y > n.y + ry && y - 4 < n.y + ry + rh) return 'x'; }
  return null;
}
function tryMove(dx, dy) {
  const nx = player.x + dx, ny = player.y + dy, b = blocked(nx, ny);
  if (b) { if (b === 'wall' && performance.now() - lastBump > 3000) { lastBump = performance.now(); Audio.sfx('glitch'); shake(2); toast('乱码墙挡住了路，先帮帮这一片的村民吧'); } return false; }
  player.x = nx; player.y = ny; return true;
}

/* ---------- 互动 ---------- */
function interactionHit(t, p) {
  if (!p) return true;
  if (t.type === 'ambient') return ambientHit(t.a, p);
  const o = t.type === 'npc' ? t.n : t.o, x = o.x - cam.x, y = o.y - cam.y;
  const height = t.type === 'npc' ? (o.boss ? 72 : o.who === 'door' ? 88 : 48) : o.interact.type === 'interior' ? 38 : Math.max(24, o.img?.height || 24);
  return Math.abs(p.x - x) <= (o.boss || o.who === 'door' ? 38 : 22) && p.y >= y - height && p.y <= y + 8;
}
function interactTarget(point = null) {
  const candidates = [];
  for (const n of npcs) {
    if (!npcVisible(n) || (typeof n.id === 'number' && n.id > G.done)) continue;
    const d = Math.hypot(n.x - player.x, n.y - player.y), t = { type: 'npc', n };
    if (d < n.range && interactionHit(t, point)) candidates.push({ t, rank: n.id === G.done || n.who === 'door' ? 0 : 1, d });
  }
  for (const o of objects) {
    if (!o.interact || (o.interact.type === 'interior' && o.interact.z > G.done)) continue;
    const d = Math.hypot(o.x - player.x, o.y - player.y), t = { type: 'sign', o };
    if (d < 24 && interactionHit(t, point)) candidates.push({ t, rank: o.interact.type === 'interior' ? 0 : 1, d });
  }
  if (typeof ambientTarget === 'function') { const t = ambientTarget(point); if (t) candidates.push({ t, rank: 2, d: t.distance }); }
  candidates.sort((a, b) => a.rank - b.rank || a.d - b.d);
  return candidates[0]?.t || null;
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
  if (typeof updateAmbient === 'function') updateAmbient(dt);
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
  for (const n of npcs) {
    n.blinkT -= dt; if (n.blinkT < -.12) n.blinkT = rand(2, 5);
    if (!CHAR[n.who]) continue;
    const dx = player.x - n.x, dy = player.y - n.y;
    if (scene === 'world' && Math.hypot(dx, dy) < 65) n.dir = Math.abs(dx) > Math.abs(dy) * 1.3 ? (dx > 0 ? 3 : 2) : (dy > 0 ? 0 : 1);
    else { const glance = Math.floor(worldT / 5 + n.x * .017) % 8; n.dir = glance === 2 ? 2 : glance === 6 ? 3 : 0; }
  }
  // 镜头
  if (scene !== 'title') {
    const look = player.dir === 3 ? 18 : player.dir === 2 ? -18 : 0;
    const tx = clamp(player.x + look - VW / 2, 0, MAPW - VW), ty = worldCameraY(player.y);
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
function drawWorldDecor(g, d, ix, iy) {
  const hop = typeof ambientOffset === 'function' ? ambientOffset(d) : 0;
  drawDecor(g, d, ix, iy - hop, worldT);
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
  const ON_TOP = new Set(['lanterns', 'festivalRibbon', 'flag', 'flagpole', 'fogpuff', 'foxfire']);
  for (const d of decor) { const dx = (d.x || d.x1) - ix; if (dx < -400 || dx > VW + 400) continue; if (!ON_TOP.has(d.kind)) drawWorldDecor(g, d, ix, iy); }
  const list = [];
  for (const o of objects) { const sx = o.x - ix; if (sx < -80 || sx > VW + 80 || o.y - iy < -10 || o.y + o.oy - iy > VH + 10) continue; list.push({ y: o.y, o }); }
  for (const d of decor) if ((d.kind === 'flag' || d.kind === 'flagpole') && Math.abs(d.x - ix - VW / 2) < VW) list.push({ y: d.y, d });
  for (const n of npcs) if (npcVisible(n) && Math.abs(n.x - ix - VW / 2) < VW) list.push({ y: n.y, n });
  if (scene === 'world' || scene === 'intro') list.push({ y: player.y + .1, p: true });
  if (G.done >= 1 && scene === 'world') list.push({ y: xa.y, xa: true });
  list.sort((a, b) => a.y - b.y);
  for (const e of list) {
    if (e.o) {
      const o = e.o, sx = Math.round(o.x - ix), sy = Math.round(o.y - iy + (typeof ambientOffset === 'function' ? ambientOffset(o) : 0));
      if (o.shadow) shadowAt(g, sx, sy - 1, o.shadow[0], o.shadow[1]);
      if (o.draw) { o.draw(g, sx, sy); continue; }
      if (o.sway) { const s = Math.round(Math.sin(worldT * 1.3 + o.x * .07) * .8); const cut = o.img.height - 16; g.drawImage(o.img, 0, 0, o.img.width, cut, sx + o.ox + s, sy + o.oy, o.img.width, cut); g.drawImage(o.img, 0, cut, o.img.width, 16, sx + o.ox, sy + o.oy + cut, o.img.width, 16); }
      else g.drawImage(o.img, sx + o.ox, sy + o.oy);
      if (o.glow) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = .25 + Math.sin(worldT * 3 + o.x) * .1; g.drawImage(glowSprite('#b05aff'), sx - 14, sy - 30, 28, 28); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
    } else if (e.d) drawWorldDecor(g, e.d, ix, iy);
    else if (e.n) drawNpc(g, e.n, ix, iy);
    else if (e.p) { const im = charFrame('player', player.dir, player.frame); shadowAt(g, Math.round(player.x - ix), Math.round(player.y - iy) - 1, 8, 2.5); g.drawImage(im, Math.round(player.x - ix) - Math.round(im.width / 2), Math.round(player.y - iy) - im.height + 1); }
    else if (e.xa) {
      const hov = Math.round(Math.sin(worldT * 3) * 1.5), im = xaFrame(Math.floor(worldT * 4) % 2, isTalking('xa'), xa.mood);
      shadowAt(g, Math.round(xa.x - ix), Math.round(xa.y - iy) - 1, 5, 2);
      const xx = Math.round(xa.x - ix) - 9, xy = Math.round(xa.y - iy) - 26 + hov, fb = Math.floor(worldT * 4) % 2;
      g.drawImage(xa.f < 0 ? cached('xaL' + im.width + xa.mood + fb + isTalking('xa'), () => flipH(im)) : im, xx, xy);
      if (G.hat) g.drawImage(xa.f < 0 ? hatImgL(G.hat) : hatImg(G.hat), xx + 2, xy - 4 + fb);
    }
  }
  for (const d of decor) if (((d.kind === 'lanterns' || d.kind === 'festivalRibbon') && Math.abs(d.x1 - ix) < VW + 200) || ((d.kind === 'fogpuff' || d.kind === 'foxfire') && Math.abs(d.x - ix - VW / 2) < VW)) drawWorldDecor(g, d, ix, iy);
  drawParts(g, ix, iy, 'world');
  const amb = ambientAt(ix + VW / 2), dark = 1 - lum(amb);
  if (dark < .3) { g.globalAlpha = 1 - dark * 3; for (const c of clouds) { const sx = c.x - ix, sy = c.y - iy; if (sx < -260 || sx > VW + 20) continue; g.drawImage(CLOUD, Math.round(sx), Math.round(sy), 160 * c.s, 70 * c.s); } g.globalAlpha = 1; }
  // 光照
  lightCx.globalCompositeOperation = 'source-over'; lightCx.fillStyle = amb; lightCx.fillRect(0, 0, VW, VH);
  lightCx.globalCompositeOperation = 'lighter';
  const nightK = clamp((dark - .05) * 2.4, 0, 1), glows = [];
  for (const L of lights) {
    if (L.unlockZone !== undefined && G.done <= L.unlockZone) continue;
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
  if (typeof drawAmbientFeedback === 'function') drawAmbientFeedback(g, ix, iy);
}
function drawNpc(g, n, ix, iy) {
  const sx = Math.round(n.x - ix), sy = Math.round(n.y - iy);
  if (n.boss) {
    if (!bossAlive(n)) { if (n.boss === 'final') { const im = BUGIMG(); shadowAt(g, sx, sy - 2, 7, 2); g.drawImage(im, sx - 9, sy - 18 - (Math.floor(worldT * 3) % 2)); } return; }
    shadowAt(g, sx, sy - 2, 30, 6);
    const im = bossFrame(Math.floor(worldT * 4) % 4, false, n.boss), by = Math.round(Math.sin(worldT * 2) * 2);
    for (let i = 0; i < 29; i++) { const off = Math.round(Math.sin(worldT * 4 + i * .4) * (i % 7 === 0 ? 2 : .6)); g.drawImage(im, 0, i * 2, 66, 2, sx - 33 + off, sy - 60 + by + i * 2, 66, 2); }
    if (G.done === n.id && scene === 'world' && !screens.length && !scriptRunning && promptTarget !== n) bubble(g, sx, sy - 62, '!');
    return;
  }
  if (n.who === 'door') { drawDoor(g, sx, sy); if (G.done === n.id && scene === 'world' && !screens.length && !scriptRunning && promptTarget !== n) bubble(g, sx, sy - 84, '!'); return; }
  const im = npcSprite(n);
  shadowAt(g, sx, sy - 1, CHAR[n.who] ? 8 : 6, 2.5);
  const h = im.height;
  const breath = CHAR[n.who] && Math.sin(worldT * 1.7 + n.x * .09) > .85 ? 1 : 0;
  g.drawImage(im, sx - Math.round(im.width / 2), sy - h + 1 + breath);
  if (scene === 'world' && !screens.length && !scriptRunning && promptTarget !== n) {
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
  if (hash2(Math.floor(t * 12), 1, sx | 0) > .8) { const yy = sy + hash2(Math.floor(t * 12), 2, 3) * h, hh = 3 + hash2(Math.floor(t * 12), 3, 4) * 8; g.drawImage(g.canvas, Math.max(0, sx - 30), yy, 76, hh, Math.max(0, sx - 30) + (hash2(Math.floor(t * 12), 5, 6) * 10 - 5), yy, 76, hh); }
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
  let x, y, feet;
  if (t.type === 'npc') { x = t.n.x - ix; y = t.n.y - iy - (t.n.boss ? 64 : t.n.who === 'door' ? 86 : CHAR[t.n.who] ? (CHAR[t.n.who].short ? 42 : 46) : 36); }
  else if (t.type === 'ambient') { const p = ambientPosition(t.a); x = p.x - ix; feet = p.y - iy; y = feet - t.a.height; if (ambientFeedback?.a === t.a && ambientFeedback.life > 0) return; }
  else { x = t.o.x - ix; y = t.o.y - iy - 26; }
  const key = Input.device === 'touch' || TOUCH ? 'A' : '空格', label = t.type === 'ambient' ? t.a.label : t.type === 'sign' ? (t.o.interact.type === 'interior' ? '进屋' : '看看') : t.n.boss && bossAlive(t.n) ? '挑战' : t.n.who === 'door' ? '打开' : '说话';
  const w = textW(key) + textW(label) + 18, bx = Math.round(clamp(x - w / 2, 3, VW - w - 3)), by = Math.round(Math.max(27, y - 18 + Math.sin(worldT * 4)));
  // 选中目标的脚底四角提示，避免近处有多个村民时不知道在和谁说话。
  const tx = Math.round(x), ty = Math.round(feet ?? ((t.type === 'npc' ? t.n.y : t.o.y) - iy));
  g.fillStyle = '#f3d294';
  [[-10, -3, 1], [7, -3, -1], [-10, 2, -1], [7, 2, 1]].forEach(([dx, dy, up]) => { g.fillRect(tx + dx, ty + dy, 4, 1); g.fillRect(tx + dx + (dx < 0 ? 0 : 3), ty + dy - up * 2, 1, 3); });
  win(g, bx, by, w, 17, 'dlg');
  g.fillStyle = UIC.gold; g.fillRect(bx + 4, by + 3, textW(key) + 6, 11); txt(g, key, bx + 7, by + 3, '#2a1e10', { shadow: null });
  txt(g, label, bx + textW(key) + 14, by + 3, UIC.text);
}
