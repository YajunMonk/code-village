#!/usr/bin/env node
'use strict';
// Tests the real world collision, Canvas UI, room state and resident dialogue code.
// Uses a recording Canvas and isolated in-memory storage; never opens or edits a browser save.
// Run: node scripts/check-interiors.cjs [--output artifacts/qa/interiors-check.json]
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const source = name => fs.readFileSync(path.join(root, 'source/src', name), 'utf8');
const noop = () => {};
const metrics = text => [...String(text)].reduce((n, c) => n + (c.codePointAt(0) > 127 && !'¥·×'.includes(c) ? 12 : 6), 0);
const trace = { text: [], inButton: 0, talks: [], draws: 0, checks: 0, failures: [], label: '', portals: [], rooms: [] };
const check = (ok, message, detail = '') => { trace.checks++; if (!ok) trace.failures.push(`${trace.label}: ${message}${detail ? ' — ' + detail : ''}`); };
function gfx() {
  return new Proxy({
    createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h }),
    getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h }),
    putImageData(image) { this.image = image; },
    measureText: text => ({ width: metrics(text) }),
    createRadialGradient: () => ({ addColorStop: noop }), createLinearGradient: () => ({ addColorStop: noop }),
    drawImage(image) { if (!image) throw new Error('drawImage called with an empty image'); },
  }, { get: (o, k) => k in o ? o[k] : noop });
}
function canvas() { const ctx = gfx(); return { getContext: () => ctx }; }
const storage = new Map();
const assetDimensions = {};
const assetManifest = JSON.parse(fs.readFileSync(path.join(root, 'source/assets/manifest.json'), 'utf8'));
for (const [key, filename] of Object.entries(assetManifest)) {
  const png = fs.readFileSync(path.join(root, 'source/assets', filename));
  assetDimensions[key] = { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}
const context = vm.createContext({
  console, performance, trace, check, assetDimensions, ASSET_DATA: assetManifest, setTimeout, clearTimeout,
  document: { createElement: canvas, addEventListener: noop }, window: { addEventListener: noop },
  localStorage: { setItem: (k, v) => storage.set(k, v), getItem: k => storage.get(k) || null, removeItem: k => storage.delete(k) },
  Audio: { sfx: noop, play: noop }, matchMedia: () => ({ matches: true }),
  mockTalk: async lines => { trace.talks.push(JSON.parse(JSON.stringify(lines))); }, surface: gfx(),
});
vm.runInContext(source('00_core.js').split('/* ---------- 画布 & 缩放 ---------- */')[0] + `
const resizeHooks=[];let VW=480,VH=270,PORTRAIT=false,TOUCH=false,scene='world',scriptRunning=false;
const cv=makeCanvas(VW,VH)[0];
const Input={device:'kb',held:{up:false,down:false,left:false,right:false},pointer:{},pressed:new Set(),hit(k){if(this.pressed.has(k)){this.pressed.delete(k);return true;}return false;}};
`, context);
for (const name of ['20_art.js', '21_props.js', '22_art3.js', '30_world.js', '35_entities.js', '37_reactions.js']) vm.runInContext(source(name), context, { filename: name });
vm.runInContext(source('40_ui.js').replace(/^const talk = .*$/m, 'const talk = mockTalk;'), context, { filename: '40_ui.js' });
vm.runInContext(source('55_journal.js').split('const CHAPTER_TONE')[0], context, { filename: '55_journal-art.js' });
for (const name of ['56_interiors.js', '57_residents.js']) vm.runInContext(source(name), context, { filename: name });
vm.runInContext(`
Object.assign(ART,assetDimensions);
const realTxt=txt,realLines=drawLines,realButton=Btn.prototype.draw;
txt=function(g,s,x,y,c,opts={}){if(!trace.inButton){const w=textW(s),align=opts.align||'left';trace.text.push({text:s,x:align==='center'?Math.round(x-w/2):align==='right'?x-w:x,y,w,h:12});}return realTxt(g,s,x,y,c,opts);};
drawLines=function(g,lines,x,y,opts={}){if(!trace.inButton){const actual=lines.filter(l=>l.length);if(actual.length)trace.text.push({text:actual.map(l=>l.map(t=>t.ch).join('')).join(''),x,y,w:Math.max(...actual.map(l=>l.reduce((n,t)=>n+cw(t.ch),0))),h:(lines.length-1)*(opts.lh||LH)+12});}return realLines(g,lines,x,y,opts);};
Btn.prototype.draw=function(...args){trace.inButton++;try{return realButton.apply(this,args);}finally{trace.inButton--;}};
function rectanglesOverlap(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;}
function boundsOK(r){return r.x>=-1&&r.y>=-1&&r.x+r.w<=VW+1&&r.y+r.h<=VH+1;}
function renderInterior(screen,label){
 trace.label=VW+'x'+VH+' '+label;trace.text=[];
 try{screen.draw(surface);trace.draws++;}catch(e){check(false,'draw threw',e.stack);return;}
 const buttons=screen.btns.filter(b=>!b.hidden);
 for(const b of buttons){check(boundsOK(b),'button outside canvas',b.label);check(textW(b.label)<=b.w-8,'button label exceeds available width',b.label);}
 for(let i=0;i<buttons.length;i++)for(let j=i+1;j<buttons.length;j++)check(!rectanglesOverlap(buttons[i],buttons[j]),'buttons overlap',buttons[i].label+' / '+buttons[j].label);
 for(const t of trace.text){check(boundsOK(t),'text outside canvas',t.text);for(const b of buttons)check(!rectanglesOverlap(t,b),'body text overlaps control',t.text+' / '+b.label);}
 for(let i=0;i<trace.text.length;i++)for(let j=i+1;j<trace.text.length;j++)check(!rectanglesOverlap(trace.text[i],trace.text[j]),'text blocks overlap',trace.text[i].text+' / '+trace.text[j].text);
 const box=screen.imageBox;if(box){check(boundsOK(box),'image outside canvas');const art=ART[screen.room.art];check(Math.abs(box.w/box.h-art.width/art.height)<.025,'background preserves full-image aspect ratio');}
}
function reachableZone(zone,door){
 const x0=zone*ZW*TILE,queue=[[x0+36,ROAD*TILE+20]],seen=new Set();let selected=null;
 for(let head=0;head<queue.length;head++){
  const [x,y]=queue[head];
  if(Math.hypot(x-door.x,y-door.y)<24){player.x=x;player.y=y;const hit=interactTarget();if(hit&&hit.type==='sign'&&hit.o===door){selected={x,y};break;}}
  for(const [dx,dy]of [[4,0],[-4,0],[0,4],[0,-4]]){const nx=x+dx,ny=y+dy,key=nx+','+ny;if(nx<x0+8||nx>x0+(ZW-1)*TILE-8||ny<4*TILE+4||ny>26*TILE-4||seen.has(key)||blocked(nx,ny))continue;seen.add(key);queue.push([nx,ny]);}
 }
 return {selected,cells:seen.size};
}
buildProps();buildProps3();buildWorld();setupNPCs();setupInteriors();
trace.label='Room registration';
check(Object.keys(INTERIORS).length===18,'18 interiors');check(Object.keys(RESIDENTS).length===12,'12 residents');
const houses=objects.filter(o=>o.kind==='house');let doors=objects.filter(o=>o.kind==='interiorDoor');
check(doors.length===18,'18 room portals');check(houses.length===17,'17 house sprites');
for(const h of houses)check(doors.filter(d=>Math.hypot(d.x-h.doorWorld.x,d.y-h.doorWorld.y)<1).length===1,'each house has exactly one portal',String(h.x));
setupInteriors();doors=objects.filter(o=>o.kind==='interiorDoor');check(doors.length===18,'setup is idempotent without duplicate portals');
const homes=Object.entries(INTERIORS).filter(([,r])=>r.resident);
check(homes.length===12,'12 occupied homes');check(Object.keys(INTERIORS).length-homes.length===6,'6 empty rooms');
for(const [key,resident] of Object.entries(RESIDENTS)){
 check(homes.filter(([,r])=>r.resident===key).length===1,'resident has one home',key);
 const who=WHO['resident_'+key];check(who&&who.n===resident.name&&who.id===resident.avatar,'registered voice uses the new portrait',key);check(!!CHAR[resident.avatar],'avatar exists',resident.avatar);
 for(const phase of [0,27])for(let i=0;i<(phase?resident.after:resident.lines).length;i++)for(const [speaker,text]of residentConversation(key,i,phase)){check(!!WHO[speaker],'resident dialogue speaker registered',speaker);check(typeof text==='string'&&text.length>0,'resident line nonempty',key);}
}
for(const [key,room]of Object.entries(INTERIORS)){check(room.spots.length===3,'three objects per room',key);check(!!ART[room.art],'room has an actual local art asset',key);}
const keepsakeIds=Object.entries(INTERIORS).flatMap(([key,room])=>room.spots.map(s=>key+':'+s.id));check(keepsakeIds.length===54&&new Set(keepsakeIds).size===54,'54 unique keepsake identifiers');
for(const door of doors){
 G.done=door.interact.z;trace.label='Door '+door.interact.key;
 check(!door.img&&typeof door.draw==='function'&&!door.solid,'portal is drawable and has no image/collision');
 check(!blocked(door.x,door.y),'doorway itself is walkable');
 const route=reachableZone(door.interact.z,door);check(!!route.selected,'door can be selected by walking from its district road');
 trace.portals.push({key:door.interact.key,zone:door.interact.z,reachable:!!route.selected,interactionPosition:route.selected});
}
// Check the real depth-sorted world rendering with image-less portal objects.
for(const chunk of ground.chunks){chunk.done=true;chunk.canvas=makeCanvas(CW_PX,MAPH)[0];}
initClouds();resizeHooks.forEach(hook=>hook());G.done=27;
for(const door of doors){trace.label='World portal draw '+door.interact.key;cam.x=door.interact.z*ZW*TILE;cam.y=80;try{drawWorld(surface,.016);check(true,'world draws blank portal');}catch(e){check(false,'world draw threw',e.message);}}
globalThis.interiorTestAPI={INTERIORS,RESIDENTS,InteriorScreen,DialogScreen,Input,WHO};
`, context, { timeout: 30000 });

async function main() {
  await vm.runInContext(`(async()=>{
    trace.label='Progress gating';
    for(const [key,room]of Object.entries(INTERIORS)){
      screens.length=0;G.done=room.zone-1;const before=G.roomsVisited.length;await openInterior(key);
      check(screens.length===0,'locked room cannot open',key);check(G.roomsVisited.length===before,'locked room cannot record a visit',key);
      G.done=room.zone;const opening=openInterior(key);
      // Allow pending loading microtasks, without bypassing the real openInterior guard and lifecycle.
      await new Promise(resolve=>setTimeout(resolve,0));
      check(topScreen() instanceof InteriorScreen&&topScreen().key===key,'reached room opens',key);
      const current=topScreen();await openInterior(key);check(screens.length===1,'cannot stack another room while inside');closeScreen(current);await opening;
    }
    G=freshState();G.done=26;
    for(const [key,room]of Object.entries(INTERIORS)){
      const s=new InteriorScreen(key);for(let i=0;i<3;i++){await s.inspect(i);await s.inspect(i);}
      check(roomCollected(key)===3,'all three keepsakes collected',key);check(!s.busy,'inspect releases busy state',key);
      if(room.resident){const r=RESIDENTS[room.resident];for(let i=0;i<r.lines.length+1;i++)await s.chat();check(G.residentVisits[room.resident+':before']===r.lines.length+1,'before-story conversation cycles persist',room.resident);}
    }
    G.done=27;
    for(const [key,room]of Object.entries(INTERIORS))if(room.resident){const s=new InteriorScreen(key),r=RESIDENTS[room.resident];for(let i=0;i<r.after.length+1;i++)await s.chat();check(G.residentVisits[room.resident+':after']===r.after.length+1,'after-story conversation cycles persist',room.resident);}
    trace.label='Saved room state';check(G.roomsVisited.length===18&&new Set(G.roomsVisited).size===18,'18 unique visited rooms');check(G.keepsakes.length===54&&new Set(G.keepsakes).size===54,'repeated inspections do not duplicate keepsakes');check(G.residentsSeen.length===12&&new Set(G.residentsSeen).size===12,'12 unique resident visitors');
    check(save(true),'room progress saves');const loaded=loadSave();
    for(const key of ['roomsVisited','keepsakes','residentsSeen','residentVisits'])check(JSON.stringify(G[key])===JSON.stringify(loaded[key]),'save/readback retains '+key);
    // Older valid saves may omit the newly added room fields.
    G={done:27,terms:[],side:[],ach:[],hats:[],signs:[]};const old=new InteriorScreen('pantry');await old.inspect(0);await old.chat();check(Array.isArray(G.roomsVisited)&&Array.isArray(G.keepsakes)&&Array.isArray(G.residentsSeen)&&!!G.residentVisits,'old save migrates lazily');
  })()`, context, { timeout: 30000 });

  vm.runInContext(`
  for(const [w,h,p]of [[420,250,false],[480,270,false],[260,400,true],[270,480,true]]){
    VW=w;VH=h;PORTRAIT=p;G.done=27;
    for(const [key,room]of Object.entries(INTERIORS)){
      const s=new InteriorScreen(key);renderInterior(s,key);trace.rooms.push({key,width:w,height:h,buttons:s.btns.length});
      trace.label=w+'x'+h+' movement '+key;
      for(const [name,expectedX,expectedY]of [['left',.23,null],['right',.72,null],['up',null,.55],['down',null,.84]]){
        Input.held[name]=true;for(let i=0;i<90;i++)s.update(.1);Input.held[name]=false;
        if(expectedX!==null)check(Math.abs(s.walk.x-expectedX)<.0001,'horizontal movement clamps at floor boundary');
        if(expectedY!==null)check(Math.abs(s.walk.y-expectedY)<.0001,'vertical movement clamps at floor boundary');
      }
      const b=s.imageBox;Input.pointer.click={x:b.x+.68*b.w,y:b.y+.81*b.h};s.update(.016);Input.pointer.click=null;for(let i=0;i<150;i++)s.update(.05);
      check(Math.hypot(s.walk.x-.68,s.walk.y-.81)<.025,'floor click walks to target');
      // Dispatch through real update(), so a resident's hit area cannot steal an item tap.
      const originalInspect=s.inspect,originalChat=s.chat;let tapped=null;
      s.inspect=i=>{tapped='spot:'+i;};s.chat=()=>{tapped='resident';};
      room.spots.forEach((spot,i)=>{tapped=null;Input.pointer.click={x:b.x+spot.x*b.w,y:b.y+spot.y*b.h};s.update(.016);check(tapped==='spot:'+i,'item hotspot routes to its own story',spot.name);});
      if(room.resident){tapped=null;Input.pointer.click={x:b.x+.39*b.w,y:b.y+.68*b.h};s.update(.016);check(tapped==='resident','resident hotspot opens conversation');}
      for(let i=0;i<s.btns.length-1;i++){const button=s.btns[i];tapped=null;Input.pointer.click={x:button.x+button.w/2,y:button.y+button.h/2};s.update(.016);check(tapped===(button.resident?'resident':'spot:'+i),'action button routes to intended interaction',button.label);}
      Input.pointer.click=null;s.inspect=originalInspect;s.chat=originalChat;
      const outsideX=s.walk.x,outsideY=s.walk.y;Input.pointer.click={x:b.x+.99*b.w,y:b.y+.99*b.h};s.update(.016);Input.pointer.click=null;check(!s.target&&s.walk.x===outsideX&&s.walk.y===outsideY,'clicking beyond floor cannot move player');
      const oldFocus=s.focus;Input.pressed.add('note');s.update(.016);check(s.focus===(oldFocus+1)%s.btns.length,'Tab/note cycles focus');
      let exits=0;const originalClose=closeScreen;closeScreen=()=>{exits++;};Input.pressed.add('back');s.update(.016);closeScreen=originalClose;check(exits===1,'back exits room');
      s.walk.moving=true;s.walk.t=.3;renderInterior(s,key+' walking');
    }
    // Every collected resident line is also rendered with its actual portrait and wrap/pagination.
    for(const lines of trace.talks.filter(lines=>Array.isArray(lines[0]))){
      const d=new DialogScreen(lines);for(let i=0;i<lines.length;i++){if(i)d.next();for(let page=0;page<d.pages.length;page++){
        d.page=page;d.n=Infinity;trace.label=w+'x'+h+' resident dialog '+i;trace.text=[];
        try{d.draw(surface);trace.draws++;for(const t of trace.text)check(boundsOK(t),'dialog text outside canvas',t.text);}catch(e){check(false,'dialog draw threw',e.message);}
      }}
    }
  }
  `, context, { timeout: 30000 });

  const report = {
    passed: trace.failures.length === 0, roomCount: Object.keys(context.interiorTestAPI.INTERIORS).length,
    residents: Object.keys(context.interiorTestAPI.RESIDENTS).length, vacantRooms: 6,
    keepsakes: 54, checks: trace.checks, canvasRenders: trace.draws, responsiveRoomLayouts: trace.rooms.length,
    portals: trace.portals, assets: assetDimensions, failures: [...new Set(trace.failures)],
    sourceSha256: Object.fromEntries(['35_entities.js','40_ui.js','56_interiors.js','57_residents.js'].map(name=>[name,crypto.createHash('sha256').update(source(name)).digest('hex')])),
    limitation: 'Recording Canvas uses Fusion Pixel grid metrics and actual PNG dimensions. It validates runtime, layout, collision and persistence, not artistic acceptance.'
  };
  const outputArg = process.argv.indexOf('--output');
  const output = path.resolve(root, outputArg >= 0 ? process.argv[outputArg + 1] : 'artifacts/qa/interiors-check.json');
  fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  console.log(`${report.passed ? 'PASS' : 'FAIL'}: ${report.roomCount} rooms, ${report.residents} residents, ${report.responsiveRoomLayouts} responsive room layouts, ${report.canvasRenders} renders, ${report.checks} checks.`);
  for (const failure of report.failures.slice(0, 40)) console.log('- ' + failure);
  console.log('Report: ' + output);
  if (!report.passed) process.exitCode = 1;
}
main().catch(error => { console.error(error.stack); process.exitCode = 1; });
