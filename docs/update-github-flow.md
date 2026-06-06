# 网站调整后更新到 GitHub 流程

这份记录用于日常修改本网站后，把本地改动更新到 GitHub，并等待 GitHub Pages 自动刷新线上页面。

## 适用前提

- 本地项目路径：`/Users/kityhello/Documents/codex_total/pages_shouji`
- 当前仓库已连接 GitHub：`https://github.com/yxqhuqin222-star/pages_shouji.git`
- 默认更新分支：`main`
- 网站是纯静态页面，主要文件是 `index.html`、`styles.css`、`app.js`

## 日常更新步骤

### 1. 修改前确认状态

在项目目录中查看当前是否有未保存到 Git 的改动：

```bash
git status
```

确认点：

- 如果显示 `nothing to commit, working tree clean`，说明当前很干净，可以开始修改。
- 如果已经有改动，先确认这些改动是不是你这次要一起发布的内容。

### 2. 本地检查页面

如果只是简单改文案或样式，可以直接用浏览器打开 `index.html` 查看。

如果想用本地地址预览，启动静态服务：

```bash
python3 -m http.server 4173
```

然后访问：

```text
http://localhost:4173
```

确认点：

- 页面能正常打开。
- 新改动已经出现。
- 手机尺寸和桌面尺寸下没有明显错位。
- 浏览器控制台没有新的报错。

### 3. 查看本次改了哪些文件

```bash
git status
```

如需查看具体差异：

```bash
git diff
```

确认点：

- 只包含本次想发布的改动。
- 没有误改无关文件。
- 没有把临时文件、个人文件提交进去。

### 4. 添加要提交的文件

添加全部本次改动：

```bash
git add .
```

如果只想添加某几个文件，也可以指定文件名：

```bash
git add index.html styles.css app.js
```

添加后再次确认：

```bash
git status
```

确认点：

- 要发布的文件显示在 `Changes to be committed` 下。

### 5. 提交改动

```bash
git commit -m "更新页面内容"
```

提交信息建议写清楚这次做了什么，例如：

```bash
git commit -m "调整手机端布局"
git commit -m "更新碎片管理交互"
git commit -m "修复搜索结果展示"
```

确认点：

- 命令执行成功。
- 没有提示还有必须处理的冲突或错误。

### 6. 推送到 GitHub

```bash
git push origin main
```

确认点：

- 推送成功后，GitHub 仓库会出现新的提交。
- 如果仓库启用了 GitHub Pages，线上页面会自动重新部署。

### 7. 确认线上更新

打开 GitHub 仓库页面，确认最新提交已经出现。

如果使用 GitHub Pages，进入仓库：

```text
Settings -> Pages
```

确认点：

- 页面显示部署成功。
- 打开线上地址后能看到最新版本。
- 如果线上页面还是旧的，先强制刷新浏览器，或等待 1 到 3 分钟再看。

## 如果 GitHub 上已经有新内容

推送时如果提示远端有新提交，先拉取远端更新：

```bash
git pull origin main
```

如果没有冲突，再推送：

```bash
git push origin main
```

如果出现冲突，先不要继续提交或强行推送。打开冲突文件，确认保留哪些内容，修好后再执行：

```bash
git add .
git commit -m "合并远端更新"
git push origin main
```

## 推荐的完整命令顺序

```bash
cd /Users/kityhello/Documents/codex_total/pages_shouji
git status
python3 -m http.server 4173
git diff
git add .
git commit -m "更新页面内容"
git push origin main
```

其中本地服务启动后会占用当前窗口。检查完页面后，可以按 `Control + C` 停止服务，再继续执行后面的 Git 操作。

## 每次发布前的简短检查清单

- 页面本地看过，没有明显问题。
- `git diff` 看过，改动范围符合预期。
- 提交信息能说明本次修改内容。
- `git push origin main` 已成功。
- GitHub Pages 线上页面已刷新。
