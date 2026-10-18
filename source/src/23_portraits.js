/* 正式对话胸像：独立像素原画，不从行走小人放大截取。
 * 每组原图为 4×3 图集；留内边距，避免相邻格的衣角进入头像。
 */
const PORTRAIT_GROUPS = {
  'portraits-main': ['xa','duck','chef','pm','snail','webkid','cook','waiter','builder','prof','granny','detective'],
  'portraits-town': ['zero','runner','priest','merchant','banker','doc','homebody','postman','astro','kidA','kidB','kidC'],
  'portraits-residents': ['resident_puhe','resident_ali','resident_baiyu','resident_huiqing','resident_shenmai','resident_yuanshu','resident_zhixia','resident_guancheng','resident_songguo','resident_tianxu','resident_qiaosui','resident_wangshu'],
  'portraits-fantasy': ['boss:fog','boss:ghost','boss:fox','boss:dragon2','boss:fire','boss:final','bug','sticky','kidD','iceKid','guard','tea'],
};
const PORTRAIT_LOOKUP = Object.fromEntries(Object.entries(PORTRAIT_GROUPS).flatMap(([art,ids]) => ids.map((id,index)=>[id,{art,index}])));
function illustratedPortrait(id) {
  if (typeof ART === 'undefined') return null;
  if (id === 'player') {
    const img = ART['portrait-hero'];
    // 与已确认的「雾松」预览使用同一透明胸像和裁切，保留完整发梢与双肩。
    return img ? {img,sx:img.width*132/1254,sy:img.height*64/1254,sw:img.width*992/1254,sh:img.height*1180/1254,artwork:true,background:{light:'#CDD7C1',base:'#A8B7A5',shade:'#849C8D'}} : null;
  }
  const slot=PORTRAIT_LOOKUP[id],img=slot&&ART[slot.art];
  if (!img) return null;
  const w=img.width/4,h=img.height/3,pad=Math.max(2,Math.round(w*.022));
  return {img,sx:Math.round(slot.index%4*w)+pad,sy:Math.round(Math.floor(slot.index/4)*h)+pad,sw:Math.floor(w)-pad*2,sh:Math.floor(h)-pad*2,artwork:true};
}
