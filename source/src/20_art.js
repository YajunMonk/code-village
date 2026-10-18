/* ============================================================
 * 20 美术：像素画笔、角色、生物
 * ============================================================ */
const OUTLINE = '#1a1222';
function spr(w, h, fn, { outline = true } = {}) {
  const buf = new Array(w * h).fill(null);
  const api = {
    w, h,
    P(x, y, c) { x = Math.round(x); y = Math.round(y); if (c && x >= 0 && y >= 0 && x < w && y < h) buf[y * w + x] = c; },
    R(x, y, ww, hh, c) { for (let j = 0; j < hh; j++) for (let i = 0; i < ww; i++) api.P(x + i, y + j, c); },
    E(cx, cy, rx, ry, c) { for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) { const dx = (x + .5 - cx) / rx, dy = (y + .5 - cy) / ry; if (dx * dx + dy * dy <= 1) api.P(x, y, c); } },
    G(x, y) { return (x >= 0 && y >= 0 && x < w && y < h) ? buf[y * w + x] : null; },
    X(x, y) { if (x >= 0 && y >= 0 && x < w && y < h) buf[y * w + x] = null; },
    L(x0, y0, x1, y1, c) { x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0; const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy; for (;;) { api.P(x0, y0, c); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } } },
    // 在已有像素上做明暗：只改已经画了的像素
    T(x, y, c) { if (api.G(x, y)) api.P(x, y, c); },
  };
  fn(api);
  const pad = outline ? 1 : 0, W = w + pad * 2, H = h + pad * 2;
  const [c, x] = makeCanvas(W, H); const img = x.createImageData(W, H), d = img.data;
  const put = (px, py, col) => { const [r, g, b] = hex2rgb(col); const i = (py * W + px) * 4; d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255; };
  for (let y = 0; y < h; y++) for (let x2 = 0; x2 < w; x2++) if (buf[y * w + x2]) put(x2 + pad, y + pad, buf[y * w + x2]);
  if (outline) {
    const g = (x2, y) => (x2 >= 0 && y >= 0 && x2 < w && y < h) ? buf[y * w + x2] : null;
    for (let Y = 0; Y < H; Y++) for (let X = 0; X < W; X++) {
      const bx = X - pad, by = Y - pad; if (g(bx, by)) continue;
      const n = g(bx, by + 1) || g(bx - 1, by) || g(bx + 1, by) || g(bx, by - 1);
      if (n) put(X, Y, mix(shade(n, .35), OUTLINE, .55));
    }
  }
  x.putImageData(img, 0, 0);
  return c;
}

/* ---------- 调色板 ---------- */
const SKIN = ['#c9876a', '#eab08c', '#ffd7b5'];
const C = {
  ink: '#1c1428', white: '#fffaf0', blush: '#f58f9a', mouth: '#7a2e3a', tongue: '#e8606c',
  gold: ['#9c6a12', '#e0a92a', '#ffe07a'],
};

/* ---------- 两头身角色：依照 buxiang-design.png 的原生像素复刻 ----------
 * 常规 24×34、儿童 24×32；头部主体 17px，肩窄、短手短腿。
 * 独立肖像由 UI 提供。这里只承担世界行走图，脚底世界锚点保持不变。
 */
function drawPerson(o, dir, frame, talk = 0, blink = false) {
  const height = o.short ? 32 : 34;
  return spr(24, height, A => {
    const { P, R, L, E } = A;
    const sk = o.skin || ['#d99d7b', '#f1c29c', '#ffe2bc'];
    const hr = o.hair, sh = o.shirt, pa = o.pants || ['#39394a', '#56586a'];
    const isPlayer = o === CHAR.player, rear = dir === 1, side = dir === 2;
    const stride = frame === 1 ? 1 : frame === 3 ? -1 : 0, bob = stride ? -1 : 0;
    const by = (o.short ? 19 : 20) + bob, hy = (o.short ? 6 : 7) + bob;
    const hem = o.short ? 25 : 27, foot = height - 2;
    const shoe = o.shoes || '#70513f';
    // 两只短腿交替迈出；脚掌宽而稳，一只脚始终落在相同的世界基线上。
    const leg = (x, front, lift, shift) => {
      const xx = x + shift, sole = foot + 1 - lift;
      R(xx, hem - 1, 4, Math.max(2, sole - hem), front ? pa[1] : pa[0]);
      if (isPlayer) { R(xx, hem, 4, 2, '#494047'); R(xx, hem + 2, 4, Math.max(1, sole - hem - 4), sk[1]); P(xx, hem + 2, sk[2]); }
      R(xx - 1, sole - 2, 5, 3, shoe); R(xx - 1, sole - 2, 5, 1, mix(shoe, '#e3b67d', .4));
      R(xx - (side ? 2 : 1), sole, side ? 7 : 6, 1, '#3b3030');
      P(xx, sole - 2, mix(shoe, '#f6d7a0', .5));
    };
    if (!o.robe) {
      R(7, hem - 2, 11, 4, pa[0]);
      if (side) { leg(12, false, stride < 0 ? 1 : 0, -stride); leg(8, true, stride > 0 ? 1 : 0, stride); }
      else { leg(7, true, stride > 0 ? 1 : 0, 0); leg(14, !rear, stride < 0 ? 1 : 0, 0); }
    } else {
      R(6, hem - 3, 13, foot - hem + 3, sh[1]); R(5, foot - 3, 15, 3, sh[1]);
      R(7, hem - 2, 2, foot - hem + 1, sh[2]); R(17, hem - 2, 2, foot - hem + 1, sh[0]);
      R(11, hem, 1, Math.max(1, foot - hem), sh[0]); R(5, foot - 1, 15, 1, o.trim || sh[0]);
      R(7 + stride, foot, 5, 2, shoe); R(14 - stride, foot, 5, 2, shoe);
    }
    // 缩短袖口和手腕，圆肩比头的轮廓窄；不靠长胳膊展示服饰。
    const sleeve = (x, swing, front) => {
      R(x, by + 1 + swing, 3, 4, front ? sh[1] : sh[0]);
      P(x, by + 1 + swing, front ? sh[2] : sh[1]);
      R(x, by + 4 + swing, 3, 2, front ? sh[1] : sh[0]);
      R(x, by + 5 + swing, 3, 2, sk[1]); P(x, by + 5 + swing, sk[2]); P(x + 2, by + 6 + swing, sk[0]);
    };
    if (side) sleeve(16 - stride, -stride, false);
    else { sleeve(4, stride > 0 ? 1 : 0, true); sleeve(18, stride < 0 ? 1 : 0, false); }
    const bodyX = o.wide ? 6 : 7, bodyW = o.wide ? 13 : 11;
    R(bodyX, by, bodyW, hem - by + 1, sh[1]);
    R(bodyX, by + 1, 2, Math.max(1, hem - by - 1), sh[2]);
    R(bodyX + bodyW - 2, by + 1, 2, Math.max(1, hem - by), sh[0]);
    R(bodyX, hem, bodyW, 1, sh[0]);
    if (!rear) { R(11, by + 1, 2, Math.max(1, hem - by - 1), sh[0]); P(12, by + 3, '#d7bd8a'); P(12, by + 5, '#d7bd8a'); }
    else { R(bodyX + 1, by + 2, bodyW - 2, 1, mix(sh[0], sh[1], .5)); }
    // 职业配件沿用原设计的语义，在短上衣中原生重排，不再纵向拉伸。
    const gearY = y => by + Math.round((y - by) * .75);
    const Gear = {
      P: (x, y, c) => P(x + 4, gearY(y), c),
      R: (x, y, w, h, c) => R(x + 4, gearY(y), w, Math.max(1, Math.round(h * .75)), c),
      L: (x, y, xx, yy, c) => L(x + 4, gearY(y), xx + 4, gearY(yy), c),
      E: (x, y, rx, ry, c) => E(x + 4, gearY(y), rx, Math.max(1, ry * .75), c),
    };
    const outfit = dir === 0 ? o.body : rear ? o.bodyBack : o.bodySide;
    if (outfit && !isPlayer) outfit(Gear, by, frame);
    // 旧人物没有侧背配件时，保留围裙、腰带和工作服的主要识别块。
    if (!outfit && (side || rear)) {
      if (['chef', 'bandana'].includes(o.style) || o === CHAR.waiter) {
        R(side ? 7 : 6, by + 3, side ? 3 : 13, 1, '#e5d3b2');
        if (side) R(7, by + 2, 2, 5, '#eee1c7');
      }
      if (o === CHAR.guard || o === CHAR.banker || o === CHAR.keeper) R(7, by + 5, 11, 1, '#665641');
      if (o === CHAR.doc || o === CHAR.astro) { R(7, by + 4, 11, 1, '#b7c5bd'); if (side) P(8, by + 2, '#c87b6c'); }
      if (o === CHAR.homebody || o === CHAR.webkid) R(side ? 8 : 7, by + 1, side ? 2 : 11, 1, sh[2]);
    }
    if (isPlayer) {
      // 参考图：米色内搭、青绿短外套、珊瑚短围巾和浅棕小背包。
      if (rear) {
        R(7, by, 12, 8, '#8d6547'); R(8, by, 10, 6, '#c79e6e'); R(8, by, 10, 3, '#dfba84');
        R(9, by + 1, 8, 2, '#e8c997'); R(12, by + 3, 2, 4, '#8b5c40'); P(12, by + 4, '#efcf8c');
        P(8, by + 5, '#e2bb82'); R(17, by + 3, 1, 4, '#ac7b50');
      } else if (side) {
        R(17, by, 5, 8, '#9b734e'); R(17, by, 4, 6, '#cfaa78'); R(17, by, 4, 2, '#e4c696');
        R(19, by + 3, 2, 3, '#8b5c40'); P(19, by + 3, '#f0ce8e');
        R(7, by + 1, 2, 5, '#f4e1bc'); L(12, by, 16, by + 4, '#c4a071');
      } else {
        R(10, by, 5, 7, '#f0ddba'); R(10, by + 1, 1, 5, '#fff0d0');
        R(7, by, 1, 5, '#bf9364'); R(17, by, 1, 5, '#9b704d');
        P(8, by + 4, '#dcb573'); P(17, by + 5, '#dcb573');
      }
      R(7, by + 1, side ? 10 : 12, 2, '#c9715f');
      R(8, by + 1, side ? 8 : 10, 1, '#e9a286');
      if (!rear) { R(side ? 7 : 15, by + 3, 3, 3, '#d7826b'); P(side ? 7 : 15, by + 5, '#efb391'); }
    }
    if (side) sleeve(7 - stride, stride > 0 ? 1 : 0, true);
    // 脸是少量清晰的大像素簇：圆颊、明亮眼睛，不加尖鼻与浓重眉线。
    const frontRows = [[8,16],[6,18],[5,19],[4,20],[4,20],[4,20],[4,20],[5,19],[6,18],[8,16]];
    const sideRows = [[8,17],[6,18],[5,19],[4,20],[4,20],[4,19],[5,19],[5,18],[6,17],[8,15]];
    (side ? sideRows : frontRows).forEach(([x0, x1], y) => R(x0, hy + 4 + y, x1 - x0 + 1, 1, sk[1]));
    R(side ? 18 : 3, hy + 7, 3, 4, sk[1]); if (!side) R(20, hy + 7, 2, 4, sk[0]);
    P(5, hy + 6, sk[2]); R(6, hy + 10, 2, 2, sk[2]); P(18, hy + 11, sk[0]);
    if (!rear) {
      const eyes = side ? [7] : [7, 15];
      for (const ex of eyes) {
        if (blink) { R(ex, hy + 8, 3, 1, '#4e3935'); P(ex + 2, hy + 7, '#4e3935'); }
        else { R(ex, hy + 7, 3, 3, '#463032'); R(ex + 1, hy + 9, 2, 1, o.eyeColor || '#98704b'); P(ex, hy + 7, '#fff4db'); }
      }
      R(side ? 5 : 5, hy + 10, 2, 1, '#e6a18b'); if (!side) R(18, hy + 10, 2, 1, '#e6a18b');
      const mx = side ? 7 : 12; R(mx, hy + 12, talk ? 2 : 1, talk ? 2 : 1, talk ? '#a36557' : '#ad7662');
      if (o.beard) {
        if (o.fullBeard) { R(side?7:5,hy+10,2,3,o.beard); R(18,hy+10,2,3,o.beard); R(side?8:7,hy+12,side?10:11,2,o.beard); R(side?10:9,hy+14,7,1,o.beard); }
        R(side ? 8 : 9, hy + 12, side ? 4 : 7, 1, o.beard); R(side ? 9 : 10, hy + 13, side ? 2 : 5, 1, o.beard);
        P(side?8:12,hy+12,talk?'#694638':sk[0]);
      }
      if (o.brows) for (const ex of eyes) R(ex,hy+5,3,1,o.brows);
      if (o.freckles) { P(5,hy+11,'#b97955'); P(7,hy+11,'#b97955'); if(!side){P(18,hy+11,'#b97955');P(20,hy+11,'#b97955');} }
      if (o.eyes === 'shades') { R(side ? 6 : 6, hy + 6, side ? 6 : 14, 4, '#303039'); P(8, hy + 6, '#89978e'); if (!side) P(16, hy + 6, '#89978e'); }
      if (o.eyes === 'glasses' || o.eyes === 'hex') {
        const c = o.glassC || '#c2b893';
        for (const x of side ? [6] : [6,14]) { R(x+(o.eyes==='hex'?1:0), hy + 6, o.eyes==='hex'?3:5, 1, c); R(x+(o.eyes==='hex'?1:0), hy + 10, o.eyes==='hex'?3:5, 1, shade(c,.8)); R(x,hy + 7,1,3,c); R(x+4,hy+7,1,3,c); }
        if (!side) R(11,hy + 8,3,1,c);
      }
    }
    // 发型的 16px 设计坐标转换成圆头宽度；高度保持整数像素，不拉长身体。
    const hx = x => 2 + Math.round(x * 1.2);
    const Head = {
      P: (x,y,c) => P(hx(x),y,c), R: (x,y,w,h,c) => R(hx(x),y,Math.max(1,hx(x+w)-hx(x)),h,c),
      E: (x,y,rx,ry,c) => E(hx(x),y,rx*1.2,ry,c), L: (x,y,xx,yy,c) => L(hx(x),y,hx(xx),yy,c),
      T: (x,y,c) => A.T(hx(x),y,c), G: (x,y) => A.G(hx(x),y), X: (x,y) => A.X(hx(x),y),
    };
    hairStyles[isPlayer ? 'buxiang' : o.style || 'short'](Head,hy,dir,hr,o);
    if (side && !['hood','helmet'].includes(o.style)) { R(17,hy+8,2,3,sk[1]); P(18,hy+9,sk[0]); }
    if (o.extra) o.extra(Head,hy,dir,frame,by);
  });
}
const hairStyles = {
  short(A, y, dir, h) {
    const { R, P, L } = A;
    R(4,y-3,8,1,h[1]); R(2,y-2,12,1,h[1]); R(1,y-1,14,2,h[1]); R(0,y+1,16,4,h[1]);
    if (dir === 0) {
      R(0,y+5,2,5,h[1]); R(14,y+4,2,6,h[0]);
      R(2,y+3,3,3,h[1]); R(5,y+3,3,4,h[1]); R(8,y+3,4,3,h[1]); R(12,y+3,2,2,h[1]);
      P(4,y+6,h[0]); P(7,y+7,h[0]); P(11,y+6,h[0]); R(15,y+5,1,3,h[1]);
    } else if (dir === 1) {
      R(0,y+4,16,7,h[1]); R(1,y+11,14,1,h[1]); R(3,y+12,10,1,h[0]);
      R(13,y+5,3,5,h[0]); L(5,y+4,7,y+8,h[0]); L(7,y+8,11,y+7,h[0]); P(10,y+7,h[2]);
    } else {
      R(7,y+4,9,7,h[1]); R(9,y+11,5,1,h[0]); R(13,y+5,3,5,h[0]);
      R(0,y+4,3,3,h[1]); R(3,y+3,3,3,h[1]); R(6,y+3,3,5,h[1]); P(8,y+8,h[0]);
    }
    R(4,y-2,5,1,h[2]); R(2,y,3,1,h[2]); P(3,y+1,h[2]); R(9,y,3,1,h[2]);
    L(10,y+1,13,y+4,h[0]); P(12,y+2,h[1]);
  },
  buxiang(A, y, dir, h) {
    const { R,P,L } = A;
    hairStyles.short(A,y,dir,h);
    // 参考图的上翘呆毛、向右落下的厚刘海和后脑发旋。
    R(7,y-5,2,2,h[1]); R(8,y-6,3,1,h[1]); P(8,y-5,h[2]);
    if (dir === 0) { R(7,y+3,3,5,h[1]); P(8,y+8,h[0]); P(9,y+7,h[0]); L(7,y+1,10,y+5,h[0]); P(8,y+3,h[2]); P(0,y+4,h[0]); }
    else if (dir === 1) { L(6,y+3,6,y+7,h[0]); L(6,y+7,9,y+9,h[0]); L(9,y+9,12,y+6,h[0]); P(11,y+6,h[2]); }
    else { R(6,y+3,3,4,h[1]); P(7,y+6,h[0]); L(9,y+1,12,y+5,h[0]); P(10,y+2,h[2]); }
  },
  spiky(A, y, dir, h) {
    const { R, P } = A;
    hairStyles.short(A, y, dir, h);
    [[3, -2], [6, -3], [9, -3], [12, -2], [4, -2], [10, -2]].forEach(([x, d]) => { P(x, y + d, h[1]); P(x, y + d + 1, h[1]); });
    P(6, y - 3, h[2]); P(9, y - 3, h[2]);
  },
  long(A, y, dir, h) {
    const { R } = A;
    hairStyles.short(A, y, dir, h);
    if (dir === 0) { R(1, y + 3, 2, 10, h[1]); R(13, y + 3, 2, 10, h[0]); }
    else if (dir === 1) R(2, y + 1, 12, 13, h[1]);
    else R(8, y + 2, 6, 12, h[1]);
  },
  bun(A, y, dir, h) {
    const { R, E } = A;
    E(8, y - 2, 3, 2.5, h[1]); A.P(7, y - 3, h[2]);
    hairStyles.short(A, y, dir, h);
    if (dir === 0) { R(4, y + 3, 8, 1, h[1]); }
  },
  cap(A, y, dir, h, o) {
    const { R, P } = A;
    R(4, y - 2, 8, 1, h[1]); R(3, y - 1, 10, 3, h[1]); R(3, y - 1, 10, 1, h[2]); R(2, y + 2, 12, 1, h[0]);
    if (dir === 0) { R(1, y + 3, 14, 1, h[0]); P(7, y, C.gold[2]); P(8, y, C.gold[1]); P(7, y + 1, C.gold[1]); P(8, y + 1, C.gold[0]); }
    else if (dir === 2) { R(0, y + 3, 7, 1, h[0]); R(10, y + 3, 4, 3, (o.hairUnder || '#2e2430')); }
    else R(2, y + 3, 12, 4, o.hairUnder || '#2e2430');
  },
  chef(A, y, dir, h, o) {
    const { R, E, P } = A;
    hairStyles.short(A, y + 1, dir, o.hairUnder);
    const w = ['#c9cfe0', '#eef1f8', '#ffffff'];
    R(3, y, 10, 3, w[1]); R(3, y + 2, 10, 1, w[0]);
    E(5, y - 2, 3, 3, w[1]); E(11, y - 2, 3, 3, w[1]); E(8, y - 3, 3.5, 3, w[2]);
    P(6, y - 3, w[2]); R(10, y - 1, 3, 1, w[0]);
  },
  bandana(A, y, dir, h, o) {
    const { R, P } = A;
    hairStyles.short(A, y, dir, o.hairUnder);
    R(3, y - 1, 10, 3, h[1]); R(2, y + 1, 12, 1, h[0]); R(5, y - 1, 3, 1, h[2]);
    if (dir === 0) { P(5, y, h[2]); P(10, y + 1, '#fff'); P(6, y + 1, '#fff'); }
    if (dir !== 0) { R(12, y + 1, 3, 2, h[1]); P(14, y + 3, h[0]); }
  },
  hood(A, y, dir, h) {
    const { R } = A;
    R(3, y - 2, 10, 1, h[1]); R(2, y - 1, 12, 2, h[1]); R(1, y + 1, 14, 3, h[1]);
    if (dir === 0) { R(1, y + 4, 2, 8, h[1]); R(13, y + 4, 2, 8, h[0]); R(3, y + 3, 10, 1, h[0]); }
    else if (dir === 1) R(1, y + 1, 14, 11, h[1]);
    else { R(7, y + 1, 8, 11, h[1]); R(1, y + 3, 6, 1, h[0]); }
    R(4, y - 1, 4, 1, h[2]);
  },
  hat(A, y, dir, h, o) {
    const { R, P } = A;
    hairStyles.short(A, y + 1, dir, o.hairUnder);
    R(4, y - 3, 8, 4, h[1]); R(4, y - 3, 8, 1, h[2]); R(4, y, 8, 1, h[0]);
    R(0, y + 1, 16, 2, h[1]); R(0, y + 2, 16, 1, h[0]); P(5, y - 1, '#d04545'); P(6, y - 1, '#d04545');
  },
  slick(A, y, dir, h) {
    const { R } = A;
    R(4, y - 1, 8, 1, h[1]); R(3, y, 10, 1, h[1]); R(2, y + 1, 12, 3, h[1]);
    if (dir === 0) { R(2, y + 3, 7, 1, h[1]); R(2, y + 4, 1, 3, h[1]); R(13, y + 4, 1, 3, h[0]); }
    else if (dir === 1) R(2, y + 1, 12, 9, h[1]);
    else R(7, y + 1, 7, 7, h[1]);
    R(9, y, 3, 1, h[2]);
  },
};

/* 独立角色剪影来自最终角色图集，而不是同一圆头换配色。 */
Object.assign(hairStyles, {
  goggleTrim(A,y,dir,c='#bb8c51') {
    const {R,E,P}=A;
    R(0,y+1,16,2,'#59483e');
    if(dir===1){R(1,y+1,14,1,c);return;}
    for(const x of dir===2?[3]:[4,12]){E(x,y+1,3,2.5,'#574236');E(x,y+1,2.3,1.8,c);E(x,y+1,1.4,1.2,'#b8bdb3');P(x-1,y,'#fff0cc');}
  },
  inventor(A,y,dir,h) {
    const {R,E,P,L}=A;
    hairStyles.short(A,y,dir,h);
    [[1,2],[0,5],[1,9],[15,2],[16,6],[15,10],[3,-2],[7,-3],[12,-2]].forEach(([x,d],i)=>{E(x,y+d,2.5,2,h[1]);L(x-2,y+d+1,x+1,y+d-2,h[2]);});
    R(5,y-5,2,3,h[1]);P(5,y-5,h[2]);R(11,y-4,2,3,h[1]);
    hairStyles.goggleTrim(A,y-2,dir,'#cda16a');
  },
  coils(A,y,dir,h) {
    const {E,R,P}=A;
    hairStyles.short(A,y,dir,h);
    [[1,1],[2,-2],[5,-3],[8,-3],[11,-2],[14,0],[15,3],[1,6],[15,7]].forEach(([x,d],i)=>{E(x,y+d,2.3,2.1,h[i%2]);P(x-1,y+d-1,h[2]);P(x+1,y+d+1,h[0]);});
    if(dir===0||dir===2){E(14,y+4,2,2,'#d3ab61');P(14,y+4,'#715337');R(13,y+1,1,1,'#f1cf85');}
  },
  asymCrop(A,y,dir,h,o) {
    const {R,L,P}=A;
    hairStyles.short(A,y,dir,h);
    if(dir===1){R(12,y+2,4,9,h[0]);R(13,y+3,2,7,mix(h[0],o.skin?.[0]||'#be8c70',.35));return;}
    if(dir===0){R(0,y+4,4,9,h[1]);R(1,y+12,2,2,h[0]);R(4,y+3,3,7,h[1]);L(3,y,6,y+7,h[0]);R(13,y+4,3,5,mix(h[0],o.skin?.[0]||'#be8c70',.32));P(13,y+5,h[2]);}
    else{R(0,y+3,5,7,h[1]);R(2,y+9,2,3,h[0]);L(5,y,8,y+6,h[0]);}
    R(3,y-3,2,2,h[1]);P(3,y-3,h[2]);
  },
  workCurls(A,y,dir,h) {
    const {E,P}=A;hairStyles.short(A,y,dir,h);
    [[1,0],[4,-2],[7,-2],[11,-2],[14,0],[15,4],[1,5]].forEach(([x,d],i)=>{E(x,y+d,2,2,h[1]);P(x-1,y+d,h[2]);P(x+1,y+d+1,h[0]);});
    hairStyles.goggleTrim(A,y-2,dir,'#d8a05d');
    if(dir!==1){P(1,y+11,'#e5b55c');P(15,y+11,'#e5b55c');}
  },
  sideBun(A,y,dir,h) {
    const {R,E,P,L}=A;hairStyles.short(A,y,dir,h);
    E(dir===2?13:3,y-3,3,3,h[1]);E(dir===2?13:3,y-3,1.5,2,h[2]);
    const x=dir===2?14:1;R(x,y+5,2,12,'#80638f');R(x-1,y+5,1,11,'#b290b1');P(x,y+17,'#4b3a61');
    R(1,y-3,6,1,'#d7b46d');P(1,y-2,'#f0d191');R(1,y,1,4,'#d7b46d');
    if(dir===0){R(12,y+4,2,7,h[1]);P(12,y+11,h[0]);L(4,y,7,y+5,h[0]);}
  },
  bald(A,y,dir,h,o) {
    const {R,E,P}=A,sk=o.skin||['#ad7656','#dca778','#efc59a'];
    R(4,y-3,8,1,sk[1]);R(2,y-2,12,2,sk[1]);R(1,y,14,5,sk[1]);R(3,y-2,8,1,sk[2]);
    if(dir===1){R(1,y+4,14,8,sk[1]);R(3,y+12,10,1,sk[0]);}
    [0,15].forEach(x=>{E(x,y+5,2,3,h[1]);P(x,y+3,h[2]);P(x,y+6,h[0]);});
    if(dir===0){P(4,y+2,sk[0]);P(10,y+1,sk[0]);}
  },
  scarfBraid(A,y,dir,h) {
    const {R,P,L}=A;hairStyles.short(A,y,dir,h);
    R(3,y-3,10,2,'#e0cfab');R(1,y-1,3,2,'#f1e4c1');R(13,y-1,2,6,'#d6c3a0');
    R(10,y-3,3,2,'#ae7056');P(11,y-2,'#e1bd85');
    const bx=dir===2?13:14;for(let i=0;i<13;i++){const x=bx+(Math.floor(i/2)%2);R(x,y+6+i,2,1,i%2?h[0]:h[1]);P(x,y+6+i,i%2?h[1]:h[2]);}
    R(15,y+5,2,3,'#e8dab8');L(15,y+7,17,y+11,'#e8dab8');R(14,y+18,3,1,'#ac6b54');
  },
  rider(A,y,dir,h,o) {
    const {R,E,P}=A;hairStyles.short(A,y,dir,o.hairUnder||h);
    E(8,y,8,5,'#c18543');R(1,y-2,14,3,'#eda64b');R(2,y-3,11,1,'#f6bf66');R(0,y+2,16,2,'#99683a');R(1,y+2,14,1,'#edb15d');
    hairStyles.goggleTrim(A,y-3,dir,'#e0a356');
    R(1,y+7,1,4,'#765840');R(14,y+7,1,4,'#765840');
  },
  leafSweep(A,y,dir,h) {
    const {R,L,P}=A;hairStyles.short(A,y,dir,h);
    R(0,y+4,5,9,h[1]);R(1,y+12,3,2,h[0]);R(3,y+3,4,7,h[1]);L(4,y,6,y+6,h[0]);
    R(0,y,2,2,h[1]);P(0,y-1,h[2]);R(1,y-2,3,1,h[1]);
    const x=dir===2?12:14;L(x,y-4,x,y+3,'#dcc9a0');R(x-1,y-3,2,4,'#f0ddac');L(x,y+2,x+3,y-1,'#e4c98f');R(x+1,y+1,3,2,'#7c9a6b');P(x,y+3,'#d8ab55');
  },
  mechanic(A,y,dir,h) {
    hairStyles.workCurls(A,y,dir,h);hairStyles.goggleTrim(A,y-2,dir,'#c0b08b');
  },
  bluntBob(A,y,dir,h) {
    const {R,P}=A;
    R(3,y-3,10,1,h[1]);R(1,y-2,14,2,h[1]);R(0,y,16,5,h[1]);
    if(dir===1){R(0,y+4,16,9,h[1]);R(1,y+12,14,1,h[0]);}
    else{R(0,y+4,3,9,h[1]);R(13,y+4,3,9,h[0]);R(3,y+4,10,2,h[1]);for(let x=3;x<13;x+=2)P(x,y+6,h[0]);}
    R(11,y-1,2,13,'#ddd9c0');R(11,y-1,1,12,'#f0e8ce');R(3,y-2,5,1,h[2]);
  },
  violetCrop(A,y,dir,h,o) {
    const {R,L,P}=A;hairStyles.asymCrop(A,y,dir,h,o);
    R(2,y-4,3,1,h[1]);R(0,y-2,2,2,h[1]);P(1,y-2,h[2]);
    if(dir!==1){R(1,y+5,2,8,h[1]);L(2,y+2,4,y+8,h[2]);P(1,y+13,h[0]);}
    else{R(0,y+7,3,5,h[1]);R(1,y+12,2,1,h[0]);}
  },
  highPony(A,y,dir,h) {
    const {R,E,L,P}=A;
    hairStyles.short(A,y,dir,h);
    const x=dir===2?14:13;
    E(x,y-3,3.3,3,h[1]);R(x-1,y-4,2,1,h[2]);
    R(x,y,3,14,h[1]);R(x+1,y+5,2,11,h[0]);P(x,y+16,h[1]);
    R(x-2,y-1,5,1,'#a0ad74');P(x-3,y-2,'#c8cd91');P(x+2,y,'#c8cd91');
    if(dir!==1){R(3,y+3,3,6,h[1]);P(4,y+9,h[0]);L(3,y,6,y+5,h[0]);R(0,y+6,2,6,h[1]);}
  },
  earphoneCrop(A,y,dir,h,o) {
    const {R,E,L,P}=A;hairStyles.asymCrop(A,y,dir,h,o);
    [[1,-3],[5,-4],[9,-3],[14,-1]].forEach(([x,d])=>{R(x,y+d,3,2,h[1]);P(x,y+d,h[2]);});
    L(4,y-3,11,y-3,'#343b4d');R(11,y-2,2,6,'#343b4d');
    const ex=dir===2?13:15;E(ex,y+7,2.4,3.8,'#303a4c');E(ex,y+7,1.8,2.9,'#dfa24b');E(ex,y+7,1,2,'#465468');
    if(dir===1){R(1,y+5,2,4,'#dca34d');R(14,y+5,2,4,'#dca34d');}
  },
  closeCurls(A,y,dir,h) {
    const {R,E,P}=A;
    R(3,y-2,10,1,h[1]);R(1,y-1,14,3,h[1]);R(0,y+2,16,3,h[1]);
    for(const [x,d] of [[2,0],[5,-1],[8,-1],[11,0],[14,2],[1,4]]){E(x,y+d,1.8,1.7,h[1]);P(x,y+d-1,h[2]);}
    if(dir===1){R(0,y+4,16,6,h[1]);R(2,y+10,12,2,h[0]);}
    else if(dir===2){R(9,y+4,7,6,h[1]);R(13,y+5,3,6,h[0]);}
    else{R(0,y+4,2,5,h[1]);R(14,y+4,2,5,h[0]);}
  },
  bowl(A,y,dir,h) {
    const {R,P,L}=A;hairStyles.short(A,y,dir,h);
    if(dir===0){R(1,y+4,14,3,h[1]);R(2,y+7,3,1,h[0]);R(6,y+4,2,5,h[1]);P(7,y+9,h[0]);R(10,y+4,2,4,h[1]);P(10,y+8,h[0]);}
    else if(dir===2){R(0,y+4,8,3,h[1]);R(5,y+4,3,5,h[1]);R(12,y+4,3,7,h[0]);}
    L(8,y-2,6,y+5,h[0]);R(3,y,2,3,h[2]);R(11,y,2,3,h[2]);
  },
  miner(A,y,dir,h,o) {
    const {R,E,P}=A;hairStyles.closeCurls(A,y+1,dir,o.hairUnder);
    E(8,y,8,4.8,h[1]);R(0,y+2,16,2,h[1]);R(0,y+3,16,1,h[0]);R(3,y-3,3,4,h[2]);R(7,y-4,2,6,h[0]);
    R(0,y,16,2,'#584c40');if(dir!==1){const x=dir===2?3:8;E(x,y,2.8,2.6,'#977044');E(x,y,1.8,1.8,'#65aba4');P(x-1,y-1,'#e3f3ce');}
  },
  scholar(A,y,dir,h,o) {
    const {E,L,P,R}=A;hairStyles.bald(A,y,dir,h,o);
    for(const [x,d] of [[0,3],[0,6],[1,9],[15,3],[16,6],[15,9]]){E(x,y+d,2.5,2.1,h[1]);L(x-1,y+d+1,x+1,y+d-2,h[2]);}
    if(dir!==1){L(7,y+12,3,y+15,h[1]);L(10,y+12,14,y+15,h[1]);R(3,y+14,3,1,h[2]);R(11,y+14,3,1,h[2]);}
  },
  silverBun(A,y,dir,h) {
    const {R,E,P,L}=A;hairStyles.short(A,y,dir,h);
    E(10,y-4,3,2.5,h[1]);L(8,y-5,10,y-2,h[2]);R(12,y-3,2,2,'#8d9b54');P(14,y-4,'#b2b66d');P(13,y-1,'#a75c47');
    if(dir===0){R(2,y+4,12,2,h[1]);for(let x=3;x<14;x+=3){P(x,y+6,h[0]);L(x,y+1,x-1,y+4,h[2]);}}
  },
  fedora(A,y,dir,h,o) {
    const {R,P,L}=A;hairStyles.short(A,y+1,dir,o.hairUnder);
    R(4,y-4,9,1,h[1]);R(3,y-3,11,4,h[1]);R(4,y-3,4,1,h[2]);R(3,y,11,2,'#3c3c46');R(0,y+2,17,2,h[1]);R(0,y+3,17,1,h[0]);
    if(dir!==1){R(2,y+5,2,9,o.hairUnder[1]);P(3,y+14,o.hairUnder[0]);L(6,y+4,8,y+8,o.hairUnder[1]);P(12,y+1,'#d2a55c');}
    else R(2,y+5,12,7,o.hairUnder[1]);
  },
  greenBob(A,y,dir,h,o) {
    const {R,L,P}=A;hairStyles.asymCrop(A,y,dir,h,o);
    R(0,y+5,3,9,h[1]);R(13,y+6,3,7,h[0]);P(1,y+14,h[0]);L(3,y-1,2,y+11,h[2]);
    const x=dir===2?13:14;R(x-1,y+1,3,3,'#b78a51');R(x,y+1,2,2,'#f0d7a0');P(x,y+5,'#d4ab67');
  },
  silverUpdo(A,y,dir,h) {
    const {R,E,L,P}=A;hairStyles.short(A,y,dir,h);
    E(6,y-4,4.5,2.5,h[1]);E(9,y-2,4,3,h[1]);L(3,y-3,8,y-5,h[2]);L(5,y-1,10,y-3,h[0]);
    if(dir===0){L(3,y+1,11,y+4,h[2]);L(4,y+2,10,y+5,h[0]);R(11,y+4,3,3,h[1]);}
    else if(dir===1){L(2,y+3,12,y+8,h[2]);L(3,y+6,12,y+10,h[0]);}
    R(1,y-3,5,1,'#cfaa65');P(1,y-2,'#e8c882');P(0,y,'#d1ac65');
    if(dir!==1){P(1,y+11,'#e1bf77');P(15,y+11,'#e1bf77');}
  },
  silverBob(A,y,dir,h) {
    const {R,L,P}=A;hairStyles.short(A,y,dir,h);
    R(0,y+4,3,9,h[1]);R(13,y+4,3,9,h[0]);R(1,y+12,3,1,h[0]);
    if(dir===0){R(3,y+3,3,5,h[1]);R(10,y+3,3,4,h[1]);L(7,y-1,4,y+5,h[0]);}
    else if(dir===1){R(2,y+6,12,7,h[1]);L(5,y+1,4,y+11,h[2]);L(12,y+3,13,y+11,h[0]);}
    else{R(7,y+3,8,10,h[1]);L(12,y+1,13,y+10,h[2]);}P(1,y+11,'#dfb95f');P(15,y+11,'#dfb95f');
  },
  messyBun(A,y,dir,h) {
    const {R,E,L,P}=A;hairStyles.short(A,y,dir,h);
    E(11,y-3,3.5,3,h[1]);L(11,y-3,13,y-5,h[2]);L(10,y-4,9,y-5,h[1]);P(14,y-3,h[0]);R(9,y-1,4,1,'#8c6f91');
    R(0,y+5,2,7,h[1]);P(0,y+12,h[0]);if(dir!==1){R(3,y+3,4,6,h[1]);R(9,y+4,2,4,h[1]);P(6,y+9,h[0]);L(4,y,7,y+5,h[2]);}
  },
  mailBraid(A,y,dir,h) {
    const {R,E,L,P}=A;hairStyles.short(A,y,dir,h);
    E(8,y-1,7.7,3.7,'#e6d7b6');R(2,y+1,13,2,'#536c50');R(3,y+1,10,1,'#71906a');
    if(dir!==1){R(11,y-3,4,3,'#cba05f');L(11,y-3,13,y-1,'#f0d193');P(14,y-2,'#79613f');}
    const x=dir===2?13:14;for(let i=0;i<15;i++){R(x+(i>>1)%2,y+6+i,2,1,i%2?h[0]:h[1]);P(x,y+6+i,i%3?h[1]:h[2]);}R(x,y+19,3,1,'#50734e');
  },
  cadetCurls(A,y,dir,h) {
    const {R,E,P}=A;hairStyles.closeCurls(A,y,dir,h);
    [[3,-3],[5,-4],[8,-3],[11,-2],[0,1]].forEach(([x,d])=>{E(x,y+d,2,2,h[1]);P(x-1,y+d,h[2]);});
    if(dir!==1){R(13,y+4,3,5,'#aa815f');P(15,y+9,'#efc76e');P(14,y+10,'#d4a552');}
  },
  starCrop(A,y,dir,h,o) {
    const {R,L,P}=A;hairStyles.asymCrop(A,y,dir,h,o);
    R(0,y+4,4,6,'#9d7154');R(1,y+5,2,4,'#b18562');R(3,y-4,3,2,h[1]);L(5,y-4,8,y-2,h[2]);R(8,y-3,3,2,h[1]);
    if(dir!==1){R(2,y+1,3,1,'#e8bd63');R(3,y,1,3,'#f6dc8b');P(4,y+2,'#ce9d46');}
  },
  twinBuns(A,y,dir,h) {
    const {R,E,L,P}=A;hairStyles.short(A,y,dir,h);
    for(const x of [1,15]){E(x,y-1,3,3.5,h[1]);L(x-1,y-2,x+1,y+1,h[2]);P(x,y+2,h[0]);R(x-1,y+8,2,5,h[1]);P(x,y+13,h[0]);}
    if(dir!==1)for(const x of [1,15]){R(x-1,y-1,3,1,'#e8c668');R(x,y-2,1,3,'#f4dc8b');P(x,y-1,'#aa7c42');}
    if(dir===0){R(5,y+3,3,4,h[1]);P(7,y+7,h[0]);}
  },
  knitcap(A,y,dir,h,o) {
    const {R,E,P,L}=A;hairStyles.short(A,y+1,dir,o.hairUnder);
    R(7,y-5,7,2,h[1]);R(4,y-3,11,3,h[1]);R(2,y,14,2,h[1]);R(1,y+2,15,2,h[0]);R(1,y+2,14,1,h[2]);
    E(15,y-4,1.5,1.5,'#e7d8b9');for(let x=4;x<14;x+=3){P(x,y-1,'#ba9a59');P(x+1,y,'#ba9a59');}
    if(dir===0){L(5,y+4,4,y+7,o.hairUnder[2]);R(8,y+4,2,4,o.hairUnder[1]);}
  },
  cookieBraids(A,y,dir,h,o) {
    const {R,E,P}=A;hairStyles.short(A,y,dir,h);
    for(const x of [0,15])for(let i=0;i<11;i++){const px=x+(i>>1)%2;R(px,y+8+i,2,1,i%2?h[0]:h[1]);P(px,y+8+i,i%3?h[1]:h[2]);}
    E(7,y-1,7,4,'#d3a247');R(1,y+2,13,2,'#ac7a36');for(let x=3;x<13;x+=3)R(x,y-2,1,4,'#ecc677');
    if(dir!==1){E(3,y+1,1.6,1.8,'#f2dab0');P(2,y,'#744d34');P(4,y+1,'#744d34');}
    R(0,y+16,3,1,'#ddb55d');R(15,y+16,3,1,'#ddb55d');
  },
  guardCap(A,y,dir,h,o) {
    const {R,E,P}=A;hairStyles.closeCurls(A,y+1,dir,o.hairUnder);
    E(8,y-1,7.7,3.4,h[1]);R(1,y+1,14,2,h[0]);R(2,y+1,12,1,'#8b6f48');R(dir===2?0:3,y+3,dir===2?9:11,1,h[0]);
    if(dir!==1){const x=dir===2?4:8;E(x,y,1.8,1.8,'#c49a52');P(x,y-1,'#f3d388');}
  },
  teaBraid(A,y,dir,h) {
    const {R,L,P}=A;hairStyles.short(A,y,dir,h);
    R(3,y-3,11,2,'#af5f49');R(2,y-1,13,2,'#c77e5c');L(5,y-2,9,y,'#e1b079');L(10,y-2,13,y,'#e1b079');
    const x=dir===2?14:15;R(x,y+4,3,3,'#c77e5c');R(x+1,y+7,2,4,'#995344');P(x,y+8,'#e1b079');
    for(let i=0;i<13;i++){R(x-1+(i>>1)%2,y+7+i,2,1,i%2?h[0]:h[1]);P(x-1,y+7+i,i%3?h[1]:h[2]);}R(x-1,y+19,3,1,'#d1ad64');
    if(dir!==1){R(0,y+5,2,9,h[1]);P(1,y+14,h[0]);P(0,y+11,'#98ac6c');}
  },
  pilgrim(A,y,dir,h,o) {
    const {R,L,P}=A;hairStyles.short(A,y,dir,o.hairUnder);
    R(5,y-4,7,1,h[2]);R(3,y-3,11,2,h[1]);R(1,y-1,3,3,h[1]);R(13,y-1,3,4,h[0]);
    R(0,y+2,2,11,h[1]);R(15,y+2,2,11,h[0]);R(1,y+11,3,3,h[1]);R(13,y+11,3,3,h[0]);
    L(5,y-3,1,y+4,'#c7a16a');L(11,y-3,15,y+4,'#c7a16a');P(3,y,'#edcca0');P(14,y+3,'#e2bf90');
    if(dir===1){R(2,y+1,13,12,h[1]);L(8,y+2,10,y+9,h[0]);R(4,y+12,9,2,h[0]);}
    else for(let i=0;i<12;i++){const x=dir===2?13:14;R(x+(i>>1)%2,y+7+i,2,1,i%2?o.hairUnder[0]:o.hairUnder[1]);P(x,y+7+i,o.hairUnder[2]);}
  },
});

/* ---------- 角色设定 ---------- */
const CHAR = {
  player: { hair: ['#342525', '#594037', '#94634b'], shirt: ['#205758', '#398d87', '#78bca4'], pants: ['#2a3447', '#4c5a71'], shoes: '#80523c',
    body(A, by) { A.R(5, by, 6, 2, '#ee9874'); A.R(9, by + 2, 2, 4, '#d56958'); A.P(10, by + 5, '#f3b18c'); A.R(4, by + 3, 1, 4, '#bc8853'); A.R(5, by + 6, 4, 1, '#265f60'); A.P(6, by + 4, '#efe4be'); },
    bodySide(A, by) { A.R(9, by, 5, 7, '#946b46'); A.R(9, by, 4, 1, '#d9b079'); A.R(10, by + 3, 4, 1, '#5e4736'); A.P(11, by + 4, '#eed69f'); A.R(3, by + 1, 4, 1, '#ee9874'); },
    bodyBack(A, by) { A.R(3, by, 10, 8, '#805b3f'); A.R(4, by, 8, 2, '#c99760'); A.R(4, by + 2, 8, 5, '#aa7a4c'); A.R(5, by + 5, 6, 2, '#805b3f'); A.P(7, by + 3, '#f4d997'); A.P(8, by + 3, '#f4d997'); A.R(5, by - 1, 6, 1, '#ee9874'); } },
  granny: { style: 'bun', hair: ['#9a9ab8', '#cfd0e2', '#f4f4ff'], shirt: ['#4e2f7a', '#7550a8', '#9b7ad0'], pants: ['#3e2a5e', '#56397e'], eyes: 'glasses', glassC: '#f2d27a', robe: true, trim: '#f2d27a',
    body(A, by) { A.R(6, by + 1, 4, 1, '#f4eeff'); } },
  guard: { style: 'cap', hair: ['#14204a', '#24356e', '#3d55a0'], hairUnder: '#3a2a22', shirt: ['#1e2f66', '#2c4796', '#4566c0'], pants: ['#141c3a', '#1f2a52'],
    body(A, by) { A.R(4, by + 5, 8, 1, '#3a2a22'); A.R(7, by + 5, 2, 1, C.gold[1]); A.P(5, by + 2, C.gold[2]); A.R(7, by, 2, 6, '#22366e'); } },
  tea: { style: 'bandana', hair: ['#9e2b2b', '#d04545', '#ef7070'], hairUnder: ['#1e1a24', '#2e2836', '#4a4058'], shirt: ['#6b4126', '#94603a', '#b8804f'], pants: ['#3a2a22', '#4f3a2e'],
    body(A, by) { A.R(5, by + 2, 6, 5, '#f6ecd2'); A.R(5, by + 2, 6, 1, '#ffffff'); A.R(10, by + 3, 1, 4, '#d8c8a8'); A.P(7, by + 4, '#c98b52'); A.P(8, by + 4, '#c98b52'); } },
  zero: { style: 'spiky', hair: ['#145a44', '#1f8a64', '#46c08e'], shirt: ['#1d4f6b', '#2f7a9a', '#56a6c2'], pants: ['#22303e', '#33465a'], eyes: 'glasses', glassC: '#ffffff',
    body(A, by) { A.R(7, by + 2, 2, 3, '#ffd23f'); A.P(7, by + 3, '#7a5a10'); } },
  doc: { style: 'slick', hair: ['#6a6a7a', '#9a9aaa', '#c8c8d6'], shirt: ['#aeb6d0', '#eef1f8', '#ffffff'], pants: ['#4a5068', '#636a86'], eyes: 'glasses',
    body(A, by) { A.R(7, by + 2, 2, 4, '#e04848'); A.R(6, by + 3, 4, 2, '#e04848'); A.R(7, by, 2, 2, '#6fa0d8'); } },
  cook: { style: 'chef', hairUnder: ['#1e1a24', '#2e2836', '#4a4058'], hair: ['#1e1a24', '#2e2836', '#4a4058'], shirt: ['#8e2424', '#c43a3a', '#e8605a'], pants: ['#2a2430', '#3a3444'], beard: '#2e2836', wide: true,
    body(A, by) { A.R(5, by + 3, 6, 4, '#f6ecd2'); A.R(5, by + 3, 6, 1, '#ffffff'); A.P(7, by + 1, '#ffd23f'); } },
  priest: { style: 'hood', hair: ['#9c7416', '#d4a326', '#f2cf5a'], shirt: ['#b8ae94', '#e6dcc2', '#fff6de'], robe: true, trim: '#d4a326',
    body(A, by) { A.R(7, by, 2, 7, '#d4a326'); A.P(7, by + 2, '#fff6de'); } },
  webkid: { style: 'spiky', hair: ['#a8381c', '#e34c26', '#ff7a4f'], shirt: ['#1a3a9c', '#264de4', '#5578ff'], pants: ['#9a861a', '#d8bc2a'],
    body(A, by) { A.R(6, by + 2, 4, 2, '#ffffff'); A.P(6, by + 2, '#e34c26'); A.P(9, by + 3, '#d8bc2a'); },
    extra(A, y, dir) { if (dir !== 1) { A.R(1, y + 4, 2, 4, '#2a2a3a'); A.R(13, y + 4, 2, 4, '#2a2a3a'); A.R(2, y - 1, 12, 1, '#2a2a3a'); } } },
  merchant: { style: 'hat', hair: ['#4a3020', '#6b4a2b', '#8f6a40'], hairUnder: ['#2e2010', '#4a3020', '#6b4a2b'], shirt: ['#2c5c3a', '#3f7d4f', '#5ea06a'], pants: ['#3e2e22', '#55402e'], beard: '#4a3020',
    body(A, by) { A.R(4, by + 1, 1, 6, '#6b4a2b'); A.R(11, by + 1, 1, 6, '#6b4a2b'); A.R(6, by + 4, 4, 2, '#c98e57'); },
    bodySide(A, by) { A.R(9, by - 1, 5, 7, '#8a5a32'); A.R(9, by - 1, 5, 1, '#b07a48'); A.R(10, by + 2, 3, 1, '#5a3a20'); },
    bodyBack(A, by) { A.R(3, by - 1, 10, 8, '#8a5a32'); A.R(3, by - 1, 10, 1, '#b07a48'); A.R(5, by + 2, 6, 1, '#5a3a20'); A.R(7, by + 3, 2, 2, C.gold[1]); } },
  keeper: { style: 'slick', hair: ['#14121a', '#24202e', '#3c3650'], shirt: ['#2c3042', '#454b62', '#61688a'], pants: ['#1c1e2a', '#2a2d3e'], eyes: 'shades',
    body(A, by) { A.R(7, by, 2, 1, '#ffffff'); A.R(7, by + 1, 2, 4, '#c43a3a'); A.P(6, by, '#ffffff'); A.P(9, by, '#ffffff'); } },
  kidA: { style: 'short', hair: ['#2a1a10', '#4a3020', '#6b4a2b'], shirt: ['#2a7a3a', '#3fa050', '#6ac878'], pants: ['#2a3050', '#3a4470'], short: true },
  kidB: { style: 'long', hair: ['#5a1a2a', '#8a2a40', '#b04a60'], shirt: ['#b03a6a', '#e05a8a', '#ff8ab0'], pants: ['#3a2a4a', '#4a3a5e'], short: true },
  kidC: { style: 'spiky', hair: ['#5a3a10', '#8a5a1a', '#b88030'], shirt: ['#2a5ab0', '#3a7ae0', '#6aa0ff'], pants: ['#3a3020', '#504430'], short: true },
  kidD: { style: 'bun', hair: ['#1a1420', '#2a2034', '#40344e'], shirt: ['#c08a1a', '#e8b030', '#ffd860'], pants: ['#4a2a2a', '#663a3a'], short: true },
};
const CHAR_CACHE = new Map();
function charFrame(id, dir, frame, talk = 0, blink = false) {
  const flip = dir === 3, d = flip ? 2 : dir;
  const key = `${id}|${d}|${frame}|${talk}|${blink}|${flip}`;
  let c = CHAR_CACHE.get(key);
  if (!c) { c = drawPerson(CHAR[id], d, frame, talk, blink); if (flip) c = flipH(c); CHAR_CACHE.set(key, c); }
  return c;
}

/* ---------- 生物 & 特殊角色 ---------- */
const DUCK_Y = ['#c98a1a', '#ffd23f', '#fff09a'];
function makeDuck(frame = 0, talk = 0) {
  return spr(18, 22, A => {
    const {R,E,P,L}=A,b=frame?1:0;
    E(9,16+b,6.5,4.8,DUCK_Y[1]);E(4,15+b,2.3,3,DUCK_Y[1]);E(14,15+b,2.3,3,DUCK_Y[0]);
    R(5,14+b,8,6,'#e9dbb3');R(5,14+b,1,5,'#fff1ce');R(12,15+b,1,5,'#bfa983');R(7,17+b,4,2,'#d1bd96');
    R(5,20,3,1,'#d17a2c');R(11,20,3,1,'#d17a2c');R(4,21,4,1,'#9e5e2b');R(11,21,4,1,'#9e5e2b');
    E(9,8+b,6.8,6.5,DUCK_Y[1]);R(4,5+b,6,1,DUCK_Y[2]);P(3,8+b,DUCK_Y[2]);
    R(4,7+b,2,3,'#4a3430');R(11,7+b,2,3,'#4a3430');P(4,7+b,'#fff0ca');P(11,7+b,'#fff0ca');
    R(6,10+b,6,2,'#dc872c');R(7,10+b,4,1,'#ffc15f');R(7,12+b,talk?5:4,1,talk?'#8e4a2e':'#bc6d28');
    P(3,11+b,'#e8a052');P(14,11+b,'#e8a052');
    E(9,3+b,6.5,3,'#8b603e');R(4,1+b,7,1,'#b28553');R(2,4+b,13,2,'#694a34');R(2,4+b,12,1,'#a27749');L(8,1+b,11,4+b,'#5e4635');
    P(14,1+b,'#91a25c');P(15,0+b,'#b2b66b');
    R(4,13+b,10,2,'#447f73');R(5,13+b,8,1,'#81b3a0');R(10,15+b,3,2,'#4d8578');P(12,17+b,'#345e56');
  });
}
// Pond birds stay wildlife; the shopkeeper has a separate outfit and silhouette.
function makePondDuck(frame = 0, talk = 0) {
  return spr(16, 15, A => {
    const { R, E, P } = A; const y = frame ? 1 : 0;
    E(8, 10 + y, 6.5, 4.3, DUCK_Y[1]);
    E(4, 8 + y, 2, 2, DUCK_Y[1]); P(2, 7 + y, DUCK_Y[1]); P(1, 6 + y, DUCK_Y[1]);
    E(10, 4.5 + y, 3.6, 3.6, DUCK_Y[1]);
    for (let x = 3; x < 15; x++) A.T(x, 13 + y, DUCK_Y[0]); for (let x = 5; x < 13; x++) A.T(x, 14 + y, DUCK_Y[0]);
    A.T(13, 11 + y, DUCK_Y[0]); A.T(14, 10 + y, DUCK_Y[0]); A.T(12, 6 + y, DUCK_Y[0]); A.T(13, 5 + y, DUCK_Y[0]);
    R(8, 2 + y, 3, 1, DUCK_Y[2]); P(7, 3 + y, DUCK_Y[2]); R(5, 8 + y, 4, 1, DUCK_Y[2]);
    R(6, 10 + y, 5, 1, DUCK_Y[0]); P(10, 9 + y, DUCK_Y[0]); P(5, 11 + y, DUCK_Y[0]);
    R(11, 3 + y, 2, 2, C.ink); P(11, 3 + y, C.white);
    P(10, 6 + y, C.blush);
    const bk = ['#c45a10', '#ff8c2a', '#ffb060'];
    R(13, 5 + y, 3, 1, bk[1]); R(13, 4 + y, 2, 1, bk[2]);
    if (talk) { R(13, 6 + y, 3, 1, bk[0]); P(15, 7 + y, bk[0]); } else R(13, 6 + y, 2, 1, bk[0]);
    R(5, 15 - 1, 2, 1, bk[1]); R(10, 15 - 1, 2, 1, bk[1]);
  });
}
function makeChefBot(frame = 0, talk = 0, blink = false) {
  // Keep the scene's long-standing chefFrame contract; the reference is now human.
  return drawPerson(CHAR.chef, 0, frame ? 1 : 0, talk, blink);
}
function makeRunner(frame = 0, talk = 0) {
  return spr(24, 30, A => {
    const {R,E,P,L}=A,j=frame%2?-1:0,metal=['#79543a','#b88450','#edba76'];
    R(7,20,11,7,'#d7c8a4');R(7,20,2,6,'#f4e6c7');R(16,20,2,7,'#ad9a77');R(10,20,4,2,metal[1]);
    R(4,21+j,3,5,metal[1]);R(18,21-j,3,5,metal[1]);P(5,23+j,metal[2]);P(19,23-j,metal[2]);
    R(8,26,3,3-(frame%2),metal[0]);R(15,26,3,2+(frame%2),metal[0]);R(7,29-(frame%2),5,1,'#4b4540');R(14,28+(frame%2),5,1,'#4b4540');
    E(12,11+j,9.5,8.8,metal[1]);R(6,5+j,8,1,metal[2]);L(5,7+j,4,12+j,metal[2]);R(18,9+j,2,7,metal[0]);
    E(9,11+j,4.5,4.5,'#694933');E(9,11+j,3.5,3.5,'#d5a367');E(9,11+j,2.7,2.7,'#236884');P(8,9+j,'#a5e8e0');R(9,12+j,2,1,'#4caad0');
    E(17,11+j,2.4,2.7,'#584431');E(17,11+j,1.4,1.8,'#efb846');P(17,10+j,'#fff0a5');
    E(2,12+j,2,3,metal[0]);R(0,11+j,4,2,metal[1]);P(1,9+j,metal[2]);P(1,15+j,metal[2]);
    E(11,2+j,2.7,2.1,metal[1]);E(11,2+j,1.4,1,'#4c4838');R(10,4+j,3,1,metal[0]);
    for(const [x,y]of[[6,6],[16,6],[7,17],[15,17]])P(x,y+j,metal[0]);
    if(talk)R(11,17+j,3,1,'#604332');
  });
}
function makeSticky(frame = 0, talk = 0) {
  return spr(24, 24, A => {
    const {R,E,P,L}=A,y=frame?1:0;
    E(3,10-y,3,5,'#92b396');E(21,12+y,3,4,'#92b396');L(1,7-y,5,13-y,'#cfdfb5');L(19,10+y,23,14+y,'#cfdfb5');
    E(4,17+y,2,3,'#b7cca4');E(21,18-y,2,3,'#b7cca4');
    R(5,5+y,14,14,'#f2d475');R(5,5+y,14,2,'#ffe89c');R(5,18+y,14,1,'#c9a54e');
    R(16,5+y,3,3,'#b18b44');R(16,5+y,2,2,'#fbe3a1');P(15,5+y,'#e4bc61');
    R(8,10+y,2,3,'#4b3434');R(14,10+y,2,3,'#4b3434');P(8,10+y,'#fff1ca');P(14,10+y,'#fff1ca');
    P(7,14+y,'#e8a16c');P(17,14+y,'#e8a16c');R(11,14+y,talk?3:2,talk?3:1,'#a65b47');
    R(10,2+y,5,2,'#e4af4a');P(9,1+y,'#e4af4a');P(12,y,'#f6cf6b');P(15,1+y,'#e4af4a');R(10,4+y,5,1,'#a97b38');
    R(8,19+y,2,3-y,'#e4af4a');R(14,19+y,2,3-y,'#e4af4a');P(8,22,'#c18c38');P(15,22,'#c18c38');
  });
}
function makeBug() {
  return spr(16, 16, A => {
    const {R,E,P,L}=A;
    R(0,12,16,4,'#657d59');R(1,13,14,2,'#dbc89d');R(3,14,11,1,'#af9b77');R(9,12,2,4,'#405b54');
    E(8,9,5.5,4,'#7e9d58');E(8,7,5,5,'#91ad64');E(8,10,3,2.5,'#c7cf8e');
    L(4,4,3,1,'#718c4e');L(11,4,12,1,'#718c4e');P(2,0,'#b7c17a');P(12,0,'#b7c17a');
    for(const x of [4,11]){E(x,7,3.2,3.1,'#bb9454');E(x,7,2.5,2.3,'#f2df9e');E(x,7,1.7,1.8,'#314d42');P(x-1,6,'#e5edd0');P(x,8,'#76a68c');}
    R(7,6,2,1,'#b28c4e');P(7,10,'#aa7054');P(8,10,'#aa7054');P(3,10,'#acbf79');P(12,10,'#acbf79');
  });
}
// 大 Bug 魔王：64×56，4 帧
function makeBoss(frame = 0, hurt = false) {
  return spr(64, 56, A => {
    const { R, E, P } = A;
    const u = hurt ? ['#ffffff', '#ffffff', '#ffffff', '#ffffff'] : ['#2a0f5a', '#4a1a9e', '#7b2cff', '#b07aff'];
    const t = frame * Math.PI / 2;
    // 触手
    for (let k = 0; k < 4; k++) {
      const bx = [10, 22, 42, 54][k], ph = t + k * 1.3;
      for (let i = 0; i < 12; i++) { const x = bx + Math.sin(ph + i * .5) * 2.5 * (i / 12), y = 40 + i; E(x, y, 3 - i * .18, 1.2, i > 8 ? u[0] : u[1]); }
    }
    // 身体
    E(32, 30, 26, 19, u[1]); E(32, 27, 24, 16, u[2]);
    for (let y = 8; y < 50; y++) for (let x = 4; x < 60; x++) { if (A.G(x, y) !== u[2]) continue; const n = hash2(x >> 1, y >> 1, 9); if (x + y < 42 && n > .4) A.P(x, y, u[3]); else if (n > .9) A.P(x, y, u[1]); }
    // 角
    for (let i = 0; i < 9; i++) { R(12 - i * .3, 12 - i, 4 - i * .35, 1, i > 5 ? '#ffd0f0' : '#e8d8ff'); R(48 + i * .3, 12 - i, 4 - i * .35, 1, i > 5 ? '#ffd0f0' : '#e8d8ff'); }
    // 眼睛
    const blink = frame === 3 && !hurt;
    [[21, 24], [43, 24]].forEach(([x, y]) => {
      if (blink) { R(x - 5, y, 10, 2, '#1a0a2a'); return; }
      E(x, y, 6, 5, '#1a0a2a'); E(x, y, 4.5, 3.6, hurt ? '#ffffff' : '#ff2f7a'); E(x + 1, y, 2, 2.5, '#ffe0f0'); P(x - 2, y - 2, '#ffffff');
    });
    R(27, 19, 10, 1, '#1a0a2a');
    // 嘴
    E(32, 38, 12, 5, '#1a0a2a');
    for (let i = 0; i < 7; i++) { const x = 22 + i * 3; R(x, 34, 2, 2 + (i % 2), '#fff0f8'); R(x + 1, 41, 2, 2 - (i % 2), '#fff0f8'); }
    // 故障像素
    for (let i = 0; i < 14; i++) { const x = (hash2(i, frame, 3) * 60) | 0, y = (hash2(i, frame, 5) * 50) | 0; if (A.G(x, y)) A.P(x, y, pick(['#22e6d0', '#ff2fa0', '#ffffff'])); }
  });
}
// 字体/图标会用到的小图形
function makeHeart(full = true) {
  return spr(9, 8, A => { const c = full ? ['#a8203a', '#ff3b6b', '#ffa0b8'] : ['#3a2a44', '#4e3a5c', '#6a5478'];
    A.R(1, 0, 3, 1, c[1]); A.R(5, 0, 3, 1, c[1]); A.R(0, 1, 9, 3, c[1]); A.R(1, 4, 7, 1, c[1]); A.R(2, 5, 5, 1, c[1]); A.R(3, 6, 3, 1, c[1]); A.P(4, 7, c[1]);
    A.P(1, 1, c[2]); A.P(2, 1, c[2]); A.P(1, 2, c[2]); A.R(6, 3, 2, 1, c[0]); A.R(4, 6, 2, 1, c[0]); });
}
