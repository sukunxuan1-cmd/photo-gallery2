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
     配置了 js/cloud-config.js（Supabase）时全员共享、每 12 秒同步他人新弹幕；
     未配置则保存在本人浏览器（localStorage）。
     由 main.js / scene3d.js 派发 photoshow / photohide 事件驱动。 */
  (function photoDanmaku() {
    const KEY = "tg_dm_photo";
    const CFG = window.CLOUD_DANMAKU || {};
    const cloudOn = !!(CFG.url && CFG.anonKey);

    /* —— 本地存储（未配置云端时的兜底） —— */
    function loadLocal() {
      try {
        const o = JSON.parse(localStorage.getItem(KEY));
        return o && typeof o === "object" && !Array.isArray(o) ? o : {};
      } catch { return {}; }
    }
    const store = loadLocal();
    function saveLocal() {
      try { localStorage.setItem(KEY, JSON.stringify(store)); } catch {}
    }

    /* —— 云端（Supabase REST，免 SDK） —— */
    const API = cloudOn ? CFG.url.replace(/\/+$/, "") + "/rest/v1/danmaku" : "";
    const HEADERS = cloudOn ? {
      apikey: CFG.anonKey,
      Authorization: "Bearer " + CFG.anonKey,
      "Content-Type": "application/json"
    } : null;

    async function cloudList(key) {
      const res = await fetch(
        `${API}?photo=eq.${encodeURIComponent(key)}&select=msg&order=created_at.asc&limit=200`,
        { headers: HEADERS });
      if (!res.ok) throw new Error("cloud " + res.status);
      return (await res.json()).map((r) => r.msg);
    }
    function cloudSend(key, msg) {
      return fetch(API, {
        method: "POST",
        headers: { ...HEADERS, Prefer: "return=minimal" },
        body: JSON.stringify({ photo: key, msg })
      });
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

    // 从云端拉取当前照片的弹幕（照片已切换则丢弃结果）
    async function refresh(ctx, announce) {
      const key = ctx.key;
      if (!cloudOn || !key) return;
      try {
        const msgs = await cloudList(key);
        if (ctx.key !== key) return;
        ctx.msgs = msgs;
        if (announce && msgs.length) spawnIn(ctx, msgs[0]);
      } catch (e) { /* 网络波动时沿用现有列表 */ }
    }

    function show(name, key) {
      const ctx = ctxs[name];
      if (!ctx) return;
      hide(name);
      ctx.key = key;
      ctx.idx = 0;
      ctx.msgs = (store[key] || []).slice();
      if (cloudOn) {
        refresh(ctx, true);                                  // 进来先拉一次
        ctx.poll = setInterval(() => refresh(ctx, false), 12000); // 同步他人新弹幕
      } else if (ctx.msgs.length) {
        spawnIn(ctx, ctx.msgs[0]);
      }
      ctx.timer = setInterval(() => {
        if (!ctx.msgs.length) return;
        ctx.idx = (ctx.idx + 1) % ctx.msgs.length;
        spawnIn(ctx, ctx.msgs[ctx.idx]);
      }, 3200);
    }

    function hide(name) {
      const ctx = ctxs[name];
      if (!ctx) return;
      clearInterval(ctx.timer);
      clearInterval(ctx.poll);
      ctx.timer = ctx.poll = null;
      ctx.key = null;
      ctx.msgs = [];
      ctx.layer.innerHTML = "";
    }

    function register(name, ids) {
      const ctx = ctxs[name] = {
        layer: $(ids.layer), input: $(ids.input), on: $(ids.on),
        key: null, timer: null, poll: null, idx: 0, msgs: []
      };
      if (!ctx.layer || !ctx.input) return;
      function send() {
        const text = ctx.input.value.trim();
        if (!text || !ctx.key) return;
        ctx.msgs.push(text);
        if (cloudOn) {
          cloudSend(ctx.key, text).catch(() => {});
        } else {
          (store[ctx.key] = store[ctx.key] || []).push(text);
          if (store[ctx.key].length > 200) store[ctx.key] = store[ctx.key].slice(-200);
          saveLocal();
        }
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

  /* ================= ❤️ 照片点赞 + 🏆 人气殿堂 =================
     点赞与弹幕共用 js/cloud-config.js 的 Supabase 配置：
     配置后全员共享点赞数（只能通过 like_photo 函数 +1，无法篡改）；
     未配置则记录在本人浏览器。每张照片每个浏览器只能赞一次。 */
  const ranking = (function likesAndRanking() {
    const CFG = window.CLOUD_DANMAKU || {};
    const cloudOn = !!(CFG.url && CFG.anonKey);
    const REST = cloudOn ? CFG.url.replace(/\/+$/, "") + "/rest/v1" : "";
    const HEADERS = cloudOn ? {
      apikey: CFG.anonKey,
      Authorization: "Bearer " + CFG.anonKey,
      "Content-Type": "application/json"
    } : null;

    /* —— 本地兜底存储 —— */
    function loadObj(key) {
      try {
        const o = JSON.parse(localStorage.getItem(key));
        return o && typeof o === "object" && !Array.isArray(o) ? o : {};
      } catch { return {}; }
    }
    const localCounts = loadObj("tg_likes");   // 未配置云端时的票数
    const likedFlags = loadObj("tg_liked");    // 本浏览器赞过哪些照片
    const saveObj = (key, o) => { try { localStorage.setItem(key, JSON.stringify(o)); } catch {} };

    /* —— 数据访问 —— */
    async function getCount(key) {
      if (cloudOn) {
        const res = await fetch(`${REST}/likes?photo=eq.${encodeURIComponent(key)}&select=count`, { headers: HEADERS });
        if (!res.ok) throw new Error("likes " + res.status);
        const rows = await res.json();
        return rows.length ? rows[0].count : 0;
      }
      return localCounts[key] || 0;
    }
    async function addLike(key) {
      if (cloudOn) {
        const res = await fetch(`${REST}/rpc/like_photo`, {
          method: "POST", headers: HEADERS, body: JSON.stringify({ p: key })
        });
        if (!res.ok) throw new Error("like " + res.status);
        return await res.json(); // 函数返回最新票数
      }
      localCounts[key] = (localCounts[key] || 0) + 1;
      saveObj("tg_likes", localCounts);
      return localCounts[key];
    }
    async function topList() {
      let rows = [];
      if (cloudOn) {
        try {
          const res = await fetch(`${REST}/likes?select=photo,count&order=count.desc&limit=40`, { headers: HEADERS });
          if (res.ok) rows = await res.json();
        } catch { /* 网络问题时给空榜 */ }
      } else {
        rows = Object.entries(localCounts).map(([photo, count]) => ({ photo, count }));
        rows.sort((a, b) => b.count - a.count);
      }
      const known = new Map(ALL.map((s) => [s.src, s.name]));
      return rows
        .filter((r) => r.count > 0 && known.has(r.photo))
        .slice(0, 10)
        .map((r) => ({ src: r.photo, name: known.get(r.photo), count: r.count }));
    }

    /* —— 点赞按钮（灯箱 + 3D 放大层共用逻辑） —— */
    const btns = {
      lightbox: { btn: $("#lbLikeBtn"), num: $("#lbLikeCount"), key: null },
      s3: { btn: $("#s3LikeBtn"), num: $("#s3LikeCount"), key: null }
    };

    function heartsFly(btn) {
      const r = btn.getBoundingClientRect();
      for (let i = 0; i < 10; i++) {
        const h = document.createElement("span");
        h.className = "heart-fly";
        h.textContent = pick(["❤", "💛", "🧡", "💖", "✨"]);
        h.style.left = r.left + r.width / 2 + rand(-8, 8) + "px";
        h.style.top = r.top + "px";
        h.style.setProperty("--dx", rand(-50, 50) + "px");
        h.style.setProperty("--rot", rand(-40, 40) + "deg");
        h.style.animationDelay = i * 55 + "ms";
        document.body.appendChild(h);
        setTimeout(() => h.remove(), 1400 + i * 55);
      }
    }

    function setBtn(ctx, count) {
      ctx.num.textContent = count;
      ctx.btn.classList.toggle("liked", !!likedFlags[ctx.key]);
    }

    Object.entries(btns).forEach(([name, ctx]) => {
      if (!ctx.btn) return;
      ctx.btn.addEventListener("click", async () => {
        if (!ctx.key) return;
        if (likedFlags[ctx.key]) {
          // 已赞过：心跳一下提醒
          ctx.btn.classList.remove("liked");
          void ctx.btn.offsetWidth;
          ctx.btn.classList.add("liked");
          return;
        }
        const key = ctx.key;
        likedFlags[key] = 1;
        saveObj("tg_liked", likedFlags);
        heartsFly(ctx.btn);
        ctx.num.textContent = String((parseInt(ctx.num.textContent, 10) || 0) + 1); // 先乐观 +1
        ctx.btn.classList.add("liked");
        try {
          const real = await addLike(key);
          if (ctx.key === key) ctx.num.textContent = real;
        } catch { /* 网络失败时保留乐观值，本地标记已存 */ }
      });
    });

    addEventListener("photoshow", async (e) => {
      const ctx = btns[e.detail.context];
      if (!ctx || !ctx.btn) return;
      ctx.key = e.detail.src;
      setBtn(ctx, "…");
      try {
        const n = await getCount(ctx.key);
        if (ctx.key === e.detail.src) setBtn(ctx, n);
      } catch { setBtn(ctx, 0); }
    });
    addEventListener("photohide", (e) => {
      const ctx = btns[e.detail.context];
      if (ctx) ctx.key = null;
    });

    /* —— 人气殿堂：倒序揭榜 —— */
    const view = $("#rankView"), podium = $("#rankPodium"), rest = $("#rankRest"), empty = $("#rankEmpty");
    let isOpen = false, revealTimers = [];

    function makeCard(item, rank) {
      const card = document.createElement("div");
      card.className = "rank-card" + (rank <= 3 ? ` r${rank}` : "");
      const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : rank;
      card.innerHTML = `
        ${rank === 1 ? '<div class="rc-crown" style="display:none">👑</div>' : ""}
        <div class="rc-rank">${medal}</div>
        <div class="rc-frame">
          <div class="rc-photo" style="background-image:url('${encodeURI(item.src)}')"></div>
          <div class="rc-info">
            <div class="rc-name">${item.name}</div>
            <div class="rc-likes">❤ <span>0</span></div>
          </div>
        </div>`;
      card.addEventListener("click", () => openZoom(item.src, item.name));
      return card;
    }

    function countUpTo(el, target) {
      const t0 = performance.now(), dur = 900;
      (function step(t) {
        const k = Math.min(1, (t - t0) / dur);
        el.textContent = Math.round(target * (1 - Math.pow(1 - k, 3)));
        if (k < 1) requestAnimationFrame(step);
      })(t0);
    }

    function openZoom(src, name) {
      const zoom = $("#s3Zoom");
      $("#s3ZoomImg").src = encodeURI(src);
      $("#s3ZoomName").textContent = name;
      zoom.classList.add("open");
      dispatchEvent(new CustomEvent("photoshow", { detail: { context: "s3", src } }));
    }
    // three.js 加载失败时由这里兜底处理放大层的关闭
    if (!window.THREE) {
      $("#s3Zoom").addEventListener("click", (e) => {
        if (e.target.closest(".pdm-bar")) return;
        $("#s3Zoom").classList.remove("open");
        dispatchEvent(new CustomEvent("photohide", { detail: { context: "s3" } }));
      });
    }

    async function open() {
      isOpen = true;
      view.classList.add("open");
      document.body.style.overflow = "hidden";
      podium.innerHTML = "";
      rest.innerHTML = "";
      empty.classList.remove("show");

      const list = await topList();
      if (!isOpen) return;
      if (!list.length) { empty.classList.add("show"); return; }

      // 第 1/2/3 名站领奖台（视觉顺序：2、1、3），4~10 名在下方
      const cards = list.map((item, i) => makeCard(item, i + 1));
      if (cards[1]) podium.appendChild(cards[1]);
      podium.appendChild(cards[0]);
      if (cards[2]) podium.appendChild(cards[2]);
      cards.slice(3).forEach((c) => rest.appendChild(c));

      // 倒序揭榜：第 10 名先亮，一路揭到冠军
      for (let i = list.length - 1; i >= 0; i--) {
        const delay = (list.length - 1 - i) * 360 + 250;
        revealTimers.push(setTimeout(() => {
          const card = cards[i];
          card.classList.add("in");
          countUpTo(card.querySelector(".rc-likes span"), list[i].count);
          if (i === 0) {
            // 冠军登场：皇冠落下 + 金粉爆发
            const crown = card.querySelector(".rc-crown");
            if (crown) crown.style.display = "";
            const r = card.getBoundingClientRect();
            fx.burst(r.left + r.width / 2, r.top + r.height / 2, { hue: 46, count: 160, speed: 8.5 });
            fx.burst(r.left + r.width / 2, r.top + r.height / 3, { hue: 320, count: 80, speed: 5.5 });
          }
        }, delay));
      }
    }

    function close() {
      isOpen = false;
      view.classList.remove("open");
      document.body.style.overflow = "";
      revealTimers.forEach(clearTimeout);
      revealTimers = [];
    }

    $("#dockRank").addEventListener("click", open);
    $("#rankExit").addEventListener("click", close);
    return { close, isOpen: () => isOpen };
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
    else if (ranking.isOpen()) ranking.close();
    else if (tvwall.isOpen()) tvwall.exit();
  });

})();
