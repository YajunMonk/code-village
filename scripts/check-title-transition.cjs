#!/usr/bin/env node
'use strict';
// Actual frame/menu/story/save flows; Canvas and fade clocks are controlled.
// Uses an in-memory localStorage only. No browser or production save is accessed.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, 'source/src', name), 'utf8');
const noop = () => {};
const plain = v => JSON.parse(JSON.stringify(v));
const flush = async () => { for (let i = 0; i < 16; i++) await Promise.resolve(); };
let assertions = 0;
const results = [];
function check(value, label) { assertions++; assert.ok(value, label); }
function equal(a, b, label) { assertions++; assert.deepEqual(plain(a), plain(b), label); }
function surface() {
  return new Proxy({
    createImageData: (w, h) => ({width:w,height:h,data:new Uint8ClampedArray(w*h*4)}),
    getImageData: (x,y,w,h) => ({width:w,height:h,data:new Uint8ClampedArray(w*h*4)}),
    createRadialGradient: () => ({addColorStop:noop}), createLinearGradient: () => ({addColorStop:noop}),
    measureText: s => ({width:[...s].reduce((n,c)=>n+(c.codePointAt(0)>127?12:6),0)}),
  }, {get:(o,k)=>k in o?o[k]:noop});
}
function element() {
  const listeners=new Map(), captures=new Set(), g=surface();
  return {width:480,height:270,style:{},dataset:{},hidden:false,classList:{add:noop,remove:noop},
    getContext:()=>g,getBoundingClientRect:()=>({left:0,top:0,width:480,height:270}),
    addEventListener(k,f){if(!listeners.has(k))listeners.set(k,[]);listeners.get(k).push(f);},
    fire(k,props={}){for(const f of listeners.get(k)||[])f({target:this,preventDefault:noop,pointerType:'touch',pointerId:1,button:0,...props});},
    setPointerCapture:id=>captures.add(id),hasPointerCapture:id=>captures.has(id),releasePointerCapture:id=>captures.delete(id),
  };
}
function harness(done=1,seen=true) {
  const storage=new Map(), trace={writes:0,deletes:0,failSave:false,toasts:[],free:[]};
  const cv=element(),touch=element(),buttons=Object.fromEntries(['up','down','left','right','ok','run'].map(k=>[k,Object.assign(element(),{dataset:{k}})]));
  const win=Object.assign(element(),{innerWidth:960,innerHeight:540,devicePixelRatio:1});
  const doc=Object.assign(element(),{hidden:false,querySelector:s=>s==='#game'?cv:touch,querySelectorAll:()=>Object.values(buttons),createElement:element});
  const context=vm.createContext({console,performance,URLSearchParams,setTimeout,clearTimeout,window:win,document:doc,
    location:{search:''},matchMedia:()=>({matches:false}),requestAnimationFrame:noop,trace,
    localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>{if(trace.failSave)throw Error('quota');trace.writes++;storage.set(k,v);},removeItem:k=>{trace.deletes++;storage.delete(k);}},
    Audio:{music:false,effects:true,play:noop,sfx:noop,unlock:noop},
    ASSET_DATA:Object.fromEntries(Object.keys(JSON.parse(fs.readFileSync(path.join(root,'source/assets/manifest.json'),'utf8'))).map(k=>[k,`assets/${k}.webp`])),
  });
  for(const name of ['00_core.js','20_art.js','21_props.js','22_art3.js','30_world.js','35_entities.js','37_reactions.js','40_ui.js','50_screens.js','55_journal.js','56_interiors.js','57_residents.js','60_story.js'])vm.runInContext(read(name),context,{filename:name});
  vm.runInContext(read('70_main.js').replace(/\nboot\(\);\s*$/,'\n'),context,{filename:'70_main.js'});
  const run=code=>vm.runInContext(code,context);
  run(`
    buildProps();buildProps3();buildWorld();setupNPCs();setupInteriors();setupTouch();
    for(const key of Object.keys(ASSET_DATA))ART[key]={width:1672,height:941};
    const testFades=[];fadeTo=(to,duration)=>new Promise(resolve=>testFades.push({to,duration,resolve}));
    // Keep the real updateWorld, including player movement; only suppress rendering.
    drawWorld=()=>{};drawHUD=()=>{};drawPrompt=()=>{};drawParts=()=>{};drawToasts=()=>{};
    const testUpdateWorld=updateWorld;updateWorld=(dt,free)=>{trace.free.push(free);testUpdateWorld(dt,free);};
    toast=text=>trace.toasts.push(text);
    G=freshState();G.done=${done};G.comics=${seen?'["arrival"]':'[]'};
    G.terms=['vibe'];G.roomsVisited=['cafe'];G.keepsakes=['cafe:tea'];
    G.residentsSeen=['maker'];G.residentVisits={'maker:before':2};G.t=35;G.wrong=1;
    const testNPC=npcs.find(n=>n.id===${done});enterWorld(testNPC.x-20,testNPC.y+15);save();
    frame.previousScene=scene;frame.previousTop=undefined;
  `);
  let time=performance.now();
  const frame=()=>run(`frame(${time+=16});`);
  const state=()=>JSON.parse(run('JSON.stringify({scene,locked:scriptRunning,top:topScreen()?.constructor.name||null,done:G.done,position:[player.x,player.y],comics:G.comics})'));
  const button=label=>{run('topScreen().draw(ctx);');const p=JSON.parse(run(`JSON.stringify((()=>{const b=topScreen().btns.find(b=>b.label===${JSON.stringify(label)});if(!b)throw Error('missing button');return {x:b.cx,y:b.cy};})())`));cv.fire('pointerdown',{clientX:p.x,clientY:p.y});frame();};
  const fade=async()=>{check(run('testFades.length')>0,'Expected pending fade');run('testFades.shift().resolve();');await flush();};
  return {run,frame,state,button,fade,win,cv,buttons,trace,storage};
}
async function leaveForTitle(h, input='keyboard') {
  h.win.fire('keydown',{code:'Escape'});h.frame();h.win.fire('keyup',{code:'Escape'});
  equal(h.state().top,'PauseScreen','Escape opens actual pause');
  h.button('存档并回到标题');await flush();
  equal(h.state().top,null,'Pause closes after successful save');
  check(h.state().locked,'Title fade reserves script input');
  const position=h.state().position,done=h.state().done;
  if(input==='touch'){
    h.buttons.right.fire('pointerdown',{pointerId:11});h.buttons.ok.fire('pointerdown',{pointerId:12});
  }else{
    h.win.fire('keydown',{code:'ArrowRight'});h.win.fire('keydown',{code:'Space'});
  }
  h.frame();await flush();
  equal(h.state().top,null,'Interaction during fade cannot open a dialogue');
  equal(h.state().position,position,'Held movement does not move during fade');
  equal(h.trace.free.at(-1),false,'Real updateWorld receives free=false');
  h.win.fire('keydown',{code:'Escape'});h.frame();h.win.fire('keyup',{code:'Escape'});
  equal(h.state().top,null,'Repeated pause input does not open another menu');
  const snap=h.state();
  if(input==='touch')for(const id of [11,12])h.win.fire('pointerup',{pointerId:id});
  else for(const code of ['ArrowRight','Space'])h.win.fire('keyup',{code});
  await h.fade();
  equal(h.state().top,'TitleScreen','Fade ends at real title');
  equal(h.state().locked,false,'Transition lock releases before title selection');
  equal(h.state().done,done,'Returning to title preserves progress');
  await h.fade();
  return snap;
}
async function driveOpening(h) {
  const comics=[],dialogues=[],seen=new Set();
  for(let i=0;i<100;i++){
    if(h.run('testFades.length')){await h.fade();continue;}
    const type=h.state().top;
    if(type==='ComicScreen'){
      const key=h.run('topScreen().key');if(!comics.includes(key))comics.push(key);
      h.run('topScreen().revealed=true;');h.button(h.run('topScreen().btns[0].label'));
    }else if(type==='DialogScreen'){
      const screen=h.run('topScreen()');if(!seen.has(screen)){seen.add(screen);dialogues.push(screen.lines.length);}
      h.run('topScreen().n=topScreen().total;');h.win.fire('keydown',{code:'Space'});h.frame();h.win.fire('keyup',{code:'Space'});
    }else if(h.state().scene==='world'&&!h.state().locked)break;
    else assert.fail(`Unexpected continuation: ${JSON.stringify(h.state())}`);
    await flush();
  }
  check(h.state().scene==='world'&&!h.state().locked&&!h.state().top,'Opening completes into an unlocked world');
  equal(h.state().done,1,'Opening completes chapter zero exactly once');
  equal(dialogues,[4,4,4],'Three original opening exchanges remain intact');
  return {comics,dialogues};
}
(async()=>{
  for(const mode of ['keyboard','touch']){
    const h=harness(1,true);equal(h.run('interactTarget()?.n?.id'),1,'Regression is beside actual chef');
    const snap=await leaveForTitle(h,mode);
    const before=plain(h.run('loadSave()'));
    h.button('继续冒险');await flush();await h.fade();await h.fade();
    equal(h.state().scene,'world','Continue returns to world');equal(h.state().locked,false,'Continue has no orphaned story lock');equal(h.state().top,null,'No discarded dialogue remains');
    for(const key of ['done','terms','comics','roomsVisited','keepsakes','residentsSeen','residentVisits','wrong'])equal(h.run(`G.${key}`),before[key],`Continue preserves ${key}`);
    equal(h.trace.deletes,0,'Returning and continuing never clears save');
    h.win.fire('keydown',{code:'Escape'});h.frame();h.win.fire('keyup',{code:'Escape'});equal(h.state().top,'PauseScreen','Pause is usable after continuing');
    results.push({case:`title transition ${mode}`,duringFade:snap,afterContinue:h.state()});
  }
  {
    const h=harness();h.trace.failSave=true;
    h.win.fire('keydown',{code:'Escape'});h.frame();h.win.fire('keyup',{code:'Escape'});h.button('存档并回到标题');await flush();
    equal(h.state().top,'PauseScreen','Save failure retains Pause');equal(h.run('testFades.length'),0,'Save failure does not start title fade');equal(h.state().locked,false,'Save failure leaves no transition lock');check(h.trace.toasts.some(s=>s.includes('保存失败')),'Save failure is reported');
    h.button('继续游戏');await flush();equal(h.state().top,null,'Save failure still allows resume');
    results.push({case:'save failure',afterResume:h.state()});
  }
  for(const seen of [true,false]){
    const h=harness(0,seen);await leaveForTitle(h);
    h.button('继续冒险');await flush();await h.fade();
    check(h.state().locked,'Chapter-zero continuation holds its own story lock');
    const opening=await driveOpening(h);equal(opening.comics,seen?[]:['arrival'],'Continue respects existing comic record');equal(h.trace.deletes,0,'Chapter-zero resume never deletes save');
    results.push({case:`done=0 comic ${seen?'seen':'unseen'}`,opening,final:h.state()});
  }
  {
    const h=harness();await leaveForTitle(h);
    h.button('开始新冒险');await flush();equal(h.state().top,'ConfirmScreen','New game still asks before deleting save');
    h.button('确定');await flush();
    const opening=await driveOpening(h);equal(opening.comics,['arrival'],'Confirmed new game starts original opening');equal(h.trace.deletes,1,'Only confirmed new game clears save');
    results.push({case:'confirmed new game after title transition',opening,final:h.state()});
  }
  const report={passed:true,assertions,cases:results,sourceSha256:crypto.createHash('sha256').update(read('70_main.js')).digest('hex'),scope:'Real frame/input handlers/updateWorld/PauseScreen/TitleScreen/save/CH0 and script locks; controlled fades and Canvas. No browser or production storage.'};
  const arg=process.argv.indexOf('--output');if(arg>=0){const file=path.resolve(root,process.argv[arg+1]);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n');}
  console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
