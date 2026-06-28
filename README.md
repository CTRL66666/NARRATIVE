# 我的故事集

一个部署在 GitHub Pages 上的沉浸式个人故事展示网站。像一本可以在线翻阅的合集，每个故事拥有独立的视觉风格和背景音乐。

## 项目结构

```
my-stories/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions 自动部署脚本
├── src/
│   ├── index.html              # 书架目录页（首页）
│   ├── main.js                 # 首页逻辑
│   ├── style.css               # 首页样式
│   ├── comments.js             # 评论模块（共享）
│   ├── story1/                 # 故事一：长安夜雨（古风）
│   │   ├── index.html
│   │   ├── main.js
│   │   └── style.css
│   ├── story2/                 # 故事二：深空信标（科幻）
│   │   ├── index.html
│   │   ├── main.js
│   │   └── style.css
│   └── story3/                 # 故事三：夏日蝉鸣（治愈）
│       ├── index.html
│       ├── main.js
│       └── style.css
├── index.html                  # 入口页面（Vite 多页面入口）
├── vite.config.js              # Vite 多页面配置
├── package.json
└── README.md
```

## 功能特性

- 📚 **多故事合集**：三个独立故事，风格迥异
- 🎨 **独立视觉风格**：古风、科幻、治愈三种主题
- 🎵 **独立背景音乐**：每个故事有专属 BGM，互不影响
- 🔗 **故事间跳转**：顶部导航 + 底部导航，方便切换
- 💬 **读者评论**：利用 GitHub Issues 存储评论数据
- ⚡ **Vite 构建**：工程化开发，热更新，快速构建
- 🚀 **自动部署**：GitHub Actions 自动构建发布到 GitHub Pages

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建（生成 dist 目录）
npm run build

# 预览构建结果
npm run preview
```

## 部署到 GitHub Pages

### 1. 创建 GitHub 仓库

1. 在 GitHub 上创建一个新仓库，命名为 `my-stories`（或你想要的名称）
2. 将代码推送到仓库：

```bash
cd my-stories
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/my-stories.git
git push -u origin main
```

### 2. 配置 GitHub Pages

1. 进入仓库的 **Settings → Pages**
2. Source 选择 **GitHub Actions**

### 3. 配置 base 路径（已自动处理）

`vite.config.js` 已配置为自动检测 base 路径：
- **本地开发**：无需配置，直接访问 `http://localhost:3000/`
- **GitHub Pages 项目页**（如 `username.github.io/my-stories`）：GitHub Actions 会自动设置
- **GitHub Pages 用户页**（如 `username.github.io`）：需要手动设置环境变量，见下方

如果需要部署到用户页（非项目页），修改 `vite.config.js`：

```javascript
const base = '/'; // 用户页使用根路径
```

### 4. 配置评论功能

编辑 `src/comments.js`：

```javascript
const GITHUB_OWNER = 'YOUR_GITHUB_USERNAME';  // 你的 GitHub 用户名
const GITHUB_REPO = 'my-stories';              // 你的仓库名
```

同时在仓库中创建 3 个 Issue，分别对应三个故事（Issue #1 对应故事1，以此类推）。

### 5. 推送触发部署

每次推送代码到 `main` 分支，GitHub Actions 会自动构建并部署。

```bash
git add .
git commit -m "Update content"
git push origin main
```

## 技术栈

- **构建工具**：Vite 5
- **纯前端**：HTML + CSS + JavaScript（无框架依赖）
- **部署**：GitHub Pages + GitHub Actions
- **评论存储**：GitHub Issues API

## 自定义

### 添加新故事

1. 复制 `src/story1/` 目录为新的故事目录（如 `src/story4/`）
2. 修改内容、标题、样式
3. 在 `vite.config.js` 的 `pages` 对象中添加新入口
4. 在首页 `index.html` 中添加新的书籍卡片

### 修改 BGM

每个故事的 `index.html` 中 `<audio>` 标签的 `src` 属性可以替换为任意音频 URL。建议使用在线音频链接或自行托管音频文件。

## 许可证

MIT

my-stories/
├── index.html              # 首页骨架
├── story.html              # 故事页模板
├── vite.config.js          # 构建配置
├── package.json            # 依赖
└── src/
    ├── style.css           # 首页样式
    ├── comments.js         # 评论
    ├── shared/
    │   ├── home.js         # 书架渲染
    │   ├── story-loader.js # 故事加载器
    │   ├── story-renderer.js
    │   ├── vinyl-player.js
    │   ├── themes.css      # 三大主题
    │   └── ...
    └── stories/
        ├── config.json     # 故事配置中心
        ├── story1/
        │   └── data.json   # 长安夜雨内容
        ├── story2/
        │   └── data.json   # 深空信标内容
        └── story3/
            └── data.json   # 夏日蝉鸣内容