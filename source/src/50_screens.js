/* ============================================================
 * 50 画面：标题、开场/结局房间、知识卡、笔记、暂停、确认
 * ============================================================ */

/* ---------- 大标题 Logo ---------- */
let LOGO = null;
function makeLogo(text, scale) {
  const w = textW(text) + 4, h = 16;
  const [a, ax] = makeCanvas(w, h); ax.font = FONT; ax.textBaseline = 'alphabetic'; ax.fillStyle = '#fff'; ax.fillText(text, 2, 12);
  // 二值化，去掉抗锯齿
  const id = ax.getImageData(0, 0, w, h); for (let i = 3; i < id.data.length; i += 4) id.data[i] = id.data[i] > 100 ? 255 : 0; ax.putImageData(id, 0, 0);
  const W = w * scale + 8, H = h * scale + 10;
  const [c, x] = makeCanvas(W, H);
  const big = (dx, dy) => x.drawImage(a, 0, 0, w, h, 4 + dx, 4 + dy, w * scale, h * scale);
  // 阴影与描边
  x.globalAlpha = 1;
  const [tint, tx] = makeCanvas(W, H);
  const solidCopy = col => { tx.clearRect(0, 0, W, H); tx.globalCompositeOperation = 'source-over'; tx.drawImage(a, 0, 0, w, h, 4, 4, w * scale, h * scale); tx.globalCompositeOperation = 'source-in'; tx.fillStyle = col; tx.fillRect(0, 0, W, H); return tint; };
  const sh = solidCopy('#1a1222'); for (const [dx, dy] of [[0, 4], [2, 4], [-2, 4], [0, 5]]) x.drawImage(sh, dx, dy);
  const ol = solidCopy('#3a1e1a'); for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2], [-2, -2], [2, 2], [-2, 2], [2, -2]]) x.drawImage(ol, dx, dy);
  const ol2 = solidCopy('#b5521b'); for (const [dx, dy] of [[0, 2], [1, 2], [-1, 2]]) x.drawImage(ol2, dx, dy);
  // 渐变填充
  tx.clearRect(0, 0, W, H); tx.globalCompositeOperation = 'source-over'; tx.drawImage(a, 0, 0, w, h, 4, 4, w * scale, h * scale); tx.globalCompositeOperation = 'source-in';
  const gr = tx.createLinearGradient(0, 4, 0, 4 + 12 * scale); gr.addColorStop(0, '#fff6b0'); gr.addColorStop(.45, '#ffd23f'); gr.addColorStop(.5, '#ffb52a'); gr.addColorStop(1, '#ff8a2a');
  tx.fillStyle = gr; tx.fillRect(0, 0, W, H);
  x.drawImage(tint, 0, 0);
  // 高光
  x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(255,255,255,.55)'; for (let yy = 4 + scale; yy < 4 + scale * 3; yy += scale) x.fillRect(0, yy, W, Math.max(1, scale / 3 | 0)); x.globalCompositeOperation = 'source-over';
  void big;
  return c;
}

/* ---------- 开机：点击开始 ---------- */
class BootScreen extends Screen {
  constructor(ready) { super(); this.ready = ready; }
  update(dt) { this.t += dt; if (this.ready() && (Input.hit('ok') || Input.pointer.click || Input.hit('back'))) { Audio.unlock(); closeScreen(this); } }
  draw(g) {
    g.fillStyle = '#0b0912'; g.fillRect(0, 0, VW, VH);
    const im = xaFrame(Math.floor(this.t * 3) % 2, 0, 'happy'); g.drawImage(im, Math.round(VW / 2 - 16), Math.round(VH / 2 - 48), 32, 40);
    if (!this.ready()) { txt(g, '正在搭建代码村' + '.'.repeat(1 + Math.floor(this.t * 3) % 3), VW / 2, VH / 2 + 2, UIC.dim, { align: 'center' }); return; }
    if (Math.floor(this.t * 2) % 2 === 0 || this.t < .5) txt(g, TOUCH ? '轻点屏幕开始' : '按任意键 / 点击开始', VW / 2, VH / 2 + 2, UIC.text, { align: 'center' });
    txt(g, '建议打开声音', VW / 2, VH / 2 + 22, UIC.dim, { align: 'center' });
  }
}

/* ---------- 标题 ---------- */
class TitleScreen extends Screen {
  constructor() { super(); this.refreshSave(); }
  refreshSave() {
    const s = loadSave(), has = hasProgress(s), opts = [];
    if (has) opts.push(['继续冒险', () => this.finish('continue')]);
    opts.push(['开始新冒险', async () => { if (hasProgress(loadSave())) { const ok = await confirm('开始新冒险会清空现在的存档，确定吗？'); if (!ok) return; } this.finish('new'); }]);
    opts.push(['声音设置', () => openScreen(new SoundScreen())]);
    this.btns = opts.map(([label, fn]) => new Btn({ label, w: 120, h: 20, onPress: fn }));
    this.focus = 0; this.hasSave = has;
    this.info = has ? `存档：${REGIONS[regionOf(Math.min(s.done, NZ - 1))].name.split(' · ')[0]} · 术语 ${s.terms.filter(id => TERMS.some(c => c.id === id)).length}/${TERMS.length}` : '';
  }
  finish(v) { closeScreen(this, v); }
  update(dt) { this.t += dt; this.nav(); }
  draw(g) {
    const gr = g.createLinearGradient(0, 0, 0, VH); gr.addColorStop(0, 'rgba(12,8,30,.15)'); gr.addColorStop(.6, 'rgba(12,8,30,.35)'); gr.addColorStop(1, 'rgba(12,8,30,.85)'); g.fillStyle = gr; g.fillRect(0, 0, VW, VH);
    const sc = PORTRAIT ? 3 : 4;
    if (!LOGO || LOGO.s !== sc) { LOGO = makeLogo('代码村大冒险', sc); LOGO.s = sc; }
    const ly = Math.round((PORTRAIT ? VH * .2 : 30) + Math.sin(this.t * 1.6) * 2);
    const k = Math.min(1, this.t * 1.5);
    g.globalAlpha = k; g.drawImage(LOGO, Math.round((VW - LOGO.width) / 2), ly - Math.round((1 - easeOut(k)) * 20));
    txt(g, '— 0 基础也能玩懂的氛围编程冒险 —', VW / 2, ly + LOGO.height + 2, '#f4e9cc', { align: 'center' });
    g.globalAlpha = 1;
    const by = PORTRAIT ? Math.round(VH * .55) : ly + LOGO.height + 30;
    this.btns.forEach((b, i) => { b.x = Math.round(VW / 2 - b.w / 2); b.y = by + i * 26; });
    this.drawBtns(g);
    if (this.info) txt(g, this.info, VW / 2, by + this.btns.length * 26 + 4, 'rgba(244,233,204,.75)', { align: 'center' });
    txt(g, 'v3.1', VW - 6, VH - 16, 'rgba(244,233,204,.5)', { align: 'right', shadow: null });
    txt(g, TOUCH ? '轻点选择' : '方向键选择 · 空格确认', 6, VH - 16, 'rgba(244,233,204,.6)', { shadow: null });
  }
}
class SoundScreen extends Screen {
  constructor() { super(); this.mk(); }
  mk() {
    this.btns = [
      new Btn({ label: `背景音乐：${Audio.music ? '开' : '关'}`, w: 130, h: 20, onPress: () => { Audio.setMusic(!Audio.music); this.mk(); this.focus = 0; } }),
      new Btn({ label: `音效：${Audio.effects ? '开' : '关'}`, w: 130, h: 20, onPress: () => { Audio.setSfx(!Audio.effects); this.mk(); this.focus = 1; } }),
      new Btn({ label: '返回', w: 130, h: 20, style: 'primary', onPress: () => closeScreen(this) }),
    ];
  }
  update(dt) { this.t += dt; if (Input.hit('back')) { Audio.sfx('back'); closeScreen(this); return; } this.nav(); }
  draw(g) {
    this.dimBg(g, .5);
    const w = 170, h = 112, x = Math.round((VW - w) / 2), y = Math.round((VH - h) / 2);
    win(g, x, y, w, h); txt(g, '声音设置', VW / 2, y + 8, UIC.gold, { align: 'center' });
    this.btns.forEach((b, i) => { b.x = x + 20; b.y = y + 28 + i * 26; }); this.drawBtns(g);
  }
}
class ConfirmScreen extends Screen {
  constructor(text) { super(); this.text = text; this.btns = [new Btn({ label: '确定', w: 64, h: 20, style: 'primary', onPress: () => closeScreen(this, true) }), new Btn({ label: '取消', w: 64, h: 20, onPress: () => closeScreen(this, false) })]; this.focus = 1; }
  update(dt) { this.t += dt; if (Input.hit('back')) { closeScreen(this, false); return; } this.nav(); }
  draw(g) {
    this.dimBg(g, .55);
    const w = Math.min(VW - 24, 260), lines = wrap(this.text, w - 24), h = lines.length * LH + 56, x = Math.round((VW - w) / 2), y = Math.round((VH - h) / 2);
    win(g, x, y, w, h); drawLines(g, lines, x + 12, y + 10);
    this.btns[0].x = Math.round(VW / 2 - 70); this.btns[1].x = Math.round(VW / 2 + 6); this.btns.forEach(b => b.y = y + h - 28); this.drawBtns(g);
  }
}
const confirm = text => openScreen(new ConfirmScreen(text));

/* ---------- 术语卡 ---------- */
const RCOL = ['#b5521b', '#2a6aa8', '#7a3ab0', '#2a7a4a', '#c43a3a', '#2a5a9a'];
function termCardHeight(c, w) { return 54 + wrap(c.d, w - 18).length * 13 + 8 + wrap('「' + c.ai + '」', w - 30).length * 13 + 22; }
function drawTermCard(g, c, x, y, w, { tag = '' } = {}) {
  const h = termCardHeight(c, w), rc = RCOL[c.r] || RCOL[0], hidden = c.r === 5;
  g.fillStyle = 'rgba(6,4,14,.5)'; g.fillRect(x + 3, y + 4, w, h);
  g.fillStyle = shade(rc, .7); g.fillRect(x, y, w, h);
  g.fillStyle = hidden ? '#e4f0ff' : UIC.paper; g.fillRect(x + 2, y + 2, w - 4, h - 4);
  g.fillStyle = mix(rc, '#ffffff', .65); g.fillRect(x + 4, y + 4, w - 8, 1); g.fillRect(x + 4, y + h - 5, w - 8, 1);
  const ink = '#2a2030';
  g.fillStyle = '#fffaf0'; g.fillRect(x + 8, y + 9, 36, 36); g.fillStyle = mix(rc, '#ffffff', .5); g.fillRect(x + 8, y + 44, 36, 1); g.fillRect(x + 43, y + 9, 1, 36);
  icon(g, c.id, x + 10, y + 11, 2);
  txt(g, tag, x + 52, y + 8, rc, { shadow: null });
  txt(g, c.t, x + 52, y + 21, ink, { shadow: null });
  txt(g, sp('像', c.a.replace(/^像/, '')), x + 52, y + 34, rc, { shadow: null });
  let yy = y + 52;
  const L = wrap(c.d, w - 18, ink, rc); drawLines(g, L, x + 9, yy, { shadow: null, lh: 13 }); yy += L.length * 13 + 6;
  g.fillStyle = mix(rc, '#ffffff', .82); const Q = wrap('「' + c.ai + '」', w - 30, '#3a3450'); g.fillRect(x + 7, yy, w - 14, Q.length * 13 + 18);
  txt(g, 'AI 可能会这么说：', x + 11, yy + 2, rc, { shadow: null });
  drawLines(g, Q, x + 13, yy + 15, { shadow: null, lh: 13 });
  return h;
}
class CardScreen extends Screen {
  constructor(list) {
    super(); this.list = list; this.i = 0; this.mk();
  }
  mk() { this.btns = [new Btn({ label: this.i < this.list.length - 1 ? '下一张 ▶' : '收下 ▶', w: 84, h: 20, style: 'primary', onPress: () => { if (this.i < this.list.length - 1) { this.i++; this.t = 0; Audio.sfx('card'); this.mk(); } else closeScreen(this); } })]; }
  onOpen() { Audio.sfx('card'); this.fx(); }
  fx() { burst(VW / 2, VH / 2 - 20, 40, { colors: ['#ffd23f', '#ffffff', '#7ad0ff', '#ff8ab0'], min: 40, max: 160, g: 60, life: 1.4, size: 2, glow: true }); parts.slice(-40).forEach(p => p.layer = 'ui'); }
  update(dt) { this.t += dt; if (Math.random() < dt * 10) emit({ layer: 'ui', kind: 'spark', x: rand(VW), y: -4, vx: rand(-10, 10), vy: rand(30, 70), life: 3, max: 3, c: pick(['#ffd23f', '#fff6c0']), size: 1, glow: true, fade: 1 }); if (this.t > .4) this.nav(); }
  draw(g) {
    this.dimBg(g, .72);
    const c = this.list[this.i], hidden = c.r === 5;
    g.save(); g.translate(VW / 2, VH / 2 - 10); g.rotate(this.t * .3); g.globalCompositeOperation = 'lighter'; g.globalAlpha = .12;
    for (let i = 0; i < 12; i++) { g.rotate(Math.PI / 6); g.fillStyle = hidden ? '#7ad0ff' : '#ffd23f'; g.beginPath(); g.moveTo(0, 0); g.lineTo(-14, -300); g.lineTo(14, -300); g.fill(); }
    g.restore(); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    const w = Math.min(VW - 24, 290), h = termCardHeight(c, w);
    const k = easeOutBack(Math.min(1, this.t * 2.4)), sx = Math.round(VW / 2), sy = Math.round(VH / 2 - 12);
    txt(g, (hidden ? '发现隐藏术语！' : '收集到新术语！') + (this.list.length > 1 ? `  ${this.i + 1}/${this.list.length}` : ''), VW / 2, sy - h / 2 - 20, hidden ? UIC.sky : UIC.gold, { align: 'center' });
    g.save(); g.translate(sx, sy); g.scale(Math.max(.01, k), Math.max(.01, k));
    drawTermCard(g, c, -Math.round(w / 2), -Math.round(h / 2), w, { tag: hidden ? `隐藏术语 ${bonusCount()}/${HIDDEN.length}` : `术语图鉴 ${mainCount()}/${TERMS.length}` });
    g.restore();
    const b = this.btns[0]; b.x = Math.round(VW / 2 - b.w / 2); b.y = Math.min(VH - 24, Math.round(sy + h / 2 + 6)); if (this.t > .4) this.drawBtns(g);
  }
}
function giveTerms(ids) {
  const list = [];
  ids.forEach(id => { if (!G.terms.includes(id)) G.terms.push(id); list.push(findTerm(id)); });
  save(); checkCollectAch();
  return openScreen(new CardScreen(list));
}

/* ---------- 术语图鉴 ---------- */
const TABS = ['点子', '网络', 'AI', '工程', '发射', '隐藏', '成就'];
class GlossaryScreen extends Screen {
  constructor() { super(); this.tab = 0; this.sel = null; this.mk(); }
  items() { return this.tab === 5 ? HIDDEN : TERMS.filter(t => t.r === this.tab); }
  mk(keepFocus) {
    const tabs = TABS.map((l, i) => new Btn({ label: l, w: 34, h: 18, tabI: i, style: i === this.tab ? 'primary' : 'btn', onPress: () => { this.tab = i; this.mk(); this.focus = i; } }));
    const tiles = this.tab === 6 ? [] : this.items().map(c => new Btn({ w: 30, h: 30, label: '', card: c, onPress: () => {} }));
    this.btns = tabs.concat(tiles, [new Btn({ label: '合上', w: 56, h: 20, style: 'primary', close: true, onPress: () => closeScreen(this) })]);
    if (!keepFocus) this.focus = this.tab;
  }
  update(dt) {
    this.t += dt;
    if (Input.hit('back') || Input.hit('note')) { Audio.sfx('back'); closeScreen(this); return; }
    const before = this.focus; this.nav();
    const b = this.btns[this.focus]; if (b && b.card) this.sel = b.card; else if (before !== this.focus && b && b.tabI !== undefined) {}
  }
  draw(g) {
    this.dimBg(g, .75);
    win(g, 4, 4, VW - 8, VH - 8, 'dlg');
    txt(g, `术语图鉴  ${mainCount()}/${TERMS.length}`, 12, 10, UIC.gold);
    txt(g, `隐藏 ${bonusCount()}/${HIDDEN.length} · 成就 ${G.ach.length}/${ACH.length}`, VW - 12, 10, UIC.dim, { align: 'right' });
    const P = PORTRAIT, cell = 34;
    let tx = 10, ty = 28;
    this.btns.forEach(b => { if (b.tabI !== undefined) { b.x = tx; b.y = ty; tx += 37; if (tx + 34 > VW - 8) { tx = 10; ty += 22; } } });
    const gy = ty + 28, cols = P ? Math.floor((VW - 20) / cell) : 5, gx = 12;
    const tiles = this.btns.filter(b => b.card);
    tiles.forEach((b, i) => { b.x = gx + (i % cols) * cell; b.y = gy + Math.floor(i / cols) * cell; });
    const close = this.btns[this.btns.length - 1]; close.x = VW - close.w - 12; close.y = VH - 28;
    this.btns.forEach((b, i) => {
      const f = i === this.focus && Input.device !== 'touch';
      b.draw(g, f, this.t);
      if (b.card) { const got = G.terms.includes(b.card.id); icon(g, got ? b.card.id : 'lock', b.x + 7, b.y + 6 + (f ? -1 : 0)); }
    });
    if (this.tab === 6) { this.drawAch(g, 12, gy, VW - 24); return; }
    const rows = Math.ceil(tiles.length / cols);
    const dx = P ? 10 : gx + cols * cell + 8, dy = P ? gy + rows * cell + 8 : gy, dw = P ? VW - 20 : VW - dx - 12;
    const c = this.sel && this.items().includes(this.sel) ? this.sel : null;
    if (!c) { txt(g, this.tab === 5 ? '隐藏术语：找头上有蓝色 ? 的村民' : REGIONS[this.tab].name, dx, dy + 4, UIC.dim); txt(g, '选一个图标看看详情', dx, dy + 22, UIC.dim); return; }
    if (G.terms.includes(c.id)) drawTermCard(g, c, dx, dy, dw, { tag: c.r === 5 ? '隐藏术语' : REGIONS[c.r].name.split(' · ')[1] });
    else { win(g, dx, dy, dw, 50, 'dark'); txt(g, '还没收集到', dx + 10, dy + 10, UIC.dim); txt(g, c.r === 5 ? '找到头上有蓝色 ? 的村民就能拿到' : '继续冒险就能拿到', dx + 10, dy + 28, UIC.dim); }
  }
  drawAch(g, x, y, w) {
    const colW = PORTRAIT ? w : Math.floor((w - 8) / 2);
    ACH.forEach((a, i) => {
      const cx = x + (PORTRAIT ? 0 : (i % 2) * (colW + 8)), cy = y + (PORTRAIT ? i : Math.floor(i / 2)) * 33, got = G.ach.includes(a.id);
      win(g, cx, cy, colW, 31, got ? 'gold' : 'dark');
      drawTrophy(g, cx + 6, cy + 8, got);
      txt(g, got ? a.n : '？？？', cx + 24, cy + 3, got ? UIC.gold : UIC.dim);
      g.save(); g.beginPath(); g.rect(cx + 24, cy, colW - 28, 31); g.clip(); txt(g, a.d, cx + 24, cy + 16, got ? UIC.text : '#6a6888', { shadow: null }); g.restore();
    });
  }
}
function drawTrophy(g, x, y, got) {
  const c = got ? ['#9c6a12', '#e0a92a', '#ffe07a'] : ['#3a3458', '#4a4468', '#5a5478'];
  g.fillStyle = c[1]; g.fillRect(x + 2, y, 10, 7); g.fillRect(x + 4, y + 7, 6, 2); g.fillRect(x + 6, y + 9, 2, 3); g.fillRect(x + 3, y + 12, 8, 2);
  g.fillStyle = c[2]; g.fillRect(x + 3, y + 1, 2, 4); g.fillStyle = c[0]; g.fillRect(x, y + 1, 2, 4); g.fillRect(x + 12, y + 1, 2, 4);
}
const openNotebook = () => openScreen(new GlossaryScreen());

/* ---------- App 进度 ---------- */
const BOSS_LIST = [4, 9, 15, 20, 24];
const appStage = () => BOSS_LIST.filter(z => G.done > z).length;
let appNew = false;
const APP_STEPS = [
  { t: '想清楚要做什么', d: '写下需求，画出原型，挑出 MVP（最小可用版本）。', k: ['req', 'proto', 'mvp'] },
  { t: '网页和后厨搭起来了', d: '前端能看菜单、下单；后端算钱；数据库记住每一笔订单。', k: ['frontend', 'backend', 'db', 'api'] },
  { t: '请来了 AI 客服', d: '大模型 + 提示词 + 知识库：会按店里的菜单推荐奶茶，不瞎编。', k: ['llm', 'prompt', 'rag'] },
  { t: '改代码不怕出事了', d: '每次改动都存档；密钥锁进保险箱；有测试兜底。', k: ['git', 'env', 'test'] },
  { t: '正式上线！', d: '部署到服务器，绑上域名，全世界都能打开。', k: ['deploy', 'domain', 'rollback'] },
];
function drawPhone(g, x, y, w, h, stage, t) {
  g.fillStyle = 'rgba(6,4,14,.5)'; g.fillRect(x + 4, y + 5, w, h);
  g.fillStyle = '#1a1222'; g.fillRect(x, y, w, h); g.fillStyle = '#3a3446'; g.fillRect(x + 1, y + 1, w - 2, h - 2);
  g.fillStyle = '#1a1222'; g.fillRect(x + w / 2 - 10, y + 4, 20, 3);
  const sx = x + 5, sy = y + 10, sw = w - 10, sh = h - 20;
  g.save(); g.beginPath(); g.rect(sx, sy, sw, sh); g.clip();
  if (stage === 0) {
    g.fillStyle = '#242038'; g.fillRect(sx, sy, sw, sh);
    const b = Math.sin(t * 3) * 2; g.globalCompositeOperation = 'lighter'; g.globalAlpha = .4; g.drawImage(glowSprite('#ffe07a'), sx + sw / 2 - 30, sy + sh / 2 - 40 + b, 60, 60); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    g.fillStyle = '#ffe07a'; g.beginPath(); g.arc(sx + sw / 2, sy + sh / 2 - 12 + b, 10, 0, 6.28); g.fill(); g.fillStyle = '#8a8fa8'; g.fillRect(sx + sw / 2 - 5, sy + sh / 2 - 2 + b, 10, 6);
    txt(g, '只有一个想法', sx + sw / 2, sy + sh / 2 + 14, UIC.text, { align: 'center' });
  } else if (stage === 1) {
    g.fillStyle = '#f4f0e6'; g.fillRect(sx, sy, sw, sh);
    g.strokeStyle = '#8a8fa8'; g.setLineDash([3, 2]); g.lineWidth = 1;
    const box = (bx, by, bw, bh, label) => { g.strokeRect(sx + bx + .5, sy + by + .5, bw, bh); txt(g, label, sx + bx + 4, sy + by + 3, '#6a6e84', { shadow: null }); };
    box(4, 4, sw - 9, 16, '标题'); [0, 1, 2].forEach(i => box(4, 26 + i * 24, sw - 9, 20, '菜单 ' + (i + 1))); box(4, 104, sw - 9, 18, '下单'); box(4, 128, sw - 9, 18, '付款');
    g.setLineDash([]);
    txt(g, '草图', sx + sw - 30, sy + sh - 16, '#e05a5a', { shadow: null });
  } else {
    g.fillStyle = '#fffaf0'; g.fillRect(sx, sy, sw, sh);
    let yy = sy;
    if (stage >= 5) { g.fillStyle = '#e8ecf6'; g.fillRect(sx, yy, sw, 14); g.fillStyle = '#ffffff'; g.fillRect(sx + 3, yy + 2, sw - 6, 10); txt(g, 'duckduck.app', sx + 6, yy + 1, '#3a7ae0', { shadow: null }); yy += 14; }
    g.fillStyle = '#ffd23f'; g.fillRect(sx, yy, sw, 18); txt(g, '鸭鸭点餐', sx + 6, yy + 3, '#2a1e10', { shadow: null });
    if (stage >= 4) { txt(g, 'v1.0', sx + sw - 30, yy + 3, '#8a6a10', { shadow: null }); }
    yy += 22;
    [['抹茶拿铁', '#5ad06a', '¥14'], ['珍珠奶茶', '#c98e57', '¥12'], ['芒果冰沙', '#ffb43a', '¥16']].forEach(([n, c, p]) => {
      g.fillStyle = '#f0eadc'; g.fillRect(sx + 3, yy, sw - 6, 20); g.fillStyle = c; g.fillRect(sx + 6, yy + 3, 12, 14); g.fillStyle = '#ffffff'; g.fillRect(sx + 8, yy + 5, 3, 3);
      txt(g, n, sx + 22, yy + 4, '#2a2030', { shadow: null }); txt(g, p, sx + sw - 8, yy + 4, '#e05a5a', { shadow: null, align: 'right' }); yy += 23;
    });
    g.fillStyle = '#e05a5a'; g.fillRect(sx + 6, yy, sw - 12, 16); txt(g, '下单', sx + sw / 2, yy + 2, '#ffffff', { shadow: null, align: 'center' }); yy += 20;
    txt(g, '订单已存进数据库', sx + 5, yy, '#2a7a4a', { shadow: null }); yy += 16;
    if (stage >= 3) {
      g.fillStyle = '#dff6ff'; g.fillRect(sx + 4, yy, sw - 8, 30); g.drawImage(xaFrame(0, Math.floor(t * 4) % 2, 'happy'), sx + 5, yy + 4, 14, 18);
      const L = wrap('推荐你试试少糖的抹茶拿铁～', sw - 30, '#1a4a6a'); drawLines(g, L.slice(0, 2), sx + 22, yy + 3, { shadow: null, lh: 13 }); yy += 34;
    }
    if (stage >= 5) { g.fillStyle = '#5ad06a'; g.fillRect(sx + 4, sy + sh - 16, 6, 6); txt(g, `在线 ${128 + Math.floor(t * 3) % 40} 人`, sx + 13, sy + sh - 19, '#2a7a4a', { shadow: null }); }
  }
  g.restore();
}
class AppScreen extends Screen {
  constructor(upgraded) { super(); this.up = upgraded; this.btns = [new Btn({ label: upgraded ? '太棒了 ▶' : '关闭', w: 76, h: 20, style: 'primary', onPress: () => closeScreen(this) })]; appNew = false; }
  onOpen() { if (this.up) { Audio.sfx('app'); for (let i = 0; i < 3; i++) { burst(VW / 2, VH / 2, 30, { colors: ['#ffd23f', '#ff8ab0', '#7ad0ff', '#7dffa6'], min: 60, max: 200, g: 120, life: 1.6, size: 2 }); } parts.slice(-90).forEach(p => p.layer = 'ui'); } }
  update(dt) { this.t += dt; if (Input.hit('back')) { closeScreen(this); return; } this.nav(); }
  draw(g) {
    this.dimBg(g, .78);
    const st = appStage(), P = PORTRAIT;
    const pw = 120, ph = Math.min(220, VH - (P ? 250 : 60));
    const px = P ? Math.round(VW / 2 - pw / 2) : 20, py = P ? 40 : Math.round((VH - ph) / 2);
    txt(g, this.up ? 'App 升级了！' : '鸭鸭点餐 App 的进度', P ? VW / 2 : px + pw / 2, py - 18, UIC.gold, { align: 'center' });
    const k = this.up ? easeOutBack(Math.min(1, this.t * 2)) : 1;
    g.save(); g.translate(px + pw / 2, py + ph / 2); g.scale(k, k); drawPhone(g, -pw / 2, -ph / 2, pw, ph, st, this.t); g.restore();
    const lx = P ? 10 : px + pw + 18, ly = P ? py + ph + 12 : py, lw = P ? VW - 20 : VW - lx - 14;
    let yy = ly;
    APP_STEPS.forEach((s, i) => {
      const got = i < st, cur = i === st - 1;
      const L = wrap(s.d, lw - 26, got ? UIC.text : '#5a5878');
      const hh = 16 + (got ? L.length * 13 : 0) + 6;
      win(g, lx, yy, lw, hh, cur && this.up ? 'gold' : 'dark');
      g.fillStyle = got ? UIC.mint : '#3a3458'; g.fillRect(lx + 6, yy + 5, 9, 9); if (got) { g.fillStyle = '#123a26'; g.fillRect(lx + 8, yy + 9, 2, 2); g.fillRect(lx + 10, yy + 10, 2, 2); g.fillRect(lx + 12, yy + 7, 1, 3); }
      txt(g, `第${i + 1}步  ${got ? s.t : '？？？'}`, lx + 20, yy + 3, got ? (cur ? UIC.gold : UIC.text) : UIC.dim);
      if (got) drawLines(g, L, lx + 20, yy + 17, { lh: 13 });
      yy += hh + 3;
    });
    const b = this.btns[0]; b.x = P ? Math.round(VW / 2 - b.w / 2) : VW - b.w - 14; b.y = Math.min(VH - 26, P ? yy + 6 : VH - 28);
    this.drawBtns(g);
  }
}
const openApp = up => openScreen(new AppScreen(up));

/* ---------- 成就 ---------- */
function unlock(id) {
  if (G.ach.includes(id)) return;
  const a = ACH.find(a => a.id === id); if (!a) return;
  G.ach.push(id); save(); Audio.sfx('ach'); toast('成就解锁：' + a.n, UIC.gold);
  if (G.ach.length === ACH.length - 1 && !G.ach.includes('allach')) {}
}
function checkCollectAch() {
  if (mainCount() >= TERMS.length) unlock('allterms');
  if (bonusCount() >= HIDDEN.length) unlock('allhidden');
}

/* ---------- 暂停 ---------- */
class PauseScreen extends Screen {
  constructor() { super(); this.mk(); }
  mk() {
    const f = this.focus;
    const hatName = G.hat ? HATS[G.hat].n : (G.hats.length ? '不戴' : '还没有');
    this.btns = [
      new Btn({ label: '继续游戏', w: 150, h: 20, style: 'primary', onPress: () => closeScreen(this) }),
      new Btn({ label: '保存进度', w: 150, h: 20, onPress: () => { save(true); Audio.sfx('ok'); toast('已保存到本机浏览器', UIC.mint); } }),
      new Btn({ label: '术语图鉴', w: 150, h: 20, onPress: () => openNotebook() }),
      new Btn({ label: 'App 进度', w: 150, h: 20, onPress: () => openApp(false) }),
      new Btn({ label: `小 A 的帽子：${hatName}`, w: 150, h: 20, disabled: !G.hats.length, onPress: () => { const opts = [''].concat(G.hats); G.hat = opts[(opts.indexOf(G.hat) + 1) % opts.length]; save(); this.mk(); } }),
      new Btn({ label: `背景音乐：${Audio.music ? '开' : '关'}`, w: 150, h: 20, onPress: () => { Audio.setMusic(!Audio.music); this.mk(); } }),
      new Btn({ label: `音效：${Audio.effects ? '开' : '关'}`, w: 150, h: 20, onPress: () => { Audio.setSfx(!Audio.effects); this.mk(); } }),
      new Btn({ label: '存档并回到标题', w: 150, h: 20, onPress: async () => { save(true); closeScreen(this, 'title'); } }),
    ];
    this.focus = f || 0;
  }
  update(dt) { this.t += dt; if (Input.hit('back')) { Audio.sfx('back'); closeScreen(this); return; } this.nav(); }
  draw(g) {
    this.dimBg(g, .55);
    const w = 190, h = 28 + this.btns.length * 25 + 6, x = Math.round((VW - w) / 2), y = Math.round((VH - h) / 2) - 6;
    win(g, x, y, w, h); txt(g, '暂停', VW / 2, y + 8, UIC.gold, { align: 'center' });
    this.btns.forEach((b, i) => { b.x = x + 20; b.y = y + 28 + i * 25; }); this.drawBtns(g);
    const mm = Math.floor(G.t / 60), ss = String(Math.floor(G.t % 60)).padStart(2, '0');
    txt(g, `冒险时间 ${mm}:${ss} · 术语 ${mainCount()}/${TERMS.length}`, VW / 2, y + h + 6, UIC.dim, { align: 'center' });
    txt(g, '每过一关自动存档到本机浏览器', VW / 2, y + h + 22, UIC.dim, { align: 'center' });
  }
}

/* ---------- 房间（开场 & 结局） ---------- */
const room = { mode: 'night', flicker: 0, warp: 0, t: 0 };
function drawRoom(g, dt) {
  room.t += dt;
  const night = room.mode === 'night', t = room.t;
  const cx = Math.round(VW / 2), floorY = Math.round(VH * .72);
  // 墙
  g.fillStyle = night ? '#1c1a36' : '#3a3050'; g.fillRect(0, 0, VW, VH);
  for (let x = 0; x < VW; x += 24) { g.fillStyle = night ? '#201e3e' : '#40365a'; g.fillRect(x, 0, 12, floorY); }
  // 窗
  const wx = cx - 150 < 8 ? 8 : cx - 150, wy = 24, ww = 70, wh = 60;
  g.fillStyle = '#5a4a3a'; g.fillRect(wx - 4, wy - 4, ww + 8, wh + 8);
  const sky = g.createLinearGradient(0, wy, 0, wy + wh);
  if (night) { sky.addColorStop(0, '#0a0e2a'); sky.addColorStop(1, '#2a2a5a'); } else { sky.addColorStop(0, '#ff9a6a'); sky.addColorStop(.6, '#ffd08a'); sky.addColorStop(1, '#fff0c0'); }
  g.fillStyle = sky; g.fillRect(wx, wy, ww, wh);
  if (night) { g.fillStyle = '#fff6d0'; g.beginPath(); g.arc(wx + 50, wy + 18, 8, 0, 6.28); g.fill(); g.fillStyle = '#2a2a5a'; g.beginPath(); g.arc(wx + 54, wy + 15, 7, 0, 6.28); g.fill(); for (let i = 0; i < 9; i++) { if (Math.sin(t * 2 + i * 7) > -.3) { g.fillStyle = '#ffffff'; g.fillRect(wx + (i * 23) % ww, wy + (i * 17) % (wh - 10), 1, 1); } } }
  else { g.fillStyle = '#fff8e0'; g.beginPath(); g.arc(wx + 35, wy + wh - 6, 14, 0, 6.28); g.fill(); }
  g.fillStyle = '#5a4a3a'; g.fillRect(wx + ww / 2 - 1, wy, 3, wh); g.fillRect(wx, wy + wh / 2 - 1, ww, 3);
  // 海报
  g.fillStyle = '#e8d8b8'; g.fillRect(cx + 90, 30, 40, 52); g.fillStyle = '#e05a5a'; g.fillRect(cx + 94, 36, 32, 20); icon(g, 'ai', cx + 102, 38); txt(g, 'AI', cx + 104, 60, '#2a2030', { shadow: null });
  // 地板
  g.fillStyle = night ? '#2a2034' : '#5a4436'; g.fillRect(0, floorY, VW, VH - floorY);
  for (let x = 0; x < VW; x += 28) { g.fillStyle = night ? '#241c2e' : '#4e3a2e'; g.fillRect(x, floorY, 1, VH - floorY); }
  // 桌子
  const dy = floorY - 34;
  g.fillStyle = '#6a4a32'; g.fillRect(cx - 90, dy, 180, 8); g.fillStyle = '#8a6242'; g.fillRect(cx - 90, dy, 180, 2);
  g.fillStyle = '#4a3222'; g.fillRect(cx - 84, dy + 8, 8, 40); g.fillRect(cx + 76, dy + 8, 8, 40);
  // 显示器
  const mx = cx - 44, my = dy - 66, mw = 88, mh = 60;
  g.fillStyle = '#c8c4b4'; g.fillRect(mx - 4, my - 4, mw + 8, mh + 8); g.fillStyle = '#e8e4d4'; g.fillRect(mx - 4, my - 4, mw + 8, 2);
  g.fillStyle = '#a8a494'; g.fillRect(cx - 12, my + mh + 4, 24, 4); g.fillRect(cx - 22, dy - 2, 44, 2);
  const fl = room.flicker > 0 && Math.random() < .5;
  g.fillStyle = fl ? pick(['#ff2fa0', '#22e6d0', '#ffffff']) : night ? '#0a1424' : '#0a1a10'; g.fillRect(mx, my, mw, mh);
  if (!fl) {
    if (night) { for (let i = 0; i < 7; i++) { const w = 20 + ((i * 37 + Math.floor(t * 3)) % 50); g.fillStyle = ['#ff8ad8', '#a8f08a', '#bfe6ff', '#ffd23f'][i % 4]; g.fillRect(mx + 6 + (i % 3) * 4, my + 6 + i * 7, w, 3); } }
    else { txt(g, '运行成功！', cx, my + 22, '#7dffa6', { align: 'center', shadow: null }); g.fillStyle = '#2a7a4a'; for (let i = 0; i < 3; i++) g.fillRect(mx + 10, my + 40 + i * 5, 30 + i * 12, 2); }
  }
  // 屏幕光
  g.globalCompositeOperation = 'lighter'; g.globalAlpha = night ? .35 : .15; g.drawImage(glowSprite(fl ? '#ff2fa0' : '#5ad1ff'), mx - 60, my - 50, mw + 120, mh + 120); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  // 杯子 & 鸭子
  g.fillStyle = '#e8e8f0'; g.fillRect(cx + 58, dy - 12, 10, 12); g.fillRect(cx + 68, dy - 9, 3, 6); g.fillStyle = '#6a4a32'; g.fillRect(cx + 59, dy - 11, 8, 2);
  if (!night || room.duckOnDesk) g.drawImage(duckFrame(Math.floor(t * 2) % 2, 0), cx - 80, dy - 17);
  // 人（背影）
  if (!room.noPlayer) { const im = charFrame('player', 1, 0); g.drawImage(im, cx - 18, dy - 22, 36, 60); }
  // 椅子
  g.fillStyle = '#3a3a5a'; g.fillRect(cx - 20, dy + 26, 40, 6); g.fillRect(cx - 3, dy + 32, 6, 16);
  // 暗角
  if (night) { g.globalCompositeOperation = 'multiply'; g.drawImage(glowSprite('#8a8ad8'), -VW * .2, -VH * .4, VW * 1.4, VH * 1.8); g.globalCompositeOperation = 'source-over'; }
  // 吸入特效
  if (room.warp > 0) {
    const k = room.warp;
    g.save(); g.translate(cx, my + mh / 2);
    for (let i = 0; i < 60 * k; i++) { const a = hash2(i, 1, 2) * 6.28 + t * (2 + k * 4), r = ((hash2(i, 2, 3) * 300 - t * 300 * (1 + k)) % 300 + 300) % 300; g.fillStyle = pick(['#ff2fa0', '#22e6d0', '#ffffff', '#ffd23f']); g.fillRect(Math.cos(a) * r, Math.sin(a) * r, 2 + k * 2, 2); }
    g.restore();
    g.fillStyle = `rgba(255,255,255,${clamp((k - .6) * 2.5, 0, 1)})`; g.fillRect(0, 0, VW, VH);
  }
  g.drawImage(vigCv, 0, 0);
}

/* ---------- 结局 ---------- */
class EndScreen extends Screen {
  constructor() {
    super();
    this.btns = [
      new Btn({ label: '回村里逛逛', w: 92, h: 20, style: 'primary', onPress: () => closeScreen(this, 'roam') }),
      new Btn({ label: '翻看图鉴', w: 92, h: 20, onPress: () => openNotebook() }),
      new Btn({ label: '从头再玩', w: 92, h: 20, onPress: async () => { if (await confirm('从头再玩会清空进度，确定吗？')) closeScreen(this, 'restart'); } }),
    ];
  }
  update(dt) { this.t += dt; if (Math.random() < dt * 14) emit({ layer: 'ui', kind: 'spark', x: rand(VW), y: -4, vx: rand(-15, 15), vy: rand(40, 90), life: 4, max: 4, c: pick(['#ffd23f', '#ff8ab0', '#7ad0ff', '#7dffa6']), size: 2, fade: 1 }); this.nav(); }
  draw(g) {
    this.dimBg(g, .72);
    const bc = bonusCount(), all = bc === HIDDEN.length && mainCount() === TERMS.length;
    const mm = Math.floor(G.t / 60), ss = String(Math.floor(G.t % 60)).padStart(2, '0');
    const w = Math.min(VW - 16, 460), x = Math.round((VW - w) / 2);
    const items = TERMS.filter(c => G.terms.includes(c.id)).concat(HIDDEN.filter(c => G.terms.includes(c.id)));
    const perRow = Math.floor((w - 24) / 19), rows = Math.ceil(items.length / perRow);
    const stat = `用时 ${mm} 分 ${ss} 秒 · 术语 ${mainCount()}/${TERMS.length} · 隐藏 ${bc}/${HIDDEN.length} · 成就 ${G.ach.length}/${ACH.length}`;
    const SL = textW(stat) > w - 20 ? [`用时 ${mm} 分 ${ss} 秒`, `术语 ${mainCount()}/${TERMS.length} · 隐藏 ${bc}/${HIDDEN.length} · 成就 ${G.ach.length}/${ACH.length}`] : [stat], ex = (SL.length - 1) * LH;
    const h = 104 + ex + rows * 19 + (all ? 0 : 16), y = Math.round(Math.max(6, (VH - h - (PORTRAIT ? 90 : 0)) / 2));
    win(g, x, y, w, h, 'dlg');
    const key = all ? 'A' : 'B'; if (!this.logo || this.logoKey !== key) { this.logo = makeLogo(all ? '完美通关！' : '通关！', 2); this.logoKey = key; }
    g.drawImage(this.logo, Math.round(VW / 2 - this.logo.width / 2), y + 6);
    SL.forEach((l, i) => txt(g, l, VW / 2, y + 46 + i * LH, UIC.text, { align: 'center' }));
    txt(g, '你现在听得懂这些行话了：', x + 12, y + 64 + ex, UIC.gold);
    items.forEach((c, i) => icon(g, c.id, x + 12 + (i % perRow) * 19, y + 80 + ex + Math.floor(i / perRow) * 19));
    if (!all) { const ML = wrap(`还有 ${TERMS.length + HIDDEN.length - items.length} 个术语没收集到，回村里找找头上有蓝色 ? 的人`, w - 24, UIC.sky); drawLines(g, ML.slice(0, 1), x + 12, y + 82 + ex + rows * 19); }
    this.btns.forEach((b, i) => { b.y = y + h + 8; b.x = Math.round(VW / 2 - 150 + i * 100); });
    if (PORTRAIT) this.btns.forEach((b, i) => { b.x = Math.round(VW / 2 - b.w / 2); b.y = y + h + 8 + i * 26; });
    this.drawBtns(g);
  }
}
