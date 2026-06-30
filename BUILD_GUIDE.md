# 项目构建指南（必读）

> **目标**：避免新版本和老版本交叉污染，确保每次构建干净、可回退。

---

## 一、推荐方式：GitHub Actions 自动构建（已配置）

**当前状态**：GitHub Actions 已配置，每次 `git push` 自动构建部署。

### 工作流程

```bash
# 1. 修改 src/ 源码（如 story-loader.js、CSS 等）

# 2. 直接提交推送
git add -A
git commit -m "v1.0.X: 修改描述"
git push origin main

# 3. GitHub Actions 自动运行：
#    - 安装依赖
#    - npm run build
#    - 部署 dist/ 到 GitHub Pages

# 4. 等待 1-2 分钟后访问
#    https://ctrl66666.github.io/NARRATIVE/
```

### 查看构建状态
- GitHub 仓库 → Actions 标签页 → 查看最新运行状态
- 绿色 ✅ 表示构建成功
- 红色 ❌ 表示构建失败，点击查看日志

---

## 二、核心原则

### 2.1 源码与构建产物分离
- `src/` 目录是**唯一源码**
- `dist/` 是构建产物，**不提交到 git**（已由 `.gitignore` 排除）
- `index.html` 和 `story.html` 在根目录是**源码入口**（引用 `src/shared/`）
- **不要**手动运行 `npm run build` 后把 `dist/` 复制到根目录提交（这是旧方式，会污染源码）

### 2.2 为什么不要手动复制 dist/
之前多次出问题的原因是：
1. `npm run build` 生成 `dist/`，其中 `dist/story.html` 引用 `./assets/story-xxx.js`
2. 手动 `cp -r dist/* .` 覆盖根目录的 `story.html`
3. 下次 `npm run build` 时，Vite 读取被覆盖的 `story.html`（引用旧 assets），导致新构建产物包含旧引用
4. 循环污染，产生 `config-xxx-xxx-xxx.js` 这样的重复文件名

**GitHub Actions 在云端独立构建，不会污染本地源码。**

---

## 三、手动构建（仅用于本地测试，不提交）

```bash
# 1. 确认 HTML 是源码版本（引用 src/shared/）
grep 'src=' index.html story.html
# 正确输出：src="./src/shared/home.js"  src="./src/shared/story-loader.js"

# 2. 如果需要本地预览，构建到 dist/（不提交）
npm run build

# 3. 本地预览（不复制到根目录）
# 方法 A：Vite 预览服务器
npm run preview

# 方法 B：Python 本地服务器
python -m http.server 8080
# 然后访问 http://localhost:8080/dist/

# 4. 测试完成后，dist/ 不需要提交（已被 .gitignore 排除）
```

---

## 四、常见错误与修复

### 错误 1：构建后文件名重复（如 `config-BIbxg2R--DzfPGOwd-BhSlepLY...`）
**现象**：`assets/` 目录下出现超长重复文件名。
**原因**：Vite 的 `node_modules/.vite` 缓存了旧构建产物，导致新构建时 Rollup 反复读取旧文件。
**修复**：
```bash
rm -rf node_modules/.vite
```

### 错误 2：GitHub Actions 构建失败
**现象**：Actions 页面显示红色 ❌
**原因**：可能是 `package.json` 或 `vite.config.js` 配置错误
**修复**：查看 Actions 日志，根据错误信息修复

### 错误 3：GitHub Pages 缓存未更新
**现象**：推送后页面没有变化。
**原因**：GitHub Pages CDN 缓存了旧文件。
**修复**：访问时加 `?r=随机数` 参数，如 `?r=123`。

### 错误 4：弹窗不显示
**现象**：自动播放失败，但弹窗不出现。
**原因**：`story.html` 源码中缺少 `bgmModal` 元素，或 `story-loader.js` 中没有 `showPlayModal` 函数。
**修复**：确保源码 `story.html` 包含弹窗 DOM 元素，确保 `story-loader.js` 在 `catch` 和 `error` 事件中调用 `showPlayModal()`。

---

## 五、版本回退的正确方法

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

## 六、重要文件清单

| 文件 | 类型 | 说明 |
|------|------|------|
| `src/shared/story-loader.js` | 源码 | 故事加载器，包含音频弹窗逻辑 |
| `src/shared/story-renderer.js` | 源码 | 故事渲染器 |
| `src/shared/vinyl-player.js` | 源码 | 唱片播放器控制 |
| `src/shared/vinyl-player.css` | 源码 | 唱片样式+脉冲动画 |
| `src/stories/config.json` | 配置 | 故事元数据（BGM、主题等） |
| `index.html` | 源码入口 | 书架首页（引用 `src/shared/`） |
| `story.html` | 源码入口 | 故事页（引用 `src/shared/`） |
| `vite.config.js` | 配置 | Vite 构建配置，`base: './'` |
| `.gitignore` | 配置 | 排除 `dist/` 和构建产物 |
| `.github/workflows/deploy.yml` | 配置 | GitHub Actions 自动构建部署 |

---

## 七、版本号规则

- 格式：`v1.0.X`
- 每次修改后 `X + 1`
- 显示位置：页面底部 `.version-mark`
- 用途：确认云端是否更新，避免缓存困扰
- **注意**：GitHub Actions 自动构建时，版本号由源码中的 `story.html` 和 `index.html` 决定，构建后不会自动修改

---

## 八、历史踩坑记录

### 2026-06-30 v1.0.17 构建产物污染
- **问题**：v1.0.16 构建后 `story.html` 包含大量旧的 `modulepreload` 引用（如 `config-BIbxg2R--DzfPGOwd...-DBhTcck2-DBhTcck2.js`），导致新构建产物引用旧文件，形成恶性循环。
- **根因**：手动 `cp -r dist/* .` 覆盖源码 HTML；没有 `.gitignore` 排除构建产物。
- **解决**：添加 `.gitignore` 排除 `dist/` 和 `assets/`；配置 GitHub Actions 自动构建；不再手动复制 dist/。

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
