/* Кузня игр: демо-движок. Три жанровых шаблона на canvas, наполняются данными из формы */
(() => {
  'use strict';

  const W = 640, H = 360, GROUND = 300;
  const C = {
    hero: '#FF8A1F', gold: '#FFD166', text: '#F5F3EE', muted: '#A3A3A3',
    villain: '#A78BFA', villainDark: '#6D4FD1', danger: '#FF6B6B', ink: '#131209'
  };
  const FONT = '"Manrope", system-ui, sans-serif';

  const GENRES = {
    runner: { title: 'Раннер', controls: 'Пробел, стрелка вверх или касание экрана: прыжок', hint: [['Пробел', 'или касание: прыжок']], goal: 'догнать злодея до финиша' },
    space: { title: 'Космобой', controls: 'Стрелки или ведение пальцем, стреляет сам', hint: [['← →', 'полёт'], ['Палец', 'веди по экрану']], goal: 'сбить 14 разведчиков и победить босса' },
    collector: { title: 'Сборщик звёзд', controls: 'Кнопки на экране или стрелки и пробел', hint: [['← →', 'бег'], ['Пробел', 'прыжок']], goal: 'собрать 8 звёзд и не попасться' }
  };
  const PURPOSES = {
    self: { label: 'для себя', finale: 'ссылка друзьям и таблица рекордов', result: 'В сервисе здесь появится ссылка: отправь её друзьям и сравните рекорды' },
    gift: { label: 'подарок', finale: 'поздравление, фото именинника, открытка со ссылкой', result: 'Финал подарка: здесь будет твоё поздравление и фото именинника, а игру ты отправишь открыткой со ссылкой' },
    biz: { label: 'для бизнеса', finale: 'форма заявки и промокод на скидку', result: 'Финал для бизнеса: здесь игрок оставит телефон и получит промокод на скидку' },
    lesson: { label: 'для урока', finale: 'разбор ответов и оценка для учителя', result: 'Финал урока: здесь будет разбор ответов и оценка, а учитель увидит результаты класса' }
  };

  const canvas = document.getElementById('game');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const screenEl = document.getElementById('screen');
  const titleEl = document.getElementById('stage-title');
  const hintEl = document.getElementById('stage-hint');
  const passportEl = document.getElementById('passport');

  let k = 1;
  let cfg = {
    genre: 'runner', purpose: 'self', hero: 'Искра', villain: 'Барон Мрак',
    plot: 'Барон Мрак украл все звёзды над городом. Искра должна вернуть их до рассвета, пока город не уснул навсегда',
    desc: ''
  };
  let game = null;
  let state = 'intro';
  let endedAt = 0;
  let time = 0;
  let jumpBuf = 0;
  let inView = true;
  let raf = 0;
  let last = 0;
  const keys = new Set();
  const ptrs = new Map();
  let particles = [];

  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  const inRect = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

  /* ---------- Сложность из описания ---------- */
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
  const DIFF = {
    easy: { label: 'лёгкая', lives: 4, speed: 0.85 },
    normal: { label: 'обычная', lives: 3, speed: 1 },
    hard: { label: 'высокая', lives: 2, speed: 1.2 }
  };

  /* ---------- Рисование ---------- */
  function fit() {
    const r = canvas.getBoundingClientRect();
    if (!r.width) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.width * dpr * H / W);
    k = canvas.width / W;
  }

  function rr(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
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
    let line = '';
    let i = 0;
    for (; i < words.length; i++) {
      const word = fitWord(words[i], maxW);
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width > maxW && line) {
        lines.push(line);
        line = word;
        if (lines.length === maxLines) break;
      } else {
        line = test;
      }
    }
    if (lines.length < maxLines && line) { lines.push(line); i = words.length; }
    if (i < words.length && lines.length) {
      let lastLine = lines[lines.length - 1];
      while (lastLine.length > 1 && ctx.measureText(lastLine + '…').width > maxW) lastLine = lastLine.slice(0, -1);
      lines[lines.length - 1] = lastLine.replace(/[\s,.;:]+$/, '') + '…';
    }
    return lines;
  }

  function nameTag(str, cx, y) {
    ctx.font = `600 11px ${FONT}`;
    const w = ctx.measureText(str).width + 12;
    ctx.fillStyle = 'rgba(11, 11, 14, 0.75)';
    rr(cx - w / 2, y - 17, w, 16, 8);
    ctx.fill();
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
        ctx.beginPath();
        ctx.moveTo(cx + s * gap + s * r, cy - r - 3);
        ctx.lineTo(cx + s * gap - s * r, cy - r + 1);
        ctx.stroke();
      }
    }
  }

  function drawHero(x, y, w, h, facing, bob, blink) {
    if (blink && Math.floor(time * 12) % 2) return;
    const scarfY = y + bob + h * 0.42;
    ctx.fillStyle = C.hero; rr(x, y + bob, w, h, 8); ctx.fill();
    ctx.fillStyle = C.gold;
    ctx.fillRect(x, scarfY, w, 5);
    const sx = facing > 0 ? x : x + w;
    ctx.beginPath();
    ctx.moveTo(sx, scarfY);
    ctx.lineTo(sx - facing * 12, scarfY + 4 + Math.sin(time * 14) * 3);
    ctx.lineTo(sx, scarfY + 5);
    ctx.fill();
    eyes(x + w / 2 + facing * 3, y + bob + h * 0.24, 5, 4, facing, false);
  }

  function drawVillain(x, y, w, h, look) {
    ctx.fillStyle = C.villainDark;
    ctx.beginPath(); ctx.moveTo(x + w * 0.16, y + 4); ctx.lineTo(x + w * 0.27, y - h * 0.26); ctx.lineTo(x + w * 0.4, y + 4); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + w * 0.6, y + 4); ctx.lineTo(x + w * 0.73, y - h * 0.26); ctx.lineTo(x + w * 0.84, y + 4); ctx.fill();
    ctx.fillStyle = C.villain; rr(x, y, w, h, Math.min(12, w * 0.3)); ctx.fill();
    eyes(x + w / 2, y + h * 0.36, w * 0.17, Math.max(3, w * 0.1), look, true);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x + w * 0.34, y + h * 0.72); ctx.lineTo(x + w * 0.5, y + h * 0.64); ctx.lineTo(x + w * 0.66, y + h * 0.72); ctx.stroke();
  }

  function drawMinion(x, y, w, h) {
    ctx.fillStyle = C.villainDark; rr(x, y, w, h, 8); ctx.fill();
    ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(x + w / 2, y + h * 0.4, Math.min(w, h) * 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(x + w / 2 - 2, y + h * 0.42, Math.min(w, h) * 0.1, 0, Math.PI * 2); ctx.fill();
  }

  function star(cx, cy, r, color, rot) {
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = rot + i * Math.PI / 5 - Math.PI / 2;
      const rad = i % 2 ? r * 0.45 : r;
      ctx.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
    }
    ctx.closePath();
    ctx.fill();
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
    for (let i = 0; i < n; i++) {
      particles.push({ x, y, vx: rand(-140, 140), vy: rand(-200, 40), life: rand(0.3, 0.6), color });
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

  function hud(g, right) {
    for (let i = 0; i < g.maxLives; i++) heart(16 + i * 22, 14, 16, i < g.lives ? C.danger : 'rgba(255,255,255,0.16)');
    txt(`Очки ${g.score}`, W - 16, 28, 14, C.text, 700, 'right');
    if (right) txt(right, W / 2, 28, 13, C.text, 600, 'center');
  }

  /* ---------- Жанр 1: раннер ---------- */
  const SKY = Array.from({ length: 40 }, () => ({ x: rand(0, W), y: rand(10, 170), r: rand(0.6, 1.6) }));
  const CITY = Array.from({ length: 14 }, (_, i) => ({ x: i * 52, w: rand(36, 50), h: rand(50, 130) }));

  function makeRunner(d) {
    return {
      hero: { x: 90, y: GROUND - 40, w: 30, h: 40, vy: 0, onGround: true, inv: 0, coyote: 0 },
      obstacles: [], coins: [], dist: 0, nextAt: 520, goal: 6400,
      speed: 250 * d.speed, lives: d.lives, maxLives: d.lives, score: 0, bonus: 0, d,
      update(dt) {
        const h = this.hero;
        this.speed = Math.min(430, (250 + this.dist * 0.022) * this.d.speed);
        this.dist += this.speed * dt;
        this.score = Math.floor(this.dist / 20) + this.bonus;

        h.coyote -= dt; h.inv -= dt;
        if (jumpBuf > 0 && (h.onGround || h.coyote > 0)) { h.vy = -620; h.onGround = false; h.coyote = 0; jumpBuf = 0; }
        h.vy += 1900 * dt;
        h.y += h.vy * dt;
        if (h.y >= GROUND - h.h) {
          if (!h.onGround) h.coyote = 0.08;
          h.y = GROUND - h.h; h.vy = 0; h.onGround = true;
        } else if (h.onGround) { h.onGround = false; h.coyote = 0.08; }

        if (this.dist >= this.nextAt && this.dist < this.goal - 700) {
          const ow = rand(24, 40), oh = rand(26, 46);
          this.obstacles.push({ x: W + 20, y: GROUND - oh, w: ow, h: oh });
          if (Math.random() < 0.6) {
            const base = W + 20 + ow + rand(110, 150);
            for (let i = 0; i < 3; i++) this.coins.push({ x: base + i * 30, y: GROUND - 70 - Math.sin((i + 1) * Math.PI / 4) * 40, taken: false });
          }
          this.nextAt = this.dist + rand(300, 470) + (this.speed - 250) * 0.6;
        }
        for (const o of this.obstacles) o.x -= this.speed * dt;
        for (const c of this.coins) c.x -= this.speed * dt;
        this.obstacles = this.obstacles.filter(o => o.x + o.w > -20);
        this.coins = this.coins.filter(c => c.x > -20 && !c.taken);

        const hb = { x: h.x + 4, y: h.y + 4, w: h.w - 8, h: h.h - 6 };
        for (const o of this.obstacles) {
          if (h.inv <= 0 && overlap(hb, { x: o.x + 3, y: o.y + 3, w: o.w - 6, h: o.h - 3 })) {
            this.lives--; h.inv = 1.2; burst(h.x + h.w / 2, h.y + h.h / 2, C.danger);
            if (this.lives <= 0) return lose();
          }
        }
        for (const c of this.coins) {
          if (!c.taken && Math.abs(c.x - (h.x + h.w / 2)) < 22 && Math.abs(c.y - (h.y + h.h / 2)) < 26) {
            c.taken = true; this.bonus += 10; burst(c.x, c.y, C.gold, 6);
          }
        }
        if (this.dist >= this.goal) { burst(h.x + 60, h.y, C.gold, 24); return win(); }
      },
      draw() {
        ctx.fillStyle = '#100F1A'; ctx.fillRect(0, 0, W, H);
        for (const s of SKY) { ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(s.x, s.y, s.r, s.r); }
        const off = (this.dist * 0.25) % 728;
        for (const b of CITY) {
          const x = ((b.x - off) % 728 + 728) % 728 - 40;
          ctx.fillStyle = '#1C1B2A'; ctx.fillRect(x, GROUND - b.h, b.w, b.h);
          ctx.fillStyle = 'rgba(255, 209, 102, 0.35)';
          for (let wy = GROUND - b.h + 10; wy < GROUND - 12; wy += 18) ctx.fillRect(x + 8, wy, 6, 6);
        }
        ctx.fillStyle = '#272727'; ctx.fillRect(0, GROUND, W, H - GROUND);
        ctx.fillStyle = '#313131';
        const stripe = (this.dist) % 48;
        for (let x = -stripe; x < W; x += 48) ctx.fillRect(x, GROUND + 18, 24, 4);

        const p = clamp(this.dist / this.goal, 0, 1);
        const vx = 560 - Math.max(0, (p - 0.82) / 0.18) * 400;
        const vb = Math.abs(Math.sin(time * 10)) * 4;
        drawVillain(vx, GROUND - 46 - vb, 38, 46, -1);
        nameTag(cfg.villain, vx + 19, GROUND - 58 - vb);

        for (const c of this.coins) star(c.x, c.y, 9, C.gold, time * 2);
        for (const o of this.obstacles) drawMinion(o.x, o.y, o.w, o.h);

        const h = this.hero;
        const bob = h.onGround ? -Math.abs(Math.sin(this.dist / 18)) * 3 : 0;
        drawHero(h.x, h.y, h.w, h.h, 1, bob, h.inv > 0);
        nameTag(cfg.hero, h.x + h.w / 2, h.y + bob - 6);
        drawParticles();

        if (state === 'play') {
          hud(this);
          ctx.fillStyle = 'rgba(255,255,255,0.12)'; rr(180, 14, 280, 8, 4); ctx.fill();
          ctx.fillStyle = C.hero; rr(180, 14, Math.max(8, 280 * p), 8, 4); ctx.fill();
          txt('до злодея', 320, 40, 11, C.muted, 600, 'center');
        }
      }
    };
  }

  /* ---------- Жанр 2: космобой ---------- */
  const SPACE = Array.from({ length: 70 }, () => ({ x: rand(0, W), y: rand(0, H), s: rand(20, 90), r: rand(0.6, 1.8) }));

  function makeSpace(d) {
    return {
      ship: { x: W / 2, y: 312, w: 34, h: 30, inv: 0 },
      bullets: [], enemies: [], shots: [], kills: 0, need: 14, boss: null,
      fire: 0, spawn: 0.8, lives: d.lives, maxLives: d.lives, score: 0, d,
      update(dt) {
        const s = this.ship;
        s.inv -= dt;
        let dir = 0;
        if (keys.has('ArrowLeft') || keys.has('KeyA')) dir -= 1;
        if (keys.has('ArrowRight') || keys.has('KeyD')) dir += 1;
        let target = null;
        for (const p of ptrs.values()) target = p.x;
        if (target !== null) {
          const diff = target - s.x;
          s.x += clamp(diff, -520 * dt, 520 * dt);
        } else {
          s.x += dir * 380 * dt;
        }
        s.x = clamp(s.x, 24, W - 24);

        this.fire -= dt;
        if (this.fire <= 0) { this.bullets.push({ x: s.x, y: s.y - 18 }); this.fire = 0.2; }
        for (const b of this.bullets) b.y -= 560 * dt;
        this.bullets = this.bullets.filter(b => b.y > -10);

        if (!this.boss) {
          this.spawn -= dt;
          if (this.spawn <= 0) {
            this.enemies.push({ x: rand(40, W - 40), y: -20, r: 14, vy: rand(70, 130) * this.d.speed, ph: rand(0, 6.28) });
            this.spawn = rand(0.5, 0.95) / this.d.speed;
          }
        }
        for (const e of this.enemies) { e.y += e.vy * dt; e.x += Math.sin(time * 2 + e.ph) * 40 * dt; }

        for (const b of this.bullets) {
          for (const e of this.enemies) {
            if (!e.dead && Math.abs(b.x - e.x) < e.r + 3 && Math.abs(b.y - e.y) < e.r + 6) {
              e.dead = true; b.y = -100; this.kills++; this.score += 10; burst(e.x, e.y, C.villain, 8);
            }
          }
        }
        this.enemies = this.enemies.filter(e => !e.dead && e.y < H + 30);

        if (this.kills >= this.need && !this.boss) {
          this.boss = { x: W / 2 - 55, y: -80, w: 110, h: 62, hp: 24, max: 24, dir: 1, fire: 1.4 };
        }
        const bo = this.boss;
        if (bo) {
          if (bo.y < 70) bo.y += 60 * dt;
          bo.x += bo.dir * 110 * this.d.speed * dt;
          if (bo.x < 20 || bo.x + bo.w > W - 20) bo.dir *= -1;
          bo.fire -= dt;
          if (bo.fire <= 0 && bo.y >= 40) {
            const cx = bo.x + bo.w / 2, cy = bo.y + bo.h;
            for (const a of [-0.35, 0, 0.35]) this.shots.push({ x: cx, y: cy, vx: Math.sin(a) * 160, vy: 170 * this.d.speed });
            bo.fire = 1.0 / this.d.speed;
          }
          for (const b of this.bullets) {
            if (b.x > bo.x && b.x < bo.x + bo.w && b.y > bo.y && b.y < bo.y + bo.h) {
              burst(b.x, b.y, C.gold, 3); b.y = -100; bo.hp--; this.score += 5;
              if (bo.hp <= 0) { burst(bo.x + bo.w / 2, bo.y + bo.h / 2, C.villain, 40); this.score += 100; return win(); }
            }
          }
        }
        for (const sh of this.shots) { sh.x += sh.vx * dt; sh.y += sh.vy * dt; }
        this.shots = this.shots.filter(sh => sh.y < H + 10 && !sh.dead);

        if (s.inv <= 0) {
          const sb = { x: s.x - 13, y: s.y - 12, w: 26, h: 24 };
          for (const e of this.enemies) {
            if (overlap(sb, { x: e.x - e.r, y: e.y - e.r, w: e.r * 2, h: e.r * 2 })) { e.dead = true; return this.hurt(); }
          }
          for (const sh of this.shots) {
            if (overlap(sb, { x: sh.x - 5, y: sh.y - 5, w: 10, h: 10 })) { sh.dead = true; return this.hurt(); }
          }
        }
      },
      hurt() {
        this.lives--; this.ship.inv = 1.3; burst(this.ship.x, this.ship.y, C.danger, 12);
        if (this.lives <= 0) lose();
      },
      draw() {
        ctx.fillStyle = '#08080F'; ctx.fillRect(0, 0, W, H);
        for (const st of SPACE) {
          const y = (st.y + time * st.s) % H;
          ctx.fillStyle = `rgba(255,255,255,${0.25 + st.r * 0.25})`;
          ctx.fillRect(st.x, y, st.r, st.r * 2);
        }
        ctx.fillStyle = C.gold;
        for (const b of this.bullets) ctx.fillRect(b.x - 2, b.y - 8, 4, 12);
        for (const e of this.enemies) {
          ctx.fillStyle = C.villainDark; ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(e.x, e.y - 2, 5, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(e.x, e.y - 1, 2.5, 0, Math.PI * 2); ctx.fill();
        }
        const bo = this.boss;
        if (bo) {
          drawVillain(bo.x, bo.y, bo.w, bo.h, 0);
          nameTag(cfg.villain, bo.x + bo.w / 2, bo.y - 14);
          ctx.fillStyle = 'rgba(255,255,255,0.12)'; rr(bo.x, bo.y + bo.h + 8, bo.w, 6, 3); ctx.fill();
          ctx.fillStyle = C.villain; rr(bo.x, bo.y + bo.h + 8, Math.max(6, bo.w * bo.hp / bo.max), 6, 3); ctx.fill();
        }
        ctx.fillStyle = C.villain;
        for (const sh of this.shots) { ctx.beginPath(); ctx.arc(sh.x, sh.y, 5, 0, Math.PI * 2); ctx.fill(); }

        const s = this.ship;
        if (!(s.inv > 0 && Math.floor(time * 12) % 2)) {
          ctx.fillStyle = Math.floor(time * 20) % 2 ? C.gold : C.danger;
          ctx.beginPath(); ctx.moveTo(s.x - 6, s.y + 14); ctx.lineTo(s.x, s.y + 24 + rand(0, 6)); ctx.lineTo(s.x + 6, s.y + 14); ctx.fill();
          ctx.fillStyle = C.hero;
          ctx.beginPath(); ctx.moveTo(s.x, s.y - 18); ctx.lineTo(s.x + 17, s.y + 14); ctx.lineTo(s.x - 17, s.y + 14); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(s.x, s.y + 2, 5, 0, Math.PI * 2); ctx.fill();
        }
        nameTag(cfg.hero, s.x, s.y - 22);
        drawParticles();
        if (state === 'play') hud(this, bo ? `${cfg.villain}: ${bo.hp} из ${bo.max}` : `Сбито ${this.kills} из ${this.need}`);
      }
    };
  }

  /* ---------- Жанр 3: сборщик звёзд ---------- */
  const PLATFORMS = [
    { x: 0, y: 330, w: 640, h: 30 },
    { x: 70, y: 262, w: 130, h: 12 }, { x: 250, y: 212, w: 130, h: 12 }, { x: 440, y: 262, w: 130, h: 12 },
    { x: 140, y: 150, w: 120, h: 12 }, { x: 360, y: 112, w: 130, h: 12 }, { x: 540, y: 180, w: 90, h: 12 }
  ];
  const STAR_SPOTS = [[95, 236], [315, 186], [505, 236], [200, 124], [425, 86], [585, 154], [330, 304], [548, 302]];
  const BTN = { left: { x: 12, y: 300, w: 52, h: 48 }, right: { x: 72, y: 300, w: 52, h: 48 }, jump: { x: W - 64, y: 300, w: 52, h: 48 } };

  function makeCollector(d) {
    return {
      hero: { x: 150, y: 228, w: 26, h: 34, vy: 0, onGround: true, inv: 0, coyote: 0, facing: 1 },
      villain: { x: 300, y: 294, w: 34, h: 36, dir: 1, speed: 70 * d.speed },
      stars: STAR_SPOTS.map(([x, y]) => ({ x, y, taken: false })),
      lives: d.lives, maxLives: d.lives, score: 0, d,
      pressed(name) {
        for (const p of ptrs.values()) if (inRect(p, BTN[name])) return true;
        return false;
      },
      update(dt) {
        const h = this.hero;
        let dir = 0;
        if (keys.has('ArrowLeft') || keys.has('KeyA') || this.pressed('left')) dir -= 1;
        if (keys.has('ArrowRight') || keys.has('KeyD') || this.pressed('right')) dir += 1;
        if (dir) h.facing = dir;
        h.x = clamp(h.x + dir * 220 * dt, 0, W - h.w);
        h.inv -= dt; h.coyote -= dt;
        if (jumpBuf > 0 && (h.onGround || h.coyote > 0)) { h.vy = -640; h.onGround = false; h.coyote = 0; jumpBuf = 0; }
        const prevBottom = h.y + h.h;
        h.vy += 1800 * dt;
        h.y += h.vy * dt;
        const wasGround = h.onGround;
        h.onGround = false;
        if (h.vy >= 0) {
          for (const p of PLATFORMS) {
            if (prevBottom <= p.y + 1 && h.y + h.h >= p.y && h.x + h.w > p.x + 2 && h.x < p.x + p.w - 2) {
              h.y = p.y - h.h; h.vy = 0; h.onGround = true; break;
            }
          }
        }
        if (wasGround && !h.onGround) h.coyote = 0.08;

        const v = this.villain;
        v.x += v.dir * v.speed * dt;
        if (v.x < 170) { v.x = 170; v.dir = 1; }
        if (v.x + v.w > 610) { v.x = 610 - v.w; v.dir = -1; }

        for (const s of this.stars) {
          if (!s.taken && Math.abs(s.x - (h.x + h.w / 2)) < 20 && Math.abs(s.y - (h.y + h.h / 2)) < 24) {
            s.taken = true; this.score += 10; v.speed *= 1.08; burst(s.x, s.y, C.gold, 10);
          }
        }
        if (h.inv <= 0 && overlap({ x: h.x + 3, y: h.y + 3, w: h.w - 6, h: h.h - 3 }, { x: v.x + 4, y: v.y + 4, w: v.w - 8, h: v.h - 4 })) {
          this.lives--; burst(h.x + h.w / 2, h.y + h.h / 2, C.danger, 12);
          if (this.lives <= 0) return lose();
          h.x = 150; h.y = 228; h.vy = 0; h.inv = 1.5;
        }
        if (this.stars.every(s => s.taken)) { this.score += 50; return win(); }
      },
      draw() {
        ctx.fillStyle = '#121019'; ctx.fillRect(0, 0, W, H);
        for (const s of SKY) { ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(s.x, s.y, s.r, s.r); }
        ctx.fillStyle = 'rgba(255, 209, 102, 0.08)';
        ctx.beginPath(); ctx.arc(560, 60, 34, 0, Math.PI * 2); ctx.fill();
        for (const [i, p] of PLATFORMS.entries()) {
          ctx.fillStyle = i === 0 ? '#272727' : '#313131';
          rr(p.x, p.y, p.w, p.h, i === 0 ? 0 : 6); ctx.fill();
          if (i > 0) { ctx.fillStyle = 'rgba(255, 138, 31, 0.5)'; ctx.fillRect(p.x + 6, p.y, p.w - 12, 2); }
        }
        for (const s of this.stars) if (!s.taken) star(s.x, s.y + Math.sin(time * 3 + s.x) * 3, 10, C.gold, Math.sin(time + s.y) * 0.3);

        const v = this.villain;
        drawVillain(v.x, v.y, v.w, v.h, v.dir);
        nameTag(cfg.villain, v.x + v.w / 2, v.y - 10);

        const h = this.hero;
        drawHero(h.x, h.y, h.w, h.h, h.facing, 0, h.inv > 0);
        nameTag(cfg.hero, h.x + h.w / 2, h.y - 6);
        drawParticles();

        if (state === 'play') {
          const got = this.stars.filter(s => s.taken).length;
          hud(this, `Звёзды ${got} из ${this.stars.length}`);
          for (const [name, label] of [['left', '◀'], ['right', '▶'], ['jump', '▲']]) {
            const b = BTN[name];
            ctx.fillStyle = this.pressed(name) ? 'rgba(255, 138, 31, 0.5)' : 'rgba(255, 255, 255, 0.1)';
            rr(b.x, b.y, b.w, b.h, 12); ctx.fill();
            txt(label, b.x + b.w / 2, b.y + 31, 18, C.text, 700, 'center');
          }
        }
      }
    };
  }

  const MAKERS = { runner: makeRunner, space: makeSpace, collector: makeCollector };

  /* ---------- Состояния и экраны ---------- */
  function reset() {
    particles = [];
    jumpBuf = 0;
    game = MAKERS[cfg.genre](DIFF[cfg.diff]);
  }

  function start() {
    reset();
    state = 'play';
    canvas.setAttribute('aria-label', 'Идёт игра');
    schedule();
  }
  function win() { state = 'win'; endedAt = performance.now(); canvas.setAttribute('aria-label', 'Уровень пройден. Нажми, чтобы сыграть ещё'); }
  function lose() { state = 'lose'; endedAt = performance.now(); canvas.setAttribute('aria-label', 'Попытка не удалась. Нажми, чтобы попробовать снова'); }

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
    const g = GENRES[cfg.genre];
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
      txt(`Очки: ${game.score}`, W / 2, 122, 15, C.gold, 700, 'center');
      wrap(PURPOSES[cfg.purpose].result, 440, 14, 500, 3).forEach((l, i) => txt(l, W / 2, 162 + i * 20, 14, C.text, 500, 'center'));
      pill('Нажми, чтобы сыграть ещё', 246);
    } else {
      txt('Не получилось', W / 2, 108, 28, C.text, 700, 'center');
      wrap(`Злодей ${cfg.villain} пока впереди. Попробуй ещё раз, теперь ты знаешь, где ловушки`, 440, 14, 500, 3)
        .forEach((l, i) => txt(l, W / 2, 148 + i * 20, 14, C.text, 500, 'center'));
      pill('Нажми, чтобы попробовать снова', 236);
    }
  }

  function draw() {
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.clearRect(0, 0, W, H);
    game.draw();
    if (state === 'intro') drawIntro();
    else if (state === 'win') drawEnd(true);
    else if (state === 'lose') drawEnd(false);
  }

  function frame(ts) {
    raf = 0;
    const dt = Math.min(0.033, Math.max(0, (ts - last) / 1000));
    last = ts;
    time += dt;
    if (jumpBuf > 0) jumpBuf -= dt;
    if (state === 'play') game.update(dt);
    updateParticles(dt);
    draw();
    schedule();
  }

  function schedule() {
    if (!raf && inView && !document.hidden) {
      raf = requestAnimationFrame(ts => { if (!last || ts - last > 100) last = ts; frame(ts); });
    }
  }

  /* ---------- Ввод ---------- */
  function toGame(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
  }

  canvas.addEventListener('pointerdown', e => {
    e.preventDefault();
    canvas.focus({ preventScroll: true });
    const p = toGame(e);
    ptrs.set(e.pointerId, p);
    try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* не все браузеры */ }
    if (state === 'intro') return start();
    if (state !== 'play') { if (performance.now() - endedAt > 600) start(); return; }
    if (cfg.genre === 'runner') jumpBuf = 0.15;
    if (cfg.genre === 'collector' && inRect(p, BTN.jump)) jumpBuf = 0.15;
  });
  canvas.addEventListener('pointermove', e => { if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, toGame(e)); });
  const drop = e => ptrs.delete(e.pointerId);
  canvas.addEventListener('pointerup', drop);
  canvas.addEventListener('pointercancel', drop);
  canvas.addEventListener('lostpointercapture', drop);

  const GAME_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'Space', 'KeyA', 'KeyD', 'KeyW', 'Enter'];
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
    if ((e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') && !e.repeat) jumpBuf = 0.15;
  });
  window.addEventListener('keyup', e => keys.delete(e.code));
  window.addEventListener('blur', () => { keys.clear(); ptrs.clear(); });
  document.addEventListener('visibilitychange', () => { last = 0; schedule(); });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting;
      if (inView) { last = 0; schedule(); }
    }).observe(canvas);
  }
  if ('ResizeObserver' in window) new ResizeObserver(() => { fit(); if (!raf) draw(); }).observe(canvas);
  else window.addEventListener('resize', fit);

  /* ---------- Подписи под игрой ---------- */
  function renderMeta() {
    const g = GENRES[cfg.genre];
    titleEl.textContent = `${g.title}: ${cfg.hero}`;
    const small = document.createElement('small');
    small.textContent = `злодей ${cfg.villain} · ${PURPOSES[cfg.purpose].label} · сложность ${DIFF[cfg.diff].label}`;
    titleEl.appendChild(small);
    hintEl.textContent = '';
    for (const [key, label] of g.hint) {
      const kb = document.createElement('span');
      kb.className = 'kbd'; kb.textContent = key;
      hintEl.append(kb, ' ' + label + '  ');
    }
    if (!passportEl) return;
    const diff = DIFF[cfg.diff];
    const rows = [
      ['Жанр', g.title],
      ['Цель игрока', g.goal],
      ['Герой', cfg.hero],
      ['Злодей', cfg.villain],
      ['Сложность', cfg.diffWord ? `${diff.label}: в описании «${cfg.diffWord}»` : `${diff.label}: особых пожеланий нет`],
      ['Жизней', String(diff.lives)],
      ['Финал', PURPOSES[cfg.purpose].finale],
      ['Уровней', 'в демо 1, в пробе 3, в «Игре» до 10']
    ];
    passportEl.textContent = '';
    for (const [k2, v] of rows) {
      const row = document.createElement('div');
      const dt = document.createElement('dt'); dt.textContent = k2;
      const dd = document.createElement('dd'); dd.textContent = v;
      row.append(dt, dd);
      passportEl.append(row);
    }
  }

  /* ---------- Внешний вход ---------- */
  window.KuznyaDemo = {
    build(next) {
      cfg = Object.assign({}, cfg, next);
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
    canFullscreen: !!(document.fullscreenEnabled && screenEl.requestFullscreen),
    info() { return { state, genre: cfg.genre, diff: cfg.diff, score: game.score, lives: game.lives }; },
    _game() { return game; }
  };

  applyDifficulty();
  fit();
  reset();
  renderMeta();
  draw();
  schedule();
})();
