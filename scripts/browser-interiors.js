/* 只在隔离的 ?qa=1 测试页运行。此项显式设为通关状态以验证可选探索，
 * 不参与主线通关证明；browser-playthrough.js 才走主线实际回调。 */
(async()=>{
  const game=window.__game;if(!game)throw new Error('需要 ?qa=1 测试页');
  const report={mode:'interior-integration-fixture',status:'running',rooms:[],dialogs:0,lines:0,errors:[]};window.__interiorQA=report;
  const tick=()=>new Promise(requestAnimationFrame);
  const check=(ok,message)=>{if(!ok)throw new Error(message);};
  async function drain(){for(let i=0;i<24;i++){const s=game.screens.at(-1);if(s?.constructor.name!=='DialogScreen')break;report.lines++;s.next();await Promise.resolve();}await tick();}
  try {
    await drain();
    // 通过真实“回村里逛逛”按钮结束结局脚本，不能直接移除仍被 await 的窗口。
    const end=game.screens.at(-1);
    if(end?.constructor.name==='EndScreen')end.press(end.btns.find(b=>b.label==='回村里逛逛'));
    for(let i=0;i<600&&(game.scriptRunning||game.scene!=='world');i++)await tick();
    check(!game.scriptRunning&&game.scene==='world'&&!game.screens.length,'请先完成剧情并返回街道');
    game.G.done=27;game.G.keepsakes=[];game.G.roomsVisited=[];game.G.residentsSeen=[];game.G.residentVisits={};
    for(const [key,r] of Object.entries(game.INTERIORS)){
      game.G.done=27;game.enterWorld(r.door.x,r.door.y+8);game.interact();await tick();
      const s=game.screens.at(-1);check(s?.constructor.name==='InteriorScreen'&&s.key===key,'实际房门无法进入 '+key);
      const entry={key,name:r.name,resident:r.resident,spots:[],rounds:0};report.rooms.push(entry);
      for(let i=0;i<3;i++){const p=s.inspect(i);report.dialogs++;await drain();await p;entry.spots.push(r.spots[i].id);}
      if(r.resident){
        for(const [phase,done,count] of [['before',r.zone,4],['after',27,2]]){
          game.G.done=done;
          for(let round=0;round<count;round++){const p=s.chat();const d=game.screens.at(-1);check(d?.lines?.length===3,'居民对话缺句 '+key);check(d.lines[0][0]==='resident_'+r.resident,'说话人不匹配 '+key);report.dialogs++;await drain();await p;entry.rounds++;}
          check(game.G.residentVisits[r.resident+':'+phase]===count,'对话轮换没有保存 '+key);
        }
      }
      s.press(s.btns.find(b=>b.exit));await tick();check(game.screens.length===0,'出门后界面未关闭 '+key);
    }
    game.G.done=27;game.save();
    const saved=game.loadSave();check(saved.keepsakes.length===54,'54件拾光不完整');check(saved.roomsVisited.length===18,'到访记录不完整');check(saved.residentsSeen.length===12,'居民相遇记录不完整');
    report.saved={keepsakes:saved.keepsakes.length,rooms:saved.roomsVisited.length,residents:saved.residentsSeen.length,visits:saved.residentVisits};report.status='passed';
  }catch(error){report.errors.push(String(error.stack||error));report.status='failed';}
  report.finishedAt=new Date().toISOString();
})();
