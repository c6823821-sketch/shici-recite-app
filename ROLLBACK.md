# 回滚说明

如果本次重构失败，用户只需在此 Agent 对话框输入“执行回滚”，你需立刻执行 `git checkout main` 或恢复到快照分支，并撤销所有未提交的更改。

## 快照

- 备份标签：`pre-ui-refactor-v2.9.3`
- 备份分支：`backup/pre-ui-refactor-v2.9.3`
- 重构分支：`feat/ui-refactor`


## v3.0.1 微调回滚

回到 v3.0.0：

```powershell
git checkout main
git reset --hard v3.0.0
git clean -fd
git push origin main --force-with-lease
```


## v3.0.2 每日推荐修复回滚

回到 v3.0.1：

```powershell
git checkout main
git reset --hard v3.0.1
git clean -fd
git push origin main --force-with-lease
```


## v3.0.3 卡片边界修复回滚

回到 v3.0.2：

```powershell
git checkout main
git reset --hard v3.0.2
git clean -fd
git push origin main --force-with-lease
```


## v3.0.4 学习记录回滚

回到 v3.0.3：

```powershell
git checkout main
git reset --hard v3.0.3
git clean -fd
git push origin main --force-with-lease
```


## v3.0.5 每日推荐刷新回滚

回到 v3.0.4：

```powershell
git checkout main
git reset --hard v3.0.4
git clean -fd
git push origin main --force-with-lease
```


## v3.0.6 背诵 Tab 回滚

回到 v3.0.5：

```powershell
git checkout main
git reset --hard v3.0.5
git clean -fd
git push origin main --force-with-lease
```


## v3.0.7 应景卡片回滚

回到 v3.0.6：

```powershell
git checkout main
git reset --hard v3.0.6
git clean -fd
git push origin main --force-with-lease
```


## v3.0.8 应景分隔回滚

回到 v3.0.7：

```powershell
git checkout main
git reset --hard v3.0.7
git clean -fd
git push origin main --force-with-lease
```


## v3.0.9 应景分隔线回滚

回到 v3.0.8：

```powershell
git checkout main
git reset --hard v3.0.8
git clean -fd
git push origin main --force-with-lease
```


## v3.0.10 应景与全文入口回滚

回到 v3.0.9：

```powershell
git checkout main
git reset --hard v3.0.9
git clean -fd
git push origin main --force-with-lease
```


## v3.0.11 全文与主页排版回滚

回到 v3.0.10：

```powershell
git checkout main
git reset --hard v3.0.10
git clean -fd
git push origin main --force-with-lease
```


## v3.0.12 蝶恋花与搜索去重回滚

回到 v3.0.11：

```powershell
git checkout main
git reset --hard v3.0.11
git clean -fd
git push origin main --force-with-lease
```


## v3.0.13 校对入口与合并回滚

回到 v3.0.12：

```powershell
git checkout main
git reset --hard v3.0.12
git clean -fd
git push origin main --force-with-lease
```


## v3.0.14 上下阕补全回滚

回到 v3.0.13：

```powershell
git checkout main
git reset --hard v3.0.13
git clean -fd
git push origin main --force-with-lease
```


## v3.0.15 长文补全回滚

回到 v3.0.14：

```powershell
git checkout main
git reset --hard v3.0.14
git clean -fd
git push origin main --force-with-lease
```


## v3.0.16 师说与背景主题回滚

回到 v3.0.15：

```powershell
git checkout main
git reset --hard v3.0.15
git clean -fd
git push origin main --force-with-lease
```


## v3.0.17 视觉与主题回滚

回到 v3.0.16：

```powershell
git checkout main
git reset --hard v3.0.16
git clean -fd
git push origin main --force-with-lease
```


## v3.0.18 阅读穿模与主题回滚

回到 v3.0.17：

```powershell
git checkout main
git reset --hard v3.0.17
git clean -fd
git push origin main --force-with-lease
```


## v3.0.19 完整句与暖米色回滚

回到 v3.0.18：

```powershell
git checkout main
git reset --hard v3.0.18
git clean -fd
git push origin main --force-with-lease
```


## v3.0.20 更新与排版回滚

回到 v3.0.19：

```powershell
git checkout main
git reset --hard v3.0.19
git clean -fd
git push origin main --force-with-lease
```


## v3.0.21 手机端推荐卡回滚

回到 v3.0.20：

```powershell
git checkout main
git reset --hard v3.0.20
git clean -fd
git push origin main --force-with-lease
```


## v3.0.22 调参结果固化回滚

回到 v3.0.21：

```powershell
git checkout main
git reset --hard v3.0.21
git clean -fd
git push origin main --force-with-lease
```

## v3.0.23 真机按钮与换一换修复回滚

回到 v3.0.22：

```powershell
git checkout main
git reset --hard v3.0.22
git clean -fd
git push origin main --force-with-lease
```

## v3.0.24 卡片裁切与应景间距回滚

回到 v3.0.23：

```powershell
git checkout main
git reset --hard v3.0.23
git clean -fd
```

## v3.0.25 推荐区去卡片与搜索框回滚

回到 v3.0.24：

```powershell
git checkout main
git reset --hard v3.0.24
git clean -fd
```

## v3.0.26 Android 按钮与搜索框回滚

回到 v3.0.25：

```powershell
git checkout main
git reset --hard v3.0.25
git clean -fd
```

## v3.0.27 按钮居中与应景卡片边框回滚

回到 v3.0.26：

```powershell
git checkout main
git reset --hard v3.0.26
git clean -fd
```

## v3.0.28 按钮文字居中方案回滚

回到 v3.0.27：

```powershell
git checkout main
git reset --hard v3.0.27
git clean -fd
```

## v3.0.29 搜索同行与应景卡片外层回滚

回到 v3.0.28：

```powershell
git checkout main
git reset --hard v3.0.28
git clean -fd
```

## v3.0.30 全局长文分节回滚

回到 v3.0.29：

```powershell
git checkout main
git reset --hard v3.0.29
git clean -fd
```

## v3.0.31 作者、搜索、长文与收藏回滚

回到 v3.0.30：

```powershell
git checkout main
git reset --hard v3.0.30
git clean -fd
```

## v3.0.32 背诵按钮与长文单元回滚

回到 v3.0.31：

```powershell
git checkout main
git reset --hard v3.0.31
git clean -fd
```

## v3.0.33 古籍双版本与长文切分回滚

回到 v3.0.32：

```powershell
git checkout main
git reset --hard v3.0.32
git clean -fd
```

## v3.0.34 古籍搜索双入口回滚

回到 v3.0.33：

```powershell
git checkout main
git reset --hard v3.0.33
git clean -fd
```

## v3.0.35 校对逻辑回滚

回到 v3.0.34：

```powershell
git checkout main
git reset --hard v3.0.34
git clean -fd
```

## v3.0.36 全库题名与正文显示修复回滚

回到 v3.0.35：

```powershell
git checkout main
git reset --hard v3.0.35
git clean -fd
```

## v3.0.37 上下阕、别名搜索与校对补强回滚

回到 v3.0.36：

```powershell
git checkout main
git reset --hard v3.0.36
git clean -fd
```

## v3.0.38 通行本回传与本地逐句比对回滚

回到 v3.0.37：

```powershell
git checkout main
git reset --hard v3.0.37
git clean -fd
```
