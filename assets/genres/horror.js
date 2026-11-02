/* Жанр «Хоррор-лабиринт»: лабиринт новый на каждом запуске, светит только фонарь героя.
   Найти латунный ключ, обойти прислужников (в темноте видны их фиолетовые глаза) и выйти через дверь, которую сторожит злодей */
MG.register('horror', {
  title: 'Хоррор-лабиринт',
  icon: 'lamp',
  controls: 'Стрелки или крестовина на экране',
  hint: [['Стрелки', 'ходить по лабиринту'], ['Крестовина', 'на телефоне']],
  goal: 'найти ключ в темноте и выйти через дверь',
  make(api) {
    const { W, H, C, rand, randInt, clamp, input } = api;
    const d = api.diff, lvl = api.cfg.diff;
    const COLS = 12, ROWS = 8, S = 38, X0 = 10, Y0 = 50;
    const MAZE_W = COLS * S;
    const BRASS = '#D9A441', BRASS_HI = '#F6D58A', EYE = '#C084FC';
    const HERO_SPEED = 4.2;
    const MINION_SPEED = (lvl === 'hard' ? 2 : 1.7) * d.speed;
    const LIGHT = { easy: 108, normal: 94, hard: 80 }[lvl] || 94;
    const UP = { b: 1, dx: 0, dy: -1 }, RIGHT = { b: 2, dx: 1, dy: 0 }, DOWN = { b: 4, dx: 0, dy: 1 }, LEFT = { b: 8, dx: -1, dy: 0 };
    const DIRS = [UP, RIGHT, DOWN, LEFT];
    const opp = dd => DIRS[(DIRS.indexOf(dd) + 2) % 4];
    const KEYMAP = { ArrowUp: UP, KeyW: UP, ArrowRight: RIGHT, KeyD: RIGHT, ArrowDown: DOWN, KeyS: DOWN, ArrowLeft: LEFT, KeyA: LEFT };
    const idx = (c, r) => r * COLS + c;
    const inside = (c, r) => c >= 0 && r >= 0 && c < COLS && r < ROWS;
    const px = c => X0 + c * S + S / 2, py = r => Y0 + r * S + S / 2;
    const pick = a => a[randInt(0, a.length - 1)];
    const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = randInt(0, i); [a[i], a[j]] = [a[j], a[i]]; } return a; };

    /* Лабиринт: рекурсивный бэктрекинг, потом часть тупиков открываем, чтобы от прислужника было куда уйти */
    const walls = new Array(COLS * ROWS).fill(15);
    const open = (c, r, dd) => !(walls[idx(c, r)] & dd.b);
    const exits = (c, r) => DIRS.filter(dd => open(c, r, dd));
    const carve = (c, r, dd) => { walls[idx(c, r)] &= ~dd.b; walls[idx(c + dd.dx, r + dd.dy)] &= ~opp(dd).b; };
    {
      const seen = new Array(COLS * ROWS).fill(false);
      const stack = [[0, 0]];
      seen[0] = true;
      while (stack.length) {
        const [c, r] = stack[stack.length - 1];
        const opts = DIRS.filter(dd => inside(c + dd.dx, r + dd.dy) && !seen[idx(c + dd.dx, r + dd.dy)]);
        if (!opts.length) { stack.pop(); continue; }
        const dd = pick(opts);
        carve(c, r, dd);
        seen[idx(c + dd.dx, r + dd.dy)] = true;
        stack.push([c + dd.dx, r + dd.dy]);
      }
    }
    function bfs(c0, r0) {
      const dist = new Array(COLS * ROWS).fill(-1);
      dist[idx(c0, r0)] = 0;
      const q = [[c0, r0]];
      for (let i = 0; i < q.length; i++) {
        const [c, r] = q[i];
        for (const dd of exits(c, r)) {
          const j = idx(c + dd.dx, r + dd.dy);
          if (dist[j] < 0) { dist[j] = dist[idx(c, r)] + 1; q.push([c + dd.dx, r + dd.dy]); }
        }
      }
      return dist;
    }
    const cells = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) cells.push({ c, r });
    const isStart = q => !q.c && !q.r;
    let dist = bfs(0, 0);
    /* Дверь: самый дальний тупик от старта, злодей стоит в нём и не пускает без ключа */
    const door = cells.filter(q => !isStart(q) && exits(q.c, q.r).length === 1)
      .reduce((a, q) => (dist[idx(q.c, q.r)] > dist[idx(a.c, a.r)] ? q : a));
    const isDoor = (c, r) => c === door.c && r === door.r;
    door.out = exits(door.c, door.r)[0];
    door.back = opp(door.out);
    const front = { c: door.c + door.out.dx, r: door.r + door.out.dy };
    for (const q of cells) {
      if (isDoor(q.c, q.r) || isStart(q) || exits(q.c, q.r).length !== 1 || Math.random() < 0.45) continue;
      const opts = DIRS.filter(dd => !open(q.c, q.r, dd) && inside(q.c + dd.dx, q.r + dd.dy) && !isDoor(q.c + dd.dx, q.r + dd.dy));
      if (opts.length) carve(q.c, q.r, pick(opts));
    }
    dist = bfs(0, 0);
    const fromDoor = bfs(door.c, door.r);
    /* Ключ: клетка, далёкая и от старта, и от двери, тупики в приоритете */
    const key = cells.filter(q => !isStart(q) && !isDoor(q.c, q.r) && !(q.c === front.c && q.r === front.r))
      .map(q => ({ c: q.c, r: q.r, s: Math.min(dist[idx(q.c, q.r)], fromDoor[idx(q.c, q.r)]) + (exits(q.c, q.r).length === 1 ? 1.5 : 0) + Math.random() }))
      .reduce((a, q) => (q.s > a.s ? q : a));
    const shade = cells.map(() => Math.random() < 0.5);
    const webs = shuffle(cells.filter(q => !isStart(q) && !isDoor(q.c, q.r) && exits(q.c, q.r).length === 1)).slice(0, 7)
      .map(q => ({ c: q.c, r: q.r, corner: randInt(0, 3) }));

    const far = shuffle(cells.filter(q => dist[idx(q.c, q.r)] >= (lvl === 'easy' ? 7 : 6) && !isDoor(q.c, q.r) && !(q.c === key.c && q.r === key.r)));
    const minions = far.slice(0, lvl === 'hard' ? 3 : 2)
      .map(q => ({ c: q.c, r: q.r, tc: q.c, tr: q.r, p: 0, dir: null, last: null, ph: rand(0, 6) }));

    const pos = o => ({ x: px(o.c) + (o.dir ? o.dir.dx * o.p * S : 0), y: py(o.r) + (o.dir ? o.dir.dy * o.p * S : 0) });
    function turnBack(o) {
      if (!o.dir) return;
      [o.c, o.tc] = [o.tc, o.c];
      [o.r, o.tr] = [o.tr, o.r];
      o.p = 1 - o.p;
      o.dir = opp(o.dir);
    }
    function stepMinion(m, dt) {
      let step = MINION_SPEED * dt, guard = 0;
      while (step > 1e-6 && guard++ < 6) {
        if (!m.dir) {
          let opts = exits(m.c, m.r).filter(dd => !isDoor(m.c + dd.dx, m.r + dd.dy));
          if (opts.length > 1 && m.last) opts = opts.filter(dd => dd !== opp(m.last));
          if (!opts.length) break;
          m.dir = pick(opts); m.tc = m.c + m.dir.dx; m.tr = m.r + m.dir.dy; m.p = 0;
        }
        const need = 1 - m.p;
        if (step >= need) { step -= need; m.c = m.tc; m.r = m.tr; m.last = m.dir; m.dir = null; m.p = 0; }
        else { m.p += step; step = 0; }
      }
    }

    /* Экранная крестовина: 4 кнопки по 50 единиц в правой панели, касание считается по углу от центра */
    const PAD = { x: 554, y: 281 };
    const BTN = [
      { dd: UP, label: '▲', x: 529, y: 206, w: 50, h: 50 },
      { dd: LEFT, label: '◀', x: 479, y: 256, w: 50, h: 50 },
      { dd: RIGHT, label: '▶', x: 579, y: 256, w: 50, h: 50 },
      { dd: DOWN, label: '▼', x: 529, y: 306, w: 50, h: 50 }
    ];
    function padDir(p) {
      const dx = p.x - PAD.x, dy = p.y - PAD.y, r = Math.hypot(dx, dy);
      if (r < 6 || r > 86) return null;
      return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? RIGHT : LEFT) : (dy > 0 ? DOWN : UP);
    }

    /* Темнота: отдельный холст, заливка тьмой и вырез светом фонаря */
    let mask = null, mctx = null;
    function darkness(x, y, r) {
      const ctx = api.ctx, cw = ctx.canvas.width, ch = ctx.canvas.height;
      if (!mask) { mask = document.createElement('canvas'); mctx = mask.getContext('2d'); }
      if (mask.width !== cw || mask.height !== ch) { mask.width = cw; mask.height = ch; }
      const s = cw / W;
      mctx.setTransform(1, 0, 0, 1, 0, 0);
      mctx.globalCompositeOperation = 'source-over';
      mctx.clearRect(0, 0, cw, ch);
      mctx.setTransform(s, 0, 0, s, 0, 0);
      mctx.fillStyle = 'rgba(4, 3, 9, 0.97)';
      mctx.fillRect(0, 0, W, H);
      mctx.globalCompositeOperation = 'destination-out';
      const g = mctx.createRadialGradient(x, y, r * 0.12, x, y, r);
      g.addColorStop(0, 'rgba(0, 0, 0, 1)');
      g.addColorStop(0.55, 'rgba(0, 0, 0, 0.85)');
      g.addColorStop(1, 'rgba(0, 0, 0, 0)');
      mctx.fillStyle = g;
      mctx.beginPath(); mctx.arc(x, y, r, 0, Math.PI * 2); mctx.fill();
      mctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(mask, 0, 0, W, H);
    }

    function drawKey(x, y, color, alpha = 1) {
      const ctx = api.ctx;
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(x - 7, y, 5, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - 2, y); ctx.lineTo(x + 11, y); ctx.moveTo(x + 7, y); ctx.lineTo(x + 7, y + 5); ctx.moveTo(x + 11, y); ctx.lineTo(x + 11, y + 4); ctx.stroke();
      ctx.strokeStyle = BRASS_HI; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(x - 7, y, 5, Math.PI * 1.1, Math.PI * 1.6); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    function drawShade(x, y, ph) {
      const ctx = api.ctx, t = api.time, w = 24, h = 26, top = y - 15 + Math.sin(t * 4 + ph) * 2;
      ctx.fillStyle = C.villainDark;
      ctx.beginPath();
      ctx.moveTo(x - w / 2, top + h);
      ctx.lineTo(x - w / 2, top + w / 2);
      ctx.arc(x, top + w / 2, w / 2, Math.PI, 0);
      ctx.lineTo(x + w / 2, top + h);
      for (let i = 0; i < 3; i++) {
        const x2 = x + w / 2 - (i + 1) * w / 3;
        ctx.quadraticCurveTo(x2 + w / 6, top + h + (i % 2 ? 5 : -5) * Math.sin(t * 6 + ph), x2, top + h);
      }
      ctx.closePath(); ctx.fill();
      return top;
    }
    function drawWeb(wb) {
      const ctx = api.ctx, x0 = X0 + wb.c * S, y0 = Y0 + wb.r * S;
      const cx = wb.corner === 1 || wb.corner === 2 ? x0 + S - 3 : x0 + 3;
      const cy = wb.corner >= 2 ? y0 + S - 3 : y0 + 3;
      const sx = cx > x0 + S / 2 ? -1 : 1, sy = cy > y0 + S / 2 ? -1 : 1;
      ctx.strokeStyle = 'rgba(214, 210, 230, 0.22)'; ctx.lineWidth = 1;
      ctx.beginPath();
      for (const a of [0, 0.5, 1]) { ctx.moveTo(cx, cy); ctx.lineTo(cx + sx * 15 * Math.cos(a * Math.PI / 2), cy + sy * 15 * Math.sin(a * Math.PI / 2)); }
      for (const rr of [6, 11]) {
        ctx.moveTo(cx + sx * rr, cy);
        ctx.quadraticCurveTo(cx + sx * rr * 0.55, cy + sy * rr * 0.55, cx, cy + sy * rr);
      }
      ctx.stroke();
    }
    function wallPath() {
      const ctx = api.ctx;
      ctx.beginPath();
      for (const q of cells) {
        const w = walls[idx(q.c, q.r)], x = X0 + q.c * S, y = Y0 + q.r * S;
        if (w & UP.b) { ctx.moveTo(x, y); ctx.lineTo(x + S, y); }
        if (w & LEFT.b) { ctx.moveTo(x, y); ctx.lineTo(x, y + S); }
        if (q.r === ROWS - 1 && (w & DOWN.b)) { ctx.moveTo(x, y + S); ctx.lineTo(x + S, y + S); }
        if (q.c === COLS - 1 && (w & RIGHT.b)) { ctx.moveTo(x + S, y); ctx.lineTo(x + S, y + S); }
      }
    }
    function tagBox(str, x, y) {
      api.ctx.font = `600 11px ${api.FONT}`;
      const half = (api.ctx.measureText(str).width + 12) / 2;
      return { x: clamp(x, X0 + half, X0 + MAZE_W - half), y, half };
    }
    function tag(str, x, y) {
      const b = tagBox(str, x, y);
      api.nameTag(str, b.x, b.y);
      return b;
    }

    const g = {
      lives: d.lives, score: 0,
      hero: { c: 0, r: 0, tc: 0, tr: 0, p: 0, dir: null, facing: 1, inv: 0 },
      minions, hasKey: false, done: false, auto: null,
      queued: null, queuedT: 0, lastKey: null, msg: '', msgT: 0, near: 999,
      status() { return this.hasKey ? 'Ключ у тебя, ищи дверь' : 'Найди латунный ключ'; },
      say(text) { this.msg = text; this.msgT = Math.max(this.msgT, 1.6); },
      cheat() {
        this.lives = 99; this.hasKey = true;
        Object.assign(this.hero, { c: front.c, r: front.r, tc: front.c, tr: front.r, p: 0, dir: null, inv: 9 });
        this.auto = opp(door.out);
      },
      onKey(code) {
        if (!KEYMAP[code]) return;
        this.lastKey = code; this.queued = KEYMAP[code]; this.queuedT = 0.25;
      },
      onPointerDown(p) {
        const dd = padDir(p);
        if (dd) { this.queued = dd; this.queuedT = 0.3; }
      },
      wants() {
        if (this.auto) return [this.auto];
        const out = [];
        for (const p of input.ptrs.values()) { const dd = padDir(p); if (dd) out.push(dd); }
        if (this.lastKey && input.keys.has(this.lastKey)) out.push(KEYMAP[this.lastKey]);
        for (const code of input.keys) if (KEYMAP[code]) out.push(KEYMAP[code]);
        if (this.queuedT > 0 && this.queued) out.push(this.queued);
        return out;
      },
      canGo(c, r, dd) { return open(c, r, dd) && (this.hasKey || !isDoor(c + dd.dx, r + dd.dy)); },
      moveHero(dt) {
        const h = this.hero, want = this.wants();
        let step = HERO_SPEED * dt, guard = 0;
        while (step > 1e-6 && guard++ < 8) {
          if (!h.dir) {
            const dd = want.find(w => this.canGo(h.c, h.r, w));
            if (!dd) {
              const w0 = want[0];
              if (w0 && !this.hasKey && open(h.c, h.r, w0) && isDoor(h.c + w0.dx, h.r + w0.dy)) this.say(`Без ключа ${api.cfg.villain} не пустит`);
              break;
            }
            h.dir = dd; h.tc = h.c + dd.dx; h.tr = h.r + dd.dy; h.p = 0;
            if (dd.dx) h.facing = dd.dx;
            if (dd === this.queued) this.queuedT = 0;
          } else if (want[0] && want[0] === opp(h.dir)) {
            turnBack(h);
            if (h.dir.dx) h.facing = h.dir.dx;
            if (h.dir === this.queued) this.queuedT = 0;
          }
          const need = 1 - h.p;
          if (step >= need) {
            step -= need; h.c = h.tc; h.r = h.tr; h.p = 0; h.dir = null;
            this.arrive();
            if (this.done) return;
          } else { h.p += step; step = 0; }
        }
      },
      arrive() {
        const h = this.hero;
        if (!this.hasKey && h.c === key.c && h.r === key.r) {
          this.hasKey = true; this.score += 100;
          api.burst(px(h.c), py(h.r), BRASS, 16);
          this.msgT = 0; this.say('Ключ найден! Теперь к двери');
        }
        if (this.hasKey && isDoor(h.c, h.r)) {
          this.done = true;
          this.score += 200 + Math.min(this.lives, d.lives) * 50;
          api.burst(px(h.c), py(h.r), C.gold, 30);
          api.burst(px(h.c), py(h.r), C.villain, 16);
          api.win();
        }
      },
      update(dt) {
        if (this.done) return;
        this.msgT -= dt; this.queuedT -= dt;
        const h = this.hero;
        h.inv -= dt;
        this.moveHero(dt);
        if (this.done) return;
        for (const m of this.minions) stepMinion(m, dt);
        const hp = pos(h);
        let near = 999;
        for (const m of this.minions) {
          const mp = pos(m), dd = Math.hypot(mp.x - hp.x, mp.y - hp.y);
          near = Math.min(near, dd);
          if (dd < S * 0.6 && h.inv <= 0) {
            this.lives--; h.inv = 1.6;
            api.burst(hp.x, hp.y, C.danger, 12);
            turnBack(m);
            if (this.lives <= 0) return api.lose();
            this.msgT = 0; this.say('Ай! Прислужник напугал');
          }
        }
        this.near = near;
      },
      draw() {
        const ctx = api.ctx, t = api.time, h = this.hero, hp = pos(h);
        ctx.fillStyle = '#06050B'; ctx.fillRect(0, 0, W, H);
        for (const q of cells) {
          ctx.fillStyle = shade[idx(q.c, q.r)] ? '#1C1928' : '#191623';
          ctx.fillRect(X0 + q.c * S, Y0 + q.r * S, S, S);
        }
        for (const wb of webs) drawWeb(wb);
        ctx.lineCap = 'round';
        wallPath(); ctx.strokeStyle = '#3F3758'; ctx.lineWidth = 6; ctx.stroke();
        wallPath(); ctx.strokeStyle = '#5E5486'; ctx.lineWidth = 2; ctx.stroke();

        /* Дверь в дальней стене тупика */
        {
          const x0 = X0 + door.c * S, y0 = Y0 + door.r * S;
          const vert = door.back === LEFT || door.back === RIGHT;
          const mx = door.back === LEFT ? x0 : door.back === RIGHT ? x0 + S : x0 + S / 2;
          const my = door.back === UP ? y0 : door.back === DOWN ? y0 + S : y0 + S / 2;
          ctx.save(); ctx.translate(mx, my); if (vert) ctx.rotate(Math.PI / 2);
          if (this.hasKey) { ctx.fillStyle = `rgba(255, 209, 102, ${0.25 + 0.15 * Math.sin(t * 5)})`; api.rr(-21, -9, 42, 18, 8); ctx.fill(); }
          ctx.fillStyle = '#6B4423'; api.rr(-16, -5, 32, 10, 3); ctx.fill();
          ctx.strokeStyle = BRASS; ctx.lineWidth = 2; ctx.stroke();
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(-6, -4); ctx.lineTo(-6, 4); ctx.moveTo(6, -4); ctx.lineTo(6, 4); ctx.stroke();
          ctx.fillStyle = '#120F08'; ctx.beginPath(); ctx.arc(0, 0, 2, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        }
        if (!this.hasKey) drawKey(px(key.c), py(key.r) + Math.sin(t * 3) * 2, BRASS);

        /* Злодей в тупике у двери: дрожит, когда герой с ключом рядом */
        const scared = this.hasKey && Math.hypot(hp.x - px(door.c), hp.y - py(door.r)) < S * 3;
        const vx = px(door.c) - 13 + (scared ? Math.sin(t * 40) * 1.5 : 0), vy = py(door.r) - 11 + Math.sin(t * 2) * 1.5;
        api.drawVillain(vx, vy, 26, 26, Math.sign(hp.x - px(door.c)));

        const tops = this.minions.map(m => { const mp = pos(m); return { x: mp.x, top: drawShade(mp.x, mp.y, m.ph), ph: m.ph, dir: m.dir }; });

        const bob = h.dir ? -Math.abs(Math.sin(t * 14)) * 2 : 0;
        api.drawHero(hp.x - 10, hp.y - 13, 20, 24, h.facing, bob, h.inv > 0);
        const lx = hp.x + h.facing * 13, ly = hp.y + 3 + bob;
        ctx.strokeStyle = BRASS; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(lx, ly - 6, 3, Math.PI, 0); ctx.stroke();
        ctx.fillStyle = BRASS; ctx.fillRect(lx - 3.5, ly - 6, 7, 2); ctx.fillRect(lx - 3.5, ly + 4, 7, 2);
        ctx.fillStyle = '#FFE7A3'; ctx.fillRect(lx - 2.5, ly - 4, 5, 8);

        /* Свет фонаря: лёгкое мерцание, дрожит сильнее, когда прислужник близко */
        const fear = clamp(1 - (this.near - 30) / 90, 0, 1);
        const R = LIGHT * (1 + 0.03 * Math.sin(t * 17) + 0.02 * Math.sin(t * 43 + 1.3) + fear * 0.07 * Math.sin(t * 31));
        const lightX = hp.x + h.facing * 6, lightY = hp.y;
        darkness(lightX, lightY, R);
        const warm = ctx.createRadialGradient(lightX, lightY, 0, lightX, lightY, R);
        warm.addColorStop(0, 'rgba(255, 196, 110, 0.16)');
        warm.addColorStop(1, 'rgba(255, 196, 110, 0)');
        ctx.fillStyle = warm; ctx.fillRect(lightX - R, lightY - R, R * 2, R * 2);

        /* Поверх тьмы: глаза прислужников, глаза и имя злодея, блеск ключа */
        ctx.shadowColor = '#A855F7'; ctx.shadowBlur = 10; ctx.fillStyle = EYE;
        for (const m of tops) {
          const look = m.dir ? m.dir.dx * 2 : 0, ey = m.top + 10;
          if ((t + m.ph) % 3.4 < 0.14) { ctx.fillRect(m.x - 8 + look, ey, 6, 1.5); ctx.fillRect(m.x + 2 + look, ey, 6, 1.5); }
          else for (const s of [-1, 1]) {
            ctx.fillStyle = EYE; ctx.beginPath(); ctx.ellipse(m.x + s * 5 + look, ey, 2.8, 3.6, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#F5E8FF'; ctx.beginPath(); ctx.arc(m.x + s * 5 + look, ey - 0.5, 1.2, 0, Math.PI * 2); ctx.fill();
          }
          ctx.fillStyle = EYE;
        }
        ctx.shadowColor = C.gold; ctx.fillStyle = C.gold;
        for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(vx + 13 + s * 4.4, vy + 9.4, 1.8, 0, Math.PI * 2); ctx.fill(); }
        ctx.shadowBlur = 0;
        /* Имя злодея над его клеткой; у верхнего края или когда герой стоит сверху - под клеткой */
        const heroAbove = Math.abs(hp.x - px(door.c)) < S * 1.6 && hp.y < py(door.r) - S * 0.3 && hp.y > py(door.r) - S * 1.8;
        const vTagY = door.r === 0 || (heroAbove && door.r < ROWS - 1) ? Y0 + (door.r + 1) * S + 17 : Y0 + door.r * S - 1;
        const vTag = heroAbove && door.r === ROWS - 1 ? null : tag(api.cfg.villain, px(door.c), vTagY);
        if (!this.hasKey) {
          const ph = (t % 2.6) / 2.6;
          if (ph < 0.3) {
            const a = Math.sin(ph / 0.3 * Math.PI) * 0.7, kx = px(key.c) - 7, ky = py(key.r) - 6, r = 6;
            ctx.fillStyle = `rgba(255, 231, 163, ${a})`;
            ctx.beginPath(); ctx.moveTo(kx, ky - r); ctx.lineTo(kx + 1.5, ky - 1.5); ctx.lineTo(kx + r, ky); ctx.lineTo(kx + 1.5, ky + 1.5);
            ctx.lineTo(kx, ky + r); ctx.lineTo(kx - 1.5, ky + 1.5); ctx.lineTo(kx - r, ky); ctx.lineTo(kx - 1.5, ky - 1.5); ctx.closePath(); ctx.fill();
          }
        }
        /* Имя героя над ним, а у верхнего края или рядом с именем злодея - под ним */
        const above = hp.y - 16 + bob;
        const nearX = Math.abs(hp.x - px(door.c)) < S * 2.6;
        const clash = nearX && (Math.abs(above - vTagY) < 20 || (above > py(door.r) - 34 && above < py(door.r) + 34));
        const tagY = hp.y < Y0 + S * 0.9 || clash ? hp.y + 32 : above;
        const hTag = tagBox(api.cfg.hero, hp.x, tagY);
        const hit = vTag && Math.abs(hTag.x - vTag.x) < hTag.half + vTag.half + 4 && Math.abs(hTag.y - vTag.y) < 20;
        if (tagY < H - 2 && !hit) tag(api.cfg.hero, hp.x, tagY);

        /* Правая панель: ключ, цель, крестовина */
        ctx.fillStyle = '#0C0B12'; api.rr(474, 50, 160, 308, 12); ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)'; ctx.lineWidth = 1; ctx.stroke();
        api.txt('Ключ', 488, 72, 12, C.muted, 600);
        api.txt('Выход', 562, 72, 12, C.muted, 600);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        api.rr(488, 80, 60, 44, 10); ctx.fill();
        api.rr(562, 80, 60, 44, 10); ctx.fill();
        if (this.hasKey) drawKey(520, 101, BRASS);
        else drawKey(520, 101, 'rgba(255, 255, 255, 0.18)');
        ctx.fillStyle = this.hasKey ? '#8A5A2E' : '#3A2A1D'; api.rr(580, 86, 24, 32, 4); ctx.fill();
        ctx.strokeStyle = this.hasKey ? BRASS : 'rgba(217, 164, 65, 0.4)'; ctx.lineWidth = 2; ctx.stroke();
        if (!this.hasKey) {
          ctx.fillStyle = C.muted; api.rr(586, 100, 12, 9, 2); ctx.fill();
          ctx.strokeStyle = C.muted; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(592, 100, 4, Math.PI, 0); ctx.stroke();
        } else { ctx.fillStyle = BRASS; ctx.beginPath(); ctx.arc(598, 103, 2, 0, Math.PI * 2); ctx.fill(); }
        const goal = this.hasKey ? `Беги к двери! ${api.cfg.villain} боится ключа` : `Найди ключ. Дверь сторожит ${api.cfg.villain}`;
        api.wrap(goal, 134, 12, 600, 3).forEach((l, i) => api.txt(l, 488, 148 + i * 16, 12, C.text, 600));
        ctx.fillStyle = 'rgba(255, 255, 255, 0.04)'; api.rr(529, 256, 50, 50, 10); ctx.fill();
        const held = this.wants();
        for (const b of BTN) api.button(b, b.label, held.includes(b.dd) && !this.auto);

        if (this.msgT > 0 && this.msg) {
          ctx.globalAlpha = clamp(this.msgT * 2, 0, 1);
          ctx.font = `700 13px ${api.FONT}`;
          const w = ctx.measureText(this.msg).width + 28, mx = X0 + MAZE_W / 2;
          const my = hp.y > Y0 + ROWS * S / 2 ? 58 : 314;
          ctx.fillStyle = 'rgba(11, 11, 14, 0.88)'; api.rr(mx - w / 2, my, w, 30, 15); ctx.fill();
          ctx.strokeStyle = 'rgba(255, 209, 102, 0.35)'; ctx.lineWidth = 1; ctx.stroke();
          api.txt(this.msg, mx, my + 20, 13, C.gold, 700, 'center');
          ctx.globalAlpha = 1;
        }
      }
    };
    return g;
  }
});
