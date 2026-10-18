/* ============================================================
 * 22 美术（第三版新增）：新村民、小 A、Boss 们、帽子、术语图标
 * ============================================================ */
Object.assign(hairStyles, {
  bob(A, y, dir, h) {
    const { R } = A;
    hairStyles.short(A, y, dir, h);
    if (dir === 0) { R(2, y + 3, 12, 1, h[1]); R(1, y + 2, 2, 9, h[1]); R(13, y + 2, 2, 9, h[0]); }
    else if (dir === 1) R(1, y + 1, 14, 10, h[1]);
    else { R(7, y + 1, 8, 10, h[1]); R(2, y + 3, 5, 1, h[1]); }
  },
  wild(A, y, dir, h) {
    const { R, P } = A;
    hairStyles.short(A, y, dir, h);
    [[0, 2], [1, 1], [14, 2], [15, 3], [0, 5], [15, 6], [3, -2], [12, -2], [7, -3], [9, -2]].forEach(([x, d]) => { P(x, y + d, h[1]); P(x, y + d + 1, h[2]); });
    R(1, y + 2, 1, 4, h[1]); R(14, y + 2, 1, 4, h[0]);
  },
  hardhat(A, y, dir, h, o) {
    const { R, P } = A;
    hairStyles.short(A, y + 1, dir, o.hairUnder);
    R(4, y - 3, 8, 1, h[1]); R(3, y - 2, 10, 4, h[1]); R(4, y - 2, 3, 1, h[2]); R(7, y - 3, 2, 5, h[0]);
    R(1, y + 2, 14, 1, h[0]); R(2, y + 1, 12, 1, h[1]);
    P(5, y - 1, h[2]);
  },
  helmet(A, y, dir, h, o) {
    const { R } = A;
    hairStyles.short(A, y, dir, o.hairUnder);
    const c = '#cfe8ff', d = '#8ab4e8';
    R(3, y - 3, 10, 1, c); R(1, y - 2, 2, 1, c); R(13, y - 2, 2, 1, c); R(0, y - 1, 1, 12, c); R(15, y - 1, 1, 12, d);
    R(1, y + 11, 14, 1, d); R(4, y - 2, 2, 1, '#ffffff'); R(1, y, 1, 3, '#ffffff');
  },
  deer(A, y, dir, h) {
    const { R, P } = A;
    R(3, y - 2, 10, 1, h[1]); R(2, y - 1, 12, 3, h[1]); R(2, y - 1, 12, 1, h[2]);
    for (let x = 3; x < 13; x += 2) P(x, y, h[0]);
    if (dir === 0) { R(1, y + 2, 14, 1, h[0]); R(1, y + 3, 2, 4, h[1]); R(13, y + 3, 2, 4, h[0]); }
    else if (dir === 1) R(2, y + 2, 12, 8, '#3a2a22');
    else { R(0, y + 2, 5, 1, h[0]); R(10, y + 2, 5, 3, h[1]); R(9, y + 3, 5, 6, '#3a2a22'); }
  },
});
Object.assign(CHAR, {
  pm: { style: 'bob', hair: ['#1a1420', '#2e2236', '#4a3a56'], shirt: ['#1e6a6a', '#2a9a94', '#5ac8c0'], pants: ['#2a2f4a', '#3b4266'], eyes: 'glasses', glassC: '#ffd23f',
    body(A, by) { A.R(9, by + 2, 4, 5, '#f6ecd2'); A.R(9, by + 2, 4, 1, '#e04848'); A.R(10, by + 4, 2, 1, '#8a8fa8'); } },
  waiter: { style: 'cap', hair: ['#8a1e1e', '#c43a3a', '#ec6a5a'], hairUnder: '#3a2418', shirt: ['#b8c0d8', '#eef1f8', '#ffffff'], pants: ['#1c1e2a', '#2a2d3e'],
    body(A, by) { A.R(6, by, 4, 1, '#c43a3a'); A.P(7, by + 1, '#c43a3a'); A.P(8, by + 1, '#c43a3a'); A.R(4, by + 4, 8, 3, '#2a2d3e'); } },
  builder: { style: 'hardhat', hair: ['#c08a10', '#ffcc2a', '#fff07a'], hairUnder: ['#2a1a10', '#4a3020', '#6b4a2b'], shirt: ['#c0501a', '#ff7a2a', '#ffa860'], pants: ['#2a3a6a', '#3a5090'], beard: '#4a3020',
    body(A, by) { A.R(4, by + 3, 8, 1, '#e8f070'); A.R(4, by + 5, 8, 1, '#e8f070'); } },
  prof: { style: 'wild', hair: ['#a8a8c0', '#dcdcec', '#ffffff'], shirt: ['#b8c0d8', '#eef1f8', '#ffffff'], pants: ['#3a4060', '#4e5680'], eyes: 'glasses', glassC: '#5ad1ff',
    body(A, by) { A.R(7, by, 2, 6, '#5a6aa8'); A.P(5, by + 2, '#5ad1ff'); A.P(5, by + 3, '#ff8ad8'); } },
  detective: { style: 'deer', hair: ['#5a3a1e', '#8a5a32', '#b07a48'], shirt: ['#5a3a1e', '#8a5a32', '#b07a48'], robe: true, trim: '#5a3a1e',
    body(A, by) { A.R(7, by, 2, 6, '#3a2418'); A.E(12, by + 4, 2, 2, '#bfe6ff'); A.P(12, by + 4, '#ffffff'); } },
  banker: { style: 'slick', hair: ['#4a4a5a', '#6a6a7a', '#9a9aaa'], shirt: ['#1e4a3a', '#2e6a52', '#4a8a70'], pants: ['#1c2a24', '#2a3e34'], eyes: 'glasses', glassC: '#ffd23f',
    body(A, by) { A.R(7, by, 2, 1, '#ffffff'); A.R(7, by + 1, 2, 4, C.gold[1]); A.P(5, by + 3, C.gold[2]); } },
  homebody: { style: 'short', hair: ['#2a1a30', '#3e2a4a', '#5a4268'], shirt: ['#4a3a7a', '#6a52a8', '#8a72c8'], pants: ['#2a2a3a', '#3a3a50'],
    body(A, by) { A.R(5, by, 6, 1, '#8a72c8'); A.R(6, by + 4, 4, 2, '#4a3a7a'); },
    extra(A, y, dir) { if (dir !== 1) { A.R(1, y + 4, 2, 4, '#e04848'); A.R(13, y + 4, 2, 4, '#e04848'); A.R(2, y - 1, 12, 1, '#2a2a3a'); } } },
  postman: { style: 'cap', hair: ['#1e5a2e', '#2e8a46', '#5ac070'], hairUnder: '#3a2418', shirt: ['#1e5a2e', '#2e8a46', '#5ac070'], pants: ['#2a3a2e', '#3a5040'],
    body(A, by) { A.L(4, by + 1, 11, by + 6, '#8a5a32'); A.R(9, by + 4, 4, 3, '#c98e57'); } },
  astro: { style: 'helmet', hair: [], hairUnder: ['#3b2418', '#5c3a26', '#86583a'], shirt: ['#b8c0d8', '#eef1f8', '#ffffff'], pants: ['#b8c0d8', '#dfe4f0'], shoes: '#5a5f78',
    body(A, by) { A.R(6, by + 2, 4, 3, '#3a7ae0'); A.P(6, by + 2, '#e04848'); A.P(9, by + 4, '#ffd23f'); } },
  iceKid: { style: 'cap', hair: ['#2a6aa8', '#4a9ae0', '#8ac8ff'], hairUnder: '#2a1a10', shirt: ['#2a6aa8', '#4a9ae0', '#8ac8ff'], pants: ['#2a3050', '#3a4470'], short: true },
});

/* 职业从侧面和背面也能辨认，避免村民一转身就变成同一件衣服。 */
Object.assign(CHAR.pm, { skin: ['#a66b54', '#ce9272', '#eab38b'],
  bodySide(A, y) { A.R(3, y + 3, 4, 5, '#e4d2ac'); A.R(4, y + 3, 3, 1, '#ab645b'); A.P(4, y + 5, '#6b6d72'); },
  bodyBack(A, y) { A.R(4, y + 5, 8, 1, '#1e6a6a'); A.R(7, y + 1, 2, 2, '#69c4b4'); }
});
Object.assign(CHAR.builder, { skin: ['#a56e4f', '#cb9873', '#e8bb8e'], shoes: '#684b38',
  bodySide(A, y) { A.R(4, y + 3, 6, 1, '#e8e9a5'); A.R(6, y + 6, 6, 1, '#654d36'); A.R(10, y + 5, 2, 3, '#77858c'); },
  bodyBack(A, y) { A.R(4, y + 3, 8, 1, '#e8e9a5'); A.R(4, y + 6, 8, 1, '#654d36'); A.R(5, y + 5, 2, 3, '#8d6947'); }
});
Object.assign(CHAR.prof, {
  bodySide(A, y) { A.R(9, y + 3, 3, 4, '#a9c1c8'); A.P(10, y + 2, '#dc8794'); A.P(11, y + 2, '#72bfc7'); },
  bodyBack(A, y) { A.R(4, y + 5, 8, 1, '#c8d3dc'); A.R(7, y + 6, 1, 2, '#a8b6c8'); }
});
Object.assign(CHAR.postman, { skin: ['#b1785d', '#dea47b', '#f3c89b'],
  bodySide(A, y) { A.R(9, y + 2, 5, 6, '#9c704b'); A.R(9, y + 2, 5, 2, '#d0a776'); A.P(11, y + 5, '#e8d5a5'); },
  bodyBack(A, y) { A.L(4, y, 11, y + 7, '#d0a776'); A.R(8, y + 5, 5, 3, '#9c704b'); }
});
Object.assign(CHAR.zero, { skin: ['#9c674f', '#c48c68', '#e1ad82'],
  bodySide(A, y) { A.R(3, y + 3, 4, 5, '#c6a167'); A.R(4, y + 4, 2, 3, '#f2e2b9'); },
  bodyBack(A, y) { A.R(3, y + 1, 10, 7, '#886c55'); A.R(4, y + 1, 8, 2, '#b59670'); A.P(7, y + 4, '#edd69d'); }
});
Object.assign(CHAR.granny, {
  bodySide(A, y) { A.R(4, y + 1, 6, 2, '#d6b9d6'); A.P(5, y + 4, '#f2d27a'); },
  bodyBack(A, y) { A.R(3, y, 10, 3, '#d6b9d6'); A.R(5, y + 3, 6, 1, '#b18dbb'); }
});
Object.assign(CHAR.detective, {
  bodySide(A, y) { A.R(4, y + 1, 8, 2, '#b88c62'); A.R(5, y + 6, 7, 1, '#5c4434'); },
  bodyBack(A, y) { A.R(3, y, 10, 3, '#b88c62'); A.R(4, y + 6, 8, 1, '#5c4434'); A.R(7, y + 6, 2, 1, '#c4ab77'); }
});

/* ---------- 小 A：AI 实习生 ---------- */
function makeXA(f = 0, talk = 0, mood = 'ok') {
  return spr(16, 20, A => {
    const { R, E, P } = A; const b = f ? 1 : 0;
    const w = ['#b7a88e', '#eee1c3', '#fff4d9'];
    P(11, 0 + b, '#7bc9bd'); R(11, 1 + b, 1, 2, '#a78a59');
    R(2, 3 + b, 13, 10, w[1]); R(3, 2 + b, 11, 1, w[1]); R(3, 13 + b, 11, 1, w[0]); R(2, 3 + b, 1, 9, w[2]); R(14, 4 + b, 1, 9, w[0]);
    R(4, 5 + b, 9, 6, '#1a2440'); R(4, 5 + b, 9, 1, '#2a3660');
    const e = '#5af0ff';
    if (mood === 'happy') { [[5, 8], [6, 7], [7, 8], [9, 8], [10, 7], [11, 8]].forEach(([x, y]) => P(x, y + b, e)); }
    else if (mood === 'dizzy') { P(5, 7 + b, e); P(7, 7 + b, e); P(6, 8 + b, e); P(5, 9 + b, e); P(7, 9 + b, e); P(9, 7 + b, e); P(11, 7 + b, e); P(10, 8 + b, e); P(9, 9 + b, e); P(11, 9 + b, e); }
    else { R(5, 7 + b, 2, 2, e); R(10, 7 + b, 2, 2, e); P(5, 7 + b, '#d8ffff'); P(10, 7 + b, '#d8ffff'); }
    if (talk) R(7, 10 + b, 3, 1, e);
    P(3, 9 + b, '#df9b7d'); P(13, 9 + b, '#df9b7d');
    R(0,6+b,2,5,'#9b784d');R(0,7+b,1,3,'#80bcb0');R(15,6+b,1,5,'#4f9389');P(15,7+b,'#91cdbb');
    R(5, 14 + b, 7, 3, w[1]); R(5, 16 + b, 7, 1, w[0]); R(7, 15 + b, 3, 1, '#5af0ff');
    R(3, 14 + b, 2, 2, w[0]); R(12, 14 + b, 2, 2, w[0]);
    R(5,13+b,7,1,'#3f766c');R(6,14+b,5,1,'#65a292');R(8,15+b,2,1,'#3f766c');
    E(8.5, 18.5 + b, 2.5, 1, f ? '#7af8ff' : '#5ad1ff');
  });
}
/* ---------- 蜗牛小步 ---------- */
function makeSnail(f = 0, talk = 0) {
  return spr(24, 22, A => {
    const {R,E,P,L}=A,b=f?1:0;
    E(12,19,11.5,2.7,'#a9bd78');R(2,20,21,1,'#7d985a');R(15,11+b,7,8-b,'#a9bd78');R(19,13+b,3,6-b,'#d3d39c');
    R(16,6+b,2,7,'#8da467');R(21,5,2,7,'#8da467');
    for(const [x,y]of[[17,5+b],[22,4]]){E(x,y,2.3,3.1,'#dce0ad');E(x+.5,y+.3,1.4,2,'#4d3b32');P(x,y-1,'#fff0cf');}
    E(8,13,7.5,7.3,'#b98653');E(8,13,6.3,6.1,'#cb9b65');L(4,8,10,7,'#e2b67b');
    L(11,8,13,12,'#94613e');L(13,12,12,16,'#94613e');L(12,16,8,18,'#94613e');L(8,18,4,15,'#94613e');L(4,15,4,11,'#94613e');L(4,11,8,10,'#94613e');L(8,10,10,12,'#94613e');L(10,12,9,15,'#94613e');L(9,15,7,14,'#94613e');P(7,13,'#94613e');
    P(16,13+b,'#d1d69b');P(22,13+b,'#bfcc8b');R(18,14+b,talk?3:2,talk?2:1,'#966c4b');P(16,14+b,'#d0a170');
    L(8,6,9,2,'#708b4b');E(7,4,2.4,1.4,'#a6b66e');E(10,3,2.4,1.4,'#8fa45c');P(8,4,'#d0d38e');
  });
}

/* ---------- Boss 们 64×56 ---------- */
function makeBossKind(kind, frame = 0, hurt = false) {
  if (kind === 'final') return makeBoss(frame, hurt);
  const t = frame * Math.PI / 2, W = '#ffffff';
  return spr(64, 56, A => {
    const { R, E, P, L } = A;
    const H = c => hurt ? W : c;
    if (kind === 'fog') {
      const c = ['#5a5878', '#8a88a8', '#b8b6d0', '#e4e2f0'];
      [[18, 30, 13], [32, 24, 16], [46, 30, 13], [24, 40, 12], [40, 40, 12], [32, 36, 14]].forEach(([x, y, r], i) => E(x + Math.sin(t + i) * 1.5, y, r, r * .85, H(c[1])));
      for (let y = 0; y < 56; y++) for (let x = 0; x < 64; x++) { if (!A.G(x, y)) continue; const n = fbm(x / 6 + frame, y / 6, 4); if (y < 26 && n > .5) P(x, y, H(c[3])); else if (n > .62) P(x, y, H(c[2])); else if (y > 44) P(x, y, H(c[0])); }
      [[24, 28], [40, 28]].forEach(([x, y]) => { E(x, y, 4.5, 5.5, H('#2a2840')); E(x + 1, y - 1, 1.5, 1.5, H('#ffffff')); });
      for (let x = 24; x <= 40; x++) P(x, 38 + Math.round(Math.sin(x * .8 + t) * 1.2), H('#2a2840'));
    } else if (kind === 'ghost') {
      const c = ['#7a8ad0', '#c8d4ff', '#eef2ff', '#ffffff'];
      E(32, 22, 20, 18, H(c[2])); R(12, 22, 40, 22, H(c[2]));
      for (let x = 12; x < 52; x++) { const yy = 44 + Math.round(Math.sin(x * .45 + t * 2) * 3); R(x, 40, 1, yy - 40, H(c[2])); }
      for (let y = 4; y < 50; y++) for (let x = 10; x < 54; x++) if (A.G(x, y) === H(c[2])) { if (x > 44 || y > 42) P(x, y, H(c[1])); else if (x + y < 34) P(x, y, H(c[3])); }
      [[25, 20], [39, 20]].forEach(([x, y]) => E(x, y, 3.5, 5, H('#1a1a3a')));
      E(32, 31, 4, 3, H('#1a1a3a')); P(20, 27, H('#ff9ab0')); P(21, 27, H('#ff9ab0')); P(43, 27, H('#ff9ab0')); P(44, 27, H('#ff9ab0'));
      const d = [DIGITS[4], DIGITS[0], DIGITS[4]];
      d.forEach((g, i) => g.forEach((row, ry) => row.split('').forEach((v, rx) => { if (v === '1') P(26 + i * 4 + rx, 36 + ry, H('#3a4ab0')); })));
    } else if (kind === 'fox') {
      const c = ['#8a3a10', '#e0702a', '#ffa860', '#fff0e0'];
      for (let i = 0; i < 16; i++) { const a = -.4 + i * .1 + Math.sin(t) * .1; E(50 + Math.cos(a) * i * .9, 40 - i * 1.6, 6 - i * .15, 5 - i * .1, H(i > 12 ? c[3] : c[1])); }
      E(30, 38, 15, 13, H(c[1])); E(30, 42, 8, 8, H(c[3]));
      E(30, 20, 14, 12, H(c[1]));
      for (const sx of [-1, 1]) { for (let i = 0; i < 9; i++) R(30 + sx * (9 + i * .2) - (sx < 0 ? 4 - i * .4 : 0), 4 + i, 4 - i * .4, 1, H(i < 3 ? c[0] : c[1])); }
      E(30, 26, 7, 5, H(c[3])); P(30, 24, H('#1a1222')); R(29, 25, 3, 1, H('#1a1222'));
      for (const ex of [23, 37]) { E(ex, 18, 3.5, 3.5, H('#ffffff')); for (let a = 0; a < 9; a++) P(ex + Math.round(Math.cos(a + t) * a * .35), 18 + Math.round(Math.sin(a + t) * a * .35), H('#8a3aff')); }
      for (let y = 6; y < 54; y++) for (let x = 10; x < 62; x++) if (A.G(x, y) === H(c[1]) && x + y < 40) P(x, y, H(c[2]));
      R(26, 29, 9, 1, H('#1a1222')); P(25, 28, H('#1a1222')); P(35, 28, H('#1a1222'));
    } else if (kind === 'dragon2') {
      const c = ['#1e5a2e', '#2e8a46', '#5ac070', '#c8f0a0'];
      E(32, 42, 15, 11, H(c[1])); E(32, 45, 8, 6, H(c[3]));
      for (const sx of [-1, 1]) {
        const sw = Math.sin(t + (sx > 0 ? 1.5 : 0)) * 2;
        for (let i = 0; i < 10; i++) E(32 + sx * (6 + i * 1.6) + sw * (i / 10), 34 - i * 1.8, 4, 3.5, H(c[1]));
        const hx = 32 + sx * 22 + sw, hy = 14;
        E(hx, hy, 8, 6, H(c[1])); R(hx + (sx > 0 ? 4 : -10), hy + 1, 6, 4, H(c[2]));
        E(hx - sx * 1, hy - 2, 2, 2, H('#ffffff')); P(hx - sx * 1, hy - 2, H('#e04848'));
        R(hx - 3, hy - 9, 1, 4, H(c[3])); R(hx + 2, hy - 9, 1, 4, H(c[3]));
        for (let k = 0; k < 3; k++) P(hx + (sx > 0 ? 5 + k * 2 : -6 - k * 2), hy + 4, H('#ffffff'));
      }
      for (let y = 0; y < 56; y++) for (let x = 0; x < 64; x++) if (A.G(x, y) === H(c[1]) && (x * 7 + y * 3) % 11 === 0) P(x, y, H(c[0]));
      R(26, 30, 12, 2, H('#e04848'));
    } else if (kind === 'fire') {
      const c = ['#7a1010', '#c42a1a', '#ff5a2a', '#ffd23f'];
      for (let i = 0; i < 7; i++) { const fx = 14 + i * 6, fh = 8 + ((i * 5 + frame * 3) % 7); for (let k = 0; k < fh; k++) R(fx - (fh - k) * .3, 10 - k, 1 + (fh - k) * .6, 1, H(k > fh * .6 ? c[3] : c[2])); }
      E(32, 30, 22, 17, H(c[1])); E(32, 38, 12, 10, H('#ffb060'));
      for (let y = 10; y < 52; y++) for (let x = 6; x < 60; x++) { const g = A.G(x, y); if (g === H(c[1])) { if (x + y < 38) P(x, y, H(c[2])); else if (x - y > 22) P(x, y, H(c[0])); } }
      [[22, 24], [42, 24]].forEach(([x, y]) => { E(x, y, 4, 3, H('#fff0a0')); R(x - 1, y - 2, 2, 5, H('#1a0a0a')); });
      E(32, 36, 9, 4, H('#1a0a0a')); for (let i = 0; i < 6; i++) { R(25 + i * 3, 33, 2, 2, H('#ffffff')); }
      R(28, 37, 8, 3, H(c[3])); R(30, 38, 4, 2, H('#ffffff'));
      for (const sx of [-1, 1]) for (let i = 0; i < 8; i++) R(32 + sx * (18 + i) - (sx < 0 ? 3 : 0), 30 - i * 2 + Math.round(Math.sin(t) * 1), 3, 2, H(c[0]));
    }
    // 统一的小故障像素
    for (let i = 0; i < 10; i++) { const x = (hash2(i, frame, 7) * 62) | 0, y = (hash2(i, frame, 8) * 54) | 0; if (A.G(x, y) && !hurt) P(x, y, pick(['#22e6d0', '#ff2fa0'])); }
    void L;
  });
}

/* ---------- 小 A 的帽子 ---------- */
const HATS = {
  straw: { n: '草帽', from: 0 },
  beret: { n: '贝雷帽', from: 1 },
  grad: { n: '学士帽', from: 2 },
  hard: { n: '安全帽', from: 3 },
  astro: { n: '宇航头盔', from: 4 },
};
function makeHat(kind) {
  return spr(12, 8, A => {
    const { R, P, E } = A;
    if (kind === 'straw') { R(0, 6, 12, 2, '#e8c060'); R(3, 2, 6, 4, '#f4d070'); R(3, 5, 6, 1, '#e04848'); R(4, 2, 3, 1, '#fff0a0'); }
    else if (kind === 'beret') { E(6, 5, 5.5, 2.5, '#d83a4a'); R(2, 6, 8, 1, '#a82a3a'); P(6, 2, '#a82a3a'); R(3, 4, 3, 1, '#ff6a7a'); }
    else if (kind === 'grad') { R(0, 3, 12, 2, '#2a2a3a'); R(3, 5, 6, 3, '#3a3a4e'); R(5, 2, 2, 1, '#2a2a3a'); R(10, 4, 1, 3, C.gold[1]); P(10, 7, C.gold[2]); }
    else if (kind === 'hard') { E(6, 5, 5, 4, '#ffcc2a'); R(0, 6, 12, 2, '#e0a810'); R(3, 2, 2, 2, '#fff07a'); R(5, 1, 2, 6, '#e0a810'); }
    else if (kind === 'astro') { E(6, 4, 5.5, 4.5, '#e8ecf6'); R(2, 3, 8, 3, '#3a7ae0'); R(3, 3, 2, 1, '#bfe6ff'); R(0, 7, 12, 1, '#a8b0c8'); }
  });
}

/* ---------- 术语图标 ---------- */
function buildIcons3() {
  const I = (id, fn) => { ICON[id] = spr(16, 16, fn); };
  const digits = (A, s, x, y, c) => s.split('').forEach((ch, i) => (DIGITS[+ch] || DIGITS[0]).forEach((row, ry) => row.split('').forEach((v, rx) => { if (v === '1') A.P(x + i * 4 + rx, y + ry, c); })));
  I('vibe', A => { A.R(1, 2, 11, 8, '#ffffff'); A.R(2, 1, 9, 1, '#ffffff'); A.R(3, 10, 3, 2, '#ffffff'); A.R(3, 4, 7, 1, '#7a86a8'); A.R(3, 6, 5, 1, '#7a86a8'); A.R(10, 9, 5, 5, '#5af0ff'); A.R(11, 10, 3, 3, '#1a2440'); A.P(14, 1, '#ffd23f'); A.R(13, 2, 3, 1, '#ffd23f'); A.P(14, 3, '#ffd23f'); });
  I('req', A => { A.R(2, 2, 12, 14, '#c98e57'); A.R(3, 3, 10, 12, '#fff8e4'); A.R(5, 0, 6, 3, '#8a8fa8'); [5, 8, 11].forEach(y => { A.R(4, y, 2, 2, '#5ad06a'); A.R(7, y, 5, 1, '#6a5a4a'); }); });
  I('proto', A => { A.R(1, 2, 11, 12, '#ffffff'); for (let x = 1; x < 12; x += 2) { A.P(x, 2, '#7a86a8'); A.P(x, 13, '#7a86a8'); } for (let y = 2; y < 14; y += 2) { A.P(1, y, '#7a86a8'); A.P(11, y, '#7a86a8'); } A.R(3, 4, 7, 2, '#c8cde0'); A.R(3, 8, 3, 3, '#c8cde0'); A.L(10, 15, 15, 6, '#ffb43a'); A.L(11, 15, 15, 7, '#e07a2a'); A.P(15, 5, '#ff8ab0'); });
  I('mvp', A => { A.R(1, 9, 14, 2, '#c98e57'); A.R(1, 9, 14, 1, '#e8b078'); A.E(4, 13, 2, 2, '#2a2a3a'); A.E(12, 13, 2, 2, '#2a2a3a'); A.P(4, 13, '#8a8fa8'); A.P(12, 13, '#8a8fa8'); A.R(5, 4, 6, 4, '#ff8ab0'); A.P(8, 2, '#ffd23f'); });
  I('frontend', A => { A.R(0, 2, 16, 11, '#3a4a8a'); A.R(1, 3, 14, 9, '#fff8e4'); A.R(2, 4, 12, 2, '#ff8ab0'); A.R(2, 7, 5, 4, '#5ad06a'); A.R(8, 7, 6, 1, '#7a86a8'); A.R(8, 9, 4, 1, '#7a86a8'); A.R(6, 13, 4, 2, '#3a4a8a'); A.R(4, 15, 8, 1, '#3a4a8a'); });
  I('browser', A => { A.E(8, 8, 7, 7, '#3a8ae0'); A.R(3, 5, 4, 3, '#5ad06a'); A.R(9, 9, 4, 4, '#5ad06a'); A.R(10, 3, 2, 2, '#5ad06a'); for (let a = 0; a < 6.28; a += .2) A.P(8 + Math.cos(a) * 7, 8 + Math.sin(a) * 7, '#1e4a8a'); A.R(1, 8, 14, 1, '#8ac8ff'); });
  I('backend', A => { A.R(2, 7, 12, 8, '#8a8fa8'); A.R(2, 7, 12, 2, '#c8cde0'); A.R(0, 8, 2, 2, '#5a5f78'); A.R(14, 8, 2, 2, '#5a5f78'); A.R(4, 11, 8, 1, '#5a5f78'); [4, 8, 11].forEach((x, i) => A.R(x, 1 + (i % 2), 1, 4, '#e8e8f0')); });
  I('db', A => { const c = ['#2a6aa8', '#4a9ae0', '#8ac8ff']; [2, 6, 10].forEach(y => { A.E(8, y + 3, 6, 2.5, c[1]); A.R(2, y + 3, 12, 3, c[1]); A.E(8, y + 3, 6, 2, c[2]); A.R(2, y + 5, 12, 1, c[0]); }); A.E(8, 4, 5, 1.5, '#ffffff'); });
  I('server', A => { [1, 6, 11].forEach(y => { A.R(2, y, 12, 4, '#3a3e52'); A.R(2, y, 12, 1, '#6a6e84'); A.P(4, y + 2, '#5ad06a'); A.P(6, y + 2, '#ffd23f'); A.R(9, y + 2, 4, 1, '#8a8fa8'); }); });
  I('api', A => { A.R(2, 1, 12, 14, '#fff8e4'); A.R(2, 1, 12, 3, '#e04848'); A.R(4, 6, 8, 1, '#6a5a4a'); A.R(4, 8, 6, 1, '#6a5a4a'); A.R(4, 11, 3, 1, '#3a7ae0'); A.P(7, 10, '#3a7ae0'); A.P(7, 12, '#3a7ae0'); A.R(9, 11, 3, 1, '#5ad06a'); A.P(9, 10, '#5ad06a'); A.P(9, 12, '#5ad06a'); });
  I('json', A => { const c = '#ffd23f'; A.R(3, 2, 2, 12, c); A.R(5, 1, 2, 1, c); A.R(5, 14, 2, 1, c); A.R(1, 7, 2, 2, c); A.R(11, 2, 2, 12, c); A.R(9, 1, 2, 1, c); A.R(9, 14, 2, 1, c); A.R(13, 7, 2, 2, c); A.R(7, 5, 2, 2, '#a8f08a'); A.R(7, 9, 2, 2, '#ff8ad8'); });
  I('status', A => { A.R(0, 3, 16, 10, '#2a1a2a'); A.R(0, 3, 16, 1, '#5a3a5a'); digits(A, '404', 2, 6, '#ff6b84'); });
  I('framework', A => { A.R(1, 15, 14, 1, '#8a5a3a'); [2, 7, 12].forEach(x => A.R(x, 5, 2, 10, '#c98e57')); A.R(1, 5, 14, 2, '#e8b078'); A.R(1, 10, 14, 1, '#c98e57'); A.L(1, 5, 8, 0, '#e04848'); A.L(8, 0, 15, 5, '#e04848'); });
  I('auth', A => { A.R(1, 3, 14, 10, '#3a7ae0'); A.R(1, 3, 14, 2, '#6aa0ff'); A.R(3, 6, 4, 5, '#f6c9a0'); A.R(3, 6, 4, 2, '#5c3a26'); A.R(8, 7, 5, 1, '#ffffff'); A.R(8, 9, 4, 1, '#ffffff'); A.R(6, 0, 4, 3, '#8a8fa8'); });
  I('llm', A => { A.E(8, 8, 7, 6, '#ff9ab8'); A.E(6, 7, 4, 4, '#ffb8cc'); for (let y = 3; y < 14; y++) A.T(8, y, '#c86a8a'); [[4, 6], [5, 10], [11, 5], [12, 9], [10, 11]].forEach(([x, y]) => { A.T(x, y, '#c86a8a'); A.T(x + 1, y, '#c86a8a'); }); A.P(14, 1, '#5af0ff'); A.P(1, 2, '#5af0ff'); });
  I('prompt', A => { A.R(0, 2, 13, 9, '#ffffff'); A.R(2, 11, 3, 2, '#ffffff'); A.R(2, 4, 6, 1, '#3a7ae0'); A.R(2, 6, 8, 1, '#7a86a8'); A.R(2, 8, 5, 1, '#7a86a8'); A.L(10, 15, 15, 10, '#c98e57'); A.R(14, 8, 2, 2, '#ffd23f'); A.P(13, 7, '#fff6a0'); });
  I('multimodal', A => { A.R(0, 1, 10, 9, '#ffffff'); A.R(1, 2, 8, 7, '#8ac8ff'); A.R(1, 6, 8, 3, '#5ad06a'); A.E(6, 4, 1.5, 1.5, '#ffd23f'); A.R(10, 9, 2, 6, '#3a3446'); A.R(12, 8, 3, 2, '#3a3446'); A.E(9.5, 14, 2.5, 2, '#3a3446'); A.R(3, 12, 4, 1, '#ff8ab0'); A.R(2, 14, 6, 1, '#ff8ab0'); });
  I('context', A => { A.R(3, 1, 12, 15, '#fff8e4'); A.R(3, 1, 12, 2, '#5ad06a'); for (let y = 2; y < 16; y += 3) A.R(1, y, 3, 1, '#8a8fa8'); [5, 8, 11].forEach(y => A.R(5, y, 8, 1, '#7a86a8')); A.R(5, 14, 4, 1, '#e04848'); });
  I('token', A => { [[1, 9], [6, 9], [11, 9], [3, 4], [8, 4]].forEach(([x, y], i) => { const c = ['#ff8ab0', '#ffd23f', '#5ad06a', '#4aa8ff', '#b48cff'][i]; A.R(x, y, 4, 4, c); A.R(x, y, 4, 1, mix(c, '#ffffff', .5)); }); A.R(6, 0, 3, 3, '#e8e8f0'); });
  I('hallu', A => { A.E(8, 7, 7, 5, '#e8d8ff'); A.E(4, 6, 3, 3, '#f4ecff'); A.E(12, 8, 3, 3, '#d0c0f0'); A.R(6, 13, 2, 2, '#e8d8ff'); A.P(4, 15, '#e8d8ff'); A.R(7, 4, 3, 1, '#8a3aff'); A.P(10, 5, '#8a3aff'); A.P(8, 6, '#8a3aff'); A.P(8, 8, '#8a3aff'); });
  I('rag', A => { A.R(0, 3, 11, 12, '#3a7ae0'); A.R(1, 3, 9, 11, '#fff8e4'); A.R(5, 3, 1, 12, '#c8cde0'); A.R(2, 6, 2, 1, '#7a86a8'); A.R(7, 6, 2, 1, '#7a86a8'); A.E(11, 9, 3.5, 3.5, '#bfe6ff'); A.E(11, 9, 2, 2, '#e8f6ff'); A.L(13, 12, 15, 15, '#5a5f78'); A.L(14, 12, 15, 14, '#5a5f78'); });
  I('finetune', A => { A.R(1, 6, 3, 5, '#3a3446'); A.R(12, 6, 3, 5, '#3a3446'); A.R(0, 7, 1, 3, '#3a3446'); A.R(15, 7, 1, 3, '#3a3446'); A.R(4, 8, 8, 1, '#8a8fa8'); A.R(5, 2, 6, 3, '#ff8ab0'); A.R(6, 1, 4, 1, '#ff8ab0'); A.P(7, 3, '#ffffff'); A.R(6, 12, 4, 3, '#ffd23f'); });
  I('agent', A => { A.R(3, 3, 10, 8, '#dfe6f4'); A.R(4, 4, 8, 5, '#1a2440'); A.R(5, 5, 2, 2, '#5af0ff'); A.R(9, 5, 2, 2, '#5af0ff'); A.R(7, 0, 1, 3, '#6a7090'); A.P(7, 0, '#ffd23f'); A.R(5, 11, 6, 4, '#9aa6c4'); A.R(0, 11, 4, 1, '#9aa6c4'); A.R(12, 11, 3, 1, '#9aa6c4'); A.R(13, 9, 2, 5, '#8a8fa8'); A.R(12, 8, 4, 2, '#5a5f78'); });
  I('mcp', A => { A.R(4, 0, 2, 4, '#c8cde0'); A.R(10, 0, 2, 4, '#c8cde0'); A.R(2, 4, 12, 6, '#3a3e52'); A.R(2, 4, 12, 1, '#6a6e84'); A.R(6, 10, 4, 3, '#3a3e52'); A.R(7, 13, 2, 3, '#ffd23f'); A.P(5, 7, '#5ad06a'); });
  I('branch', A => { A.R(3, 1, 2, 14, '#e05a5a'); A.L(4, 9, 11, 3, '#5ad06a'); A.L(4, 10, 11, 4, '#5ad06a'); A.E(4, 2, 2, 2, '#e05a5a'); A.E(4, 14, 2, 2, '#e05a5a'); A.E(12, 3, 2, 2, '#5ad06a'); A.R(11, 5, 2, 6, '#5ad06a'); A.L(12, 11, 5, 13, '#5ad06a'); });
  I('github', A => { A.E(6, 9, 5, 4, '#e8ecf6'); A.E(10, 7, 5, 5, '#ffffff'); A.E(12, 10, 4, 3, '#e8ecf6'); A.R(5, 9, 6, 6, '#3a4a8a'); A.R(6, 9, 4, 2, '#c8cde0'); A.R(6, 12, 4, 2, '#f6ecd2'); });
  I('env', A => { A.R(1, 2, 14, 13, '#5a5f78'); A.R(1, 2, 14, 2, '#8a8fa8'); A.R(3, 5, 10, 8, '#3a3e52'); A.E(8, 9, 3, 3, '#c8cde0'); A.E(8, 9, 1.5, 1.5, '#3a3e52'); A.R(8, 9, 3, 1, '#ffd23f'); A.R(12, 6, 1, 2, C.gold[1]); });
  I('logs', A => { A.R(2, 1, 12, 15, '#fff8e4'); A.R(2, 1, 12, 2, '#c8cde0'); [4, 7, 10].forEach(y => A.R(4, y, 8, 1, '#7a86a8')); A.R(4, 13, 5, 1, '#e04848'); A.E(12, 12, 3, 3, '#e04848'); A.P(11, 11, '#ffffff'); A.P(13, 13, '#ffffff'); A.P(13, 11, '#ffffff'); A.P(11, 13, '#ffffff'); });
  I('test', A => { A.R(5, 0, 6, 2, '#8a8fa8'); A.R(6, 2, 4, 6, '#e8f6ff'); A.E(8, 11, 5, 4.5, '#e8f6ff'); A.E(8, 12, 4, 3, '#5ad06a'); A.R(4, 11, 8, 1, '#8ae89a'); A.P(7, 13, '#ffffff'); A.P(9, 12, '#ffffff'); });
  I('local', A => { A.R(2, 3, 12, 8, '#3a3e52'); A.R(3, 4, 10, 6, '#1a2a40'); A.R(4, 5, 5, 1, '#7dffa6'); A.R(4, 7, 3, 1, '#7dffa6'); A.R(0, 11, 16, 2, '#8a8fa8'); A.R(0, 11, 16, 1, '#c8cde0'); A.R(6, 13, 4, 1, '#5a5f78'); });
  I('port', A => { A.R(1, 1, 14, 14, '#e8ecf6'); A.R(1, 1, 14, 2, '#ffffff'); A.R(4, 5, 3, 5, '#2a2a3a'); A.R(9, 5, 3, 5, '#2a2a3a'); A.R(6, 11, 4, 2, '#2a2a3a'); digits(A, '3', 12, 10, '#e04848'); });
  I('domain', A => { A.R(7, 3, 2, 13, '#8a5a3a'); A.R(1, 2, 12, 4, '#3a7ae0'); A.P(13, 3, '#3a7ae0'); A.P(13, 4, '#3a7ae0'); A.R(3, 7, 12, 4, '#5ad06a'); A.P(2, 8, '#5ad06a'); A.P(2, 9, '#5ad06a'); A.R(3, 3, 7, 1, '#ffffff'); A.R(5, 8, 7, 1, '#ffffff'); });
  I('rollback', A => { for (let a = .6; a < 5.6; a += .12) { A.P(8 + Math.cos(a) * 6, 8 + Math.sin(a) * 6, '#ffb43a'); A.P(8 + Math.cos(a) * 5, 8 + Math.sin(a) * 5, '#ffd23f'); } A.R(1, 1, 5, 2, '#ffb43a'); A.R(1, 1, 2, 5, '#ffb43a'); A.R(7, 5, 2, 4, '#e8e8f0'); A.R(8, 8, 3, 1, '#e8e8f0'); });
  I('collab', A => { A.R(0, 1, 9, 7, '#ffd23f'); A.R(2, 8, 2, 2, '#ffd23f'); A.R(2, 3, 5, 1, '#8a6a10'); A.R(2, 5, 3, 1, '#8a6a10'); A.R(7, 7, 9, 7, '#5af0ff'); A.R(12, 14, 2, 2, '#5af0ff'); A.R(9, 9, 5, 1, '#1a4a6a'); A.R(9, 11, 3, 1, '#1a4a6a'); });
  I('cache', A => { A.R(2, 1, 12, 14, '#bfe6ff'); A.R(2, 1, 12, 1, '#ffffff'); A.R(2, 7, 12, 1, '#8ab4e8'); A.R(12, 3, 1, 3, '#5a7aa8'); A.R(12, 9, 1, 3, '#5a7aa8'); for (const [x, y] of [[6, 4], [6, 11]]) { A.R(x - 2, y, 5, 1, '#ffffff'); A.R(x, y - 2, 1, 5, '#ffffff'); } });
  I('responsive', A => { A.R(0, 2, 11, 8, '#3a3e52'); A.R(1, 3, 9, 6, '#8ac8ff'); A.R(4, 10, 3, 2, '#3a3e52'); A.R(10, 5, 6, 10, '#3a3e52'); A.R(11, 6, 4, 7, '#ffd23f'); A.P(12, 14, '#8a8fa8'); });
  I('opensource', A => { A.R(0, 3, 16, 11, '#e05a5a'); A.R(1, 3, 6, 10, '#fff8e4'); A.R(9, 3, 6, 10, '#fff8e4'); A.R(7, 3, 2, 11, '#a83a3a'); A.E(8, 1, 2, 1.5, '#ff8ab0'); [5, 7, 9].forEach(y => { A.R(2, y, 4, 1, '#7a86a8'); A.R(10, y, 4, 1, '#7a86a8'); }); });
  I('cookie', A => { A.E(8, 8, 7, 7, '#c98e57'); A.E(8, 8, 6, 6, '#e8b078'); [[5, 5], [10, 6], [7, 10], [11, 11], [4, 9]].forEach(([x, y]) => A.R(x, y, 2, 2, '#5a3a1e')); for (let y = 0; y < 7; y++) for (let x = 10; x < 16; x++) if (Math.hypot(x - 14, y - 2) < 3.2) A.X(x, y); });
  I('vector', A => { A.R(0, 0, 16, 16, '#1a1838'); [[3, 3], [12, 4], [7, 8], [3, 12], [13, 12]].forEach(([x, y]) => { A.R(x, y, 2, 2, '#ffd23f'); }); A.L(4, 4, 8, 9, '#5a5ac8'); A.L(13, 5, 8, 9, '#5a5ac8'); A.L(8, 9, 4, 13, '#5a5ac8'); A.L(8, 9, 14, 13, '#5a5ac8'); });
}

/* ---------- 新道具 ---------- */
function makeStall(c) {
  return spr(46, 36, A => {
    const { R, P } = A;
    R(3, 14, 2, 22, BARK[1]); R(41, 14, 2, 22, BARK[1]);
    for (let y = 0; y < 12; y++) { const inset = Math.round((12 - y) * .3); for (let x = inset; x < 46 - inset; x++) P(x, y + 2, (Math.floor(x / 6) % 2) ? c : '#fff6f0'); }
    for (let x = 0; x < 46; x += 6) { R(x, 14, 6, 2, (x / 6) % 2 ? c : '#fff6f0'); P(x + 2, 16, (x / 6) % 2 ? c : '#fff6f0'); P(x + 3, 16, (x / 6) % 2 ? c : '#fff6f0'); }
    R(2, 24, 42, 12, BARK[2]); R(2, 24, 42, 2, BARK[3]); for (let x = 6; x < 44; x += 8) R(x, 26, 1, 10, BARK[1]);
    R(8, 19, 6, 5, '#ff8c3a'); R(9, 18, 4, 1, '#5ad06a'); R(18, 20, 8, 4, '#e8e8f0'); R(19, 20, 6, 1, '#ffd23f'); R(30, 19, 7, 5, '#c98e57'); R(31, 19, 5, 1, '#e8b078');
  });
}
/* 院落矮景：石沿承托土层，叶团和花簇成片；都以无碰撞装饰使用。 */
function buildCourtyardProps() {
  for (const [key, blooms] of [['yardFlowers', ['#d5a196', '#e8c990', '#aebbb7']], ['yardHerbs', ['#8fa680', '#b7c495', '#78927c']]]) {
    PROP[key] = spr(38, 20, A => {
      A.R(1, 13, 36, 6, '#666755'); A.R(2, 12, 34, 3, '#a09c7c'); A.R(3, 12, 32, 2, '#5c5543');
      A.R(2, 18, 34, 2, '#4c5848'); A.R(3, 15, 32, 2, '#9c987c');
      for (let x = 3; x < 36; x += 8) { A.R(x, 15, 6, 1, '#bbb296'); A.P(x + 6, 17, '#646c57'); }
      for (let i = 0; i < 6; i++) {
        const x = 5 + i * 5, y = 8 + (i % 3 === 1 ? -3 : 0);
        A.R(x, y, 1, 6, '#49644f'); A.E(x - 2, y + 3, 3, 2, '#607c58'); A.E(x + 2, y + 1, 3, 2, '#8ba373');
        A.R(x - 2, y - 3, 5, 3, blooms[i % 3]); A.R(x - 1, y - 4, 3, 5, blooms[i % 3]);
        A.P(x - 1, y - 3, key === 'yardHerbs' ? '#cad1a0' : '#f2deae'); A.P(x + 2, y - 1, '#71896a');
      }
    });
  }
  PROP.yardFence = spr(34, 12, A => {
    A.R(1, 4, 32, 2, '#8a7960'); A.R(1, 8, 32, 2, '#706450'); A.R(1, 4, 32, 1, '#bdac8b');
    [1, 9, 17, 25, 31].forEach((x, i) => { const y = i % 2 ? 1 : 0; A.R(x, y + 1, 2, 11 - y, '#a49373'); A.P(x, y, '#d0bea0'); A.P(x, 5, '#665e4f'); });
  });
  PROP.yardSideFence = spr(8, 31, A => {
    A.R(3, 3, 2, 27, '#756d55'); A.R(2, 3, 1, 27, '#b4a180');
    for (let y = 1; y < 31; y += 8) { A.R(1, y, 3, 7, '#97856b'); A.R(0, y, 5, 1, '#c6b593'); A.P(2, y + 5, '#655e4e'); }
  });
}
function buildProps3() {
  buildCourtyardProps();
  PROP.board = spr(32, 28, A => { A.R(3, 14, 2, 14, BARK[1]); A.R(27, 14, 2, 14, BARK[1]); A.R(0, 0, 32, 20, BARK[2]); A.R(2, 2, 28, 16, '#c8925a'); for (let i = 0; i < 6; i++) { const x = 4 + (i % 3) * 9, y = 3 + Math.floor(i / 3) * 8, c = ['#fff27a', '#ff9ab8', '#8ae0ff', '#a8f08a', '#fff27a', '#ffb060'][i]; A.R(x, y, 7, 6, c); A.R(x + 1, y + 2, 4, 1, shade(c, .6)); A.P(x + 3, y, '#e04848'); } });
  PROP.stallR = makeStall('#e05a5a'); PROP.stallB = makeStall('#4a8ae0'); PROP.stallG = makeStall('#4ab06a');
  PROP.easel = spr(18, 28, A => { A.L(4, 27, 8, 4, BARK[1]); A.L(13, 27, 9, 4, BARK[1]); A.R(8, 10, 2, 18, BARK[0]); A.R(1, 4, 16, 14, '#ffffff'); A.R(2, 5, 14, 12, '#bfe6ff'); A.R(2, 12, 14, 5, '#7ac860'); A.E(12, 8, 2, 2, '#ffd23f'); A.R(4, 9, 4, 4, '#e05a5a'); A.R(0, 17, 18, 2, BARK[2]); });
  PROP.scaffold = spr(56, 50, A => { const w = BARK[2]; [0, 18, 36, 52].forEach(x => A.R(x, 4, 3, 46, w)); [4, 18, 32, 46].forEach(y => A.R(0, y, 55, 2, w)); A.L(2, 46, 18, 20, BARK[1]); A.L(20, 46, 36, 20, BARK[1]); A.L(38, 32, 52, 6, BARK[1]); A.R(0, 0, 56, 4, '#e07a2a'); for (let x = 2; x < 54; x += 8) A.R(x, 1, 4, 2, '#ffd23f'); A.R(20, 34, 14, 12, '#c8925a'); A.R(22, 36, 10, 8, '#8a5a32'); });
  PROP.cone = spr(10, 12, A => { for (let y = 0; y < 9; y++) A.R(5 - y * .45, y, 1 + y * .9, 1, y === 3 || y === 6 ? '#ffffff' : '#ff7a2a'); A.R(0, 9, 10, 3, '#ff7a2a'); A.R(0, 11, 10, 1, '#c0501a'); });
  PROP.bricks = spr(20, 12, A => { for (let r = 0; r < 3; r++) for (let i = 0; i < 3 - (r === 2 ? 1 : 0); i++) { const x = i * 6 + r * 2, y = 8 - r * 4; A.R(x, y, 6, 4, ['#e05a5a', '#ffd23f', '#4a8ae0', '#5ad06a'][(i + r) % 4]); A.R(x + 1, y - 1, 2, 1, '#ffffff'); A.R(x + 3, y - 1, 2, 1, '#ffffff'); } });
  PROP.dish = spr(28, 30, A => { A.R(12, 16, 4, 12, '#8a8fa8'); A.R(6, 27, 16, 3, '#5a5f78'); A.E(14, 10, 12, 9, '#e8ecf6'); A.E(15, 9, 9, 6, '#c8cde0'); A.L(14, 10, 22, 2, '#5a5f78'); A.E(22, 2, 2, 2, '#e04848'); });
  PROP.rack = spr(18, 32, A => { A.R(0, 0, 18, 32, '#2a2e3e'); A.R(0, 0, 18, 2, '#4a4e66'); for (let y = 3; y < 30; y += 5) { A.R(2, y, 14, 4, '#3a3e52'); A.P(4, y + 1, '#5ad06a'); A.P(6, y + 1, y % 2 ? '#ffd23f' : '#5ad06a'); A.R(9, y + 2, 5, 1, '#6a6e84'); } });
  PROP.shelf = spr(30, 30, A => { A.R(0, 0, 30, 30, BARK[1]); A.R(0, 0, 30, 2, BARK[2]); for (let r = 0; r < 3; r++) { const y = 3 + r * 9; A.R(2, y, 26, 7, '#2a1a12'); for (let i = 0; i < 9; i++) { const c = ['#e05a5a', '#4a8ae0', '#5ad06a', '#ffd23f', '#b48cff', '#ff8c3a'][(i * 7 + r * 3) % 6]; const h = 5 + ((i + r) % 3); A.R(3 + i * 3, y + 7 - h, 2, h, c); } A.R(1, y + 7, 28, 2, BARK[2]); } });
  PROP.toolbox = spr(16, 11, A => { A.R(0, 3, 16, 8, '#e04848'); A.R(0, 3, 16, 2, '#ff7a7a'); A.R(5, 0, 6, 1, '#5a5f78'); A.R(5, 0, 1, 3, '#5a5f78'); A.R(10, 0, 1, 3, '#5a5f78'); A.R(7, 6, 2, 2, '#ffd23f'); });
  PROP.gear = spr(20, 20, A => { A.E(10, 10, 7, 7, '#8a8fa8'); for (let a = 0; a < 8; a++) { const x = 10 + Math.cos(a * .785) * 8, y = 10 + Math.sin(a * .785) * 8; A.R(x - 1.5, y - 1.5, 3, 3, '#8a8fa8'); } A.E(10, 10, 3, 3, '#3a3e52'); for (let y = 0; y < 20; y++) for (let x = 0; x < 20; x++) if (A.G(x, y) === '#8a8fa8' && x + y < 16) A.P(x, y, '#c8cde0'); });
  PROP.vault = spr(32, 32, A => { A.R(0, 0, 32, 32, '#6a6e84'); A.R(0, 0, 32, 2, '#9aa0b8'); A.E(16, 16, 13, 13, '#c8a040'); A.E(16, 16, 11, 11, '#e0b850'); A.E(16, 16, 4, 4, '#8a6a20'); for (let a = 0; a < 6; a++) A.L(16, 16, 16 + Math.cos(a * 1.047) * 10, 16 + Math.sin(a * 1.047) * 10, '#8a6a20'); A.E(12, 11, 2, 2, '#fff0a0'); });
  PROP.desk = spr(30, 22, A => { A.R(0, 10, 30, 3, BARK[2]); A.R(0, 10, 30, 1, BARK[3]); A.R(2, 13, 2, 9, BARK[1]); A.R(26, 13, 2, 9, BARK[1]); A.R(7, 0, 16, 10, '#3a3e52'); A.R(8, 1, 14, 8, '#1a2a40'); A.R(9, 2, 6, 1, '#7dffa6'); A.R(9, 4, 9, 1, '#5ad1ff'); A.R(9, 6, 4, 1, '#ff8ad8'); A.R(5, 9, 20, 1, '#8a8fa8'); A.R(25, 6, 3, 4, '#e8e8f0'); });
  PROP.signpost = spr(22, 34, A => { A.R(10, 4, 2, 30, BARK[1]); [[0, 2, '#3a7ae0', 1], [10, 10, '#e05a5a', -1], [0, 18, '#5ad06a', 1]].forEach(([x, y, c, d]) => { A.R(d > 0 ? 1 : 9, y, 12, 5, c); A.P(d > 0 ? 0 : 21, y + 2, c); A.R(d > 0 ? 3 : 11, y + 2, 7, 1, '#ffffff'); }); });
  PROP.rocket = spr(34, 78, A => {
    const w = ['#b8c0d8', '#e8ecf6', '#ffffff'];
    for (let y = 0; y < 18; y++) { const hw = Math.round(1 + y * .55); A.R(17 - hw, y, hw * 2, 1, y < 6 ? '#e04848' : w[1]); }
    A.R(7, 18, 20, 44, w[1]); A.R(7, 18, 4, 44, w[2]); A.R(23, 18, 4, 44, w[0]);
    A.E(17, 30, 5, 5, '#3a4a8a'); A.E(17, 30, 3.5, 3.5, '#8ac8ff'); A.P(15, 28, '#ffffff');
    A.R(7, 44, 20, 3, '#e04848'); A.R(13, 50, 8, 2, '#3a4a8a');
    for (let i = 0; i < 12; i++) { A.R(6 - i * .5, 52 + i, 2 + i * .2, 1, '#e04848'); A.R(26 + i * .3, 52 + i, 2 + i * .2, 1, '#c03838'); }
    A.R(11, 62, 12, 6, '#5a5f78'); A.R(13, 68, 8, 3, '#3a3e52');
  });
  PROP.tower = spr(22, 86, A => { const c = '#c84a3a'; A.R(1, 0, 2, 86, c); A.R(17, 0, 2, 86, c); for (let y = 0; y < 86; y += 10) { A.R(1, y, 18, 2, c); A.L(2, y, 17, y + 10, '#8a2a1e'); } A.R(19, 30, 3, 2, '#8a8fa8'); A.R(19, 56, 3, 2, '#8a8fa8'); A.R(0, 84, 22, 2, '#5a5f78'); });
  PROP.mushroom = spr(12, 12, A => { A.E(6, 4, 5.5, 4, '#ff6ac8'); A.R(1, 4, 11, 1, '#c84aa8'); A.R(4, 6, 4, 6, '#f4e0ff'); A.R(3, 2, 2, 1, '#ffffff'); A.P(8, 3, '#ffd0f0'); A.P(9, 1, '#ffd0f0'); });
  PROP.grave404 = spr(18, 22, A => { A.R(8, 10, 2, 12, '#3a3446'); A.R(0, 0, 18, 11, '#5a6a9a'); A.R(1, 1, 16, 9, '#2a3460'); [DIGITS[4], DIGITS[0], DIGITS[4]].forEach((g, i) => g.forEach((row, ry) => row.split('').forEach((v, rx) => { if (v === '1') A.P(3 + i * 4 + rx, 3 + ry, '#8ac8ff'); }))); });
  PROP.server2 = spr(36, 34, A => { for (let i = 0; i < 2; i++) { const x = i * 18; A.R(x, 0, 16, 34, '#2a2e3e'); A.R(x, 0, 16, 2, '#4a4e66'); for (let y = 3; y < 32; y += 5) { A.R(x + 2, y, 12, 4, '#3a3e52'); A.P(x + 4, y + 1, '#5ad06a'); A.P(x + 6, y + 1, '#5ad1ff'); } } });
}

/* ---------- 星灯镇原创居民：全身角色与四向职业轮廓 ---------- */
Object.assign(hairStyles, {
  curly(A, y, dir, h) {
    hairStyles.short(A, y, dir, h);
    [[3, 0], [6, -1], [9, -1], [12, 0], [2, 3], [13, 3]].forEach(([x, dy], i) => {
      A.E(x + .5, y + dy, 2, 1.6, h[1]); A.P(x, y + dy - 1, i % 2 ? h[2] : h[1]); A.P(x + 1, y + dy, h[0]);
    });
    if (dir === 1) { A.P(5, y + 7, h[0]); A.P(9, y + 8, h[2]); A.P(12, y + 6, h[0]); }
  },
  braid(A, y, dir, h) {
    hairStyles.short(A, y, dir, h);
    const x = dir === 2 ? 12 : dir === 1 ? 9 : 12;
    for (let i = 0; i < 12; i++) { const xx = x + (Math.floor(i / 2) % 2); A.R(xx, y + 5 + i, 2, 1, h[1]); A.P(xx, y + 5 + i, i % 2 ? h[0] : h[2]); }
    A.R(x + 1, y + 17, 2, 1, '#b66f64'); A.P(x + 1, y + 18, h[0]);
  },
  cycle(A, y, dir, h, o) {
    hairStyles.short(A, y + 1, dir, o.hairUnder);
    A.R(3, y - 2, 10, 4, h[1]); A.R(4, y - 3, 8, 1, h[1]); A.R(4, y - 2, 7, 1, h[2]); A.R(2, y + 2, 12, 1, h[0]);
    for (const x of [5, 8, 11]) A.R(x, y - 1, 1, 2, h[0]);
    if (dir !== 1) { A.R(3, y + 4, 1, 5, '#594a3d'); A.R(12, y + 4, 1, 5, '#594a3d'); }
  },
});
Object.assign(CHAR, {
  resident_puhe: { style: 'inventor', hair: ['#96948b', '#d9d4c1', '#fff1d9'], shirt: ['#3f574e', '#6d8775', '#a2b29a'], pants: ['#59584f', '#837e69'], shoes: '#725a42', beard: '#e6dfca', fullBeard: true, brows: '#b6b1a1',
    body(A, y) { A.R(5, y, 6, 2, '#ded0ac'); A.R(8, y + 2, 2, 4, '#c5b68f'); A.R(5, y + 4, 2, 2, '#39565c'); A.R(10, y + 5, 3, 3, '#c9a054'); A.P(11, y + 5, '#f2d58e'); },
    bodyBack(A, y) { A.R(5, y, 6, 1, '#ded0ac'); A.R(4, y + 5, 8, 1, '#577874'); },
    bodySide(A, y) { A.R(4, y + 1, 4, 1, '#ded0ac'); A.R(8, y + 5, 4, 3, '#c9a054'); A.P(9, y + 5, '#f2d58e'); } },
  resident_ali: { style: 'coils', hair: ['#402927', '#624031', '#94613e'], skin: ['#985b3e', '#c88a5d', '#e3ac79'], shirt: ['#b48142', '#e2b46d', '#f1d095'], pants: ['#8a4b3e', '#bf7150'], shoes: '#654631', freckles: true,
    body(A, y) { A.R(5, y + 1, 1, 6, '#a16952'); A.R(10, y + 1, 1, 6, '#a16952'); A.R(5, y + 3, 6, 4, '#a16952'); A.R(6, y + 4, 4, 2, '#7e5145'); A.P(5, y + 2, '#e2bd75'); A.P(10, y + 2, '#e2bd75'); },
    bodySide(A, y) { A.R(7, y, 1, 7, '#a16952'); A.E(5, y + 5, 2, 2, '#a9c5b7'); A.R(5, y + 6, 1, 2, '#6c5944'); },
    bodyBack(A, y) { A.L(5, y, 10, y + 5, '#a16952'); A.L(10, y, 5, y + 5, '#a16952'); A.R(5, y + 5, 6, 2, '#a16952'); } },
  resident_baiyu: { style: 'asymCrop', hair: ['#24262c', '#41404b', '#70636a'], shirt: ['#283238', '#3d4b51', '#65787a'], pants: ['#394f60', '#657e8a'], shoes: '#5b4b3d',
    body(A, y) { A.R(5, y, 6, 2, '#263438'); A.R(5, y + 3, 6, 5, '#46666b'); A.R(5, y + 1, 1, 3, '#ab8c5a'); A.R(10, y + 1, 1, 3, '#ab8c5a'); A.R(12, y + 2, 1, 6, '#c9ad7a'); A.P(12, y + 4, '#6a5c44'); },
    bodySide(A, y) { A.R(6, y, 5, 1, '#263438'); A.R(4, y + 3, 1, 5, '#c9ad7a'); },
    bodyBack(A, y) { A.R(5, y, 6, 2, '#263438'); A.R(4, y + 6, 8, 1, '#263438'); } },
  resident_huiqing: { style: 'workCurls', hair: ['#525d56', '#879080', '#b7b6a0'], skin: ['#97583f', '#bd8057', '#e0a775'], shirt: ['#243e54', '#4b657a', '#8399a5'], pants: ['#2c4254', '#506579'], shoes: '#5c4335',
    body(A, y) { A.R(4, y + 6, 8, 1, '#b47e4e'); A.R(11, y + 1, 2, 6, '#d48a4e'); A.R(12, y + 1, 1, 5, '#edb268'); A.R(5, y + 5, 2, 3, '#d1985c'); A.P(5, y + 1, '#bfc6b5'); A.R(9, y + 2, 2, 1, '#a1b8b4'); },
    bodySide(A, y) { A.R(4, y + 6, 8, 1, '#b47e4e'); A.R(9, y + 4, 2, 4, '#6d8586'); A.P(9, y + 4, '#cbd5b9'); },
    bodyBack(A, y) { A.R(4, y + 6, 8, 1, '#b47e4e'); A.R(5, y + 2, 6, 2, '#344b5d'); A.P(7, y + 2, '#adc4b9'); } },
  resident_shenmai: { style: 'sideBun', hair: ['#503631', '#795344', '#ae8060'], shirt: ['#4a3c60', '#796387', '#b198ab'], robe: true, trim: '#d2b47c', shoes: '#55403a',
    body(A, y) { A.R(5, y, 6, 1, '#e3d4b6'); A.R(7, y + 1, 2, 3, '#a78d74'); A.R(9, y + 4, 4, 4, '#657e76'); A.R(10, y + 4, 2, 3, '#ded0ac'); A.R(5, y + 3, 1, 3, '#d2ae6f'); },
    bodySide(A, y) { A.R(4, y + 4, 4, 4, '#657e76'); A.R(5, y + 4, 2, 3, '#ded0ac'); },
    bodyBack(A, y) { A.R(5, y, 6, 2, '#a8949f'); A.R(7, y + 3, 2, 1, '#d0b184'); } },
  resident_yuanshu: { style: 'bald', hair: ['#b2b0a2', '#e7dfcc', '#fff1d8'], skin: ['#ad7153', '#d5a071', '#ebbd8e'], shirt: ['#866849', '#bd9c72', '#e4c79a'], pants: ['#544a40', '#80715b'], beard: '#f0e8d5', brows: '#d7cfba', eyes: 'glasses', glassC: '#806044', wide: true,
    body(A, y) { A.R(4, y + 1, 3, 6, '#765842'); A.R(9, y + 1, 3, 6, '#765842'); A.P(10, y + 2, '#d0b47b'); A.P(10, y + 4, '#d0b47b'); A.R(4, y + 5, 3, 1, '#b18b5c'); A.R(9, y + 5, 3, 1, '#b18b5c'); },
    bodySide(A, y) { A.R(10, y + 1, 3, 6, '#765842'); A.R(5, y + 2, 3, 1, '#796e55'); A.R(5, y + 4, 3, 1, '#796e55'); },
    bodyBack(A, y) { A.R(4, y + 1, 8, 6, '#765842'); A.R(5, y + 5, 6, 1, '#b18b5c'); } },
  resident_zhixia: { style: 'scarfBraid', hair: ['#392b29', '#5e4436', '#92704e'], shirt: ['#7e8e74', '#b2bba0', '#e0ddbd'], pants: ['#334e69', '#5a748a'], shoes: '#6e503d', freckles: true,
    body(A, y) { A.R(5, y, 1, 7, '#4a6782'); A.R(10, y, 1, 7, '#4a6782'); A.R(5, y + 3, 6, 5, '#4a6782'); A.R(6, y + 5, 4, 2, '#ad6860'); A.P(7, y + 5, '#dfc4a4'); },
    bodySide(A, y) { A.R(5, y + 2, 2, 6, '#4a6782'); A.R(6, y + 6, 3, 2, '#ad6860'); },
    bodyBack(A, y) { A.L(5, y, 10, y + 6, '#4a6782'); A.L(10, y, 5, y + 6, '#4a6782'); A.R(4, y + 6, 8, 1, '#4a6782'); } },
  resident_guancheng: { style: 'rider', hair: ['#9f6737', '#e9a64a', '#ffd181'], hairUnder: ['#27262c', '#463a32', '#6c5441'], skin: ['#9b603f', '#c58a5d', '#e4b384'], shirt: ['#245f6e', '#4e9b9d', '#b6d9cd'], pants: ['#354f5a', '#627c85'], shoes: '#72503a',
    body(A, y) { A.L(4, y + 1, 11, y + 6, '#b28a60'); A.R(9, y + 5, 4, 3, '#8b674c'); A.P(11, y + 6, '#dfc08b'); A.R(6, y + 2, 2, 1, '#d3dfbc'); },
    bodySide(A, y) { A.R(10, y + 3, 4, 5, '#8b674c'); A.R(10, y + 3, 4, 1, '#b28a60'); },
    bodyBack(A, y) { A.L(4, y + 1, 11, y + 6, '#b28a60'); A.R(8, y + 5, 5, 3, '#8b674c'); } },
  resident_songguo: { style: 'leafSweep', hair: ['#4c332c', '#78523a', '#aa7d50'], shirt: ['#3e5846', '#718a61', '#a7b487'], pants: ['#514a3e', '#7b735c'], shoes: '#6d4c36',
    body(A, y) { A.R(5, y + 2, 6, 6, '#bdac7f'); A.R(6, y + 5, 4, 2, '#928363'); A.P(6, y + 3, '#b46d5e'); A.P(9, y + 4, '#688d9b'); A.P(8, y + 6, '#d2b267'); A.R(5, y, 1, 3, '#bdac7f'); A.R(10, y, 1, 3, '#bdac7f'); },
    bodySide(A, y) { A.R(4, y + 2, 2, 6, '#bdac7f'); A.P(5, y + 4, '#b46d5e'); },
    bodyBack(A, y) { A.L(5, y, 10, y + 5, '#bdac7f'); A.R(4, y + 5, 8, 1, '#bdac7f'); } },
  resident_tianxu: { style: 'mechanic', hair: ['#753d29', '#aa603a', '#d28e51'], shirt: ['#793e36', '#ad6452', '#d79774'], pants: ['#43555d', '#788d91'], shoes: '#5b4537', beard: '#7e4c31', fullBeard: true, wide: true,
    body(A, y) { A.R(5,y+2,6,6,'#657984'); A.R(5,y,1,3,'#a1ac9f'); A.R(10,y,1,3,'#a1ac9f'); A.P(5,y+3,'#e0c58f'); A.R(9,y+4,2,3,'#b7b9a3'); A.P(9,y+4,'#edf0d3'); },
    bodySide(A, y) { A.R(5, y + 4, 3, 3, '#ddd3ad'); A.P(6, y + 5, '#8f9b85'); },
    bodyBack(A, y) { A.R(4, y + 2, 8, 1, '#88574c'); A.R(8, y + 5, 3, 2, '#ddd3ad'); } },
  resident_qiaosui: { style: 'bluntBob', hair: ['#20262b', '#35373d', '#5b5d61'], skin: ['#d49f83', '#f0c8a3', '#ffe8c6'], shirt: ['#b2b2a0', '#dfdcc0', '#fff1d5'], pants: ['#365b54', '#66877b'], shoes: '#605040', eyeColor: '#639e97',
    body(A, y) { A.R(5, y + 2, 6, 6, '#659286'); A.R(5, y, 1, 3, '#659286'); A.R(10, y, 1, 3, '#659286'); A.R(8, y + 4, 2, 3, '#ba884d'); A.P(8, y + 4, '#e7bd77'); A.P(8, y + 3, '#e2d6b0'); },
    bodySide(A, y) { A.R(5, y + 2, 2, 6, '#659286'); A.R(6, y + 5, 2, 2, '#ba884d'); },
    bodyBack(A, y) { A.L(5, y, 10, y + 6, '#659286'); A.R(4, y + 6, 8, 1, '#659286'); } },
  resident_wangshu: { style: 'violetCrop', hair: ['#665979', '#9d86ac', '#d1b2cc'], shirt: ['#344f6d', '#6c8da3', '#cdd4c1'], pants: ['#464f66', '#768096'], shoes: '#785b43', eyes: 'hex', glassC: '#9d7e5e',
    body(A, y) { A.R(5,y,6,1,'#e4dbc0'); A.L(4,y+2,8,y+6,'#e0d8bd'); A.L(11,y+2,8,y+6,'#e0d8bd'); A.R(11,y+1,3,2,'#efe4c2'); A.P(12,y+2,'#a18d69'); A.R(8, y + 5, 5, 3, '#9b7553'); A.R(9, y + 5, 3, 1, '#c8a975'); A.P(10, y + 6, '#e9d397'); },
    bodySide(A, y) { [2, 4, 6].forEach(d => A.R(5, y + d, 7, 1, '#d8ddc5')); A.R(10, y + 5, 3, 3, '#9b7553'); },
    bodyBack(A, y) { [2, 4, 6].forEach(d => A.R(4, y + d, 8, 1, '#d8ddc5')); A.R(4, y + 6, 8, 1, '#9b7553'); } },
});

/* 最终图集的世界行走设计。头像与小人共用身份、色彩和职业标记。 */
const REF_LOOKS = {
  chef: { style:'chef', hair:['#71372c','#a95537','#d48651'], hairUnder:['#71372c','#a95537','#d48651'], skin:['#8e5138','#b97950','#d99c6b'], shirt:['#803b32','#b76148','#dd9370'], pants:['#443f3b','#696356'], beard:'#9d4f31', fullBeard:true, wide:true,
    body(A,y){A.R(5,y+2,6,6,'#ecddbc');A.R(4,y,1,4,'#ecddbc');A.R(11,y,1,4,'#ecddbc');A.P(6,y+1,'#dfb563');A.P(9,y+1,'#dfb563');A.R(6,y+5,4,1,'#bfa782');},
    bodyBack(A,y){A.R(4,y+3,8,1,'#e9d6af');A.L(5,y,10,y+3,'#e9d6af');A.L(10,y,5,y+3,'#e9d6af');},
    bodySide(A,y){A.R(4,y+2,3,6,'#e9d6af');A.R(4,y+3,8,1,'#d0bb94');} },
  pm: { style:'highPony', hair:['#282731','#403a40','#655558'], skin:['#d89e7c','#f0c49f','#ffe4bc'], shirt:['#4e5b3e','#7c895b','#a8b17c'], pants:['#41464a','#616962'], eyes:'glasses', glassC:'#b77c57',
    body(A,y){A.R(6,y,4,3,'#eee2c5');A.P(7,y+3,'#cfa45d');A.R(10,y+3,4,5,'#a67b4c');A.R(11,y+4,2,3,'#e5d4ab');A.R(10,y+3,3,1,'#d0a565');},
    bodySide(A,y){A.R(3,y+3,4,5,'#b88b55');A.R(4,y+4,2,3,'#eddeb9');},
    bodyBack(A,y){A.R(4,y+1,8,1,'#9ca56d');A.R(4,y+6,8,1,'#49563b');} },
  webkid: { style:'earphoneCrop', hair:['#a64e2c','#dd8141','#f3b36b'], skin:['#d49a74','#f0c09a','#ffe1b5'], shirt:['#293a51','#435a75','#6c8294'], pants:['#3c4550','#5d6671'], freckles:true, extra:null,
    body(A,y){A.R(4,y,8,2,'#5d738c');A.R(5,y+2,1,4,'#dda24e');A.R(10,y+2,1,4,'#dda24e');A.R(6,y+5,4,2,'#33475f');A.P(11,y+4,'#efc271');},
    bodySide(A,y){A.R(5,y,7,2,'#5d738c');A.R(5,y+2,1,4,'#dda24e');},
    bodyBack(A,y){A.R(4,y,8,3,'#5d738c');A.R(5,y+3,6,1,'#2b3e54');} },
  cook: { style:'closeCurls', hair:['#302625','#47332d','#684d3a'], skin:['#88543a','#b17b53','#d5a270'], shirt:['#68383b','#934d48','#bd7b68'], pants:['#3c3937','#60574b'], beard:'#3c2c28', fullBeard:false, brows:'#49312b', wide:true,
    body(A,y){A.R(5,y+3,6,5,'#ead9b7');A.R(4,y,1,6,'#ead9b7');A.R(11,y,1,6,'#ead9b7');A.R(6,y+1,4,1,'#cea05d');A.P(7,y+2,'#e7bf72');},
    bodyBack(A,y){A.R(4,y+3,8,1,'#e9d6af');A.R(5,y,1,4,'#e9d6af');A.R(10,y,1,4,'#e9d6af');},
    bodySide(A,y){A.R(4,y+2,3,6,'#e9d6af');A.R(4,y+3,8,1,'#d0bb94');} },
  waiter: { style:'bowl', hair:['#b9a788','#e1d4b4','#fff0d0'], shirt:['#a46d67','#cd9b8d','#e9c3aa'], pants:['#5b4942','#806653'], eyeColor:'#7696a8',
    body(A,y){A.R(4,y,3,7,'#eaddbc');A.R(9,y,3,7,'#eaddbc');A.R(6,y+1,4,1,'#914d49');A.P(6,y+2,'#773a3b');A.P(9,y+2,'#773a3b');A.R(7,y+3,2,4,'#d7bd99');},
    bodyBack(A,y){A.R(4,y,8,7,'#dfcba8');A.R(5,y+5,6,1,'#b69775');},
    bodySide(A,y){A.R(8,y,4,7,'#eaddbc');A.R(8,y+5,4,1,'#b69775');} },
  builder: { style:'miner', hair:['#b77930','#e3ad4e','#f4d17b'], hairUnder:['#332a27','#4e352c','#73513c'], skin:['#805035','#a97049','#cc9663'], shirt:['#75654f','#a18f6d','#d5c4a0'], pants:['#374a5b','#5f7484'], beard:'#68452f', fullBeard:true, wide:true,
    body(A,y){A.R(4,y,1,7,'#3d5366');A.R(11,y,1,7,'#3d5366');A.R(5,y+2,6,6,'#4b6375');A.P(4,y+1,'#d5b271');A.P(11,y+1,'#d5b271');A.R(7,y+4,3,2,'#6c8290');A.R(10,y+6,3,2,'#93704b');},
    bodyBack(A,y){A.L(4,y,10,y+5,'#41596a');A.L(11,y,5,y+5,'#41596a');A.R(4,y+5,8,3,'#41596a');},
    bodySide(A,y){A.R(8,y,2,6,'#41596a');A.R(5,y+3,7,4,'#41596a');A.R(11,y+5,3,3,'#97754e');} },
  prof: { style:'scholar', hair:['#c5bca6','#e9e1c9','#fff2d5'], shirt:['#28394e','#455e7d','#7188a1'], pants:['#303b4b','#4b5a6d'], eyes:'glasses', glassC:'#477fa3', beard:'#eee4c8', brows:'#e2d8bd',
    body(A,y){A.R(6,y,4,5,'#363c4c');A.L(4,y+1,5,y+6,'#c7a15c');A.L(11,y+1,10,y+6,'#c7a15c');A.R(4,y+6,8,1,'#c7a15c');A.P(11,y+3,'#efcf87');},
    bodySide(A,y){A.R(4,y+1,1,6,'#c7a15c');A.R(4,y+6,8,1,'#c7a15c');A.R(9,y+4,3,3,'#76624a');},
    bodyBack(A,y){A.R(4,y+1,8,1,'#b59354');A.R(4,y+6,8,1,'#b59354');A.R(7,y+3,2,2,'#5c7490');} },
  granny: { style:'silverBun', hair:['#a69c9b','#d4c9bf','#f3e7d4'], shirt:['#77506b','#a47d96','#c8a5b7'], pants:['#5d425d','#7d5d7b'], eyes:'glasses', glassC:'#b38b55', robe:true, trim:'#9d7a8d',
    body(A,y){A.R(6,y,4,5,'#f0e2c3');A.L(3,y+1,7,y+6,'#c49cac');A.L(12,y+1,8,y+6,'#b486a0');A.E(10,y+2,1.7,1.7,'#c4a15c');A.P(10,y+2,'#78506c');},
    bodyBack(A,y){A.R(3,y,10,4,'#b68da4');A.R(4,y+4,8,1,'#8b627e');},
    bodySide(A,y){A.R(4,y,8,4,'#b68da4');A.R(5,y+4,6,1,'#8b627e');} },
  detective: { style:'fedora', hair:['#937047','#baa078','#ddc59c'], hairUnder:['#28252d','#40363a','#65534b'], shirt:['#8d785c','#b6a082','#d8c6a4'], robe:true, trim:'#806747',
    body(A,y){A.R(6,y,4,5,'#ece1c7');A.R(7,y+1,2,5,'#8f4943');A.L(4,y+1,6,y+4,'#806d54');A.L(11,y+1,9,y+4,'#806d54');A.R(4,y+6,8,1,'#826648');A.P(8,y+6,'#d5b878');},
    bodyBack(A,y){A.R(3,y,10,3,'#c7b18d');A.R(4,y+6,8,1,'#826648');A.P(8,y+6,'#d5b878');},
    bodySide(A,y){A.R(4,y,8,3,'#c7b18d');A.R(4,y+6,8,1,'#826648');} },
  zero: { style:'greenBob', hair:['#293e3c','#49665d','#718b73'], skin:['#d3a281','#efc5a2','#ffe4c0'], shirt:['#303d55','#51617c','#7e8c9d'], pants:['#373e4d','#535f6f'], eyes:'glasses', glassC:'#b69e6c',
    body(A,y){A.R(6,y,4,3,'#ece0c4');A.R(4,y+3,6,5,'#7f5b3e');A.R(5,y+4,4,3,'#b48c57');A.P(10,y+1,'#d3ad66');},
    bodyBack(A,y){A.R(4,y+1,8,1,'#6d7e91');A.R(7,y+6,2,1,'#aa8952');},
    bodySide(A,y){A.R(3,y+3,4,5,'#a67d4d');A.R(4,y+4,2,3,'#ead7a9');} },
  priest: { style:'pilgrim', hair:['#b8a589','#e3d5b8','#fff0ce'], hairUnder:['#292c42','#46445c','#72657a'], shirt:['#b9ab91','#e4d9bd','#fff0d3'], robe:true, trim:'#bea06c', eyeColor:'#9480a7',
    body(A,y){A.R(6,y,4,5,'#414052');A.L(3,y+1,7,y+5,'#d2bd98');A.L(12,y+1,8,y+5,'#d2bd98');A.P(5,y+2,'#dfbd6b');},
    bodyBack(A,y){A.R(3,y,10,3,'#d3c2a2');A.R(4,y+3,8,1,'#b7a081');},
    bodySide(A,y){A.R(4,y,8,3,'#d3c2a2');A.P(5,y+3,'#dfbd6b');} },
  merchant: { style:'hat', hair:['#3d4a37','#64774e','#8d9b68'], hairUnder:['#56392a','#805539','#ad7b51'], shirt:['#3f553e','#68825a','#92a078'], pants:['#554534','#786349'], beard:'#775036', fullBeard:true, wide:true,
    body(A,y){A.R(4,y,8,3,'#d8ad52');A.R(4,y+3,1,4,'#ad804b');A.R(11,y+2,1,5,'#ad804b');A.R(6,y+5,4,2,'#8e653d');A.P(7,y+5,'#ddbd76');} },
  banker: { style:'silverUpdo', hair:['#a39c9c','#cfc6bc','#f0e5cf'], shirt:['#49445f','#716480','#a090a5'], pants:['#48404e','#6c5d6c'], robe:true, trim:'#9a855c', eyes:'glasses', glassC:'#b49862',
    body(A,y){A.R(6,y,4,4,'#e8dcc4');A.R(4,y+2,3,5,'#67566f');A.R(9,y+2,3,5,'#67566f');A.P(10,y+2,'#daba73');A.R(10,y+3,1,3,'#bfa164');A.P(11,y+5,'#dec281');},
    bodyBack(A,y){A.R(4,y+1,8,6,'#67566f');A.R(5,y+5,6,1,'#ab9467');},
    bodySide(A,y){A.R(8,y+1,4,6,'#67566f');A.P(11,y+4,'#dac07c');} },
  doc: { style:'silverBob', hair:['#a4a39c','#d4d1c0','#f2ebd5'], skin:['#865335','#ae774d','#d39e6b'], shirt:['#b5b4a0','#e2dfc5','#fff0d2'], pants:['#3d6070','#648591'], eyes:null,
    body(A,y){A.R(6,y,4,7,'#528d97');A.R(4,y+2,1,3,'#526164');A.R(11,y+2,1,3,'#526164');A.L(5,y+5,10,y+5,'#526164');A.P(11,y+1,'#5f9da1');A.P(12,y+2,'#5f9da1');A.P(7,y+3,'#dcb875');},
    bodyBack(A,y){A.R(4,y+5,8,1,'#bbbaa4');A.R(7,y+6,1,2,'#bbbaa4');},
    bodySide(A,y){A.R(5,y+1,2,5,'#528d97');A.R(10,y+4,2,2,'#bbbaa4');} },
  homebody: { style:'messyBun', hair:['#372c41','#594354','#816178'], shirt:['#77667f','#a48b9f','#c6abba'], pants:['#3e3c4a','#655d6c'], extra:null,
    body(A,y){A.R(3,y,10,3,'#b7a2b0');A.R(6,y+4,4,3,'#8e758c');A.R(5,y+2,1,3,'#d8c4bc');A.P(10,y+3,'#d2ad6a');A.P(11,y+4,'#d2ad6a');},
    bodyBack(A,y){A.R(4,y,8,3,'#b7a2b0');A.R(5,y+3,6,1,'#7a637e');A.P(8,y+4,'#c5a56b');},
    bodySide(A,y){A.R(5,y,7,3,'#b7a2b0');A.R(5,y+2,1,3,'#d8c4bc');} },
  postman: { style:'mailBraid', hair:['#783e2d','#ad6243','#d89160'], skin:['#d09872','#edbd96','#ffe0b3'], shirt:['#455b3e','#74895b','#a3b17d'], pants:['#4b4e3d','#72765a'], freckles:true,
    body(A,y){A.R(6,y,4,3,'#e9dfc1');A.L(4,y,11,y+7,'#a77a49');A.R(9,y+4,4,4,'#9c704b');A.R(10,y+4,2,2,'#e1c489');A.P(5,y+4,'#d4ac5c');} },
  astro: { style:'cadetCurls', hair:['#bdb6a5','#e3dfc8','#fff3d5'], skin:['#855233','#ad784b','#d39f68'], shirt:['#a7ab9b','#dbd8bd','#fff0ce'], pants:['#4c5d66','#76868c'], eyeColor:'#bb944a',
    body(A,y){A.R(6,y,4,3,'#58636b');A.R(4,y+3,8,1,'#9c9f8f');A.R(4,y+4,8,3,'#d8d3b4');A.P(10,y+4,'#d1a350');A.R(12,y+2,1,4,'#5d8b88');A.R(3,y+2,1,4,'#5d8b88');},
    bodyBack(A,y){A.R(4,y+1,8,6,'#b5b9a8');A.R(5,y+2,6,3,'#d9d8b8');A.R(3,y+1,1,5,'#5d8b88');A.R(12,y+1,1,5,'#5d8b88');},
    bodySide(A,y){A.R(10,y+1,3,6,'#b5b9a8');A.R(11,y+2,1,4,'#5d8b88');A.P(5,y+3,'#d1a350');} },
  kidA: { style:'starCrop', hair:['#50382b','#78503a','#aa7b50'], shirt:['#5c6d44','#8e9b6a','#bdc396'], pants:['#594b3a','#7b6a50'],
    body(A,y){A.R(5,y,1,6,'#a17b4e');A.R(10,y,1,6,'#a17b4e');A.R(6,y,4,2,'#ede0bc');A.P(8,y+4,'#d4b363');} },
  kidB: { style:'twinBuns', hair:['#8b3f43','#bd6263','#de9a86'], shirt:['#ab695c','#d6997f','#ecc0a0'], pants:['#734f49','#a77b64'], freckles:true,
    body(A,y){A.R(4,y,8,2,'#f2e4c5');A.R(5,y+2,1,5,'#a36b51');A.R(10,y+2,1,5,'#a36b51');A.R(5,y+4,6,3,'#c68c67');A.P(5,y+3,'#dfbc71');A.P(10,y+3,'#dfbc71');} },
  kidC: { style:'knitcap', hair:['#34415b','#536381','#7888a0'], hairUnder:['#8ea4ad','#c0d3d1','#e1e9d9'], shirt:['#3c4b66','#647691','#95a5b5'], pants:['#3c4353','#5d6b7d'],
    body(A,y){A.R(3,y,10,3,'#e6ddc2');A.R(5,y+3,6,1,'#b9b4a5');A.P(7,y+4,'#caa968');} },
  kidD: { style:'cookieBraids', hair:['#3c2c30','#63434a','#91626a'], skin:['#995e3e','#c18a5c','#e2b07b'], shirt:['#b78639','#d7ae59','#eed38a'], pants:['#71563b','#9b7b50'],
    body(A,y){A.R(4,y,8,2,'#efe1be');A.R(5,y+1,1,6,'#a27735');A.R(10,y+1,1,6,'#a27735');A.R(5,y+4,6,3,'#d5a34c');A.P(5,y+3,'#edd38a');A.P(10,y+3,'#edd38a');} },
  iceKid: { style:'knitcap', hair:['#303c56','#4c5b78','#77869c'], hairUnder:['#759999','#a8c8bf','#d5e4cd'], shirt:['#3e4f69','#627997','#8ea7b9'], pants:['#384254','#5c6d80'], eyeColor:'#74a5ae',
    body(A,y){A.R(3,y,10,3,'#c9d3c9');A.R(6,y+3,2,5,'#c9d3c9');A.R(6,y+6,2,1,'#9eaba7');A.P(9,y+5,'#d2b577');},
    extra(A,y,dir){if(dir!==1){A.R(11,y-1,1,4,'#dce8dc');A.R(10,y,3,1,'#dce8dc');A.P(10,y+2,'#dce8dc');A.P(12,y+2,'#dce8dc');}} },
  guard: { style:'guardCap', hair:['#25364c','#435774','#73859b'], hairUnder:['#302624','#47332a','#69503a'], skin:['#865136','#b07950','#d6a170'], shirt:['#2b3d54','#49617c','#74889b'], pants:['#303a49','#4c5a6b'], beard:'#49342c', fullBeard:true, wide:true,
    body(A,y){A.R(6,y,4,2,'#ddcfae');A.R(7,y+2,2,5,'#2b3e55');A.R(4,y+6,8,1,'#8c6c46');A.L(4,y,7,y+4,'#9d794c');A.P(10,y+2,'#d5af62');A.P(8,y+5,'#d5af62');} },
  tea: { style:'teaBraid', hair:['#30272c','#4c3738','#785449'], shirt:['#8a583f','#b58059','#d9ad7f'], pants:['#67503b','#947452'],
    body(A,y){A.R(5,y+2,6,6,'#ecdfbb');A.R(4,y,1,5,'#ecdfbb');A.R(11,y,1,5,'#ecdfbb');A.R(7,y+4,1,3,'#7f9562');A.P(6,y+4,'#9ca573');A.P(8,y+5,'#9ca573');},
    bodyBack(A,y){A.L(5,y,10,y+4,'#ecdfbb');A.L(10,y,5,y+4,'#ecdfbb');A.R(4,y+5,8,1,'#ecdfbb');},
    bodySide(A,y){A.R(4,y+2,3,6,'#ecdfbb');A.R(4,y+5,8,1,'#d3c49f');} },
};
for(const [id,look] of Object.entries(REF_LOOKS)) CHAR[id] = Object.assign(CHAR[id] || {},look);
