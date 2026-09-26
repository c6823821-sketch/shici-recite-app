# 回滚说明

如果本次重构失败，用户只需在此 Agent 对话框输入“执行回滚”，你需立刻执行 `git checkout main` 或恢复到快照分支，并撤销所有未提交的更改。

## 快照

- 备份标签：`pre-ui-refactor-v2.9.3`
- 备份分支：`backup/pre-ui-refactor-v2.9.3`
- 重构分支：`feat/ui-refactor`
