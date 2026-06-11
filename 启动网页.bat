@echo off
chcp 65001 >nul
cd /d "%~dp0"
where python >nul 2>nul
if %errorlevel%==0 (set PY=python) else (
    where py >nul 2>nul
    if %errorlevel%==0 (set PY=py) else (set PY=)
)
if "%PY%"=="" (
    echo [提示] 没有找到 Python，无法启动本地服务，3D 场景的照片将无法显示。
    echo 请安装 Python（勾选 Add Python to PATH）：https://www.python.org/downloads/
    echo 现在改为直接打开 index.html（基础功能可用）...
    start "" index.html
    pause
    exit /b
)
echo 正在更新照片清单...
%PY% tools\build_photos.py
echo.
echo 正在启动时光画廊... 浏览器即将打开 http://localhost:8520
start "" http://localhost:8520
%PY% -m http.server 8520
