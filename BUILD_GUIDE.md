# 项目构建指南（必读）

> **目标**：避免新版本和老版本交叉污染，确保每次构建干净、可回退。

---

## 一、核心原则

### 1.1 源码与构建产物分离
- `src/` 目录是**唯一源码**
- `dist/` 是构建产物，**不提交到 git**
- `index.html` 和 `story.html` 在根目录作为**部署入口**，但必须是从 `dist/` 复制的最新构建产物

### 1.2 构建前必须检查
每次运行 `npm run build` 前，确认：
1. `index.html` 和 `story.html` 引用的是 `src/shared/*.js`（源码模式）
2. 如果引用的是 `./assets/*.js`，说明已被旧构建产物覆盖，必须恢复
3. 恢复命令：`git checkout 57642b3 -- index.html story.html`

### 1.3 构建后必须检查
1. `dist/index.html` 和 `dist/story.html` 只包含**一个** `modulepreload`（Vite 自动注入的）
2. 如果看到多个 `data:text/javascript;base64` 或重复文件名（如 `config-xxx-xxx-xxx.js`），说明 Vite 缓存污染了
3. 清理命令：`rm -rf node_modules/.vite` 然后重新构建

---

## 二、正确构建流程（手动）

```bash
# 1. 确认 HTML 是源码版本（引用 src/shared/）
grep 'src=' index.html story.html
# 正确输出：src="./src/shared/home.js"  src="./src/shared/story-loader.js"

# 2. 清理 Vite 缓存（重要！防止文件名重复）
rm -rf node_modules/.vite

# 3. 构建
npm run build

# 4. 检查构建产物是否干净
grep -o 'modulepreload' dist/story.html | wc -l
# 正确输出：1

# 5. 复制到根目录部署
cp -r dist/* .

# 6. 更新版本号
sed -i 's/v1\.0\.[0-9]\+/v1.0.X/g' index.html story.html

# 7. 提交并推送
git add -A
git commit -m "v1.0.X: 修改描述"
git push origin main
```

---

## 三、常见错误与修复

### 错误 1：构建后文件名重复（如 `config-BIbxg2R--DzfPGOwd-BhSlepLY...`）
**现象**：`assets/` 目录下出现超长重复文件名。
**原因**：Vite 的 `node_modules/.vite` 缓存了旧构建产物，导致新构建时 Rollup 反复读取旧文件。
**修复**：
```bash
rm -rf node_modules/.vite
git checkout 57642b3 -- index.html story.html
npm run build
```

### 错误 2：story.html 引用不存在的文件（404）
**现象**：页面空白，控制台显示 `404` 错误。
**原因**：`story.html` 被旧构建产物覆盖，引用了已被删除的旧 JS 文件。
**修复**：恢复源码 → 重新构建 → 复制到根目录。

### 错误 3：GitHub Pages 缓存未更新
**现象**：推送后页面没有变化。
**原因**：GitHub Pages CDN 缓存了旧文件。
**修复**：访问时加 `?r=随机数` 参数，如 `?r=123`。

### 错误 4：弹窗不显示
**现象**：自动播放失败，但弹窗不出现。
**原因**：`story.html` 源码中缺少 `bgmModal` 元素，或 `story-loader.js` 中没有 `showPlayModal` 函数。
**修复**：确保源码 `story.html` 包含弹窗 DOM 元素，确保 `story-loader.js` 在 `catch` 和 `error` 事件中调用 `showPlayModal()`。

---

## 四、版本回退的正确方法

### 方法 1：Git 回退（推荐）
```bash
# 查看历史版本
git log --oneline

# 回退到指定版本（替换 COMMIT_HASH）
git reset --hard COMMIT_HASH

# 强制推送（谨慎使用）
git push -f origin main
```

### 方法 2：GitHub 仓库直接回退
在 GitHub 网页上：
1. 进入仓库 → Code → 点击提交历史
2. 找到要回退的提交 → 点击右侧 `...` → `Revert`
3. 这会创建一个新的提交，撤销之前的修改，更安全

### 方法 3：从 Git 检出旧文件
```bash
# 只恢复某个文件到旧版本
git checkout COMMIT_HASH -- story.html
```

---

## 五、GitHub Actions 自动构建（推荐）

手动构建容易出错，建议配置 GitHub Actions：

1. 创建 `.github/workflows/deploy.yml`
2. 每次 push 到 main 时自动构建并部署
3. 不再需要手动复制 `dist/`

配置完成后，只需修改 `src/` 源码并 `git push`，构建和部署全自动。

---

## 六、重要文件清单

| 文件 | 类型 | 说明 |
|------|------|------|
| `src/shared/story-loader.js` | 源码 | 故事加载器，包含音频弹窗逻辑 |
| `src/shared/story-renderer.js` | 源码 | 故事渲染器 |
| `src/shared/vinyl-player.js` | 源码 | 唱片播放器控制 |
| `src/shared/vinyl-player.css` | 源码 | 唱片样式+脉冲动画 |
| `src/stories/config.json` | 配置 | 故事元数据（BGM、主题等） |
| `index.html` | 入口 | 书架首页（构建后引用 `./assets/`） |
| `story.html` | 入口 | 故事页（构建后引用 `./assets/`） |
| `vite.config.js` | 配置 | Vite 构建配置，`base: './'` |
| `.gitignore` | 配置 | 排除 `dist/` 和构建产物 |

---

## 七、版本号规则

- 格式：`v1.0.X`
- 每次修改后 `X + 1`
- 显示位置：页面底部 `.version-mark`
- 用途：确认云端是否更新，避免缓存困扰

---

## 八、历史踩坑记录

### 2026-06-30 v1.0.17 构建产物污染
- **问题**：v1.0.16 构建后 `story.html` 包含大量旧的 `modulepreload` 引用（如 `config-BIbxg2R--DzfPGOwd...-DBhTcck2-DBhTcck2.js`），导致新构建产物引用旧文件，形成恶性循环。
- **根因**：没有 `.gitignore`，构建产物被提交到 git；每次构建前没有恢复源码 HTML。
- **解决**：添加 `.gitignore` 排除 `dist/` 和 `assets/`；从最早版本 `57642b3` 恢复干净源码；重新构建。

### 2026-06-30 唱片脉冲光效丢失
- **问题**：v1.0.16 中自动播放失败时，左上角唱片没有脉冲提示。
- **根因**：`showPlayModal()` 函数中没有给 `vinylDisc` 添加 `hint-pulse` class。
- **解决**：在 `showPlayModal()` 中添加 `vinylDisc.classList.add('hint-pulse')`；在 `play` 事件中移除 `hint-pulse`。

### 2026-06-30 音频弹窗不稳定
- **问题**：弹窗时有时无，3秒后才显示。
- **根因**：没有超时机制，依赖 `canplay` 事件；没有 `error` 监听；没有 `bgm.load()` 主动加载。
- **解决**：添加 `setTimeout(() => showPlayModal(), 3000)` 兜底；添加 `error` 事件监听；添加 `bgm.load()`。

---

*文档最后更新：2026-06-30*
