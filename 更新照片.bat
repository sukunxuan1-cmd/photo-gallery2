@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 正在扫描 photos 文件夹...
where python >nul 2>nul
if %errorlevel%==0 (
    python tools\build_photos.py
) else (
    where py >nul 2>nul
    if %errorlevel%==0 (
        py tools\build_photos.py
    ) else (
        echo [错误] 没有找到 Python，请先安装：https://www.python.org/downloads/
        echo 安装时记得勾选 "Add Python to PATH"
    )
)
echo.
pause
