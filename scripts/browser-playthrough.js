/* 在隔离的测试 origin 的 ?qa=1 页中执行；走真实章节与答题回调，
 * 仅移动到任务点并加速翻页，不模拟玩家阅读时长。结果保存在 window.__qaRun。 */
(() => {
  const game = window.__game;
  if (!game) throw new Error('请使用 ?qa=1 测试页面');
  const originalSave = localStorage.getItem('code-village-v3');
  const report = { startedAt: new Date().toISOString(), mode: 'automated-correct-path', status: 'running', screens: {}, chapters: [], reactions: [], errors: [], overflow: [], actions: 0 };
  const observedReactions = new WeakMap();
  window.__qaRun = report;
  const errors = e => report.errors.push(String(e.message || e.reason || e));
  window.addEventListener('error', errors); window.addEventListener('unhandledrejection', errors);
  let lastDone = -1, blockedTicks = 0, prevScreen = null;
  function press(s, b) { if (b && !b.disabled) { report.actions++; s.press(b); blockedTicks = 0; } }
  function finish(status) {
    clearInterval(timer); report.status = status; report.finishedAt = new Date().toISOString();
    report.done = game.G.done; report.terms = game.G.terms.length; report.expectedTerms = game.TERMS.length;
    report.comics = game.G.comics; report.achievements = game.G.ach;
    report.saveMatches = game.loadSave()?.done === game.G.done;
    window.addEventListener('pagehide', () => { if (originalSave === null) localStorage.removeItem('code-village-v3'); else localStorage.setItem('code-village-v3', originalSave); }, {once:true});
  }
  const timer = setInterval(() => {
    try {
      if (game.G.done !== lastDone) { lastDone = game.G.done; report.chapters.push(lastDone); }
      const s = game.screens.at(-1);
      const c = document.querySelector('#game');
      if (s) {
        const type = s.constructor.name; report.current = type;
        if (s !== prevScreen) { report.screens[type] = (report.screens[type] || 0) + 1; prevScreen = s; }
        if (type === 'DialogScreen' && s.reaction && observedReactions.get(s) !== s.i) {
          observedReactions.set(s, s.i);
          report.reactions.push({ zone: game.G.done, who: s.who, text: s.text, emotion: s.reaction.emotion, placement: game.reactionPlacement(s) });
        }
        for (const b of s.btns || []) if (!b.hidden && !b.disabled) {
          const oy = b._oy || 0;
          if (b.x < 0 || b.y + oy < 0 || b.x + b.w > c.width + 1 || b.y + oy + b.h > c.height + 1) {
            const entry = `${game.G.done}:${type}:${b.label}:${Math.round(b.x)},${Math.round(b.y + oy)},${b.w},${b.h} / ${c.width}x${c.height}`;
            if (!report.overflow.includes(entry)) report.overflow.push(entry);
          }
        }
        if (type === 'EndScreen') { finish('passed'); return; }
        if (type === 'BootScreen') { if (s.ready()) game.finishScreen(s); }
        else if (type === 'TitleScreen') press(s, s.btns.find(b => b.label === '开始新冒险'));
        else if (type === 'ConfirmScreen') press(s, s.btns[0]);
        else if (type === 'ComicScreen') { s.revealed = true; s.next(); }
        else if (type === 'DialogScreen') { s.n = s.total; if (s.page < s.pages.length - 1) { s.page++; s.total = s.pages[s.page].length; } else s.next(); }
        else if (s.busy) {}
        else if (type === 'QuizScreen') press(s, s.btns.find(b => b.opt?.ok));
        else if (type === 'OrderScreen') {
          if (s.ans.length < s.N) press(s, s.btns.find(b => !b.slot && b.label === s.cfg.items[s.ans.length]));
          else press(s, s.btns.at(-1));
        } else if (type === 'PickScreen') {
          const b = s.btns.find(b => b.it?.need && !s.sel.has(b.idx)); if (b) press(s, b); else press(s, s.btns.at(-1));
        } else if (type === 'PromptScreen') {
          const k = s.choice.findIndex(c => !c.opts[c.i].good); press(s, k < 0 ? s.btns.at(-1) : s.btns[k]);
        } else if (type === 'HalluScreen') press(s, s.btns.find(b => b.verdict === s.verdict(s.cfg.claims[s.i])));
        else if (type === 'AgentDeskScreen') press(s, s.feedback ? s.btns[0] : s.btns.find(b => b.choice?.ok));
        else if (type === 'BattleScreen' || type === 'RushScreen') {
          if (s.state === 'ask') press(s, s.btns.find(b => b.ok));
          else press(s, s.btns.find(b => !b.disabled));
        } else if (type === 'TerminalScreen') {
          if (s.doneT < 0) { s.inp.value = 'git push'; s.submit(); } else press(s, s.btns.find(b => !b.disabled));
        } else if (type === 'ArchScreen') press(s, s.btns.find(b => b.tid === game.ARCH[s.k]?.id));
        else if (type === 'LaunchScreen') {}
        else if (type === 'CardScreen' || type === 'AppScreen') press(s, s.btns[0]);
        else report.errors.push('Unknown screen: ' + type);
      } else if (!game.scriptRunning && game.scene === 'world') {
        const n = game.npcs.find(n => n.id === game.G.done);
        if (n) { game.enterWorld(n.x, n.y + (n.range > 30 ? 30 : 18)); game.interact(); report.actions++; }
      }
      if (++blockedTicks > 600) finish('stalled');
      if (report.errors.length > 10) finish('failed');
    } catch (e) { report.errors.push(e.stack); finish('failed'); }
  }, 90);
  report.stop = () => finish('stopped');
})();
