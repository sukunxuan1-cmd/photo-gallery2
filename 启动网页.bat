@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 正在启动时光画廊... 浏览器即将打开 http://localhost:8520
start "" http://localhost:8520
where python >nul 2>nul
if %errorlevel%==0 (
    python -m http.server 8520
) else (
    where py >nul 2>nul
    if %errorlevel%==0 (
        py -m http.server 8520
    ) else (
        echo [提示] 没有找到 Python，直接双击 index.html 也可以浏览。
        start "" index.html
        pause
    )
)
