#!/usr/bin/env node
'use strict';
// Real dialogue, sprite dimensions and reaction code; recording Canvas, no browser save writes.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const source = n => fs.readFileSync(path.join(root, 'source/src', n), 'utf8');
const noop = () => {}, report = { passed: false, scenarios: [], layouts: 0, pixelChecks: 0 };
const metrics = s => [...s].reduce((n, ch) => n + (ch.codePointAt(0) > 127 ? 12 : 6), 0);
function surface() {
  const stack = [];
  return new Proxy({
    pixels: [], text: [], globalAlpha: 1, fillStyle: '',
    fillRect(x, y, w, h) { this.pixels.push({ x, y, w, h, color: this.fillStyle, alpha: this.globalAlpha }); },
    fillText(...args) { this.text.push(args); },
    save() { stack.push({ globalAlpha: this.globalAlpha, fillStyle: this.fillStyle }); },
    restore() { Object.assign(this, stack.pop()); },
    measureText: text => ({ width: metrics(text) }),
    createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
    getImageData: (x, y, w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
    createRadialGradient: () => ({ addColorStop: noop }), createLinearGradient: () => ({ addColorStop: noop }),
  }, { get: (o, k) => k in o ? o[k] : noop });
}
const gfx = surface(), device = { reduced: false };
const context = vm.createContext({
  console, performance, setTimeout, clearTimeout,
  document: { createElement: () => ({ getContext: () => surface() }), addEventListener: noop }, window: { addEventListener: noop },
  localStorage: { getItem: () => null, setItem: noop }, Audio: { sfx: noop, play: noop },
  matchMedia: () => ({ matches: device.reduced }), surface: gfx,
});
vm.runInContext(source('00_core.js').split('/* ---------- 画布 & 缩放 ---------- */')[0] + `
const resizeHooks=[];let VW=480,VH=270,PORTRAIT=false,scene='world',scriptRunning=false;
const Input={pointer:{},device:'keyboard',pressed:new Set(),hit(k){const yes=this.pressed.has(k);this.pressed.delete(k);return yes;}};
const reducedMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
`, context);
for (const file of ['20_art.js', '21_props.js', '22_art3.js', '30_world.js', '35_entities.js', '37_reactions.js', '40_ui.js']) vm.runInContext(source(file), context, { filename: file });
vm.runInContext(`
buildProps();buildProps3();buildWorld();setupNPCs();
globalThis.api={DialogScreen,openScreen,closeScreen,screens,Input,WHO,player,xa,npcs,makeReaction,reactionWorldActor,reactionPlacement,reactionBlockers,drawReaction,charFrame,
  setView(w,h,p){VW=w;VH=h;PORTRAIT=p;},setScene(v){scene=v;},setCam(x,y){cam.x=x;cam.y=y;},setDone(v){G.done=v;},setTime(v){worldT=v;},
  banners(chapter,region){chapterT=chapter;bannerT=region;bannerText='星灯小镇';},
  talking(){return talkingWho;}};
`, context);
const a = context.api;
function reset() { for (const s of [...a.screens]) a.closeScreen(s); a.setView(480,270,false); a.setScene('world'); a.setDone(1); a.setCam(0,0); a.setTime(0); a.banners(0,0); Object.assign(a.player,{x:220,y:155,dir:0,frame:0}); Object.assign(a.xa,{x:190,y:155}); a.Input.pressed.clear(); a.Input.pointer={}; device.reduced=false; }
function open(lines) { const d = new a.DialogScreen(lines); a.openScreen(d); return d; }
function advance(d) { a.Input.pressed.add('ok'); d.update(0); }
function caseOf(name, run) { reset(); run(); report.scenarios.push(name); }
const overlaps = (r,b) => r.x<b.x+b.w && r.x+r.w>b.x && r.y<b.y+b.h && r.y+r.h>b.y;
const emotions = ['surprise','anger','idea','sweat','joy','question'];

caseOf('Explicit metadata only; third item remains code; unknown values ignored',()=>{
  for (const line of [['me','哇！'],['me','生气、开心、疑问都只是台词。','idea'],['me','文本','',{emotion:'missing'}],['nobody','文本','',{emotion:'joy'}],['constructor','文本','',{emotion:'joy'}],['me','文本','',{emotion:'constructor'}]]) {
    const d=open([line]);assert.equal(d.reaction,null);if(line[2])assert.equal(d.code,line[2]);a.closeScreen(d);
  }
  const d=open([['me','先看这段代码。','let tea = 1;',{emotion:'idea'}]]);
  assert.equal(d.code,'let tea = 1;');assert.equal(d.reaction.emotion,'idea');
  assert.equal(d.layout().tw,new a.DialogScreen([['me','文字']]).layout().tw,'Metadata never changes text column width');
});
caseOf('Independent line lifetimes, paging and reflow never replay',()=>{
  const d=open([['me','这是一段会分页的完整台词。'.repeat(28),'',{emotion:'surprise'}],['xa','下一句。','',{emotion:'idea'}],['me','普通台词。']]);
  const cue=d.reaction;d.update(.4);assert.equal(cue.age,.4);assert.equal(d.page,0);
  advance(d);advance(d);assert.equal(d.page,1);assert.equal(d.reaction,cue);assert.equal(cue.age,.4);
  a.setView(260,400,true);d.reflow();assert.equal(d.reaction,cue);assert.equal(cue.age,.4);d.draw(gfx);assert.equal(cue.age,.4);
  d.update(1.3);assert.equal(d.reaction,null);d.reflow();assert.equal(d.reaction,null);
  d.next();assert.notEqual(d.reaction,cue);assert.equal(d.reaction.emotion,'idea');assert.equal(d.reaction.age,0);
  d.next();assert.equal(d.reaction,null);assert.equal(d.reactionMarked,false);
  d.next();assert.equal(a.screens.length,0);assert.equal(a.talking(),null);
});
caseOf('Cancel clears cue and speaker; closed dialogue cannot render an orphan',()=>{
  const d=open([['me','等等。','',{emotion:'question'}]]);assert.ok(d.reaction);a.closeScreen(d);assert.equal(d.reaction,null);assert.equal(a.talking(),null);assert.equal(a.reactionPlacement(d),null);
  const next=open([['xa','继续。']]);assert.equal(next.reaction,null);
});
caseOf('Real player, companion, NPC and WHO boss subtype anchors; absent speakers fall back',()=>{
  for(const who of ['me','xa']){const d=open([[who,'在这里。','',{emotion:'joy'}]]);const p=a.reactionPlacement(d);assert.equal(p.anchor,'world');const actor=a.reactionWorldActor(who,d);assert.ok(p.y+p.h<actor.head);a.closeScreen(d);}
  for(const [who,id] of [['chef',1],['fog',4],['ghost',9],['fox',15],['dragon',20],['fire',24],['boss',25]]){
    a.setDone(id);const npc=a.npcs.find(n=>n.id===id);a.setCam(npc.x-240,npc.y-170);
    const d=open([[who,'我在场。','',{emotion:'anger'}]]);const actor=a.reactionWorldActor(who,d);assert.equal(actor.x,240);assert.equal(a.reactionPlacement(d).anchor,'world');a.closeScreen(d);
  }
  a.setDone(27);a.setCam(0,0);const absent=open([['granny','从别处传来的话。','',{emotion:'joy'}]]);assert.equal(a.reactionPlacement(absent).anchor,'portrait');
  absent.next();const gone=open([['fog','已消失的怪物。','',{emotion:'anger'}]]);assert.equal(a.reactionWorldActor('fog',gone),null);assert.equal(a.reactionPlacement(gone).anchor,'portrait');
});
caseOf('HUD, banner, chapter card, dialogue and code occlusion choose portrait',()=>{
  const d=open([['me','看看上面。','',{emotion:'surprise'}]]), fresh=()=>{d.reaction=a.makeReaction('me',{emotion:'surprise'});};
  for(const y of [50,70,250,300]){fresh();a.player.y=y;assert.equal(a.reactionPlacement(d).anchor,'portrait','Occluded or off-screen player at '+y);}
  fresh();
  a.player.y=130;a.banners(0,2);assert.equal(a.reactionPlacement(d).anchor,'portrait','Area banner');
  fresh();a.player.y=155;a.banners(2,0);assert.equal(a.reactionPlacement(d).anchor,'portrait','Chapter card');
  fresh();a.banners(0,0);d.code='first line\nsecond line\nthird line\nfourth line';assert.equal(a.reactionPlacement(d).anchor,'portrait','Code covers the speaker');
});
caseOf('A fallback stays put when a banner expires or a rotation exposes the world',()=>{
  a.banners(2,0);const d=open([['me','这一句不换位置。','',{emotion:'idea'}]]);const cue=d.reaction;
  assert.equal(a.reactionPlacement(d).anchor,'portrait');a.banners(0,0);assert.equal(a.reactionPlacement(d).anchor,'portrait');assert.equal(d.reaction,cue);
  d.reaction=a.makeReaction('me',{emotion:'idea'});assert.equal(a.reactionPlacement(d).anchor,'world');
  a.setView(260,400,true);a.player.x=400;d.reflow();assert.equal(a.reactionPlacement(d).anchor,'portrait');
  a.setView(480,270,false);a.player.x=220;d.reflow();assert.equal(a.reactionPlacement(d).anchor,'portrait');assert.equal(d.reaction.age,0);
});
caseOf('Interior and non-world scenes never attach to an outdoor sprite',()=>{
  const interior={room:{resident:'test'},draw:noop};a.screens.push(interior);
  const d=open([['me','屋里暖和多了。','',{emotion:'joy'}]]);assert.equal(a.reactionPlacement(d).anchor,'portrait');
  a.closeScreen(interior);for(const scene of ['intro','ending','title']){a.setScene(scene);assert.equal(a.reactionPlacement(d).anchor,'portrait');}
});
caseOf('Reduced motion is pixel-identical through lifetime; no font glyphs or flashing',()=>{
  device.reduced=true;const signatures=new Set();
  for(const emotion of emotions){const d=open([['me','明确的情绪。','',{emotion}]]);gfx.pixels=[];gfx.text=[];d.reaction.age=.05;a.drawReaction(gfx,d,d.layout());const first=JSON.stringify(gfx.pixels);d.reaction.age=1.25;gfx.pixels=[];a.drawReaction(gfx,d,d.layout());assert.equal(JSON.stringify(gfx.pixels),first);assert.ok(gfx.pixels.every(p=>p.alpha===1));assert.equal(gfx.text.length,0,'Emotion art must not use emoji or font rendering');signatures.add(first);a.closeScreen(d);}
  assert.equal(signatures.size,6,'Each emotion has distinct pixel geometry');
});
caseOf('Real canvas sizes, six emotions, header/code spacing and complete pixel bounds',()=>{
  for(const [w,h,portrait]of [[420,250,false],[480,270,false],[600,340,false],[260,400,true],[270,480,true],[292,633,true],[360,720,true]]){
    a.setView(w,h,portrait);report.layouts++;
    for(const emotion of emotions)for(const code of ['', 'let tea = 1;\nserve(tea);'])for(const age of [0,.1,.3,1.5]){
      // Force an interior fallback so every header/portrait configuration is exercised.
      a.setScene('intro');const d=open([['me','字不能被表情挡住。',code,{emotion}]]);d.reaction.age=age;const L=d.layout(),p=a.reactionPlacement(d);
      const face={x:L.x+7,y:L.y+Math.round((L.h-L.ps)/2),w:L.ps,h:L.ps};
      const body={x:L.tx,y:L.y+9,w:L.tw,h:L.h-18};
      const name={x:L.nameX,y:L.y-14,w:metrics('不响')+16,h:18};
      const occupied=a.reactionBlockers(d,L).filter(b=>b.y<L.y).concat(face,body,name);
      gfx.pixels=[];a.drawReaction(gfx,d,L);assert.ok(gfx.pixels.length>0);
      for(const r of gfx.pixels){report.pixelChecks++;assert.ok([r.x,r.y,r.w,r.h].every(Number.isInteger));assert.ok(r.x>=0&&r.y>=0&&r.x+r.w<=w&&r.y+r.h<=h,'Pixel outside canvas');assert.ok(!occupied.some(b=>overlaps(r,b)),'Pixel touches face, text, code or header');assert.ok(r.x>=p.x&&r.x+r.w<=p.x+p.w&&r.y>=p.y&&r.y+r.h<=p.y+p.h+3);}
      d.draw(gfx);a.closeScreen(d);
    }
  }
});
report.passed=true;
report.limitations='Recording Canvas verifies lifecycle, actual sprite anchors and geometry; visual taste and real-device rendering still require browser screenshots.';
const output=process.argv.indexOf('--output');
if(output>=0){const dest=path.resolve(root,process.argv[output+1]);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify(report,null,2));
