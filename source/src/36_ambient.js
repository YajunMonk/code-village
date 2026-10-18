/* ============================================================
 * 36 街道轻互动：只绑定已有动物与生活物件，不占用剧情屏幕。
 * ============================================================ */
const ambientActors = [];
let ambientFeedback = null;
const AMBIENT_LINES = {
  cat: ['它蹭了蹭你的手。', '它的呼声像一台小马达。', '它眯起眼，尾巴轻轻一晃。'],
  hen: ['咕咕。它认真检查你的鞋。', '它啄了啄地，又抬头看你。'],
  pondduck: ['嘎！水面荡开一圈波纹。', '它歪着头，像是记住了你。'],
  butterfly: ['它绕着你的手飞了一小圈。', '翅膀一闪，落下细碎的光。'],
  flowerbed: ['花瓣上的露珠还没有干。', '风一吹，花香靠近了一点。'],
  pot: ['有人刚给它浇过水。'],
  yardFlowers: ['花丛里藏着很轻的香气。'],
  yardHerbs: ['揉一揉叶子，是清凉的香味。'],
  lamp: ['灯罩暖暖的，像有人在等你。'],
  bench: ['坐一会儿，也不算浪费时间。'],
  well: ['井下传来一声清亮的回响。'],
  mailbox: ['信箱里有纸张被风翻动的声音。'],
  bicycle: ['叮铃。车铃的声音很清脆。'],
  teatable: ['杯口还留着一点茶香。'],
  picnic: ['野餐垫上落着一片小叶子。'],
  wateringcan: ['水壶里还剩半壶清水。'],
  bookcart: ['书页翻开，夹着一朵压平的花。'],
};
function setupAmbientInteractions() {
  ambientActors.length = 0; ambientFeedback = null;
  const props = Object.keys(AMBIENT_LINES).filter(k => PROP[k]);
  for (const o of objects) {
    if (o.interact) continue;
    const z = clamp(Math.floor(o.x / (ZW * TILE)), 0, NZ - 1);
    let kind = props.find(k => o.img === PROP[k]);
    // 只接受地图明确标记的动物，其他自绘物件不会意外变成互动目标。
    if (o.kind === 'villageAnimal') kind = o.animal;
    if (!kind) continue;
    ambientActors.push({ source: o, kind, z, phase: o.phase ?? z * .73, height: o.img?.height || 19, width: o.img?.width || 23, range: 30, label: kind === 'cat' ? '摸摸' : kind === 'hen' ? '招呼' : kind === 'bench' ? '歇一歇' : '看看', count: 0 });
  }
  for (const d of decor) if (d.kind === 'butterfly' || d.kind === 'pondduck') {
    ambientActors.push({ source: d, kind: d.kind, z: Math.floor(d.x / (ZW * TILE)), height: d.kind === 'pondduck' ? 12 : 6, width: 16, range: d.kind === 'pondduck' ? 64 : 34, label: d.kind === 'pondduck' ? '招呼' : '伸手', count: 0 });
  }
}
function ambientPosition(a) {
  const o = a.source; let x = o.x, y = o.y;
  if (a.kind === 'cat' || a.kind === 'hen') x += Math.round(Math.sin(worldT * .45 + a.phase) * 9);
  if (a.kind === 'pondduck') { x += Math.sin(worldT * .28 + o.s) * 14; y += Math.sin(worldT * .4 + o.s) * 3; }
  if (a.kind === 'butterfly') { x += Math.sin(worldT * .7 + o.s) * 18; y += -17 + Math.sin(worldT * 1.4 + o.s) * 7; }
  return { x, y: y + ambientOffset(o) };
}
function ambientOffset(source) {
  if (typeof reducedMotion === 'function' && reducedMotion()) return 0;
  if (!ambientFeedback || ambientFeedback.a.source !== source || !['cat', 'hen', 'butterfly'].includes(ambientFeedback.a.kind)) return 0;
  const age = 2.4 - ambientFeedback.life;
  return age >= 0 && age < .5 ? -Math.round(Math.sin(age / .5 * Math.PI) * 4) : 0;
}
function ambientHit(a, point) {
  const p = ambientPosition(a), x = point.x + cam.x, y = point.y + cam.y;
  return Math.abs(x - p.x) <= Math.max(12, a.width / 2) && y >= p.y - Math.max(16, a.height) && y <= p.y + 8;
}
function ambientTarget(point = null) {
  let target = null, nearest = Infinity;
  for (const a of ambientActors) {
    if (a.z > G.done) continue;
    const p = ambientPosition(a), distance = Math.hypot(p.x - player.x, p.y - player.y);
    if (distance < a.range && distance < nearest && (!point || ambientHit(a, point))) { target = { type: 'ambient', a, distance }; nearest = distance; }
  }
  return target;
}
function runAmbientInteraction(a) {
  if (!a || (ambientFeedback && ambientFeedback.life > 1.8)) return false;
  const lines = AMBIENT_LINES[a.kind];
  if (!lines) return false;
  ambientFeedback = { a, text: lines[a.count++ % lines.length], life: 2.4 };
  chatter.life = 0;
  const sound = a.kind === 'pondduck' ? 'quack' : a.kind === 'hen' || a.kind === 'butterfly' ? 'chirp' : a.kind === 'bicycle' || a.kind === 'lamp' ? 'tick' : a.kind === 'cat' ? 'blip' : 'open';
  Audio.sfx(sound, -1);
  return true;
}
function updateAmbient(dt) {
  if (ambientFeedback) { ambientFeedback.life -= dt; if (ambientFeedback.life <= 0) ambientFeedback = null; }
}
function drawAmbientFeedback(g, ix, iy) {
  if (!ambientFeedback || scene !== 'world' || screens.length || scriptRunning) return;
  const { a, text, life } = ambientFeedback, p = ambientPosition(a), x = Math.round(p.x - ix), y = Math.round(p.y - iy);
  if (x < -24 || x > VW + 24 || y < 0 || y > VH + 32) return;
  const age = 2.4 - life;
  g.save();
  if (age < .7 && !(typeof reducedMotion === 'function' && reducedMotion())) {
    g.globalAlpha = 1 - age / .7; g.fillStyle = a.kind === 'pondduck' ? '#d9f6ee' : '#f5d69d';
    const r = 8 + age * 21;
    for (let i = 0; i < 8; i++) { const angle = i * Math.PI / 4; g.fillRect(Math.round(x + Math.cos(angle) * r), Math.round(y - 3 + Math.sin(angle) * r * .38), 2, 1); }
  }
  g.globalAlpha = Math.min(1, life * 3);
  speech(g, x, clamp(y - a.height - 6, 48, VH - 20), text);
  g.restore();
}
