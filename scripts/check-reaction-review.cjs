#!/usr/bin/env node
'use strict';
// Independent read-only review of the real reaction/dialogue modules.
// Reuses only the isolated Canvas/DOM fixture prefix from check-interiors.cjs.
// Does not run that test's main(), access a browser, or alter a game save.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const fixturePath = path.join(__dirname, 'check-interiors.cjs');
const marker = 'vm.runInContext(`\nObject.assign(ART,assetDimensions);';
const fixture = fs.readFileSync(fixturePath, 'utf8').replace(/^#![^\n]*\n/, '');
if (!fixture.includes(marker)) throw new Error('check-interiors fixture boundary changed; review this test before updating it.');
let prefix = fixture.split(marker)[0];
if (!prefix.includes("'37_reactions.js'")) prefix = prefix.replace("'35_entities.js'", "'35_entities.js', '37_reactions.js'");
const { context, vm } = new Function('require', 'process', '__dirname', prefix + '\nreturn { context, vm };')(require, process, __dirname);

vm.runInContext(String.raw`
let auditChecks=0; const ensure=(value,message)=>{auditChecks++;if(!value)throw Error(message)};
G=freshState();G.done=27;player.x=220;player.y=145;cam.x=0;cam.y=0;chapterT=0;bannerT=0;
const auditViewports=[[420,250,false],[480,270,false],[260,400,true],[270,480,true]];
const auditSpeakers=Object.keys(WHO),auditEmotions=Object.keys(REACTION_COLORS);
for(const [w,h,portrait] of auditViewports){
 VW=w;VH=h;PORTRAIT=portrait;
 for(const who of auditSpeakers)for(const emotion of auditEmotions)for(const code of ['', 'TypeError: Cannot read "price"\n    at cart.js:12']){
  const d=new DialogScreen([[who,'这是需要认真阅读的中文台词。',code,{emotion}]]);screens.length=0;screens.push(d);scene='ending';
  const L=d.layout(),p=reactionPlacement(d,L),r={...p,h:p.h+3};
  ensure(p.anchor==='portrait','ending must use portrait');
  ensure(r.x>=0&&r.y>=0&&r.x+r.w<=VW&&r.y+r.h<=VH,'fallback bounds '+who);
  ensure(!reactionOverlap(r,{x:L.nameX,y:L.y-14,w:textW(d.W.n)+18,h:21}),'name overlap '+who);
  ensure(!reactionOverlap(r,{x:L.x+7,y:L.y+Math.round((L.h-L.ps)/2),w:L.ps,h:L.ps}),'face overlap '+who);
  if(code){const m=measureCode(code,VW-12);ensure(!reactionOverlap(r,{x:(VW-m.w)/2,y:L.y-m.h-L.headerGap,w:m.w+2,h:m.h+3}),'code overlap '+who);}
  drawReaction(surface,d,L);
 }
}
scene='world';VW=480;VH=270;PORTRAIT=false;G.done=15;
npcs.length=0;npcs.push({id:15,who:'boss',boss:'fox',x:220,y:145,dir:0,kind:'main',blinkT:1},{id:25,who:'boss',boss:'final',x:225,y:145,dir:0,kind:'main',blinkT:1});
const fox=new DialogScreen([['fox','有点惊讶。','',{emotion:'surprise'}]]);screens.length=0;screens.push(fox);ensure(reactionPlacement(fox).anchor==='world','visible fox');
G.done=16;ensure(reactionWorldActor('fox',fox)===null,'defeated fox must not attach to final boss');
const boss=new DialogScreen([['boss','原来如此。','',{emotion:'idea'}]]);screens.length=0;screens.push(boss);G.done=26;ensure(reactionWorldActor('boss',boss)===null,'defeated final must not attach to bug');
const bug=new DialogScreen([['bug','现在明白了。','',{emotion:'joy'}]]);screens.length=0;screens.push(bug);ensure(reactionWorldActor('bug',bug)===null,'no literal bug actor must not attach to unrelated boss');
const d=new DialogScreen([['me','这是一段会分成很多页的台词。'.repeat(60),'',{emotion:'idea'}],['me','下一句没有表情。']]);screens.length=0;screens.push(d);scene='world';
const original=d.reaction;d.update(.5);ensure(d.reaction===original&&original.age===.5,'same reaction age');
VW=260;VH=400;PORTRAIT=true;d.reflow();drawReaction(surface,d,d.layout());ensure(d.reaction===original&&original.age===.5,'resize/draw no restart');
d.n=d.total;Input.pressed.add('ok');d.update(0);ensure(d.page===1&&d.reaction===original,'page no replay');
d.update(1.2);ensure(d.reaction===null,'expires after 1.6');const oldL=d.layout();d.reflow();ensure(d.layout().nameX===oldL.nameX&&d.reaction===null,'expiry layout stable');
d.next();ensure(d.reaction===null,'unmarked next does not retain');
d.onClose();ensure(d.reaction===null,'close clears');
const baselineChecks=auditChecks;

// Targeted checks added after the engine locked a fallback for the rest of a line.
scene='world';VW=480;VH=270;PORTRAIT=false;player.x=220;player.y=145;chapterT=2;bannerT=0;
const locked=new DialogScreen([['me','横幅消失也留在原位。','',{emotion:'idea'}]]);screens.length=0;screens.push(locked);
const lockedCue=locked.reaction;
ensure(reactionPlacement(locked).anchor==='portrait','chapter overlap must fallback');
chapterT=0;ensure(reactionPlacement(locked).anchor==='portrait','chapter ending must not move cue to world');
ensure(locked.reaction===lockedCue&&lockedCue.age===0,'anchor selection must not recreate or advance cue');
locked.reaction=makeReaction('me',{emotion:'idea'});
ensure(reactionPlacement(locked).anchor==='world','fresh unobstructed cue may use world');
const rotatedCue=locked.reaction;rotatedCue.age=.45;
VW=260;VH=400;PORTRAIT=true;player.x=400;locked.reflow();
ensure(reactionPlacement(locked).anchor==='portrait','rotation making actor offscreen must fallback');
VW=480;VH=270;PORTRAIT=false;player.x=220;locked.reflow();
ensure(reactionPlacement(locked).anchor==='portrait','rotation back must not return cue to world');
ensure(locked.reaction===rotatedCue&&rotatedCue.age===.45,'rotation must preserve cue and age');
for(const currentScene of ['intro','ending','title']){
 scene=currentScene;locked.reaction=makeReaction('me',{emotion:'joy'});
 ensure(reactionPlacement(locked).anchor==='portrait',currentScene+' cannot use outside-world actor');
}
scene='world';const interior={room:{resident:'puhe'}};screens.length=0;screens.push(interior,locked);locked.reaction=makeReaction('me',{emotion:'joy'});
ensure(reactionWorldActor('me',locked)===null,'interior overlay cannot select underlying world player');
ensure(reactionPlacement(locked).anchor==='portrait','interior follows approved portrait-slot behavior');
globalThis.reactionReview={passed:true,baselineChecks,anchorLockChecks:auditChecks-baselineChecks,totalChecks:auditChecks,speakerCount:auditSpeakers.length,emotions:auditEmotions,viewports:auditViewports.map(([width,height,portrait])=>({width,height,portrait})),fallbackCases:auditSpeakers.length*auditEmotions.length*auditViewports.length*2,failures:[]};
`, context, { timeout: 30000 });

const report = {
  ...context.reactionReview,
  review: 'Independent geometry, actor identity, dialogue lifecycle and one-way fallback review',
  originalInMemoryBaselineChecks: 10595,
  reproducibleCommand: 'node scripts/check-reaction-review.cjs',
  sourceSha256: Object.fromEntries(['37_reactions.js','40_ui.js','35_entities.js','56_interiors.js','57_residents.js'].map(name => [name, crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'source/src',name))).digest('hex')])),
  fixtureSha256: crypto.createHash('sha256').update(fs.readFileSync(fixturePath)).digest('hex'),
  limitations: [
    'Uses the actual game modules with an isolated recording Canvas/DOM fixture; font widths use the Fusion Pixel 12px CJK / 6px Latin grid.',
    'Does not verify browser rasterization, device pixel ratio, font decoding, real touch input, or artistic acceptance.',
    'Interior reactions intentionally use the current dialogue portrait slot, not a head bubble on the small room sprite.',
    'Baseline covers geometry and lifecycle for all registered speakers, not the semantics of every line; content suitability was separately reviewed from source.'
  ]
};
const output = path.join(root,'artifacts/qa/reactions/independent-review.json');
fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(`PASS independent review: ${report.baselineChecks} baseline + ${report.anchorLockChecks} anchor-lock checks = ${report.totalChecks}; ${report.speakerCount} speakers, ${report.fallbackCases} fallback layouts.`);
console.log('Report: '+output);
