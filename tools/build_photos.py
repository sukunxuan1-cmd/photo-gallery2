# -*- coding: utf-8 -*-
"""
扫描 photos/ 下所有文件夹里的图片，生成 js/photos.js 照片清单。
往文件夹里放好照片后运行：  python tools/build_photos.py
（Windows 用户直接双击根目录的「更新照片.bat」即可）
"""
import json
import re
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PHOTOS_DIR = ROOT / "photos"
OUTPUT = ROOT / "js" / "photos.js"

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".jfif", ".avif"}

# 首页相册的展示顺序（不在列表里的新文件夹会自动排在后面）
PREFERRED_ORDER = [
    "9.3阅兵观看", "10.11中秋活动", "12.12幸福节", "25.14谢总家宴",
    "25年大扫除", "25年客户祝福视频花絮", "65期遇见幸福照片", "2024年度表彰照片",
    "2025.01战略导航", "2025.07蒙眼团建", "2025.08读书会一周年", "2025.10善循环分享会",
    "2025.12.31coco离职毕业礼", "2025.12.31元旦下午茶", "2025年公益捐款截图部分",
    "2025业务冲刺", "东坪山团建-纯玩", "陆度学习", "年终个人复盘",
    "新办公室动工", "新春开工启动照片", "新人加入", "A-日常素材", "A-未分类",
]


def natural_key(name: str):
    """让 2.jpg 排在 10.jpg 前面"""
    return [int(t) if t.isdigit() else t.lower() for t in re.split(r"(\d+)", name)]


def display_name(folder_name: str) -> str:
    """去掉文件夹名里的「还没有照片」之类的备注"""
    name = re.sub(r"[-—–_ ]*(还?没有照片)$", "", folder_name)
    return name.strip(" -—–_") or folder_name


def main():
    if not PHOTOS_DIR.is_dir():
        raise SystemExit(f"找不到照片目录: {PHOTOS_DIR}")

    folders = sorted([d for d in PHOTOS_DIR.iterdir() if d.is_dir()],
                     key=lambda d: d.name)

    def order_key(d: Path):
        clean = display_name(d.name)
        if clean in PREFERRED_ORDER:
            return (0, PREFERRED_ORDER.index(clean))
        return (1, 0)

    folders.sort(key=order_key)

    categories = []
    total = 0
    for folder in folders:
        images = sorted(
            [f for f in folder.iterdir()
             if f.is_file() and f.suffix.lower() in IMAGE_EXTS],
            key=lambda f: natural_key(f.name),
        )
        photos = [f"photos/{folder.name}/{f.name}" for f in images]
        total += len(photos)
        categories.append({
            "name": display_name(folder.name),
            "folder": f"photos/{folder.name}",
            "photos": photos,
        })

    data = {
        "generatedAt": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "categories": categories,
    }

    OUTPUT.write_text(
        "/* 本文件由 tools/build_photos.py 自动生成，请勿手动编辑。\n"
        "   往 photos/ 各文件夹放入照片后，双击「更新照片.bat」即可重新生成。 */\n"
        "window.GALLERY_DATA = "
        + json.dumps(data, ensure_ascii=False, indent=2)
        + ";\n",
        encoding="utf-8",
    )

    print(f"完成！共 {len(categories)} 个相册、{total} 张照片")
    print(f"已写入 {OUTPUT}")


if __name__ == "__main__":
    main()
