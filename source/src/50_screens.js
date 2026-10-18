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
  const ol = solidCopy('#132e36'); for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2], [-2, -2], [2, 2], [-2, 2], [2, -2]]) x.drawImage(ol, dx, dy);
  const ol2 = solidCopy('#6d8b87'); for (const [dx, dy] of [[0, 2], [1, 2], [-1, 2]]) x.drawImage(ol2, dx, dy);
  // 渐变填充
  tx.clearRect(0, 0, W, H); tx.globalCompositeOperation = 'source-over'; tx.drawImage(a, 0, 0, w, h, 4, 4, w * scale, h * scale); tx.globalCompositeOperation = 'source-in';
  const gr = tx.createLinearGradient(0, 4, 0, 4 + 12 * scale); gr.addColorStop(0, '#fff8de'); gr.addColorStop(.45, '#f1e5c5'); gr.addColorStop(.5, '#d4d9bb'); gr.addColorStop(1, '#b3cec0');
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
  update(dt) {
    this.t+=dt;const pressed=Input.hit('ok')||Input.pointer.click||Input.hit('back');
    if(this.ready()&&pressed){Audio.unlock();closeScreen(this);}
    else if(pressed&&ART_STATUS.errors.length&&!this.retrying){this.retrying=true;loadStoryArt().finally(()=>{this.retrying=false;});}
  }
  draw(g) {
    g.fillStyle = '#091c26'; g.fillRect(0, 0, VW, VH);
    const im = xaFrame(Math.floor(this.t * 3) % 2, 0, 'happy'); g.drawImage(im, Math.round(VW / 2 - 16), Math.round(VH / 2 - 48), 32, 40);
    if (!this.ready()) {
      const failed=ART_STATUS.errors.length&&!ART_STATUS.ready;
      txt(g,failed?'画面暂未载入':'正在准备旅程',VW/2,VH/2+2,UIC.text,{align:'center'});
      const w=120,x=Math.round((VW-w)/2),y=Math.round(VH/2+24);
      g.fillStyle='#294550';g.fillRect(x,y,w,3);g.fillStyle='#b9d5b6';g.fillRect(x,y,Math.round(w*ART_STATUS.loaded/Math.max(1,ART_STATUS.total)),3);
      txt(g,failed?'轻点或按空格重试':`${ART_STATUS.loaded} / ${ART_STATUS.total}`,VW/2,y+12,UIC.dim,{align:'center'});return;
    }
    if (Math.floor(this.t * 2) % 2 === 0 || this.t < .5) txt(g, TOUCH ? '轻点屏幕开始' : '按空格 / 点击开始', VW / 2, VH / 2 + 2, UIC.text, { align: 'center' });
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
    opts.push(['旅途指南', () => openScreen(new GuideScreen())]);
    opts.push(['设置与存档', () => openScreen(new SaveScreen({ settings: true }))]);
    this.btns = opts.map(([label, fn]) => new Btn({ label, w: 120, h: 20, onPress: fn }));
    this.focus = 0; this.hasSave = has;
  }
  finish(v) { closeScreen(this, v); }
  update(dt) { this.t += dt; this.nav(); }
  draw(g) {
    // 手机把完整人物留在菜单上方；菜单高度固定，避免遮住脸或随存档增减跳动。
    const artHeight = PORTRAIT ? VH - 160 : VH;
    coverArt(g, 'title-keyart', 0, 0, VW, artHeight, this.t, PORTRAIT ? .88 : .5);
    const gr = g.createLinearGradient(0, 0, PORTRAIT ? 0 : VW * .72, PORTRAIT ? artHeight : 0);
    gr.addColorStop(0, PORTRAIT ? 'rgba(5,20,31,.42)' : 'rgba(5,20,31,.88)');
    gr.addColorStop(.58, PORTRAIT ? 'rgba(5,20,31,.12)' : 'rgba(5,20,31,.58)'); gr.addColorStop(1, 'rgba(5,20,31,.05)');
    g.fillStyle = gr; g.fillRect(0, 0, VW, artHeight);
    if (PORTRAIT) {
      g.fillStyle='#0b1c29';g.fillRect(0,artHeight,VW,160);
      g.fillStyle='#41545b';g.fillRect(16,artHeight,VW-32,1);
    }
    // 字标与菜单共用中轴；有无存档都保持相同字标大小和位置。
    const columnCenter = PORTRAIT ? VW / 2 : Math.round(VW * .28);
    const logoW = PORTRAIT ? Math.min(VW - 48, 224) : Math.min(238, VW * .5);
    const logoH = Math.round(logoW * 570 / 1640);
    const logoX = Math.round(columnCenter - logoW / 2);
    const logoY = PORTRAIT ? clamp(Math.round(artHeight * .07), 16, 28) : Math.round(VH * .1);
    const brand = ART['brand-wordmark'];
    if (brand) {
      // 浅色透明字标直接叠在星空上；裁去透明留白，不绘制底板。
      g.save(); g.imageSmoothingEnabled = true;
      g.drawImage(brand, 60, 185, 1640, 570, logoX, logoY, Math.round(logoW), logoH);
      g.restore();
    } else {
      // 字标在后台加载；失败时仍能读到游戏名并开始游玩。
      const sc = PORTRAIT || VW < 450 ? 3 : 4;
      if (!LOGO || LOGO.s !== sc) { LOGO = makeLogo(GAME_TITLE, sc); LOGO.s = sc; }
      g.drawImage(LOGO, Math.round(columnCenter - LOGO.width / 2), Math.round(logoY + (logoH - LOGO.height) / 2));
    }
    const by = PORTRAIT ? VH - 132 : Math.min(Math.round(VH * .48), VH - this.btns.length * 25 - 30);
    const buttonStep = PORTRAIT ? 46 : 25;
    const menuW = Math.min(VW - 32, 248), menuX = Math.round((VW - menuW) / 2), half = Math.floor((menuW - 8) / 2);
    this.btns.forEach((b, i) => {
      if (PORTRAIT) {
        const full = !this.hasSave && i === 0, slot = this.hasSave ? i : i + 1;
        b.x = full ? menuX : menuX + (slot % 2) * (half + 8);
        b.y = by + (full ? 0 : Math.floor(slot / 2)) * buttonStep;
        b.w = full ? menuW : half;b.h = 40;
      } else {b.x = columnCenter - 84;b.y = by + i * buttonStep;b.w = 168;b.h = 21;}
      b.style = i === 0 ? 'primary' : 'btn';
    });
    this.drawBtns(g);
    txt(g, GAME_VERSION, VW - 12, VH - 18, '#b5c9c9', { align: 'right' });
    if (PORTRAIT) txt(g, '触屏走动 · A 键互动', menuX, VH - 34, '#b5c9c9');
    else txt(g, '方向键选择 · 空格确认', 12, VH - 18, '#b5c9c9');
    if (!reducedMotion()) for (let i = 0; i < 16; i++) {
      g.globalAlpha = .2 + Math.max(0, Math.sin(this.t + i * 2)) * .65;
      g.fillStyle = '#ffe3a3'; g.fillRect(Math.round(VW * (.5 + hash2(i, 7) * .5)), Math.round(artHeight * hash2(i, 4) + Math.sin(this.t * .5 + i) * 3), 1, 1);
    }
    g.globalAlpha = 1;
  }
}
class GuideScreen extends Screen {
  constructor() { super(); this.btns = [new Btn({label: '准备好了', w: 90, h: 22, style: 'primary', onPress: () => closeScreen(this)})]; }
  update(dt) { this.t += dt; if (Input.hit('back')) { closeScreen(this); return; } this.nav(); }
  draw(g) {
    this.dimBg(g, .85); const w = Math.min(VW - 24, 390), x = Math.round((VW - w) / 2);
    const lines = ['你是不响，星灯镇今晚需要一点帮助。', '方向键 / WASD 走路，Shift 跑步', '靠近人物或房门，空格 / 回车互动', 'Q 手记：地图、人物、回忆与串门', 'C 术语图鉴 · Esc 暂停 · M 静音', '手机：触屏方向键走路，A 键互动', '过关自动存档；已抵达地点可快速返回。', '故事可慢读；两场速答可反复尝试。'];
    const rows = lines.map((l, i) => wrap(l, w - 32, i === 0 ? '#a8d8ca' : UIC.text));
    const h = 75 + rows.reduce((sum, ls) => sum + ls.length * 13 + 5, 0), y = Math.max(6, Math.round((VH - h) / 2));
    win(g, x, y, w, h, 'dark'); txt(g, '旅途指南', x + 16, y + 12, UIC.gold);
    let yy = y + 36;
    rows.forEach(ls => { drawLines(g, ls, x + 16, yy, {lh: 13}); yy += ls.length * 13 + 5; });
    this.btns[0].x = x + w - 106; this.btns[0].y = y + h - 30; this.drawBtns(g);
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

/* 文件操作使用真实 DOM 点击，保留手机选择文件、下载和分享所需的用户激活。 */
class SaveScreen extends Screen {
  constructor({ settings = false } = {}) { super(); this.settings = settings; this.readToken = 0; this.pending = null; }
  onOpen() {
    this.active = true; this.previousFocus = document.activeElement; Input.reset();
    this.root = document.createElement('div'); this.root.className = 'save-overlay';
    this.root.innerHTML = `<section class="save-panel" role="dialog" aria-modal="true" aria-labelledby="save-heading" tabindex="-1">
      <header class="save-header"><div><p class="save-eyebrow">代码物语</p><h1 id="save-heading">${this.settings ? '设置与存档' : '存档管理'}</h1></div><button type="button" data-save="close" class="save-close" aria-label="关闭存档管理">×</button></header>
      <div class="save-content">
        <section class="save-current" aria-labelledby="save-current-label"><h2 id="save-current-label">本机进度</h2><p class="save-chapter" data-save="chapter"></p><p class="save-meta" data-save="progress"></p><p class="save-date" data-save="saved-at"></p></section>
        <div class="save-actions"><button type="button" data-save="save" class="save-primary">立即保存</button><button type="button" data-save="export">导出备份</button><button type="button" data-save="choose">选择存档文件</button><button type="button" data-save="share" hidden>分享存档</button></div>
        <input type="file" data-save="file" accept=".json,application/json" hidden aria-label="选择 JSON 存档文件">
        <p class="save-help">进度保存在当前浏览器。换设备时，把备份文件传过去，再导入即可。</p>
        <button type="button" data-save="recovery" class="save-recovery" hidden>恢复上次导入前的进度</button>
        <section class="save-preview" data-save="preview" aria-labelledby="save-preview-heading" hidden tabindex="-1"><h2 id="save-preview-heading" data-save="preview-heading"></h2><p class="save-file" data-save="filename"></p><p class="save-chapter" data-save="preview-chapter"></p><p class="save-meta" data-save="preview-progress"></p><p class="save-date" data-save="preview-date"></p><p class="save-confirm-copy" data-save="confirm-copy"></p><div class="save-actions"><button type="button" data-save="confirm" class="save-primary"></button><button type="button" data-save="cancel">取消</button></div></section>
        <p class="save-status" data-save="status" role="status" aria-live="polite" aria-atomic="true"></p>
        <section class="save-sound" aria-labelledby="save-sound-label"><h2 id="save-sound-label">声音</h2><div class="save-actions"><button type="button" data-save="music"></button><button type="button" data-save="effects"></button></div></section>
        <button type="button" data-save="home" class="save-recovery" hidden>返回湖畔</button>
      </div>
      <footer class="save-footer"><span>冒险中会自动保存</span><button type="button" data-save="back">${this.settings ? '返回首页' : '返回游戏菜单'}</button></footer>
    </section>`;
    this.nodes = {}; this.root.querySelectorAll('[data-save]').forEach(el => { this.nodes[el.dataset.save] = el; });
    this.panel = this.root.querySelector('.save-panel');
    this.background = [cv, touchBox, document.getElementById('tin')].filter(Boolean).map(el => ({ el, inert: el.inert, aria: el.getAttribute('aria-hidden') }));
    this.background.forEach(({ el }) => { el.inert = true; el.setAttribute('aria-hidden', 'true'); });
    document.body.appendChild(this.root);
    const on = (id, fn) => this.nodes[id].addEventListener('click', () => { if (this.active) { Audio.unlock(); fn(); } });
    on('close', () => closeScreen(this)); on('back', () => closeScreen(this));
    on('save', () => this.saveNow()); on('export', () => this.exportFile());
    on('choose', () => this.nodes.file.click()); on('share', () => this.shareFile());
    on('recovery', () => this.previewRecovery()); on('confirm', () => this.commit()); on('cancel', () => this.cancelPreview());
    on('music', () => { Audio.setMusic(!Audio.music); this.refreshSound(); });
    on('effects', () => { Audio.setSfx(!Audio.effects); this.refreshSound(); });
    on('home', () => this.returnToLake()); this.nodes.home.hidden = !this.hasLakeEntry();
    this.nodes.file.addEventListener('change', () => this.readFile(this.nodes.file.files[0]));
    this.root.addEventListener('keydown', e => {
      e.stopPropagation();
      if (e.key === 'Escape') { e.preventDefault(); if (this.pending) this.cancelPreview(); else closeScreen(this); }
      if (e.key === 'Tab') {
        const focusable = [...this.root.querySelectorAll('button:not(:disabled)')].filter(el => !el.hidden && !el.closest('[hidden]'));
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === this.panel)) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && (document.activeElement === last || !this.root.contains(document.activeElement))) { e.preventDefault(); first?.focus(); }
      }
    });
    this.root.addEventListener('keyup', e => e.stopPropagation());
    this.root.addEventListener('pointerdown', e => e.stopPropagation());
    try { this.nodes.share.hidden = !(navigator.share && navigator.canShare && typeof File === 'function' && navigator.canShare({ files: [new File(['{}'], '存档.json', { type: 'application/json' })] })); } catch (e) { this.nodes.share.hidden = true; }
    this.nodes.choose.classList.toggle('save-wide', this.nodes.share.hidden);
    this.refresh(); this.panel.focus();
  }
  onClose() {
    this.active = false; this.readToken++; this.pending = null; this.root?.remove();
    this.background?.forEach(({ el, inert, aria }) => { el.inert = inert; if (aria === null) el.removeAttribute('aria-hidden'); else el.setAttribute('aria-hidden', aria); });
    Input.reset(); const target = this.previousFocus?.isConnected ? this.previousFocus : cv; target?.focus({ preventScroll: true });
  }
  update(dt) { this.t += dt; }
  draw(g) { this.dimBg(g, .3); }
  date(value) { return value ? new Date(value).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }) : '暂无时间记录'; }
  progress(summary) { const minutes = Math.floor(summary.seconds / 60); return `术语 ${summary.terms} 个 · 旅途 ${minutes < 1 ? '不足 1 分钟' : `${minutes} 分钟`}`; }
  status(message = '', error = false) { if (!this.active) return; this.nodes.status.textContent = message; this.nodes.status.classList.toggle('is-error', error); }
  refreshSound() {
    this.nodes.music.textContent = `背景音乐：${Audio.music ? '开' : '关'}`; this.nodes.music.setAttribute('aria-pressed', String(Audio.music));
    this.nodes.effects.textContent = `音效：${Audio.effects ? '开' : '关'}`; this.nodes.effects.setAttribute('aria-pressed', String(Audio.effects));
  }
  refresh() {
    let summary = null;
    try { summary = SaveTransfer.currentSummary(); } catch (e) { this.status(e.message, true); }
    this.nodes.chapter.textContent = summary ? summary.chapter : '还没有存档';
    this.nodes.progress.textContent = summary ? this.progress(summary) : '开始冒险后，进度会自动保存在这里。';
    this.nodes['saved-at'].textContent = summary ? `最近保存：${this.date(summary.savedAt)}` : '';
    this.nodes.save.disabled = scene !== 'world'; this.nodes.export.disabled = !summary; this.nodes.share.disabled = !summary;
    try { this.nodes.recovery.hidden = !SaveTransfer.recovery(); } catch (e) { this.nodes.recovery.hidden = true; this.status(e.message, true); }
    this.refreshSound();
  }
  saveNow() {
    if (scene !== 'world') return;
    if (save(true)) { this.refresh(); this.status('已保存到本机浏览器。'); Audio.sfx('ok'); }
    else this.status('保存失败。请先导出备份，并保持游戏打开。', true);
  }
  hasLakeEntry() { return typeof location !== 'undefined' && /^\/game\/(?:index\.html)?$/.test(location.pathname); }
  returnToLake() {
    if (!this.active || !this.hasLakeEntry()) return;
    if (scene === 'world' && !save(true)) {
      this.status('保存失败，已留在游戏。请先导出备份，再重试保存。', true);
      this.nodes.status.scrollIntoView({ block: 'nearest', behavior: 'auto' });
      return;
    }
    location.assign('/');
  }
  exportFile() {
    let url;
    try {
      const output = SaveTransfer.exportCurrent();
      url = URL.createObjectURL(new Blob([output.text], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = output.filename; link.hidden = true; this.root.appendChild(link); link.click(); link.remove();
      this.status('已发起下载，请在“文件”或“下载”中确认。');
    } catch (e) { this.status(typeof e.code === 'string' ? e.message : '未能生成备份，请重试。', true); }
    finally { if (url) setTimeout(() => URL.revokeObjectURL(url), 60000); }
  }
  async shareFile() {
    try {
      const output = SaveTransfer.exportCurrent(), file = new File([output.text], output.filename, { type: 'application/json' });
      await navigator.share({ files: [file], title: '代码物语 · 存档备份' });
      if (this.active) this.status('已交给系统分享。请确认已存到文件或发送给另一台设备。');
    } catch (e) { if (this.active) this.status(e.name === 'AbortError' ? '已取消分享，当前进度未改动。' : (typeof e.code === 'string' ? e.message : '分享不可用，请使用“导出备份”。'), e.name !== 'AbortError'); }
  }
  async readFile(file) {
    if (!this.active || !file) return;
    const token = ++this.readToken; this.pending = null; this.nodes.preview.hidden = true; this.nodes.file.value = '';
    if (file.size > SaveTransfer.MAX_BYTES) { this.status('文件超过 128 KB，请选择游戏导出的 JSON 存档。', true); return; }
    this.status('正在读取存档…');
    try {
      const text = await file.text(); if (!this.active || token !== this.readToken) return;
      const parsed = SaveTransfer.parse(text); this.pending = { kind: 'import', state: parsed.state, summary: parsed.summary };
      this.preview(parsed.summary, file.name, parsed.legacy ? '旧版存档预览' : '导入预览', '确认导入并回到首页', '导入会替换本机进度；替换前会自动留一份恢复备份。');
    } catch (e) { if (this.active && token === this.readToken) this.status(typeof e.code === 'string' ? e.message : '文件读取失败，请重新选择。', true); }
  }
  preview(summary, filename, heading, label, copy) {
    this.nodes['preview-heading'].textContent = heading; this.nodes.filename.textContent = filename;
    this.nodes['preview-chapter'].textContent = summary.chapter; this.nodes['preview-progress'].textContent = this.progress(summary);
    this.nodes['preview-date'].textContent = `存档时间：${this.date(summary.savedAt)}`;
    this.nodes['confirm-copy'].textContent = copy; this.nodes.confirm.textContent = label; this.nodes.preview.hidden = false;
    this.status(''); this.nodes.preview.focus({ preventScroll: true }); this.nodes.preview.scrollIntoView({ block: 'nearest', behavior: 'auto' });
  }
  previewRecovery() {
    try {
      const backup = SaveTransfer.recovery(); if (!backup) { this.status('还没有可恢复的导入前存档。'); return; }
      this.readToken++; this.pending = { kind: 'restore', summary: backup.summary };
      this.preview(backup.summary, `备份时间：${this.date(backup.createdAt)}`, '恢复进度预览', '确认恢复并回到首页', '恢复会替换当前进度。需要保留当前进度时，请先导出备份。');
    } catch (e) { this.status(e.message, true); }
  }
  cancelPreview() { this.readToken++; this.pending = null; this.nodes.preview.hidden = true; this.status('已取消，当前进度未改动。'); this.nodes.choose.focus({ preventScroll: true }); }
  commit() {
    if (!this.active || !this.pending) return;
    try {
      const restored = this.pending.kind === 'restore', result = restored ? SaveTransfer.restore() : SaveTransfer.import(this.pending.state);
      // 同步接管内存和落点，再退出旧画面；失焦自动保存不会写回导入前的 G。
      G = result.state; player.x = G.px; player.y = G.py; Input.reset();
      for (const screen of [...screens].reverse()) closeScreen(screen);
      goTitle(); toast(restored ? '已恢复进度，选择“继续冒险”' : '已导入进度，选择“继续冒险”', UIC.mint);
    } catch (e) { this.status(e.message || '存档未能写入，请重试。', true); this.refresh(); }
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
  ids.forEach(id => { const term=findTerm(id); if(term&&!G.terms.includes(id)){G.terms.push(id);list.push(term);} });
  save(); checkCollectAch();
  if(list.length){Audio.sfx('card');toast(`图鉴 +${list.length} · ${TOUCH?'点右上角查看':'C 键查看'}`,UIC.mint);}
  return Promise.resolve();
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
  { t: '请来了 AI 客服', d: '大模型 + 提示词 + 知识库：查店里的菜单后回答；缺少依据时先核实。', k: ['llm', 'prompt', 'rag'] },
  { t: '改代码不怕出事了', d: '每次改动都存档；密钥锁进保险箱；有测试兜底。', k: ['git', 'env', 'test'] },
  { t: '正式上线！', d: '部署并检查访问权限，让顾客能打开和试用。', k: ['deploy', 'domain', 'rollback'] },
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
    if (stage >= 5) { g.fillStyle = '#5ad06a'; g.fillRect(sx + 4, sy + sh - 16, 6, 6); txt(g, '模拟营业中', sx + 13, sy + sh - 19, '#2a7a4a', { shadow: null }); }
  }
  g.restore();
}
class AppScreen extends Screen {
  constructor(upgraded) {
    super(); this.up = upgraded; this.selected = Math.max(0, appStage() - 1);
    this.btns = [new Btn({ label: upgraded ? '继续旅途 ▶' : '关闭', w: 92, h: 20, style: 'primary', onPress: () => closeScreen(this) })];
    APP_STEPS.forEach((_, i) => this.btns.push(new Btn({ label: String(i + 1), w: 32, h: 23, step: i, disabled: i >= appStage(), onPress: () => { this.selected = i; } })));
    appNew = false;
  }
  onOpen() { if (this.up) { Audio.sfx('app'); for (let i = 0; i < 3; i++) { burst(VW / 2, VH / 2, 30, { colors: ['#ffd23f', '#ff8ab0', '#7ad0ff', '#7dffa6'], min: 60, max: 200, g: 120, life: 1.6, size: 2 }); } parts.slice(-90).forEach(p => p.layer = 'ui'); } }
  update(dt) { this.t += dt; if (Input.hit('back')) { closeScreen(this); return; } this.nav(); }
  draw(g) {
    this.dimBg(g, .88);
    const st = appStage(), P = PORTRAIT, pw = 112, ph = P ? Math.min(156, Math.floor(VH * .32)) : Math.min(216, VH - 66);
    const px = P ? Math.round((VW - pw) / 2) : 20, py = P ? 40 : 36;
    txt(g, this.up ? '小店离灯会更近一步了' : '鸭鸭点餐 · 制作手记', VW / 2, 12, UIC.gold, {align: 'center'});
    const k = this.up ? easeOutBack(Math.min(1, this.t * 2)) : 1;
    g.save(); g.translate(px + pw / 2, py + ph / 2); g.scale(k, k); drawPhone(g, -pw / 2, -ph / 2, pw, ph, st, this.t); g.restore();
    const lx = P ? 16 : 154, ly = P ? py + ph + 12 : 46, lw = VW - lx - 16;
    const stepW = Math.min(40, Math.floor((lw - 20) / 5));
    this.btns.slice(1).forEach((b, i) => { b.x = lx + i * (stepW + 4); b.y = ly; b.w = stepW; b.style = this.selected === i ? 'primary' : 'btn'; });
    const s = APP_STEPS[this.selected], got = this.selected < st;
    const desc = got ? s.d : '每完成一章委托，小店就会多一项能用的功能。';
    const lines = wrap(desc, lw - 20), title = wrap(got ? s.t : '从一个想法开始', lw - 20, UIC.gold);
    const hh = 22 + title.length * 14 + lines.length * 14;
    win(g, lx, ly + 32, lw, hh, 'dark');
    drawLines(g, title, lx + 10, ly + 41); drawLines(g, lines, lx + 10, ly + 45 + title.length * 14);
    txt(g, `已完成 ${st} / 5 步`, lx, ly + 32 + hh + 8, UIC.dim);
    const close = this.btns[0]; close.x = VW - close.w - 16; close.y = VH - 29;
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
      new Btn({ label: '存档管理', w: 150, h: 20, onPress: () => openScreen(new SaveScreen()) }),
      new Btn({ label: '旅途手记 / 地图', w: 150, h: 20, onPress: () => { closeScreen(this); openJournal(); } }),
      new Btn({ label: '术语图鉴', w: 150, h: 20, onPress: () => openNotebook() }),
      new Btn({ label: 'App 进度', w: 150, h: 20, onPress: () => openApp(false) }),
      new Btn({ label: `小 A 的帽子：${hatName}`, w: 150, h: 20, disabled: !G.hats.length, onPress: () => { const opts = [''].concat(G.hats); G.hat = opts[(opts.indexOf(G.hat) + 1) % opts.length]; save(); this.mk(); } }),
      new Btn({ label: `背景音乐：${Audio.music ? '开' : '关'}`, w: 150, h: 20, onPress: () => { Audio.setMusic(!Audio.music); this.mk(); } }),
      new Btn({ label: `音效：${Audio.effects ? '开' : '关'}`, w: 150, h: 20, onPress: () => { Audio.setSfx(!Audio.effects); this.mk(); } }),
      new Btn({ label: '旅途指南', w: 150, h: 20, onPress: () => openScreen(new GuideScreen()) }),
      new Btn({ label: '存档并回到标题', w: 150, h: 20, onPress: async () => { if (save(true)) closeScreen(this, 'title'); else toast('保存失败，请保持游戏打开', UIC.rose); } }),
    ];
    this.focus = f || 0;
  }
  update(dt) { this.t += dt; if (Input.hit('back')) { Audio.sfx('back'); closeScreen(this); return; } this.nav(); }
  draw(g) {
    this.dimBg(g, .55);
    const cols = PORTRAIT ? 1 : 2, gap = 6, bw = PORTRAIT ? 180 : 150;
    const rows = Math.ceil(this.btns.length / cols), w = cols * bw + (cols - 1) * gap + 36, h = 42 + rows * 25;
    const x = Math.round((VW - w) / 2), y = Math.max(8, Math.round((VH - h - 42) / 2));
    win(g, x, y, w, h); txt(g, '在这里歇一会儿', x + 18, y + 12, UIC.gold);
    this.btns.forEach((b, i) => { b.w = bw; b.x = x + 18 + (i % cols) * (bw + gap); b.y = y + 34 + Math.floor(i / cols) * 25; }); this.drawBtns(g);
    const mm = Math.floor(G.t / 60), ss = String(Math.floor(G.t % 60)).padStart(2, '0');
    txt(g, `旅途 ${mm}:${ss} · 术语 ${mainCount()}/${TERMS.length}`, VW / 2, y + h + 7, UIC.dim, { align: 'center' });
    txt(g, '进度保存在这台设备的浏览器中', VW / 2, y + h + 23, UIC.dim, { align: 'center' });
  }
}

/* ---------- 房间（开场 & 结局） ---------- */
const room = { mode: 'night', flicker: 0, warp: 0, t: 0 };
function drawRoom(g, dt) {
  room.t += dt;
  const night = room.mode === 'night', t = room.t;
  const cx = Math.round(VW / 2), floorY = Math.round(VH * .72);
  if (ART['comic-arrival']) {
    coverArt(g, 'comic-arrival', 0, 0, VW, VH, t, .5);
    g.fillStyle = night ? 'rgba(5,14,28,.16)' : 'rgba(255,202,142,.12)'; g.fillRect(0, 0, VW, VH);
    if (!reducedMotion()) for (let i = 0; i < 18; i++) { g.globalAlpha = .2 + .3 * Math.max(0, Math.sin(t + i)); g.fillStyle = '#ffe4ac'; g.fillRect(Math.round(hash2(i, 3) * VW), Math.round(hash2(i, 4) * VH + Math.sin(t * .3 + i) * 4), 1, 1); }
    g.globalAlpha = 1;
    if (room.warp > 0) { g.fillStyle = `rgba(180,240,255,${room.warp * .8})`; g.fillRect(0, 0, VW, VH); }
    return;
  }
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
  if (!room.noPlayer) { const im = charFrame('player', 1, 0); g.drawImage(im, cx - im.width, dy - im.height * 2 + 38, im.width * 2, im.height * 2); }
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
