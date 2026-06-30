# 项目开发日志

> 记录每次问题、痛点、修复注意事项和解决方法。每次更新后追加。

---

## 2026-06-30 — v1.0.19 大修复：构建产物污染 + node_modules 提交 + DOM 结构丢失

### ⚠️ 严重问题：故事页完全空白

### 问题现象
1. **线上 story.html 页面完全空白**：只有左上角唱片和"返回书架"链接，没有标题、作者、正文内容
2. **本地构建正常但线上不显示**：`npm run build` 成功，但 `dist/story.html` 缺少 `novel-header`、`novel-content` 等 DOM 结构
3. **GitHub Actions 构建失败**：`vite: Permission denied` 错误，无法完成构建部署
4. **版本号混乱**：线上显示 `v1.0.19` 但内容来自旧版本，缓存和源码不一致

### 根本原因分析

#### 1. `node_modules/` 被提交到仓库（最大错误）
- 本地 `npm install` 后，`node_modules/` 没有被 `.gitignore` 忽略
- 我在 Windows 上运行 `npm install`，`node_modules/.bin/vite` 是 Windows 批处理文件（`.cmd`）
- GitHub Actions（Linux）拉取仓库后，直接读取仓库中的 `node_modules/.bin/vite`（Windows 权限），无法执行
- 导致 `npm run build` 时 `vite: Permission denied`

**为什么我没发现：**
- 之前手动构建部署时，`node_modules` 在本地，构建没问题
- 切换到 Actions 自动部署时，没有检查仓库中是否有 `node_modules`
- 多次失败后才想到权限问题，浪费大量时间

#### 2. `cp -r dist/* .` 污染源码（循环错误）
- 手动构建部署时，我把 `dist/` 中的构建产物复制到根目录
- `index.html` 和 `story.html` 变成了引用 `assets/` 的构建产物版本
- 下次 Actions 构建时，Vite 读取的是被污染的 HTML，找不到旧的 `assets/` 文件
- 构建失败，产生 `Could not resolve "./assets/main-D-XSfEdW.js"` 错误

**为什么循环错误：**
- 构建失败 → 我手动构建部署 → 复制 `dist/` 到根目录 → 再次提交构建产物
- 构建产物又被 Actions 读取 → 再次失败 → 恶性循环

#### 3. `story.html` DOM 结构丢失（修复时引入的新错误）
- 在恢复源码时，我重写了 `story.html`，但没有参考正确的版本
- 我写的版本只有 `#storyContent` 空 div，缺少 `novel-header`、`novel-content`、`.comments-section` 等 DOM 结构
- `story-renderer.js` 查找 `.novel-header`、`.novel-content` 等元素，找不到 → 内容无法渲染
- 页面只显示导航和唱片，正文完全空白

**为什么引入新错误：**
- 急于修复，没有先检查 `git show b436444:story.html` 的正确结构
- 凭记忆重写，遗漏了关键 DOM 元素
- 没有验证截图中的布局是否与代码一致

#### 4. 版本号混乱
- `b00078d`（v1.0.17）和 `b436444`（v1.0.19）的构建产物混在 `assets/` 中
- `assets/` 中有 `story-trhtWfuU.js`（v1.0.17）和 `story-DcS8jH-u.js`（v1.0.19）
- 构建产物文件名不同（Vite 的 content-hash），导致引用不一致
- 线上和本地构建产物不同步，产生 `404` 或 `404` 错误

### 修复方案（完整步骤）

#### 步骤 1：从仓库中移除 `node_modules`
```bash
git rm -r --cached node_modules
git commit -m "fix: 从仓库中移除 node_modules"
```
- 删除了 197 个文件，-199KB
- 本地保留 `node_modules/`（用于本地构建），但不再提交到 Git

#### 步骤 2：从 `b436444` 恢复完整源码
```bash
# 恢复正确的 HTML 文件（源码引用）
git show b436444:index.html > index.html
git show b436444:story.html > story.html
# 恢复 src/ 目录
git checkout b436444 -- src/
```

正确的 `index.html`：
```html
<link rel="stylesheet" href="./src/style.css">
<script type="module" src="./src/shared/home.js"></script>
```

正确的 `story.html`：
```html
<link rel="stylesheet" href="./src/shared/novel-skeleton.css">
<link rel="stylesheet" href="./src/shared/nav.css">
<link rel="stylesheet" href="./src/shared/vinyl-player.css">
<link rel="stylesheet" href="./src/shared/themes.css">
<script type="module" src="./src/shared/story-loader.js"></script>
<!-- 包含完整的 DOM 结构 -->
<main class="novel-page">
  <div class="novel-paper">
    <div class="novel-gutter"></div>
    <header class="novel-header"></header>
    <article class="novel-content"></article>
  </div>
</main>
<section class="comments-section">...</section>
```

#### 步骤 3：清理多余的构建产物
```bash
# 删除旧版本的构建产物（避免混淆）
rm -f assets/config-BIbxg2R--DzfPGOwd.js
rm -f assets/main-D-XSfEdW.js
rm -f assets/data-CVfYzPhi-Dqa5CdRL.js
rm -f assets/story-BgWuU_tR.js
rm -f assets/story-CuGftS2S.js
rm -f assets/story-DcS8jH-u.js
```

#### 步骤 4：修正 Actions 配置
```yaml
- name: Install dependencies
  run: npm install  # 不是 npm ci（因为 node_modules 已移除）

- name: Build
  run: npx vite build  # 不是 npm run build（避免权限问题）
```

#### 步骤 5：本地构建验证
```bash
rm -rf dist
npm run build
# 检查 dist/story.html 是否包含 novel-header、novel-content
grep -o "novel-header\|novel-content" dist/story.html
```

### 验证清单（每次修复后必须检查）

1. **HTML 文件引用检查**：
   - `index.html` 引用 `./src/style.css` 和 `./src/shared/home.js`（不是 `assets/`）
   - `story.html` 引用 `./src/shared/*.css` 和 `./src/shared/story-loader.js`（不是 `assets/`）

2. **DOM 结构检查**：
   - `story.html` 包含 `<header class="novel-header">`、`<article class="novel-content">`、`<section class="comments-section">`
   - 检查截图中的布局是否与代码一致

3. **构建产物检查**：
   - `npm run build` 成功，无错误
   - `dist/story.html` 包含所有必要的 DOM 元素
   - `assets/` 中只有一个版本的 `story-*.js` 和 `main-*.js`（无重复）

4. **Git 状态检查**：
   - `git status` 没有 `node_modules/` 文件
   - `git ls-files | grep "^node_modules"` 返回空
   - 没有旧的构建产物被意外提交

5. **线上验证**：
   - 检查 `<title>` 标签是否变化（确认缓存刷新）
   - 检查 `version-mark` 是否与提交版本一致
   - 加 `?r=随机数` 参数绕过缓存

### 重要教训

#### 1. 永远不要提交 `node_modules/` 到仓库
- 即使 `.gitignore` 中有 `node_modules/`，也可能因为本地配置问题被提交
- 提交前检查：`git ls-files | grep "^node_modules"`
- 如果已提交：`git rm -r --cached node_modules`，然后提交删除

#### 2. 永远不要手动 `cp -r dist/* .` 到根目录
- 这会覆盖 `index.html` 和 `story.html`，破坏源码引用
- 构建产物和源码必须分开：
  - 源码 → Actions 自动构建 → 部署 `dist/`
  - 或：手动构建后，只复制 `dist/` 中的新文件，不覆盖 HTML 源码

#### 3. 恢复源码时先参考正确的版本
- 不要凭记忆重写 HTML，先查看历史版本：`git show b436444:story.html`
- 检查截图中的布局是否与代码一致
- 对比截图中的 DOM 结构（如 `novel-header`、`novel-content`）

#### 4. 版本号一致性
- `index.html` 和 `story.html` 的 `version-mark` 必须一致
- 每次修改后 +0.0.1，用于确认是否拿到最新版本
- 线上版本号 ≠ 本地版本号 → 说明缓存未刷新或部署失败

#### 5. 构建产物文件名管理
- Vite 使用 content-hash 生成文件名，每次构建可能不同
- 不要在 `assets/` 中保留多个版本的构建产物（会混淆）
- 定期清理旧的 `assets/` 文件，只保留最新构建产物

#### 6. GitHub Actions 调试
- 构建失败时，先检查 Actions 日志的具体错误（`vite: Permission denied`）
- 不要反复修改 `.github/workflows/deploy.yml` 猜测问题
- 先本地排查（`npm run build` 是否成功），再检查 Actions 环境差异

#### 7. 缓存刷新
- GitHub Pages CDN 有 10 分钟缓存，但可能需要更长时间
- 修改标题或添加随机参数 `?r=随机数` 强制刷新
- 如果标题没变，说明部署没有成功，需要检查 Actions 状态

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

### 当前方案（GitHub Actions 自动构建）
1. 源码提交到 main 分支（`src/`、`index.html`、`story.html` 等）
2. GitHub Actions 自动运行 `npm run build`
3. 部署 `dist/` 到 GitHub Pages
4. 无需手动复制 `dist/` 到根目录

### 旧方案（已废弃）
之前手动构建部署流程：
1. `npm run build` 生成 `dist/`
2. `cp -r dist/* .` 复制到根目录（❌ 此步骤导致源码污染）
3. `git push` 提交（同时提交了构建产物和源码）

### 废弃原因
手动复制 `dist/` 到根目录会覆盖 `index.html` 和 `story.html`，导致后续构建时 Vite 读取被污染的 HTML，产生旧引用和重复文件名。

### 注意事项
- 本地开发用 `npm run dev`（`http://localhost:3000`）
- 需要本地预览时，`npm run build` 后访问 `dist/` 目录（不复制到根目录）
- 推送时网络可能不稳定，需要 `git config http.sslVerify false`
- GitHub Actions 构建状态：仓库 → Actions 标签页查看

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

## 附录：技术栈和工具

- **构建工具**：Vite 5.4.21
- **包管理器**：npm 10.8.2
- **Node.js**：v20.20.2
- **部署平台**：GitHub Pages（GitHub Actions 自动构建）
- **字体**：Google Fonts（Noto Serif SC、ZCOOL XiaoWei）
- **CSS 框架**：原生 CSS（CSS 变量驱动主题）
- **版本控制**：Git（main 分支）

## 附录：项目目录结构

```
my-stories/
├── src/
│   ├── style.css              # 首页样式
│   ├── shared/
│   │   ├── home.js            # 首页渲染逻辑
│   │   ├── story-loader.js    # 故事页加载逻辑（含章节 BGM 切换）
│   │   ├── story-renderer.js  # 故事内容渲染
│   │   ├── vinyl-player.js    # 唱片播放器
│   │   ├── novel-skeleton.css # 小说排版骨架
│   │   ├── nav.css            # 导航栏样式
│   │   ├── vinyl-player.css   # 唱片播放器样式
│   │   └── themes.css         # 主题变量
│   ├── stories/
│   │   ├── config.json        # 故事配置（BGM、主题等）
│   │   ├── story1/
│   │   │   └── data.json      # 故事1数据（含章节 BGM 触点）
│   │   ├── story2/
│   │   │   └── data.json
│   │   └── story3/
│   │       └── data.json
│   └── comments.js            # 评论模块（本地存储）
├── index.html                 # 书架首页（源码引用 src/）
├── story.html                 # 统一故事页（源码引用 src/）
├── vite.config.js             # Vite 配置（多页面入口）
├── package.json               # 项目依赖
├── .gitignore                 # Git 忽略规则（node_modules/、dist/）
├── .github/workflows/
│   └── deploy.yml             # GitHub Actions 自动构建
├── DEVLOG.md                  # 本文件（开发日志）
└── BUILD_GUIDE.md             # 构建指南
```

---

**日志维护者**：CTRL66666
**最后更新**：2026-06-30
**版本**：v1.0.19
