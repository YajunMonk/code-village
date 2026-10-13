/* ============================================================
 * 70 主流程：开机、标题、开场、世界、结局、主循环
 * ============================================================ */
let scene = 'boot', scriptRunning = false, worldReady = false;
let touchBox = null;

async function runScript(fn) {
  if (scriptRunning) return; scriptRunning = true;
  try { await fn(); } finally { scriptRunning = false; if (scene === 'world') save(); }
}
let autoSaveT = 0;
function autoSave(dt) {
  autoSaveT += dt; if (autoSaveT > 15) { autoSaveT = 0; save(); }
}
function faceTo(n) {
  if (n.kind !== 'main' && n.kind !== 'side') return;
  const dx = player.x - n.x, dy = player.y - n.y;
  n.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 3 : 2) : (dy > 0 ? 0 : 1);
}
function interact() {
  const t = interactTarget(); if (!t) return;
  if (t.type === 'sign') {
    Audio.sfx('open');
    const z = t.o.interact.z; if (!G.signs.includes(z)) { G.signs.push(z); if (G.signs.length >= NZ) unlock('signs'); }
    runScript(() => talk([['sign', t.o.interact.text]])); return;
  }
  const n = t.n; faceTo(n);
  if (n.kind === 'side') { runScript(sideDone(n.sid) ? () => talk(SIDE_AFTER[n.sid]) : async () => { await SIDE_CH[n.sid](); if (!sideDone(n.sid)) G.side.push(n.sid); }); return; }
  if (n.who === 'door' && G.done >= NZ) { runScript(endingSequence); return; }
  if (n.id === G.done) runScript(CH[n.id]);
  else if (n.id < G.done && AFTER[n.id]) runScript(() => talk(AFTER[n.id]));
}
function worldInput() {
  if (Input.hit('ok')) { interact(); return; }
  if (Input.hit('note')) { Audio.sfx('open'); openNotebook(); return; }
  if (Input.hit('back')) { openPause(); return; }
  if (Input.hit('mute')) { const on = !Audio.music; Audio.setMusic(on); Audio.setSfx(on); toast(on ? '声音：开' : '声音：关'); }
  const c = Input.pointer.click;
  if (c) {
    if (hudBtns.note.hit(c)) { Audio.sfx('open'); openNotebook(); return; }
    if (hudBtns.app.hit(c)) { Audio.sfx('open'); openApp(false); return; }
    if (hudBtns.menu.hit(c)) { openPause(); return; }
    const t = interactTarget();
    if (t) { const tx = (t.type === 'npc' ? t.n.x : t.o.x) - cam.x, ty = (t.type === 'npc' ? t.n.y : t.o.y) - cam.y; if (Math.abs(c.x - tx) < 26 && c.y < ty + 6 && c.y > ty - 90) interact(); }
  }
}
async function openPause() {
  Audio.sfx('open');
  const r = await openScreen(new PauseScreen());
  if (r === 'title') { await fadeTo(1, .4); goTitle(); }
}

/* ---------- 流程 ---------- */
async function goTitle() {
  screens.length = 0; scene = 'title'; curZone = -1; curRegion = -1; doorOpen = false;
  cam.y = Math.max(0, (MAPH - VH) / 2);
  Audio.play('title');
  fadeTo(0, .8);
  const r = await openScreen(new TitleScreen());
  if (r === 'new') {
    clearSave(); G = freshState();
    await fadeTo(1, .6);
    await introSequence();
  } else if (r === 'continue') {
    const s = loadSave(), f = freshState(); G = { ...f, ...s };
    if (!s.px) { const n = npcs.find(n => n.id === Math.min(G.done, NZ - 1)); s.px = n.x - 40; s.py = n.y + 16; }
    for (const k of ['terms', 'side', 'ach', 'hats', 'signs']) if (!Array.isArray(G[k])) G[k] = [];
    await fadeTo(1, .5);
    enterWorld(s.px || 6 * TILE, s.py || 15 * TILE - 2);
    await fadeTo(0, .6);
  }
}
function enterWorld(x, y) {
  scene = 'world'; player.x = x; player.y = y; player.dir = 3;
  trail.length = 0; xa.x = x - 18; xa.y = y;
  doorOpen = G.done >= NZ; curRegion = -1;
  cam.x = clamp(x - VW / 2, 0, MAPW - VW); cam.y = VH >= MAPH ? (MAPH - VH) / 2 : clamp(y - 12 - VH / 2, 0, MAPH - VH);
  curZone = -1;
}
async function introSequence() {
  scene = 'intro'; room.mode = 'night'; room.flicker = 0; room.warp = 0; room.t = 0; room.noPlayer = false; room.duckOnDesk = false;
  Audio.play('story');
  await fadeTo(0, 1);
  await talk([
    '凌晨 2 点，你让 AI 帮你做一个奶茶点单 App。',
    'AI：「好的！前端用 React，后端用 Node.js，再接个 LLM 做 RAG……」',
    ['me', '……啥？'],
  ]);
  room.flicker = 1; Audio.play(''); Audio.sfx('glitch'); shake(3);
  Audio.sfx('warp');
  await new Promise(res => { const t0 = performance.now(); const step = () => { room.warp = Math.min(1, (performance.now() - t0) / 2200); shake(room.warp * 4); if (room.warp < 1) requestAnimationFrame(step); else res(); }; step(); });
  fx.fade = 1; fx.fadeC = '#ffffff'; room.warp = 0; room.flicker = 0;
  enterWorld(6 * TILE, 15 * TILE - 2);
  scriptRunning = true;
  await wait(400);
  await fadeTo(0, 1.4, '#ffffff');
  await talk(['……一股吸力把你拽进了屏幕里。']);
  scriptRunning = false;
  runScript(CH[0]);
}
async function endingSequence() {
  Audio.play(''); await fadeTo(1, 1.2, '#ffffff');
  scene = 'ending'; room.mode = 'dawn'; room.flicker = 0; room.warp = 0; room.t = 0; room.noPlayer = false; room.duckOnDesk = false;
  Audio.play('dawn');
  await fadeTo(0, 1.2, '#ffffff');
  await talk([
    '一道白光。',
    '你回到了自己的房间。凌晨 2 点 05 分。',
    '屏幕上，还是 AI 那一大段回复。',
    '「前端用 React，后端用 Node.js，数据库用 Postgres，接个 LLM 做 RAG 客服……」',
    '这一次，每个词你都看懂了。',
    '你想了想，打下一段新的话：',
    '「你是一位资深开发者。帮我做一个手机上用的奶茶点单网页。第一版只要：看菜单、下单、付款。主色用黄色。不确定的地方先问我，别瞎编。」',
    'AI：「收到！需求很清楚。我先做个原型给你看看？」',
    '你笑了。屏幕角落，小 A 好像冲你眨了眨眼。',
  ]);
  unlock('home');
  const r = await openScreen(new EndScreen());
  if (r === 'restart') { clearSave(); G = freshState(); await fadeTo(1, .6); goTitle(); return; }
  await fadeTo(1, .6);
  const d = npcs.find(n => n.who === 'door');
  enterWorld(d.x, d.y + 30); Audio.play('dawn');
  await fadeTo(0, .6);
}

/* ---------- 主循环 ---------- */
let lastT = performance.now();
function frame(now) {
  const dt = Math.min(.05, (now - lastT) / 1000); lastT = now;
  const top = topScreen();
  if (top) top.update(dt);
  else if (scene === 'world' && !scriptRunning) worldInput();
  if (scene === 'world' || scene === 'title') {
    if (scene === 'title') { worldT += 0; cam.x = (Math.sin(now / 90000) * .5 + .5) * (MAPW - VW); cam.y = VH >= MAPH ? (MAPH - VH) / 2 : (MAPH - VH) / 2; }
    updateWorld(dt, scene === 'world' && !top && !scriptRunning);
    if (scene === 'title') { cam.x = (Math.sin(now / 90000) * .5 + .5) * (MAPW - VW); cam.y = VH >= MAPH ? (MAPH - VH) / 2 : (MAPH - VH) / 2; }
    if (scene === 'world' && !top) { G.t += dt; if (!scriptRunning) autoSave(dt); }
  } else updateParts(dt);
  fx.shake = Math.max(0, fx.shake - dt * 18); fx.flash = Math.max(0, fx.flash - dt * 2.5);
  // —— 绘制 ——
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  if (scene === 'world' || scene === 'title') drawWorld(ctx, dt);
  else if (scene === 'intro' || scene === 'ending') drawRoom(ctx, dt);
  else { ctx.fillStyle = '#0b0912'; ctx.fillRect(0, 0, VW, VH); }
  if (scene === 'world' && worldReady) { drawHUD(ctx, dt); if (!top && !scriptRunning) drawPrompt(ctx); else promptTarget = null; }
  for (const s of screens) s.draw(ctx);
  drawParts(ctx, 0, 0, 'ui');
  drawToasts(ctx, dt);
  if (fx.flash > 0) { ctx.globalAlpha = Math.min(1, fx.flash); ctx.fillStyle = fx.flashC; ctx.fillRect(0, 0, VW, VH); ctx.globalAlpha = 1; }
  if (fx.fade > 0) { ctx.globalAlpha = fx.fade; ctx.fillStyle = fx.fadeC; ctx.fillRect(0, 0, VW, VH); ctx.globalAlpha = 1; }
  if (touchBox) touchBox.hidden = !(TOUCH && scene === 'world' && !top && !scriptRunning);
  Input.endFrame();
  requestAnimationFrame(frame);
}

/* ---------- 启动 ---------- */
async function boot() {
  resize(); window.addEventListener('resize', resize);
  touchBox = setupTouch();
  try { const ff = new FontFace('FusionPixel', `url(data:font/woff2;base64,${FONT_DATA})`); await ff.load(); document.fonts.add(ff); } catch (e) { console.warn('font', e); }
  CW.clear();
  buildProps(); buildIcons(); buildProps3(); buildIcons3(); aliasIcons(); initClouds();
  requestAnimationFrame(frame);
  setTimeout(() => {
    buildWorld(); setupNPCs();
    lights.push({ x: (26 * ZW + 12.5) * TILE, y: 12 * TILE - 40, r: 110, c: '#ffe0a0', always: true });
    lights.push({ x: (25 * ZW + 12.5) * TILE, y: 12 * TILE - 30, r: 110, c: '#ff3aa8', always: true, flicker: .1 });
    worldReady = true;
  }, 60);
  await openScreen(new BootScreen(() => worldReady));
  goTitle();
}
window.__game = { get G() { return G; }, get scene() { return scene; }, get screens() { return screens; }, player, npcs, CH, walls, get scriptRunning() { return scriptRunning; }, Audio, enterWorld, setG(v) { G = v; }, TERMS, HIDDEN, ACH, ARCH, NZ, ZW, TILE, interact, get curZone() { return curZone; } };
boot();
