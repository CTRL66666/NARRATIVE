# 我的故事集 - 使用说明

## 快速打开（推荐）

### Windows 用户
1. 双击 `start.bat`
2. 自动启动服务器并打开浏览器

### Mac/Linux 用户
1. 打开终端，进入 dist 目录
2. 执行以下任一命令：
   - Python 3: `python3 -m http.server 8080`
   - Python 2: `python -m SimpleHTTPServer 8080`
   - Node.js: `npx serve`
3. 浏览器访问 `http://localhost:8080`

### VS Code 用户（最简单）
1. 安装插件 **Live Server**（Ritwick Dey）
2. 右键 `index.html` → **Open with Live Server**

---

## 为什么不能直接双击打开？

本项目使用现代 ES Module 技术，浏览器出于安全考虑，禁止通过 `file://` 协议加载 JS 模块。必须通过 `http://` 协议（即本地服务器）打开。

## 部署到服务器

将 `dist` 文件夹中的所有文件上传到任意静态服务器即可：
- GitHub Pages
- Vercel / Netlify
- 阿里云/腾讯云 OSS
- 个人服务器

---

## 添加新故事

1. 修改源码中的 `src/stories/config.json` 添加配置
2. 创建 `src/stories/story4/data.json` 写入内容
3. 重新执行 `npm run build`
4. 将新的 `dist` 文件夹部署即可

不需要创建任何 HTML/CSS/JS 文件。

## 项目路径

源码: `C:\Users\20442\Documents\Kimi\Workspaces\网站\my-stories\`

