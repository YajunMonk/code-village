#!/usr/bin/env node
'use strict';
// Real collision map + real resize/enterWorld/updateWorld. CSS supplies deck geometry.
// Recording DOM/Canvas; no browser save, source or build artifacts are changed.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),read=n=>fs.readFileSync(path.join(root,'source/src',n),'utf8'),noop=()=>{};
const css=read('shell.html').match(/<style>([\s\S]*?)<\/style>/)[1];
function block(marker){const at=css.indexOf(marker);assert.ok(at>=0,marker);const start=css.indexOf('{',at);let depth=1,end=start+1;for(;depth;end++){if(css[end]==='{')depth++;if(css[end]==='}')depth--;}return css.slice(start+1,end-1);}
function rule(text){const body=text.match(/(?:^|\n)\s*#touch\s*\{([^}]+)\}/)[1];return Object.fromEntries(body.split(';').map(s=>s.trim()).filter(Boolean).map(s=>{const p=s.indexOf(':');return[s.slice(0,p),s.slice(p+1).trim()]}));}
const portrait=rule(block('@media (max-aspect-ratio: 25/27) {')),short=rule(block('@media (max-aspect-ratio: 25/27) and (max-height: 520px)'));
const device={w:390,h:844,dpr:3,bottom:0,coarse:true},dom={styles:0,rects:0};
function deckHeight(){if(!device.coarse||device.h<=device.w*1.08)return 0;const vars={...portrait,...(device.h<=520?short:{})};function number(s){return Function('clamp','return '+s.replace(/var\((--[^)]+)\)/g,(_,k)=>'('+number(vars[k])+')').replace(/env\(safe-area-inset-bottom\)/g,device.bottom).replace(/([\d.]+)v([wh])/g,(_,n,k)=>+n*(k==='w'?device.w:device.h)/100).replace(/px/g,'').replace(/calc\(/g,'('))((a,b,c)=>Math.max(a,Math.min(b,c)));}return number(vars.height);}
function gfx(){return new Proxy({createImageData:(w,h)=>({width:w,height:h,data:new Uint8ClampedArray(w*h*4)}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:noop});}
function canvas(){const g=gfx();return{width:1,height:1,style:{},addEventListener:noop,getContext:()=>g};}
const cv=canvas(),touch={hidden:true};
cv.getBoundingClientRect=()=>{dom.rects++;const width=parseFloat(cv.style.width),height=parseFloat(cv.style.height);return{left:(device.w-width)/2,top:(device.h-height)/2,width,height,bottom:(device.h+height)/2}};
const win={addEventListener:noop,get innerWidth(){return device.w},get innerHeight(){return device.h},get devicePixelRatio(){return device.dpr}};
const ctx=vm.createContext({assert,console,performance,window:win,document:{querySelector:s=>s==='#game'?cv:touch,createElement:canvas,addEventListener:noop},getComputedStyle:()=>{dom.styles++;return{height:deckHeight()+'px'}},matchMedia:()=>({matches:device.coarse}),URLSearchParams,location:{search:''},Audio:{play:noop,sfx:noop,music:false},requestAnimationFrame:noop});
for(const name of ['00_core.js','20_art.js','21_props.js','22_art3.js','30_world.js','35_entities.js'])vm.runInContext(read(name),ctx,{filename:name});
vm.runInContext(read('70_main.js').replace(/\nboot\(\);\s*$/,'\n'),ctx,{filename:'70_main.js'});
vm.runInContext('buildProps();buildProps3();buildWorld();setupNPCs();ambientParticles=()=>{};updateParts=()=>{};bakeIdle=()=>{};',ctx);
const a=vm.runInContext('({resize,enterWorld,updateWorld,blocked,tryMove,worldViewHeight,player,get cam(){return cam},get VH(){return VH},get scale(){return SCALE},get G(){return G},set G(v){G=v},NZ,ZW,TILE,MAPW,MAPH,freshState})',ctx);
function reachable(done){a.G.done=done;const step=4,cols=Math.ceil(a.MAPW/step),rows=Math.ceil(a.MAPH/step),seen=new Uint8Array(cols*rows),q=new Int32Array(cols*rows),max=Array.from({length:a.NZ},(_,zone)=>({zone,y:-1,x:0}));let head=0,tail=0;const start=(238-2)/step*cols+96/step;q[tail++]=start;seen[start]=1;while(head<tail){const id=q[head++],x=id%cols*step,y=Math.floor(id/cols)*step+2,z=Math.floor(x/(a.ZW*a.TILE));if(z>=0&&z<a.NZ&&y>max[z].y)max[z]={zone:z,x,y};for(const[dx,dy]of[[step,0],[-step,0],[0,step],[0,-step]]){const nx=x+dx,ny=y+dy;if(nx<8||nx>=a.MAPW-8||ny<0||ny>=a.MAPH)continue;const next=(ny-2)/step*cols+nx/step;if(seen[next]||a.blocked(nx,ny))continue;seen[next]=1;q[tail++]=next;}}return{cells:tail,points:max.filter(p=>p.y>=0)};}
const initial=reachable(0),all=reachable(a.NZ);assert.equal(initial.points[0].y,414);assert.equal(all.points.length,27);assert.ok(all.points.every(p=>p.y===414));
let layouts=0,projections=0,walkFrames=0;const samples=[];
for(const [w,h,coarse]of [[320,480,true],[320,568,true],[390,844,true],[430,932,true],[844,390,true],[600,1000,false]])for(const dpr of [1,2,3])for(const bottom of [0,34]){
 Object.assign(device,{w,h,dpr,bottom,coarse});touch.hidden=false;a.resize();layouts++;const r=cv.getBoundingClientRect(),deck=deckHeight(),edge=deck?h-deck:r.bottom;
 if(layouts>1)assert.ok(r.top+Math.round(a.player.y-Math.round(a.cam.y))*a.scale<edge,'Resize repositions the camera before the zero-delta resume frame');
 assert.ok(Math.abs(a.worldViewHeight()-(deck?Math.floor((Math.min(r.bottom,edge)-r.top)/(r.height/a.VH)):a.VH))<.001);
 if(!deck)assert.equal(a.worldViewHeight(),a.VH,'Desktop/landscape keeps full game height');
 const startReads={...dom};
 for(const p of all.points){a.enterWorld(p.x,p.y);const feet=r.top+Math.round(p.y-Math.round(a.cam.y))*a.scale;assert.ok(feet<edge,JSON.stringify({w,h,dpr,bottom,p,feet,edge}));projections++;}
 // Reproduce the newly discovered initial-area route at normal run speed.
 a.G.done=0;a.enterWorld(96,238);for(let i=0;i<48;i++){assert.ok(a.tryMove(-1,0));a.updateWorld(1/140,false);}
 for(let i=0;i<176;i++){assert.ok(a.tryMove(0,1));a.updateWorld(1/140,false);const feet=r.top+Math.round(a.player.y-Math.round(a.cam.y))*a.scale;assert.ok(feet<edge,'Running south stays above deck');walkFrames++;}
 assert.equal(a.player.y,414);assert.equal(a.blocked(48,415.9),null);
 // A modal hides controls, but the reserved camera geometry must remain unchanged.
 const viewH=a.worldViewHeight();a.enterWorld(48,414);const steadyY=a.cam.y;touch.hidden=true;for(let i=0;i<3;i++)a.updateWorld(1/60,false);assert.equal(a.worldViewHeight(),viewH);assert.equal(a.cam.y,steadyY);touch.hidden=false;a.updateWorld(1/60,false);assert.equal(a.cam.y,steadyY);
 assert.deepEqual(dom,startReads,'Following and screen toggles do not read DOM per frame');
 if(w===390&&dpr===3)samples.push({w,h,dpr,bottom,deckTop:edge,visibleGameHeight:viewH,camY:a.cam.y,playerFeetCss:r.top+Math.round(414-Math.round(a.cam.y))*a.scale});
 touch.hidden=true;a.resize();assert.equal(a.worldViewHeight(),viewH,'Resize while a dialog is open still reserves the same deck');
}
console.log(JSON.stringify({passed:true,initialReachableCells:initial.cells,completedReachableCells:all.cells,zonesWithReachableY414:all.points.length,continuousReachableY:415.9,layouts,regionProjections:projections,runningSouthFrames:walkFrames,samples,limitation:'Uses actual collision/update/resize code and CSS-resolved geometry in a recording DOM. Real mobile visual acceptance remains separate.'},null,2));
