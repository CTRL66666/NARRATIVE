# NARRATIVE 安全部署指南

> ⚠️ **在修改任何代码前，先读此文档！** 避免重复犯错。

---

## 安全原则

### 1. 稳定版本永不丢失
- `stable` 分支：保存当前稳定版本（永不直接修改，只通过 PR 合并）
- `v1.0.x` Tag：标记发布版本，可一键回滚
- `backup-*` 分支：每次回滚时自动创建备份

### 2. 构建前必须检查
- 永远运行 `./scripts/pre-build-check.sh` 后再构建
- 检查不通过，**禁止构建**

### 3. 构建产物和源码分离
- 源码引用 `src/` 目录
- 构建产物生成到 `dist/` 目录
- **永远**不手动复制 `dist/` 到根目录（会导致源码污染）

---

## 安全流程

### 日常开发流程

```bash
# 1. 切换到 dev 分支（或从 main 创建 feature 分支）
git checkout -b feature/xxx

# 2. 修改代码...

# 3. 构建前检查（必须！）
./scripts/pre-build-check.sh

# 4. 本地构建测试
rm -rf dist
npm run build

# 5. 本地验证（Vite preview）
npm run preview

# 6. 检查 dist/ 中的文件是否正确
#    - dist/index.html 引用 assets/（正常）
#    - dist/story.html 包含 novel-header、novel-content

# 7. 提交到 Git（只提交源码，不提交 dist/ 和 node_modules）
git add -A
git commit -m "feat: xxx"
git push origin feature/xxx

# 8. 创建 Pull Request 合并到 main
# 9. GitHub Actions 自动构建部署
```

### 回滚流程（出问题时的救命稻草）

```bash
# 方法 1: 回滚到最新稳定版本（stable 分支）
./scripts/rollback.sh stable

# 方法 2: 回滚到特定 Tag 版本
./scripts/rollback.sh v1.0.19

# 方法 3: 手动回滚到 Tag
git checkout v1.0.19 -- index.html story.html src/ vite.config.js package.json
git checkout v1.0.19 -- .github/workflows/
rm -rf assets/*.js assets/*.css 2>/dev/null || true
git add -A
git commit -m "rollback: v1.0.19"
git push origin main
```

---

## 危险操作清单（禁止执行！）

| ❌ 禁止操作 | 后果 | 替代方案 |
|-----------|------|---------|
| `cp -r dist/* .` | 污染源码，覆盖 HTML 引用 | 让 Actions 自动部署，不手动复制 |
| `git add node_modules/` | 仓库权限错误，Actions 构建失败 | 检查 `.gitignore` 是否包含 `node_modules/` |
| 直接修改 `index.html` 引用 `assets/` | 下次构建找不到文件 | 只从 `src/` 引用，构建后自动处理 |
| 提交 `dist/` 到 Git | 仓库膨胀，构建冲突 | `dist/` 已在 `.gitignore` 中 |
| 提交旧版本 `assets/` | 多个版本混淆，404 错误 | 构建前 `rm -rf assets/`，只保留最新 |

---

## 版本管理规则

### 版本号规则
- `v1.0.0` → `v1.0.1` → `v1.0.2`（每次修改 +0.0.1）
- 版本号显示在 `index.html` 和 `story.html` 的页脚

### 创建稳定版本

```bash
# 1. 确认当前版本稳定（测试通过）
# 2. 更新版本号
sed -i 's/v1\.0\.0/v1.0.1/g' index.html story.html

# 3. 提交
git add -A
git commit -m "v1.0.1: xxx 功能"

# 4. 更新 stable 分支
git checkout stable
git merge main --no-ff -m "stable: v1.0.1"
git push origin stable

# 5. 创建 Tag
git tag -a v1.0.1 -m "v1.0.1: xxx 功能"
git push origin v1.0.1

# 6. GitHub 自动创建 Release
# 去 https://github.com/CTRL66666/NARRATIVE/releases 确认
```

### 回滚到稳定版本

```bash
# 一键回滚（推荐）
./scripts/rollback.sh v1.0.1

# 手动回滚
git checkout v1.0.1 -- index.html story.html src/ vite.config.js .github/workflows/
rm -rf assets/*.js assets/*.css 2>/dev/null || true
git add -A
git commit -m "rollback: v1.0.1"
git push origin main
```

---

## 故障排查

### 场景 1: Actions 构建失败

```bash
# 检查 Actions 日志
curl -s "https://api.github.com/repos/CTRL66666/NARRATIVE/actions/runs?per_page=1"

# 常见原因：
# 1. node_modules/ 在 Git 中 → 运行 ./scripts/rollback.sh
# 2. HTML 引用 assets/ 而非 src/ → 运行 ./scripts/rollback.sh
# 3. Vite 权限错误 → 使用 npx vite build（已在 deploy.yml 中配置）
```

### 场景 2: 线上页面空白

```bash
# 检查线上标题是否变化（确认缓存刷新）
curl -s "https://ctrl66666.github.io/NARRATIVE/story.html?id=story1&r=随机数" | grep "<title>"

# 常见原因：
# 1. story.html 缺少 DOM 结构 → 检查 novel-header、novel-content
# 2. JS 文件 404 → 检查 assets/ 文件名是否匹配
# 3. CDN 缓存未刷新 → 加 ?r=随机数 参数
```

### 场景 3: 版本号不一致

```bash
# 检查本地版本号
grep "version-mark" index.html story.html

# 检查线上版本号
curl -s "https://ctrl66666.github.io/NARRATIVE/index.html?r=随机数" | grep "version-mark"
```

---

## 文件说明

| 文件 | 用途 | 修改频率 |
|------|------|---------|
| `index.html` | 书架首页（源码） | 很少 |
| `story.html` | 统一故事页（源码） | 很少 |
| `src/shared/story-loader.js` | 故事加载逻辑 | 经常 |
| `src/shared/story-renderer.js` | 故事渲染 | 很少 |
| `src/shared/home.js` | 首页渲染 | 很少 |
| `src/stories/config.json` | 故事配置 | 偶尔 |
| `src/stories/story1/data.json` | 故事1数据 | 偶尔 |
| `vite.config.js` | 构建配置 | 很少 |
| `package.json` | 依赖管理 | 很少 |
| `scripts/rollback.sh` | 一键回滚 | 不修改 |
| `scripts/pre-build-check.sh` | 构建前检查 | 不修改 |

---

## 联系方式

- 仓库: https://github.com/CTRL66666/NARRATIVE
- Actions: https://github.com/CTRL66666/NARRATIVE/actions
- Releases: https://github.com/CTRL66666/NARRATIVE/releases

**最后更新**: 2026-06-30
**版本**: v1.0.19
