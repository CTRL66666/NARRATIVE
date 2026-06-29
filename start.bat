@echo off
chcp 65001 >nul
echo ============================================
echo      我的故事集 - 本地阅读服务器
echo ============================================
echo.

REM 检查 Python 3
python -c "import sys; sys.exit(0)" >nul 2>&1
if %errorlevel% NEQ 0 (
    echo [错误] 未找到 Python 3
    echo.
    echo 请安装 Python 3: https://python.org
    echo 安装时记得勾选 "Add Python to PATH"
    echo.
    pause
    exit /b
)

echo [OK] Python 3 已安装
echo.

REM 创建临时 Python 服务器脚本
set "PYFILE=%TEMP%\my_stories_server_%RANDOM%.py"

(
echo import http.server, socketserver, webbrowser, os

echo os.chdir(os.path.dirname(os.path.abspath(__file__)))

echo PORT = 8080

echo class Handler(http.server.SimpleHTTPRequestHandler):

echo     def end_headers(self):

echo         self.send_header('Access-Control-Allow-Origin', '*')

echo         super().end_headers()

echo     def translate_path(self, path):

echo         if path == '/' or path == '':

echo             path = '/index.html'

echo         return super().translate_path(path)

echo webbrowser.open(f'http://localhost:{PORT}')

echo print(f'服务器已启动: http://localhost:{PORT}')

echo print('按 Ctrl+C 停止服务器')

echo with socketserver.TCPServer(('', PORT), Handler) as httpd:

echo     httpd.serve_forever()
) > "%PYFILE%"

echo 正在启动服务器...
python "%PYFILE%"

REM 清理临时文件
del "%PYFILE%" 2>nul

echo.
echo 服务器已关闭
pause
