import { Work } from '../types';
import { CORPUS_WORKS } from './corpus';
import { CORRECTED_WORKS, correctKnownImportedWork } from './corrections';
import { MODERN_WORKS } from './modern';
import { LISAO_GLOSSARY, LISAO_LINES } from './lisao';

const CURATED_WORKS: Work[] = [
  {
    id: 'lisao',
    title: '离骚',
    author: '屈原',
    dynasty: '先秦',
    genre: '楚辞',
    collections: ['楚辞', '先秦'],
    themes: ['理想', '爱国', '香草', '长诗'],
    order: 3,
    moods: ['浪漫', '悲愤', '雄浑'],
    intro: '屈原的长篇政治抒情诗，以香草、美人、神话和远游寄托理想与不屈。',
    source: '楚辞数据来自 chinese-poetry/chinese-poetry（MIT）',
    lines: LISAO_LINES,
    translations: LISAO_LINES.map(() => ''),
    glossary: LISAO_GLOSSARY,
  },
  {
    "id": "jing-ye-si",
    "order": 6,
    "title": "静夜思",
    "author": "李白",
    "dynasty": "唐",
    "genre": "诗",
    "collections": [
      "唐诗",
      "五言绝句"
    ],
    "themes": [
      "月亮",
      "思乡",
      "夜"
    ],
    "moods": [
      "幽静",
      "哀婉"
    ],
    "intro": "一轮明月，引出一段安静的乡愁。",
    "lines": [
      "床前明月光，",
      "疑是地上霜。",
      "举头望明月，",
      "低头思故乡。"
    ],
    "translations": [
      "明亮的月光洒在床前。",
      "好像地上泛起了一层白霜。",
      "抬起头望着天上的明月。",
      "低下头思念远方的故乡。"
    ],
    "source": "中华古诗词数据库（MIT）",
    "glossary": [
      {
        "lineIndex": 1,
        "surface": "疑",
        "pinyin": "yí",
        "partOfSpeech": "动词",
        "meaningInContext": "以为，怀疑。",
        "plainTranslation": "好像地上的霜一样。",
        "grammar": "此处不是“疑问”，而是“以为、像”。",
        "confidence": "high",
        "source": "内置基础注释"
      },
      {
        "lineIndex": 2,
        "surface": "举头",
        "pinyin": "jǔ tóu",
        "partOfSpeech": "动宾短语",
        "meaningInContext": "抬起头。",
        "plainTranslation": "抬头望着天上的明月。",
        "confidence": "high",
        "source": "内置基础注释"
      }
    ]
  },
  {
    "id": "deng-guan-que-lou",
    "order": 7,
    "title": "登鹳雀楼",
    "author": "王之涣",
    "dynasty": "唐",
    "genre": "诗",
    "collections": [
      "唐诗",
      "五言绝句"
    ],
    "themes": [
      "登高",
      "哲理",
      "山河"
    ],
    "moods": [
      "雄浑",
      "励志",
      "旷达"
    ],
    "intro": "由眼前景色推向更高远的境界，后两句成为传诵千古的名句。",
    "lines": [
      "白日依山尽，",
      "黄河入海流。",
      "欲穷千里目，",
      "更上一层楼。"
    ],
    "translations": [
      "太阳依傍着山峦缓缓落下。",
      "黄河朝着大海奔流而去。",
      "想要看到千里之外的景色。",
      "就要再登上一层高楼。"
    ],
    "source": "中华古诗词数据库（MIT）",
    "glossary": []
  },
  {
    "id": "jian-jia",
    "order": 1,
    "title": "诗经·秦风·蒹葭",
    "author": "佚名",
    "dynasty": "先秦",
    "genre": "诗经",
    "collections": [
      "诗经",
      "秦风"
    ],
    "themes": [
      "爱情",
      "思念",
      "秋水"
    ],
    "moods": [
      "哀婉",
      "浪漫"
    ],
    "intro": "秋水苍茫，伊人似在水中央。既写爱情，也可读作对理想境界的追寻。",
    "lines": [
      "蒹葭苍苍，白露为霜。",
      "所谓伊人，在水一方。",
      "溯洄从之，道阻且长。",
      "溯游从之，宛在水中央。",
      "蒹葭萋萋，白露未晞。",
      "所谓伊人，在水之湄。",
      "溯洄从之，道阻且跻。",
      "溯游从之，宛在水中坻。",
      "蒹葭采采，白露未已。",
      "所谓伊人，在水之涘。",
      "溯洄从之，道阻且右。",
      "溯游从之，宛在水中沚。"
    ],
    "translations": [
      "芦苇苍苍，白露凝成霜。",
      "我所思念的人，就在水的另一边。",
      "逆流去寻找她，道路险阻又漫长。",
      "顺流去寻找她，她仿佛就在水中央。",
      "芦苇茂盛，白露还没有干。",
      "我所思念的人，就在水边。",
      "逆流去寻找她，道路险阻而升高。",
      "顺流去寻找她，她仿佛就在水中的小洲上。",
      "芦苇繁盛，白露还没有停止。",
      "我所思念的人，就在水边。",
      "逆流去寻找她，道路险阻而曲折。",
      "顺流去寻找她，她仿佛就在水中的小洲上。"
    ],
    "source": "中华古诗词数据库（MIT）",
    "glossary": []
  },
  {
    "id": "wu-yi",
    "order": 2,
    "title": "诗经·秦风·无衣",
    "author": "佚名",
    "dynasty": "先秦",
    "genre": "诗经",
    "collections": [
      "诗经",
      "秦风"
    ],
    "themes": [
      "爱国",
      "战争",
      "友情",
      "团结"
    ],
    "moods": [
      "壮烈",
      "豪放"
    ],
    "intro": "三章反复唱出同袍、同泽、同裳，是《诗经》中最有战斗号召力的篇章之一。",
    "lines": [
      "岂曰无衣？与子同袍。",
      "王于兴师，修我戈矛。与子同仇！",
      "岂曰无衣？与子同泽。",
      "王于兴师，修我矛戟。与子偕作！",
      "岂曰无衣？与子同裳。",
      "王于兴师，修我甲兵。与子偕行！"
    ],
    "translations": [
      "谁说没有军衣？我和你同穿一件战袍。",
      "君王出兵作战，我们修好戈和矛，共同对付仇敌。",
      "谁说没有军衣？我和你同穿一件内衣。",
      "君王出兵作战，我们修好矛和戟，一起行动起来。",
      "谁说没有军衣？我和你同穿一件下裳。",
      "君王出兵作战，我们修好铠甲兵器，一起上战场。"
    ],
    "source": "中华古诗词数据库（MIT）",
    "glossary": []
  },
  {
    "id": "jiang-nan-yuefu",
    "order": 4,
    "title": "江南",
    "author": "佚名",
    "dynasty": "汉",
    "genre": "乐府",
    "collections": [
      "汉乐府",
      "乐府"
    ],
    "themes": [
      "相聚",
      "江南",
      "自然",
      "游乐"
    ],
    "moods": [
      "清新",
      "闲适"
    ],
    "intro": "鱼在莲叶间四面游戏，语言轻快，像一首劳动或游乐的民歌。",
    "lines": [
      "江南可采莲，",
      "莲叶何田田。",
      "鱼戏莲叶间。",
      "鱼戏莲叶东，",
      "鱼戏莲叶西，",
      "鱼戏莲叶南，",
      "鱼戏莲叶北。"
    ],
    "translations": [
      "江南可以采莲。",
      "莲叶多么茂盛。",
      "鱼儿在莲叶间嬉戏。",
      "鱼儿游到莲叶东边，",
      "鱼儿游到莲叶西边，",
      "鱼儿游到莲叶南边，",
      "鱼儿游到莲叶北边。"
    ],
    "source": "中华古诗词数据库（MIT）",
    "glossary": []
  },
  {
    "id": "qi-bu-shi",
    "order": 5,
    "title": "七步诗",
    "author": "曹植",
    "dynasty": "魏晋",
    "genre": "诗",
    "collections": [
      "魏晋诗",
      "五言诗"
    ],
    "themes": [
      "亲情",
      "悲愤",
      "咏物"
    ],
    "moods": [
      "悲愤",
      "讽刺"
    ],
    "intro": "借用豆和萁本是同根所生，比喻兄弟之间何必相逼。",
    "lines": [
      "煮豆持作羹，漉菽以为汁。",
      "萁在釜下燃，豆在釜中泣。",
      "本自同根生，相煎何太急？"
    ],
    "translations": [
      "煮豆子做成豆羹，过滤豆子做成汁。",
      "豆萁在锅下燃烧，豆子在锅里哭泣。",
      "我们本来是同一条根上生长出来的，为什么逼迫得这么急？"
    ],
    "source": "中华古诗词数据库（MIT）",
    "glossary": []
  },
  {
    "id": "song-du-shaofu",
    "order": 8,
    "title": "送杜少府之任蜀州",
    "author": "王勃",
    "dynasty": "唐",
    "genre": "诗",
    "collections": [
      "唐诗",
      "五言律诗"
    ],
    "themes": [
      "送别",
      "友情",
      "离别"
    ],
    "moods": [
      "旷达"
    ],
    "intro": "送别诗里的名篇：真正的知己，即使远隔天涯，也像近邻一样。",
    "lines": [
      "城阙辅三秦，风烟望五津。",
      "与君离别意，同是宦游人。",
      "海内存知己，天涯若比邻。",
      "无为在歧路，儿女共沾巾。"
    ],
    "translations": [
      "三秦之地护卫着长安，遥望蜀州的五个渡口。",
      "我和你同样为了做官而奔走，此刻离别的心情也相同。",
      "只要四海之内还有你这个知己，即使远在天边也像近邻。",
      "不要在分手的岔路口，像小儿女一样哭泣沾湿手巾。"
    ],
    "source": "中华古诗词数据库（MIT）",
    "glossary": []
  },
  {
    "id": "song-yuan-er",
    "order": 9,
    "title": "送元二使安西",
    "author": "王维",
    "dynasty": "唐",
    "genre": "诗",
    "collections": [
      "唐诗",
      "七言绝句"
    ],
    "themes": [
      "送别",
      "友情",
      "边塞"
    ],
    "moods": [
      "哀婉",
      "缠绵"
    ],
    "intro": "一场清晨细雨，一杯送别酒，写尽了阳关之外的故人之情。",
    "lines": [
      "渭城朝雨浥轻尘，",
      "客舍青青柳色新。",
      "劝君更尽一杯酒，",
      "西出阳关无故人。"
    ],
    "translations": [
      "渭城清晨的细雨润湿了地上的轻尘。",
      "旅舍旁的柳树被雨水洗得青青一新。",
      "请你再饮下这一杯送别酒。",
      "向西出了阳关，就再也见不到老朋友了。"
    ],
    "source": "中华古诗词数据库（MIT）",
    "glossary": []
  },
  {
    "id": "guo-gu-ren-zhuang",
    "order": 10,
    "title": "过故人庄",
    "author": "孟浩然",
    "dynasty": "唐",
    "genre": "诗",
    "collections": [
      "唐诗",
      "五言律诗"
    ],
    "themes": [
      "相聚",
      "友情",
      "田园"
    ],
    "moods": [
      "闲适",
      "清新"
    ],
    "intro": "朋友备好饭菜，邀诗人到乡村做客，写出最朴素的相聚之乐。",
    "lines": [
      "故人具鸡黍，邀我至田家。",
      "绿树村边合，青山郭外斜。",
      "开轩面场圃，把酒话桑麻。",
      "待到重阳日，还来就菊花。"
    ],
    "translations": [
      "老朋友准备了鸡肉和黄米饭，邀请我到他的农家做客。",
      "绿树环绕着村庄，青山在城外横斜。",
      "打开窗户面对谷场和菜园，端起酒杯谈说农事。",
      "等到九月九日重阳节，我还要再来赏菊。"
    ],
    "source": "中华古诗词数据库（MIT）",
    "glossary": []
  },
  {
    "id": "li-si-qi-si",
    "order": 14,
    "title": "离思五首·其四",
    "author": "元稹",
    "dynasty": "唐",
    "genre": "诗",
    "collections": [
      "唐诗",
      "七言绝句"
    ],
    "themes": [
      "悼亡",
      "爱情",
      "思念"
    ],
    "moods": [
      "哀婉",
      "缠绵"
    ],
    "intro": "经历过最深的情感之后，世间其他风景都失去了颜色。",
    "lines": [
      "曾经沧海难为水，",
      "除却巫山不是云。",
      "取次花丛懒回顾，",
      "半缘修道半缘君。"
    ],
    "translations": [
      "经历过沧海之后，别处的水就很难再称为水。",
      "除了巫山的云，别处的云都不算真正的云。",
      "随意走过花丛，也懒得回头观看。",
      "一半是因为修道，一半是因为你。"
    ],
    "source": "中华古诗词数据库（MIT）",
    "glossary": []
  },
  {
    "id": "liang-zhou-ci",
    "order": 13,
    "title": "凉州词",
    "author": "王翰",
    "dynasty": "唐",
    "genre": "诗",
    "collections": [
      "唐诗",
      "七言绝句"
    ],
    "themes": [
      "边塞",
      "战争",
      "豪迈"
    ],
    "moods": [
      "豪放",
      "苍凉"
    ],
    "intro": "边地美酒与马上琵琶交织，末句带着豪迈也带着苍凉。",
    "lines": [
      "葡萄美酒夜光杯，",
      "欲饮琵琶马上催。",
      "醉卧沙场君莫笑，",
      "古来征战几人回？"
    ],
    "translations": [
      "甘甜的葡萄美酒盛在夜光杯中。",
      "刚要畅饮，马上的琵琶声已经催促出征。",
      "即使醉倒在战场上也不要笑。",
      "自古以来出征打仗的人有几个能回来？"
    ],
    "source": "中华古诗词数据库（MIT）",
    "glossary": []
  },
  {
    "id": "shui-diao-ge-tou",
    "order": 15,
    "title": "水调歌头·明月几时有",
    "author": "苏轼",
    "dynasty": "宋",
    "genre": "词",
    "collections": [
      "宋词",
      "宋词三百首"
    ],
    "themes": [
      "月亮",
      "思念",
      "亲情",
      "中秋"
    ],
    "moods": [
      "旷达",
      "浪漫"
    ],
    "intro": "中秋怀人之作，把人间离合放入月亮的阴晴圆缺之中。",
    "lines": [
      "明月几时有？把酒问青天。",
      "不知天上宫阙，今夕是何年。",
      "我欲乘风归去，又恐琼楼玉宇，高处不胜寒。",
      "起舞弄清影，何似在人间。",
      "转朱阁，低绮户，照无眠。",
      "不应有恨，何事长向别时圆？",
      "人有悲欢离合，月有阴晴圆缺，此事古难全。",
      "但愿人长久，千里共婵娟。"
    ],
    "translations": [
      "明月从什么时候开始有的？我端起酒杯询问青天。",
      "不知道天上的宫殿，今晚是哪一年。",
      "我想乘着风回到天上去，又怕美玉砌成的楼宇太高，经受不住寒冷。",
      "起身舞蹈，玩赏着清朗的月影，哪里比得上人间呢？",
      "月光转过朱红楼阁，低低照进雕花窗户，照着不能入睡的人。",
      "月亮不应该有什么怨恨，为什么总在人们离别时才圆呢？",
      "人有悲欢离合，月有阴晴圆缺，这种事自古以来难以两全。",
      "只希望人能够长久平安，即使相隔千里，也能共享这美好的月光。"
    ],
    "source": "中华古诗词数据库（MIT）",
    "glossary": []
  },
  {
    "id": "yu-lin-ling",
    "order": 17,
    "title": "雨霖铃·寒蝉凄切",
    "author": "柳永",
    "dynasty": "宋",
    "genre": "词",
    "collections": [
      "宋词",
      "宋词三百首"
    ],
    "themes": [
      "离别",
      "爱情",
      "秋"
    ],
    "moods": [
      "婉约",
      "缠绵",
      "哀婉"
    ],
    "intro": "长亭、兰舟、泪眼、残月，层层写出一场最难割舍的离别。",
    "lines": [
      "寒蝉凄切，对长亭晚，骤雨初歇。",
      "都门帐饮无绪，留恋处，兰舟催发。",
      "执手相看泪眼，竟无语凝噎。",
      "念去去，千里烟波，暮霭沉沉楚天阔。",
      "多情自古伤离别，更那堪，冷落清秋节！",
      "今宵酒醒何处？杨柳岸，晓风残月。",
      "此去经年，应是良辰好景虚设。",
      "便纵有千种风情，更与何人说？"
    ],
    "translations": [
      "寒蝉叫声凄凉急促，面对着长亭，傍晚时分，骤雨刚刚停歇。",
      "在京城门外设帐饯别，却没有心绪，正在留恋不舍时，船夫催着出发。",
      "拉着手互相看着含泪的双眼，竟哽咽得说不出话来。",
      "想到这一去，千里烟波浩渺，沉沉暮霭中楚地天空辽阔无边。",
      "自古以来多情的人最伤心离别，更哪能忍受在这冷落清秋时节分别。",
      "今夜酒醒后会身在何处？大概是在杨柳岸边，面对晓风和残月。",
      "这一去经年累月，良辰美景也只能形同虚设。",
      "即使有千种风情，又能向谁诉说呢？"
    ],
    "source": "中华古诗词数据库（MIT）",
    "glossary": []
  },
  {
    "id": "jiang-cheng-zi-yimao",
    "order": 16,
    "title": "江城子·乙卯正月二十日夜记梦",
    "author": "苏轼",
    "dynasty": "宋",
    "genre": "词",
    "collections": [
      "宋词",
      "宋词三百首"
    ],
    "themes": [
      "悼亡",
      "爱情",
      "思念",
      "梦"
    ],
    "moods": [
      "哀婉",
      "缠绵"
    ],
    "intro": "十年生死相隔，梦中相逢却无言，只余泪千行。",
    "lines": [
      "十年生死两茫茫，不思量，自难忘。",
      "千里孤坟，无处话凄凉。",
      "纵使相逢应不识，尘满面，鬓如霜。",
      "夜来幽梦忽还乡，小轩窗，正梳妆。",
      "相顾无言，惟有泪千行。",
      "料得年年肠断处，明月夜，短松冈。"
    ],
    "translations": [
      "十年生死相隔，彼此茫茫无知，即使不去刻意思念，也自然难以忘怀。",
      "你的孤坟远在千里，我无处诉说心中的凄凉。",
      "即使相逢，你大概也认不出我了，我已是满面风尘、两鬓如霜。",
      "夜里忽然在幽梦中回到故乡，看见你在小窗前梳妆。",
      "我们互相看着，没有话说，只有泪水千行。",
      "想来今后年年令我伤心肠断的地方，就是明月之夜那座长着矮松的山冈。"
    ],
    "source": "中华古诗词数据库（MIT）",
    "glossary": []
  },
  {
    "id": "tian-jing-sha-qiu-si",
    "order": 19,
    "title": "天净沙·秋思",
    "author": "马致远",
    "dynasty": "元",
    "genre": "曲",
    "collections": [
      "元曲",
      "元曲三百首"
    ],
    "themes": [
      "思乡",
      "羁旅",
      "秋"
    ],
    "moods": [
      "苍凉",
      "哀婉"
    ],
    "intro": "几个景物名词并置，最后一句点出天涯游子的断肠。",
    "lines": [
      "枯藤老树昏鸦，",
      "小桥流水人家，",
      "古道西风瘦马。",
      "夕阳西下，",
      "断肠人在天涯。"
    ],
    "translations": [
      "枯藤缠绕着老树，树上停着黄昏归巢的乌鸦。",
      "小桥下流水潺潺，旁边有人家。",
      "古老的道路上，西风萧瑟，一匹瘦马缓缓前行。",
      "夕阳已经向西落下。",
      "极度伤心的游子还漂泊在天涯。"
    ],
    "source": "中华古诗词数据库（MIT）",
    "glossary": []
  },
  {
    "id": "man-jiang-hong",
    "order": 18,
    "title": "满江红·写怀",
    "author": "岳飞",
    "dynasty": "宋",
    "genre": "词",
    "collections": [
      "宋词",
      "宋词三百首"
    ],
    "themes": [
      "爱国",
      "壮志",
      "怀古",
      "战争"
    ],
    "moods": [
      "豪放",
      "壮烈",
      "悲愤"
    ],
    "intro": "怒发冲冠、仰天长啸，全词写尽收复山河的激烈壮志。",
    "lines": [
      "怒发冲冠，凭栏处、潇潇雨歇。",
      "抬望眼，仰天长啸，壮怀激烈。",
      "三十功名尘与土，八千里路云和月。",
      "莫等闲，白了少年头，空悲切！",
      "靖康耻，犹未雪。臣子恨，何时灭！",
      "驾长车，踏破贺兰山缺。",
      "壮志饥餐胡虏肉，笑谈渴饮匈奴血。",
      "待从头、收拾旧山河，朝天阙。"
    ],
    "translations": [
      "愤怒得头发直竖顶起帽子，独自凭栏，一阵急雨刚刚停歇。",
      "抬头远望，对着天空长啸，报国壮志激烈澎湃。",
      "三十年来建立的功名如尘土一般，八千里转战只有云和月相伴。",
      "不要虚度光阴，等到少年头发变白，再独自悲伤。",
      "靖康之变的耻辱，还没有洗雪；臣子的愤恨，什么时候才能消除！",
      "我要驾着战车，踏破贺兰山的山口。",
      "壮志同仇，饿了就吃敌人的肉，谈笑间渴了就喝敌人的血。",
      "等我重新收复旧日山河，再去朝拜天子。"
    ],
    "source": "中华古诗词数据库（MIT）",
    "glossary": []
  }

];

function splitCiClauses(work: Work): Work {
  if (work.genre !== '词') return work;
  const lines: string[] = [];
  const translations: string[] = [];
  work.lines.forEach((line) => {
    const parts = line.match(/[^，。！？；：]+[，。！？；：]?/g)?.map((part) => part.trim()).filter(Boolean) ?? [line];
    lines.push(...parts);
    if (work.translations.length) {
      const translation = work.translations[lines.length - parts.length] ?? '';
      parts.forEach(() => translations.push(translation));
    }
  });
  return { ...work, lines, translations };
}

const seenWorks = new Set<string>();
const arrowOnly = /^[<>]+$/;
const metadataOnly = /^(词牌介绍|词牌名|作者简介|题解|注释|译文|赏析|背景|序言)$/;
function sanitizeWork(work: Work): Work {
  if (!work.lines.some((line) => line.trim().startsWith('<') || line.trim().startsWith('>'))) return work;
  const keptIndices: number[] = [];
  const lines = work.lines.filter((line, index) => {
    const trimmed = line.trim();
    if (arrowOnly.test(trimmed) || metadataOnly.test(trimmed) || trimmed.startsWith('>>') || trimmed.startsWith('<<')) return false;
    keptIndices.push(index);
    return true;
  });
  return {
    ...work,
    lines,
    translations: work.translations.length ? keptIndices.map((index) => work.translations[index] ?? '') : [],
    glossary: work.glossary.filter((item) => keptIndices.includes(item.lineIndex)).map((item) => ({
      ...item,
      lineIndex: keptIndices.indexOf(item.lineIndex),
    })),
  };
}
export const WORKS: Work[] = [...CURATED_WORKS, ...MODERN_WORKS, ...CORPUS_WORKS, ...CORRECTED_WORKS]
  .map(correctKnownImportedWork)
  .map(sanitizeWork)
  .map(splitCiClauses)
  .map((work) => {
    if (work.genre === '词' && work.lines.length >= 8 && !work.sectionBreaks?.length) {
      return { ...work, sectionBreaks: [Math.ceil(work.lines.length / 2)] };
    }
    return work;
  })
  .filter((work) => {
    const key = `${work.title}|${work.author}|${work.lines[0] ?? ''}`;
    if (seenWorks.has(key)) return false;
    seenWorks.add(key);
    return true;
  });
