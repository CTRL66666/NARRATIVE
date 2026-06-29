#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
我的故事集 - 本地服务器启动器
用法: python start.py
"""

import http.server
import socketserver
import webbrowser
import os
import sys

PORT = 8080

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # 添加 CORS 支持，避免本地跨域问题
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

    def translate_path(self, path):
        # 根路径指向 index.html
        if path == '/' or path == '':
            path = '/index.html'
        return super().translate_path(path)

def main():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        url = f"http://localhost:{PORT}"
        print(f"\n{'='*48}")
        print(f"  我的故事集 - 本地阅读服务器")
        print(f"{'='*48}")
        print(f"\n  服务器地址: {url}")
        print(f"  按 Ctrl+C 停止服务器\n")
        
        # 自动打开浏览器
        webbrowser.open(url)
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n\n  服务器已关闭\n")
            sys.exit(0)

if __name__ == '__main__':
    main()
