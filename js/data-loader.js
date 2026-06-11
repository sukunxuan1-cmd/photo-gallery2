/* 数据加载器：
   1. 优先请求 /api/photos —— 服务器实时扫描 photos/ 文件夹（用 server.py / 启动网页.bat 时）
   2. 请求不到（GitHub Pages、双击 index.html 等静态场景）则加载 js/photos.js 备用清单，
      并带上时间戳参数，绕过浏览器和 CDN 缓存，保证拿到的永远是最新清单
   数据就绪后再按顺序加载其余脚本。 */
(async function () {
  "use strict";

  function addScript(src, onDone) {
    const s = document.createElement("script");
    s.src = src;
    s.async = false; // 保持执行顺序
    if (onDone) { s.onload = onDone; s.onerror = onDone; }
    document.body.appendChild(s);
  }

  function loadRest() {
    ["js/main.js", "js/extras.js", "libs/three.min.js", "js/scene3d.js"]
      .forEach((src) => addScript(src));
  }

  try {
    const res = await fetch("api/photos", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.categories)) {
        window.GALLERY_DATA = data;
        window.GALLERY_LIVE = true; // 实时扫描模式
        loadRest();
        return;
      }
    }
  } catch (e) { /* 静态托管场景，走下面的清单文件 */ }

  addScript("js/photos.js?t=" + Date.now(), loadRest);
})();
