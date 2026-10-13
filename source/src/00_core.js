/* ============================================================
 * 00 核心：工具函数、画布缩放、输入
 * ============================================================ */
const $ = s => document.querySelector(s);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a = 1, b) => b === undefined ? Math.random() * a : a + Math.random() * (b - a);
const irand = (a, b) => Math.floor(rand(a, b + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const wait = ms => new Promise(r => setTimeout(r, ms));
const easeOut = t => 1 - (1 - t) * (1 - t);
const easeInOut = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const easeOutBack = t => { const c = 1.70158, d = c + 1; return 1 + d * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

function hash2(x, y, s = 0) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function vnoise(x, y, s = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s), c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}
const fbm = (x, y, s = 0) => vnoise(x, y, s) * .6 + vnoise(x * 2.1, y * 2.1, s + 7) * .3 + vnoise(x * 4.3, y * 4.3, s + 13) * .1;
function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/* ---------- 颜色 ---------- */
const RGB_CACHE = new Map();
function hex2rgb(h) {
  let v = RGB_CACHE.get(h);
  if (!v) { const n = parseInt(h.slice(1, 7), 16); v = [n >> 16 & 255, n >> 8 & 255, n & 255]; RGB_CACHE.set(h, v); }
  return v;
}
const rgb2hex = (r, g, b) => '#' + ((1 << 24) | (clamp(Math.round(r), 0, 255) << 16) | (clamp(Math.round(g), 0, 255) << 8) | clamp(Math.round(b), 0, 255)).toString(16).slice(1);
function mix(a, b, t) { const A = hex2rgb(a), B = hex2rgb(b); return rgb2hex(lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t)); }
function shade(c, f) { const A = hex2rgb(c); return rgb2hex(A[0] * f, A[1] * f, A[2] * f); }
const rgba = (c, a) => { const A = hex2rgb(c); return `rgba(${A[0]},${A[1]},${A[2]},${a})`; };
function makeCanvas(w, h) {
  const c = document.createElement('canvas'); c.width = Math.max(1, w | 0); c.height = Math.max(1, h | 0);
  const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return [c, x];
}
function flipH(src) { const [c, x] = makeCanvas(src.width, src.height); x.translate(src.width, 0); x.scale(-1, 1); x.drawImage(src, 0, 0); return c; }

/* ---------- 画布 & 缩放 ---------- */
const cv = $('#game');
let ctx = cv.getContext('2d');
let VW = 480, VH = 270, SCALE = 1, PORTRAIT = false, TOUCH = false;
const resizeHooks = [];
function resize() {
  const w = window.innerWidth, h = window.innerHeight, dpr = window.devicePixelRatio || 1;
  PORTRAIT = h > w * 1.08;
  // 先按设备像素取整数倍放大（像素最清楚），再让画面尽量铺满屏幕
  const W = w * dpr, H = h * dpr, base = PORTRAIT ? [270, 480] : [480, 270], lim = PORTRAIT ? [260, 360, 400, 720] : [420, 600, 250, 340];
  let k = Math.floor(Math.min(W / base[0], H / base[1])), s = 1;
  if (k >= 1) { VW = clamp(Math.floor(W / k), lim[0], lim[1]); VH = clamp(Math.floor(H / k), lim[2], lim[3]); s = k / dpr; if (VW * s < w * .85 && VH * s < h * .85) k = 0; }
  if (k < 1) {
    if (PORTRAIT) { VW = 270; VH = clamp(Math.round(270 * h / w), lim[2], lim[3]); } else { VH = 270; VW = clamp(Math.round(270 * w / h), lim[0], lim[1]); }
    s = Math.min(w / VW, h / VH);
  }
  if (VW * s > w + .5 || VH * s > h + .5) s = Math.min(w / VW, h / VH);
  SCALE = s;
  cv.width = VW; cv.height = VH;
  cv.style.width = (VW * s) + 'px'; cv.style.height = (VH * s) + 'px';
  ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = false;
  resizeHooks.forEach(f => f());
}

/* ---------- 输入 ---------- */
const Input = {
  held: { up: false, down: false, left: false, right: false, ok: false, run: false },
  pressed: new Set(),
  pointer: { x: -1, y: -1, click: null, moved: false },
  device: 'kb',
  hit(a) { if (this.pressed.has(a)) { this.pressed.delete(a); return true; } return false; },
  endFrame() { this.pressed.clear(); this.pointer.click = null; this.pointer.moved = false; },
};
const KEYS = {
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  Space: 'ok', Enter: 'ok', NumpadEnter: 'ok', KeyZ: 'ok', KeyJ: 'ok',
  Escape: 'back', KeyX: 'back', KeyK: 'back', Backspace: 'back',
  KeyC: 'note', Tab: 'note', KeyM: 'mute', ShiftLeft: 'run', ShiftRight: 'run',
};
window.addEventListener('keydown', e => {
  if (e.target && e.target.tagName === 'INPUT') return;
  const a = KEYS[e.code]; if (!a) return;
  e.preventDefault();
  Input.device = 'kb';
  if (!e.repeat) Input.pressed.add(a);
  Input.held[a] = true;
  Audio.unlock();
});
window.addEventListener('keyup', e => { const a = KEYS[e.code]; if (a) Input.held[a] = false; });
window.addEventListener('blur', () => { for (const k in Input.held) Input.held[k] = false; });
function toGame(e) { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * VW, y: (e.clientY - r.top) / r.height * VH }; }
cv.addEventListener('pointermove', e => { const p = toGame(e); Input.pointer.x = p.x; Input.pointer.y = p.y; Input.pointer.moved = true; if (e.pointerType === 'mouse') Input.device = 'mouse'; });
cv.addEventListener('pointerdown', e => {
  const p = toGame(e); Input.pointer.x = p.x; Input.pointer.y = p.y; Input.pointer.click = p;
  Input.device = e.pointerType === 'mouse' ? 'mouse' : 'touch';
  if (e.pointerType !== 'mouse') TOUCH = true;
  Audio.unlock();
});
cv.addEventListener('contextmenu', e => e.preventDefault());
// iPhone 只认 touchend / click 这类"真正的点击"来解锁声音，多挂几个保险
['touchend', 'click', 'pointerup', 'keydown'].forEach(ev => window.addEventListener(ev, () => Audio.unlock(), { passive: true }));
document.addEventListener('visibilitychange', () => { if (!document.hidden) Audio.unlock(); });

/* 触屏按键 */
function setupTouch() {
  const box = $('#touch');
  document.querySelectorAll('#touch [data-k]').forEach(b => {
    const k = b.dataset.k;
    const on = e => { e.preventDefault(); TOUCH = true; Input.device = 'touch'; Input.held[k] = true; Input.pressed.add(k); b.classList.add('on'); try { b.setPointerCapture(e.pointerId); } catch (_) {} Audio.unlock(); };
    const off = () => { Input.held[k] = false; b.classList.remove('on'); };
    b.addEventListener('pointerdown', on);
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => b.addEventListener(ev, off));
    b.addEventListener('contextmenu', e => e.preventDefault());
  });
  if (matchMedia('(pointer:coarse)').matches) TOUCH = true;
  return box;
}
