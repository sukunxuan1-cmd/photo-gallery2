/* ============ 时光画廊 · 核心脚本 ============ */
(function () {
  "use strict";

  const DATA = (window.GALLERY_DATA && window.GALLERY_DATA.categories) || [];
  const $ = (s) => document.querySelector(s);
  const isTouch = matchMedia("(pointer: coarse)").matches;

  /* ---------- 1. 开场加载 ---------- */
  // 脚本由 data-loader 动态加载，可能晚于 window.load，所以兼容两种时机
  window.whenPageReady = (fn) => {
    if (document.readyState === "complete") setTimeout(fn, 16);
    else window.addEventListener("load", fn);
  };
  whenPageReady(() => {
    setTimeout(() => $("#loader").classList.add("done"), 1700);
  });

  /* ---------- 2. 星空粒子背景 ---------- */
  (function particles() {
    const canvas = $("#particles");
    const ctx = canvas.getContext("2d");
    let W, H, stars = [], meteors = [];
    const mouse = { x: -9999, y: -9999 };

    function resize() {
      W = canvas.width = innerWidth;
      H = canvas.height = innerHeight;
      const count = Math.min(190, Math.floor(W * H / 9000));
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 1.6 + 0.3,
        vx: (Math.random() - 0.5) * 0.12,
        vy: (Math.random() - 0.5) * 0.12,
        tw: Math.random() * Math.PI * 2,
        ts: 0.008 + Math.random() * 0.02,
        hue: [46, 320, 255, 190][Math.floor(Math.random() * 4)]
      }));
    }

    function spawnMeteor() {
      meteors.push({
        x: Math.random() * W * 0.8 + W * 0.2,
        y: -30,
        vx: -(3 + Math.random() * 3),
        vy: 4 + Math.random() * 3,
        life: 1
      });
      setTimeout(spawnMeteor, 4000 + Math.random() * 8000);
    }

    function tick() {
      ctx.clearRect(0, 0, W, H);

      for (const s of stars) {
        s.x += s.vx; s.y += s.vy; s.tw += s.ts;
        if (s.x < 0) s.x = W; if (s.x > W) s.x = 0;
        if (s.y < 0) s.y = H; if (s.y > H) s.y = 0;

        // 靠近鼠标的星星被轻轻推开
        const dx = s.x - mouse.x, dy = s.y - mouse.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 14400) {
          const d = Math.sqrt(d2) || 1;
          s.x += (dx / d) * 0.6;
          s.y += (dy / d) * 0.6;
        }

        const a = 0.35 + Math.sin(s.tw) * 0.3;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${s.hue}, 90%, 78%, ${a})`;
        ctx.fill();
      }

      // 星与星之间的微光连线（只连近距离）
      ctx.lineWidth = 0.4;
      for (let i = 0; i < stars.length; i += 3) {
        for (let j = i + 3; j < stars.length; j += 3) {
          const a = stars[i], b = stars[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 7500) {
            ctx.strokeStyle = `rgba(160, 150, 255, ${0.12 * (1 - d2 / 7500)})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // 流星
      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i];
        m.x += m.vx; m.y += m.vy; m.life -= 0.008;
        if (m.life <= 0 || m.y > H + 60) { meteors.splice(i, 1); continue; }
        const grad = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * 16, m.y - m.vy * 16);
        grad.addColorStop(0, `rgba(255, 230, 180, ${m.life})`);
        grad.addColorStop(1, "rgba(255, 230, 180, 0)");
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(m.x - m.vx * 16, m.y - m.vy * 16);
        ctx.stroke();
      }

      requestAnimationFrame(tick);
    }

    addEventListener("resize", resize);
    addEventListener("mousemove", (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });
    resize();
    setTimeout(spawnMeteor, 3000);
    tick();
  })();

  /* ---------- 3. 自定义光标 + 磁吸按钮 ---------- */
  (function cursor() {
    if (isTouch) return;
    const dot = $("#cursorDot"), ring = $("#cursorRing");
    let rx = innerWidth / 2, ry = innerHeight / 2, tx = rx, ty = ry;

    addEventListener("mousemove", (e) => {
      tx = e.clientX; ty = e.clientY;
      dot.style.transform = `translate(${tx}px, ${ty}px) translate(-50%, -50%)`;
      const el = e.target.closest("a, button, .album-card, .photo-item");
      ring.classList.toggle("hovering", !!el);
    });

    (function follow() {
      rx += (tx - rx) * 0.16;
      ry += (ty - ry) * 0.16;
      ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
      requestAnimationFrame(follow);
    })();

    // 磁吸：按钮轻轻吸向鼠标
    document.addEventListener("mousemove", (e) => {
      document.querySelectorAll("[data-magnetic]").forEach((el) => {
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const dx = e.clientX - cx, dy = e.clientY - cy;
        const dist = Math.hypot(dx, dy);
        if (dist < 110) {
          el.style.transform = `translate(${dx * 0.18}px, ${dy * 0.18}px)`;
        } else {
          el.style.transform = "";
        }
      });
    });
  })();

  /* ---------- 4. 导航滚动状态 ---------- */
  addEventListener("scroll", () => {
    $("#nav").classList.toggle("scrolled", scrollY > 40);
  }, { passive: true });

  /* ---------- 5. Hero 标题逐字入场 ---------- */
  (function heroTitle() {
    const el = $("#heroTitle");
    const text = el.textContent;
    el.textContent = "";
    [...text].forEach((ch, i) => {
      const span = document.createElement("span");
      span.className = "ch";
      span.textContent = ch;
      span.style.animationDelay = `${1.9 + i * 0.12}s`;
      el.appendChild(span);
    });
  })();

  /* ---------- 6. 统计数字滚动 ---------- */
  (function stats() {
    const totalPhotos = DATA.reduce((n, c) => n + c.photos.length, 0);
    const albums = DATA.length;
    const days = Math.max(1, Math.floor((Date.now() - new Date("2024-01-01")) / 864e5));

    function countUp(el, target) {
      const dur = 1800, t0 = performance.now();
      (function step(t) {
        const p = Math.min(1, (t - t0) / dur);
        const eased = 1 - Math.pow(1 - p, 4);
        el.textContent = Math.round(target * eased).toLocaleString();
        if (p < 1) requestAnimationFrame(step);
      })(t0);
    }

    setTimeout(() => {
      countUp($("#statPhotos"), totalPhotos);
      countUp($("#statAlbums"), albums);
      countUp($("#statDays"), days);
    }, 2300);
  })();

  /* ---------- 7. 滚动浮现 ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) {
        en.target.classList.add("in");
        io.unobserve(en.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

  $("#enterBtn").addEventListener("click", () => {
    $("#frame3d").scrollIntoView({ behavior: "smooth" });
  });

  /* ---------- 8. 渲染相册卡片 ---------- */
  const EMOJIS = ["🎉", "🌕", "💛", "🍽️", "🧹", "🎬", "📸", "🏆", "🧭", "🤝", "📚", "🔄", "🎓", "☕", "💝", "🚀", "⛰️", "✏️", "📝", "🏗️", "🧧", "🌱", "🗂️", "📁"];
  const GRADS = [
    "135deg, #2b1a55, #6b2d5c", "135deg, #1a2d55, #2d6b5c", "135deg, #552b1a, #5c2d6b",
    "135deg, #1a4055, #4a2d6b", "135deg, #402b1a, #6b5c2d", "135deg, #2d1a55, #2d5c6b"
  ];

  (function renderAlbums() {
    const grid = $("#albumGrid");
    DATA.forEach((cat, i) => {
      const card = document.createElement("div");
      card.className = "album-card";
      const hasPhotos = cat.photos.length > 0;
      const cover = hasPhotos
        ? `<div class="album-cover" style="background-image:url('${encodeURI(cat.photos[0])}')"></div>`
        : `<div class="album-cover placeholder" style="background:linear-gradient(${GRADS[i % GRADS.length]})">${EMOJIS[i % EMOJIS.length]}</div>`;
      card.innerHTML = `
        ${cover}
        <div class="album-shade"></div>
        <div class="album-shine"></div>
        <div class="album-info">
          <div class="album-name">${cat.name}</div>
          <div class="album-meta">
            <span class="album-badge ${hasPhotos ? "" : "empty"}">${hasPhotos ? cat.photos.length + " 张照片" : "敬请期待"}</span>
          </div>
        </div>`;
      card.addEventListener("click", () => openGallery(cat));
      grid.appendChild(card);

      // 入场交错
      const cardIO = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            setTimeout(() => card.classList.add("in"), (i % 4) * 110);
            cardIO.disconnect();
          }
        });
      }, { threshold: 0.1 });
      cardIO.observe(card);

      // 3D 倾斜
      if (!isTouch) {
        card.addEventListener("mousemove", (e) => {
          const r = card.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width - 0.5;
          const py = (e.clientY - r.top) / r.height - 0.5;
          card.style.transform = `rotateY(${px * 12}deg) rotateX(${-py * 12}deg) translateY(-6px) scale(1.02)`;
          card.style.transition = "transform .12s ease-out";
        });
        card.addEventListener("mouseleave", () => {
          card.style.transform = "";
          card.style.transition = "transform .6s cubic-bezier(.22,1,.36,1)";
        });
      }
    });
  })();

  /* ---------- 8.5 3D 时光相框 ----------
     每次打开随机抽一批照片放进金边相框组成的 3D 旋转环，
     每 5 秒整环翻面换上新照片，支持鼠标/手指拖动旋转。 */
  (function frame3d() {
    const stage = $("#frameStage");
    const ring = $("#frameRing");
    if (!stage || !ring) return;

    const CARD_COUNT = 6;
    const radius = innerWidth < 640 ? 230 : 330;

    // 照片池：全部分类打散后循环取用，避免连续重复
    const pool = [];
    DATA.forEach((cat) => cat.photos.forEach((src) => pool.push({ src, name: cat.name })));
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    let poolIdx = 0;
    function nextShot() {
      if (!pool.length) return null;
      const shot = pool[poolIdx % pool.length];
      poolIdx++;
      return shot;
    }

    function fillCard(card, i) {
      const photoEl = card.querySelector(".fc-photo");
      const labelEl = card.querySelector(".fc-label");
      const shot = nextShot();
      if (shot) {
        photoEl.className = "fc-photo";
        photoEl.style.background = "";
        photoEl.style.backgroundImage = `url('${encodeURI(shot.src)}')`;
        labelEl.textContent = shot.name;
      } else {
        photoEl.className = "fc-photo placeholder";
        photoEl.style.background = `linear-gradient(${GRADS[i % GRADS.length]})`;
        photoEl.style.backgroundImage = "";
        photoEl.textContent = EMOJIS[i % EMOJIS.length];
        labelEl.textContent = "等待照片中…";
      }
    }

    const cards = [];
    for (let i = 0; i < CARD_COUNT; i++) {
      const card = document.createElement("div");
      card.className = "frame3d-card";
      card.innerHTML = `
        <div class="fc-inner">
          <div class="fc-face fc-front">
            <div class="fc-photo"></div>
            <div class="fc-label"></div>
          </div>
          <div class="fc-face fc-back">✦</div>
        </div>`;
      fillCard(card, i);
      ring.appendChild(card);
      cards.push(card);
    }

    // 旋转：自动 + 拖动惯性
    let angle = 0, speed = 0.10, dragVel = 0;
    let dragging = false, lastX = 0;
    let tilt = -7, tiltTarget = -7;

    function layout() {
      cards.forEach((card, i) => {
        const a = (360 / CARD_COUNT) * i;
        card.style.transform = `rotateY(${a}deg) translateZ(${radius}px)`;
      });
    }
    layout();

    (function spin() {
      if (!dragging) {
        angle += speed + dragVel;
        dragVel *= 0.95; // 松手后的惯性衰减
      }
      tilt += (tiltTarget - tilt) * 0.06;
      ring.style.transform = `rotateX(${tilt}deg) rotateY(${angle}deg)`;
      requestAnimationFrame(spin);
    })();

    stage.addEventListener("pointerdown", (e) => {
      dragging = true;
      lastX = e.clientX;
      stage.setPointerCapture(e.pointerId);
    });
    stage.addEventListener("pointermove", (e) => {
      if (dragging) {
        const dx = e.clientX - lastX;
        lastX = e.clientX;
        angle += dx * 0.35;
        dragVel = dx * 0.12;
      }
      // 鼠标上下位置带来轻微俯仰视差
      const r = stage.getBoundingClientRect();
      tiltTarget = -7 - ((e.clientY - r.top) / r.height - 0.5) * 10;
    });
    const endDrag = () => { dragging = false; };
    stage.addEventListener("pointerup", endDrag);
    stage.addEventListener("pointercancel", endDrag);
    stage.addEventListener("pointerleave", () => { tiltTarget = -7; });

    // 每 5 秒：整环依次翻面，翻到侧面时换上新照片
    setInterval(() => {
      cards.forEach((card, i) => {
        setTimeout(() => {
          card.classList.add("flipping");
          setTimeout(() => {
            fillCard(card, i);
            card.classList.remove("flipping");
          }, 280); // 翻到 90° 侧面（动画 550ms 的中点）时换图
        }, i * 130);
      });
    }, 5000);
  })();

  /* ---------- 9. 相册浏览层 ---------- */
  let currentPhotos = [], currentIndex = 0;

  function openGallery(cat) {
    currentPhotos = cat.photos;
    $("#galleryTitle").textContent = cat.name;
    $("#galleryCount").textContent = cat.photos.length
      ? `${cat.photos.length} PHOTOS`
      : "COMING SOON";
    $("#slideshowBtn").style.display = cat.photos.length ? "" : "none";
    $("#galleryEmpty").classList.toggle("show", !cat.photos.length);

    const masonry = $("#masonry");
    masonry.innerHTML = "";
    cat.photos.forEach((src, i) => {
      const item = document.createElement("div");
      item.className = "photo-item";
      item.innerHTML = `<img src="${encodeURI(src)}" alt="${cat.name}" loading="lazy">`;
      item.addEventListener("click", () => openLightbox(i));
      masonry.appendChild(item);
      const pIO = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            setTimeout(() => item.classList.add("in"), (i % 6) * 70);
            pIO.disconnect();
          }
        });
      }, { threshold: 0.05 });
      pIO.observe(item);
    });

    const view = $("#galleryView");
    view.scrollTop = 0;
    view.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closeGallery() {
    $("#galleryView").classList.remove("open");
    document.body.style.overflow = "";
    stopSlideshow();
  }
  $("#backBtn").addEventListener("click", closeGallery);

  /* ---------- 10. 灯箱 + 幻灯片 ---------- */
  let slideshowTimer = null;

  function openLightbox(i) {
    currentIndex = i;
    updateLightbox();
    $("#lightbox").classList.add("open");
  }

  function updateLightbox() {
    const img = $("#lbImg");
    img.style.animation = "none";
    void img.offsetWidth; // 重置入场动画
    img.style.animation = "";
    img.src = encodeURI(currentPhotos[currentIndex]);
    $("#lbCaption").textContent = `${currentIndex + 1} / ${currentPhotos.length}`;
    const span = $("#lbProgress");
    span.style.transition = "none";
    span.style.width = `${((currentIndex + 1) / currentPhotos.length) * 100}%`;
    void span.offsetWidth;
    span.style.transition = "";
  }

  function nav(dir) {
    currentIndex = (currentIndex + dir + currentPhotos.length) % currentPhotos.length;
    updateLightbox();
  }

  function closeLightbox() {
    $("#lightbox").classList.remove("open");
    stopSlideshow();
  }

  function startSlideshow() {
    if (!currentPhotos.length) return;
    openLightbox(0);
    $("#lightbox").classList.add("slideshow");
    $("#slideshowBtn").textContent = "⏸ 播放中";
    slideshowTimer = setInterval(() => nav(1), 4000);
  }

  function stopSlideshow() {
    clearInterval(slideshowTimer);
    slideshowTimer = null;
    $("#lightbox").classList.remove("slideshow");
    $("#slideshowBtn").textContent = "▶ 幻灯片";
  }

  $("#slideshowBtn").addEventListener("click", () => {
    slideshowTimer ? (stopSlideshow(), closeLightbox()) : startSlideshow();
  });
  $("#lbClose").addEventListener("click", closeLightbox);
  $("#lbPrev").addEventListener("click", () => { stopSlideshow(); nav(-1); });
  $("#lbNext").addEventListener("click", () => { stopSlideshow(); nav(1); });
  $(".lightbox-bg").addEventListener("click", closeLightbox);

  addEventListener("keydown", (e) => {
    if ($("#lightbox").classList.contains("open")) {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") { stopSlideshow(); nav(-1); }
      if (e.key === "ArrowRight") { stopSlideshow(); nav(1); }
    } else if ($("#galleryView").classList.contains("open") && e.key === "Escape") {
      closeGallery();
    }
  });

  // 灯箱内左右滑动（手机）
  let touchX = null;
  $("#lightbox").addEventListener("touchstart", (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  $("#lightbox").addEventListener("touchend", (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) { stopSlideshow(); nav(dx > 0 ? -1 : 1); }
    touchX = null;
  }, { passive: true });

  /* ---------- 11. BGM ----------
     优先播放 assets/bgm.mp3（自己放一首喜欢的歌进去即可）；
     没有的话，用 Web Audio 实时合成一段梦幻氛围音乐。 */
  (function bgm() {
    const btn = $("#musicBtn");
    let mode = null;          // "file" | "synth"
    let audioEl = null;       // <audio> 元素
    let ctx = null, master = null, synthTimers = [];
    let playing = false;

    const fileAudio = new Audio("assets/bgm.mp3");
    fileAudio.loop = true;
    fileAudio.volume = 0.55;
    fileAudio.addEventListener("canplaythrough", () => { if (!mode) { mode = "file"; audioEl = fileAudio; } });
    fileAudio.addEventListener("error", () => { if (!mode) mode = "synth"; });
    fileAudio.load();

    /* —— 合成器：梦幻钢琴氛围 —— */
    const A = 220;
    // 和弦进行：Am7 → Fmaj7 → Cmaj7 → G6，循环
    const CHORDS = [
      [A, A * 6 / 5, A * 3 / 2, A * 9 / 5],          // Am7
      [174.61, 220, 261.63, 329.63],                  // Fmaj7
      [130.81, 164.81, 196, 246.94],                  // Cmaj7
      [196, 246.94, 293.66, 329.63]                   // G6
    ];
    // 五声音阶琶音音池
    const PENTA = [440, 523.25, 587.33, 659.25, 783.99, 880, 1046.5];

    function initSynth() {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0;
      const delay = ctx.createDelay(1.0);
      delay.delayTime.value = 0.42;
      const fb = ctx.createGain();
      fb.gain.value = 0.34;
      const wet = ctx.createGain();
      wet.gain.value = 0.35;
      delay.connect(fb).connect(delay);
      master.connect(ctx.destination);
      master.connect(delay);
      delay.connect(wet).connect(ctx.destination);
    }

    function padChord(freqs, when, dur) {
      freqs.forEach((f) => {
        [0, 0.4].forEach((detuneMix, idx) => {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          const lp = ctx.createBiquadFilter();
          osc.type = idx === 0 ? "triangle" : "sine";
          osc.frequency.value = f * (idx === 0 ? 1 : 2.001);
          lp.type = "lowpass";
          lp.frequency.value = 900;
          g.gain.setValueAtTime(0, when);
          g.gain.linearRampToValueAtTime(idx === 0 ? 0.05 : 0.018, when + dur * 0.4);
          g.gain.linearRampToValueAtTime(0, when + dur);
          osc.connect(lp).connect(g).connect(master);
          osc.start(when);
          osc.stop(when + dur + 0.1);
        });
      });
    }

    function pluck(freq, when) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0, when);
      g.gain.linearRampToValueAtTime(0.085, when + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, when + 1.6);
      osc.connect(g).connect(master);
      osc.start(when);
      osc.stop(when + 1.8);
    }

    function scheduleLoop() {
      const chordDur = 4.8;
      let chordIdx = 0;
      function bar() {
        if (!playing || mode !== "synth") return;
        const now = ctx.currentTime + 0.05;
        padChord(CHORDS[chordIdx % CHORDS.length], now, chordDur + 0.6);
        // 每小节随机 3~5 颗琶音星星
        const notes = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < notes; i++) {
          const t = now + 0.3 + Math.random() * (chordDur - 1);
          pluck(PENTA[Math.floor(Math.random() * PENTA.length)], t);
        }
        chordIdx++;
        synthTimers.push(setTimeout(bar, chordDur * 1000));
      }
      bar();
    }

    function start() {
      playing = true;
      btn.classList.add("playing");
      if (mode === "file") {
        fileAudio.play().catch(() => { mode = "synth"; startSynth(); });
      } else {
        startSynth();
      }
    }

    function startSynth() {
      mode = "synth";
      if (!ctx) initSynth();
      ctx.resume();
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.linearRampToValueAtTime(0.9, ctx.currentTime + 2);
      scheduleLoop();
    }

    function stop() {
      playing = false;
      btn.classList.remove("playing");
      if (mode === "file" && audioEl) audioEl.pause();
      if (ctx) {
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8);
      }
      synthTimers.forEach(clearTimeout);
      synthTimers = [];
    }

    btn.addEventListener("click", () => (playing ? stop() : start()));

    // 第一次点击页面任意处时自动开启 BGM（浏览器要求用户交互后才能出声）
    function autoStart() {
      if (!playing) start();
      removeEventListener("pointerdown", autoStart);
    }
    addEventListener("pointerdown", autoStart, { once: false });
  })();

})();
