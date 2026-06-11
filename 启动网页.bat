@echo off
chcp 65001 >nul
cd /d "%~dp0"
set "PY="
where python >nul 2>nul && set "PY=python"
if not defined PY (where py >nul 2>nul && set "PY=py")
if not defined PY (
    echo [提示] 没有找到 Python，无法启动本地服务。
    echo 请安装 Python（勾选 Add Python to PATH）：https://www.python.org/downloads/
    echo 现在改为直接打开 index.html（照片需先双击「更新照片.bat」生成清单）...
    start "" index.html
    pause
    exit /b
)
echo 正在启动时光画廊... 浏览器即将打开 http://localhost:8520
echo 照片实时扫描已开启：往 photos 里加图片后，刷新浏览器即可显示
start "" http://localhost:8520
%PY% server.py
