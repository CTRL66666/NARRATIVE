# 项目开发日志

> 记录每次问题、痛点、修复注意事项和解决方法。每次更新后追加。

---

## 2026-06-29 — v1.0.6 评论功能修复：零门槛本地存储

### 问题现象
1. **评论显示"找不到对应的故事"**：`getCurrentStory()` 通过 `pathname` 检测（如 `story1.html`），但当前页面是 `story.html?id=story1`，pathname 里没有 `story1`。
2. **需要 GitHub 登录才能评论**：`submitComment` 需要 GitHub token，普通用户门槛太高。

### 根本原因
1. `getCurrentStory()` 使用 `window.location.pathname.includes('story1')` 匹配，但统一模板后 URL 变成了 `story.html?id=story1`，pathname 中不含故事 ID。
2. 评论写入依赖 GitHub API（`POST /repos/{owner}/{repo}/issues/{number}/comments`），需要 token 认证。

### 修复方案
1. **读取故事 ID**：改为从 URL 参数读取：`new URLSearchParams(window.location.search).get('id')`
2. **评论存储改为 localStorage**：
   - 读取：`localStorage.getItem('narrative-comments-{storyId}')`
   - 写入：`localStorage.setItem('narrative-comments-{storyId}', JSON.stringify(comments))`
   - 格式：`{name, text, time, source: 'local'}`
3. **保留 GitHub 读取（可选）**：向后兼容，如果配置了 `STORY_ISSUE_MAP`，仍从 GitHub Issues 读取公开评论并合并显示。
4. **区分来源**：本地评论显示 `(本地)` 标签，GitHub 评论不显示标签。

### 注意事项
- localStorage 评论**仅在当前设备可见**，换设备/浏览器会丢失。
- 如果需要跨设备同步，后续可以添加"导出评论"或"同步到 GitHub"功能。
- 评论按时间排序，GitHub 评论和本地评论合并显示。

---

## 2026-06-29 — v1.0.5 移动端导航栏溢出修复

### 问题现象
手机端（375px 视口）导航栏右侧"下一篇 →"被截断，无法完整显示。页面仍可左右拖动约 97px。

### 根本原因
1. **flex-shrink 默认压缩**：`.nav-next` 没有设置 `flex-shrink: 0`，在 flex 布局中被默认压缩到不够显示完整文字。
2. **构建缓存未更新**：Vite 的 `node_modules/.vite` 缓存了旧版本 CSS（v1.0.3），修改 `nav.css` 后重新构建仍然输出旧的 CSS 内容。
3. **根目录 HTML 被覆盖**：为 GitHub Pages 部署，将 `dist/` 内容复制到根目录，导致 `story.html` 和 `index.html` 被构建产物（引用 `./assets/`）覆盖，失去了 Vite 源码入口（引用 `src/shared/*.css`），后续修改源码后 Vite 无法正确读取。

### 修复方案
```css
/* nav.css */
.nav-back, .nav-next {
  flex-shrink: 0;          /* 禁止被压缩 */
  white-space: nowrap;      /* 文字不换行 */
}

.chapter-select {
  text-overflow: ellipsis;   /* 超长时显示省略号 */
  overflow: hidden;
  white-space: nowrap;
}

/* 移动端 body 禁止水平滚动 */
html, body { overflow-x: hidden; }
```

### 修复步骤
1. 清除 Vite 缓存：`rmdir /s /q node_modules/.vite`
2. 从 Git 恢复原始 HTML 源码：`git checkout 57642b3 -- story.html index.html`
3. 修改源码 CSS → 重新构建 → 复制 `dist/` 到根目录部署

### 注意事项
- **每次构建前确认 HTML 是源码版本**：根目录 `story.html` 必须引用 `src/shared/*.css`，否则 Vite 无法正确读取源码。
- **构建后确认 CSS 哈希变化**：如果多次修改后 CSS 哈希没有变化，说明缓存未更新，必须清除 `node_modules/.vite`。
- **GitHub Pages CDN 缓存**：部署后需要加 `?r=随机数` 参数强制刷新，或等待 5-10 分钟。
- **先恢复源码再构建** → 构建后复制 dist 到根目录 → 提交推送。顺序不可颠倒。

### 版本号规则
每次修改后 +0.0.1，在页脚显示（`.version-mark`），用于确认是否拿到最新版本。

---

## 2026-06-29 — v1.0.4 导航栏排版恢复

### 问题现象
v1.0.3 修复溢出时，把导航栏 padding 和字体缩得太小（`padding: 6px 6px 6px 52px`，字体 `0.75rem`），导致排版拥挤、不自然。

### 修复方案
恢复原始 padding（10px 16px 10px 64px）和字体（0.85rem），但保留 `overflow: hidden` 和 `max-width: 100vw`。

### 新增小手机断点
```css
@media (max-width: 400px) { ... }
```
在更窄屏幕上再缩小，避免一刀切。

---

## 2026-06-29 — v1.0.3 背景层溢出修复

### 问题现象
`scrollWidth: 480px` > `clientWidth: 375px`，页面有 97px 溢出。

### 根本原因
`.bg-effect`（噪点纹理）和 `.rain-overlay` 等背景层使用 `width: 100%`，在 `overflow-x: hidden` 的 `body` 上仍然撑开 `scrollWidth`。需要给背景层加 `max-width: 100vw`。

### 修复方案
```css
.bg-effect, .rain-overlay, .stars-overlay, .scan-lines, .sunlight-overlay, .leaf-overlay {
  max-width: 100vw;
}
```

### 注意事项
`fixed` 定位元素在移动端仍可能撑开 `scrollWidth`，不能仅靠 `overflow: hidden`。

---

## 2026-06-29 — v1.0.2 添加版本号标记

### 问题现象
无法确认云端是否实质更新，缓存导致无法判断。

### 修复方案
在 `index.html` 和 `story.html` 的 footer 中添加：
```html
<p class="version-mark">v1.0.1</p>
```
每次修改后 +0.0.1，刷新后看底部即可确认版本。

---

## 2026-06-29 — v1.0.1 移动端适配

### 问题现象
手机端访问故事页，两侧有深色黑边，内容可以左右拖动，缩放不够完全。

### 修复方案
- `.novel-page` padding 从 `40px 20px` → `20px 0`（左右归零）
- `body { overflow-x: hidden }` 禁止水平滚动
- `.novel-paper` 取消 `border-radius` 和 `box-shadow`（移动端不需要纸张效果）
- `.novel-paragraph` 缩进从 `2em` → `1.5em`

### 注意事项
修改 `src/shared/novel-skeleton.css` 后必须重新构建，确保根目录 `story.html` 是源码版本（引用 `src/shared/*.css`）。

---

## 2026-06-29 — 部署到 GitHub Pages

### 问题现象
本地构建后无法直接打开（相对路径 `./assets/` 在本地 file:// 协议下失败）。

### 解决方案
1. `vite.config.js` 中 `base: './'` 使用相对路径
2. GitHub Pages 从 `main` 分支根目录部署
3. 创建 `start.bat` 一键本地服务器（`python -m http.server 8080`）

### 注意事项
- 本地开发用 `npm run dev`（`http://localhost:3000`）
- 部署前运行 `npm run build` → 复制 `dist/` 到根目录 → `git push`
- 推送时网络可能不稳定，需要 `git config http.sslVerify false`

---

## 2026-06-29 — 配置驱动架构（v1.0.0 基础）

### 项目架构决策
- `src/stories/config.json`：管理所有故事元数据（BGM、主题、背景效果）
- `story.html`：统一故事页模板，通过 `?id=xxx&ch=N` 加载任意故事
- `vite.config.js`：多页面入口（`index.html` + `story.html`）
- 三主题系统：`ancient`/`scifi`/`healing`，CSS 变量驱动
- BGM 进度保持：`sessionStorage` 保存播放时间，跨章节/刷新恢复

### 重要技术债务
1. 根目录 `story.html` 被 dist 覆盖后，需要恢复源码才能重新构建
2. 构建产物和源码文件混在同一目录，容易搞混
3. 需要手动管理 `dist/` 到根目录的复制流程

---
