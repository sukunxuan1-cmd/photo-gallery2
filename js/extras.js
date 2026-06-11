/* ============ 时光画廊 · 惊喜功能 ============
   电视墙模式 / 照片盲盒 / 烟花庆祝 / 照片汇聚成字 / 照片专属弹幕 */
(function () {
  "use strict";

  const DATA = (window.GALLERY_DATA && window.GALLERY_DATA.categories) || [];
  const $ = (s) => document.querySelector(s);
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  // 全部照片池
  const ALL = [];
  DATA.forEach((c) => c.photos.forEach((src) => ALL.push({ src, name: c.name })));

  const GRADS = [
    "135deg, #2b1a55, #6b2d5c", "135deg, #1a2d55, #2d6b5c", "135deg, #552b1a, #5c2d6b",
    "135deg, #1a4055, #4a2d6b", "135deg, #402b1a, #6b5c2d", "135deg, #2d1a55, #2d5c6b"
  ];
  const EMOJIS = ["📸", "🎉", "💛", "✨", "🌟", "🎈", "🏆", "🤝", "☕", "🧧"];

  /* ================= 粒子特效引擎（烟花 + 盲盒爆裂共用） ================= */
  const fx = (function () {
    const canvas = $("#fxCanvas");
    const ctx = canvas.getContext("2d");
    let W, H;
    const parts = [];

    function resize() { W = canvas.width = innerWidth; H = canvas.height = innerHeight; }
    addEventListener("resize", resize);
    resize();

    (function tick() {
      ctx.clearRect(0, 0, W, H);
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        if (p.rocket) {
          p.x += p.vx; p.y += p.vy; p.vy += 0.08;
          // 上升的尾焰
          ctx.globalAlpha = 0.9;
          ctx.fillStyle = "#ffe9ad";
          ctx.beginPath(); ctx.arc(p.x, p.y, 2.2, 0, 7); ctx.fill();
          ctx.globalAlpha = 0.3;
          ctx.beginPath(); ctx.arc(p.x - p.vx * 2, p.y - p.vy * 2, 1.4, 0, 7); ctx.fill();
          if (p.vy >= -1 || p.y <= p.targetY) {
            parts.splice(i, 1);
            burst(p.x, p.y, { hue: p.hue });
          }
          continue;
        }
        p.vx *= p.drag; p.vy = p.vy * p.drag + p.g;
        p.x += p.vx; p.y += p.vy;
        p.life -= p.decay;
        if (p.life <= 0) { parts.splice(i, 1); continue; }
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
      }
      ctx.globalAlpha = 1;
      requestAnimationFrame(tick);
    })();

    function burst(x, y, opts = {}) {
      const n = opts.count || 110;
      const hue = opts.hue ?? rand(0, 360);
      const speed = opts.speed || 7.5;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = rand(0.8, speed);
        parts.push({
          x, y,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          g: opts.gravity ?? 0.055, drag: 0.985,
          r: rand(1, 2.6), life: 1, decay: rand(0.008, 0.022),
          color: `hsl(${hue + rand(-22, 22)}, 100%, ${rand(55, 78)}%)`
        });
      }
    }

    function rocket(x, targetY, hue) {
      parts.push({
        rocket: true,
        x, y: H + 8,
        vx: rand(-0.7, 0.7), vy: -rand(10, 13.5),
        targetY: targetY ?? rand(H * 0.14, H * 0.45),
        hue: hue ?? rand(0, 360)
      });
    }

    return { burst, rocket };
  })();

  /* ================= 🎆 烟花庆祝 ================= */
  (function fireworks() {
    const btn = $("#dockFire");
    let on = false, timer = null;

    function launch(e) {
      // 点在面板/按钮上的不放烟花，避免误触
      if (e.target.closest(".dock, .pdm-bar, button, input, a, .bbox-card")) return;
      fx.rocket(e.clientX, e.clientY);
    }

    btn.addEventListener("click", () => {
      on = !on;
      btn.classList.toggle("active", on);
      if (on) {
        // 开场来一组三连发
        [0.3, 0.5, 0.7].forEach((p, i) =>
          setTimeout(() => fx.rocket(innerWidth * p + rand(-60, 60)), i * 260));
        timer = setInterval(() => fx.rocket(rand(innerWidth * 0.12, innerWidth * 0.88)), 1700);
        addEventListener("pointerdown", launch);
      } else {
        clearInterval(timer);
        removeEventListener("pointerdown", launch);
      }
    });
  })();

  /* ================= 📺 电视墙模式 ================= */
  const tvwall = (function () {
    const wrap = $("#tvwall"), grid = $("#tvGrid"), spot = $("#tvSpot");
    const spotImg = spot.querySelector("img"), spotName = spot.querySelector(".tv-spot-name");
    let timers = [], tiles = [], isOpen = false;

    function setTile(el, i) {
      if (ALL.length) {
        const s = pick(ALL);
        el.textContent = "";
        el.style.background = "";
        el.style.backgroundImage = `url('${encodeURI(s.src)}')`;
      } else {
        el.style.backgroundImage = "none";
        el.style.background = `linear-gradient(${GRADS[(i + Math.floor(rand(0, 6))) % GRADS.length]})`;
        el.textContent = EMOJIS[Math.floor(rand(0, EMOJIS.length))];
      }
    }

    function build() {
      grid.innerHTML = "";
      tiles = [];
      const cols = innerWidth > 1100 ? 6 : innerWidth > 700 ? 4 : 3;
      const rows = Math.max(3, Math.ceil(innerHeight / (innerWidth / cols)));
      grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
      grid.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
      for (let i = 0; i < cols * rows; i++) {
        const el = document.createElement("div");
        el.className = "tv-tile";
        setTile(el, i);
        grid.appendChild(el);
        tiles.push(el);
      }
    }

    function enter() {
      isOpen = true;
      wrap.classList.add("open");
      document.body.style.overflow = "hidden";
      build();
      document.documentElement.requestFullscreen?.().catch(() => {});

      // 不停地随机换格子里的照片
      timers.push(setInterval(() => {
        const el = pick(tiles);
        el.classList.add("swap");
        setTimeout(() => { setTile(el, 0); el.classList.remove("swap"); }, 340);
      }, 650));

      // 每隔一阵随机放大一张特写
      if (ALL.length) {
        timers.push(setInterval(() => {
          const s = pick(ALL);
          spotImg.src = encodeURI(s.src);
          spotName.textContent = s.name;
          spot.classList.add("show");
          setTimeout(() => spot.classList.remove("show"), 3800);
        }, 9000));
      }
    }

    function exit() {
      isOpen = false;
      wrap.classList.remove("open");
      document.body.style.overflow = "";
      timers.forEach(clearInterval);
      timers = [];
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    }

    $("#dockTv").addEventListener("click", enter);
    $("#tvExit").addEventListener("click", exit);
    addEventListener("resize", () => { if (isOpen) build(); });
    return { exit, isOpen: () => isOpen };
  })();

  /* ================= 🎁 照片盲盒 ================= */
  const bbox = (function () {
    const wrap = $("#bbox"), gift = $("#bboxGift"), card = $("#bboxCard");
    const hint = $("#bboxHint");
    let isOpen = false, drawing = false;

    function open() {
      isOpen = true;
      wrap.classList.add("open");
      document.body.style.overflow = "hidden";
      reset();
    }
    function close() {
      isOpen = false;
      wrap.classList.remove("open");
      document.body.style.overflow = "";
    }
    function reset() {
      card.classList.remove("show");
      gift.classList.remove("hide", "shaking");
      hint.textContent = ALL.length ? "点我，抽一段回忆" : "先把照片放进文件夹，再来抽回忆吧 ✦";
    }

    function draw() {
      if (drawing) return;
      if (!ALL.length) {
        hint.textContent = "盲盒还是空的…放入照片后再来 ✦";
        gift.classList.add("shaking");
        setTimeout(() => gift.classList.remove("shaking"), 600);
        return;
      }
      drawing = true;
      card.classList.remove("show");
      gift.classList.remove("hide");
      gift.classList.add("shaking");

      setTimeout(() => {
        const r = gift.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        fx.burst(cx, cy, { hue: 46, count: 170, speed: 9.5, gravity: 0.06 });
        fx.burst(cx, cy, { hue: 320, count: 90, speed: 6 });
        gift.classList.remove("shaking");
        gift.classList.add("hide");

        const s = pick(ALL);
        $("#bboxImg").src = encodeURI(s.src);
        $("#bboxName").textContent = s.name;
        setTimeout(() => { card.classList.add("show"); drawing = false; }, 280);
      }, 950);
    }

    gift.addEventListener("click", draw);
    $("#bboxAgain").addEventListener("click", draw);
    $("#bboxKeep").addEventListener("click", close);
    $("#bboxClose").addEventListener("click", close);
    $("#bboxBg").addEventListener("click", close);
    $("#dockBox").addEventListener("click", open);
    return { close, isOpen: () => isOpen };
  })();

  /* ================= 💬 照片专属弹幕 =================
     每张照片有自己的弹幕：在灯箱 / 3D 放大层里查看照片时，
     这张照片收到过的弹幕循环飘过，新弹幕只属于当前照片。
     由 main.js / scene3d.js 派发 photoshow / photohide 事件驱动。 */
  (function photoDanmaku() {
    const KEY = "tg_dm_photo";
    function load() {
      try {
        const o = JSON.parse(localStorage.getItem(KEY));
        return o && typeof o === "object" && !Array.isArray(o) ? o : {};
      } catch { return {}; }
    }
    const store = load();
    function save() {
      try { localStorage.setItem(KEY, JSON.stringify(store)); } catch {}
    }

    const ctxs = {}; // 展示场景：lightbox（灯箱）、s3（3D 放大层）

    function spawnIn(ctx, text, vip) {
      if (!ctx.on.checked && !vip) return;
      const el = document.createElement("div");
      el.className = `dm-item c${Math.floor(rand(0, 5))}${vip ? " vip" : ""}`;
      el.textContent = text;
      el.style.top = rand(8, 72) + "%";
      ctx.layer.appendChild(el);
      const w = el.offsetWidth;
      const lw = ctx.layer.clientWidth || innerWidth;
      el.animate(
        [{ transform: `translateX(${lw + 30}px)` },
         { transform: `translateX(${-w - 60}px)` }],
        { duration: rand(7000, 11000), easing: "linear" }
      ).onfinish = () => el.remove();
    }

    function show(name, key) {
      const ctx = ctxs[name];
      if (!ctx) return;
      hide(name);
      ctx.key = key;
      ctx.idx = 0;
      const msgs = store[key] || [];
      if (msgs.length) spawnIn(ctx, msgs[0]);
      ctx.timer = setInterval(() => {
        const list = store[ctx.key] || [];
        if (!list.length) return;
        ctx.idx = (ctx.idx + 1) % list.length;
        spawnIn(ctx, list[ctx.idx]);
      }, 3200);
    }

    function hide(name) {
      const ctx = ctxs[name];
      if (!ctx) return;
      clearInterval(ctx.timer);
      ctx.timer = null;
      ctx.key = null;
      ctx.layer.innerHTML = "";
    }

    function register(name, ids) {
      const ctx = ctxs[name] = {
        layer: $(ids.layer), input: $(ids.input), on: $(ids.on),
        key: null, timer: null, idx: 0
      };
      if (!ctx.layer || !ctx.input) return;
      function send() {
        const text = ctx.input.value.trim();
        if (!text || !ctx.key) return;
        (store[ctx.key] = store[ctx.key] || []).push(text);
        if (store[ctx.key].length > 200) store[ctx.key] = store[ctx.key].slice(-200);
        save();
        ctx.input.value = "";
        spawnIn(ctx, text, true);
      }
      $(ids.send).addEventListener("click", send);
      ctx.input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") send();
        e.stopPropagation(); // 别让方向键/ESC 影响照片切换
      });
      ctx.on.addEventListener("change", () => { if (!ctx.on.checked) ctx.layer.innerHTML = ""; });
    }

    register("lightbox", { layer: "#lbDmLayer", input: "#lbDmInput", send: "#lbDmSend", on: "#lbDmOn" });
    register("s3", { layer: "#s3DmLayer", input: "#s3DmInput", send: "#s3DmSend", on: "#s3DmOn" });

    addEventListener("photoshow", (e) => show(e.detail.context, e.detail.src));
    addEventListener("photohide", (e) => hide(e.detail.context));
  })();

  /* ================= ✨ 照片汇聚成字 ================= */
  const converge = (function () {
    const wrap = $("#converge"), canvas = $("#convergeCanvas");
    const ctx = canvas.getContext("2d");
    let tiles = [], tilesReady = false, playing = false, raf = null;

    // 把照片预渲染成小缩略块，画起来飞快
    function buildTiles(done) {
      if (tilesReady || !ALL.length) { tilesReady = true; done(); return; }
      const srcs = [...ALL].sort(() => Math.random() - 0.5).slice(0, 22);
      let pending = srcs.length, finished = false;
      const finish = () => { if (!finished) { finished = true; tilesReady = true; done(); } };
      setTimeout(finish, 1400); // 最多等 1.4s，加载到几张算几张
      srcs.forEach((s) => {
        const img = new Image();
        img.onload = () => {
          const S = 18;
          const t = document.createElement("canvas");
          t.width = t.height = S;
          const tc = t.getContext("2d");
          const r = Math.max(S / img.width, S / img.height);
          tc.drawImage(img, (S - img.width * r) / 2, (S - img.height * r) / 2, img.width * r, img.height * r);
          tiles.push(t);
          if (--pending <= 0) finish();
        };
        img.onerror = () => { if (--pending <= 0) finish(); };
        img.src = encodeURI(s.src);
      });
    }

    // 把「美森耐」渲染成点阵坐标
    function sampleText(W, H) {
      const off = document.createElement("canvas");
      off.width = W; off.height = H;
      const c = off.getContext("2d");
      const fs = Math.min(W * 0.21, 240);
      c.font = `900 ${fs}px "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif`;
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillStyle = "#fff";
      c.fillText("美森耐", W / 2, H / 2);
      const d = c.getImageData(0, 0, W, H).data;
      let step = 5, pts;
      do {
        pts = [];
        for (let y = 0; y < H; y += step)
          for (let x = 0; x < W; x += step)
            if (d[(y * W + x) * 4 + 3] > 128) pts.push({ x, y });
        step++;
      } while (pts.length > 1500 && step <= 11);
      return { pts, step: step - 1 };
    }

    function edgePoint(W, H) {
      switch (Math.floor(rand(0, 4))) {
        case 0: return { x: -40, y: rand(0, H) };
        case 1: return { x: W + 40, y: rand(0, H) };
        case 2: return { x: rand(0, W), y: -40 };
        default: return { x: rand(0, W), y: H + 40 };
      }
    }

    function play() {
      if (playing) return;
      playing = true;
      wrap.classList.add("show");

      buildTiles(() => {
        const W = canvas.width = innerWidth;
        const H = canvas.height = innerHeight;
        const { pts, step } = sampleText(W, H);
        const HUES = [46, 320, 255, 190];

        const parts = pts.map((pt) => {
          const e = edgePoint(W, H);
          return {
            sx: e.x, sy: e.y, tx: pt.x, ty: pt.y,
            delay: rand(0, 1.1), dur: rand(1.3, 2.1),
            tile: tiles.length ? tiles[Math.floor(rand(0, tiles.length))] : null,
            hue: pick(HUES),
            size: step * (tiles.length ? 1.45 : 0.9),
            boom: false, x: 0, y: 0,
            evx: 0, evy: 0
          };
        });
        parts.forEach((p) => {
          const a = rand(0, Math.PI * 2), sp = rand(2, 8.5);
          p.evx = Math.cos(a) * sp;
          p.evy = Math.sin(a) * sp - 2;
        });

        const EXPLODE = 4.4, END = 6.0;
        const t0 = performance.now();

        function frame(t) {
          const el = (t - t0) / 1000;
          ctx.clearRect(0, 0, W, H);

          for (const p of parts) {
            let x, y, alpha = 1;
            if (el < EXPLODE) {
              const k = Math.min(1, Math.max(0, (el - p.delay) / p.dur));
              if (k === 0) continue;
              const e = 1 - Math.pow(1 - k, 3);
              x = p.sx + (p.tx - p.sx) * e;
              y = p.sy + (p.ty - p.sy) * e;
            } else {
              if (!p.boom) { p.boom = true; p.x = p.tx; p.y = p.ty; }
              p.evy += 0.07;
              p.x += p.evx; p.y += p.evy;
              x = p.x; y = p.y;
              alpha = Math.max(0, 1 - (el - EXPLODE) / 1.3);
            }
            ctx.globalAlpha = alpha;
            if (p.tile) {
              ctx.drawImage(p.tile, x - p.size / 2, y - p.size / 2, p.size, p.size);
            } else {
              ctx.fillStyle = `hsl(${p.hue}, 90%, 70%)`;
              ctx.beginPath(); ctx.arc(x, y, p.size, 0, 7); ctx.fill();
            }
          }
          ctx.globalAlpha = 1;

          if (el < END) raf = requestAnimationFrame(frame);
          else finish();
        }
        raf = requestAnimationFrame(frame);
      });
    }

    function finish() {
      cancelAnimationFrame(raf);
      wrap.classList.remove("show");
      setTimeout(() => { ctx.clearRect(0, 0, canvas.width, canvas.height); playing = false; }, 700);
    }

    wrap.addEventListener("click", finish);
    $("#dockStar").addEventListener("click", play);
    return { play };
  })();

  // 开场：加载动画结束后自动播放一次照片汇聚
  window.whenPageReady(() => setTimeout(converge.play, 2100));

  /* ================= ESC 统一关闭 ================= */
  addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (bbox.isOpen()) bbox.close();
    else if (tvwall.isOpen()) tvwall.exit();
  });

})();
