#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
压缩 photos/ 下的大图（GitHub Actions 发布流程自动调用，也可本地手动运行）。
规则：
- 超过 400KB 的图片才处理，小图原样保留
- 最长边缩到 1920px（足够 4K 大屏观看）
- JPEG 重编码 quality=85；无透明通道的大 PNG/WebP/BMP 转成 JPEG（体积通常缩小 5~10 倍）
- 带透明通道的 PNG 保留格式，仅缩尺寸 + 无损优化
- GIF（可能是动图）跳过不动
"""
import sys
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
PHOTOS_DIR = ROOT / "photos"

SIZE_LIMIT = 400 * 1024   # 超过这个体积才压缩
MAX_DIM = 1920            # 最长边
JPEG_QUALITY = 85

EXTS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".jfif"}


def has_alpha(img: Image.Image) -> bool:
    if img.mode in ("RGBA", "LA"):
        return True
    return img.mode == "P" and "transparency" in img.info


def unique_target(p: Path) -> Path:
    """换成 .jpg 后缀；若同名文件已存在则加 _c 避免覆盖别的图"""
    target = p.with_suffix(".jpg")
    if target.exists() and target != p:
        target = p.with_name(p.stem + "_c.jpg")
    return target


def process(p: Path):
    before = p.stat().st_size
    try:
        img = Image.open(p)
        img.load()
        img = ImageOps.exif_transpose(img)  # 按拍摄方向摆正
    except Exception as e:
        print(f"  跳过（无法读取）: {p.name} ({e})")
        return before, before

    alpha = has_alpha(img)
    w, h = img.size
    scale = MAX_DIM / max(w, h)
    if scale < 1:
        img = img.resize((round(w * scale), round(h * scale)), Image.LANCZOS)

    if alpha:
        # 保留透明通道，只缩尺寸 + 优化
        img.save(p, optimize=True)
        out = p
    else:
        out = unique_target(p)
        img.convert("RGB").save(out, "JPEG", quality=JPEG_QUALITY,
                                optimize=True, progressive=True)
        if out != p:
            p.unlink()

    after = out.stat().st_size
    print(f"  {p.name} -> {out.name}: {before / 1024:.0f}KB -> {after / 1024:.0f}KB")
    return before, after


def main():
    if not PHOTOS_DIR.is_dir():
        sys.exit(f"找不到照片目录: {PHOTOS_DIR}")

    total_before = total_after = count = 0
    for p in sorted(PHOTOS_DIR.rglob("*")):
        if not (p.is_file() and p.suffix.lower() in EXTS):
            continue
        if p.stat().st_size <= SIZE_LIMIT:
            continue
        b, a = process(p)
        total_before += b
        total_after += a
        count += 1

    if count:
        print(f"完成：压缩 {count} 张大图，"
              f"{total_before / 1048576:.1f}MB -> {total_after / 1048576:.1f}MB")
    else:
        print("没有需要压缩的大图")


if __name__ == "__main__":
    main()
