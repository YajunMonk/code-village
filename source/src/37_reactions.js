/* ============================================================
 * 37 剧情反应：只接受台词第四项的明确标记，不从文字猜测情绪。
 * ============================================================ */
const REACTION_COLORS = Object.freeze({ surprise: '#c07b20', anger: '#c94b4a', idea: '#d99a27', sweat: '#4a9cbd', joy: '#dc9b38', question: '#437f9b' });
const REACTION_SIZE = { w: 24, h: 26 };
function makeReaction(who, metadata) {
  if (!Object.hasOwn(WHO, who) || !metadata || !Object.hasOwn(REACTION_COLORS, metadata.emotion)) return null;
  return { who, emotion: metadata.emotion, age: 0, duration: 1.6 };
}
const reactionOverlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

function reactionWorldActor(who, dialog) {
  // 室内等屏幕仍会保留底层 world，不能把反应画在被房间覆盖的室外人物上。
  if (scene !== 'world' || screens.some(s => s !== dialog)) return null;
  const id = WHO[who]?.id, ix = Math.round(cam.x), iy = Math.round(cam.y);
  let actor, width, height, top;
  if (who === 'me') {
    actor = player; const im = charFrame('player', player.dir, player.frame);
    width = im.width; height = im.height; top = Math.round(actor.y - iy) - height + 1;
  } else if (who === 'xa' && G.done >= 1) {
    actor = xa; const im = xaFrame(Math.floor(worldT * 4) % 2, false, xa.mood);
    width = im.width; height = 26; top = Math.round(actor.y - iy) - 26 + Math.round(Math.sin(worldT * 3) * 1.5) - (G.hat ? 5 : 0);
  } else {
    const candidates = npcs.filter(n => npcVisible(n) && (id?.startsWith('boss:') ? n.boss === id.slice(5) && bossAlive(n) : n.who === who || n.who === id));
    // 同一称谓存在多个对象时，只认离当前镜头最近的现场角色。
    candidates.sort((a, b) => Math.hypot(a.x - ix - VW / 2, a.y - iy - VH / 2) - Math.hypot(b.x - ix - VW / 2, b.y - iy - VH / 2));
    actor = candidates[0]; if (!actor) return null;
    if (actor.boss) { width = 66; height = 60; top = Math.round(actor.y - iy) - 60 + Math.round(Math.sin(worldT * 2) * 2); }
    else if (actor.who === 'door') { width = 64; height = 80; top = Math.round(actor.y - iy) - 80; }
    else { const im = npcSprite(actor); width = im.width; height = im.height; top = Math.round(actor.y - iy) - height + 1; }
  }
  const x = Math.round(actor.x - ix), bottom = Math.round(actor.y - iy) + 1;
  return { x, head: top, bounds: { x: x - Math.round(width / 2), y: top, w: width, h: bottom - top } };
}

function reactionBlockers(dialog, L) {
  const blocks = [{ x: 0, y: 0, w: VW, h: 50 }, { x: L.x, y: L.y, w: L.w, h: L.h + 3 }];
  if (dialog.W) blocks.push({ x: L.nameX, y: L.y - 14, w: textW(dialog.W.n) + 18, h: 21 });
  if (dialog.code) {
    const m = measureCode(dialog.code, VW - 12);
    blocks.push({ x: Math.round((VW - m.w) / 2), y: L.y - m.h - L.headerGap, w: m.w + 2, h: m.h + 3 });
  }
  if (chapterT > 0) blocks.push({ x: 0, y: Math.round(VH * .3), w: VW, h: 46 });
  else if (bannerT > 0) { const w = textW(bannerText) + 40; blocks.push({ x: Math.round((VW - w) / 2), y: 54, w, h: 20 }); }
  return blocks;
}

function reactionPlacement(dialog, L = dialog.layout()) {
  const cue = dialog.reaction;
  if (!cue || cue.age >= cue.duration) return null;
  const actor = reactionWorldActor(cue.who, dialog), blocks = reactionBlockers(dialog, L);
  const safe = r => r.x >= 4 && r.y >= 4 && r.x + r.w <= VW - 4 && r.y + r.h <= VH - 4 && !blocks.some(b => reactionOverlap(r, b));
  if (cue.anchor !== 'portrait' && actor && safe(actor.bounds)) {
    const r = { x: clamp(actor.x - 12, 4, VW - 28), y: actor.head - 31, w: REACTION_SIZE.w, h: REACTION_SIZE.h + 3 };
    // 包含弹入的 3px 位移，不能先安全、动画时再碰到姓名牌或代码框。
    if (safe(r)) { cue.anchor = 'world'; return { x: r.x, y: r.y, w: REACTION_SIZE.w, h: REACTION_SIZE.h, anchor: 'world', who: cue.who }; }
  }
  // 标记行固定给姓名牌左侧留槽；过期、分页、旋转都不挪动文字或头像。
  // 一旦降级为头像位置，本句不再跳回世界；横幅消失或旋转不能重播/搬动提示。
  cue.anchor = 'portrait';
  return { x: L.x + 8, y: L.y - 29, w: REACTION_SIZE.w, h: REACTION_SIZE.h, anchor: 'portrait', who: cue.who };
}

function drawReaction(g, dialog, L) {
  const cue = dialog.reaction, p = reactionPlacement(dialog, L);
  if (!p) return;
  const still = reducedMotion(), enter = Math.min(1, cue.age / .2);
  const x = Math.round(p.x), y = Math.round(p.y + (still ? 0 : 3 * (1 - enter) ** 2));
  g.save();
  g.globalAlpha = still ? 1 : Math.min(1, Math.max(.35, cue.age / .08), (cue.duration - cue.age) / .18);
  g.fillStyle = '#091d27'; g.fillRect(x + 2, y + 2, 22, 20); g.fillRect(x + 9, y + 21, 4, 4);
  g.fillStyle = '#655b4c'; g.fillRect(x + 2, y, 18, 22); g.fillRect(x, y + 2, 22, 18);
  g.fillStyle = '#fff1d3'; g.fillRect(x + 2, y + 2, 18, 18); g.fillRect(x + 10, y + 21, 2, 2);
  g.fillStyle = '#fffaf0'; g.fillRect(x + 3, y + 2, 16, 2);
  const pixel = (a, b, w = 1, h = 1) => g.fillRect(x + a, y + b, w, h);
  g.fillStyle = REACTION_COLORS[cue.emotion];
  switch (cue.emotion) {
    case 'surprise': pixel(9, 4, 4, 8); pixel(10, 12, 2, 1); pixel(9, 15, 4, 3); break;
    case 'question': pixel(7, 4, 7, 2); pixel(5, 6, 3, 3); pixel(13, 6, 3, 5); pixel(10, 10, 5, 2); pixel(9, 12, 3, 2); pixel(9, 16, 3, 2); break;
    case 'anger':
      [[4, 5, 5, 2], [7, 5, 2, 4], [13, 4, 2, 5], [13, 7, 5, 2], [4, 13, 5, 2], [7, 13, 2, 5], [13, 13, 5, 2], [13, 13, 2, 5]].forEach(r => pixel(...r)); break;
    case 'idea':
      pixel(8, 5, 6, 8); pixel(6, 7, 10, 4); pixel(9, 13, 4, 2); pixel(8, 2, 1, 2); pixel(3, 6, 2, 1); pixel(17, 6, 2, 1);
      g.fillStyle = '#8a7453'; pixel(9, 15, 4, 2); pixel(10, 18, 2, 1); g.fillStyle = '#fff9e8'; pixel(8, 7, 2, 3); break;
    case 'sweat':
      pixel(11, 3, 2, 3); pixel(9, 6, 5, 3); pixel(7, 9, 8, 6); pixel(9, 15, 5, 2);
      g.fillStyle = '#c9f3f3'; pixel(9, 9, 2, 4); break;
    case 'joy':
      pixel(8, 4, 2, 12); pixel(4, 9, 10, 2); pixel(6, 7, 6, 6); g.fillStyle = '#d77972'; pixel(16, 4, 1, 5); pixel(14, 6, 5, 1); pixel(16, 14, 2, 4); pixel(15, 15, 4, 2); break;
  }
  g.restore();
}
