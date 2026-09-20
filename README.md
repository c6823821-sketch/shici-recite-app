# 诗词背诵 App

一个面向手机端的古诗词阅读、注释查询与 FSRS 背诵应用。项目使用 React Native + Expo + TypeScript，优先支持离线使用；也可以由用户自己配置 API，在手机端直接请求上下文释义和“今日荐诗”。

## 当前基础版

- 多维分类：朝代、体裁、合集、主题、情绪可以任意组合。
- 离线内容库当前约 21,700 篇：诗经、唐诗三百首、宋词三百首、全宋词等。
- 《离骚》全文，不使用节选代替。
- 原文、提示、默背三种练习模式。
- 点击正文中的字、调整选择范围，再点击“释”查询。
- 查询时会自动携带篇名、作者、朝代、上一句、当前句、下一句，不需要手动重复输入上下文。
- 内置核心篇目的基础注释，优先本地查询。
- 手机端 API 直连，支持 OpenAI-compatible Chat Completions 接口。
- FSRS v6 四档排期：忘了、很难、记得、太熟。
- 今日荐诗：随机抽取；或者输入今天的心情和事情，App 先在本地筛选候选篇目，再由 API 从候选篇目中选择诗句。
- API 推荐的篇目和句子会在本地再次校验，不存在的篇目或原句会被拒绝。
- 填诗、填词、填曲编辑器：支持诗体、15 个常用词牌和常见曲牌。
- 严格评分：本地先检查字数、句数、押韵和平仄，再由 API 按格律、押韵、平仄、句式、语言、意象、章法和创造性逐项扣分。
- API Key 保存在手机安全存储中，不写入源码和 Git。

## 开发环境

需要 Node.js 20 以上、npm，以及 Expo Go 或 Android/iOS 开发环境。

```bash
npm install
npm start
```

手机安装 Expo Go 后扫描终端二维码即可运行。也可以运行：

```bash
npm run android
npm run web
npm run typecheck
npm run test:core
npx expo-doctor
```

如果要生成 Android 安装包，推荐登录 Expo/EAS 后运行：

```bash
npx eas build -p android --profile preview
```

本机当前没有完整的 Android Build Tools，因此项目源码和 Web 构建已经验证，APK 需要用 EAS 或本机 Android Studio 补全 SDK 后构建。

## API 设置

进入 App 的“设置”，填写：

- Chat Completions 完整地址，例如 `https://api.deepseek.com/chat/completions`
- API Key
- 模型名称，例如 `deepseek-chat`

对于个人使用，Key 直接保存在手机安全存储中。这个版本没有自建服务器，因此 App 会直接从当前设备请求 API。以后要公开分发时，再把 API 调用迁移到自己的中转服务。

## 严格评分

评分入口不是普通的 AI 聊天，而是固定规则的评分卡：

- 诗：句数、字数、平仄、押韵、粘对、孤平、三平尾、对仗和重字。
- 词：词牌、字数、句读、平仄、韵位、换韵、叶韵、对仗和领字。
- 曲：曲牌、宫调、字数、句读、衬字、韵脚、平仄和曲谱版本。
- 语言、意象、章法和创造性只作为第二层评价，不能拿来掩盖硬性格律错误。
- 系统明确要求模型不得恭维用户，不得画大饼，不得为了情绪提高分数。
- 本地已经发现硬性错误时，API 总分不能超过 79。

词谱和韵书数据当前接入：

- [hulbji/couyun](https://github.com/hulbji/couyun)（MIT）：词谱和格律校验思路。
- [charlesix59/chinese_word_rhyme](https://github.com/charlesix59/chinese_word_rhyme)（MIT）：平水韵、词林正韵、中华新韵和汉字平仄数据。

## 防止 AI 乱编

这个项目不把 AI 当作没有边界的知识源，采用以下策略：

1. 本地注释优先。已经校订的字词不会请求 API。
2. 释义必须结合当前句返回，程序固定要求模型区分“此处意思”“整句翻译”“语法”。
3. API 必须返回结构化 JSON，包含把握程度、争议和上下文依据。
4. 对重点篇目保留本地注释，后续可以继续人工复核。
5. 今日荐诗只能从本地篇目目录中选择。
6. 推荐结果返回后，App 会再次验证篇目 ID、句子是否真的存在于本地原文；不通过就拒绝显示。
7. 后续可以接入开放词典、古籍注疏和向量检索，把校验升级为检索增强生成（RAG）。

## 内容规模

- 《诗经》：305 篇。
- 《唐诗三百首》：366 篇。
- 《宋词三百首》：280 篇。
- 《全宋词》：21,050 篇原始条目，去重后仍然超过两万篇。
- 另有楚辞全文、精选注释篇目和专题篇目。

这不是“样例数据”。正文来自开源数据库，注释、翻译和释义由本地校订 + API 按需生成。因为《全宋词》规模大，App 会把正文作为离线内容包，搜索和推荐先在本地筛选候选，再让 API 只处理候选篇目，避免把两万首全部塞给模型。

## 内容来源

- [chinese-poetry/chinese-poetry](https://github.com/chinese-poetry/chinese-poetry)（MIT）：诗经、全唐诗、宋词、全宋词、楚辞等数据。
- [open-spaced-repetition/ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs)（MIT）：FSRS v6 排期库。
- [hulbji/couyun](https://github.com/hulbji/couyun)（MIT）：词谱数据。
- [charlesix59/chinese_word_rhyme](https://github.com/charlesix59/chinese_word_rhyme)（MIT）：平水韵、词林正韵、中华新韵和汉字平仄数据。

详细来源和许可说明见 `ATTRIBUTION.md`。

## 项目结构

```text
src/
  components/   页面组件
  data/         篇目、分类和楚辞全文
  screens/      首页、阅读页、设置页
  services/     API、FSRS、本地存储和荐诗服务
  theme.ts      色彩与字体
```

## Git 与后续更新

第一次把项目上传到 GitHub：

```bash
git init
git add .
git commit -m "feat: initial poetry recitation app"
git branch -M main
git remote add origin https://github.com/你的用户名/仓库名.git
git push -u origin main
```

以后更新：

```bash
git status
git add .
git commit -m "feat: 描述本次改动"
git push
```

如果希望 Codex 以后继续维护，优先在 GitHub 保留版本标签和清晰的提交信息，例如：

```bash
git tag v0.1.0
git push origin v0.1.0
```

## 后续方向

- 扩充诗经、楚辞、乐府、唐诗、宋词、元曲和教材必背篇目。
- 自动分句、分段和生成多种遮字练习。
- 扩充更多词牌、曲牌和权威曲谱版本。
- 本地完整平仄、对仗和句中拗救检查。
- 保留每次复习日志，训练个人 FSRS 参数。
- 语音朗读、跟读和默写。
- 云同步。
- 更完整的注释校订、开放词典和古文注疏检索。
