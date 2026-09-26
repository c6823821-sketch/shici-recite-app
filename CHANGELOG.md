# v3.0.4 学习记录与卡片边界修复

发布时间：2026-09-26

## 心情搜索框

- 心情入口改成明显的搜索框结构。
- 增加左侧搜索图标、弱化提示文字和右侧“推荐”按钮。
- 提示文字：
  “输入想法或心情，推荐一首诗词”
- 点击搜索框或“推荐”按钮后打开心情荐诗面板。

## 应景推荐独立卡片

- 每条秋日应景句增加“应景句 1 / 2 / 3”标签。
- 增加独立分隔线、左侧朱砂强调线和更明显的卡片边框。
- 卡片之间固定 16px 间距，避免三句黏在一起。
- 每条卡片底部保留“查看原诗”。

## 我的背诵记录

- “我的”页新增“背诵记录”入口。
- 背诵记录分为：
  - 已背诗词
  - 后续复习
- 每条记录显示：
  - 诗词名称
  - 作者与朝代
  - 已背 / 待复习 / 已安排状态
  - 下次复习日期
- 点击记录可直接进入对应诗词。
- 数据完全保存在本机，不影响 API 设置和收藏。

## Git 凭证弹窗

- 此前弹窗来自 Git 对 gh-proxy 代理地址的凭证识别，不是 App 登录。
- 已移除 ghproxy.net 和 gh-proxy.com 的 credential provider 配置。

## 修改文件

- `src/screens/TodayScreen.tsx`
- `src/screens/ProfileScreen.tsx`
- `App.tsx`
- `src/services/dailyDiscovery.ts`
- `CHANGELOG.md`
- `ROLLBACK.md`
- `package.json`
- `package-lock.json`
- `app.json`
- `version.json`
- `.github/workflows/android-build.yml`

## 验证

- TypeScript 检查通过。
- 核心与 API 自测通过。
- Expo Web 导出通过。

## 回滚本次修改

回到 v3.0.3：

```powershell
git checkout main
git reset --hard v3.0.3
git clean -fd
git push origin main --force-with-lease
```

---

# v3.0.3 卡片边界与每日推荐缓存修复

发布时间：2026-09-26

## 应景推荐

- 每日发现缓存升级到 v3，旧版已经缓存的同一天推荐会被忽略并重新生成。
- 继续保留最近 30 天推荐历史排除机制。
- 首页“换一组”会立刻排除当天已出现的篇目。
- 秋日应景卡片边框加深，卡片间距增加到 16px。
- 卡片底部保留“查看原诗”，整张卡片仍是可点击区域。

## 心情入口

- 原来像普通文字的按钮改为搜索框样式。
- 高度 46px，圆角 pill，浅灰纸张背景。
- 增加搜索图标和弱化提示文字：
  “输入想法或心情，推荐一首诗词”
- 点击后仍然打开原有心情推荐面板。

## 诗库卡片

- 作品卡片增加明确边框。
- 卡片背景保持纯白，圆角和 12px 间距保持不变。
- 标签药丸增加浅边框，避免和正文糊在一起。
- 上一版已经移除难看的 `>` 箭头。

## Git Credential Manager 弹窗

- 弹窗与 App、诗词账号、API 无关。
- 原因是本机 Git 全局配置把 `ghproxy.net` / `gh-proxy.com` 识别为需要凭证的 Git 服务。
- 已移除这两个代理的凭证 provider 配置，避免继续弹出账号密码框。
- GitHub 主仓库仍使用原来的 HTTPS remote，不影响后续更新。

## 修改文件

- `src/services/dailyDiscovery.ts`
- `src/screens/TodayScreen.tsx`
- `src/screens/LibraryScreen.tsx`
- `CHANGELOG.md`
- `ROLLBACK.md`
- `package.json`
- `package-lock.json`
- `app.json`
- `version.json`
- `.github/workflows/android-build.yml`

## 验证

- TypeScript 检查通过。
- 核心与 API 自测通过。
- Expo Web 导出通过。

## 回滚本次修改

回到 v3.0.2：

```powershell
git checkout main
git reset --hard v3.0.2
git clean -fd
git push origin main --force-with-lease
```

---

# v3.0.2 每日推荐与卡片交互修复

发布时间：2026-09-26

## 修复每日应景推荐重复

- 新增最近 30 天的推荐历史记录。
- 每天生成推荐时排除最近出现过的作品。
- 秋日应景增加“换一组”按钮，可当天立即切换。
- 手动换一组时，同时排除当天已经出现过的篇目，避免刚换一组又出现旧句。
- 推荐池从原来的前 60 首扩展为前 480 首，降低连续数日推荐同一批作品的概率。

修改文件：

- `src/services/dailyDiscovery.ts`

## 应景卡片与心情入口

- 秋日应景的每一条推荐改为完整方框卡片。
- 诗句完整展示，不再像普通文本一样缺少点击感。
- 卡片底部显示出处和“查看原诗”。
- 首页“心情”由模糊小按钮改为明确按钮：
  - 文案：输入想法或心情，推荐一首诗词
  - 高度：44px
  - 带边框和浅色背景
  - 点击后打开原有心情推荐面板

修改文件：

- `src/screens/TodayScreen.tsx`

## 诗库箭头移除

- 移除作品卡片右侧的 `>` 箭头。
- 卡片仍然整体可点击，不再显示难看的箭头符号。

修改文件：

- `src/screens/LibraryScreen.tsx`

## 验证

- TypeScript 检查通过。
- 核心与 API 自测通过。
- Expo Web 导出通过。

## 回滚本次修改

回到 v3.0.1：

```powershell
git checkout main
git reset --hard v3.0.1
git clean -fd
git push origin main --force-with-lease
```

---

# v3.0.1 像素级排版修复

发布时间：2026-09-26

## 首页重排

- 首屏顺序严格调整为：问候语 → 今日荐诗 → 背诵任务卡 → 今日复习 → 秋日应景。
- 今日荐诗重新成为首屏视觉重心，诗句字号保持 26px。
- 作者与朝代降为 12px 浅灰色。
- 荐诗标题右侧增加“换一换”随机推荐按钮，并保留“心情”入口。
- 移除底部的重复“随机换一首”按钮，进入阅读按钮独占底部行动区。
- 背诵卡从半屏巨无霸改为紧凑任务卡：
  - 顶部显示“今日背诵进度 N/目标”。
  - 直接列出具体篇目名称，例如“1. 琴歌（待背）”。
  - 每首作品显示“待背 / 已背”状态。
  - 保留 1、2、3、5 首目标切换。
  - 底部提供明确的“开始背诵”按钮，继续进入原有 FOCUS_MODE。

## 诗库排版抢救

- 整个 FlatList 内容统一增加左右 20px 页面边距。
- 搜索框独立成行，高度 44px，完全圆角，背景使用极浅纸张灰。
- 朝代胶囊 Tabs 独占下一行，横向滚动，标签间距 8px。
- 分类浏览、飞花令保留为独立入口。
- 多维筛选按钮移动到结果标题右侧，不再和搜索框挤在同一行。
- 作品列表改成真正的白色卡片：
  - 卡片内边距 16px。
  - 卡片间距 12px。
  - 圆角 16px。
  - 使用极浅阴影替代明显边框。
- 作品标题改为 18px 加粗。
- 作者改为 12px 浅灰色。
- 主题、情绪、体裁改为独立药丸标签：
  - 字号 11px。
  - 内边距 4px 8px。
  - flex-wrap 换行。
  - 标签间距 8px。
- 卡片右侧改为浅灰色 `>` 箭头。
- 朝代标题上方留白 24px，下方留白 12px。

## 修改文件

- `src/screens/TodayScreen.tsx`
- `src/screens/LibraryScreen.tsx`
- `CHANGELOG.md`
- `package.json`
- `package-lock.json`
- `app.json`
- `version.json`
- `.github/workflows/android-build.yml`

## 验证

- `npm run typecheck`
- `npm run test:core`
- `npx expo-doctor`
- `npx expo export --platform web`

Expo Doctor 结果：21/21 checks passed。

## 回滚本次微调

回到 v3.0.0：

```powershell
git checkout main
git reset --hard v3.0.0
git clean -fd
git push origin main --force-with-lease
```

如果需要回到本次修复分支：

```powershell
git checkout main
git reset --hard v3.0.1
```

---

# v3.0.0 重构日志

## 本次改动

### 全局视觉系统

- 锁定纸张色 `#F9F7F2`、卡片白 `#FFFFFF`、墨色 `#333333`、次要灰 `#666666`、朱砂红 `#C62828`。
- 朱砂红只用于关键行动按钮、进度和重点提示，避免大面积红色。
- 统一 8px 网格、20px 页边距、16px 卡片圆角、极弱阴影和药丸标签。
- 引入 NativeWind、Tailwind CSS、Reanimated 和 Worklets 作为新页面基础。
- 新增通用编辑式组件：`PaperCard`、`SectionHeading`、`Pill`、`PrimaryButton`、`SoftButton`、`CoverBanner`。

### 沉浸式背诵闭环

- 首页不再展示“待背清单”，改为半屏“今日背诵 0/目标”核心行动卡。
- 点击“立即开始”进入独立全屏 Focus 页面，底部主导航隐藏。
- 原文默认隐藏，只显示首字和记忆占位；点击屏幕后以 400ms 动画浮现。
- 支持轻触显示/隐藏、左右滑动切句和切篇。
- 底部悬浮操作区提供“没背出、释义、背对了”。
- 背对/没背出使用 FSRS 更新记忆状态并写入复习队列。
- 释义从底部抽屉滑出，包含本句译文、写作背景、表面意思、深层含义和主题。
- 返回首页后自动刷新今日完成数、到期复习和下一次复习安排。

### 今日页与诗库

- 今日页改为“目标行动区 → 今日荐诗 → 今日复习 → 时节/兴趣推荐”的独立层级。
- 今日目标支持 1、2、3、5 首切换。
- 诗库增加横向朝代胶囊 Tabs，可直接筛选先秦至近现代。
- 保留全局搜索、句子/篇目/作者三类结果、分类浏览、飞花令和联网补录。
- 列表项卡片化，标题、作者、体裁、标签分层层级展示。

### 创作严格评分

- 评分结果增加总分环、总体进度条和九项分项进度条。
- 问题清单改为手风琴，每次只展开一项，避免长页面拥挤。
- 原文使用红色删除线，修改建议使用绿色高亮，形成明确对比。
- 保留严格 API 提示词：禁止恭维、先判硬性格律、不确定必须标注。
- 支持保存、载入、删除本地作品，词牌缺失时可通过 API 检索补录。

### 稳定性与发布

- 修正 Expo 57 配置 schema：移除无效的顶层 `splash` 和 `androidNavigationBar` 字段。
- Expo 依赖升级到 `~57.0.25`，`expo-doctor` 21/21 通过。
- GitHub Actions 发布版本更新为 `v3.0.0`，Android `versionCode` 更新为 `44`。
- 更新 `version.json` 静态更新清单，继续支持应用内检查更新和代理下载。

## 改动的关键文件

- `App.tsx`：新增 Focus 全屏状态与入口，隐藏专注模式底部导航。
- `src/screens/FocusReciteScreen.tsx`：新增沉浸式背诵状态机、动画、释义抽屉和 FSRS 反馈。
- `src/screens/TodayScreen.tsx`：重做首页结构，加入半屏今日目标和刷新机制。
- `src/screens/LibraryScreen.tsx`：增加朝代胶囊 Tabs 和编辑式列表。
- `src/screens/CompositionScreen.tsx`：加入评分环、分项进度和折叠问题对比。
- `src/components/MainTabBar.tsx`：底部导航去掉大块红色选中背景。
- `src/components/CategoryBrowser.tsx`：分类浏览与飞花令入口优化。
- `src/theme.ts`：全局色彩、字体、间距、圆角和阴影约束。
- `tailwind.config.js`、`babel.config.js`、`metro.config.js`、`global.css`：NativeWind 配置。
- `src/components/ui/Editorial.tsx`：公共编辑式组件。
- `RESEARCH.md`：跨界 UI/UX 调研结论。
- `ROLLBACK.md`：重构回滚说明。
- `CHANGELOG.md`：本文件。

## 新增依赖

- `nativewind@4.2.6`
- `tailwindcss@3.4.17`
- `react-native-reanimated@4.5.1`
- `react-native-worklets@0.10.1`

## 启动方式

```powershell
cd E:\Codex\outputs\shici-recite-app
npm ci
npm run android
```

Web 预览：

```powershell
npm run export:web
```

## 测试命令

```powershell
npm run typecheck
npm run test:core
npx expo-doctor
npm run export:web
```

## 回滚步骤

```powershell
git checkout main
git reset --hard pre-ui-refactor-v2.9.3
git clean -fd
```

如果需要回到重构分支：

```powershell
git checkout feat/ui-refactor
```

## 遗留待办

- 旧页面仍有部分 `StyleSheet`，后续可逐步迁移到公共 Editorial 组件，避免一次性大改造成回归。
- 真实 DeepSeek API 的评分质量仍取决于所选模型和长输出能力；本地预检只负责硬性结构提示。
- 移动端安装包必须通过 GitHub Actions 的 release 构建产物验证，Web 预览不能替代 Android 真机安装测试。
- 当前更新清单为 GitHub raw + 代理静态文件；如果代理被限流，可继续增加稳定的镜像地址。
