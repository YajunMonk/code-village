/* ============================================================
 * 52 小游戏：挑选、快问快答、提示词工坊、幻觉侦探、全景图、发射
 * ============================================================ */
function head(g, who, title, x, y) {
  drawPortrait(g, WHO[who].id, x + 8, y + 6, 22, false);
  txt(g, title, x + 36, y + 11, WHO[who].c);
  g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(x + 8, y + 31, VW - 32, 1);
}

/* ---------- 挑选题（MVP 背包、记事本、发射清单） ----------
 * cfg: { who, title, q, items:[{t, w, need, bad, why}], cap, unit, ok, showW, fail(missing, bads) }
 */
class PickScreen extends Screen {
  constructor(cfg) { super(); this.cfg = cfg; this.sel = new Set(); this.items = shuffle(cfg.items.slice()); this.mk(); }
  used() { let s = 0; this.sel.forEach(i => s += this.items[i].w || 1); return s; }
  mk() {
    const f = this.focus;
    this.btns = this.items.map((it, i) => new Btn({ label: it.t, it, idx: i, style: this.sel.has(i) ? 'primary' : 'chip', w: 100, h: 18, align: 'left', onPress: () => this.toggle(i) }));
    this.btns.push(new Btn({ label: this.cfg.go || '就这些 ▶', w: 92, h: 20, style: 'primary', onPress: () => this.submit() }));
    this.focus = f || 0;
  }
  toggle(i) {
    if (this.busy) return;
    if (this.sel.has(i)) { this.sel.delete(i); Audio.sfx('back'); }
    else {
      const w = this.items[i].w || 1;
      if (this.cfg.cap && this.used() + w > this.cfg.cap) { Audio.sfx('bad'); this.msg = `放不下了！最多 ${this.cfg.cap} ${this.cfg.unit || '个'}，先拿掉一些吧。`; this.msgT = 2.5; return; }
      this.sel.add(i); Audio.sfx('open');
    }
    this.mk();
  }
  async submit() {
    if (this.busy) return; this.busy = true;
    const chosen = [...this.sel].map(i => this.items[i]);
    const missing = this.items.filter((it, i) => it.need && !this.sel.has(i)), bads = chosen.filter(it => it.bad);
    if (!missing.length && !bads.length) { Audio.sfx('ok'); await talk([[this.cfg.who, this.cfg.ok]]); closeScreen(this, !this.fails); return; }
    this.fails = (this.fails || 0) + 1; G.wrong++; unlock('firstwrong'); Audio.sfx('bad'); shake(3);
    const lines = this.cfg.fail ? this.cfg.fail(missing, bads) : null;
    await talk(lines || [[this.cfg.who, (bads[0] && bads[0].why) || (missing[0] && missing[0].why) || '还差一点，再想想？']]);
    this.busy = false;
  }
  update(dt) { this.t += dt; if (this.msgT > 0) this.msgT -= dt; if (!this.busy) this.nav(); }
  draw(g) {
    this.dimBg(g, .5);
    const c = this.cfg, P = PORTRAIT, x = 8, w = VW - 16, cols = P ? 1 : 2, bw = Math.floor((w - 24 - (cols - 1) * 8) / cols);
    const Q = wrap(c.q, w - 24);
    const rows = Math.ceil(this.items.length / cols), top = 36 + Q.length * LH + (c.cap ? 22 : 4);
    this.btns.slice(0, -1).forEach(b => { b.w = bw; b.lines = wrap(b.label + (c.showW ? `（${b.it.w || 1} ${c.unit}）` : ''), bw - 20, b.style === 'primary' ? '#2a1e10' : '#3a2a20'); b.h = Math.max(18, b.lines.length * 13 + 6); b.pad = 10; });
    const rowH = Math.max(...this.btns.slice(0, -1).map(b => b.h)) + 4;
    const h = top + rows * rowH + 40, y = Math.max(4, Math.round((VH - 70 - h) / 2));
    win(g, x, y, w, h); head(g, c.who, c.title, x, y);
    drawLines(g, Q, x + 10, y + 36);
    if (c.cap) {
      const used = this.used(), by = y + 36 + Q.length * LH + 4;
      txt(g, `${c.capLabel || '容量'}：${used} / ${c.cap} ${c.unit || ''}`, x + 10, by, UIC.gold);
      for (let i = 0; i < c.cap; i++) { g.fillStyle = i < used ? UIC.gold : '#2a3060'; g.fillRect(x + 130 + i * 11, by + 2, 9, 9); }
    }
    this.btns.slice(0, -1).forEach((b, i) => { b.x = x + 12 + (i % cols) * (bw + 8); b.y = y + top + Math.floor(i / cols) * rowH; });
    const go = this.btns[this.btns.length - 1]; go.x = x + w - go.w - 10; go.y = y + h - 28;
    this.btns.forEach((b, i) => b.draw(g, i === this.focus && !this.busy && Input.device !== 'touch', this.t));
    if (this.msgT > 0) { const L = wrap(this.msg, w - 140, '#ffc2cb'); drawLines(g, L, x + 12, y + h - 30); }
  }
}
const pickGame = cfg => openScreen(new PickScreen(cfg));

/* ---------- 快问快答（送餐柜台、图书管理员、黑话翻译） ----------
 * cfg: { who, title, intro, rounds:[{card:{kind,text}, q, o:[正确, ...], why}], pass, time }
 */
class RushScreen extends Screen {
  constructor(cfg) { super(); this.cfg = cfg; this.start(); }
  start() { this.i = -1; this.score = 0; this.combo = 0; this.best = 0; this.perfect = true; this.next(); }
  next() {
    this.i++;
    if (this.i >= this.cfg.rounds.length) { this.finish(); return; }
    this.R = this.cfg.rounds[this.i]; this.state = 'ask'; this.timer = this.cfg.time || 0; this.fb = null;
    this.btns = shuffle(this.R.o.map((t, k) => ({ t, ok: k === 0 }))).map(o => new Btn({ label: o.t, ok: o.ok, w: 100, h: 20, align: 'left', onPress: b => this.answer(b) }));
    this.focus = 0;
  }
  answer(b) {
    if (this.state !== 'ask') return;
    this.state = 'fb'; this.btns.forEach(x => x.disabled = true);
    if (b && b.ok) { b.state = 'right'; this.score++; this.combo++; this.best = Math.max(this.best, this.combo); Audio.sfx('combo', this.combo); this.fb = { ok: true, text: (this.combo > 1 ? `连对 ${this.combo}！` : '答对了！') + (this.R.why || '') }; burst(b.x + b.w - 10, b.cy, 14, { colors: ['#6ef0a8', '#ffffff', '#ffd23f'], min: 30, max: 100, life: .7 }); parts.slice(-14).forEach(p => p.layer = 'ui'); }
    else { if (b) b.state = 'wrong'; this.perfect = false; this.combo = 0; G.wrong++; unlock('firstwrong'); Audio.sfx('bad'); shake(2); const ok = this.btns.find(x => x.ok); if (ok) ok.state = 'right'; this.fb = { ok: false, text: (b ? '不对哦。' : '时间到！') + (this.R.why || '') }; }
    const nb = new Btn({ label: this.i < this.cfg.rounds.length - 1 ? '下一题 ▶' : '看结果 ▶', w: 88, h: 20, style: 'primary', onPress: () => this.next() });
    this.btns.push(nb); this.focus = this.btns.length - 1;
  }
  async finish() {
    this.state = 'end'; this.btns = [];
    const pass = this.score >= (this.cfg.pass || this.cfg.rounds.length);
    if (pass) { Audio.sfx('ok'); await talk([[this.cfg.who, `${this.score} / ${this.cfg.rounds.length}！` + (this.cfg.ok || '干得漂亮！')]]); closeScreen(this, this.perfect); }
    else { Audio.sfx('bad'); await talk([[this.cfg.who, `答对了 ${this.score} / ${this.cfg.rounds.length} 题，还差一点点。要答对 ${this.cfg.pass} 题才算过关，再来一次吧！`]]); this.start(); }
  }
  update(dt) {
    this.t += dt;
    if (this.state === 'ask' && this.cfg.time) { this.timer -= dt; if (this.timer <= 0) this.answer(null); else if (this.timer < 3 && Math.floor(this.timer * 2) !== Math.floor((this.timer + dt) * 2)) Audio.sfx('tick'); }
    if (this.state !== 'end') this.nav();
  }
  draw(g) {
    this.dimBg(g, .55);
    if (!this.R || this.state === 'end') return;
    const c = this.cfg, P = PORTRAIT, x = 8, w = VW - 16;
    const card = this.R.card, CW2 = w - 24;
    const cardLines = card ? wrap(card.text, CW2 - (card.kind === 'ai' ? 34 : 16), card.kind === 'page' ? '#2a2030' : '#e8f4ff') : [];
    const cardH = card ? Math.max(30, cardLines.length * 13 + 14) : 0;
    const Q = wrap(this.R.q, w - 24);
    const cols = P ? 1 : 2, bw = Math.floor((w - 24 - (cols - 1) * 8) / cols);
    const opts = this.btns.filter(b => b.ok !== undefined);
    opts.forEach(b => { b.w = bw; b.lines = wrap(b.label, bw - 22); b.h = Math.max(20, b.lines.length * 13 + 7); b.pad = 12; });
    const rowH = Math.max(20, ...opts.map(b => b.h)) + 4, rows = Math.ceil(opts.length / cols);
    const fbL = this.fb ? wrap(this.fb.text, w - 130, this.fb.ok ? UIC.mint : '#ffc2cb') : [];
    const h = 40 + cardH + 6 + Q.length * LH + 6 + rows * rowH + Math.max(28, fbL.length * LH + 10) + 4;
    const y = Math.max(4, Math.round((VH - h) / 2) - (P ? 20 : 0));
    win(g, x, y, w, h); head(g, c.who, c.title, x, y);
    txt(g, P ? `${this.i + 1}/${c.rounds.length}` : `第 ${this.i + 1}/${c.rounds.length} 题 · 得分 ${this.score}`, x + w - 10, y + 11, UIC.dim, { align: 'right' });
    if (c.time && this.state === 'ask') { const k = clamp(this.timer / c.time, 0, 1); g.fillStyle = '#2a3060'; g.fillRect(x + 8, y + 30, w - 16, 2); g.fillStyle = k < .3 ? UIC.rose : UIC.gold; g.fillRect(x + 8, y + 30, Math.round((w - 16) * k), 2); }
    let yy = y + 38;
    if (card) {
      if (card.kind === 'ai') { g.fillStyle = '#0e1a34'; g.fillRect(x + 12, yy, CW2, cardH); g.fillStyle = '#2a4a7a'; g.fillRect(x + 12, yy, 2, cardH); g.drawImage(xaFrame(0, 0, 'ok'), x + 18, yy + 4, 14, 18); txt(g, 'AI', x + 19, yy + cardH - 14, '#5af0ff', { shadow: null }); drawLines(g, cardLines, x + 40, yy + 7, { lh: 13, shadow: null }); }
      else if (card.kind === 'page') { g.fillStyle = '#f6ecd2'; g.fillRect(x + 12, yy, CW2, cardH); g.fillStyle = '#c9b088'; g.fillRect(x + 12, yy, CW2, 2); drawLines(g, cardLines, x + 20, yy + 7, { lh: 13, shadow: null }); }
      else { g.fillStyle = '#121838'; g.fillRect(x + 12, yy, CW2, cardH); g.fillStyle = UIC.gold; g.fillRect(x + 12, yy, 2, cardH); drawLines(g, cardLines, x + 22, yy + 7, { lh: 13, shadow: null }); }
      yy += cardH + 6;
    }
    drawLines(g, Q, x + 10, yy); yy += Q.length * LH + 6;
    opts.forEach((b, i) => { b.x = x + 12 + (i % cols) * (bw + 8); b.y = yy + Math.floor(i / cols) * rowH; });
    yy += rows * rowH;
    const nb = this.btns.find(b => b.ok === undefined); if (nb) { nb.x = x + w - nb.w - 10; nb.y = y + h - 26; }
    this.btns.forEach((b, i) => b.draw(g, i === this.focus && Input.device !== 'touch', this.t));
    if (this.fb) drawLines(g, fbL, x + 12, yy + 2);
  }
}
const rush = cfg => openScreen(new RushScreen(cfg));

/* ---------- 提示词工坊 ----------
 * cfg: { slots:[{name, opts:[{t, good}], tip}], results:[[minScore, text], ...] }
 */
class PromptScreen extends Screen {
  constructor(cfg) { super(); this.cfg = cfg; this.choice = cfg.slots.map(s => ({ i: 0, opts: shuffle(s.opts.slice()) })); this.mk(); }
  mk() {
    const f = this.focus;
    this.btns = this.cfg.slots.map((s, k) => new Btn({ label: this.choice[k].opts[this.choice[k].i].t, w: 200, h: 18, align: 'left', slotI: k, onPress: () => { const c = this.choice[k]; c.i = (c.i + 1) % c.opts.length; Audio.sfx('move'); this.mk(); } }));
    this.btns.push(new Btn({ label: '发送给小 A ▶', w: 104, h: 20, style: 'primary', onPress: () => this.send() }));
    this.focus = f || 0;
  }
  async send() {
    if (this.busy) return; this.busy = true;
    const score = this.choice.filter(c => c.opts[c.i].good).length, n = this.cfg.slots.length;
    const res = this.cfg.results.find(([m]) => score >= m);
    xa.mood = score === n ? 'happy' : score <= 2 ? 'dizzy' : 'ok';
    await talk([['xa', res[1]]]);
    xa.mood = 'ok';
    if (score === n) { Audio.sfx('ok'); await talk([['prof', '完美的提示词！角色、任务、背景、格式、限制，五样齐全，小 A 一下就懂了。']]); closeScreen(this, !this.fails); return; }
    this.fails = (this.fails || 0) + 1; G.wrong++; unlock('firstwrong'); Audio.sfx('bad');
    const weak = this.cfg.slots.find((s, k) => !this.choice[k].opts[this.choice[k].i].good);
    await talk([['prof', `还差一点。看看【${weak.name}】那一栏：${weak.tip}（点一下那一栏可以换成别的说法）`]]);
    this.busy = false;
  }
  update(dt) { this.t += dt; if (!this.busy) this.nav(); }
  draw(g) {
    this.dimBg(g, .5);
    const P = PORTRAIT, x = 8, w = VW - 16, labW = 40;
    const rowsH = this.btns.slice(0, -1).map(b => { b.w = w - labW - 30; b.lines = wrap(b.label, b.w - 22); b.h = Math.max(18, b.lines.length * 13 + 6); b.pad = 10; return b.h + 4; });
    const SUB = wrap('点每一栏可以换说法。拼出一段好提示词，发给小 A。', w - 20, UIC.dim), sh = (SUB.length - 1) * LH;
    const h = 60 + sh + rowsH.reduce((a, b) => a + b, 0) + 40, y = Math.max(4, Math.round((VH - 70 - h) / 2));
    win(g, x, y, w, h); head(g, 'prof', '提示词工坊', x, y);
    drawLines(g, SUB, x + 10, y + 36);
    let yy = y + 56 + sh;
    this.btns.slice(0, -1).forEach((b, k) => { txt(g, this.cfg.slots[k].name, x + 12, yy + 3, UIC.gold); b.x = x + 16 + labW; b.y = yy; yy += rowsH[k]; });
    const go = this.btns[this.btns.length - 1]; go.x = x + w - go.w - 10; go.y = y + h - 28;
    this.btns.forEach((b, i) => b.draw(g, i === this.focus && !this.busy && Input.device !== 'touch', this.t));
    void P;
  }
}

/* ---------- 幻觉侦探 ----------
 * cfg: { facts:[...], claims:[{t, real, why}] }
 */
class HalluScreen extends Screen {
  constructor(cfg) { super(); this.cfg = cfg; this.marks = cfg.claims.map(() => 0); this.mk(); }
  mk() {
    const f = this.focus;
    this.btns = this.cfg.claims.map((c, i) => new Btn({ label: ['？', '真的', '编的'][this.marks[i]], w: 44, h: 18, style: this.marks[i] ? 'primary' : 'btn', onPress: () => { this.marks[i] = this.marks[i] === 1 ? 2 : 1; Audio.sfx('move'); this.mk(); } }));
    this.btns.push(new Btn({ label: '交给侦探 ▶', w: 96, h: 20, style: 'primary', onPress: () => this.submit() }));
    this.focus = f || 0;
  }
  async submit() {
    if (this.busy) return; this.busy = true;
    if (this.marks.includes(0)) { Audio.sfx('bad'); await talk([['detective', '每一句都要判断哦：是真的，还是小 A 编的？']]); this.busy = false; return; }
    const wrongI = this.cfg.claims.findIndex((c, i) => (this.marks[i] === 1) !== c.real);
    if (wrongI < 0) { Audio.sfx('ok'); await talk([['detective', '全部识破！你已经是合格的幻觉侦探了。']]); closeScreen(this, !this.fails); return; }
    this.fails = (this.fails || 0) + 1; G.wrong++; unlock('firstwrong'); Audio.sfx('bad'); shake(2);
    const c = this.cfg.claims[wrongI];
    await talk([['detective', `第 ${wrongI + 1} 句再看看：${c.why}`]]);
    this.busy = false;
  }
  update(dt) { this.t += dt; if (!this.busy) this.nav(); }
  draw(g) {
    this.dimBg(g, .5);
    const P = PORTRAIT, x = 8, w = VW - 16;
    const fw = P ? w - 24 : Math.round(w * .36), cw = P ? w - 24 : w - fw - 36;
    const F = []; this.cfg.facts.forEach(f => wrap('· ' + f, fw - 12, '#2a2030').forEach(l => F.push(l)));
    const CL = this.cfg.claims.map((c, i) => wrap(`${i + 1}. ${c.t}`, cw - 66, UIC.text));
    const clH = CL.reduce((a, l) => a + Math.max(20, l.length * 13 + 6) + 3, 0);
    const factH = F.length * 13 + 24;
    const h = 44 + (P ? factH + 10 + clH : Math.max(factH, clH)) + 38, y = Math.max(4, Math.round((VH - 60 - h) / 2));
    win(g, x, y, w, h); head(g, 'detective', '幻觉侦探：哪几句是小 A 编的？', x, y);
    const fx2 = x + 12, fy = y + 40;
    g.fillStyle = '#f6ecd2'; g.fillRect(fx2, fy, fw, factH); g.fillStyle = '#c9b088'; g.fillRect(fx2, fy, fw, 2);
    txt(g, '村子档案（真的）', fx2 + 6, fy + 4, '#b5521b', { shadow: null });
    drawLines(g, F, fx2 + 6, fy + 19, { lh: 13, shadow: null });
    let cx = P ? x + 12 : fx2 + fw + 12, cy = P ? fy + factH + 10 : fy;
    CL.forEach((L, i) => { const hh = Math.max(20, L.length * 13 + 6); g.fillStyle = '#0e1a34'; g.fillRect(cx, cy, cw, hh); drawLines(g, L, cx + 6, cy + 4, { lh: 13 }); const b = this.btns[i]; b.x = cx + cw - b.w - 4; b.y = cy + Math.round((hh - 18) / 2); cy += hh + 3; });
    const go = this.btns[this.btns.length - 1]; go.x = x + w - go.w - 10; go.y = y + h - 28;
    this.btns.forEach((b, i) => b.draw(g, i === this.focus && !this.busy && Input.device !== 'touch', this.t));
  }
}

/* ---------- 拼全景图 ---------- */
const ARCH = [
  { id: 'browser', x: .08, y: .14, q: '用户用什么打开你的 App？', why: '用户是用浏览器（或手机）打开网页的。' },
  { id: 'frontend', x: .33, y: .14, q: '用户看到的按钮、菜单、颜色，是哪一部分？', why: '看得见、摸得着的部分是前端。' },
  { id: 'api', x: .58, y: .14, q: '前端和后端之间说好的"点菜单"叫什么？', why: '前后端按约定好的格式沟通，这就是 API。' },
  { id: 'backend', x: .83, y: .14, q: '真正算钱、处理订单的"后厨"是？', why: '算钱、查密码这些活儿在后端干。' },
  { id: 'db', x: .83, y: .48, q: '订单和账号长期存在哪儿？', why: '长期保存的东西放进数据库。' },
  { id: 'llm', x: .58, y: .48, q: 'AI 客服的"大脑"是什么？', why: 'AI 客服背后是大模型。' },
  { id: 'rag', x: .33, y: .48, q: '让 AI 客服按店里的菜单回答、不瞎编，要给它配？', why: '给大模型配上知识库，它就先查资料再回答。' },
  { id: 'git', x: .08, y: .82, q: '每次改代码前，用什么存档？', why: '用 Git 存档，改坏了也能回去。' },
  { id: 'deploy', x: .41, y: .82, q: '把代码放到服务器上、让大家都能用，这一步叫？', why: '这一步叫部署（上线）。' },
  { id: 'domain', x: .74, y: .82, q: '大家记住的网址 duckduck.app 是什么？', why: '好记的网址就是域名。' },
];
const ARCH_LINKS = [[0, 1], [1, 2], [2, 3], [3, 4], [3, 5], [6, 5], [7, 8], [8, 9]];
class ArchScreen extends Screen {
  constructor() {
    super(); this.k = 0; this.filled = [];
    const extra = ['hallu', 'cookie', 'port'];
    this.palette = shuffle(ARCH.map(a => a.id).concat(extra));
    this.mk();
  }
  mk() {
    const f = this.focus;
    this.btns = this.palette.map(id => new Btn({ label: findTerm(id).t, w: 80, h: 18, icon: id, align: 'left', tid: id, disabled: this.filled.includes(id), onPress: () => this.choose(id) }));
    this.focus = Math.min(f || 0, this.btns.length - 1); if (this.btns[this.focus].disabled) { const i = this.btns.findIndex(b => !b.disabled); this.focus = Math.max(0, i); }
  }
  async choose(id) {
    if (this.busy) return; this.busy = true;
    const slot = ARCH[this.k];
    if (id === slot.id) {
      this.filled.push(id); this.k++; Audio.sfx('ok');
      if (this.k >= ARCH.length) { this.done = true; this.mk(); for (let i = 0; i < 4; i++) burst(rand(VW), rand(VH * .6), 24, { colors: ['#ffd23f', '#ff8ab0', '#7ad0ff', '#7dffa6'], min: 40, max: 160, g: 80, life: 1.4 }); parts.slice(-96).forEach(p => p.layer = 'ui'); await wait(600); await talk([['xa', '拼好了！这就是一个 App 从里到外的全貌。你现在看任何 AI 写的项目，心里都有这张图了。']]); closeScreen(this, !this.fails); return; }
      this.mk();
    } else { this.fails = (this.fails || 0) + 1; G.wrong++; unlock('firstwrong'); Audio.sfx('bad'); shake(2); await talk([['xa', `不是【${findTerm(id).t}】哦。提示：${slot.why}`]]); }
    this.busy = false;
  }
  update(dt) { this.t += dt; if (!this.busy && !this.done) this.nav(); }
  draw(g) {
    this.dimBg(g, .6);
    const P = PORTRAIT, x = 6, w = VW - 12;
    const dh = P ? 200 : Math.min(150, VH - 120), cols = P ? 2 : 4, bw = Math.floor((w - 20 - (cols - 1) * 4) / cols);
    const QL = wrap(this.done ? '全部拼好啦！' : ARCH[this.k].q, w - 20), qh = QL.length * LH;
    const prow = Math.ceil(this.btns.length / cols), h = 26 + dh + 8 + qh + prow * 21 + 8, y = Math.max(4, Math.round((VH - h) / 2));
    win(g, x, y, w, h);
    txt(g, '拼出鸭鸭点餐 App 的全景图', x + 10, y + 7, UIC.gold);
    txt(g, `${this.filled.length}/${ARCH.length}`, x + w - 10, y + 7, UIC.dim, { align: 'right' });
    const dx = x + 10, dy = y + 24, dw = w - 20;
    g.fillStyle = '#0e1430'; g.fillRect(dx, dy, dw, dh);
    for (let gx = dx; gx < dx + dw; gx += 12) { g.fillStyle = '#141c40'; g.fillRect(gx, dy, 1, dh); }
    const nodeW = P ? Math.min(78, Math.floor((dw - 16) / 4)) : 78, nodeH = 26, pos = a => ({ cx: dx + nodeW / 2 + 3 + (a.x - .08) / .75 * (dw - nodeW - 6), cy: dy + 8 + a.y * (dh - 16) });
    // 区块标签
    [['用户 → 网页 → 后厨', .14], ['AI 客服', .48], ['上线', .82]].forEach(([l, yy]) => txt(g, l, dx + 4, Math.max(dy + 1, dy + 8 + yy * (dh - 16) - 28), '#4a5490', { shadow: null }));
    ARCH_LINKS.forEach(([a, b]) => { const A = pos(ARCH[a]), B = pos(ARCH[b]); g.strokeStyle = '#3a4a8a'; g.lineWidth = 2; g.beginPath(); g.moveTo(Math.round(A.cx), Math.round(A.cy)); g.lineTo(Math.round(B.cx), Math.round(B.cy)); g.stroke(); });
    ARCH.forEach((a, i) => {
      const { cx, cy } = pos(a), nx = Math.round(cx - nodeW / 2), ny = Math.round(cy - nodeH / 2), got = this.filled.includes(a.id), cur = i === this.k && !this.done;
      g.fillStyle = cur ? UIC.gold : got ? UIC.mint : '#3a4480'; g.fillRect(nx - 1, ny - 1, nodeW + 2, nodeH + 2);
      g.fillStyle = got ? '#123a26' : '#1a2250'; g.fillRect(nx, ny, nodeW, nodeH);
      if (got) { icon(g, a.id, nx + 3, ny + 5); g.save(); g.beginPath(); g.rect(nx, ny, nodeW, nodeH); g.clip(); txt(g, findTerm(a.id).t, nx + 21, ny + 7, UIC.text, { shadow: null }); g.restore(); }
      else txt(g, cur ? '？' : '', cx, ny + 7, UIC.gold, { align: 'center' });
      if (cur) { const b = Math.round(Math.sin(this.t * 6) * 2); g.fillStyle = UIC.gold; g.fillRect(Math.round(cx) - 2, ny - 7 + b, 5, 3); g.fillRect(Math.round(cx) - 1, ny - 4 + b, 3, 2); }
    });
    drawLines(g, QL, x + 10, dy + dh + 4);
    this.btns.forEach((b, i) => { b.w = bw; b.x = x + 10 + (i % cols) * (bw + 4); b.y = dy + dh + 8 + qh + Math.floor(i / cols) * 21; });
    this.btns.forEach((b, i) => b.draw(g, i === this.focus && !this.busy && Input.device !== 'touch', this.t));
  }
}

/* ---------- 火箭发射动画 ---------- */
class LaunchScreen extends Screen {
  constructor(fail = false) { super(); this.fail = fail; this.btns = []; }
  onOpen() { Audio.sfx(this.fail ? 'boom' : 'rocket'); }
  update(dt) {
    this.t += dt;
    const cx = VW / 2, base = VH * .78, ry = this.ry();
    if (this.t > 1 && !this.fail && Math.random() < .9) for (let i = 0; i < 3; i++) emit({ layer: 'ui', kind: 'smoke', x: cx + rand(-6, 6), y: ry + 70, vx: rand(-30, 30), vy: rand(20, 60), life: rand(.6, 1.4), max: 1.4, c: pick(['#ffd23f', '#ff8a3a', '#e8e8f0', '#c8c8d8']), size: 4, fade: .8 });
    if (this.fail && this.t > 1.2 && !this.boomed) { this.boomed = true; shake(10); flash('#ff6a2a', .9); burst(cx, base - 30, 80, { colors: ['#ff5a1a', '#ffb43a', '#ffffff', '#3a2a2a'], min: 60, max: 260, g: 160, life: 1.6, size: 3 }); parts.slice(-80).forEach(p => p.layer = 'ui'); }
    if (this.t > (this.fail ? 2.6 : 3.6)) closeScreen(this);
    void base;
  }
  ry() { const base = VH * .78; return this.fail ? base - 78 : base - 78 - Math.max(0, this.t - 1) ** 2 * 120; }
  draw(g) {
    const t = this.t;
    const sky = g.createLinearGradient(0, 0, 0, VH); sky.addColorStop(0, '#0a0a24'); sky.addColorStop(1, '#2a2a5a'); g.fillStyle = sky; g.fillRect(0, 0, VW, VH);
    for (let i = 0; i < 40; i++) { g.fillStyle = '#ffffff'; g.globalAlpha = .4 + .6 * Math.abs(Math.sin(t * 2 + i)); g.fillRect((i * 97) % VW, ((i * 53) % (VH * .7)) + (t > 1 && !this.fail ? (t - 1) * 30 % VH : 0) % VH, 1, 1); } g.globalAlpha = 1;
    const base = Math.round(VH * .78);
    g.fillStyle = '#3a3e52'; g.fillRect(0, base, VW, VH - base); g.fillStyle = '#5a5f78'; g.fillRect(0, base, VW, 2);
    const cx = Math.round(VW / 2), shakeX = t < 1 ? Math.round(rand(-1, 1)) : 0;
    if (!this.boomed) g.drawImage(PROP.rocket, cx - 17 + shakeX, Math.round(this.ry()));
    g.drawImage(PROP.tower, cx + 26, base - 86);
    if (t < 1) txt(g, String(3 - Math.floor(t * 3)), VW / 2, VH * .35, UIC.gold, { align: 'center' });
    else if (!this.fail) { const k = Math.min(1, (t - 1.2) * 2); g.globalAlpha = clamp(k, 0, 1); txt(g, '发射成功！鸭鸭点餐上线啦！', VW / 2, VH * .3, UIC.gold, { align: 'center' }); g.globalAlpha = 1; }
    else if (this.boomed) txt(g, '轰——！', VW / 2, VH * .3, UIC.rose, { align: 'center' });
  }
}

/* ---------- Git 时间线插图 ---------- */
function gitPic(g, x, y, w, h, t) {
  win(g, x, y, w, h, 'dark');
  const C = [['a1', '加了菜单'], ['b2', '加了购物车'], ['c3', '修好付款'], ['d4', '换了新颜色'], ['e5', '大改订单（坏了）']];
  const step = (w - 40) / (C.length - 1);
  g.fillStyle = '#3a4a8a'; g.fillRect(x + 20, y + 16, w - 40, 2);
  C.forEach(([id, m], i) => {
    const cx = Math.round(x + 20 + i * step), bad = i === C.length - 1;
    g.fillStyle = bad ? UIC.rose : UIC.mint; g.beginPath(); g.arc(cx, y + 17, 5, 0, 6.28); g.fill();
    txt(g, id, cx, y + 26, bad ? UIC.rose : UIC.gold, { align: 'center', shadow: null });
    if (!PORTRAIT || i % 2 === 0 || bad) { g.save(); g.beginPath(); g.rect(cx - step / 2, y + 38, step, 14); g.clip(); txt(g, m, cx, y + 39, '#a7a6c8', { align: 'center', shadow: null }); g.restore(); }
  });
  void t;
}
