@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 正在扫描 photos 文件夹...
set "PY="
where python >nul 2>nul && set "PY=python"
if not defined PY (where py >nul 2>nul && set "PY=py")
if not defined PY (
    echo [错误] 没有找到 Python，请先安装：https://www.python.org/downloads/
    echo 安装时记得勾选 "Add Python to PATH"
) else (
    %PY% tools\build_photos.py
)
echo.
pause
