/* Мастерская ИГР: ядро демо-движка. Холст, цикл, ввод, экраны, общие рисовалки и реестр жанров.
   Жанр подключается файлом assets/genres/<id>.js через MG.register(id, def), контракт описан в README проекта */
(() => {
  'use strict';

  const W = 640, H = 360;
  const C = {
    hero: '#FF8A1F', gold: '#FFD166', text: '#F5F3EE', muted: '#A3A3A3', teal: '#5EEAD4',
    villain: '#A78BFA', villainDark: '#6D4FD1', danger: '#FF6B6B', ink: '#131209'
  };
  const FONT = '"Manrope", system-ui, sans-serif';
  const PURPOSES = {
    self: { label: 'для себя', finale: 'ссылка друзьям и таблица рекордов', result: 'В сервисе здесь появится ссылка: отправь её друзьям и сравните рекорды' },
    gift: { label: 'подарок', finale: 'поздравление, фото именинника, открытка со ссылкой', result: 'Финал подарка: здесь будет твоё поздравление и фото именинника, а игру ты отправишь открыткой со ссылкой' },
    biz: { label: 'для бизнеса', finale: 'форма заявки и промокод на скидку', result: 'Финал для бизнеса: здесь игрок оставит телефон и получит промокод на скидку' },
    lesson: { label: 'для урока', finale: 'разбор ответов и оценка для учителя', result: 'Финал урока: здесь будет разбор ответов и оценка, а учитель увидит результаты класса' }
  };
  const DIFF = {
    easy: { label: 'лёгкая', lives: 4, speed: 0.85 },
    normal: { label: 'обычная', lives: 3, speed: 1 },
    hard: { label: 'высокая', lives: 2, speed: 1.2 }
  };

  const genres = {};
  const order = [];
  const MG = window.MG = {
    register(id, def) { if (!genres[id]) order.push(id); genres[id] = def; },
    list() { return order.map(id => ({ id, title: genres[id].title, icon: genres[id].icon })); }
  };

  let canvas, ctx, screenEl, titleEl, hintEl, passportEl;
  let k = 1;
  let cfg = {
    genre: 'runner', purpose: 'self', hero: 'Искра', villain: 'Барон Мрак',
    plot: 'Барон Мрак украл все звёзды над городом. Искра должна вернуть их до рассвета, пока город не уснул навсегда',
    desc: ''
  };
  let game = null, state = 'intro', endedAt = 0, time = 0, inView = true, raf = 0, last = 0;
  let particles = [];
  const keys = new Set();
  const ptrs = new Map();
  const input = { keys, ptrs, jump: 0, tap: 0 };

  /* ---------- Утилиты ---------- */
  const rand = (a, b) => a + Math.random() * (b - a);
  const randInt = (a, b) => Math.floor(rand(a, b + 1));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  const inRect = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

  function difficulty(desc) {
    const d = String(desc || '').toLowerCase();
    let m = d.match(/сложн\S*|хардкор\S*|трудн\S*|для взросл\S*/);
    if (m) return { level: 'hard', word: m[0] };
    m = d.match(/лёгк\S*|легк\S*|прост\S*|малыш\S*|детск\S*|(?:^|\D)[4-7] (?:лет|года)/);
    if (m) return { level: 'easy', word: m[0].replace(/^\D(?=\d)/, '').trim() };
    return { level: 'normal', word: '' };
  }
  function applyDifficulty() {
    const r = difficulty(cfg.desc);
    cfg.diff = r.level;
    cfg.diffWord = r.word.replace(/[.,;:!?]+$/, '');
  }

  /* ---------- Рисовалки ---------- */
  function rr(x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function txt(str, x, y, size, color, weight = 600, align = 'left') {
    ctx.font = `${weight} ${size}px ${FONT}`;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(str, x, y);
  }
  function fitWord(word, maxW) {
    if (ctx.measureText(word).width <= maxW) return word;
    let w = word;
    while (w.length > 1 && ctx.measureText(w + '…').width > maxW) w = w.slice(0, -1);
    return w + '…';
  }
  function wrap(str, maxW, size, weight, maxLines) {
    ctx.font = `${weight} ${size}px ${FONT}`;
    const words = String(str || '').split(/\s+/).filter(Boolean);
    const lines = [];
    let line = '', i = 0;
    for (; i < words.length; i++) {
      const word = fitWord(words[i], maxW);
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width > maxW && line) {
        lines.push(line); line = word;
        if (lines.length === maxLines) break;
      } else line = test;
    }
    if (lines.length < maxLines && line) { lines.push(line); i = words.length; }
    if (i < words.length && lines.length) {
      let l = lines[lines.length - 1];
      while (l.length > 1 && ctx.measureText(l + '…').width > maxW) l = l.slice(0, -1);
      lines[lines.length - 1] = l.replace(/[\s,.;:]+$/, '') + '…';
    }
    return lines;
  }
  function nameTag(str, cx, y) {
    ctx.font = `600 11px ${FONT}`;
    const w = ctx.measureText(str).width + 12;
    ctx.fillStyle = 'rgba(11, 11, 14, 0.75)';
    rr(cx - w / 2, y - 17, w, 16, 8); ctx.fill();
    txt(str, cx, y - 5, 11, C.text, 600, 'center');
  }
  function eyes(cx, cy, gap, r, look, angry) {
    for (const s of [-1, 1]) {
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath(); ctx.arc(cx + s * gap, cy, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = C.ink;
      ctx.beginPath(); ctx.arc(cx + s * gap + look * r * 0.35, cy + r * 0.1, r * 0.5, 0, Math.PI * 2); ctx.fill();
      if (angry) {
        ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cx + s * gap + s * r, cy - r - 3); ctx.lineTo(cx + s * gap - s * r, cy - r + 1); ctx.stroke();
      }
    }
  }
  function drawHero(x, y, w, h, facing = 1, bob = 0, blink = false) {
    if (blink && Math.floor(time * 12) % 2) return;
    const scarfY = y + bob + h * 0.42;
    ctx.fillStyle = C.hero; rr(x, y + bob, w, h, Math.min(8, w * 0.3)); ctx.fill();
    ctx.fillStyle = C.gold; ctx.fillRect(x, scarfY, w, Math.max(3, h * 0.12));
    const sx = facing > 0 ? x : x + w;
    ctx.beginPath(); ctx.moveTo(sx, scarfY); ctx.lineTo(sx - facing * 12, scarfY + 4 + Math.sin(time * 14) * 3); ctx.lineTo(sx, scarfY + 5); ctx.fill();
    eyes(x + w / 2 + facing * 3, y + bob + h * 0.24, Math.max(3, w * 0.18), Math.max(2.5, w * 0.14), facing, false);
  }
  function drawVillain(x, y, w, h, look = 0) {
    ctx.fillStyle = C.villainDark;
    ctx.beginPath(); ctx.moveTo(x + w * 0.16, y + 4); ctx.lineTo(x + w * 0.27, y - h * 0.26); ctx.lineTo(x + w * 0.4, y + 4); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + w * 0.6, y + 4); ctx.lineTo(x + w * 0.73, y - h * 0.26); ctx.lineTo(x + w * 0.84, y + 4); ctx.fill();
    ctx.fillStyle = C.villain; rr(x, y, w, h, Math.min(12, w * 0.3)); ctx.fill();
    eyes(x + w / 2, y + h * 0.36, w * 0.17, Math.max(3, w * 0.1), look, true);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x + w * 0.34, y + h * 0.72); ctx.lineTo(x + w * 0.5, y + h * 0.64); ctx.lineTo(x + w * 0.66, y + h * 0.72); ctx.stroke();
  }
  function drawMinion(x, y, w, h) {
    ctx.fillStyle = C.villainDark; rr(x, y, w, h, Math.min(8, w * 0.3)); ctx.fill();
    ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(x + w / 2, y + h * 0.4, Math.min(w, h) * 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(x + w / 2 - 2, y + h * 0.42, Math.min(w, h) * 0.1, 0, Math.PI * 2); ctx.fill();
  }
  function star(cx, cy, r, color, rot = 0) {
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = rot + i * Math.PI / 5 - Math.PI / 2;
      const rad = i % 2 ? r * 0.45 : r;
      ctx.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
    }
    ctx.closePath(); ctx.fill();
  }
  function heart(x, y, s, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x + s / 2, y + s * 0.9);
    ctx.bezierCurveTo(x - s * 0.2, y + s * 0.45, x + s * 0.05, y - s * 0.05, x + s / 2, y + s * 0.25);
    ctx.bezierCurveTo(x + s * 0.95, y - s * 0.05, x + s * 1.2, y + s * 0.45, x + s / 2, y + s * 0.9);
    ctx.fill();
  }
  function burst(x, y, color, n = 10) {
    for (let i = 0; i < n; i++) particles.push({ x, y, vx: rand(-140, 140), vy: rand(-200, 40), life: rand(0.3, 0.6), color });
  }
  function button(b, label, pressed) {
    ctx.fillStyle = pressed ? 'rgba(255, 138, 31, 0.5)' : 'rgba(255, 255, 255, 0.1)';
    rr(b.x, b.y, b.w, b.h, 12); ctx.fill();
    txt(label, b.x + b.w / 2, b.y + b.h / 2 + 6, 18, C.text, 700, 'center');
  }
  const SKY = Array.from({ length: 50 }, () => ({ x: rand(0, W), y: rand(0, H), r: rand(0.6, 1.8), s: rand(10, 60) }));
  function starfield(color = '#100F1A', drift = 0, alpha = 0.5) {
    ctx.fillStyle = color; ctx.fillRect(0, 0, W, H);
    for (const s of SKY) {
      const y = drift ? (s.y + time * s.s * drift) % H : s.y;
      ctx.fillStyle = `rgba(255,255,255,${alpha * (0.4 + s.r * 0.3)})`;
      ctx.fillRect(s.x, y, s.r, s.r);
    }
  }

  function updateParticles(dt) {
    for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 500 * dt; p.life -= dt; }
    particles = particles.filter(p => p.life > 0);
  }
  function drawParticles() {
    for (const p of particles) {
      ctx.globalAlpha = clamp(p.life * 2, 0, 1);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    }
    ctx.globalAlpha = 1;
  }

  function hud(g) {
    const max = g.maxLives || 0;
    for (let i = 0; i < max; i++) heart(16 + i * 22, 14, 16, i < g.lives ? C.danger : 'rgba(255,255,255,0.16)');
    if (g.score !== undefined) txt(`Очки ${g.score}`, W - 16, 28, 14, C.text, 700, 'right');
    const s = g.status ? g.status() : '';
    if (s) txt(s, W / 2, 28, 13, C.text, 600, 'center');
  }

  /* ---------- Состояния ---------- */
  function win() { if (state !== 'play') return; state = 'win'; endedAt = performance.now(); canvas.setAttribute('aria-label', 'Уровень пройден. Нажми, чтобы сыграть ещё'); }
  function lose() { if (state !== 'play') return; state = 'lose'; endedAt = performance.now(); canvas.setAttribute('aria-label', 'Попытка не удалась. Нажми, чтобы попробовать снова'); }

  const api = {
    W, H, C, FONT, input,
    get cfg() { return cfg; },
    get diff() { return DIFF[cfg.diff]; },
    get time() { return time; },
    get ctx() { return ctx; },
    rand, randInt, clamp, overlap, inRect,
    rr, txt, wrap, fitWord, nameTag, eyes, drawHero, drawVillain, drawMinion, star, heart, burst, button, starfield, drawParticles,
    win, lose,
    useJump() { if (input.jump > 0) { input.jump = 0; return true; } return false; },
    useTap() { if (input.tap > 0) { input.tap = 0; return true; } return false; }
  };

  function reset() {
    particles = [];
    input.jump = 0; input.tap = 0;
    const g = genres[cfg.genre] || genres[order[0]];
    game = g.make(api);
    if (game.maxLives === undefined) game.maxLives = game.lives || 0;
  }
  function start() {
    reset();
    state = 'play';
    canvas.setAttribute('aria-label', 'Идёт игра');
    schedule();
  }

  function pill(label, y) {
    ctx.font = `700 15px ${FONT}`;
    const w = ctx.measureText(label).width + 48;
    ctx.globalAlpha = 0.85 + Math.sin(time * 4) * 0.15;
    ctx.fillStyle = C.hero; rr(W / 2 - w / 2, y, w, 40, 20); ctx.fill();
    ctx.globalAlpha = 1;
    txt(label, W / 2, y + 26, 15, C.ink, 700, 'center');
  }
  function scrim() { ctx.fillStyle = 'rgba(11, 11, 14, 0.8)'; ctx.fillRect(0, 0, W, H); }

  function drawIntro() {
    scrim();
    const g = genres[cfg.genre];
    txt(`${g.title} · ${PURPOSES[cfg.purpose].label} · сложность ${DIFF[cfg.diff].label}`.toUpperCase(), W / 2, 40, 11, C.muted, 700, 'center');
    ctx.font = `700 30px ${FONT}`;
    txt(fitWord(cfg.hero, 560), W / 2, 84, 30, C.hero, 700, 'center');
    txt('против', W / 2, 106, 13, C.muted, 600, 'center');
    ctx.font = `700 26px ${FONT}`;
    txt(fitWord(cfg.villain, 560), W / 2, 138, 26, C.villain, 700, 'center');
    wrap(cfg.plot, 470, 14, 500, 3).forEach((l, i) => txt(l, W / 2, 176 + i * 20, 14, C.text, 500, 'center'));
    pill('Нажми, чтобы начать', 246);
    txt(g.controls, W / 2, 322, 12, C.muted, 500, 'center');
  }
  function drawEnd(won) {
    scrim();
    if (won) {
      txt('Уровень пройден', W / 2, 92, 28, C.text, 700, 'center');
      if (game.score !== undefined) txt(`Очки: ${game.score}`, W / 2, 122, 15, C.gold, 700, 'center');
      wrap(PURPOSES[cfg.purpose].result, 440, 14, 500, 3).forEach((l, i) => txt(l, W / 2, 162 + i * 20, 14, C.text, 500, 'center'));
      pill('Нажми, чтобы сыграть ещё', 246);
    } else {
      txt('Не получилось', W / 2, 108, 28, C.text, 700, 'center');
      wrap(`Злодей ${cfg.villain} пока впереди. Попробуй ещё раз, теперь ты знаешь, где ловушки`, 440, 14, 500, 3)
        .forEach((l, i) => txt(l, W / 2, 148 + i * 20, 14, C.text, 500, 'center'));
      pill('Нажми, чтобы попробовать снова', 236);
    }
  }

  function fit() {
    const r = canvas.getBoundingClientRect();
    if (!r.width) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.width * dpr * H / W);
    k = canvas.width / W;
  }
  function draw() {
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    game.draw();
    ctx.restore();
    drawParticles();
    if (state === 'play') hud(game);
    else if (state === 'intro') drawIntro();
    else drawEnd(state === 'win');
  }
  function frame(ts) {
    raf = 0;
    const dt = Math.min(0.033, Math.max(0, (ts - last) / 1000));
    last = ts;
    time += dt;
    if (input.jump > 0) input.jump -= dt;
    if (input.tap > 0) input.tap -= dt;
    if (state === 'play') {
      try { game.update(dt); } catch (err) { console.error(err); lose(); }
    }
    updateParticles(dt);
    draw();
    schedule();
  }
  function schedule() {
    if (!raf && inView && !document.hidden) raf = requestAnimationFrame(ts => { if (!last || ts - last > 100) last = ts; frame(ts); });
  }

  /* ---------- Ввод ---------- */
  function toGame(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
  }
  const GAME_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'KeyA', 'KeyD', 'KeyW', 'KeyS', 'Enter', 'Digit1', 'Digit2', 'Digit3', 'Digit4'];

  function bindInput() {
    canvas.addEventListener('pointerdown', e => {
      e.preventDefault();
      canvas.focus({ preventScroll: true });
      const p = toGame(e);
      ptrs.set(e.pointerId, p);
      try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* не все браузеры */ }
      if (state === 'intro') return start();
      if (state !== 'play') { if (performance.now() - endedAt > 600) start(); return; }
      input.tap = 0.15;
      if (game.onPointerDown) game.onPointerDown(p);
    });
    canvas.addEventListener('pointermove', e => {
      if (!ptrs.has(e.pointerId)) return;
      const p = toGame(e);
      ptrs.set(e.pointerId, p);
      if (state === 'play' && game.onPointerMove) game.onPointerMove(p);
    });
    const drop = e => {
      if (!ptrs.has(e.pointerId)) return;
      const p = toGame(e);
      ptrs.delete(e.pointerId);
      if (state === 'play' && game.onPointerUp) game.onPointerUp(p);
    };
    canvas.addEventListener('pointerup', drop);
    canvas.addEventListener('pointercancel', drop);
    canvas.addEventListener('lostpointercapture', e => ptrs.delete(e.pointerId));

    window.addEventListener('keydown', e => {
      if (!GAME_KEYS.includes(e.code)) return;
      const active = document.activeElement;
      const onCanvas = active === canvas;
      if (active && !onCanvas && /^(INPUT|TEXTAREA|SELECT|BUTTON|A|SUMMARY)$/.test(active.tagName)) return;
      if (!onCanvas && !(state === 'play' && inView)) return;
      e.preventDefault();
      if (state !== 'play') {
        if ((e.code === 'Space' || e.code === 'Enter') && !e.repeat && (state === 'intro' || performance.now() - endedAt > 600)) start();
        return;
      }
      keys.add(e.code);
      if (!e.repeat) {
        if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') input.jump = 0.15;
        if (game.onKey) game.onKey(e.code);
      }
    });
    window.addEventListener('keyup', e => keys.delete(e.code));
    window.addEventListener('blur', () => { keys.clear(); ptrs.clear(); });
    document.addEventListener('visibilitychange', () => { last = 0; schedule(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(entries => { inView = entries[0].isIntersecting; if (inView) { last = 0; schedule(); } }).observe(canvas);
    }
    if ('ResizeObserver' in window) new ResizeObserver(() => { fit(); if (!raf) draw(); }).observe(canvas);
    else window.addEventListener('resize', fit);
  }

  /* ---------- Подписи и паспорт ---------- */
  function renderMeta() {
    const g = genres[cfg.genre];
    if (titleEl) {
      titleEl.textContent = `${g.title}: ${cfg.hero}`;
      const small = document.createElement('small');
      small.textContent = `злодей ${cfg.villain} · ${PURPOSES[cfg.purpose].label} · сложность ${DIFF[cfg.diff].label}`;
      titleEl.appendChild(small);
    }
    if (hintEl) {
      hintEl.textContent = '';
      for (const [key, label] of g.hint) {
        const kb = document.createElement('span');
        kb.className = 'kbd'; kb.textContent = key;
        hintEl.append(kb, ' ' + label + '  ');
      }
    }
    if (!passportEl) return;
    const diff = DIFF[cfg.diff];
    const rows = [
      ['Жанр', g.title],
      ['Цель игрока', g.goal],
      ['Герой', cfg.hero],
      ['Злодей', cfg.villain],
      ['Сложность', cfg.diffWord ? `${diff.label}: в описании «${cfg.diffWord}»` : `${diff.label}: особых пожеланий нет`],
      ['Жизней', game && game.maxLives === 0 ? 'нет, считаются ходы' : String(game && game.lives || diff.lives)],
      ['Финал', PURPOSES[cfg.purpose].finale],
      ['Уровней', 'в демо 1, в пробе 3, в «Игре» до 10']
    ];
    passportEl.textContent = '';
    for (const [name, value] of rows) {
      const row = document.createElement('div');
      const dt = document.createElement('dt'); dt.textContent = name;
      const dd = document.createElement('dd'); dd.textContent = value;
      row.append(dt, dd);
      passportEl.append(row);
    }
  }

  /* ---------- Внешний вход ---------- */
  window.MGDemo = {
    build(next) {
      cfg = Object.assign({}, cfg, next);
      if (!genres[cfg.genre]) cfg.genre = order[0];
      applyDifficulty();
      state = 'intro';
      reset();
      renderMeta();
      fit();
      last = 0;
      draw();
      schedule();
    },
    restart() { start(); canvas.focus({ preventScroll: true }); },
    fullscreen() {
      if (document.fullscreenElement) return document.exitFullscreen();
      if (screenEl.requestFullscreen) screenEl.requestFullscreen().then(fit).catch(() => {});
    },
    get canFullscreen() { return !!(document.fullscreenEnabled && screenEl && screenEl.requestFullscreen); },
    genres: () => MG.list(),
    info() { return { state, genre: cfg.genre, diff: cfg.diff, score: game && game.score, lives: game && game.lives }; },
    _game() { return game; },
    _start: start
  };

  let ready = false;
  function tryInit() {
    if (ready || document.readyState === 'loading' || window.MG_LOADING || !order.length) return;
    ready = true;
    init();
  }
  function init() {
    canvas = document.getElementById('game');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    screenEl = document.getElementById('screen');
    titleEl = document.getElementById('stage-title');
    hintEl = document.getElementById('stage-hint');
    passportEl = document.getElementById('passport');
    bindInput();
    window.MGDemo.build({});
    document.dispatchEvent(new CustomEvent('mg:ready'));
  }
  document.addEventListener('DOMContentLoaded', tryInit);
  document.addEventListener('mg:genres-loaded', () => { window.MG_LOADING = false; tryInit(); });
  setTimeout(tryInit, 0);
})();
