/* 56 星灯镇的门后：可走动的室内、居民闲聊和可收藏的日常。
 * 背景按原图完整显示；所有热点/人物使用同一归一化坐标系。
 */
const ROOM_TEMPLATES = {
  cafe: { art:'room-cafe', spots:[['menu','菜单板',.384,.113],['tea','桂花罐',.534,.302],['letter','星封信',.869,.621]] },
  library: { art:'room-library', spots:[['notes','手写笔记',.440,.321],['photo','老照片',.783,.411],['lamp','半成品星灯',.129,.501]] },
  workshop: { art:'room-workshop', spots:[['core','星灯核心',.513,.250],['tools','工具箱',.074,.468],['plan','线路图',.837,.486]] },
  observatory: { art:'room-observatory', spots:[['scope','望远镜',.838,.176],['board','黑板',.173,.197],['cup','茶杯',.538,.308]] },
  studio: { art:'room-studio', spots:[['model','木制样机',.480,.256],['sketch','设计稿',.884,.377],['record','唱片',.093,.403]] },
  postoffice: { art:'room-postoffice', spots:[['letter','未寄的信',.526,.323],['map','旧地图',.114,.214],['bag','邮袋',.832,.405]] },
};
// 每栋房屋有自己的名字与物件故事；空房也保留住户生活过的痕迹。
const ROOM_SPECS = [
  [1,'pantry','麦香小厨','cafe','面包刚出炉，窗台上的面粉还没有擦。',[
    ['只做三样','今天只卖三种面包。少做几样，才能让早起的人吃上热早餐。'],
    ['称过的桂花','罐口插着小勺。“少许桂花”被划掉，改成了“一平勺”。学徒这回知道放多少了。'],
    ['一张欠条','信上写着“欠你一顿晚饭”。不响默念了一遍：做完今晚的版本，就回去吃饭。']]],
  [2,'drafts','纸间设计所','studio','桌上摊着几张被揉皱又展开的草图。',[
    ['能握住的版本','木头样机只有一个开关。手一伸，就知道该从哪儿开始。'],
    ['被删掉的功能','领券、抽奖、排行榜都被划掉了。草图正中写着：让婆婆买到不加糖的奶茶。'],
    ['唱片的空白','两首歌之间留了片刻安静。封套上写着：界面也要让人喘口气。']]],
  [5,'colors','蓝窗画室','studio','窗玻璃映着蓝色，画笔被洗得很干净。',[
    ['纸做的柜台','柜台模型调矮了三次。看着顺眼，还得让人伸手够得着。'],
    ['两份点单稿','左边图标漂亮，右边写着“少糖”。婆婆选了右边，画师把它圈了起来。'],
    ['颜色之外','曲目除了颜色，还用形状区分。旁边记着：按钮的成功、失败，也别只用红绿。']]],
  [6,'cafe','鸭鸭奶茶屋','cafe','炉火还温着。窗外有人在试灯。',[
    ['擦了又写的菜单','菜单删过三次。先卖几杯拿手的，准时送到客人手里。'],
    ['一罐桂花','盖上贴着褪色纸条：婆婆的那杯，少糖。锅锅一直记着。'],
    ['没寄出的邀请','信封画着星灯。信里写着：忙完了，来坐一会儿。收信人的名字还空着。']]],
  [7,'dispatch','转角收发室','postoffice','分拣台上放着一杯快凉了的水。',[
    ['寄到哪里','信上漏了门牌。阿邮留下纸条：得去问清，寄出可不等于送到。'],
    ['绕远的路线','修路的地方被打了叉，邮路绕过去，终点还是那一家。'],
    ['空邮袋','袋里只放了一张分拣清单。全镇的信，会分几趟送。']]],
  [9,'empty','雨声旧居','library','屋里没有人。窗外的雨，敲着同一个节拍。',[
    ['未写完的页','末页停在“明天继续”。不响没往下写，把笔放回了原处。'],
    ['搬家的照片','照片背面记着搬家日期。地址还在，人已走了；页面打不开，也未必从没存在过。'],
    ['没亮的灯','灯没亮，插头倒松着。你先检查接线，没有急着换灯。']]],
  [10,'observatory','卷云观星阁','observatory','秒针走得很慢，屋主却说他从不嫌问题多。',[
    ['镜片上的指印','镜片旁贴着提醒：先擦掉指印，再看看星星是不是真的暗了。'],
    ['擦掉的假设','黑板上叠着几层粉笔灰。旧猜想被划掉，旁边补了新实验的结果。'],
    ['凉掉的茶','茶凉了，屋主还在想。不响把杯子推近些：喝完水，再做下个实验。']]],
  [11,'memoir','记事小屋','library','纸页轻轻响。屋主在每张纸边都留了一点余地。',[
    ['手写的更正','“桂花两勺”旁添着新字：“太甜，一勺就好。”抄配方时，得看最后改的这行。'],
    ['照片后的日期','照片有日期，没人名。小 A 没有替陌生的脸编故事。'],
    ['留给明天','星灯的线留长了一截，纸条写着：下次调整还用得着。']]],
  [13,'library','星灯图书馆','library','灰尘在灯光里慢慢落下，有人把书翻回了原页。',[
    ['找不到的那页','目录缺了一页，小零贴上“还在找”，没用猜测填满空位。'],
    ['两份不一样的记录','照片里的菜单比旧本子多一行。两份并排，差别才显出来。'],
    ['修过的灯罩','裂开的灯罩补好了，底下记着日期。后来的人一翻就能查到。']]],
  [14,'workshop','圈圈机械工坊','workshop','焊锡的味道很淡，桌上的灯正安稳地亮着。',[
    ['第一盏歪歪的灯','焊点歪了点，按几次都能亮。纸条写着：先保亮，再修外观。'],
    ['有归处的工具','工具挂在各自的轮廓里。空了哪个位置，就知道哪件还没归位。'],
    ['回得去的线路','图纸旁夹着上一版接线，标着“可用”。新接法不行，还能退回来。']]],
  [16,'archive','存档阁','library','管理员出去了，门口留着“请自便”的纸条。',[
    ['今天以前','版本号下面写着三次改动的原因。找到了旧版，也能查清当初为什么改。'],
    ['旧版合影','第一版灯架矮一截，合影还好好摆着。小镇没藏起那个笨拙的开头。'],
    ['备用星灯','备用灯芯收得完好。盒上记着最近一次试亮的日期。']]],
  [17,'parts','榫木零件铺','workshop','柜台下压着一张缺角的合照。',[
    ['合适的一颗','灯芯旁摆着三种接头。贵的未必接得上，得挑尺寸合适的。'],
    ['借来的扳手','扳手刻着隔壁工坊的记号。旁边压着使用说明和一张道谢纸条。'],
    ['连接处','图上圈出了各个接口，标明谁来检查。接缝可不能都等别人处理。']]],
  [18,'vault','守钥人的小屋','studio','屋主去巡灯了。桌面整齐，抽屉都关着。',[
    ['只有一个孔','木盒只留了今晚要用的钥匙。办这一件事，用不着打开所有门。'],
    ['权限草图','“查看”和“修改”分成两条路。能看菜单，不代表能改价格。'],
    ['留在封套里','唱片藏在封套里。不响没有打开，私人物件就留在原处。']]],
  [19,'repair','回针修理室','workshop','桌上摆着修好的灯，屋主却还在试开关。',[
    ['再按一次','灯亮了。隔一会儿再按，仍然亮。这回可以交给客人了。'],
    ['最小的一把','最小的螺丝刀磨得最亮，旁边放着一颗拧紧的螺丝。大工具未必用得上。'],
    ['故障的小纸条','纸上写着：雨天，第三盏，偶尔不亮。来修的人知道该在什么时候查了。']]],
  [21,'nightshift','夜班准备室','observatory','人暂时不在，台灯替他守着最后一行记录。',[
    ['把焦点调回来','望远镜望着山顶，旁边压着今晚的时间表。远处再好看，也别误了开灯。'],
    ['未划掉的一项','检查单剩一项：“从头下单一次。”零件都好，还得试试能不能配合。'],
    ['一杯温水','杯旁留着交接单，抬头是“明早的我”。不响读完，知道明天该从哪儿接着做。']]],
  [22,'postoffice','星灯邮局','postoffice','邮袋靠着桌脚，屋里有纸和封蜡的气味。',[
    ['终于要寄的信','信折了好几遍。寄出之前，阿邮又核了一遍日期和地点。'],
    ['能找到的小店','地图把小店门牌写得很大。作品做好，也得让人找得到。'],
    ['归来的回执','回执夹在邮袋边，字不多：已送达。寄信人终于能放心了。']]],
  [23,'launch','远航值班室','observatory','窗户开着一道缝，风把纸角轻轻抬起。',[
    ['出发以前','望远镜对着晴空。值班员的纸条却记着：雨来了，要怎么接着做。'],
    ['写给后来的人','黑板用三步写清了交接。新值班的人照着就能接手。'],
    ['等人回来','杯旁多放了一只空杯。上线以后，仍得有人在这里接住新问题。']]],
  [25,'hall','旧钟楼会客厅','library','曾经回响着黑话的大厅，如今只剩翻书声。',[
    ['把话说清楚','厚本子末页写着：先问他要做什么。那串长名词被轻轻划掉了。'],
    ['没拍全的合影','合影只拍到灯架一角。背面还记着没入镜的帮手。'],
    ['仍为你亮着','灯芯普通，却把桌面照得清清楚楚。今晚这盏灯，够用了。']]],
];
const INTERIORS = Object.fromEntries(ROOM_SPECS.map(([zone,key,name,theme,mood,notes]) => {
  const t=ROOM_TEMPLATES[theme];
  return [key,{zone,name,theme,mood,art:t.art,resident:null,spots:t.spots.map(([id,label,x,y],i)=>({id,name:label,x,y,title:notes[i][0],text:notes[i][1]}))}];
}));
function setupInteriors() {
  // 重建可重复调用；没有图像的门用空 draw，避免进入世界渲染时访问空 img。
  for(let i=objects.length-1;i>=0;i--) if(objects[i].kind==='interiorDoor')objects.splice(i,1);
  for(const [key,r] of Object.entries(RESIDENTS)) {
    const home=Object.values(INTERIORS).find(room=>room.zone===r.zoneHint);
    if(home)home.resident=key;
  }
  for(const [key,room] of Object.entries(INTERIORS)) {
    const house=objects.find(o=>o.kind==='house'&&Math.floor(o.x/(ZW*TILE))===room.zone);
    const door=house?.doorWorld || (room.zone===25?{x:(25*ZW+12)*TILE,y:9*TILE}:null);
    if(!door)continue;
    room.door={...door};
    addObj({x:door.x,y:door.y,draw(){},kind:'interiorDoor',interact:{type:'interior',key,z:room.zone,text:room.name}});
  }
}
const roomCollected = key => INTERIORS[key].spots.filter(s=>(G.keepsakes||[]).includes(`${key}:${s.id}`)).length;
class InteriorScreen extends Screen {
  constructor(key) {
    super();this.key=key;this.room=INTERIORS[key];this.selected=0;this.walk={x:.51,y:.79,dir:1,t:0,moving:false};this.target=null;
    this.btns=this.room.spots.map((spot,i)=>new Btn({label:`${i+1} ${spot.name}`,w:90,h:21,spot,onPress:()=>this.inspect(i)}));
    if(this.room.resident)this.btns.push(new Btn({label:'聊一会儿',w:90,h:21,resident:true,style:'primary',onPress:()=>this.chat()}));
    this.btns.push(new Btn({label:'回到街上',w:82,h:20,exit:true,onPress:()=>closeScreen(this)}));
    this.focus=this.room.resident?3:0;
    if(!Array.isArray(G.roomsVisited))G.roomsVisited=[];
    if(!G.roomsVisited.includes(key))G.roomsVisited.push(key);
    save();
  }
  async inspect(i) {
    if(this.busy)return;this.busy=true;this.selected=i;
    const spot=this.room.spots[i],id=`${this.key}:${spot.id}`;
    await talk([spot.text]);
    if(!Array.isArray(G.keepsakes))G.keepsakes=[];
    if(!G.keepsakes.includes(id)){G.keepsakes.push(id);toast('拾光：'+spot.title,UIC.mint);}
    if(!save())toast('暂未写入存档，请保留当前页面。',UIC.rose);
    this.busy=false;
  }
  async chat() {
    const key=this.room.resident;if(this.busy||!key)return;this.busy=true;
    if(!G.residentVisits||typeof G.residentVisits!=='object')G.residentVisits={};
    if(!Array.isArray(G.residentsSeen))G.residentsSeen=[];
    const r=RESIDENTS[key],after=G.done>=27,pool=after?r.after:r.lines,record=`${key}:${after?'after':'before'}`;
    const round=(G.residentVisits[record]||0)%pool.length;
    await talk(residentConversation(key,round,G.done));
    G.residentVisits[record]=(G.residentVisits[record]||0)+1;
    if(!G.residentsSeen.includes(key)){G.residentsSeen.push(key);toast('认识了 '+r.name,UIC.mint);}
    if(!save())toast('暂未写入存档，请保留当前页面。',UIC.rose);
    this.busy=false;
  }
  update(dt) {
    this.t+=dt;if(this.busy)return;
    if(Input.hit('back')){closeScreen(this);return;}
    if(Input.hit('note'))this.focus=(this.focus+1)%this.btns.length;
    if(Input.hit('ok')){this.press(this.btns[this.focus]);return;}
    const p=Input.pointer.click,b=this.imageBox;
    if(p){const hit=this.btns.findIndex(btn=>btn.hit(p));if(hit>=0){this.focus=hit;this.press(this.btns[hit]);return;}
      if(b){
        const u=(p.x-b.x)/b.w,v=(p.y-b.y)/b.h;
        if(this.room.resident&&Math.hypot((u-.39)*b.w,(v-.68)*b.h)<23){this.chat();return;}
        const si=this.room.spots.findIndex(s=>Math.hypot((u-s.x)*b.w,(v-s.y)*b.h)<12);
        if(si>=0){this.focus=si;this.inspect(si);return;}
        if(u>=.23&&u<=.72&&v>=.55&&v<=.84)this.target={x:u,y:v};
      }
    }
    let dx=(Input.held.right?1:0)-(Input.held.left?1:0),dy=(Input.held.down?1:0)-(Input.held.up?1:0);
    if(dx||dy)this.target=null;
    else if(this.target){const x=this.target.x-this.walk.x,y=(this.target.y-this.walk.y)*.56,d=Math.hypot(x,y);if(d<.012)this.target=null;else{dx=x/d;dy=y/d;}}
    const len=Math.hypot(dx,dy);this.walk.moving=len>0;
    if(len){this.walk.x=clamp(this.walk.x+dx/len*dt*.20,.23,.72);this.walk.y=clamp(this.walk.y+dy/len*dt*.36,.55,.84);this.walk.t+=dt;this.walk.dir=Math.abs(dx)>Math.abs(dy)?(dx>0?3:2):(dy>0?0:1);}
  }
  draw(g) {
    const P=PORTRAIT,top=48,bottom=P?Math.min(VH-168,top+VW*.62):VH-60,h=bottom-top,w=VW-16;
    g.fillStyle='#091721';g.fillRect(0,0,VW,VH);
    txt(g,this.room.name,14,11,'#e9d3ac');
    txt(g,`${roomCollected(this.key)} / 3`,VW-107,14,UIC.mint,{align:'right'});
    const exit=this.btns.at(-1);exit.x=VW-96;exit.y=8;
    const im=ART[this.room.art]||ART['room-library'];
    if(im){
      const scale=Math.min(w/im.width,h/im.height),dw=im.width*scale,dh=im.height*scale;
      this.imageBox={x:Math.round((VW-dw)/2),y:Math.round(top+(h-dh)/2),w:Math.round(dw),h:Math.round(dh)};
      const b=this.imageBox;g.drawImage(im,b.x,b.y,b.w,b.h);
      g.fillStyle=G.done>=27?'rgba(255,210,128,.045)':'rgba(13,31,47,.03)';g.fillRect(b.x,b.y,b.w,b.h);
      if(!reducedMotion()){g.globalAlpha=.3;g.fillStyle='#f6d88c';for(let i=0;i<9;i++)g.fillRect(Math.round(b.x+hash2(i,this.room.zone)*b.w),Math.round(b.y+hash2(i,8)*b.h+Math.sin(this.t+i)*2),1,1);g.globalAlpha=1;}
      this.room.spots.forEach((s,i)=>{const sx=Math.round(b.x+s.x*b.w),sy=Math.round(b.y+s.y*b.h);g.fillStyle=this.focus===i?'#e8c78e':'#17313e';g.fillRect(sx-5,sy-6,11,13);txt(g,String(i+1),sx,sy-5,this.focus===i?'#10212d':'#efd8ac',{align:'center',shadow:null});});
      const actors=[{id:'player',x:this.walk.x,y:this.walk.y,dir:this.walk.dir,frame:this.walk.moving?[1,0,3,0][Math.floor(this.walk.t/.16)%4]:0}];
      if(this.room.resident)actors.push({id:RESIDENTS[this.room.resident].avatar,x:.39,y:.68,dir:0,frame:0,talk:talkingWho==='resident_'+this.room.resident});
      actors.sort((a,b)=>a.y-b.y).forEach(a=>{
        const im=charFrame(a.id,a.dir,a.frame,a.talk?Math.floor(this.t*5)%2:0),k=Math.max(.45,b.w/540),sw=Math.round(im.width*k),sh=Math.round(im.height*k),x=Math.round(b.x+a.x*b.w),y=Math.round(b.y+a.y*b.h);
        shadowAt(g,x,y,sw*.35,2);g.drawImage(im,x-Math.round(sw/2),y-sh,sw,sh);
      });
    }
    const resident=this.room.resident?RESIDENTS[this.room.resident]:null;
    const infoY=P?bottom+8:31;
    txt(g,resident?`${resident.name} · ${resident.role}`:'屋里暂时没有人，留下的物件还在。',14,infoY,UIC.dim);
    const actions=this.btns.filter(b=>!b.exit),gap=6;
    const actionTop=P?bottom+40:VH-48,cols=P?2:actions.length,bw=Math.floor((VW-28-gap*(cols-1))/cols);
    actions.forEach((b,i)=>{b.x=14+(i%cols)*(bw+gap);b.y=actionTop+Math.floor(i/cols)*28;b.w=bw;b.h=22;});
    if(P)drawLines(g,wrap(this.room.mood,VW-28,'#afc2c2'),14,actionTop+66,{lh:14});
    txt(g,P?'点物件观察 · 点地板走动':'方向键走动 · Tab 选物件 · 空格互动 · Esc 出门',14,VH-17,'#93aaa8');
    this.drawBtns(g);
  }
}
let interiorRequest=0;
async function openInterior(key) {
  const request=++interiorRequest,room=INTERIORS[key];
  if(!room||G.done<room.zone||topScreen()||scene!=='world'||scriptRunning)return;
  const state=G,start={x:player.x,y:player.y};
  const artKeys=[room.art,...(room.resident?['portraits-residents']:[])];
  if(!artKeys.every(k=>ART[k])&&!(await ensureStoryArt(artKeys))){toast('房间画面暂未载入，请稍后重试。',UIC.rose);return;}
  if(request!==interiorRequest||G!==state||topScreen()||scene!=='world'||scriptRunning||G.done<room.zone||Math.hypot(player.x-start.x,player.y-start.y)>4)return;
  const streetMusic=Audio.song;
  Audio.sfx('open');Audio.play(['library','observatory'].includes(room.theme)?'story':'night',.8);
  try { await openScreen(new InteriorScreen(key)); }
  finally { if(scene==='world')Audio.play(streetMusic||zoneMusic(Math.max(0,curZone)),.8); }
}
