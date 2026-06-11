# 回滚指南

用于在对当前版本不满意时，安全回到上一版。

## 当前这版还没有提交时

如果 `git status --short` 看到的是 `M` 或 `??`，说明改动还在工作区，尚未提交。

先备份当前改动：

```bash
mkdir -p rollback-backups
git diff > rollback-backups/worktree-$(date +%Y%m%d-%H%M%S).patch
git diff -- README.md app.js docs index.html styles.css > rollback-backups/pages-shouji-$(date +%Y%m%d-%H%M%S).patch
```

确认备份文件存在后，再丢弃未提交改动：

```bash
git restore README.md app.js docs/update-github-flow.md index.html styles.css
rm -f docs/change-log.md docs/rollback-guide.md
```

这会回到最近一次提交的版本。

## 当前这版已经提交但还没推送时

查看最近提交：

```bash
git log --oneline -5
```

回到上一个提交，并把被回滚的改动保留在工作区：

```bash
git reset --soft HEAD~1
```

如果确认完全不要这次提交里的改动，再执行：

```bash
git restore .
```

## 当前这版已经推送到 GitHub 时

不要用 `git reset --hard` 改公开历史。用 `git revert` 生成一个新的回滚提交：

```bash
git log --oneline -5
git revert <要回滚的提交ID>
git push origin main
```

这样 GitHub Pages 会重新部署到回滚后的版本。

## 之后每次改动的回滚机制

每次开始较大改动前，记录当前回滚点：

```bash
git rev-parse --short HEAD
```

每次完成改动后，在 `docs/change-log.md` 记录：

- 本次改了什么。
- 修改前的回滚点 commit。
- 当前是否已经提交。
- 如果要回滚，应该用工作区回滚、提交回滚，还是 GitHub revert。

如果改动较大，优先开新分支：

```bash
git switch -c codex/本次改动名称
```

确认满意后再合并或推送。
