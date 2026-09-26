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
