#!/usr/bin/env node
// Runtime checks against the real Canvas UI classes. No DOM, save files, assets or bundles are changed.
// Font metrics use Fusion Pixel's 12px CJK / 6px Latin grid (including ¥ · ×); browser visual QA is still needed.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = name => fs.readFileSync(path.join(root, 'source/src', name), 'utf8');
const noop = () => {};
const failures = [], seen = new Set();
let assertions = 0, draws = 0, contextLabel = '';
const trace = { text: [], inButton: 0, muted: 0, closed: [], opened: [], travel: [], toasts: [], saveCalls: 0 };
const metrics = s => [...String(s)].reduce((n, c) => n + (c.codePointAt(0) > 127 && !'¥·×'.includes(c) ? 12 : 6), 0);
const gfx = new Proxy({
  measureText: s => ({ width: metrics(s) }),
  getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(Math.ceil(w * h * 4)) }),
  createLinearGradient: () => ({ addColorStop: noop }),
}, { get: (o, k) => k in o ? o[k] : noop });
const ctx = vm.createContext({
  console, setTimeout: fn => { fn(); return 0; }, clearTimeout: noop,
  VW: 480, VH: 270, PORTRAIT: false, TOUCH: false, G: {}, trace,
  makeCanvas: (w, h) => [{ width: w, height: h }, gfx],
  clamp: (v, a, b) => Math.max(a, Math.min(b, v)), shuffle: a => a.reverse(), rand: () => .5, pick: a => a[0],
  hash2: () => .5, easeOut: n => n, easeOutBack: n => n, mix: a => a, rgba: c => c, shade: c => c,
  wait: async () => {}, Audio: { music: true, effects: true, sfx: noop, play: noop, unlock: noop, setMusic: noop, setSfx: noop },
  Input: { device: 'keyboard', pointer: {}, hit: () => false },
  matchMedia: () => ({ matches: true }), ASSET_DATA: {},
  parts: [], burst: noop, glowSprite: () => ({}), xaFrame: () => ({}), ICON: {}, PROP: {},
  HATS: { straw: { n: '草帽' }, astro: { n: '宇航帽' } },
  __save: null, __saveOK: true, loadSave: () => ctx.__save,
  hasProgress: s => !!(s && (s.done > 0 || s.terms?.length)),
  save: () => { trace.saveCalls++; return ctx.__saveOK; },
  scene: 'world', scriptRunning: false, npcs: Array.from({ length: 27 }, (_, id) => ({ id })),
  blocked: () => false, enterWorld: (x, y) => trace.travel.push({ x, y }),
});
vm.runInContext(source('30_world.js').split('const ground =')[0], ctx);
for (const name of ['37_reactions.js', '40_ui.js', '50_screens.js', '55_journal.js', '56_interiors.js', '57_residents.js', '60_story.js']) vm.runInContext(source(name), ctx, { filename: name });
vm.runInContext(`
drawPortrait = () => {};
closeScreen = (s, value) => trace.closed.push({ s, value });
openScreen = async s => { trace.opened.push(s); return true; };
toast = s => trace.toasts.push(s);
const originalTxt = txt, originalLines = drawLines, originalButton = Btn.prototype.draw, originalPhone = drawPhone;
txt = function(g, s, x, y, c, opts = {}) {
  if (!trace.inButton && !trace.muted) {
    const width = textW(s), align = opts.align || 'left';
    trace.text.push({ text: s, x: align === 'center' ? Math.round(x - width / 2) : align === 'right' ? x - width : x, y, w: width, h: 12, kind: 'txt' });
  }
  return originalTxt(g, s, x, y, c, opts);
};
drawLines = function(g, lines, x, y, opts = {}) {
  if (!trace.inButton && !trace.muted) {
    const lh = opts.lh || LH;
    trace.text.push({ text: lines.map(l => l.map(t => t.ch).join('')).join(''), x, y, w: Math.max(0, ...lines.map(l => l.reduce((n, t) => n + cw(t.ch), 0))), h: (lines.length - 1) * lh + 12, kind: 'lines' });
  }
  return originalLines(g, lines, x, y, opts);
};
Btn.prototype.draw = function(...args) { trace.inButton++; try { return originalButton.apply(this, args); } finally { trace.inButton--; } };
drawPhone = (...args) => { trace.muted++; try { return originalPhone(...args); } finally { trace.muted--; } };
globalThis.api = { TitleScreen, GuideScreen, AppScreen, PauseScreen, SaveScreen, JournalScreen, ComicScreen, DialogScreen, COMICS, PEOPLE, journalPeople, personMet, RESIDENTS, INTERIORS, WHO, APP_STEPS, REGIONS, ZONE_NAME, TERMS, Btn, NZ, TILE, ZW, appStage, countChars };
`, ctx);
const a = ctx.api;
const state = done => ({ done, terms: a.TERMS.filter(t => t.r <= Math.min(4, Math.floor(done / 5))).map(t => t.id), ach: [], hats: ['straw', 'astro'], hat: 'straw', t: 2450, comics: Object.entries(a.COMICS).filter(([, c]) => done >= c.unlock).map(([key]) => key), residentsSeen: [], residentVisits: {}, roomsVisited: [], keepsakes: [] });
const check = (condition, message, detail = '') => {
  assertions++;
  if (condition) return;
  const messageText = `${contextLabel}: ${message}${detail ? ' — ' + detail : ''}`;
  if (!seen.has(messageText)) { seen.add(messageText); failures.push(messageText); }
};
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const inBounds = r => r.x >= -1 && r.y >= -1 && r.x + r.w <= ctx.VW + 1 && r.y + r.h <= ctx.VH + 1;
function render(s, label, { text = true, overlapText = true } = {}) {
  contextLabel = `${ctx.VW}x${ctx.VH} ${label}`; trace.text = []; draws++;
  try { s.draw(gfx); } catch (e) { check(false, 'draw threw', e.message); return; }
  const buttons = s.btns.filter(b => !b.hidden);
  for (const b of buttons) check(inBounds(b), 'button outside canvas', `${b.label} [${b.x},${b.y},${b.w},${b.h}]`);
  for (let i = 0; i < buttons.length; i++) for (let j = i + 1; j < buttons.length; j++) check(!overlap(buttons[i], buttons[j]), 'buttons overlap', `${buttons[i].label} / ${buttons[j].label}`);
  if (text) for (const t of trace.text) check(inBounds(t), 'text outside canvas', `${t.text} [${t.x},${t.y},${t.w},${t.h}]`);
  if (overlapText) for (const t of trace.text) for (const b of buttons) check(!overlap(t, b), 'body text overlaps control', `${t.text} / ${b.label}`);
}

contextLabel = 'Resident WHO auto-registration';
for (const [key, resident] of Object.entries(a.RESIDENTS)) check(a.WHO['resident_' + key]?.n === resident.name, 'resident voice is registered before journal use', key);

if (!process.argv.includes('--dialog-only')) {
for (const [w, h, portrait] of [[420, 250, false], [480, 270, false], [260, 400, true], [270, 480, true]]) {
  ctx.VW = w; ctx.VH = h; ctx.PORTRAIT = portrait;
  for (const saved of [false, true]) {
    ctx.G = state(saved ? 16 : 0); ctx.__save = saved ? ctx.G : null;
    const title = new a.TitleScreen(); render(title, `Title saved=${saved}`);
    check(title.btns.some(b => b.label === '继续冒险') === saved, 'continue visibility matches save');
  }
  render(new a.GuideScreen(), 'Guide');
  for (const done of [0, 5, 10, 16, 21, 25]) for (const upgraded of [false, true]) {
    ctx.G = state(done); const app = new a.AppScreen(upgraded); app.t = 1;
    for (let step = 0; step < 5; step++) {
      const tab = app.btns.find(b => b.step === step);
      if (!tab.disabled) { tab.onPress(); check(app.selected === step, 'app tab opens selected details'); }
      else app.selected = step; // Exercise the locked-step description as well.
      render(app, `App stage=${a.appStage()} detail=${step + 1} upgraded=${upgraded}`);
      for (const b of app.btns.filter(b => b.step !== undefined)) check(b.disabled === (b.step >= a.appStage()), 'future app step must remain locked', b.label);
    }
  }
  ctx.G = state(21); render(new a.PauseScreen(), 'Pause');
  for (const done of [0, 5, 10, 16, 21, 27]) {
    ctx.G = state(done);
    const journal = new a.JournalScreen();
    for (let region = 0; region < 5; region++) {
      journal.tab = 0; journal.region = region; journal.mk(); render(journal, `Journal map done=${done} region=${region + 1}`);
      for (const b of journal.btns.filter(b => b.zone !== undefined)) check(b.disabled === (b.zone > done), 'future zone must remain locked', b.label);
    }
    const people = a.journalPeople(), residentKeys = Object.keys(a.RESIDENTS);
    check(people.length === 20, 'journal includes original eight and twelve new residents');
    journal.tab = 1;
    for (const seen of ['none', 'some', 'all']) {
      ctx.G.residentsSeen = seen === 'all' ? residentKeys : seen === 'some' ? residentKeys.filter((_, i) => i % 2 === 0) : [];
      for (let person = 0; person < people.length; person++) {
        journal.person = person; journal.mk(); render(journal, `Journal person done=${done} seen=${seen} person=${person}`);
        const page = Math.floor(person / 6);
        for (const b of journal.btns.filter(b => b.person !== undefined)) {
          const p = people[b.person], met = p[4] ? ctx.G.residentsSeen.includes(p[4]) : done >= p[3];
          check(b.disabled === !met, 'resident unlock uses seen keys; main cast uses story progress', b.label);
          check(b.person >= page * 6 && b.person < (page + 1) * 6, 'people page contains only its six slots');
        }
        const selected = people[person], selectedMet = selected[4] ? ctx.G.residentsSeen.includes(selected[4]) : done >= selected[3];
        check(trace.text.some(t => t.text === (selectedMet ? selected[1] : '尚未相遇')), 'selected profile respects encounter status');
        if (!selectedMet) check(!trace.text.some(t => t.text === selected[2]), 'unmet person biography remains hidden');
        check(journal.btns.find(b => b.page === -1).disabled === (page === 0), 'first people page cannot go left');
        check(journal.btns.find(b => b.page === 1).disabled === (page === 3), 'last people page cannot go right');
      }
      // Navigate with actual button handlers, checking every page in both directions.
      journal.person = 0; journal.mk();
      for (let page = 1; page < 4; page++) {
        journal.press(journal.btns.find(b => b.page === 1));
        check(journal.person === page * 6, 'next people page selects its first slot');
        render(journal, `Journal people forward done=${done} seen=${seen} page=${page + 1}`);
      }
      const lastPerson = journal.person;
      journal.press(journal.btns.find(b => b.page === 1)); check(journal.person === lastPerson, 'disabled next people button cannot advance');
      for (let page = 2; page >= 0; page--) {
        journal.press(journal.btns.find(b => b.page === -1));
        check(journal.person === page * 6, 'previous people page selects its first slot');
        render(journal, `Journal people backward done=${done} seen=${seen} page=${page + 1}`);
      }
      journal.press(journal.btns.find(b => b.page === -1)); check(journal.person === 0, 'disabled previous people button cannot go below zero');
    }
    journal.tab = 2; journal.mk(); render(journal, `Journal memories done=${done}`);
    for (const b of journal.btns.filter(b => b.comic)) check(b.disabled === (!(ctx.G.comics || []).includes(b.comic) && done < a.COMICS[b.comic].unlock), 'future memory must remain locked', b.label);
    // Only validate the room directory and its paging here; the world-art agent covers room interiors.
    const roomKeys = Object.keys(a.INTERIORS);
    check(roomKeys.length === 18, 'room directory contains eighteen accessible interiors');
    journal.tab = 3;
    for (const visited of ['none', 'some', 'all']) {
      ctx.G.roomsVisited = visited === 'all' ? roomKeys : visited === 'some' ? roomKeys.filter((_, i) => i % 2 === 0) : [];
      for (let page = 0; page < 3; page++) {
        journal.roomsPage = page; journal.mk(); render(journal, `Journal rooms done=${done} visited=${visited} page=${page + 1}`);
        const displayed = journal.btns.filter(b => b.roomKey);
        check(displayed.length === 6, 'each room directory page contains six rooms');
        for (const b of displayed) {
          check(roomKeys.slice(page * 6, page * 6 + 6).includes(b.roomKey), 'room belongs to displayed page');
          check(b.disabled === (done < a.INTERIORS[b.roomKey].zone), 'room directory cannot enter an unreached zone', b.label);
          check(b.label.startsWith(ctx.G.roomsVisited.includes(b.roomKey) ? '◆' : '·'), 'room label reflects visit history', b.label);
        }
        check(journal.btns.find(b => b.page === -1).disabled === (page === 0), 'first room page cannot go left');
        check(journal.btns.find(b => b.page === 1).disabled === (page === 2), 'last room page cannot go right');
      }
      journal.roomsPage = 0; journal.mk();
      for (let page = 1; page < 3; page++) {
        journal.press(journal.btns.find(b => b.page === 1)); check(journal.roomsPage === page, 'next room page increments once');
        render(journal, `Journal rooms forward done=${done} visited=${visited} page=${page + 1}`);
      }
      journal.press(journal.btns.find(b => b.page === 1)); check(journal.roomsPage === 2, 'disabled next room button cannot exceed final page');
      for (let page = 1; page >= 0; page--) {
        journal.press(journal.btns.find(b => b.page === -1)); check(journal.roomsPage === page, 'previous room page decrements once');
        render(journal, `Journal rooms backward done=${done} visited=${visited} page=${page + 1}`);
      }
      journal.press(journal.btns.find(b => b.page === -1)); check(journal.roomsPage === 0, 'disabled previous room button cannot go below zero');
    }
  }
  for (const [key, story] of Object.entries(a.COMICS)) {
    const comic = new a.ComicScreen(key); comic.revealed = true; comic.age = 100;
    for (let frame = 0; frame < story.frames.length; frame++) {
      comic.index = frame; comic.mk(); render(comic, `Comic ${key} frame=${frame + 1}`);
      const body = trace.text.find(t => t.text === story.frames[frame].line);
      const caption = trace.text.find(t => t.text === story.frames[frame].caption);
      check(!!body && !!caption, 'comic body and caption must both render');
      if (body && caption) check(!overlap(body, caption), 'comic body overlaps caption', `body ends y=${body.y + body.h}; caption starts y=${caption.y}`);
    }
  }
}

contextLabel = 'Save failure guards'; ctx.G = state(21); ctx.__saveOK = false;
const pause = new a.PauseScreen(); let closedBefore = trace.closed.length;
const saveCallsBefore = trace.saveCalls;
await pause.btns.find(b => b.label === '存档管理').onPress();
const manager = trace.opened.at(-1);
check(manager instanceof a.SaveScreen, 'pause opens the save manager');
check(trace.saveCalls === saveCallsBefore, 'opening save manager does not write progress');
// Native DOM behavior is covered by check-save-ui.cjs; keep the real save failure path here.
manager.active = true; manager.nodes = { status: { textContent: '', classList: { toggle: noop } } };
let saveRefreshes = 0; manager.refresh = () => { saveRefreshes++; };
manager.saveNow();
check(trace.closed.length === closedBefore, 'failed save must keep pause screen open');
check(manager.nodes.status.textContent.includes('失败'), 'failed save must report failure inside the manager');
check(saveRefreshes === 0, 'failed save must not refresh a successful save time');
await pause.btns.find(b => b.label === '存档并回到标题').onPress();
check(trace.closed.length === closedBefore, 'failed save-and-exit must not return to title');
ctx.__saveOK = true;
manager.saveNow();
check(manager.nodes.status.textContent.includes('已保存'), 'successful manual save reports confirmation');
check(saveRefreshes === 1, 'successful manual save refreshes displayed save time');
await pause.btns.find(b => b.label === '存档并回到标题').onPress();
check(trace.closed.at(-1)?.value === 'title', 'successful save-and-exit returns title');

contextLabel = 'Comic reduced-motion controls';
const instantComic = new a.ComicScreen('arrival'); instantComic.next();
check(instantComic.index === 1, 'a fully visible reduced-motion frame should advance on one press');

contextLabel = 'Quick-travel guards'; ctx.scene = 'world'; ctx.scriptRunning = false;
for (const done of [0, 5, 10, 16, 21, 27]) {
  ctx.G = state(done);
  for (let zone = 0; zone < 27; zone++) {
    const journal = new a.JournalScreen(), before = trace.travel.length;
    journal.travel(zone);
    check((trace.travel.length > before) === (zone <= done), 'travel respects reached progress', `done=${done}, zone=${zone}`);
    if (trace.travel.length > before) {
      const { x, y } = trace.travel.at(-1);
      check(x >= zone * a.ZW * a.TILE && x < (zone + 1) * a.ZW * a.TILE, 'travel stays in target zone');
      check(y === 15 * a.TILE - 2, 'travel lands on main road');
    }
  }
}
ctx.G = state(10);
for (const mode of ['script', 'title', 'blocked']) {
  ctx.scriptRunning = mode === 'script'; ctx.scene = mode === 'title' ? 'title' : 'world'; ctx.blocked = () => mode === 'blocked';
  const before = trace.travel.length; new a.JournalScreen().travel(3);
  check(trace.travel.length === before, 'travel rejected while unavailable', mode);
}
}

// Regression: keep an already-open multi-page conversation readable after resize/rotation.
// --dialog-only runs these new cases without rerunning the previously verified interface matrix.
const dialogText = [
  '婆婆把手写菜单放到桌边，不响先核对日期，再把旧版放回档案夹。',
  '小 A 读到了两份不同的价格，没有替店主取平均数，而是在旁边写上“需要确认”。',
  '圈圈的工具只能读取这份菜单，API Key 留在服务端；MCP 连接不会替用户新增发送权限。',
  '不响把确认后的草稿交给小零，再核对后厨收到的试单；等待回执时，大家一起把桥头的星灯点亮。',
  '这一页读完以后，还有屋主留下的补充说明，所以改变窗口大小也不能把后面的对话跳过去。',
].join('').repeat(3);
const flattenedDialog = s => s.pages.flat(2).map(t => t.ch).join('');
const readPosition = s => s.pages.slice(0, s.page).reduce((sum, p) => sum + a.countChars(p), 0) + s.n;
const setViewport = ([w, h, portrait]) => { ctx.VW = w; ctx.VH = h; ctx.PORTRAIT = portrait; };
const advanceDialog = s => { ctx.Input.hit = key => key === 'ok'; s.update(0); ctx.Input.hit = () => false; };
let dialogCases = 0;
for (const [name, from, to] of [
  ['desktop-to-portrait', [480, 270, false], [260, 400, true]],
  ['portrait-360-to-292', [360, 640, true], [292, 520, true]],
  ['portrait-to-landscape', [270, 480, true], [420, 250, false]],
]) for (const trigger of ['update', 'draw']) for (const position of ['first-partial', 'middle-partial', 'middle-complete', 'last-complete']) {
  setViewport(from); ctx.Input.hit = () => false; ctx.Input.pointer = {};
  const s = new a.DialogScreen([['resident_shenmai', dialogText], ['me', '我已经读到了最后一页，现在可以收好菜单继续出发。']]);
  contextLabel = `Dialog reflow ${name} ${trigger} ${position}`;
  check(s.pages.length >= 3, 'fixture must begin with multiple pages');
  const targetPage = position === 'first-partial' ? 0 : position === 'last-complete' ? s.pages.length - 1 : Math.floor(s.pages.length / 2);
  while (s.page < targetPage) { advanceDialog(s); advanceDialog(s); }
  if (position.endsWith('complete')) advanceDialog(s);
  else s.update(Math.floor(s.total * .45) / 38);
  const before = readPosition(s), sentence = s.i;
  const expectedVisible = flattenedDialog(s).slice(0, before).replace(/\s/g, '');
  setViewport(to);
  if (trigger === 'update') s.update(0); else s.draw(gfx);
  const L = s.layout(); dialogCases++;
  check(readPosition(s) === before, 'resize preserves total read character count', `${before} -> ${readPosition(s)}`);
  check(s.i === sentence, 'resize cannot skip to the next speech');
  check(s.page >= 0 && s.page < s.pages.length && s.n >= 0 && s.n <= s.total, 'read cursor remains within new page');
  check(s.wrapWidth === L.tw && s.wrapLines === L.maxLines, 'pagination tracks current dialog dimensions');
  check(flattenedDialog(s).replace(/\s/g, '') === dialogText.replace(/\s/g, ''), 'reflow keeps all dialogue content and order');
  check(flattenedDialog(s).slice(0, readPosition(s)).replace(/\s/g, '') === expectedVisible, 'resize preserves the actual already-read text');
  for (const page of s.pages) {
    check(page.length <= L.maxLines, 'reflow respects the current page line limit');
    for (const line of page) check(metrics(line.map(t => t.ch).join('')) <= L.tw + 1, 'reflowed text fits the dialog column');
  }
  const stable = [s.page, s.n, s.total, s.pages.length].join();
  s.update(0); s.draw(gfx);
  check([s.page, s.n, s.total, s.pages.length].join() === stable, 'unchanged viewport does not repaginate or advance');
  render(s, `Dialog ${name} ${trigger} ${position}`);
  const beforeClose = trace.closed.filter(c => c.s === s).length;
  let presses = 0;
  while (trace.closed.filter(c => c.s === s).length === beforeClose && presses++ < 100) advanceDialog(s);
  check(trace.closed.filter(c => c.s === s).length === beforeClose + 1, 'resized dialogue can finish and close exactly once');
  check(s.i === s.lines.length, 'completion still reaches the final speech');
}

console.log(`${failures.length ? 'FAIL' : 'PASS'}: ${draws} interface renders, ${dialogCases} dialog-resize regressions, ${assertions} checks, ${failures.length} unique findings.`);
for (const failure of failures.slice(0, 100)) console.log('- ' + failure);
if (failures.length > 100) console.log(`... ${failures.length - 100} more findings; run with --json for complete details.`);
if (process.argv.includes('--json')) console.log(JSON.stringify({ draws, assertions, failures }, null, 2));
process.exitCode = failures.length ? 1 : 0;
