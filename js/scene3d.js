/* ============ 时光画廊 · three.js 3D 场景 ============
   🌌 照片星河：照片化作星辰组成旋转银河，可飞入穿梭
   🏛️ 虚拟美术馆：第一人称漫游的照片展厅 */
(function () {
  "use strict";
  if (!window.THREE) { console.warn("three.js 未加载，3D 场景不可用"); return; }

  const DATA = (window.GALLERY_DATA && window.GALLERY_DATA.categories) || [];
  const $ = (s) => document.querySelector(s);
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  const ALL = [];
  DATA.forEach((c) => c.photos.forEach((src) => ALL.push({ src, name: c.name })));

  /* ================= file:// 协议检测 =================
     直接双击 index.html 打开时，浏览器禁止 WebGL 读取本地图片，
     3D 场景里的照片会被安全策略拦下。这里给出明确提示并安全降级。 */
  const IS_FILE = location.protocol === "file:";
  let warned = false;
  function warnFileProto() {
    if (warned) return;
    warned = true;
    const tip = document.createElement("div");
    tip.className = "s3-warn";
    tip.innerHTML = "⚠️ 检测到网页是<b>双击 index.html</b> 打开的，浏览器安全限制导致 3D 场景读不到照片。<br>请改用 <b>「启动网页.bat」</b> 打开（地址为 http://localhost:8520），照片就能正常显示。";
    document.body.appendChild(tip);
    setTimeout(() => tip.classList.add("show"), 50);
    tip.addEventListener("click", () => tip.remove());
  }

  /* ================= 共享工具 ================= */

  // 把照片缩到 256px 再做纹理，省显存
  function loadPhotoTexture(src, onReady) {
    const img = new Image();
    img.onload = () => {
      const S = 256;
      const cv = document.createElement("canvas");
      const aspect = img.width / img.height;
      cv.width = aspect >= 1 ? S : Math.round(S * aspect);
      cv.height = aspect >= 1 ? Math.round(S / aspect) : S;
      const c = cv.getContext("2d");
      c.drawImage(img, 0, 0, cv.width, cv.height);
      // file:// 下画布会被安全策略污染，传给 WebGL 会直接抛错——提前拦截
      try { c.getImageData(0, 0, 1, 1); }
      catch { warnFileProto(); onReady(null, 1); return; }
      const tex = new THREE.CanvasTexture(cv);
      tex.encoding = THREE.sRGBEncoding;
      onReady(tex, aspect);
    };
    img.onerror = () => onReady(null, 1);
    img.src = encodeURI(src);
  }

  // 没照片时的占位纹理：渐变 + 表情
  const PLACE_COLORS = [["#2b1a55", "#6b2d5c"], ["#1a2d55", "#2d6b5c"], ["#552b1a", "#5c2d6b"], ["#1a4055", "#4a2d6b"]];
  const PLACE_EMOJIS = ["📸", "✨", "💛", "🌟", "🎈", "🏆"];
  function placeholderTexture(i) {
    const cv = document.createElement("canvas");
    cv.width = cv.height = 256;
    const c = cv.getContext("2d");
    const g = c.createLinearGradient(0, 0, 256, 256);
    const cols = PLACE_COLORS[i % PLACE_COLORS.length];
    g.addColorStop(0, cols[0]); g.addColorStop(1, cols[1]);
    c.fillStyle = g; c.fillRect(0, 0, 256, 256);
    c.font = "90px serif";
    c.textAlign = "center"; c.textBaseline = "middle";
    c.fillText(PLACE_EMOJIS[i % PLACE_EMOJIS.length], 128, 128);
    const tex = new THREE.CanvasTexture(cv);
    tex.encoding = THREE.sRGBEncoding;
    return tex;
  }

  // 文字纹理（标签、星河中心大字）
  function textTexture(text, { size = 64, color = "#ffe9ad", pad = 30, bg = null } = {}) {
    const cv = document.createElement("canvas");
    const c = cv.getContext("2d");
    const font = `700 ${size}px "PingFang SC", "Microsoft YaHei", sans-serif`;
    c.font = font;
    cv.width = Math.ceil(c.measureText(text).width) + pad * 2;
    cv.height = size + pad * 2;
    if (bg) { c.fillStyle = bg; c.fillRect(0, 0, cv.width, cv.height); }
    c.font = font;
    c.textAlign = "center"; c.textBaseline = "middle";
    c.shadowColor = "rgba(255, 200, 120, .8)";
    c.shadowBlur = 24;
    c.fillStyle = color;
    c.fillText(text, cv.width / 2, cv.height / 2);
    const tex = new THREE.CanvasTexture(cv);
    tex.encoding = THREE.sRGBEncoding;
    return { tex, aspect: cv.width / cv.height };
  }

  // 光晕贴图（径向渐变，叠加发光用）
  function glowTexture(inner) {
    const cv = document.createElement("canvas");
    cv.width = cv.height = 128;
    const c = cv.getContext("2d");
    const g = c.createRadialGradient(64, 64, 4, 64, 64, 64);
    g.addColorStop(0, inner);
    g.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = g; c.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(cv);
  }

  // 3D 场景共用的照片放大层
  const zoom = $("#s3Zoom");
  function showZoom(src, name) {
    $("#s3ZoomImg").src = src ? encodeURI(src) : "";
    $("#s3ZoomName").textContent = name || "";
    zoom.classList.add("open");
  }
  zoom.addEventListener("click", () => zoom.classList.remove("open"));

  function makeRenderer(canvas) {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(innerWidth, innerHeight);
    renderer.outputEncoding = THREE.sRGBEncoding;
    return renderer;
  }

  /* ================= 🌌 照片星河 ================= */
  const galaxy = (function () {
    const view = $("#galaxyView"), canvas = $("#galaxyCanvas");
    let renderer, scene, camera, group, photoSprites = [];
    let raf = null, built = false, isOpen = false;
    // 球面相机参数
    let radius = 70, theta = 0, phi = 1.05, autoSpin = 0.0012;
    let hovered = null;

    function build() {
      built = true;
      renderer = makeRenderer(canvas);
      scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x000006, 0.0016);
      camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1200);
      group = new THREE.Group();
      scene.add(group);

      // 远景星海
      const starCount = 6000;
      const pos = new Float32Array(starCount * 3);
      const col = new Float32Array(starCount * 3);
      const palette = [new THREE.Color(0xffe9ad), new THREE.Color(0xffb3e6), new THREE.Color(0xb9c8ff), new THREE.Color(0xaef3ff)];
      for (let i = 0; i < starCount; i++) {
        const r = rand(120, 500);
        const a = rand(0, Math.PI * 2), b = Math.acos(rand(-1, 1));
        pos[i * 3] = r * Math.sin(b) * Math.cos(a);
        pos[i * 3 + 1] = r * Math.cos(b) * 0.6;
        pos[i * 3 + 2] = r * Math.sin(b) * Math.sin(a);
        const c = pick(palette);
        col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      }
      const starGeo = new THREE.BufferGeometry();
      starGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      starGeo.setAttribute("color", new THREE.BufferAttribute(col, 3));
      scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({
        size: 1.6, vertexColors: true, transparent: true, opacity: 0.85, sizeAttenuation: true
      })));

      // 银河中心：光核 + 大字
      const coreGlow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTexture("rgba(255, 220, 160, .9)"),
        blending: THREE.AdditiveBlending, depthWrite: false
      }));
      coreGlow.scale.set(26, 26, 1);
      group.add(coreGlow);

      const title = textTexture("遇见幸福", { size: 110 });
      const titleSprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: title.tex, transparent: true, depthWrite: false
      }));
      titleSprite.scale.set(16 * title.aspect, 16, 1);
      group.add(titleSprite);

      // 照片星体：沿三条旋臂分布
      const shots = ALL.length
        ? [...ALL].sort(() => Math.random() - 0.5).slice(0, 260)
        : Array.from({ length: 48 }, (_, i) => ({ placeholder: i }));
      const glowGold = glowTexture("rgba(255, 215, 130, .55)");
      const glowPink = glowTexture("rgba(255, 130, 220, .45)");

      shots.forEach((shot, i) => {
        const t = (i + 1) / shots.length;
        const arm = i % 3;
        const r = 10 + t * 75 + rand(-3, 3);
        const ang = t * Math.PI * 4.2 + arm * (Math.PI * 2 / 3) + rand(-0.16, 0.16);
        const x = Math.cos(ang) * r;
        const z = Math.sin(ang) * r;
        const y = rand(-1, 1) * 4.5 * (1 - t * 0.55);

        const holder = new THREE.Group();
        holder.position.set(x, y, z);

        // 照片后面垫一圈光晕
        const halo = new THREE.Sprite(new THREE.SpriteMaterial({
          map: i % 2 ? glowGold : glowPink,
          blending: THREE.AdditiveBlending, depthWrite: false
        }));
        halo.scale.set(7.5, 7.5, 1);
        holder.add(halo);

        const mat = new THREE.SpriteMaterial({ transparent: true, depthWrite: false });
        const sprite = new THREE.Sprite(mat);
        const base = rand(3.2, 4.6);
        sprite.userData = { shot, base, aspect: 1 };
        sprite.scale.set(base, base, 1);
        holder.add(sprite);
        photoSprites.push(sprite);

        if (shot.placeholder !== undefined) {
          mat.map = placeholderTexture(i);
          mat.needsUpdate = true;
        } else {
          loadPhotoTexture(shot.src, (tex, aspect) => {
            if (!tex) { mat.map = placeholderTexture(i); }
            else {
              mat.map = tex;
              sprite.userData.aspect = aspect;
              sprite.scale.set(base * Math.min(aspect, 1.6), base, 1);
            }
            mat.needsUpdate = true;
          });
        }
        group.add(holder);
      });

      // 交互：拖动 / 滚轮 / 双指 / 点击
      let dragging = false, lx = 0, ly = 0, moved = 0, pinchD = 0;

      canvas.addEventListener("pointerdown", (e) => {
        dragging = true; moved = 0; lx = e.clientX; ly = e.clientY;
        canvas.setPointerCapture(e.pointerId);
      });
      canvas.addEventListener("pointermove", (e) => {
        if (dragging) {
          const dx = e.clientX - lx, dy = e.clientY - ly;
          moved += Math.abs(dx) + Math.abs(dy);
          theta -= dx * 0.0042;
          phi = Math.max(0.25, Math.min(1.5, phi - dy * 0.003));
          lx = e.clientX; ly = e.clientY;
        }
        raycastHover(e);
      });
      canvas.addEventListener("pointerup", (e) => {
        dragging = false;
        if (moved < 6) raycastClick(e);
      });
      canvas.addEventListener("wheel", (e) => {
        e.preventDefault();
        radius = Math.max(14, Math.min(160, radius * (1 + e.deltaY * 0.001)));
      }, { passive: false });
      canvas.addEventListener("touchmove", (e) => {
        if (e.touches.length === 2) {
          const d = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY);
          if (pinchD) radius = Math.max(14, Math.min(160, radius * (pinchD / d)));
          pinchD = d;
        }
      }, { passive: true });
      canvas.addEventListener("touchend", () => { pinchD = 0; });

      const ray = new THREE.Raycaster();
      const ndc = new THREE.Vector2();
      function castAt(e) {
        ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
        ray.setFromCamera(ndc, camera);
        return ray.intersectObjects(photoSprites)[0];
      }
      function raycastHover(e) {
        const hit = castAt(e);
        const next = hit ? hit.object : null;
        if (hovered && hovered !== next) {
          const u = hovered.userData;
          hovered.scale.set(u.base * Math.min(u.aspect, 1.6), u.base, 1);
        }
        if (next) {
          const u = next.userData;
          next.scale.set(u.base * 1.45 * Math.min(u.aspect, 1.6), u.base * 1.45, 1);
        }
        hovered = next;
      }
      function raycastClick(e) {
        const hit = castAt(e);
        if (hit && hit.object.userData.shot.src) {
          showZoom(hit.object.userData.shot.src, hit.object.userData.shot.name);
        }
      }

      addEventListener("resize", () => {
        if (!isOpen) return;
        camera.aspect = innerWidth / innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(innerWidth, innerHeight);
      });
    }

    function frame() {
      theta += autoSpin;
      group.rotation.y += 0.0006;
      camera.position.set(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta)
      );
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
      raf = requestAnimationFrame(frame);
    }

    function enter() {
      try { if (!built) build(); }
      catch (err) { console.error(err); alert("当前设备不支持 3D 效果"); return; }
      if (IS_FILE && ALL.length) warnFileProto();
      isOpen = true;
      view.classList.add("open");
      document.body.style.overflow = "hidden";
      renderer.setSize(innerWidth, innerHeight);
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
      frame();
    }
    function exit() {
      isOpen = false;
      view.classList.remove("open");
      document.body.style.overflow = "";
      cancelAnimationFrame(raf);
    }

    $("#dockGalaxy").addEventListener("click", enter);
    $("#galaxyExit").addEventListener("click", exit);
    return { exit, isOpen: () => isOpen };
  })();

  /* ================= 🏛️ 虚拟美术馆 ================= */
  const museum = (function () {
    const view = $("#museumView"), canvas = $("#museumCanvas");
    let renderer, scene, camera, raf = null, built = false, isOpen = false;
    const photoMeshes = [];
    // 第一人称状态
    const pos = new THREE.Vector3(0, 2.1, 8);
    let yaw = 0, pitch = 0;                 // yaw=0 时面向 -z 展厅深处
    const keys = {};
    let walkFwd = false, walkBack = false;
    let hallEnd = -40;
    const HALL_W = 14, EYE = 2.1;

    function build() {
      built = true;
      renderer = makeRenderer(canvas);
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x08070f);

      camera = new THREE.PerspectiveCamera(66, innerWidth / innerHeight, 0.1, 300);

      // 展品清单（无照片时挂 16 幅占位画）
      const shots = ALL.length
        ? [...ALL].slice(0, 160)
        : Array.from({ length: 16 }, (_, i) => ({ placeholder: i, name: "等待照片中…" }));

      const SPACING = 4.2;
      const perSide = Math.ceil(shots.length / 2);
      hallEnd = -(perSide * SPACING + 10);
      const hallLen = 12 - hallEnd;
      scene.fog = new THREE.Fog(0x08070f, 10, hallLen + 30);

      // 地面 / 天花 / 墙体
      const floorMat = new THREE.MeshStandardMaterial({ color: 0x15131f, roughness: 0.3, metalness: 0.55 });
      const wallMat = new THREE.MeshLambertMaterial({ color: 0x1d1a2c });
      const ceilMat = new THREE.MeshLambertMaterial({ color: 0x0d0b16 });

      const floor = new THREE.Mesh(new THREE.PlaneGeometry(HALL_W, hallLen), floorMat);
      floor.rotation.x = -Math.PI / 2;
      floor.position.set(0, 0, (12 + hallEnd) / 2);
      scene.add(floor);

      // 中间一条金色地毯
      const carpet = new THREE.Mesh(
        new THREE.PlaneGeometry(2.4, hallLen - 4),
        new THREE.MeshStandardMaterial({ color: 0x6b4a16, roughness: 0.85 })
      );
      carpet.rotation.x = -Math.PI / 2;
      carpet.position.set(0, 0.01, (12 + hallEnd) / 2);
      scene.add(carpet);

      const ceil = new THREE.Mesh(new THREE.PlaneGeometry(HALL_W, hallLen), ceilMat);
      ceil.rotation.x = Math.PI / 2;
      ceil.position.set(0, 6.5, (12 + hallEnd) / 2);
      scene.add(ceil);

      [-1, 1].forEach((side) => {
        const wall = new THREE.Mesh(new THREE.PlaneGeometry(hallLen, 6.5), wallMat);
        wall.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
        wall.position.set(side * HALL_W / 2, 3.25, (12 + hallEnd) / 2);
        scene.add(wall);
      });
      [[12, 0], [hallEnd, Math.PI]].forEach(([z, ry]) => {
        const wall = new THREE.Mesh(new THREE.PlaneGeometry(HALL_W, 6.5), wallMat.clone());
        wall.rotation.y = ry + Math.PI;
        wall.position.set(0, 3.25, z);
        scene.add(wall);
      });

      // 尽头墙上的金字
      const endTitle = textTexture("遇见幸福 · 时光美术馆", { size: 80 });
      const endPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(7 * endTitle.aspect / 4, 7 / 4),
        new THREE.MeshBasicMaterial({ map: endTitle.tex, transparent: true })
      );
      endPlane.position.set(0, 3.4, hallEnd + 0.1);
      scene.add(endPlane);

      // 灯光：暖色顶灯一路排过去
      scene.add(new THREE.AmbientLight(0xfff4e0, 0.5));
      const lightCount = Math.min(10, Math.ceil(hallLen / 16));
      for (let i = 0; i < lightCount; i++) {
        const z = 8 - (i + 0.5) * (hallLen / lightCount);
        const pl = new THREE.PointLight(0xffd9a0, 0.85, 26);
        pl.position.set(0, 5.8, z);
        scene.add(pl);
        // 顶灯的发光灯片
        const lamp = new THREE.Mesh(
          new THREE.CircleGeometry(0.5, 24),
          new THREE.MeshBasicMaterial({ color: 0xffe9c0 })
        );
        lamp.rotation.x = Math.PI / 2;
        lamp.position.set(0, 6.48, z);
        scene.add(lamp);
      }

      // 金框 + 照片 + 名牌
      const frameMat = new THREE.MeshStandardMaterial({ color: 0xc9a227, roughness: 0.35, metalness: 0.85 });
      const frameGeo = new THREE.BoxGeometry(3.1, 2.4, 0.14);
      const photoGeo = new THREE.PlaneGeometry(2.78, 2.08);

      shots.forEach((shot, i) => {
        const side = i % 2 === 0 ? -1 : 1;          // 左右墙交替
        const slot = Math.floor(i / 2);
        const z = 4 - slot * SPACING;
        const x = side * (HALL_W / 2 - 0.18);

        const g = new THREE.Group();
        g.position.set(x, 2.7, z);
        g.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;

        g.add(new THREE.Mesh(frameGeo, frameMat));

        const mat = new THREE.MeshBasicMaterial();
        const photo = new THREE.Mesh(photoGeo, mat);
        photo.position.z = 0.08;
        photo.userData = { shot };
        g.add(photo);
        photoMeshes.push(photo);

        if (shot.placeholder !== undefined) {
          mat.map = placeholderTexture(i);
          mat.needsUpdate = true;
        } else {
          loadPhotoTexture(shot.src, (tex, aspect) => {
            if (!tex) { mat.map = placeholderTexture(i); mat.needsUpdate = true; return; }
            // 居中裁切铺满画框
            const frameAspect = 2.78 / 2.08;
            tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
            if (aspect > frameAspect) {
              tex.repeat.set(frameAspect / aspect, 1);
              tex.offset.set((1 - frameAspect / aspect) / 2, 0);
            } else {
              tex.repeat.set(1, aspect / frameAspect);
              tex.offset.set(0, (1 - aspect / frameAspect) / 2);
            }
            mat.map = tex;
            mat.needsUpdate = true;
          });
        }

        // 画作下的金色名牌
        const label = textTexture(shot.name || "", { size: 42, color: "#1a1408", bg: "#d9b95c", pad: 22 });
        const plate = new THREE.Mesh(
          new THREE.PlaneGeometry(Math.min(2.4, 0.45 * label.aspect), 0.45),
          new THREE.MeshBasicMaterial({ map: label.tex })
        );
        plate.position.set(0, -1.62, 0.08);
        g.add(plate);

        scene.add(g);
      });

      // 交互：拖动环顾 + 点击欣赏
      let dragging = false, lx = 0, ly = 0, moved = 0;
      canvas.addEventListener("pointerdown", (e) => {
        dragging = true; moved = 0; lx = e.clientX; ly = e.clientY;
        canvas.setPointerCapture(e.pointerId);
      });
      canvas.addEventListener("pointermove", (e) => {
        if (!dragging) return;
        const dx = e.clientX - lx, dy = e.clientY - ly;
        moved += Math.abs(dx) + Math.abs(dy);
        yaw -= dx * 0.0036;
        pitch = Math.max(-0.6, Math.min(0.6, pitch - dy * 0.0028));
        lx = e.clientX; ly = e.clientY;
      });
      canvas.addEventListener("pointerup", (e) => {
        dragging = false;
        if (moved < 6) {
          const ndc = new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
          const ray = new THREE.Raycaster();
          ray.setFromCamera(ndc, camera);
          const hit = ray.intersectObjects(photoMeshes)[0];
          if (hit && hit.object.userData.shot.src) {
            showZoom(hit.object.userData.shot.src, hit.object.userData.shot.name);
          }
        }
      });

      addEventListener("keydown", (e) => { keys[e.key.toLowerCase()] = true; });
      addEventListener("keyup", (e) => { keys[e.key.toLowerCase()] = false; });
      const fwdBtn = $("#walkFwd"), backBtn = $("#walkBack");
      fwdBtn.addEventListener("pointerdown", () => { walkFwd = true; });
      backBtn.addEventListener("pointerdown", () => { walkBack = true; });
      ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => {
        fwdBtn.addEventListener(ev, () => { walkFwd = false; });
        backBtn.addEventListener(ev, () => { walkBack = false; });
      });

      addEventListener("resize", () => {
        if (!isOpen) return;
        camera.aspect = innerWidth / innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(innerWidth, innerHeight);
      });
    }

    let bob = 0;
    function frame() {
      const fwd = (keys.w || keys.arrowup || walkFwd ? 1 : 0) - (keys.s || keys.arrowdown || walkBack ? 1 : 0);
      const strafe = (keys.d ? 1 : 0) - (keys.a ? 1 : 0);
      const speed = 0.14;
      if (fwd || strafe) {
        // 相机朝向 (-sin yaw, -cos yaw)，右手方向 (cos yaw, -sin yaw)
        pos.x += (-Math.sin(yaw) * fwd + Math.cos(yaw) * strafe) * speed;
        pos.z += (-Math.cos(yaw) * fwd - Math.sin(yaw) * strafe) * speed;
        bob += 0.12;
      }
      pos.x = Math.max(-HALL_W / 2 + 1.2, Math.min(HALL_W / 2 - 1.2, pos.x));
      pos.z = Math.max(hallEnd + 2.5, Math.min(10, pos.z));

      camera.position.set(pos.x, EYE + Math.sin(bob) * 0.05, pos.z);
      camera.rotation.order = "YXZ";
      camera.rotation.y = yaw;
      camera.rotation.x = pitch;

      renderer.render(scene, camera);
      raf = requestAnimationFrame(frame);
    }

    function enter() {
      try { if (!built) build(); }
      catch (err) { console.error(err); alert("当前设备不支持 3D 效果"); return; }
      if (IS_FILE && ALL.length) warnFileProto();
      isOpen = true;
      view.classList.add("open");
      document.body.style.overflow = "hidden";
      renderer.setSize(innerWidth, innerHeight);
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
      frame();
    }
    function exit() {
      isOpen = false;
      view.classList.remove("open");
      document.body.style.overflow = "";
      cancelAnimationFrame(raf);
    }

    $("#dockMuseum").addEventListener("click", enter);
    $("#museumExit").addEventListener("click", exit);
    return { exit, isOpen: () => isOpen };
  })();

  /* ================= ESC 退出 ================= */
  addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (zoom.classList.contains("open")) zoom.classList.remove("open");
    else if (galaxy.isOpen()) galaxy.exit();
    else if (museum.isOpen()) museum.exit();
  });

})();
