#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
时光画廊本地服务器。
- 正常提供网页静态文件
- 提供 /api/photos 接口：每次请求都实时扫描 photos/ 文件夹
  → 往 photos/ 里加图片后，刷新浏览器即可看到，无需任何手动步骤

启动：python server.py   （或直接双击「启动网页.bat」）
"""
import json
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / "tools"))
from build_photos import collect  # noqa: E402

PORT = 8520


class GalleryHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.split("?")[0] == "/api/photos":
            try:
                body = json.dumps(collect(), ensure_ascii=False).encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
            except Exception as e:  # 扫描出错也别让网页挂掉
                body = json.dumps({"error": str(e)}).encode("utf-8")
                self.send_response(500)
                self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()

    def log_message(self, fmt, *args):
        pass  # 安静模式，不刷屏


def main():
    handler = partial(GalleryHandler, directory=str(ROOT))
    server = ThreadingHTTPServer(("0.0.0.0", PORT), handler)
    print(f"时光画廊已启动：http://localhost:{PORT}")
    print("照片实时扫描已开启：往 photos/ 里加图片后，刷新浏览器即可显示")
    print("按 Ctrl+C 停止服务")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n已停止")


if __name__ == "__main__":
    main()
