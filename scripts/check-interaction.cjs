#!/usr/bin/env node
'use strict';
// Real input handlers, real map/collision and real frame loop with recording DOM/Canvas.
// Does not open a browser or touch the user's localStorage.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = n => fs.readFileSync(path.join(root, 'source/src', n), 'utf8');
const noop = () => {};
function surface() {
  return new Proxy({ createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h }), createRadialGradient: () => ({ addColorStop: noop }), measureText: s => ({ width: [...s].length * 12 }) }, { get: (o, k) => k in o ? o[k] : noop });
}
function element() {
  const listeners = new Map(), classes = new Set(), captures = new Set(), gfx = surface();
  return { style: {}, width: 480, height: 270, dataset: {}, hidden: false,
    addEventListener(k, fn) { if (!listeners.has(k)) listeners.set(k, []); listeners.get(k).push(fn); },
    fire(k, props = {}) { const e = { type: k, pointerId: 1, pointerType: 'touch', button: 0, preventDefault: noop, target: this, ...props }; for (const fn of listeners.get(k) || []) fn(e); },
    getContext: () => gfx, getBoundingClientRect: () => ({ left: 0, top: 0, width: 480, height: 270 }),
    setPointerCapture: id => captures.add(id), hasPointerCapture: id => captures.has(id), releasePointerCapture: id => captures.delete(id),
    classList: { add: s => classes.add(s), remove: s => classes.delete(s), contains: s => classes.has(s) },
  };
}
const win = Object.assign(element(), { innerWidth: 960, innerHeight: 540, devicePixelRatio: 1 });
const cv = element(), touch = element(), buttons = ['up', 'down', 'left', 'right', 'ok', 'run'].map(k => Object.assign(element(), { dataset: { k } }));
const doc = Object.assign(element(), { hidden: false, createElement: element, querySelector: s => s === '#game' ? cv : touch, querySelectorAll: () => buttons });
const storage = new Map(), sound = [], renders = [], report = { passed: false };
const context = vm.createContext({ assert, console, performance, setTimeout, clearTimeout, URLSearchParams, location: { search: '' }, window: win, document: doc, matchMedia: () => ({ matches: true }), requestAnimationFrame: noop,
  localStorage: { getItem: k => storage.get(k) || null, setItem: (k, v) => storage.set(k, v), removeItem: k => storage.delete(k) },
  Audio: { unlock: noop, sfx: (...a) => sound.push(a), play: noop }, sound, report, renders,
});
for (const n of ['00_core.js', '20_art.js', '21_props.js', '22_art3.js', '30_world.js', '35_entities.js', '36_ambient.js']) vm.runInContext(read(n), context, { filename: n });
vm.runInContext(`
const screens=[],WHO={},fx={shake:0,flash:0,fade:0},txt=()=>{},textW=s=>[...s].length*12;
const topScreen=()=>screens.at(-1),drawToasts=()=>{},toast=()=>{};
class PauseScreen{};class JournalScreen{};class GuideScreen{};class SoundScreen{};class SaveScreen{};class GlossaryScreen{};class EndScreen{};class InteriorScreen{};
const TERMS=[{id:'prompt'}],HIDDEN=[{id:'cache'}],ACH=[{id:'home'}];
const COMICS={arrival:{}},INTERIORS={cafe:{spots:[{id:'tea'}]}},RESIDENTS={maker:{}};
`, context);
vm.runInContext(read('70_main.js').replace(/\nboot\(\);\s*$/, '\n'), context, { filename: '70_main.js' });
vm.runInContext('setupTouch();', context);

// Two physical keys or two fingers owning the same direction must release independently.
win.fire('keydown', { code: 'ArrowRight' }); win.fire('keydown', { code: 'KeyD' }); win.fire('keyup', { code: 'ArrowRight' });
assert.equal(vm.runInContext('Input.held.right', context), true);
win.fire('keyup', { code: 'KeyD' }); assert.equal(vm.runInContext('Input.held.right', context), false);
buttons[3].fire('pointerdown', { pointerId: 11 }); buttons[3].fire('pointerdown', { pointerId: 12 }); buttons[3].fire('pointerup', { pointerId: 11 });
assert.equal(vm.runInContext('Input.held.right', context), true); assert.ok(buttons[3].classList.contains('on'));
buttons[3].fire('pointercancel', { pointerId: 12 }); assert.equal(vm.runInContext('Input.held.right', context), false); assert.ok(!buttons[3].classList.contains('on'));
buttons[0].fire('pointerdown', { pointerId: 21 }); buttons[4].fire('pointerdown', { pointerId: 22 });
vm.runInContext("assert.ok(Input.held.up && Input.held.ok); assert.ok(Input.hit('ok'));", context);
buttons[4].fire('lostpointercapture', { pointerId: 22 }); assert.equal(vm.runInContext('Input.held.up && !Input.held.ok', context), true);
buttons[5].fire('pointerdown', { pointerId: 23 }); win.fire('pointerup', { pointerId: 23 }); assert.equal(vm.runInContext('Input.held.run', context), false);
win.fire('blur'); assert.equal(vm.runInContext('Object.values(Input.held).some(Boolean)', context), false); assert.ok(!buttons[0].classList.contains('on'));
buttons[1].fire('pointerdown', { pointerId: 31 }); vm.runInContext('resize();', context); assert.equal(vm.runInContext('Input.held.down', context), false);
win.fire('keydown', { code: 'KeyD', target: { tagName: 'INPUT' } }); assert.equal(vm.runInContext('Input.held.right', context), false);
cv.fire('pointerdown', { pointerType: 'mouse', button: 2 }); assert.equal(vm.runInContext('Input.pointer.click', context), null);
report.input = 'key ownership, multi-touch, cancel, lost capture, blur, resize, editable fields, secondary mouse button passed';

vm.runInContext(`
buildProps();buildProps3();buildWorld();setupNPCs();setupAmbientInteractions();
const counts={};for(const a of ambientActors)counts[a.kind]=(counts[a.kind]||0)+1;
assert.ok(counts.cat && counts.hen && counts.pondduck && counts.butterfly && counts.flowerbed && counts.bench && counts.lamp);
assert.ok(ambientActors.length<objects.length/3,'Do not turn each tile or tree into an interaction');
const untouched=JSON.stringify(G);const pet=ambientActors.find(a=>a.kind==='cat');
assert.ok(runAmbientInteraction(pet));assert.ok(ambientFeedback.text.length<24);assert.equal(screens.length,0);assert.equal(JSON.stringify(G),untouched);
assert.equal(runAmbientInteraction(pet),false,'Debounce repeated taps');updateAmbient(.1);assert.ok(ambientOffset(pet.source)<0);updateAmbient(3);assert.equal(ambientFeedback,null);
scene='world';G.done=NZ;const keyTarget=ambientActors.find(a=>{const p=ambientPosition(a);player.x=p.x;player.y=p.y+20;return interactTarget()?.a===a;});assert.ok(keyTarget);Input.pressed.add('ok');worldInput();assert.ok(ambientFeedback);assert.equal(scriptRunning,false);assert.equal(screens.length,0);updateAmbient(3);
for(const [w,h]of [[260,400],[270,480],[360,720],[420,250],[600,340]]){VW=w;VH=h;for(const a of ambientActors){runAmbientInteraction(a);const p=ambientPosition(a);cam.x=p.x-w/2;cam.y=p.y-h/2;assert.ok(textW(ambientFeedback.text)+10<w);drawAmbientFeedback(ctx,cam.x,cam.y);updateAmbient(3);}}
VW=480;VH=270;cam={x:0,y:0};
G.done=NZ;let reachableAmbient=0;const inaccessible=[];
for(const a of ambientActors){const p=ambientPosition(a);let found=false;
  for(let y=p.y-a.range+1;y<p.y+a.range && !found;y+=4)for(let x=p.x-a.range+1;x<p.x+a.range;x+=4){if(blocked(x,y)||Math.hypot(x-p.x,y-p.y)>=a.range)continue;player.x=x;player.y=y;const hit=interactTarget({x:p.x-cam.x,y:p.y-cam.y-3});if(hit?.a===a){found=true;break;}}
  if(found)reachableAmbient++;else inaccessible.push({kind:a.kind,z:a.z,x:p.x,y:p.y});
}
assert.ok(reachableAmbient/ambientActors.length>.95,JSON.stringify(inaccessible));
// Inject a pet exactly behind the active quest interaction: NPC and doors keep their priority.
G.done=0;const n=npcs[0];player.x=n.x;player.y=n.y+20;
const fake={source:{x:player.x,y:player.y},kind:'cat',z:0,phase:0,height:19,width:23,range:30,label:'摸摸',count:0};ambientActors.unshift(fake);
assert.equal(interactTarget().n,n);
const doorway={x:player.x,y:player.y,interact:{type:'interior',key:'test',z:0}};objects.push(doorway);player.x+=10;assert.equal(interactTarget().o,doorway);objects.pop();ambientActors.shift();
// Nearby clicked animal must be selected, not the nearest unrelated object.
G.done=NZ;player.x=pet.source.x;player.y=pet.source.y+20;const pp=ambientPosition(pet);cam.x=pet.source.x-150;cam.y=0;
assert.equal(interactTarget({x:pp.x-cam.x,y:pp.y-5}).a,pet);
player.x+=200;assert.equal(interactTarget({x:pp.x-cam.x,y:pp.y-5}),null,'Far-away clicking does not teleport interaction');
report.ambient={counts,total:ambientActors.length,reachable:reachableAmbient,inaccessible};
// A malformed optional field must not crash the journal, hats, resident conversations, or collision.
for(const invalid of [null,[],{done:-1,terms:[]},{done:1.5,terms:[]},{done:NZ+1,terms:[]},{done:0,terms:null}])assert.equal(normalizeSave(invalid),null);
for(let done=0;done<=NZ;done++){const repaired=normalizeSave({done,terms:['prompt','prompt','fake',123],ach:'broken',hats:['straw','fake'],hat:'fake',side:{bad:true},signs:[-1,0,0,27],residentVisits:{'safe:before':2,'bad:after':-1,'__proto__':9},px:Infinity,py:-40,wrong:-9,t:'abc'});assert.ok(repaired);assert.deepEqual(repaired.terms,['prompt']);assert.deepEqual(repaired.ach,[]);assert.equal(repaired.hat,'');assert.deepEqual(repaired.side,[]);assert.equal(repaired.residentVisits['safe:before'],2);assert.equal(repaired.residentVisits['bad:after'],undefined);assert.equal(repaired.t,0);assert.equal(repaired.wrong,0);assert.equal(blocked(repaired.px,repaired.py,done),null,'Repaired spawn '+done);assert.ok(repaired.px<(Math.min(done,NZ-1)+1)*ZW*TILE);}
const old=normalizeSave({done:2,terms:['prompt'],px:6*TILE,py:15*TILE-2});assert.equal(old.version,4);assert.equal(old.px,6*TILE);assert.ok(Array.isArray(old.roomsVisited));
const badStats=normalizeSave({done:0,terms:[],comics:['arrival','missing'],roomsVisited:['cafe','missing'],keepsakes:['cafe:tea','missing'],residentsSeen:['maker','missing']});assert.deepEqual(badStats.comics,['arrival']);assert.deepEqual(badStats.roomsVisited,['cafe']);assert.deepEqual(badStats.keepsakes,['cafe:tea']);assert.deepEqual(badStats.residentsSeen,['maker']);
localStorage.setItem(SAVE_KEY,'{broken');assert.equal(loadSave(),null);
G=freshState();player.x=96;player.y=238;assert.ok(save());assert.ok(loadSave());
const realSet=localStorage.setItem;localStorage.setItem=()=>{throw new Error('quota')};assert.equal(save(true),false);localStorage.setItem=realSet;
report.save='invalid required fields rejected; optional fields repaired; 28 safe progress-aware spawns; old schema preserved; parse/quota errors passed';
// Exercise the actual frame state boundary without a browser animation timer.
drawWorld=()=>{};drawRoom=()=>{};drawParts=()=>{};updateParts=()=>{};drawPrompt=()=>{};
const realUpdate=updateWorld;updateWorld=(dt,free)=>renders.push({dt,free,right:!!Input.held.right});
scene='world';worldReady=false;frame.previousScene=scene;frame.previousTop=undefined;Input.reset();
worldInput=()=>screens.push({update(){},draw(){}});Input.set('right','test',true);frame(performance.now()+16);
assert.equal(renders.at(-1).free,false,'Opening modal cannot allow movement in the same frame');assert.equal(Input.held.right,false);
const elapsed=G.t;document.hidden=true;Input.set('right','test',true);const before=renders.length;frame(performance.now()+20000);assert.equal(renders.length,before);assert.equal(G.t,elapsed);assert.equal(Input.held.right,false);
document.hidden=false;frame(performance.now()+20010);assert.equal(renders.at(-1).dt,0,'First resumed frame does not leap forward');
report.frame='modal transition, hidden tab pause, resumed zero-delta passed';
report.passed=true;
`, context);
const js = fs.readdirSync(path.join(root, 'source/src')).filter(n => n.endsWith('.js')).sort();
assert.equal(js.indexOf('36_ambient.js'), js.indexOf('35_entities.js') + 1);
report.buildOrder = '36_ambient.js sorts after entities and before UI';
console.log(JSON.stringify(report, null, 2));
