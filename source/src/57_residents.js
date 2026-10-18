/*
 * 星灯镇的普通居民。全部对白为本项目原创，不是名人引言。
 * inspiration 仅记录创作参考；游戏只展示原创姓名、职业与生活。
 * lines / after 各是一组可轮换的短对话，afterAt 是故事进度门槛。
 * avatar 对应独立像素形象；fallbackAvatar 供尚未加载新形象时使用。
 */
const RESIDENTS = {
  puhe: {
    name: '蒲禾', avatar: 'resident_puhe', fallbackAvatar: 'prof',
    inspiration: '爱因斯坦的好奇提问与思想实验形象；非本人，未使用真实引言。',
    role: '灯罩匠', bio: '眼镜常架在头顶，窗边养着薄荷。接到灯罩活，总要先问光照向哪里。', zoneHint: 2, afterAt: 27,
    outfit: '蓬松银灰发和白胡须，额上架着护目镜；青灰开衫、米色围巾，腰边挂着黄色小灯罩。',
    lines: [
      [{ who: 'self', text: '灯不够亮？去桥对面看看，是路暗，还是台阶看不清。' }, { who: 'me', text: '点单页也得先找出顾客卡在哪儿。' }, { who: 'self', text: '我昨晚换了三只灯泡，才发现灯罩装反了。', emotion: 'sweat' }],
      [{ who: 'self', text: '奶茶店只能留一个按钮，你留哪个？' }, { who: 'me', text: '下单。把选好的奶茶送到后厨。' }, { who: 'self', text: '那就先做好它。花边等我喝完茶再说。' }],
      [{ who: 'self', text: '小 A 说新页面更快，和旧的比过了吗？' }, { who: 'me', text: '用同一台手机、同一张菜单，记下两边的用时。' }, { who: 'self', text: '多试几次。我的薄荷也不是每天长得一样快。' }],
      [{ who: 'self', text: '我在灯罩上开孔透气，墙上倒多了一颗星。', emotion: 'surprise' }, { who: 'me', text: '歪打正着，要留下吗？' }, { who: 'self', text: '先问问墙后的人。我的星星可能正照着他的枕头。' }],
    ],
    after: [
      [{ who: 'self', text: '灯没变亮，只挪低了一盏。桥头就没人踩空了。' }, { who: 'me', text: '看来找对了那一级台阶。' }, { who: 'self', text: '剩下的灯罩，给薄荷用。' }],
      [{ who: 'self', text: '大家都在拍灯，你怎么还盯着点单队伍？' }, { who: 'me', text: '我想看看，修好以后有没有少等一会儿。' }, { who: 'self', text: '看完也抬头。那颗不照枕头的星星，我替你留着。' }],
    ],
  },
  ali: {
    name: '阿砾', avatar: 'resident_ali', fallbackAvatar: 'builder',
    inspiration: '牛顿的观察现象与追问因果形象；非本人，未使用真实引言。',
    role: '钟楼学徒', bio: '带着慢两分钟的怀表，随手记录故障。“它就是坏了”可打发不了他。', zoneHint: 7, afterAt: 27,
    outfit: '暖棕肤色、深棕卷发，发间别着金色齿轮；赤陶色背带裤配浅黄衬衫。',
    lines: [
      [{ who: 'self', text: '钟不响，先看看拉绳。也许断了，不必急着拆齿轮。' }, { who: 'me', text: '点单没回应，也先查请求发出去了没有。' }, { who: 'self', text: '对，先查容易验证的。别一急就拆掉整座钟楼。' }],
      [{ who: 'self', text: '我只拧了一颗螺丝，再听钟声。你刚才改了几处？' }, { who: 'me', text: '按钮、价格、颜色……三处。' }, { who: 'self', text: '分开试。否则连是哪颗螺丝修好的，都说不清。' }],
      [{ who: 'self', text: '雨天钟会慢半拍。我记了四天，还不能确定是受潮。' }, { who: 'me', text: '先记着，别急着说是雨的缘故。' }, { who: 'self', text: '雨天我还打哈欠呢。总不能是钟被我传染了。' }],
      [{ who: 'self', text: '师傅问钟怎么了，我就报时间、天气和响声。' }, { who: 'me', text: '报错也得讲清：怎么操作的，应该怎样，实际怎样。' }, { who: 'self', text: '再带上相关日志。带着证据，少跑一趟。' }],
    ],
    after: [
      [{ who: 'self', text: '第一声钟，几乎和后厨第一张订单同时到了。' }, { who: 'me', text: '你的怀表终于准了？' }, { who: 'self', text: '钟准了，怀表还没有。那是另一件事，明早修。' }],
      [{ who: 'self', text: '故障的三步检查，我夹在钟楼门后了。' }, { who: 'me', text: '下个值班的人就不用从头猜了。' }, { who: 'self', text: '末尾还有一句：修好后，再听一次。' }],
    ],
  },
  baiyu: {
    name: '白榆', avatar: 'resident_baiyu', fallbackAvatar: 'merchant',
    inspiration: '乔布斯的产品取舍与体验关注形象；非本人，未使用真实引言。',
    role: '木器店主', bio: '衣服不起眼，椅子却很舒服。交货前，每处边角都要亲手摸过。', zoneHint: 1, afterAt: 27,
    outfit: '黑色偏分发，一侧削短；深墨高领、青绿工作围裙和牛仔蓝裤，身边带着木尺。',
    lines: [
      [{ who: 'self', text: '这把椅子有过杯架、书架、小抽屉。客人坐下，先撞了腿。' }, { who: 'me', text: '后来全拆了？', emotion: 'question' }, { who: 'self', text: '靠背留着。点单页也先让人顺当买到一杯。' }],
      [{ who: 'self', text: '下单键的字挺漂亮。鸭老师戴着手套，按得到吗？' }, { who: 'me', text: '得拿他的手机试，我的大屏幕不作数。' }, { who: 'self', text: '请他自己按。你俩的手可不一样大。' }],
      [{ who: 'self', text: '我不会把柜背磨成镜子，客人碰不到那里。' }, { who: 'me', text: '那先核对价格和订单，首页动画晚点做。' }, { who: 'self', text: '行。但答应给客人的，别也推到以后。' }],
      [{ who: 'self', text: '这条横木看着多余，拆了，椅腿就散。' }, { who: 'me', text: '付款前的确认也得留着，免得顾客买错。' }, { who: 'self', text: '要删哪一步，先看它替客人挡住了什么麻烦。' }],
    ],
    after: [
      [{ who: 'self', text: '鸭老师一次按中了下单键，说声“挺好”就去忙了。' }, { who: 'me', text: '没夸漂亮，你不失落？' }, { who: 'self', text: '他没研究怎么按，我就知道做对了。' }],
      [{ who: 'self', text: '要走了？门边的小凳带上，等车时坐。' }, { who: 'me', text: '四条腿，一个坐面。够简单。' }, { who: 'self', text: '还有刚好的高度。少，不等于没花心思。' }],
    ],
  },
  huiqing: {
    name: '茴青', avatar: 'resident_huiqing', fallbackAvatar: 'doc',
    inspiration: '格蕾丝·霍珀的务实排错与清晰表达形象；非本人，未使用真实引言。',
    role: '信号修理员', bio: '电线贴着标签，饭盒标着日期。话不多，交接单写得清楚。', zoneHint: 19, afterAt: 27,
    outfit: '深棕肤色、灰绿色短卷发，额上戴护目镜；藏蓝工装，肩边搭着橙色线圈，腰间挂着工具。',
    lines: [
      [{ who: 'self', text: '报错纸别揉。我们得靠它找出哪段信号断了。' }, { who: 'me', text: '我先去掉密钥和顾客信息，再把报错给小 A。' }, { who: 'self', text: '好，查断线用不着知道顾客住哪儿。' }],
      [{ who: 'self', text: '你说修好了？来，再按一次。' }, { who: 'me', text: '选奶茶，下单，再去后厨核对订单。' }, { who: 'self', text: '嗯。开关响了，还得看另一头的灯亮没亮。' }],
      [{ who: 'self', text: '这里留个接头。下次换灯，就不用重拉整条街的线。' }, { who: 'me', text: '接口约定好，换一部分也能接回去。' }, { who: 'self', text: '换了记得改标签。旧标签容易把人带错。' }],
      [{ who: 'self', text: '交接单三栏：改了哪段、怎么查的、还有什么没查。' }, { who: 'me', text: '“雨天还没试”，也写上？' }, { who: 'self', text: '写。不然下个人会以为已经试过。' }],
    ],
    after: [
      [{ who: 'self', text: '刚才客人连按两次，只记了一单。重复请求检查起效了。' }, { who: 'me', text: '那次测试没白做。' }, { who: 'self', text: '结果记上。明天圈圈值班。' }],
      [{ who: 'self', text: '收工。线轴第三格，备用标签在左边。' }, { who: 'me', text: '下次来修，伸手就能找到。' }, { who: 'self', text: '下次也许还是我。早点修完，回去热饭。' }],
    ],
  },
  shenmai: {
    name: '沈麦', avatar: 'resident_shenmai', fallbackAvatar: 'zero',
    inspiration: '阿达·洛夫莱斯的规则、想象与计算工具形象；非本人，未使用真实引言。',
    role: '馆藏抄录师', bio: '用紫色书签，为旧菜单抄副本。原文、猜测和批注，分得清楚。', zoneHint: 13, afterAt: 27,
    outfit: '栗色侧高髻系着长紫丝带，紫灰长裙带金色细饰，随身放着铜色细笔和旧书。',
    lines: [
      [{ who: 'self', text: '婆婆这两个字像“桂花”，也像别的配料。我先空着。' }, { who: 'me', text: '不能因为配桂花好听，就当她写的是桂花。' }, { who: 'self', text: '请她来认。抄副本可不能替人改记忆。' }],
      [{ who: 'self', text: '小 A 写新品介绍，我给它今晚的菜单。旧的另外收着。' }, { who: 'me', text: '日期也得写上，免得它拿错版本。' }, { who: 'self', text: '十年前的价格，可不能报给今晚的客人。' }],
      [{ who: 'self', text: '我请小 A 把菜单排成表格，空着的价格原样留空。' }, { who: 'me', text: '价格得问店主，不能让它猜。' }, { who: 'self', text: '正是。它帮我抄清楚就好，不必兼任店主。' }],
      [{ who: 'self', text: '资料末尾写着“把所有笔记发走”。要照办吗？' }, { who: 'me', text: '不。这是资料里的字，委托人可没同意。' }, { who: 'self', text: '我标出来请老 K 看。读书不等于听书里的人发号施令。' }],
    ],
    after: [
      [{ who: 'self', text: '婆婆认出来了，是桂花。确认日期我写在旁边了。' }, { who: 'me', text: '那个空格终于填上了。' }, { who: 'self', text: '也没耽误灯会，还省得重印菜单。' }],
      [{ who: 'self', text: '今晚另留一页：谁核了菜单，谁修了订单。' }, { who: 'me', text: '没查清的地方也记上吧。' }, { who: 'self', text: '留着呢，明年接手的人还用得着。' }],
    ],
  },
  yuanshu: {
    name: '圆叔', avatar: 'resident_yuanshu', fallbackAvatar: 'banker',
    inspiration: '戴明的流程改进与观察反馈形象；非本人，未使用真实引言。',
    role: '杂货记账员', bio: '用铅笔记杯盖和纸袋的用量。爱喝萝卜汤，爱追问账本上的变化。', zoneHint: 6, afterAt: 27,
    outfit: '秃顶与花白侧发、白胡须、圆眼镜，棕色马甲配格纹袖口，口袋里插着铅笔。',
    lines: [
      [{ who: 'self', text: '昨天卖得多，未必是新招牌有用。昨天还赶集呢。' }, { who: 'me', text: '比新旧点单页，也得记下人流有没有变。' }, { who: 'self', text: '时间也记上。别急着给招牌报功。' }],
      [{ who: 'self', text: '新纸袋请三个人试：拎热饮的、拎冷饮的、骑车的。' }, { who: 'me', text: '点单页也找几种顾客试，不能只靠我。' }, { who: 'self', text: '三个人不代表全镇，倒能先看看袋底漏不漏。' }],
      [{ who: 'self', text: '页面开了那么多次，奶茶卖出几杯？' }, { who: 'me', text: '得查下单成功没有、后厨收到没有，再看客人等了多久。' }, { who: 'self', text: '这些才跟店里的生意对得上。' }],
      [{ who: 'self', text: '这杯盖贵，却少洒。我连退款和擦桌子的时间一起记。' }, { who: 'me', text: '挑 AI 工具，也不能只算调用费。' }, { who: 'self', text: '漏掉的、改错的、要重做的，都算进去。' }],
    ],
    after: [
      [{ who: 'self', text: '今晚队伍短些了。我记了三次高峰，明天核旧账。' }, { who: 'me', text: '先不写“效率翻倍”？' }, { who: 'self', text: '先写我看见的。数字又不会跑。' }],
      [{ who: 'self', text: '剩七只杯盖，没倒掉一杯热饮。比我想的好。' }, { who: 'me', text: '今晚最满意什么？' }, { who: 'self', text: '鸭老师终于坐下喝汤了。这事账本上可没有。', emotion: 'joy' }],
    ],
  },
  zhixia: {
    name: '知夏', avatar: 'resident_zhixia', fallbackAvatar: 'granny',
    inspiration: '玛格丽特·汉密尔顿的可靠性与意外准备形象；非本人，未使用真实引言。',
    role: '缝补师', bio: '缝了灯会的大布旗，也会在衣服里藏颗备用扣子。针线总多备一份。', zoneHint: 11, afterAt: 27,
    outfit: '米色补丁头巾下垂着深棕麻花辫，浅绿上衣配靛蓝围裙，身边带着红色针线包。',
    lines: [
      [{ who: 'self', text: '旗子平平整整，也得拉拉挂绳。今晚要是起风呢？' }, { who: 'me', text: '下单也得试试断网、连按两次会怎样。' }, { who: 'self', text: '先防常见的意外，别等客人拿着坏东西找来。' }],
      [{ who: 'self', text: '改衣长先缝疏线。尺寸错了，拆开也不伤布。' }, { who: 'me', text: '改代码先存好，试验放分支里。' }, { who: 'self', text: '还得认得哪版合身。存一大堆，急时找不到也白搭。' }],
      [{ who: 'self', text: '备用扣子能补救，可不能让衣服从此不掉扣子。' }, { who: 'me', text: '回滚能恢复服务，平时还是得测试。' }, { who: 'self', text: '旧版也要接得上现在的数据，别拿旧线硬缝新布。' }],
      [{ who: 'self', text: '旗子断了一处，我先收紧旁边，免得砸到人。' }, { who: 'me', text: '出故障先减少影响，再查原因。' }, { who: 'self', text: '补好了还得拉一拉。打完结，可没算交工。' }],
    ],
    after: [
      [{ who: 'self', text: '风起过两回，旗子都好好的。备用绳我带回去。' }, { who: 'me', text: '没用上，也没白备。' }, { who: 'self', text: '有它在，我才敢松开旗杆去喝热的。' }],
      [{ who: 'self', text: '袖口松了，我收了两针。备用线在内袋。' }, { who: 'me', text: '连我回去以后也想到了。' }, { who: 'self', text: '就想到这点。够撑到下一家缝补店。' }],
    ],
  },
  guancheng: {
    name: '关澄', avatar: 'resident_guancheng', fallbackAvatar: 'runner',
    inspiration: '唐纳德·诺曼的日常使用体验与可理解设计形象；非本人，未使用真实引言。',
    role: '骑车试饮员', bio: '从河对岸骑来，爱温抹茶。总能找出设计者习惯了、客人却用不顺的地方。', zoneHint: 5, afterAt: 27,
    outfit: '暖棕肤色、黑短发，橘色骑行头盔上架着护目镜；湖绿外套带浅色拼接，斜挎棕色小包。',
    lines: [
      [{ who: 'self', text: '这门把手明明像拉的，却写着“推”。我撞了两次。', emotion: 'sweat' }, { who: 'me', text: '按钮也得让人一眼懂，别全靠说明。' }, { who: 'self', text: '尤其我一手扶车，一手拿手机的时候。' }],
      [{ who: 'self', text: '按完下单没动静，我就又按了一次。' }, { who: 'me', text: '得先显示处理中，再告诉你结果。' }, { who: 'self', text: '失败也说一声。别等我骑到桥头，才知道没下成。' }],
      [{ who: 'self', text: '让我试，你可别在旁边说“点这里”。' }, { who: 'me', text: '好，我看你自己找。卡在哪儿，记哪儿。' }, { who: 'self', text: '开门营业以后，网页旁边可没有不响指路。' }],
      [{ who: 'self', text: '冰的想改温的，怎么回不去？要重新点一整单？' }, { who: 'me', text: '得留个修改入口。选错了不用从头来。' }, { who: 'self', text: '改好叫我。我绕一圈回来，换只手试。' }],
    ],
    after: [
      [{ who: 'self', text: '从选饮品到拿到取餐号，我一句都没问你。' }, { who: 'me', text: '温抹茶也没点错吧？' }, { who: 'self', text: '没错。取餐前还能核一眼，这个好。' }],
      [{ who: 'self', text: '车停好了，总算能两只手捧杯子。' }, { who: 'me', text: '下版还帮我试吗？' }, { who: 'self', text: '行，先让我看灯。顾客可不会整天盯着网页。' }],
    ],
  },
  songguo: {
    name: '松果', avatar: 'resident_songguo', fallbackAvatar: 'webkid',
    inspiration: '宫崎骏作品创作中对日常动作与环境细节的关注；非本人，未使用真实引言。',
    role: '布景师', bio: '口袋有树叶和颜料屑，认得每只猫的步子。爱坐在门口看人用桌子。', zoneHint: 10, afterAt: 27,
    outfit: '蓬松的棕色偏分发遮住一侧，夹着纸叶与绿叶；苔绿外套和沾着暖黄、天蓝颜料的围裙。',
    lines: [
      [{ who: 'self', text: '画鸭老师前，我看他擦杯口。每次都要把杯子转半圈。' }, { who: 'me', text: '画出这个动作，就不用长篇介绍他了。' }, { who: 'self', text: '对，一眼就看得出他有多爱惜这家店。' }],
      [{ who: 'self', text: '墙角我画旧了。柜台上给客人的杯子，可得擦亮。' }, { who: 'me', text: '细节得有来由，不能只顾着塞满画面。' }, { who: 'self', text: '那盆植物歪着，是朝窗口长。总比硬摆三尊雕像好玩。' }],
      [{ who: 'self', text: '页面哪儿都要动？坐下，先看后厨怎么递奶茶。' }, { who: 'me', text: '该让人注意的，原来就那几个动作。' }, { who: 'self', text: '找取餐号时，背景就该安静些。' }],
      [{ who: 'self', text: '灯会颜色，我先画三张小稿。整面墙不急着动。' }, { who: 'me', text: '小样挑对了，再画完整场景。' }, { who: 'self', text: '挑哪张都行，可别说“随便”。我真会照着画。' }],
    ],
    after: [
      [{ who: 'self', text: '墙画完了，留一小块空白，刚好露出真正的河。' }, { who: 'me', text: '那块反而最亮。' }, { who: 'self', text: '今天的河这么好看，何必再画一遍。' }],
      [{ who: 'self', text: '小 A 刚才双手捧杯子，小心得很。我画下来了。' }, { who: 'me', text: '它头一回招待客人。' }, { who: 'self', text: '我在背后记上今天。下次来，看看它熟练多少。' }],
    ],
  },
  tianxu: {
    name: '田序', avatar: 'resident_tianxu', fallbackAvatar: 'priest',
    inspiration: '费曼的用简单说明检验理解与动手探索形象；非本人，未使用真实引言。',
    role: '回收修理师', bio: '旧收音机拆了又装，说明也改了又改。得让隔壁卖菜的听懂才行。', zoneHint: 17, afterAt: 27,
    outfit: '赤棕卷发与浓胡须，额上架着护目镜；砖红衬衫、蓝灰工具围裙和灰工裤。',
    lines: [
      [{ who: 'self', text: '你说“接口异常”，隔壁还是不知道奶茶送到哪了。' }, { who: 'me', text: '那我说：柜台发了单，后厨还没回执。' }, { who: 'self', text: '这才知道往哪查。说得复杂，未必说得准。' }],
      [{ who: 'self', text: '收音机零件名我全会背，可它还是不响。' }, { who: 'me', text: '知道叫什么，不等于知道怎么修。' }, { who: 'self', text: '先接电试。你学了术语，也拿件小事用用。' }],
      [{ who: 'self', text: '零件来路不明，再便宜也别急着装进收银机。' }, { who: 'me', text: '依赖先查来源、维护和许可，再实际跑一遍。' }, { who: 'self', text: '也看看用不用得上。门铃装个发动机，多费电。' }],
      [{ who: 'self', text: '学徒讲改法，讲到第二句，发现自己漏接了线。' }, { who: 'me', text: '我也得听小 A 讲讲，哪儿还没想明白。' }, { who: 'self', text: '讲完照样得试。说得通，未必接得通。' }],
    ],
    after: [
      [{ who: 'self', text: '收音机响了，可别把它当成全镇广播系统。' }, { who: 'me', text: '小样修好，整套还得另试。' }, { who: 'self', text: '先给屋里放首歌。做到这一步也挺好。' }],
      [{ who: 'self', text: '送你颗木头按钮。按下去什么也不会发生。' }, { who: 'me', text: '那它能做什么？', emotion: 'question' }, { who: 'self', text: '提醒你问这句话。我头回接委托，就忘了问。' }],
    ],
  },
  qiaosui: {
    name: '乔穗', avatar: 'resident_qiaosui', fallbackAvatar: 'cook',
    inspiration: '玛丽·居里的细致记录与反复核验形象；非本人，未使用真实引言。',
    role: '夜班调配师', bio: '试饮杯排成一行，每次改配方都记下。她的猫只肯睡废稿纸。', zoneHint: 14, afterAt: 27,
    outfit: '黑色齐刘海短发中有一束白色挑染，米白工作外套配青色围裙，腰边挂着琥珀色小瓶。',
    lines: [
      [{ who: 'self', text: '这三杯只换糖量，茶先别动。我得弄清客人嫌哪种甜。' }, { who: 'me', text: '比提示词也尽量用同样的材料和任务。' }, { who: 'self', text: '不然碰巧做对了，下次还是不会做。' }],
      [{ who: 'self', text: '小 A 抄对一次菜单，就能把所有订单交给它了？' }, { who: 'me', text: '还得试模糊字、缺页、旧价格，看它会不会乱补。' }, { who: 'self', text: '我的配方也得放凉再尝。刚出锅好喝，还不够。' }],
      [{ who: 'self', text: '试验记录有人写了顾客电话，我换成了编号。' }, { who: 'me', text: '只留测试需要的，别把隐私到处复制。' }, { who: 'self', text: '假样例能测清楚的，就用假的。' }],
      [{ who: 'self', text: '三次失败都记着。别帮我擦。' }, { who: 'me', text: '留着，才知道新办法有没有改好。' }, { who: 'self', text: '也省得别人重试。这几张纸，连猫都不许睡。' }],
    ],
    after: [
      [{ who: 'self', text: '试饮评价收齐了。有人喜欢，有人说茶淡。' }, { who: 'me', text: '下一版就加浓？' }, { who: 'self', text: '先核对口味和茶的批次，别把两杯不同的算在一起。' }],
      [{ who: 'self', text: '账本合上，猫总算有地方睡了。今天到这儿。' }, { who: 'me', text: '还空一页呢。' }, { who: 'self', text: '明早再查。困着硬填，明天又得重做。' }],
    ],
  },
  wangshu: {
    name: '望舒', avatar: 'resident_wangshu', fallbackAvatar: 'postman',
    inspiration: '伊万·萨瑟兰的交互原型与直接操作探索形象；非本人，未使用真实引言。',
    role: '邮签设计师', bio: '先折纸片请人试，再刻正式印章。邮戳总不知塞在哪边口袋。', zoneHint: 22, afterAt: 27,
    outfit: '淡紫不对称短发、一侧削短，六角铜框眼镜；蓝白条纹领口，腰侧挂着邮戳小包。',
    lines: [
      [{ who: 'self', text: '纸片是点单页。来，把想喝的奶茶推到框里。' }, { who: 'me', text: '不用等代码写完，就能试操作了。' }, { who: 'self', text: '摆错了挪一下，可比重刻印章轻松。' }],
      [{ who: 'self', text: '成功下单画好了，失败那页呢？' }, { who: 'me', text: '留住选好的饮品，说明失败，再让人重试。' }, { who: 'self', text: '空购物车、价格变动也画上。客人可不只走顺路。' }],
      [{ who: 'self', text: '阿邮说请柬要醒目。我做两张，让她站三步外找日期。' }, { who: 'me', text: '这样就能比出来，不用光说“更好看”。' }, { who: 'self', text: '她选字大的那张。我的金花边只好搬到背面。' }],
      [{ who: 'self', text: '这原型有付款按钮，可还没接支付。' }, { who: 'me', text: '演示得说清哪些能用，哪些只是画的。' }, { who: 'self', text: '我贴了“试样”。阿邮还得按进度安排寄信呢。' }],
    ],
    after: [
      [{ who: 'self', text: '阿邮说，请柬送完，没人再来问几点开灯会了。' }, { who: 'me', text: '大字那版选对了。' }, { who: 'self', text: '留着当模板。下次改好日期，再请她读一遍。' }],
      [{ who: 'self', text: '送你一枚星灯邮戳。别盖在正式车票上啊。' }, { who: 'me', text: '盖在旅途手记的空白处。' }, { who: 'self', text: '这就好。喜欢，也不用到处都盖。' }],
    ],
  },
};

// UI 只使用此公开信息；inspiration 不进入对话或人物介绍。
function residentProfile(key) {
  const r = RESIDENTS[key];
  if (!r) return null;
  return { key, name: r.name, avatar: r.avatar, fallbackAvatar: r.fallbackAvatar, role: r.role, bio: r.bio, outfit: r.outfit, zoneHint: r.zoneHint };
}
function registerResidentVoices() {
  Object.entries(RESIDENTS).forEach(([key, r], i) => {
    const id = typeof CHAR !== 'undefined' && CHAR[r.avatar] ? r.avatar : r.fallbackAvatar;
    const base = Object.values(WHO).find(w => w.id === r.fallbackAvatar) || WHO.me;
    WHO['resident_' + key] = { n: r.name, id, c: base.c, v: (i + 2) % 10 };
  });
}
function residentConversation(key, visit = 0, progress = 0) {
  const r = RESIDENTS[key]; if (!r) return [];
  const pool = progress >= r.afterAt && r.after.length ? r.after : r.lines;
  const index = Math.max(0, Math.floor(Number.isFinite(visit) ? visit : 0)) % pool.length;
  return pool[index].map(line => {
    const speech = [line.who === 'self' ? 'resident_' + key : line.who, line.text];
    if (line.emotion) speech.push('', { emotion: line.emotion });
    return speech;
  });
}
async function talkResident(key) {
  const r = RESIDENTS[key]; if (!r) return false;
  registerResidentVoices();
  if (!G.residentVisits || typeof G.residentVisits !== 'object' || Array.isArray(G.residentVisits)) G.residentVisits = {};
  const phase = G.done >= r.afterAt ? 'after' : 'before', slot = key + ':' + phase;
  const visit = Number.isSafeInteger(G.residentVisits[slot]) && G.residentVisits[slot] >= 0 ? G.residentVisits[slot] : 0;
  await talk(residentConversation(key, visit, G.done));
  G.residentVisits[slot] = visit + 1;
  save();
  return true;
}
registerResidentVoices();
