/* ============================================================
 * 10 声音：芯片音乐合成器 + 音效
 * ============================================================ */
const Audio = (() => {
  let ac = null, comp, master, musicBus, sfxBus, verb, verbSend, delay, leadSend, noiseBuf;
  let musicOn = true, sfxOn = true, duckT = 0;
  const waves = {};
  let cur = null, want = '';

  function impulse(sec, decay) {
    const len = ac.sampleRate * sec, b = ac.createBuffer(2, len, ac.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
    return b;
  }
  function pulse(d) {
    const n = 48, re = new Float32Array(n), im = new Float32Array(n);
    for (let k = 1; k < n; k++) re[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * d);
    return ac.createPeriodicWave(re, im);
  }
  function init() {
    if (ac) return true;
    try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; return false; }
    comp = ac.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3.5; comp.attack.value = .004; comp.release.value = .2;
    master = ac.createGain(); master.gain.value = .85; comp.connect(master); master.connect(ac.destination);
    musicBus = ac.createGain(); musicBus.gain.value = musicOn ? .5 : 0; musicBus.connect(comp);
    sfxBus = ac.createGain(); sfxBus.gain.value = sfxOn ? .75 : 0; sfxBus.connect(comp);
    verb = ac.createConvolver(); verb.buffer = impulse(2.4, 2.8);
    verbSend = ac.createGain(); verbSend.gain.value = .2; verbSend.connect(verb); verb.connect(comp);
    delay = ac.createDelay(1); delay.delayTime.value = .32;
    const fb = ac.createGain(); fb.gain.value = .3; const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600;
    delay.connect(lp); lp.connect(fb); fb.connect(delay);
    const dw = ac.createGain(); dw.gain.value = .32; lp.connect(dw); dw.connect(musicBus);
    leadSend = ac.createGain(); leadSend.gain.value = .6; leadSend.connect(delay);
    waves.p12 = pulse(.125); waves.p25 = pulse(.25); waves.p50 = pulse(.5);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    setInterval(tick, 25);
    return true;
  }
  // 手机浏览器会在切后台、来电、锁屏后把声音挂起：每次点击/按键都试着恢复，恢复后接着放该放的曲子
  function unlock() {
    if (!init()) return;
    if (ac.state !== 'running') { try { const r = ac.resume(); if (r && r.then) r.then(sync, () => {}); } catch (e) {} }
    sync();
  }
  function sync() { if (ac && ac.state === 'running' && (cur ? cur.name : '') !== want) start(want); }

  /* ---------- 发声单元 ---------- */
  function osc(dest, { wave = 'p25', f, t, d, v = .2, a = .005, r = .08, vib = 0, slide = 0, send = 0, lead = false }) {
    const o = ac.createOscillator();
    if (waves[wave]) o.setPeriodicWave(waves[wave]); else o.type = wave;
    o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f * slide), t + d);
    const g = ac.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + a);
    g.gain.exponentialRampToValueAtTime(Math.max(.0001, v * .55), t + Math.max(a + .01, d * .7));
    g.gain.linearRampToValueAtTime(0, t + d + r);
    if (vib) {
      const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = 5.2; lg.gain.value = f * vib;
      l.connect(lg); lg.connect(o.frequency); l.start(t + .1); l.stop(t + d + r + .02);
    }
    o.connect(g); g.connect(dest);
    if (send) { const s = ac.createGain(); s.gain.value = send; g.connect(s); s.connect(verbSend); }
    if (lead) g.connect(leadSend);
    o.start(t); o.stop(t + d + r + .03);
  }
  function noise(dest, { t, d, v = .2, type = 'highpass', f = 6000, q = .8, f2 = 0 }) {
    const s = ac.createBufferSource(); s.buffer = noiseBuf;
    const fl = ac.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q;
    if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + d);
    const g = ac.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    s.connect(fl); fl.connect(g); g.connect(dest);
    s.start(t, Math.random() * .5); s.stop(t + d + .02);
  }
  function kick(dest, t, v = .7) {
    const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine';
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + .12);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + .22);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + .25);
  }

  /* ---------- 乐谱 ---------- */
  const NOTE_IDX = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function midi(n) { const m = /^([A-G])([#b]?)(-?\d)$/.exec(n); if (!m) return null; return NOTE_IDX[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (+m[3] + 1) * 12; }
  const freq = m => 440 * Math.pow(2, (m - 69) / 12);
  const CHORD = { '': [0, 4, 7], m: [0, 3, 7], maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10], '7': [0, 4, 7, 10], sus: [0, 5, 7], dim: [0, 3, 6] };
  function chord(sym) { const m = /^([A-G][#b]?)(.*)$/.exec(sym); const root = midi(m[1] + '3'); return { root, iv: CHORD[m[2]] || CHORD[''] }; }
  function parseMel(str, unit) {
    const ev = []; let step = 0;
    for (const tok of str.replace(/\|/g, ' ').trim().split(/\s+/)) {
      const [n, l] = tok.split(':'); const len = (l ? +l : 1) * unit;
      if (n !== '.') ev.push({ step, m: midi(n), len });
      step += len;
    }
    return { ev, total: step };
  }
  function build(S) {
    const SPB = 16, chords = S.chords.split(/\s+/).map(chord), total = chords.length * SPB, by = Array.from({ length: total }, () => []);
    const add = (step, e) => by[((step % total) + total) % total].push(e);
    if (S.mel) { const { ev } = parseMel(S.mel, 2); ev.forEach(e => add(e.step, { k: 'lead', m: e.m, len: e.len })); }
    if (S.mel2) { const { ev } = parseMel(S.mel2, 2); ev.forEach(e => add(e.step, { k: 'lead2', m: e.m, len: e.len })); }
    chords.forEach((c, bi) => {
      const b0 = bi * SPB, R = c.root - 12;
      if (S.bass === 'bounce') [[0, 0, 3], [4, 12, 2], [6, 7, 2], [8, 0, 3], [12, 12, 2], [14, 7, 2]].forEach(([s, o, l]) => add(b0 + s, { k: 'bass', m: R + o, len: l }));
      else if (S.bass === 'drive') for (let s = 0; s < 16; s += 2) add(b0 + s, { k: 'bass', m: R + (s % 4 ? 12 : 0), len: 2 });
      else if (S.bass === 'hold') { add(b0, { k: 'bass', m: R, len: 12 }); add(b0 + 12, { k: 'bass', m: R + 7, len: 4 }); }
      else if (S.bass === 'drone') add(b0, { k: 'bass', m: R, len: 16 });
      if (S.arp) {
        const tones = c.iv.map(i => c.root + 12 + i); const seq = tones.concat(tones.slice(1, -1).reverse());
        const every = S.arp === 'slow' ? 4 : 2;
        for (let s = 0, j = 0; s < 16; s += every, j++) add(b0 + s, { k: 'arp', m: seq[j % seq.length] + (S.arpUp || 0), len: every });
      }
      if (S.pad) add(b0, { k: 'pad', ms: c.iv.map(i => c.root + 12 + i), len: 16 });
      const D = S.drums;
      if (D === 'basic') for (let s = 0; s < 16; s += 2) { if (s === 0 || s === 8 || s === 10) add(b0 + s, { k: 'kick' }); if (s === 4 || s === 12) add(b0 + s, { k: 'snare' }); add(b0 + s, { k: 'hat', v: s % 4 ? .05 : .09 }); }
      else if (D === 'drive') for (let s = 0; s < 16; s++) { if (s % 4 === 0) add(b0 + s, { k: 'kick' }); if (s === 4 || s === 12) add(b0 + s, { k: 'snare' }); add(b0 + s, { k: 'hat', v: s % 2 ? .04 : .08 }); }
      else if (D === 'soft') { add(b0, { k: 'kick', v: .35 }); for (let s = 0; s < 16; s += 4) add(b0 + s + 2, { k: 'hat', v: .045 }); }
    });
    return { ...S, by, total, stepDur: 60 / S.bpm / 4 };
  }
  const SONGS = {
    title: build({ bpm: 84, chords: 'Fmaj7 Em7 Dm7 Cmaj7 Fmaj7 Em7 Dm7 G', bass: 'hold', arp: 'fast', drums: 'soft', lw: 'p50', lv: .11,
      mel: 'A5:3 C6 A5:2 G5:2 | G5:4 E5:4 | F5:3 A5 F5:2 E5:2 | E5:6 .:2 | A5:3 C6 A5:2 C6:2 | B5:4 G5:4 | A5:2 G5:2 F5:2 E5:2 | D5:6 .:2' }),
    village: build({ bpm: 116, chords: 'C Am F G C Am F G F G Em Am F G C C', bass: 'bounce', arp: 'fast', drums: 'basic', lw: 'p25', lv: .12,
      mel: 'E5:2 G5 E5 D5:2 C5:2 | C5:2 E5 A5 G5:4 | A5:2 G5 F5 E5:2 F5:2 | D5:2 E5 F5 G5:4 | E5:2 G5 E5 D5:2 C5:2 | C5:2 E5 A5 B5:2 C6:2 | A5:2 G5 F5 D5:2 E5 F5 | E5:2 D5:2 C5:4 | A4 C5 F5:2 E5 F5 G5:2 | B4 D5 G5:2 F5 G5 A5:2 | G5:2 E5:2 B4:2 E5:2 | C5 D5 E5:2 A5:4 | A5:2 G5 A5 C6:2 A5:2 | G5:2 F5 E5 D5:4 | E5 G5 C6:2 B5 A5 G5:2 | C6:4 .:4' }),
    dark: build({ bpm: 72, chords: 'Am F Dm E Am F Dm E', bass: 'drone', arp: 'slow', arpUp: 12, drums: '', lw: 'p12', lv: .08, pad: true,
      mel: 'E5:4 .:4 | C5:4 .:4 | D5:4 F5:2 E5:2 | B4:8 | A4:4 .:2 C5 B4 | A4:4 .:4 | F5:4 E5:2 D5:2 | E5:8' }),
    battle: build({ bpm: 152, chords: 'Am F G E Am F Dm E', bass: 'drive', arp: 'fast', drums: 'drive', lw: 'p25', lv: .12,
      mel: 'A4 A4 C5 A4 E5:2 D5 C5 | C5 C5 F5 C5 A5:2 G5 F5 | D5 D5 G5 D5 B5:2 A5 G5 | G#5:2 B5:2 E6:2 D6 B5 | A5:2 E5 A5 C6:2 B5 A5 | F5:2 C5 F5 A5:2 G5 F5 | D5:2 F5 A5 G5 F5 E5 D5 | E5:2 G#5:2 B5:2 E5:2' }),
    dawn: build({ bpm: 96, chords: 'F G Em Am F G C C', bass: 'bounce', arp: 'fast', drums: 'soft', lw: 'p50', lv: .11,
      mel: 'A5:2 C6:2 G5:2 E5:2 | F5:2 D5 E5 F5:2 G5:2 | E5:2 G5:2 B5:2 G5:2 | A5:6 .:2 | A5:2 C6:2 G5:2 E5:2 | F5:2 E5 D5 B4:2 D5:2 | C5:2 E5 G5 C6:4 | C6:6 .:2' }),
    story: build({ bpm: 72, chords: 'Am F C G Am F E E', bass: 'drone', arp: 'slow', arpUp: 12, drums: 'soft', pad: true, lw: 'p50', lv: .09,
      mel: 'E5:4 C5:4 | A4:6 .:2 | G4:4 C5:4 | D5:6 .:2 | E5:4 A5:4 | F5:6 E5:2 | E5:4 G#4:4 | B4:6 .:2' }),
    lab: build({ bpm: 104, chords: 'Dm Bb F C Dm Bb Gm A', bass: 'bounce', arp: 'fast', drums: 'soft', lw: 'p50', lv: .1, pad: true,
      mel: 'A5:2 F5 A5 D6:2 C6:2 | Bb5:2 A5 G5 F5:4 | A5:2 C6 A5 G5:2 F5:2 | E5:2 G5:2 C6:4 | A5:2 F5 A5 D6:2 E6:2 | F6:2 E6 D6 Bb5:4 | A5 G5 F5 G5 A5:2 Bb5:2 | A5:4 C#6:4' }),
    night: build({ bpm: 86, chords: 'Am7 Dm7 G7 Cmaj7 Fmaj7 Bm7 E7 Am7', bass: 'hold', arp: 'fast', drums: 'soft', lw: 'p50', lv: .1,
      mel: 'E5:3 G5 A5:2 C6:2 | A5:6 .:2 | D5:3 F5 G5:2 B5:2 | G5:6 .:2 | F5:2 A5:2 C6:2 E6:2 | D6:4 B5:4 | G#5:2 B5:2 D6:2 C6:2 | A5:6 .:2' }),
    launch: build({ bpm: 132, chords: 'C G Am F C G F G', bass: 'drive', arp: 'fast', drums: 'basic', lw: 'p25', lv: .12,
      mel: 'G5:2 C6:2 G5 E5 G5:2 | D6:2 B5 G5 D6:2 B5:2 | C6:2 A5 E5 A5:2 C6:2 | F5:2 A5 C6 F6:4 | E6:2 D6 C6 G5:2 C6:2 | D6:2 B5 G5 D6:4 | C6 A5 F5 A5 C6:2 F6:2 | D6:2 E6 F6 G6:4' }),
    final: build({ bpm: 164, chords: 'Dm Bb C A Dm Bb Gm A', bass: 'drive', arp: 'fast', drums: 'drive', lw: 'p25', lv: .12,
      mel: 'D5 D5 F5 D5 A5:2 G5 F5 | D5 D5 F5 D5 Bb5:2 A5 G5 | E5 E5 G5 E5 C6:2 Bb5 A5 | C#6:2 E6:2 A6:2 G6 E6 | D6:2 A5 D6 F6:2 E6 D6 | Bb5:2 F5 Bb5 D6:2 C6 Bb5 | G5:2 Bb5 D6 C6 Bb5 A5 G5 | A5:2 C#6:2 E6:2 A5:2' }),
  };

  function schedule(e, t, S, out) {
    const sd = S.stepDur;
    switch (e.k) {
      case 'lead': osc(out, { wave: S.lw, f: freq(e.m), t, d: e.len * sd * .92, v: S.lv, vib: .006, send: .7, lead: true }); break;
      case 'lead2': osc(out, { wave: 'p12', f: freq(e.m), t, d: e.len * sd * .9, v: S.lv * .6, send: .5 }); break;
      case 'arp': osc(out, { wave: 'p12', f: freq(e.m), t, d: e.len * sd * .8, v: .045, r: .03, send: .5 }); break;
      case 'bass': osc(out, { wave: 'triangle', f: freq(e.m), t, d: e.len * sd * .9, v: .28, r: .04 }); break;
      case 'pad': e.ms.forEach(m => osc(out, { wave: 'sine', f: freq(m), t, d: e.len * sd, v: .035, a: .4, r: .5, send: 1 })); break;
      case 'kick': kick(out, t, e.v || .55); break;
      case 'snare': noise(out, { t, d: .14, v: .22, type: 'bandpass', f: 1800, q: .7 }); osc(out, { wave: 'triangle', f: 190, t, d: .06, v: .15, slide: .5 }); break;
      case 'hat': noise(out, { t, d: .04, v: e.v || .06, type: 'highpass', f: 7500 }); break;
    }
  }
  function tick() {
    if (!ac || ac.state !== 'running') return;
    sync();
    if (!cur) { if (duckT && ac.currentTime > duckT) { duckT = 0; musicBus.gain.setTargetAtTime(musicOn ? .5 : 0, ac.currentTime, .3); } return; }
    const S = cur.S;
    // 页面卡顿或挂起后，不补放落下的音符，直接从现在接着往下放
    if (cur.t < ac.currentTime - .25) { const n = Math.ceil((ac.currentTime - cur.t) / S.stepDur); cur.step = (cur.step + n) % S.total; cur.t += n * S.stepDur; }
    while (cur.t < ac.currentTime + .14) {
      for (const e of S.by[cur.step]) schedule(e, cur.t, S, cur.g);
      cur.t += S.stepDur; cur.step = (cur.step + 1) % S.total;
    }
    if (duckT && ac.currentTime > duckT) { duckT = 0; musicBus.gain.setTargetAtTime(musicOn ? .5 : 0, ac.currentTime, .3); }
  }
  function play(name, fade = .8) {
    want = SONGS[name] ? name : '';
    if (!ac || ac.state !== 'running') { if (ac) { try { ac.resume(); } catch (e) {} } return; }
    start(want, fade);
  }
  function start(name, fade = .8) {
    if ((cur ? cur.name : '') === name) return;
    const now = ac.currentTime;
    if (cur) { const g = cur.g; g.gain.cancelScheduledValues(now); g.gain.setValueAtTime(g.gain.value, now); g.gain.linearRampToValueAtTime(0, now + fade); setTimeout(() => g.disconnect(), (fade + .5) * 1000); cur = null; }
    if (!name || !SONGS[name]) return;
    const g = ac.createGain(); g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(1, now + fade * .6); g.connect(musicBus); g.connect(verbSend);
    cur = { name, S: SONGS[name], g, step: 0, t: now + .06 };
  }
  function duck(sec) { if (!ac) return; musicBus.gain.setTargetAtTime(musicOn ? .12 : 0, ac.currentTime, .05); duckT = ac.currentTime + sec; }

  /* ---------- 音效 ---------- */
  const SFX = {
    blip(v = 0) { const t = ac.currentTime; osc(sfxBus, { wave: v < 0 ? 'p50' : 'p25', f: 300 + (v + 4) * 55 + Math.random() * 20, t, d: .025, v: .07, r: .02 }); },
    move() { const t = ac.currentTime; osc(sfxBus, { wave: 'p25', f: 880, t, d: .025, v: .06, r: .02 }); },
    select() { const t = ac.currentTime; osc(sfxBus, { wave: 'p25', f: 660, t, d: .04, v: .08 }); osc(sfxBus, { wave: 'p25', f: 1320, t: t + .045, d: .06, v: .08 }); },
    back() { const t = ac.currentTime; osc(sfxBus, { wave: 'p25', f: 520, t, d: .04, v: .07 }); osc(sfxBus, { wave: 'p25', f: 330, t: t + .045, d: .06, v: .07 }); },
    ok() { const t = ac.currentTime; [784, 988, 1175, 1568].forEach((f, i) => osc(sfxBus, { wave: 'p25', f, t: t + i * .055, d: .09, v: .09, send: .4 })); },
    bad() { const t = ac.currentTime; osc(sfxBus, { wave: 'sawtooth', f: 220, t, d: .12, v: .1, slide: .8 }); osc(sfxBus, { wave: 'sawtooth', f: 165, t: t + .1, d: .22, v: .1, slide: .7 }); },
    card() { duck(1.6); const t = ac.currentTime; [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => osc(sfxBus, { wave: i < 4 ? 'p25' : 'p50', f, t: t + i * .085, d: i === 6 ? .5 : .1, v: .1, send: .6, vib: i === 6 ? .01 : 0 })); },
    jingle() { duck(2.4); const t = ac.currentTime; const n = [[784, 0, .12], [784, .13, .12], [784, .26, .12], [1047, .4, .5], [988, .95, .15], [1047, 1.12, .7]]; n.forEach(([f, d, l]) => { osc(sfxBus, { wave: 'p25', f, t: t + d, d: l, v: .1, send: .6 }); osc(sfxBus, { wave: 'triangle', f: f / 2, t: t + d, d: l, v: .12 }); }); },
    wall() { const t = ac.currentTime; for (let i = 0; i < 10; i++) osc(sfxBus, { wave: 'p12', f: 200 + Math.random() * 1400, t: t + i * .03, d: .05, v: .06 }); noise(sfxBus, { t, d: .5, v: .15, type: 'bandpass', f: 3000, f2: 300 }); },
    step() { const t = ac.currentTime; noise(sfxBus, { t, d: .05, v: .035, type: 'lowpass', f: 900 }); },
    hit() { const t = ac.currentTime; kick(sfxBus, t, .9); noise(sfxBus, { t, d: .25, v: .3, type: 'lowpass', f: 3000, f2: 200 }); osc(sfxBus, { wave: 'p50', f: 880, t, d: .2, v: .1, slide: .25 }); },
    hurt() { const t = ac.currentTime; osc(sfxBus, { wave: 'sawtooth', f: 400, t, d: .3, v: .12, slide: .3 }); noise(sfxBus, { t, d: .2, v: .18, type: 'bandpass', f: 1200 }); },
    roar() { const t = ac.currentTime; osc(sfxBus, { wave: 'sawtooth', f: 90, t, d: .9, v: .2, slide: .6, vib: .05 }); osc(sfxBus, { wave: 'p12', f: 140, t, d: .9, v: .1, slide: .5 }); noise(sfxBus, { t, d: .9, v: .2, type: 'lowpass', f: 800, f2: 150 }); },
    door() { duck(2); const t = ac.currentTime; for (let i = 0; i < 14; i++) osc(sfxBus, { wave: 'p50', f: 400 * Math.pow(1.122, i), t: t + i * .06, d: .25, v: .06, send: 1 }); },
    key() { const t = ac.currentTime; noise(sfxBus, { t, d: .03, v: .08, type: 'highpass', f: 3000 }); },
    robo() { const t = ac.currentTime; osc(sfxBus, { wave: 'p25', f: 520 + Math.random() * 200, t, d: .05, v: .06 }); },
    quack() { const t = ac.currentTime; osc(sfxBus, { wave: 'p25', f: 700, t, d: .09, v: .08, slide: .6 }); osc(sfxBus, { wave: 'p12', f: 720, t: t + .1, d: .1, v: .06, slide: .55 }); },
    chirp() { const t = ac.currentTime; const b = 2200 + Math.random() * 800; for (let i = 0; i < 3; i++) osc(sfxBus, { wave: 'sine', f: b, t: t + i * .09, d: .05, v: .025, slide: 1.4, send: .8 }); },
    warp() { const t = ac.currentTime; osc(sfxBus, { wave: 'p12', f: 100, t, d: 2.2, v: .12, slide: 30, vib: .02 }); noise(sfxBus, { t, d: 2.2, v: .2, type: 'bandpass', f: 400, f2: 8000 }); },
    glitch() { const t = ac.currentTime; for (let i = 0; i < 6; i++) osc(sfxBus, { wave: 'p12', f: 100 + Math.random() * 2000, t: t + i * .025, d: .03, v: .05 }); },
    open() { const t = ac.currentTime; osc(sfxBus, { wave: 'p50', f: 392, t, d: .06, v: .07 }); osc(sfxBus, { wave: 'p50', f: 587, t: t + .06, d: .08, v: .07 }); },
    app() { duck(2.6); const t = ac.currentTime; [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => { osc(sfxBus, { wave: 'p50', f, t: t + i * .07, d: .3, v: .08, send: .8 }); }); osc(sfxBus, { wave: 'triangle', f: 262, t, d: 1, v: .12 }); },
    ach() { const t = ac.currentTime; [1175, 1568, 2093].forEach((f, i) => osc(sfxBus, { wave: 'p12', f, t: t + i * .09, d: .2, v: .07, send: .9 })); },
    tick() { const t = ac.currentTime; osc(sfxBus, { wave: 'p50', f: 1600, t, d: .02, v: .04 }); },
    combo(n = 1) { const t = ac.currentTime; osc(sfxBus, { wave: 'p25', f: 660 * Math.pow(1.06, Math.min(n, 12)), t, d: .08, v: .08 }); osc(sfxBus, { wave: 'p25', f: 990 * Math.pow(1.06, Math.min(n, 12)), t: t + .06, d: .1, v: .08 }); },
    rocket() { const t = ac.currentTime; noise(sfxBus, { t, d: 3, v: .35, type: 'lowpass', f: 300, f2: 2400 }); osc(sfxBus, { wave: 'sawtooth', f: 60, t, d: 3, v: .12, slide: 4 }); },
    boom() { const t = ac.currentTime; kick(sfxBus, t, 1); noise(sfxBus, { t, d: 1.2, v: .4, type: 'lowpass', f: 1200, f2: 80 }); },
    fog() { const t = ac.currentTime; noise(sfxBus, { t, d: 1.5, v: .12, type: 'bandpass', f: 500, f2: 200 }); },
  };
  function sfx(name, ...args) { if (!ac || ac.state !== 'running' || !sfxOn || !SFX[name]) return; SFX[name](...args); }
  return {
    unlock, play, sfx, get ready() { return !!ac && ac.state === 'running'; },
    get music() { return musicOn; }, get effects() { return sfxOn; },
    setMusic(on) { musicOn = on; if (musicBus) musicBus.gain.setTargetAtTime(on ? .5 : 0, ac.currentTime, .1); },
    setSfx(on) { sfxOn = on; if (sfxBus) sfxBus.gain.setTargetAtTime(on ? .75 : 0, ac.currentTime, .05); },
    get song() { return cur ? cur.name : want; },
  };
})();
