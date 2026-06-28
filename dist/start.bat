@echo off
chcp 65001 >nul
echo ==========================================
echo   我的故事集 - 本地服务器启动器
echo ==========================================
echo.
echo 正在启动本地服务器...
echo.

:: 尝试使用 Python 3
python -m http.server 8080 >nul 2>&1 &
if %errorlevel% == 0 (
    echo [OK] Python 服务器已启动
    goto OPEN
)

:: 尝试使用 Python 2
python2 -m SimpleHTTPServer 8080 >nul 2>&1 &
if %errorlevel% == 0 (
    echo [OK] Python 服务器已启动
    goto OPEN
)

:: 尝试使用 Node.js
node -e "require('http').createServer((req,res)=>{const fs=require('fs'),path=require('path');let f=path.join(process.cwd(),req.url==='/'?'index.html':req.url);if(!fs.existsSync(f))f=path.join(process.cwd(),'index.html');const ext=path.extname(f);const mime={'html':'text/html','js':'application/javascript','css':'text/css','json':'application/json','png':'image/png','jpg':'image/jpeg','gif':'image/gif','svg':'image/svg+xml'};res.writeHead(200,{'Content-Type':mime[ext]||'application/octet-stream'});fs.createReadStream(f).pipe(res);}).listen(8080,()=>console.log('Server running at http://localhost:8080'))" >nul 2>&1 &
if %errorlevel% == 0 (
    echo [OK] Node.js 服务器已启动
    goto OPEN
)

:: 尝试使用 PHP
php -S localhost:8080 >nul 2>&1 &
if %errorlevel% == 0 (
    echo [OK] PHP 服务器已启动
    goto OPEN
)

echo [错误] 未找到可用的服务器程序
echo.
echo 请安装以下任一环境：
echo   - Python 3 (推荐): https://python.org
echo   - Node.js: https://nodejs.org
echo.
echo 或者手动使用 VS Code + Live Server 插件打开
echo.
pause
exit

:OPEN
timeout /t 1 >nul
echo.
echo 服务器地址: http://localhost:8080
echo.
echo 正在打开浏览器...
start http://localhost:8080
echo.
echo 按任意键关闭服务器...
pause >nul

:: 关闭服务器进程
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8080') do taskkill /PID %%a /F >nul 2>&1

echo 服务器已关闭
