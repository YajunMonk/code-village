/* 55 代码物语：剧情镜头、星灯镇手记与旅途地图。无联网依赖。 */
const GAME_TITLE = '代码物语';
const GAME_VERSION = '1.2 · 星灯之约';
const ART = {};
const ART_STATUS={loaded:0,total:0,ready:false,errors:[],pending:new Map()};
const FIRST_ART=['title-keyart','comic-arrival','portrait-hero','portraits-main'];
function loadArt(key) {
  if(ART[key])return Promise.resolve(true);
  if(ART_STATUS.pending.has(key))return ART_STATUS.pending.get(key);
  if(!ASSET_DATA[key]){if(!ART_STATUS.errors.includes(key))ART_STATUS.errors.push(key);return Promise.resolve(false);}
  const work=new Promise(resolve=>{
    const im=new Image();let finished=false;
    const finish=ok=>{if(finished)return;finished=true;clearTimeout(timer);
      if(ok){ART[key]=im;ART_STATUS.loaded=Object.keys(ART).length;ART_STATUS.errors=ART_STATUS.errors.filter(k=>k!==key);}
      else if(!ART_STATUS.errors.includes(key))ART_STATUS.errors.push(key);
      ART_STATUS.pending.delete(key);resolve(ok);
    };
    const timer=setTimeout(()=>finish(false),15000);
    im.onload=()=>finish(true);im.onerror=()=>finish(false);im.src=ASSET_DATA[key];
  });
  ART_STATUS.pending.set(key,work);return work;
}
async function ensureStoryArt(keys) { const result=await Promise.all([...new Set(keys)].map(loadArt));return result.every(Boolean); }
async function loadStoryArt() {
  ART_STATUS.total=Object.keys(ASSET_DATA).length;
  ART_STATUS.ready=await ensureStoryArt(FIRST_ART);
  // 先把标题和序章交给玩家；其余画面在后台预载，入口也会等待所需画面。
  Promise.all(Object.keys(ASSET_DATA).filter(key=>!FIRST_ART.includes(key)).map(loadArt));
  // 浏览器与手机图标由构建时的 head PNG 声明，独立于剧情资源加载。
}
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
function coverArt(g, key, x, y, w, h, t = 0, focus = .5) {
  const im = ART[key] || ART['village-keyart']; if (!im) return false;
  const zoom = reducedMotion() ? 1 : 1.025 + Math.sin(t * .13) * .015;
  const scale = Math.max(w / im.width, h / im.height) * zoom;
  const dw = im.width * scale, dh = im.height * scale;
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  g.drawImage(im, Math.round(x - (dw - w) * focus), Math.round(y - (dh - h) * .45), Math.round(dw), Math.round(dh));
  g.restore(); return true;
}
const CHAPTER_TONE = ['#d3ad6e', '#81c8b6', '#b2c5e5', '#ba9fd0', '#e7bb80'];
const COMICS = {
  arrival: { title: '序章 · 灯会前的委托', unlock: 0, frames: [
    { art: 'comic-arrival', who: 'xa', line: '不响，星灯镇来求助了：今晚办灯会，奶茶店的点单系统却坏了。', caption: '小 A，是不响的 AI 搭档。', focus: .6 },
    { art: 'comic-arrival', who: 'me', line: '“修好管饭”……可我不会写代码，也能接这活？', caption: '不响 · 第一次接委托。', focus: .4 },
    { art: 'comic-arrival', who: 'xa', line: '代码我来写。你问清要求，咱们一起试。先去见店主。', caption: '傍晚，两人来到星灯镇。', focus: .55 },
  ] },
  network: { title: '第二章 · 把消息送到', unlock: 5, frames: [
    { art: 'village-keyart', who: 'duck', line: '菜单画好了，可下单之后，后厨一张单也没收到。', caption: '下一步：把柜台和后厨接通。', focus: .05 },
  ] },
  evidence: { title: '第三章 · 没写在纸上的事', unlock: 10, frames: [
    { art: 'comic-library', who: 'granny', line: '旧菜单找到了。今年哪些还卖，得让鸭老师重新核一遍。', caption: '下一步：给小 A 一份可靠的菜单。', focus: .3 },
  ] },
  workshop: { title: '第四章 · 留好存档', unlock: 16, frames: [
    { art: 'comic-library', who: 'me', line: '客服能用了。接着改之前，先把这一版留好。', caption: '下一步：存档、修错、试单。', focus: .5 },
  ] },
  launch: { title: '第五章 · 迟到的灯会', unlock: 21, frames: [
    { art: 'village-keyart', who: 'postman', line: '店里试好了。我能把点单网址写到请柬上了吗？', caption: '下一步：让店外的人也能下单。', focus: .4 },
  ] },
  farewell: { title: '终章 · 彼岸的灯', unlock: 27, frames: [
    { art: 'comic-festival', who: 'duck', line: '第二张订单来了。交给我们吧，你的车快到了。', caption: '彼岸站 · 末班车进站', focus: .3 },
    { art: 'comic-arrival', who: 'me', line: '走吧，小 A。回去还有一家店等着我们。', caption: '星灯镇的灯，留在了窗外。', focus: .5 },
  ] },
};
const COMIC_AT = { 5: 'network', 10: 'evidence', 16: 'workshop', 21: 'launch' };
class ComicScreen extends Screen {
  constructor(key) { super(); this.key = key; this.story = COMICS[key]; this.index = 0; this.age = 0; this.revealed = false; this.mk(); }
  mk() {
    this.btns = [new Btn({ label: this.index === this.story.frames.length - 1 ? '走吧 →' : '下一幕 →', w: 86, h: 22, style: 'primary', onPress: () => this.next() }),
      new Btn({ label: '略过', w: 48, h: 20, onPress: () => closeScreen(this) })];
  }
  next() { if (!reducedMotion() && !this.revealed && this.age * 42 < this.story.frames[this.index].line.length) { this.revealed = true; return; } if (++this.index >= this.story.frames.length) { closeScreen(this); return; } this.age = 0; this.revealed = false; this.mk(); Audio.sfx('move'); }
  update(dt) { this.t += dt; this.age += dt; if (Input.hit('back')) { closeScreen(this); return; } this.nav(); }
  draw(g) {
    const f = this.story.frames[this.index], pad = PORTRAIT ? 10 : 18;
    g.fillStyle = '#091721'; g.fillRect(0, 0, VW, VH);
    const bottom = PORTRAIT ? VH - 158 : VH - 105, top = 38;
    win(g, pad, top, VW - pad * 2, bottom - top, 'dark');
    coverArt(g, f.art, pad + 3, top + 3, VW - pad * 2 - 6, bottom - top - 6, this.t, f.focus);
    // 画面内漂浮的萤火与逐帧扫光，不改变像素边缘。
    if (!reducedMotion()) for (let i = 0; i < 14; i++) {
      const x = pad + 8 + hash2(i, 8) * (VW - 2 * pad - 16), y = top + 10 + hash2(i, 9) * (bottom - top - 20) + Math.sin(this.t + i) * 3;
      g.globalAlpha = .25 + .5 * Math.max(0, Math.sin(this.t * 1.2 + i)); g.fillStyle = '#ffecb2'; g.fillRect(Math.round(x), Math.round(y), 1, 1);
    }
    g.globalAlpha = 1;
    txt(g, this.story.title, pad + 2, 13, '#e8d4a9');
    txt(g, `${String(this.index + 1).padStart(2, '0')} / ${String(this.story.frames.length).padStart(2, '0')}`, VW - pad - 2, 13, UIC.dim, { align: 'right' });
    const who = WHO[f.who]; drawPortrait(g, who.id, pad, bottom + 10, 44, false);
    txt(g, who.n, pad + 54, bottom + 9, who.c);
    const lines = wrap(f.line, VW - pad * 2 - 57);
    drawLines(g, lines, pad + 54, bottom + 25, { lh: 14, max: this.revealed || reducedMotion() ? Infinity : Math.floor(this.age * 42) });
    const captionY = PORTRAIT ? VH - 66 : VH - 48;
    drawLines(g, wrap(f.caption, VW - pad * 2, '#a5b6bd'), pad, captionY, { lh: 13, shadow: null });
    this.btns[0].x = VW - pad - 86; this.btns[0].y = VH - 29;
    this.btns[1].x = pad; this.btns[1].y = VH - 28; this.drawBtns(g);
    for (let i = 0; i < this.story.frames.length; i++) { g.fillStyle = i === this.index ? '#e8bc78' : '#33515b'; g.fillRect(Math.round(VW / 2 - this.story.frames.length * 5 + i * 10), VH - 20, 5, 3); }
  }
}
let comicActive=false;
async function playComic(key, replay = false) {
  if(!COMICS[key]||comicActive)return;
  const origin=topScreen(),originScene=scene;
  comicActive=true;
  try {
    const keys=COMICS[key].frames.map(f=>f.art);
    const ready=keys.every(k=>ART[k])||await ensureStoryArt(keys);
    if(topScreen()!==origin||scene!==originScene)return;
    if(!ready){toast('画面暂未载入，请稍后重试。',UIC.rose);return;}
    await openScreen(new ComicScreen(key));
    if(!replay){if(!Array.isArray(G.comics))G.comics=[];if(!G.comics.includes(key))G.comics.push(key);save();}
  } finally { comicActive=false; }
}

const PEOPLE = [
  ['player', '不响', '接下奶茶店维修委托的男生。和小 A 一起，担任今晚的临时店长。', 0],
  ['xa', '小 A', '不响的 AI 搭档。能写代码，爱抢着动手，也需要有人试试它做的东西。', 0],
  ['duck', '鸭老师', '鸭鸭奶茶的店主，也是这次维修的委托人。忙着备料，盼点单系统赶在灯会前修好。', 0],
  ['chef', '锅锅', '店里的厨师。照菜谱一步步做饭，会给晚到的人留一碗热面。', 1],
  ['granny', '记事本婆婆', '保管旧菜单的老邻居。每年灯会添一道饮品，今年还空着一行。', 10],
  ['detective', '老 K', '替店里核对宣传的调查员。铅笔比印章用得多，待查的句子先画个问号。', 12],
  ['zero', '小零', '图书馆管理员，也是客服的第一位测试顾客。新旧菜单分开放，日期写在右上角。', 13],
  ['postman', '阿邮', '星灯镇的邮差。请柬备好了，正等一个能让客人打开的点单网址。', 21],
];
const journalPeople = () => PEOPLE.concat(typeof RESIDENTS === 'undefined' ? [] : Object.entries(RESIDENTS).map(([key,r])=>[r.avatar,r.name,r.bio,r.zoneHint,key]));
const personMet = p => p[4] ? (G.residentsSeen||[]).includes(p[4]) : G.done>=p[3];
class JournalScreen extends Screen {
  constructor() { super(); this.tab=0; this.region=Math.max(0,regionOf(Math.min(G.done,NZ-1))); this.person=0;this.roomsPage=0;this.mk(); }
  mk() {
    this.btns=['地图','人物','回忆','串门'].map((label,i)=>new Btn({label,w:48,h:20,tab:i,style:this.tab===i?'primary':'btn',onPress:()=>{this.tab=i;this.focus=i;this.mk();}}));
    if(this.tab===0) {
      REGIONS.forEach((r,i)=>this.btns.push(new Btn({label:`${i+1} ${r.name.split(' · ')[1]}`,w:94,h:24,region:i,style:this.region===i?'primary':'btn',onPress:()=>{this.region=i;this.mk();}})));
      const r=REGIONS[this.region];
      for(let z=r.from;z<=r.to;z++)this.btns.push(new Btn({label:`${G.done>z?'◆':G.done===z?'▶':'·'} ${ZONE_NAME[z]}`,w:156,h:22,zone:z,disabled:z>G.done,onPress:()=>this.travel(z)}));
    } else if(this.tab===1) {
      const all=journalPeople(),page=Math.floor(this.person/6);
      all.slice(page*6,page*6+6).forEach((p,j)=>{const i=page*6+j;this.btns.push(new Btn({label:p[1],w:94,h:22,person:i,disabled:!personMet(p),style:i===this.person?'primary':'btn',onPress:()=>{this.person=i;this.mk();}}));});
      this.btns.push(new Btn({label:'上一页',page:-1,w:58,h:20,disabled:page===0,onPress:()=>{this.person=(page-1)*6;this.mk();}}),new Btn({label:'下一页',page:1,w:58,h:20,disabled:(page+1)*6>=all.length,onPress:()=>{this.person=(page+1)*6;this.mk();}}));
    } else if(this.tab===2) {
      Object.entries(COMICS).forEach(([key,c])=>this.btns.push(new Btn({label:c.title,w:PORTRAIT?230:270,h:24,comic:key,disabled:!(G.comics||[]).includes(key)&&G.done<c.unlock,onPress:()=>playComic(key,true)})));
    } else {
      const rooms=Object.entries(INTERIORS),page=this.roomsPage;
      rooms.slice(page*6,page*6+6).forEach(([key,r])=>this.btns.push(new Btn({label:`${(G.roomsVisited||[]).includes(key)?'◆':'·'} ${r.name}`,roomKey:key,w:190,h:24,disabled:G.done<r.zone,onPress:()=>{closeScreen(this);openInterior(key);}})));
      this.btns.push(new Btn({label:'上一页',page:-1,w:58,h:20,disabled:page===0,onPress:()=>{this.roomsPage--;this.mk();}}),new Btn({label:'下一页',page:1,w:58,h:20,disabled:(page+1)*6>=rooms.length,onPress:()=>{this.roomsPage++;this.mk();}}));
    }
    this.btns.push(new Btn({label:'返回旅途',w:82,h:20,close:true,style:'primary',onPress:()=>closeScreen(this)}));
  }
  travel(z) {
    if(z>G.done||scene!=='world'||scriptRunning)return;
    const n=npcs.find(n=>n.id===z);if(!n)return;
    let x=z*ZW*TILE+6*TILE,y=15*TILE-2;
    for(let step=0;step<30&&blocked(x,y);step++)x+=8;
    if(blocked(x,y)){toast('这条路暂时走不通');return;}
    closeScreen(this);enterWorld(x,y);Audio.sfx('warp');save(true);toast('抵达：'+ZONE_NAME[z],UIC.mint);
  }
  update(dt){this.t+=dt;if(Input.hit('back')||Input.hit('journal')){closeScreen(this);return;}this.nav();}
  draw(g) {
    this.dimBg(g,.9);win(g,5,5,VW-10,VH-10,'dark');
    txt(g,'星灯镇 · 旅途手记',17,15,'#e8d4a9');txt(g,`${Math.min(G.done,NZ)} / ${NZ}`,VW-17,15,UIC.mint,{align:'right'});
    this.btns.filter(b=>b.tab!==undefined).forEach(b=>{b.x=17+b.tab*56;b.y=34;});
    const bodyY=65,listX=18,detailX=PORTRAIT?18:132;
    if(this.tab===0) {
      this.btns.filter(b=>b.region!==undefined).forEach((b,i)=>{b.x=PORTRAIT?listX+i*Math.floor((VW-36)/5):listX;b.y=PORTRAIT?bodyY:bodyY+i*25;if(PORTRAIT){b.w=Math.floor((VW-36)/5)-4;b.label=String(i+1);}});
      const startY=PORTRAIT?bodyY+56:bodyY;
      if(PORTRAIT)txt(g,REGIONS[this.region].name,18,bodyY+33,UIC.gold);
      this.btns.filter(b=>b.zone!==undefined).forEach((b,i)=>{b.x=detailX;b.y=startY+i*(PORTRAIT?26:22);b.h=PORTRAIT?22:20;b.w=PORTRAIT?VW-36:VW-detailX-20;});
      txt(g,'已抵达的地点可以快速返回',18,VH-52,UIC.dim);
    } else if(this.tab===1) {
      this.btns.filter(b=>b.person!==undefined).forEach((b,i)=>{b.x=listX+(PORTRAIT?i%2*112:0);b.y=bodyY+(PORTRAIT?Math.floor(i/2):i)*(PORTRAIT?27:23);b.h=22;});
      const p=journalPeople()[this.person],yy=PORTRAIT?bodyY+91:bodyY+3,met=personMet(p);
      if(met)drawPortrait(g,p[0],detailX,yy,52,false);
      txt(g,met?p[1]:'尚未相遇',detailX+64,yy+12,UIC.gold);
      drawLines(g,wrap(met?p[2]:'沿着街道走走，也去屋里坐坐。有人正等着一场闲聊。',VW-detailX-24),detailX,yy+62,{lh:15});
    } else if(this.tab===2) {
      this.btns.filter(b=>b.comic).forEach((b,i)=>{b.x=Math.round((VW-b.w)/2);b.h=PORTRAIT?24:22;b.y=bodyY+i*(PORTRAIT?27:24);});
    } else {
      const total=Object.values(INTERIORS).reduce((n,r)=>n+r.spots.length,0);
      txt(g,`到访 ${(G.roomsVisited||[]).length}/${Object.keys(INTERIORS).length} · 拾光 ${(G.keepsakes||[]).length}/${total}`,18,bodyY,UIC.mint);
      this.btns.filter(b=>b.roomKey).forEach((b,i)=>{const cols=PORTRAIT?1:2,bw=PORTRAIT?VW-36:Math.floor((VW-42)/2);b.x=18+i%cols*(bw+6);b.y=bodyY+24+Math.floor(i/cols)*26;b.w=bw;b.h=22;});
      txt(g,'每扇门后，都有留下来的日常。',18,PORTRAIT?bodyY+190:bodyY+110,UIC.dim);
    }
    this.btns.filter(b=>b.page!==undefined).forEach((b,i)=>{b.x=18+i*64;b.y=VH-30;});
    const close=this.btns.at(-1);close.x=VW-close.w-18;close.y=VH-30;
    this.drawBtns(g);
  }
}
const openJournal=()=>openScreen(new JournalScreen());
