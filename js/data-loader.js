/* 数据加载器：
   1. 优先请求 /api/photos —— 服务器实时扫描 photos/ 文件夹（用 server.py / 启动网页.bat 时）
   2. 请求不到（比如双击 index.html 直接打开）则沿用 js/photos.js 里的备用清单
   数据就绪后再按顺序加载其余脚本，保证它们拿到的是最新照片。 */
(async function () {
  "use strict";
  try {
    const res = await fetch("api/photos", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.categories)) {
        window.GALLERY_DATA = data;
        window.GALLERY_LIVE = true; // 实时扫描模式
      }
    }
  } catch (e) { /* 离线/file:// 场景，走备用清单 */ }

  ["js/main.js", "js/extras.js", "libs/three.min.js", "js/scene3d.js"].forEach((src) => {
    const s = document.createElement("script");
    s.src = src;
    s.async = false; // 保持执行顺序
    document.body.appendChild(s);
  });
})();
