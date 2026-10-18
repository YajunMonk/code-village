#!/usr/bin/env node
'use strict';
// 原生像素资源、绘制路径和真实碰撞网格的无浏览器自检。
// 运行：node scripts/check-world.cjs [--output report.json] [--contact characters.svg] [--sprites sprites.json]
// Canvas 为记录式替身；此检查不代替浏览器里的视觉验收。
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const noop = () => {};
function context2d() {
  return new Proxy({
    createImageData: (width, height) => ({ data: new Uint8ClampedArray(width * height * 4), width, height }),
    putImageData(image) { this.image = image; },
    translate() {},
    scale(x) { this.flipX = x < 0; },
    drawImage(source) {
      // Real flipH() uses a translated, negative-x Canvas scale. Preserve its pixels
      // so right-facing sprites receive the same image/anchor checks as other views.
      if (!this.flipX) return;
      const src = source.getContext('2d').image;
      if (!src) return;
      const result = this.createImageData(src.width, src.height);
      for (let y = 0; y < src.height; y++) for (let x = 0; x < src.width; x++) {
        const from = (y * src.width + x) * 4, to = (y * src.width + src.width - 1 - x) * 4;
        result.data.set(src.data.subarray(from, from + 4), to);
      }
      this.image = result;
    },
    createRadialGradient: () => ({ addColorStop: noop }),
  }, { get: (o, p) => p in o ? o[p] : noop });
}
function canvas() { const ctx = context2d(); return { width: 1, height: 1, getContext: () => ctx }; }
const storage = new Map();
const sandbox = {
  assert, console, performance,
  document: { createElement: canvas, addEventListener: noop },
  window: { addEventListener: noop },
  localStorage: { setItem: (k, v) => storage.set(k, v), getItem: k => storage.get(k) || null, removeItem: k => storage.delete(k) },
  testSurface: context2d(),
};
vm.createContext(sandbox);
const read = file => fs.readFileSync(path.join(root, 'source/src', file), 'utf8');
const core = read('00_core.js').split('/* ---------- 画布 & 缩放 ---------- */')[0];
vm.runInContext(core + `
const resizeHooks = []; let VW = 480, VH = 270, scene = 'world', talkingWho = null, scriptRunning = false;
const WHO = {}, fx = { shake: 0 }, screens = [], txt = () => {};
const cv = makeCanvas(VW, VH)[0];
`, sandbox);
for (const name of ['20_art.js', '21_props.js', '22_art3.js', '30_world.js', '35_entities.js']) vm.runInContext(read(name), sandbox, { filename: name });
vm.runInContext(`
buildProps(); buildProps3(); buildWorld(); setupNPCs();
let checkedFrames = 0;
for (const id of Object.keys(CHAR)) for (let dir = 0; dir < 4; dir++) for (let frame = 0; frame < 4; frame++) {
  const image = charFrame(id, dir, frame, frame % 2, frame === 3);
  assert.equal(image.width, 26, id + ' width');
  assert.equal(image.height, CHAR[id].short ? 34 : 36, id + ' height');
  {
    const pixels = image.getContext('2d').image;
    let bottom = -1;
    for (let y = 0; y < pixels.height; y++) for (let x = 0; x < pixels.width; x++) if (pixels.data[(y * pixels.width + x) * 4 + 3]) bottom = y;
    assert.ok(bottom >= image.height - 3, id + ' feet must stay at the sprite anchor');
    assert.ok(pixels.data.some((v, i) => i % 4 === 3 && v), id + ' visible pixels in every direction');
  }
  checkedFrames++;
}
for (const id of Object.keys(CHAR)) {
  const rgba = dir => charFrame(id, dir, 0).getContext('2d').image.data;
  assert.notDeepEqual(rgba(0), rgba(1), id + ' front and back silhouettes differ');
  const idle = charFrame(id, 0, 0).getContext('2d').image.data;
  const step = charFrame(id, 0, 1).getContext('2d').image.data;
  assert.notDeepEqual(idle, step, id + ' walking frame changes visibly');
}
const specialMakers = { xa:makeXA, duck:makeDuck, snail:makeSnail, runner:makeRunner, sticky:makeSticky, bug:makeBug };
let specialFrames = 0;
for (const [id, make] of Object.entries(specialMakers)) for (let frame = 0; frame < 4; frame++) {
  const image = make(frame % 2, frame % 2), px = image.getContext('2d').image;
  assert.ok(image.width > 0 && image.height > 0 && px.data.some((v,i)=>i%4===3&&v), id + ' special frame has pixels');
  assert.ok(image.width <= 28 && image.height <= 38, id + ' matches the world character scale');
  specialFrames++;
}
assert.notDeepEqual(makeDuck().getContext('2d').image.data, makePondDuck().getContext('2d').image.data, 'Duck shopkeeper and pond birds have separate silhouettes');
for (const kind of ['cat', 'hen']) for (let frame = 0; frame < 2; frame++) makeVillageAnimal(kind, frame);
G.done = NZ;
const seen = new Set(), reachable = [[20, ROAD * TILE + 20]];
for (let head = 0; head < reachable.length; head++) {
  const [x, y] = reachable[head];
  for (const [dx, dy] of [[8, 0], [-8, 0], [0, 8], [0, -8]]) {
    const nx = x + dx, ny = y + dy, key = nx + ',' + ny;
    if (nx < 8 || nx > MAPW - 8 || ny < 64 || ny > 416 || seen.has(key) || blocked(nx, ny)) continue;
    seen.add(key); reachable.push([nx, ny]);
  }
}
const unreachable = npcs.filter(n => npcVisible(n) && !reachable.some(([x, y]) => Math.hypot(x - n.x, y - n.y) < n.range));
assert.deepEqual(unreachable.map(n => n.id), [], 'All visible NPCs can be approached after gates unlock');
for (let x = 20; x < MAPW - 20; x += 8) assert.equal(blocked(x, ROAD * TILE + 20), null, 'Main path blocked at ' + x);
const houses = objects.filter(o => o.kind === 'house');
for (const house of houses) {
  assert.ok(house.doorWorld && Number.isFinite(house.doorWorld.x) && Number.isFinite(house.doorWorld.y), 'Every house exposes a world-space door');
  assert.equal(blocked(house.doorWorld.x, house.doorWorld.y), null, 'House doorway must remain walkable');
  assert.ok(reachable.some(([x, y]) => Math.hypot(x - house.doorWorld.x, y - house.doorWorld.y) < 20), 'House door can be approached from the main road');
}
let groundSamples = 0;
for (let z = 0; z < NZ; z++) for (let x = 8; x < ZW * TILE; x += 32) for (let y = 72; y < 408; y += 32) {
  const wx = z * ZW * TILE + x, color = groundColor(wx, y, typeAtPx(wx, y), typeAtPx, z);
  assert.match(color, /^#[0-9a-f]{6}$/i, 'Valid sampled ground color'); groundSamples++;
}

// Each active main quest, including every boss, has an accessible interaction position.
for (let z = 0; z < NZ; z++) {
  G.done = z;
  const npc = npcs.find(n => n.id === z);
  assert.ok(reachable.some(([x, y]) => x < (z + 1) * ZW * TILE - 16 && Math.hypot(x - npc.x, y - npc.y) < npc.range && !blocked(x, y)), 'Quest interaction unreachable: ' + z);
}
// Exercise entity/decor/light rendering in every zone, before and after the story.
// Ground pixels are unchanged by this upgrade; skip their slow baking here.
for (const chunk of ground.chunks) { chunk.done = true; chunk.canvas = makeCanvas(CW_PX, MAPH)[0]; }
initClouds(); resizeHooks.forEach(hook => hook());
let worldViews = 0;
for (const done of [0, NZ]) {
  G.done = done;
  for (let z = 0; z < NZ; z++) {
    cam.x = z * ZW * TILE; cam.y = 100; worldT = z * .37;
    player.x = cam.x + 160; player.y = 240;
    drawWorld(testSurface, .016); worldViews++;
  }
}
assert.equal(save(true), true, 'Successful save returns true');
assert.ok(validSave(loadSave()), 'Written save can be read back');
const originalSetter = localStorage.setItem;
localStorage.setItem = () => { throw new Error('simulated storage quota'); };
saveFx = 0;
assert.equal(save(true), false, 'Failed save returns false');
assert.equal(saveFx, 0, 'Failed save must not display a success indicator');
localStorage.setItem = originalSetter;
// 任务标记与一句剧情中的情绪表情不能叠加。关闭模态后应立即恢复任务标记。
const originalBubble = bubble;
let markerDraws = 0, markerChecks = 0;
bubble = () => { markerDraws++; };
for (const n of [npcs.find(n => n.id === 1), npcs.find(n => n.id === 4), npcs.find(n => n.who === 'door'), npcs.find(n => n.kind === 'side')]) {
  G.done = Number.isInteger(n.id) ? n.id : NZ; G.side = []; promptTarget = null;
  for (const mode of ['free', 'dialog', 'script', 'free']) {
    screens.length = 0; if (mode === 'dialog') screens.push({});
    scriptRunning = mode === 'script'; markerDraws = 0;
    drawNpc(testSurface, n, 0, 0);
    assert.equal(markerDraws, mode === 'free' ? 1 : 0, n.who + ' task marker: ' + mode); markerChecks++;
  }
}
screens.length = 0; scriptRunning = false; bubble = originalBubble;
globalThis.worldCheckResult = {
  passed: true, characterFrames: checkedFrames, humanCharacters: Object.keys(CHAR).length,
  specialCharacters: Object.keys(specialMakers).length, specialFrames,
  characterStyle: 'Native 24x34 adults / 24x32 children, four directions, short limbs, stable feet anchors',
  props: Object.keys(PROP).length,
  objects: objects.length, houses: objects.filter(o => o.kind === 'house').map(o => ({ zone: Math.floor(o.x / (ZW * TILE)), arch: o.arch, doorWorld: o.doorWorld })), lanternStrings: decor.filter(d => d.kind === 'festivalRibbon').length,
  storyLights: lights.filter(l => l.unlockZone !== undefined).length,
  reachableCells: seen.size, reachableQuestInteractions: NZ, worldViewsRendered: worldViews,
  mainRoad: 'clear', accessibleHouseDoors: houses.length, groundColorSamples: groundSamples, saveSuccessAndFailure: 'passed', taskMarkerChecks: markerChecks,
  limitation: 'Recording Canvas checks runtime paths; visual review is performed separately in the browser.'
};
`, sandbox, { timeout: 30000 });
const result = JSON.stringify(sandbox.worldCheckResult, null, 2) + '\n';
const outputIndex = process.argv.indexOf('--output');
if (outputIndex >= 0) {
  const output = process.argv[outputIndex + 1];
  if (!output) throw new Error('--output requires a file path');
  fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
  fs.writeFileSync(output, result);
}
process.stdout.write(result);

// Optional raw RGBA source for auditable, nearest-neighbour character contact sheets.
const spritesIndex = process.argv.indexOf('--sprites');
const contactIndex = process.argv.indexOf('--contact');
if (spritesIndex >= 0 || contactIndex >= 0) {
  const spriteData = vm.runInContext(`Object.entries(CHAR).map(([id,o])=>({id,short:!!o.short,frames:[0,2,1,3].map(dir=>{const im=charFrame(id,dir,0),px=im.getContext('2d').image;return {dir,width:im.width,height:im.height,data:Array.from(px.data)};})}))`,sandbox);
  const playerWalk = vm.runInContext(`[0,2,1,3].flatMap(dir=>[0,1,2,3].map(frame=>{const im=charFrame('player',dir,frame),px=im.getContext('2d').image;return {dir,frame,width:im.width,height:im.height,data:Array.from(px.data)};}))`,sandbox);
  const specialData = vm.runInContext(`Object.entries(specialMakers).map(([id,make])=>({id,frames:[0,1,2,3].map(frame=>{const im=make(frame%2,frame>=2?1:0),px=im.getContext('2d').image;return {frame,width:im.width,height:im.height,data:Array.from(px.data)};})}))`,sandbox);
  if (spritesIndex >= 0) fs.writeFileSync(process.argv[spritesIndex+1],JSON.stringify({characters:spriteData,playerWalk,specials:specialData}));
  if (contactIndex >= 0) {
    const output = process.argv[contactIndex + 1];
    if (!output || !output.endsWith('.svg')) throw new Error('--contact requires an .svg file path');
    // Horizontal runs preserve the source pixels exactly, with no smoothing or screenshot dependence.
    const pixels = (fr, x, y, scale) => {
      const out = [];
      for (let py=0;py<fr.height;py++) for(let px=0;px<fr.width;) {
        const i=(py*fr.width+px)*4;
        if (!fr.data[i+3]) { px++; continue; }
        const color=fr.data.slice(i,i+3).map(c=>c.toString(16).padStart(2,'0')).join('');
        let end=px+1;
        while(end<fr.width) { const k=(py*fr.width+end)*4;if(!fr.data[k+3]||fr.data[k]!==fr.data[i]||fr.data[k+1]!==fr.data[i+1]||fr.data[k+2]!==fr.data[i+2])break;end++; }
        out.push(`<rect x="${x+px*scale}" y="${y+py*scale}" width="${(end-px)*scale}" height="${scale}" fill="#${color}"/>`);px=end;
      }
      return out.join('');
    };
    const all=[...spriteData,...specialData], height=Math.ceil(all.length/4)*124;
    const header=(w,h)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#f0e6cc"/>`;
    const cells=all.map((ch,i)=>{const x=i%4*250,y=Math.floor(i/4)*124;return `<rect x="${x+4}" y="${y+4}" width="242" height="116" fill="#e8ddc3"/><text x="${x+12}" y="${y+20}" font-family="monospace" font-size="11" fill="#514c43">${ch.id}</text>`+ch.frames.map((fr,j)=>pixels(fr,x+12+j*58,y+36+(36-fr.height)*2,2)).join('');});
    fs.mkdirSync(path.dirname(path.resolve(output)),{recursive:true});fs.writeFileSync(output,header(1000,height)+cells.join('')+'</svg>');
    const walk=playerWalk.map((fr,i)=>{const x=i%4*150,y=Math.floor(i/4)*205;return `<text x="${x+8}" y="${y+20}" font-family="monospace" font-size="11" fill="#514c43">dir ${fr.dir} frame ${fr.frame}</text>`+pixels(fr,x+10,y+25,5);});
    fs.writeFileSync(output.replace(/\.svg$/,'-walk.svg'),header(600,820)+walk.join('')+'</svg>');
  }
}
