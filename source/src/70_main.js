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
function interact(t = interactTarget()) {
  if (!t) return;
  if (t.type === 'ambient') { runAmbientInteraction(t.a); return; }
  if (t.type === 'sign' && t.o.interact.type === 'interior') { openInterior(t.o.interact.key); return; }
  if (t.type === 'sign') {
    Audio.sfx('open');
    const z = t.o.interact.z; if (!G.signs.includes(z)) { G.signs.push(z); if (G.signs.length >= NZ) unlock('signs'); }
    runScript(() => talk([['sign', t.o.interact.text]])); return;
  }
  const n = t.n; faceTo(n);
  if (n.kind === 'side') { runScript(sideDone(n.sid) ? () => talk(SIDE_AFTER[n.sid]) : async () => { await SIDE_CH[n.sid](); if (!sideDone(n.sid)) G.side.push(n.sid); }); return; }
  if (n.who === 'door' && G.done >= NZ) { runScript(endingSequence); return; }
  if (n.id === G.done) runScript(() => runChapter(n.id));
  else if (n.id < G.done && AFTER[n.id]) runScript(() => talk(AFTER[n.id]));
}
async function runChapter(z) {
  const key = COMIC_AT[z];
  if (key && !(G.comics || []).includes(key)) await playComic(key);
  await CH[z]();
}
function worldInput() {
  if (Input.hit('ok')) { interact(); return; }
  if (Input.hit('journal')) { Audio.sfx('open'); openJournal(); return; }
  if (Input.hit('note')) { Audio.sfx('open'); openNotebook(); return; }
  if (Input.hit('back')) { openPause(); return; }
  if (Input.hit('mute')) { const on = !Audio.music; Audio.setMusic(on); Audio.setSfx(on); toast(on ? '声音：开' : '声音：关'); }
  const c = Input.pointer.click;
  if (c) {
    if (hudBtns.note.hit(c)) { Audio.sfx('open'); openNotebook(); return; }
    if (hudBtns.app.hit(c)) { Audio.sfx('open'); openApp(false); return; }
    if (hudBtns.menu.hit(c)) { openPause(); return; }
    const t = interactTarget(c);
    if (t) interact(t);
  }
}
async function openPause() {
  Audio.sfx('open');
  const r = await openScreen(new PauseScreen());
  if (r === 'title') {
    await runScript(async () => {
      await fadeTo(1, .4);
      // 标题会同步接管屏幕；不等待菜单选择，让下一次继续或新冒险正常启动。
      goTitle();
    });
  }
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
    const s = loadSave(), f = freshState();
    if(!s){toast('存档已变化，请重新选择');goTitle();return;}
    G = { ...f, ...s };
    if (!s.px) { const n = npcs.find(n => n.id === Math.min(G.done, NZ - 1)); s.px = n.x - 40; s.py = n.y + 16; }
    for (const k of ['terms', 'side', 'ach', 'hats', 'signs', 'comics', 'keepsakes', 'roomsVisited', 'residentsSeen']) if (!Array.isArray(G[k])) G[k] = [];
    if (!G.residentVisits || typeof G.residentVisits !== 'object' || Array.isArray(G.residentVisits)) G.residentVisits = {};
    await fadeTo(1, .5);
    enterWorld(s.px || 6 * TILE, s.py || 15 * TILE - 2);
    if (G.done === 0) {
      // 序章漫画会先存档；中途离开后仍需完成委托，才能交回移动控制。
      await runScript(async () => {
        await fadeTo(0, .6);
        if (!G.comics.includes('arrival')) await playComic('arrival');
        await runChapter(0);
      });
    } else await fadeTo(0, .6);
  }
}
function enterWorld(x, y) {
  scene = 'world'; player.x = x; player.y = y; player.dir = 3;
  trail.length = 0; xa.x = x - 18; xa.y = y;
  doorOpen = G.done >= NZ; curRegion = -1;
  cam.x = clamp(x - VW / 2, 0, MAPW - VW); cam.y = worldCameraY(y);
  curZone = -1;
}
async function introSequence() {
  scene = 'intro'; room.mode = 'night'; room.flicker = 0; room.warp = 0; room.t = 0; room.noPlayer = false; room.duckOnDesk = false;
  Audio.play('story');
  await fadeTo(0, 1);
  await playComic('arrival');

  scriptRunning = true;
  Audio.sfx('warp');
  await fadeTo(1,reducedMotion()?.05:.3,'#102936');
  enterWorld(6 * TILE, 15 * TILE - 2);
  await fadeTo(0,reducedMotion()?.05:.4,'#102936');
  scriptRunning = false;
  runScript(() => runChapter(0));
}
async function endingSequence() {
  Audio.play(''); await fadeTo(1, 1.2, '#ffffff');
  scene = 'ending'; room.mode = 'dawn'; room.flicker = 0; room.warp = 0; room.t = 0; room.noPlayer = false; room.duckOnDesk = false;
  Audio.play('dawn');
  await fadeTo(0, 1.2, '#ffffff');
  await playComic('farewell');
  await talk([
    ['me', '明天把这个点单页，拿给街角的店主试试。'],
    ['xa', '好，我陪你一起改。', '', { emotion: 'joy' }],
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
  if (document.hidden) { lastT = now; Input.reset(); Input.resumeFrame = true; requestAnimationFrame(frame); return; }
  const dt = Input.resumeFrame ? 0 : clamp((now - lastT) / 1000, 0, .05); lastT = now; Input.resumeFrame = false;
  let top = topScreen();
  if (top) top.update(dt);
  else if (scene === 'world' && !scriptRunning) worldInput();
  top = topScreen();
  // 屏幕切换后释放旧操作，避免隐藏的触屏键继续走路或读档后带入上一次按键。
  if (frame.previousTop !== top || frame.previousScene !== scene) { Input.reset(); frame.previousTop = top; frame.previousScene = scene; }
  if (scene === 'world' || scene === 'title') {
    if (scene === 'title') { worldT += 0; cam.x = (Math.sin(now / 90000) * .5 + .5) * (MAPW - VW); cam.y = VH >= MAPH ? (MAPH - VH) / 2 : (MAPH - VH) / 2; }
    updateWorld(dt, scene === 'world' && !top && !scriptRunning);
    if (scene === 'title') { cam.x = (Math.sin(now / 90000) * .5 + .5) * (MAPW - VW); cam.y = VH >= MAPH ? (MAPH - VH) / 2 : (MAPH - VH) / 2; }
    if (scene === 'world' && !top && !scriptRunning) autoSave(dt);
  } else updateParts(dt);
  const readingOrPlaying = (scene === 'world' || scene === 'intro' || scene === 'ending') && !(top instanceof PauseScreen || top instanceof JournalScreen || top instanceof GuideScreen || top instanceof SoundScreen || top instanceof SaveScreen || top instanceof GlossaryScreen || top instanceof EndScreen);
  if (readingOrPlaying && !document.hidden) G.t += dt;
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
  presentFrame();
  if (touchBox) touchBox.hidden = !(TOUCH && scene === 'world' && !top && !scriptRunning);
  Input.endFrame();
  requestAnimationFrame(frame);
}

/* ---------- 启动 ---------- */
async function boot() {
  resize(); window.addEventListener('resize', resize);
  touchBox = setupTouch();
  const bootDone=openScreen(new BootScreen(()=>worldReady&&ART_STATUS.ready));
  requestAnimationFrame(frame);
  try { const ff = new FontFace('FusionPixel', `url(data:font/woff2;base64,${FONT_DATA})`); await ff.load(); document.fonts.add(ff); } catch (e) { console.warn('font', e); }
  clearTextCache();
  await loadStoryArt();
  buildProps(); buildIcons(); buildProps3(); buildIcons3(); aliasIcons(); initClouds();
  setTimeout(() => {
    buildWorld(); setupNPCs(); setupInteriors(); setupAmbientInteractions();
    lights.push({ x: (26 * ZW + 12.5) * TILE, y: 12 * TILE - 40, r: 110, c: '#ffe0a0', always: true });
    lights.push({ x: (25 * ZW + 12.5) * TILE, y: 12 * TILE - 30, r: 110, c: '#ff3aa8', always: true, flicker: .1 });
    worldReady = true;
  }, 60);
  await bootDone;
  goTitle();
}
if (new URLSearchParams(location.search).has('qa')) window.__game = { get G() { return G; }, get scene() { return scene; }, get screens() { return screens; }, get presentation() { return presentationMetrics(); }, player, npcs, CH, walls, get scriptRunning() { return scriptRunning; }, Audio, enterWorld, setG(v) { G = v; }, TERMS, HIDDEN, ACH, ARCH, NZ, ZW, TILE, interact, interactTarget, Input, ambientActors, get ambientFeedback() { return ambientFeedback; }, ambientPosition, get cam() { return { x: cam.x, y: cam.y }; }, get playableHeight() { return worldViewHeight(); }, get curZone() { return curZone; }, runChapter, openJournal, playComic, COMICS, PEOPLE, ART, ART_STATUS, PORTRAIT_GROUPS, illustratedPortrait, reactionPlacement, loadSave, normalizeSave, save, freshState, SaveTransfer, openScreen, goTitle, blocked, map: { MAPW, MAPH, SG, REGIONS }, finishScreen: closeScreen, classes: { ComicScreen, JournalScreen, GuideScreen, TitleScreen, AppScreen, PauseScreen, SaveScreen, InteriorScreen, DialogScreen }, openInterior, INTERIORS, RESIDENTS, journalPeople, objects };
boot();
