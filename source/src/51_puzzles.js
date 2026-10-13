/* ============================================================
 * 51 谜题：选择题、泡面排序、圈圈跑步、魔王战、终端
 * ============================================================ */

/* ---------- 选择题 ----------
 * opts: { who, title, q, code, err, options:[{t, ok, why}], lines(bool: 点代码行), grid(bool), pic(fn), noShuffle }
 */
class QuizScreen extends Screen {
  constructor(o) {
    super(); this.o = o; this.done = false;
    this.opts = (o.lines || o.noShuffle) ? o.options.slice() : shuffle(o.options.slice());
    this.btns = this.opts.map((op, i) => new Btn({ label: op.t, opt: op, code: !!(o.lines || op.code || o.codey), lineNo: o.lines ? i + 1 : 0, align: 'left', onPress: b => this.choose(b) }));
  }
  layout() {
    const o = this.o, x = 8, w = VW - 16, inner = w - 20;
    let y = 8;
    const L = { x, w, y };
    L.q = wrap(o.q, inner); y += 36 + L.q.length * LH + 6;
    if (o.code) { L.code = measureCode(o.code, inner); L.codeY = y; y += L.code.h + 6; }
    if (o.pic) { L.picY = y; L.picH = o.picH || 46; y += L.picH + 6; }
    const cols = o.grid ? 2 : 1, bw = Math.floor((inner - (cols - 1) * 8) / cols);
    this.btns.forEach((b, i) => {
      b.w = bw; b.x = x + 10 + (i % cols) * (bw + 8);
      if (b.code) { b.lines = codeLines((b.lineNo ? '' : '') + b.label, bw - 26); b.h = b.lines.length * 13 + 6; b.pad = b.lineNo ? 22 : 10; }
      else { b.lines = wrap(b.label, bw - 24); b.h = Math.max(18, b.lines.length * 13 + 6); b.pad = 12; }
      if (o.lines) b.h = Math.max(b.h, 18);
    });
    const rowsH = []; this.btns.forEach((b, i) => { const r = Math.floor(i / cols); rowsH[r] = Math.max(rowsH[r] || 0, b.h); });
    let yy = y; this.btns.forEach((b, i) => { const r = Math.floor(i / cols); if (i % cols === 0 && i > 0) yy += rowsH[r - 1] + (o.lines ? 0 : 5); b.y = yy; });
    y = yy + (rowsH[rowsH.length - 1] || 0) + 6;
    if (o.err) { L.errY = y; L.err = wrap(o.err, inner - 12, '#ffc2cb'); y += L.err.length * LH + 10; }
    L.h = y - L.y + 4;
    return L;
  }
  async choose(b) {
    if (this.busy || b.disabled) return;
    this.busy = true;
    const op = b.opt, who = this.o.who;
    if (op.ok) {
      b.state = 'right'; this.btns.forEach(x => x.disabled = true); Audio.sfx('ok');
      burst(b.x + b.w - 12, b.cy, 18, { colors: ['#6ef0a8', '#ffffff', '#ffd23f'], min: 30, max: 110, life: .8, glow: true }); parts.slice(-18).forEach(p => p.layer = 'ui');
      await wait(250);
      await talk([[who || 'xa', '答对了！' + (op.why || '')]]);
      closeScreen(this, true);
    } else {
      b.state = 'wrong'; b.disabled = true; Audio.sfx('bad'); shake(3); G.wrong++; this.wrongs = (this.wrongs || 0) + 1; unlock('firstwrong');
      await talk([[who || 'xa', '不对哦。' + (op.why || (this.o.lines && this.o.lines.why) || '再想想？')]]);
      this.busy = false;
      const i = this.btns.findIndex(x => !x.disabled); if (i >= 0) this.focus = i;
    }
  }
  update(dt) { this.t += dt; if (!this.busy) this.nav(); }
  draw(g) {
    this.dimBg(g, .45);
    const L = this.layout(), o = this.o;
    const oy = Math.max(0, Math.round((VH - 90 - L.h) / 2));
    g.save(); g.translate(0, oy);
    win(g, L.x, L.y, L.w, L.h, 'dlg');
    if (o.who && WHO[o.who]) { drawPortrait(g, WHO[o.who].id, L.x + 8, L.y + 6, 22, false); txt(g, o.title || WHO[o.who].n, L.x + 36, L.y + 11, WHO[o.who].c); }
    else txt(g, o.title || '', L.x + 10, L.y + 8, UIC.gold);
    g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(L.x + 8, L.y + 31, L.w - 16, 1);
    drawLines(g, L.q, L.x + 10, L.y + 34);
    if (o.code) codeBox(g, o.code, L.x + 10, L.codeY, L.w - 20);
    if (o.pic) o.pic(g, L.x + 10, L.picY, L.w - 20, L.picH, this.t);
    if (o.lines) { const b0 = this.btns[0], bl = this.btns[this.btns.length - 1]; g.fillStyle = '#0c1028'; g.fillRect(b0.x - 2, b0.y - 2, b0.w + 4, bl.y + bl.h - b0.y + 4); }
    this.btns.forEach((b, i) => {
      if (b.code) drawCodeBtn(g, b, i === this.focus && !this.busy && Input.device !== 'touch', this.t);
      else b.draw(g, i === this.focus && !this.busy && Input.device !== 'touch', this.t);
    });
    if (o.err) { win(g, L.x + 10, L.errY, L.w - 20, L.err.length * LH + 8, 'dark'); g.fillStyle = '#5a1a2a'; g.fillRect(L.x + 13, L.errY + 3, L.w - 26, L.err.length * LH + 2); drawLines(g, L.err, L.x + 16, L.errY + 4); }
    g.restore();
    // 鼠标点击需要偏移
    this.btns.forEach(b => { b._oy = oy; });
  }
  nav() { const oy = this.btns[0] ? this.btns[0]._oy || 0 : 0; this.btns.forEach(b => b.y += oy); const r = super.nav(); this.btns.forEach(b => b.y -= oy); return r; }
}
function drawCodeBtn(g, b, focus, t) {
  const { x, y, w, h } = b;
  g.globalAlpha = b.disabled && !b.state ? .5 : 1;
  const bg = b.state === 'right' ? '#123a26' : b.state === 'wrong' ? '#3a1220' : focus ? '#1e2858' : '#121838';
  g.fillStyle = bg; g.fillRect(x, y, w, h);
  g.fillStyle = focus ? UIC.gold : b.state === 'right' ? UIC.mint : b.state === 'wrong' ? UIC.rose : '#2e3870'; g.fillRect(x, y, 2, h); if (!b.lineNo) { g.fillRect(x, y, w, 1); g.fillRect(x, y + h - 1, w, 1); g.fillRect(x + w - 1, y, 1, h); }
  if (b.lineNo) txt(g, String(b.lineNo), x + 6, y + 3, '#6a75ad', { shadow: null });
  drawLines(g, b.lines, x + b.pad, y + 3, { lh: 13, shadow: null });
  if (b.state === 'wrong') { g.fillStyle = UIC.rose; g.fillRect(x + b.pad, y + Math.round(h / 2), w - b.pad - 6, 1); }
  if (focus) cursor(g, x - 9, y + Math.round(h / 2) - 4, t);
  g.globalAlpha = 1;
}
const quiz = o => openScreen(new QuizScreen(o));
async function quizzes(list) { for (const q of list) await quiz(q); }

/* ---------- 排序题（泡面、智能体步骤） ----------
 * cfg: { who, title, hint, items:[正确顺序], extra:[干扰项], go:'按钮字', ok:'成功台词', why(ans)->失败原因 }
 */
class OrderScreen extends Screen {
  constructor(cfg) {
    super(); this.cfg = cfg; this.N = cfg.items.length;
    const all = cfg.items.concat(cfg.extra || []);
    do { this.pool = shuffle(all.slice()); } while (this.pool.slice(0, this.N).join() === cfg.items.join());
    this.ans = []; this.mk();
  }
  mk() {
    const f = this.focus, c = this.cfg;
    this.btns = [];
    this.pool.forEach((s, i) => this.btns.push(new Btn({ label: s, style: 'chip', w: 110, h: 18, disabled: this.ans.length >= this.N, onPress: () => { if (this.ans.length >= this.N) return; Audio.sfx('open'); this.ans.push(this.pool.splice(i, 1)[0]); this.mk(); } })));
    for (let i = 0; i < this.N; i++) { const s = this.ans[i]; this.btns.push(new Btn({ label: s || '', slot: i + 1, w: 132, h: 18, disabled: !s, onPress: () => { Audio.sfx('back'); this.pool.push(this.ans.splice(i, 1)[0]); this.mk(); } })); }
    this.btns.push(new Btn({ label: '全部撤回', w: 70, h: 20, onPress: () => { this.pool = this.pool.concat(this.ans); this.ans = []; this.mk(); } }));
    this.btns.push(new Btn({ label: c.go || '开始 ▶', w: 100, h: 20, style: 'primary', disabled: this.ans.length < this.N, onPress: () => this.run() }));
    this.focus = Math.min(f || 0, this.btns.length - 1);
    if (this.btns[this.focus].disabled) { const i = this.btns.findIndex(b => !b.disabled); this.focus = i >= 0 ? i : 0; }
  }
  async run() {
    if (this.busy) return; this.busy = true;
    const c = this.cfg;
    if (this.ans.join() === c.items.join()) { Audio.sfx('ok'); this.win = true; await talk([[c.who, c.ok]]); closeScreen(this, !this.fails); return; }
    this.fails = (this.fails || 0) + 1; G.wrong++; unlock('firstwrong');
    Audio.sfx('bad'); shake(3);
    await talk([[c.who, c.why(this.ans) || '顺序不太对，再试一次吧。']]);
    this.busy = false;
  }
  update(dt) { this.t += dt; if (!this.busy) this.nav(); }
  draw(g) {
    this.dimBg(g, .5);
    const P = PORTRAIT, c = this.cfg, nPoolAll = this.N + (c.extra || []).length, rowH = nPoolAll > 6 ? 20 : 22;
    const w = VW - 16, x = 8, H = wrap(c.hint, w - 24, UIC.dim).slice(0, 2), ex = (H.length - 1) * LH;
    const h = ex + (P ? 66 + nPoolAll * rowH + 22 + this.N * 22 + 40 : Math.max(214, 66 + Math.max(nPoolAll * rowH, this.N * 22) + 40));
    const y = Math.max(6, Math.round((VH - 70 - h) / 2));
    win(g, x, y, w, h);
    drawPortrait(g, WHO[c.who].id, x + 8, y + 6, 22, false); txt(g, c.title, x + 36, y + 11, WHO[c.who].c);
    drawLines(g, H, x + 10, y + 32);
    const leftW = P ? w - 24 : Math.round(w * .42), colL = x + 12, colR = P ? x + 12 : x + 12 + leftW + 12, topL = y + 66 + ex, topR = P ? topL + nPoolAll * rowH + 22 : topL;
    txt(g, '可选的步骤', colL, topL - 16, UIC.gold);
    txt(g, '你的顺序', colR, topR - 16, UIC.gold);
    const nPool = this.pool.length, slotW = P ? w - 44 : x + w - colR - 30;
    this.btns.forEach((b, i) => {
      if (i < nPool) { b.x = colL; b.y = topL + i * rowH; b.w = leftW; b.h = rowH - 3; }
      else if (b.slot) { b.x = colR + 16; b.y = topR + (b.slot - 1) * 22; b.w = slotW; }
    });
    const nb = this.btns.length; this.btns[nb - 2].x = x + w - 190; this.btns[nb - 1].x = x + w - 110; this.btns[nb - 2].y = this.btns[nb - 1].y = y + h - 28;
    for (let i = 0; i < this.N; i++) { const sy = topR + i * 22; txt(g, String(i + 1), colR + 2, sy + 3, UIC.gold); if (!this.ans[i]) { g.fillStyle = '#3a4480'; for (let xx = colR + 16; xx < colR + 16 + slotW; xx += 4) { g.fillRect(xx, sy, 2, 1); g.fillRect(xx, sy + 17, 2, 1); } } }
    this.btns.forEach((b, i) => { if (b.slot && !this.ans[b.slot - 1]) return; b.draw(g, i === this.focus && !this.busy && Input.device !== 'touch', this.t); });
  }
}
const NOODLE = ['撕开泡面包装', '把面饼放进碗里', '倒入开水', '盖上盖子，等 3 分钟', '开吃！'];
const noodleCfg = () => ({
  who: 'chef', title: '锅锅的泡面菜谱', hint: '把步骤按正确顺序排进菜谱。点菜谱里的步骤可以撤回。', items: NOODLE, go: '让锅锅开工 ▶', ok: '咕嘟咕嘟……叮！滴滴，泡面完成！',
  why(ans) {
    const at = s => ans.indexOf(s);
    if (ans[0] === '开吃！') return '滴滴……锅锅第一步就开吃：对着空气嚼了半天。顺序错了，结果就错了。';
    if (at('开吃！') < at('盖上盖子，等 3 分钟')) return '滴滴……还没泡好就开吃了。咔嚓！干面饼把锅锅的螺丝都崩掉了一颗。';
    if (at('把面饼放进碗里') < at('撕开泡面包装')) return '滴滴……锅锅把没拆的整包泡面扔进了碗里。塑料袋泡面，嚼劲十足……';
    if (at('倒入开水') < at('把面饼放进碗里')) return '滴滴……先往空碗里倒开水，再把面饼扔进去。啪！溅了锅锅一脸。';
    return '滴滴……锅锅盖着盖子对着干面饼等了 3 分钟，然后才倒水。等了个寂寞。';
  },
});

/* ---------- 魔王战 ---------- */
const BOSS_BG = { fog: ['#2a2a3e', '#6a6a8a', '#c8c8e0'], ghost: ['#0a1030', '#2a3a7a', '#7ab0ff'], fox: ['#3a1408', '#a84a1a', '#ff9a3a'], dragon2: ['#0a2014', '#1e5a2e', '#7ae08a'], fire: ['#2a0606', '#8a1a0a', '#ff6a2a'], final: ['#1a0830', '#4a1a7a', '#ff4ac8'] };
class BattleScreen extends Screen {
  constructor(cfg) { super(); this.cfg = cfg; this.kind = cfg.kind; this.start(); this.intro = 1.2; this.lostAny = false; }
  start() { this.hp = this.cfg.hp || 5; this.hearts = 3; this.pool = shuffle(this.cfg.qs.slice()); this.qi = 0; this.hitT = 0; this.hurtT = 0; this.dmg = []; this.ask(); }
  ask() {
    this.Q = this.pool[this.qi++ % this.pool.length]; this.state = 'ask'; this.msg = null;
    this.btns = shuffle(this.Q.o.map((t, i) => ({ t, ok: i === 0 }))).map(o => new Btn({ label: o.t, ok: o.ok, w: 120, h: 20, onPress: b => this.answer(b) }));
    this.focus = 0;
  }
  answer(b) {
    if (this.state !== 'ask') return;
    this.btns.forEach(x => x.disabled = true);
    if (b.ok) {
      this.lastOk = true; b.state = 'right'; this.hp--; this.hitT = .6; Audio.sfx('hit'); shake(5); flash('#ffffff', .6);
      this.dmg.push({ t: 0, text: '-1' });
      burst(VW / 2, this.bossY + 30, 40, { colors: ['#ff4ac8', '#b05aff', '#ffffff', '#22e6d0'], min: 40, max: 180, g: 80, life: 1, size: 2 }); parts.slice(-40).forEach(p => p.layer = 'ui');
      this.msg = this.hp <= 0 ? ['致命一击！' + this.Q.why, this.cfg.name + '摇摇晃晃……'] : ['命中！' + this.Q.why];
      this.next = this.hp <= 0 ? 'win' : 'ask';
    } else {
      this.lastOk = false; this.lostAny = true; G.wrong++; unlock('firstwrong'); b.state = 'wrong'; this.hearts--; this.hurtT = .6; Audio.sfx('hurt'); shake(6); flash('#ff2040', .45);
      this.msg = this.hearts <= 0 ? [`你被打倒了……正确答案是：${this.Q.o[0]}。`, '小 A：别灰心，失败了重来就好！'] : [`${this.cfg.name}反击！正确答案是：${this.Q.o[0]}。${this.Q.why}`];
      this.next = this.hearts <= 0 ? 'retry' : 'ask';
    }
    this.state = 'msg';
    setTimeout(() => {
      this.btns = [new Btn({ label: this.next === 'win' ? '继续 ▶' : this.next === 'retry' ? '再挑战一次' : '下一题 ▶', w: 100, h: 20, style: 'primary', onPress: () => { if (this.next === 'win') { this.state = 'dying'; this.dieT = 0; Audio.sfx('roar'); this.btns = []; } else if (this.next === 'retry') this.start(); else this.ask(); } })];
      this.focus = 0;
    }, 450);
  }
  update(dt) {
    this.t += dt; if (this.intro > 0) { this.intro -= dt; return; }
    this.hitT = Math.max(0, this.hitT - dt); this.hurtT = Math.max(0, this.hurtT - dt);
    this.dmg.forEach(d => d.t += dt); this.dmg = this.dmg.filter(d => d.t < 1);
    if (this.state === 'dying') { this.dieT += dt; if (Math.random() < .5) { burst(VW / 2 + rand(-30, 30), this.bossY + rand(0, 50), 6, { colors: ['#ff4ac8', '#b05aff', '#ffffff', '#22e6d0'], min: 20, max: 120, life: 1, size: 2 }); parts.slice(-6).forEach(p => p.layer = 'ui'); } if (this.dieT > 2.4) closeScreen(this, !this.lostAny); return; }
    this.nav();
  }
  draw(g) {
    const t = this.t;
    // 迷幻背景
    const BG = BOSS_BG[this.kind] || BOSS_BG.final;
    for (let y = 0; y < VH; y += 2) {
      const off = Math.sin(y * .05 + t * 2) * 18 + Math.sin(y * .013 - t) * 30;
      const k = (Math.sin((y + t * 30) * .06) + 1) / 2;
      g.fillStyle = mix(BG[0], BG[1], k); g.fillRect(0, y, VW, 2);
      g.fillStyle = mix(BG[0], BG[2], k * .35);
      for (let x = -40; x < VW + 40; x += 40) g.fillRect(Math.round(x + off), y, 12, 2);
    }
    g.fillStyle = 'rgba(10,4,20,.35)'; g.fillRect(0, 0, VW, VH);
    // 魔王
    const P = PORTRAIT, sc = P && VW >= 250 ? 3 : 2, bw = 66 * sc, bh = 58 * sc;
    this.bossY = P ? Math.round(VH * .12) : 30;
    const by = this.bossY + Math.round(Math.sin(t * 2) * 3) + (this.intro > 0 ? Math.round(easeOut(this.intro / 1.2) * -120) : 0);
    const hurt = this.hitT > 0 && Math.floor(this.hitT * 20) % 2;
    let im = bossFrame(Math.floor(t * 4) % 4, !!hurt, this.kind);
    const dieK = this.state === 'dying' ? Math.min(1, this.dieT / 2.2) : 0;
    g.save();
    if (dieK) { g.globalAlpha = 1 - dieK * .8; }
    for (let i = 0; i < 58; i++) {
      const wob = Math.round(Math.sin(t * 3 + i * .25) * (2 + (this.hitT > 0 ? 6 : 0) + dieK * 20));
      const s = 1 - dieK * .85, rw = bw * s, rh = sc * s;
      g.drawImage(im, 0, i, 66, 1, Math.round(VW / 2 - rw / 2 + wob), Math.round(by + bh * (1 - s) + i * rh), Math.round(rw), Math.ceil(rh));
    }
    g.restore();
    this.dmg.forEach(d => txt(g, d.text, VW / 2 + 40, by + 20 - d.t * 30, '#ffffff', { align: 'center' }));
    // 血条
    const hx = Math.round(VW / 2 - 70), hy = P ? Math.round(VH * .12) - 34 : 4;
    const maxHp = this.cfg.hp || 5, nw = textW(this.cfg.name), bw2 = nw + 22 + maxHp * 14, hx2 = Math.round(VW / 2 - bw2 / 2);
    win(g, hx2, hy, bw2, 20, 'dark'); txt(g, this.cfg.name, hx2 + 8, hy + 4, BG[2]);
    for (let i = 0; i < maxHp; i++) { const bx = hx2 + nw + 14 + i * 14; g.fillStyle = '#1a0a1a'; g.fillRect(bx, hy + 6, 12, 8); g.fillStyle = i < this.hp ? '#ff3b6b' : '#3a2a44'; g.fillRect(bx + 1, hy + 7, 10, 6); if (i < this.hp) { g.fillStyle = '#ffa0b8'; g.fillRect(bx + 1, hy + 7, 10, 1); } }
    if (this.intro > 0) return;
    // 下方面板
    const pw = VW - 16, ph = P ? 150 : 104, px = 8, py = VH - ph - 8;
    win(g, px, py, pw, ph, 'dlg');
    for (let i = 0; i < 3; i++) g.drawImage(cached('heart' + (i < this.hearts), () => makeHeart(i < this.hearts)), px + 8 + i * 13, py - 14);
    txt(g, '你', px + 50, py - 15, UIC.text);
    if (this.state === 'dying') { txt(g, this.cfg.name + '倒下了……', VW / 2, py + ph / 2 - 6, UIC.gold, { align: 'center' }); return; }
    const qL = wrap(this.Q.q, pw - 20); drawLines(g, qL, px + 10, py + 8);
    if (this.state === 'ask') {
      const cols = P ? 1 : 3, bwid = P ? pw - 30 : Math.floor((pw - 40) / 3);
      this.btns.forEach((b, i) => { b.w = bwid; b.x = px + 14 + (i % cols) * (bwid + 6); b.y = py + 10 + qL.length * LH + 6 + Math.floor(i / cols) * 24; });
    } else if (this.msg) {
      const mL = []; this.msg.forEach(m => wrap(m, pw - 20, this.lastOk ? UIC.mint : UIC.rose).forEach(l => mL.push(l)));
      drawLines(g, mL, px + 10, py + 10 + qL.length * LH + 4);
      this.btns.forEach(b => { b.x = px + pw - b.w - 10; b.y = py + ph - 26; });
    }
    this.drawBtns(g);
  }
}

/* ---------- 终端 ---------- */
class TerminalScreen extends Screen {
  constructor(title = '终端 — 发射场') {
    super(); this.title = title; this.out = [{ s: '欢迎使用终端。输入命令后按回车。', c: '#6f8a7a' }]; this.fails = 0; this.doneT = -1;
    this.inp = $('#tin'); this.inp.value = '';
    this.onKey = e => { if (e.key === 'Enter') { e.preventDefault(); this.submit(); } else Audio.sfx('key'); };
    this.inp.addEventListener('keydown', this.onKey);
    this.btns = [];
  }
  onOpen() { this.focusInput(); }
  focusInput() { const i = this.inp; i.style.display = 'block'; setTimeout(() => { try { i.focus({ preventScroll: true }); } catch (_) { i.focus(); } }, 30); }
  close() { this.inp.removeEventListener('keydown', this.onKey); this.inp.blur(); this.inp.style.display = 'none'; closeScreen(this, true); }
  async submit() {
    if (this.doneT >= 0) return;
    const raw = this.inp.value; this.inp.value = '';
    const cmd = raw.trim().replace(/\s+/g, ' ');
    this.out.push({ s: '$ ' + raw, c: '#c8ffd8' });
    if (!cmd) return;
    if (cmd.toLowerCase() === 'git push') {
      this.doneT = 0; this.inp.blur(); this.inp.style.display = 'none';
      const L = [['正在打包你的代码…… 100%', '#6f8a7a'], ['正在上传到云端…… 100%', '#6f8a7a'], ['To github.com:xiaobai/duckduck-app.git', '#c8ffd8'], ['   3f2a1c9..8e7d6b5  main -> main', '#c8ffd8'], ['推送成功！', '#7dffa6'], ['已触发自动部署：鸭鸭点餐 v1.0 正在发射……', '#7dffa6']];
      for (const [s, c] of L) { await wait(380); this.out.push({ s, c }); Audio.sfx('key'); }
      Audio.sfx('jingle');
      this.btns = [new Btn({ label: '好耶 ▶', w: 96, h: 20, style: 'primary', onPress: () => this.close() })]; this.focus = 0;
      return;
    }
    this.fails++; Audio.sfx('bad');
    const word = cmd.split(' ')[0];
    if (word.toLowerCase() === 'git') this.out.push({ s: `git: '${cmd.slice(4)}' 不是一个 git 命令。（差一点！检查一下拼写）`, c: '#ff8a9a' });
    else this.out.push({ s: `command not found: ${word}（终端看不懂。它只认准确的命令，错一个字母都不行）`, c: '#ff8a9a' });
    if (this.fails >= 2) this.out.push({ s: '提示：英文小写，git 和 push 中间有一个空格。', c: '#6f8a7a' });
  }
  update(dt) { this.t += dt; if (this.doneT >= 0) this.doneT += dt; if (Input.pointer.click && this.doneT < 0) this.focusInput(); this.nav(); }
  draw(g) {
    this.dimBg(g, .6);
    const w = VW - 16, h = PORTRAIT ? 300 : 200, x = 8, y = Math.round((VH - h) / 2) - (PORTRAIT ? 40 : 0);
    win(g, x, y, w, h, 'term');
    g.fillStyle = '#9aa4b8'; g.fillRect(x + 2, y + 2, w - 4, 14); txt(g, this.title, x + 8, y + 3, '#1a1222', { shadow: null });
    ['#ff6b6b', '#ffd23f', '#7dffa6'].forEach((c, i) => { g.fillStyle = c; g.fillRect(x + w - 40 + i * 10, y + 6, 6, 6); });
    txt(g, '在终端里输入 git push 再按回车', x + 10, y + 22, '#ffd23f', { shadow: null });
    const maxW = w - 24, all = []; this.out.forEach(o => wrap(o.s, maxW, o.c).forEach(l => all.push(l)));
    const maxLines = Math.floor((h - 76) / 13), vis = all.slice(-maxLines);
    drawLines(g, vis, x + 10, y + 40, { lh: 13, shadow: null });
    const iy = y + h - 28;
    g.fillStyle = '#0c1a14'; g.fillRect(x + 6, iy - 4, w - 12, 20);
    txt(g, '$', x + 10, iy, UIC.gold, { shadow: null });
    const v = this.inp.value; txt(g, v, x + 22, iy, '#7dffa6', { shadow: null });
    if (this.doneT < 0 && Math.floor(this.t * 2) % 2 === 0) { g.fillStyle = '#7dffa6'; g.fillRect(x + 22 + textW(v), iy + 1, 6, 11); }
    g.globalAlpha = .06; g.fillStyle = '#7dffa6'; for (let yy = y + 18; yy < y + h - 2; yy += 2) g.fillRect(x + 2, yy, w - 4, 1); g.globalAlpha = 1;
    const b = this.btns[0]; if (b) { b.x = x + w - b.w - 10; b.y = iy - 2; }
    this.drawBtns(g);
    if (this.doneT < 0 && TOUCH) txt(g, '点这里打字', x + w - 80, iy, '#6f8a7a', { shadow: null });
    // 透明输入框盖在终端窗口上：手机上点一下就能弹出键盘
    const r = cv.getBoundingClientRect(), s = r.width / VW;
    Object.assign(this.inp.style, { left: (r.left + (x + 6) * s) + 'px', top: (r.top + (y + 18) * s) + 'px', width: ((w - 12) * s) + 'px', height: ((h - 22) * s) + 'px' });
  }
}
