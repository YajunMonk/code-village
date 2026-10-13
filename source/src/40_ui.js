/* ============================================================
 * 40 界面：文字、窗口、按钮、屏幕栈、对话框
 * ============================================================ */
const FONT = '12px FusionPixel, monospace';
const LH = 14;
const UIC = {
  win: '#182042', win2: '#1f2a56', edge: '#f4e9cc', edge2: '#8a93c4', shadow: '#0a0c1c',
  text: '#f4eedc', dim: '#a7a6c8', gold: '#ffd23f', mint: '#6ef0a8', rose: '#ff6b84', sky: '#7ad0ff',
  paper: '#f6ecd2', paperInk: '#2a2030',
};
const [measCv, measCx] = makeCanvas(4, 4);
const CW = new Map();
function cw(ch) { let w = CW.get(ch); if (w === undefined) { measCx.font = FONT; w = Math.round(measCx.measureText(ch).width); CW.set(ch, w); } return w; }
const textW = s => { let w = 0; for (const ch of s) w += cw(ch); return w; };
const NO_START = '，。！？、；：）」』》…”’,.!?;:)] ';
const isWordCh = ch => /[A-Za-z0-9_\-"'.]/.test(ch);

/* 富文本：【】里的字高亮 */
function tokens(text, base = UIC.text, hl = UIC.gold) {
  const out = []; let c = base;
  for (const ch of text) {
    if (ch === '【') { c = hl; out.push({ ch, c }); continue; }
    if (ch === '】') { out.push({ ch, c }); c = base; continue; }
    out.push({ ch, c });
  }
  return out;
}
function wrap(text, maxW, base, hl) {
  const lines = []; let line = [], w = 0;
  const toks = tokens(text, base, hl);
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (t.ch === '\n') { lines.push(line); line = []; w = 0; continue; }
    let cwid = cw(t.ch);
    if (isWordCh(t.ch) && (i === 0 || !isWordCh(toks[i - 1].ch))) {
      let j = i, ww = 0; while (j < toks.length && isWordCh(toks[j].ch)) { ww += cw(toks[j].ch); j++; }
      if (w + ww > maxW && ww <= maxW && line.length) { lines.push(line); line = []; w = 0; }
    }
    if (w + cwid > maxW && line.length && !NO_START.includes(t.ch)) {
      if (t.ch === ' ') { lines.push(line); line = []; w = 0; continue; }
      lines.push(line); line = []; w = 0;
    }
    line.push(t); w += cwid;
  }
  lines.push(line);
  return lines;
}
function drawLines(g, lines, x, y, { lh = LH, max = Infinity, shadow = UIC.shadow, align = 'left', width = 0 } = {}) {
  g.font = FONT; g.textBaseline = 'alphabetic';
  let n = 0;
  for (let li = 0; li < lines.length; li++) {
    let cx = x;
    if (align === 'center') cx = x + Math.round((width - lines[li].reduce((a, t) => a + cw(t.ch), 0)) / 2);
    for (const t of lines[li]) {
      if (n >= max) return n;
      if (shadow) { g.fillStyle = shadow; g.fillText(t.ch, cx + 1, y + li * lh + 11); }
      g.fillStyle = t.c; g.fillText(t.ch, cx, y + li * lh + 10);
      cx += cw(t.ch); n++;
    }
  }
  return n;
}
function txt(g, s, x, y, c = UIC.text, { shadow = UIC.shadow, align = 'left' } = {}) {
  g.font = FONT; g.textBaseline = 'alphabetic';
  if (align === 'center') x = Math.round(x - textW(s) / 2); else if (align === 'right') x = Math.round(x - textW(s));
  if (shadow) { g.fillStyle = shadow; g.fillText(s, x + 1, y + 11); }
  g.fillStyle = c; g.fillText(s, x, y + 10);
}
const countChars = lines => lines.reduce((a, l) => a + l.length, 0);

/* ---------- 窗口 ---------- */
function win(g, x, y, w, h, style = 'dlg') {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  const S = {
    dlg: [UIC.win, UIC.win2, UIC.edge, UIC.edge2],
    paper: ['#efe2c0', UIC.paper, '#5a4632', '#c9b088'],
    dark: ['#0e0a18', '#16122a', '#6a6290', '#3a3458'],
    term: ['#050a08', '#081410', '#7a8a84', '#2a3a34'],
    gold: ['#2a1e10', '#3a2a16', '#ffd23f', '#a8801a'],
  }[style];
  g.fillStyle = 'rgba(6,4,14,.5)'; g.fillRect(x + 2, y + 3, w, h);
  g.fillStyle = S[2]; g.fillRect(x + 1, y, w - 2, h); g.fillRect(x, y + 1, w, h - 2);
  g.fillStyle = S[0]; g.fillRect(x + 2, y + 2, w - 4, h - 4);
  g.fillStyle = S[1]; g.fillRect(x + 2, y + 2, w - 4, Math.min(h - 4, Math.round((h - 4) * .45)));
  g.fillStyle = S[3]; g.fillRect(x + 2, y + 2, w - 4, 1); g.fillRect(x + 2, y + 2, 1, h - 4);
  g.fillStyle = rgba(S[2], .35); g.fillRect(x + 3, y + h - 3, w - 6, 1);
  if (style === 'dlg' || style === 'gold') { g.fillStyle = S[2]; [[x + 3, y + 3], [x + w - 4, y + 3], [x + 3, y + h - 4], [x + w - 4, y + h - 4]].forEach(([a, b]) => g.fillRect(a, b, 1, 1)); }
}
function cursor(g, x, y, t) { const o = Math.round(Math.sin(t * 8) * 1.5); g.fillStyle = UIC.gold; for (let i = 0; i < 4; i++) g.fillRect(x + o + i, y + i, 1, 7 - i * 2); g.fillStyle = UIC.shadow; g.fillRect(x + o, y + 7, 1, 1); }
function icon(g, id, x, y, s = 1) { const im = ICON[id]; if (im) g.drawImage(im, Math.round(x), Math.round(y), im.width * s, im.height * s); }

/* ---------- 代码高亮 ---------- */
const KW = ['如果', '否则', '重复', '函数', '返回', '并且', '或者', 'let', 'const', 'function', 'return', 'if', 'else', 'npm', 'install', 'git', 'push'];
function codeTokens(line) {
  const out = []; let i = 0;
  const push = (s, c) => { for (const ch of s) out.push({ ch, c }); };
  while (i < line.length) {
    const rest = line.slice(i);
    let m;
    if (rest.startsWith('//')) { push(rest, '#7a86a8'); break; }
    if ((m = /^"[^"]*"?/.exec(rest))) { push(m[0], '#a8f08a'); i += m[0].length; continue; }
    if ((m = /^\d+(\.\d+)?/.exec(rest))) { push(m[0], '#ffb86a'); i += m[0].length; continue; }
    const kw = KW.find(k => rest.startsWith(k) && !/[A-Za-z]/.test(rest[k.length] || ''));
    if (kw) { push(kw, '#ff8ad8'); i += kw.length; continue; }
    if ((m = /^[=+\-*/<>!{}()[\],.:;←↓]+/.exec(rest))) { push(m[0], '#ffd23f'); i += m[0].length; continue; }
    push(rest[0], '#bfe6ff'); i++;
  }
  return out;
}
function codeLines(code, maxW) {
  const out = [];
  for (const raw of code.split('\n')) {
    const toks = codeTokens(raw); let line = [], w = 0;
    for (const t of toks) { const cwid = cw(t.ch); if (w + cwid > maxW && line.length) { out.push(line); line = [{ ch: ' ', c: '#000' }, { ch: ' ', c: '#000' }]; w = cw(' ') * 2; } line.push(t); w += cwid; }
    out.push(line);
  }
  return out;
}
function codeBox(g, code, x, y, maxW, { title = '代码', style = 'dark' } = {}) {
  const lines = codeLines(code, maxW - 22);
  const w = Math.min(maxW, Math.max(80, ...lines.map(l => l.reduce((a, t) => a + cw(t.ch), 0))) + 24), h = lines.length * 13 + 16;
  win(g, x, y, w, h, style);
  g.fillStyle = '#2a2448'; g.fillRect(x + 3, y + 3, 14, h - 6);
  g.font = FONT;
  lines.forEach((l, i) => { g.fillStyle = '#5a5480'; if (i < 99) txt(g, String(i + 1), x + 4, y + 6 + i * 13, '#5a5480', { shadow: null }); });
  drawLines(g, lines, x + 20, y + 6, { lh: 13, shadow: null });
  return { w, h };
}
function measureCode(code, maxW) { const lines = codeLines(code, maxW - 22); return { w: Math.min(maxW, Math.max(80, ...lines.map(l => l.reduce((a, t) => a + cw(t.ch), 0))) + 24), h: lines.length * 13 + 16 }; }

/* ---------- 按钮 ---------- */
class Btn {
  constructor(o) { Object.assign(this, { x: 0, y: 0, w: 60, h: 18, label: '', disabled: false, state: '', style: 'btn', pad: 6 }, o); }
  get cx() { return this.x + this.w / 2; } get cy() { return this.y + this.h / 2; }
  hit(p) { return p && p.x >= this.x && p.y >= this.y && p.x < this.x + this.w && p.y < this.y + this.h; }
  draw(g, focus, t) {
    const { x, y, w, h } = this;
    let base = this.style === 'primary' ? ['#ffd23f', '#fff0a0', '#2a1e10'] : this.style === 'chip' ? ['#efe2c0', '#fff8e4', '#3a2a20'] : ['#232c5e', '#2e3a78', UIC.text];
    if (this.state === 'right') base = ['#1e5a3a', '#2a7a4e', '#eafff2'];
    if (this.state === 'wrong') base = ['#4a1e2e', '#5a2638', '#c88a9a'];
    const edge = focus && !this.disabled ? UIC.gold : this.state === 'right' ? UIC.mint : this.state === 'wrong' ? UIC.rose : this.style === 'btn' ? '#6a74b0' : '#2a1e10';
    g.globalAlpha = this.disabled && this.state !== 'right' && this.state !== 'wrong' ? .45 : 1;
    const lift = focus && !this.disabled ? -1 : 0;
    g.fillStyle = 'rgba(6,4,14,.55)'; g.fillRect(x + 1, y + 2, w, h);
    g.fillStyle = edge; g.fillRect(x + 1, y + lift, w - 2, h); g.fillRect(x, y + 1 + lift, w, h - 2);
    g.fillStyle = base[0]; g.fillRect(x + 1, y + 1 + lift, w - 2, h - 2);
    g.fillStyle = base[1]; g.fillRect(x + 1, y + 1 + lift, w - 2, Math.max(1, Math.round((h - 2) * .45)));
    const tc = base[2];
    if (this.lines) {
      drawLines(g, this.lines, x + this.pad + (this.icon ? 18 : 0), y + 3 + lift, { lh: 13, shadow: this.style === 'chip' || this.style === 'primary' ? null : UIC.shadow });
    } else {
      const tw = textW(this.label);
      txt(g, this.label, this.align === 'left' ? x + this.pad + (this.icon ? 18 : 0) : x + Math.round((w - tw) / 2) + (this.icon ? 8 : 0), y + Math.round((h - 12) / 2) + lift, tc, { shadow: this.style === 'chip' || this.style === 'primary' ? null : UIC.shadow });
    }
    if (this.icon) icon(g, this.icon, x + 3, y + Math.round((h - 16) / 2) + lift);
    if (this.state === 'wrong') { g.fillStyle = UIC.rose; g.fillRect(x + 4, y + Math.round(h / 2), w - 8, 1); }
    if (this.state === 'right') { g.fillStyle = UIC.mint; const cx = x + w - 12, cy = y + Math.round(h / 2) - 2; [[0, 2], [1, 3], [2, 4], [3, 3], [4, 2], [5, 1], [6, 0]].forEach(([a, b]) => g.fillRect(cx + a, cy + b, 1, 1)); }
    if (focus && !this.disabled) cursor(g, x - 9, y + Math.round(h / 2) - 4, t);
    g.globalAlpha = 1;
  }
}

/* ---------- 屏幕栈 ---------- */
const screens = [];
function openScreen(s) { return new Promise(res => { s._res = res; s.t = 0; screens.push(s); if (s.onOpen) s.onOpen(); }); }
function closeScreen(s, v) { const i = screens.indexOf(s); if (i >= 0) screens.splice(i, 1); if (s._res) { const r = s._res; s._res = null; r(v); } }
const topScreen = () => screens[screens.length - 1];

class Screen {
  constructor() { this.btns = []; this.focus = 0; this.t = 0; this.dim = 0; }
  nav() {
    const B = this.btns.filter(b => !b.disabled && !b.hidden);
    const p = Input.pointer;
    if (p.moved && Input.device === 'mouse') { const i = this.btns.findIndex(b => !b.disabled && !b.hidden && b.hit(p)); if (i >= 0 && i !== this.focus) { this.focus = i; } }
    if (p.click) { const i = this.btns.findIndex(b => !b.disabled && !b.hidden && b.hit(p.click)); if (i >= 0) { this.focus = i; Audio.sfx('select'); this.press(this.btns[i]); return true; } }
    if (!B.length) return false;
    let cur = this.btns[this.focus];
    if (!cur || cur.disabled || cur.hidden) { this.focus = this.btns.indexOf(B[0]); cur = B[0]; }
    for (const d of ['up', 'down', 'left', 'right']) {
      if (!Input.hit(d)) continue;
      const vx = d === 'left' ? -1 : d === 'right' ? 1 : 0, vy = d === 'up' ? -1 : d === 'down' ? 1 : 0;
      let best = null, bd = 1e9;
      for (const b of B) {
        if (b === cur) continue;
        const dx = b.cx - cur.cx, dy = b.cy - cur.cy, along = dx * vx + dy * vy;
        if (along <= 2) continue;
        const across = Math.abs(dx * vy) + Math.abs(dy * vx), score = along + across * 2.2;
        if (score < bd) { bd = score; best = b; }
      }
      if (!best && (vy !== 0)) { const ordered = B.slice(); const i = ordered.indexOf(cur); best = ordered[(i + vy + ordered.length) % ordered.length]; }
      if (best) { this.focus = this.btns.indexOf(best); Audio.sfx('move'); }
    }
    if (Input.hit('ok')) { Audio.sfx('select'); this.press(this.btns[this.focus]); return true; }
    return false;
  }
  press(b) { if (b && !b.disabled && b.onPress) b.onPress(b); }
  drawBtns(g) { this.btns.forEach((b, i) => { if (!b.hidden) b.draw(g, i === this.focus && (Input.device !== 'touch'), this.t); }); }
  dimBg(g, a = .55) { g.fillStyle = `rgba(8,6,20,${a})`; g.fillRect(0, 0, VW, VH); }
}

/* ---------- 头像 ---------- */
const WHO = {
  me: { n: '小白', c: '#e6eaf5', id: 'player', v: 3 }, duck: { n: '鸭老师', c: '#ffd23f', id: 'duck', v: 6 }, xa: { n: '小 A', c: '#7af8ff', id: 'xa', v: 9 },
  chef: { n: '锅锅', c: '#bcd6ff', id: 'chef', v: 1 }, pm: { n: '阿需', c: '#7ae8d8', id: 'pm', v: 4 }, snail: { n: '小步', c: '#c8f08a', id: 'snail', v: 2 },
  webkid: { n: '网页三兄弟', c: '#ff9a6a', id: 'webkid', v: 5 }, cook: { n: '饭馆老板', c: '#ff9a8a', id: 'cook', v: 2 }, waiter: { n: '跑堂小 P', c: '#ffb0b0', id: 'waiter', v: 6 },
  builder: { n: '包工头大壮', c: '#ffcc6a', id: 'builder', v: 0 }, prof: { n: '模博士', c: '#bfe6ff', id: 'prof', v: 3 }, granny: { n: '记事本婆婆', c: '#d0b0ff', id: 'granny', v: 4 },
  detective: { n: '侦探老 K', c: '#e8c090', id: 'detective', v: 1 }, zero: { n: '书虫小零', c: '#7ae8c0', id: 'zero', v: 3 }, runner: { n: '圈圈', c: '#ffb070', id: 'runner', v: 7 },
  priest: { n: '存档神官', c: '#ffe07a', id: 'priest', v: 1 }, merchant: { n: '零件商人', c: '#a8e08a', id: 'merchant', v: 3 }, banker: { n: '金库管家', c: '#ffe07a', id: 'banker', v: 0 },
  doc: { n: '虫医生', c: '#ffffff', id: 'doc', v: 2 }, homebody: { n: '宅宅', c: '#c8a8ff', id: 'homebody', v: 5 }, postman: { n: '邮差阿邮', c: '#8ae09a', id: 'postman', v: 4 },
  astro: { n: '舰长', c: '#e8ecf6', id: 'astro', v: 2 },
  fog: { n: '需求迷雾怪', c: '#c8c8e0', id: 'boss:fog', v: -2 }, ghost: { n: '404 幽灵', c: '#bfd0ff', id: 'boss:ghost', v: 2 }, fox: { n: '幻觉狐狸', c: '#ffa860', id: 'boss:fox', v: 4 },
  dragon: { n: '合并冲突双头龙', c: '#8ae09a', id: 'boss:dragon2', v: -2 }, fire: { n: '线上事故火龙', c: '#ff7a5a', id: 'boss:fire', v: -3 }, boss: { n: '黑话魔王', c: '#ff4ac8', id: 'boss:final', v: -3 },
  bug: { n: '小书虫', c: '#ff8a8a', id: 'bug', v: 8 }, sign: { n: '告示牌', c: '#e9d3a0', id: 'sign', v: 2 }, door: { n: '上线之门', c: '#7dffa6', id: 'door', v: 0 },
  sticky: { n: '便利贴精灵', c: '#fff27a', id: 'sticky', v: 9 }, kidA: { n: '星星', c: '#a8e0ff', id: 'kidA', v: 5 }, kidB: { n: '变变', c: '#ff9ac8', id: 'kidB', v: 6 },
  kidC: { n: '开开', c: '#ffc87a', id: 'kidC', v: 4 }, kidD: { n: '饼饼', c: '#ffd890', id: 'kidD', v: 6 }, iceKid: { n: '冰柜小哥', c: '#8ac8ff', id: 'iceKid', v: 3 },
};
let talkingWho = null;
function portraitOf(id, talk) {
  switch (id) {
    case 'duck': return { img: duckFrame(0, talk), sx: 0, sy: 0, sw: 18, sh: 17 };
    case 'chef': return { img: chefFrame(0, talk), sx: 0, sy: 6, sw: 20, sh: 20 };
    case 'runner': return { img: runnerFrame(0, talk), sx: 0, sy: 1, sw: 18, sh: 22 };
    case 'sticky': return { img: stickyFrame(0, talk), sx: 0, sy: 0, sw: 18, sh: 20 };
    case 'xa': return { img: xaFrame(0, talk), sx: 0, sy: 0, sw: 18, sh: 18 };
    case 'snail': return { img: snailFrame(0, talk), sx: 0, sy: 0, sw: 20, sh: 17 };
    case 'bug': return { img: BUGIMG(), sx: 0, sy: 0, sw: 18, sh: 16 };
    case 'sign': return { img: PROP.sign, sx: 0, sy: 0, sw: 20, sh: 14 };
    case 'door': return { img: ICON.deploy, sx: 0, sy: 0, sw: 18, sh: 18 };
    default: if (id.startsWith('boss:')) return { img: bossFrame(0, false, id.slice(5)), sx: 4, sy: 4, sw: 58, sh: 50 }; return { img: charFrame(id, 0, 0, talk ? 1 : 0), sx: 0, sy: CHAR[id] && CHAR[id].short ? 2 : 1, sw: 18, sh: 18 };
  }
}
function drawPortrait(g, id, x, y, s, talk) {
  const p = portraitOf(id, talk);
  win(g, x, y, s, s, 'dark');
  g.fillStyle = '#2a2450'; g.fillRect(x + 3, y + 3, s - 6, s - 6);
  g.fillStyle = '#342e60'; g.fillRect(x + 3, y + 3, s - 6, Math.round((s - 6) / 2));
  const k = Math.min((s - 8) / p.sw, (s - 8) / p.sh), dw = Math.round(p.sw * k), dh = Math.round(p.sh * k);
  g.save(); g.beginPath(); g.rect(x + 3, y + 3, s - 6, s - 6); g.clip();
  g.drawImage(p.img, p.sx, p.sy, p.sw, p.sh, x + Math.round((s - dw) / 2), y + s - 3 - dh, dw, dh);
  g.restore();
}

/* ---------- 对话 ---------- */
class DialogScreen extends Screen {
  constructor(lines) { super(); this.lines = lines; this.i = -1; this.next(); }
  layout() {
    const portrait = !!this.W, ps = PORTRAIT ? 34 : 40;
    const x = 6, w = VW - 12, tx = x + (portrait ? ps + 14 : 12), tw = w - (tx - x) - 12;
    const maxLines = PORTRAIT ? 5 : 3;
    const y = VH - (maxLines * LH + 20) - 6;
    return { x, y, w, h: maxLines * LH + 20, tx, tw, ps, maxLines };
  }
  next() {
    this.i++;
    if (this.i >= this.lines.length) { talkingWho = null; closeScreen(this); return; }
    const l = this.lines[this.i];
    let who = '', text = '', code = '';
    if (typeof l === 'string') text = l; else [who, text, code = ''] = l;
    this.who = who; this.W = WHO[who]; this.code = code;
    const L = this.layout();
    const all = wrap(text, L.tw, this.W ? UIC.text : '#d8d2ec');
    this.pages = []; for (let i = 0; i < all.length; i += L.maxLines) this.pages.push(all.slice(i, i + L.maxLines));
    this.page = 0; this.n = 0; this.acc = 0; this.total = countChars(this.pages[0]);
    talkingWho = who;
  }
  update(dt) {
    this.t += dt;
    if (this.n < this.total) {
      this.acc += dt * 38; const k = Math.floor(this.acc);
      if (k > 0) { this.acc -= k; const b = this.n; this.n = Math.min(this.total, this.n + k); if (Math.floor(this.n / 2) !== Math.floor(b / 2)) Audio.sfx('blip', this.W ? this.W.v : 0); }
      talkingWho = this.who;
    } else talkingWho = null;
    const adv = Input.hit('ok') || Input.hit('back') || !!Input.pointer.click;
    if (adv) {
      if (this.n < this.total) this.n = this.total;
      else if (this.page < this.pages.length - 1) { this.page++; this.n = 0; this.acc = 0; this.total = countChars(this.pages[this.page]); }
      else { Audio.sfx('move'); this.next(); }
    }
  }
  draw(g) {
    const L = this.layout();
    if (this.code) {
      const m = measureCode(this.code, VW - 12);
      codeBox(g, this.code, Math.round((VW - m.w) / 2), L.y - m.h - (this.W ? 18 : 6), VW - 12);
    }
    win(g, L.x, L.y, L.w, L.h, 'dlg');
    if (this.W) {
      drawPortrait(g, this.W.id, L.x + 7, L.y + Math.round((L.h - L.ps) / 2), L.ps, this.n < this.total && Math.floor(this.t * 8) % 2);
      const nw = textW(this.W.n) + 16;
      win(g, L.x + 6, L.y - 14, nw, 18, 'gold');
      txt(g, this.W.n, L.x + 14, L.y - 11, this.W.c);
    }
    drawLines(g, this.pages[this.page], L.tx, L.y + 9, { max: this.n });
    if (this.n >= this.total) { const b = Math.floor(this.t * 3) % 2; g.fillStyle = UIC.gold; const ax = L.x + L.w - 14, ay = L.y + L.h - 10 + b; g.fillRect(ax, ay, 7, 1); g.fillRect(ax + 1, ay + 1, 5, 1); g.fillRect(ax + 2, ay + 2, 3, 1); g.fillRect(ax + 3, ay + 3, 1, 1); }
  }
}
const talk = lines => openScreen(new DialogScreen(lines));

/* ---------- 提示条 ---------- */
const toasts = [];
function toast(text, c = UIC.gold) { toasts.push({ text, c, t: 0 }); }
function drawToasts(g, dt) {
  const T0 = toasts[0]; if (!T0) return;
  T0.t += dt; const life = 2.6;
  const a = T0.t < .2 ? T0.t / .2 : T0.t > life - .3 ? (life - T0.t) / .3 : 1;
  const w = textW(T0.text) + 20, x = Math.round((VW - w) / 2), y = Math.round(28 + (1 - easeOut(Math.min(1, T0.t * 4))) * -10);
  g.globalAlpha = clamp(a, 0, 1); win(g, x, y, w, 20, 'gold'); txt(g, T0.text, x + 10, y + 4, T0.c); g.globalAlpha = 1;
  if (T0.t > life) toasts.shift();
}

/* ---------- 转场 ---------- */
const fx = { fade: 0, fadeC: '#000000', flash: 0, flashC: '#ffffff', shake: 0 };
function fadeTo(target, dur = .5, color = '#000000') {
  fx.fadeC = color;
  return new Promise(res => { const from = fx.fade, t0 = performance.now(); const step = () => { const k = Math.min(1, (performance.now() - t0) / (dur * 1000)); fx.fade = lerp(from, target, k); if (k < 1) requestAnimationFrame(step); else res(); }; step(); });
}
function flash(c = '#ffffff', a = 1) { fx.flashC = c; fx.flash = a; }
function shake(a = 4) { fx.shake = Math.max(fx.shake, a); }
