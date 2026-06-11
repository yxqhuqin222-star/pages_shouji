# CLAUDE.md

本文件记录可复用的人机协作规则。放到任意项目根目录后，请优先遵守这里的流程。

## 工作区确认

开始修改前，先确认当前工作目录是用户指定的项目目录。

```bash
pwd
git status --short
```

如果发现路径与用户描述不一致，先提醒用户确认，不要继续改错项目。

## 每版修改后的 checkpoint 机制

每完成一个相对独立的功能或界面版本后，先停下来提醒用户确认是否满意。

如果用户确认满意，执行本地 checkpoint：

```bash
git add .
git commit -m "checkpoint: 本次修改说明"
```

注意：

- checkpoint commit 只记录在本地 Git，不会自动推送到 GitHub。
- 只有用户明确要求发布或推送时，才执行 `git push`。
- 不要把多个已完成版本积攒到最后一次性提交，除非用户明确说要合并成一个 checkpoint。
- 如果用户不想提交，也可以先保存 patch 作为临时回滚点：

```bash
mkdir -p rollback-backups
git diff > rollback-backups/worktree-$(date +%Y%m%d-%H%M%S).patch
```

## 变更记录同步

每次成功创建 checkpoint 后，都要把 commit id 写入：

```text
docs/change-log.md
```

如果项目还没有该文件，先创建它。

记录格式建议：

```md
### HH:mm

#### checkpoint: 本次修改说明

- commit: `abcdef1`
- 本次改动：
  - ...
- 回滚方式：如未推送 GitHub，可用本地 Git 回到该 commit；如已推送，优先用 `git revert`。
```

## 回滚说明

如果项目已有回滚文档，优先参考：

```text
docs/rollback-guide.md
```

如果没有该文件，可新增一个简短版本，至少说明三种情况：

- 未提交改动：先备份 diff，再用 `git restore` 或删除新增文件回到最近提交。
- 已提交未推送：可用 `git reset --soft HEAD~1` 或回到指定 commit。
- 已推送：不要改公开历史，优先用 `git revert <commit>`。

执行任何回滚前，先说明会影响哪些文件，并建议用户备份当前 diff。

## 文档与代码一致

当功能、界面、目录结构、运行方式发生变化时，同步检查并更新：

- `README.md`
- `docs/change-log.md`
- 与部署、发布、回滚相关的文档

不要只改代码而留下过期说明。
