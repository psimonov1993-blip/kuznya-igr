/* Жанр «Три в ряд»: меняй соседние самоцветы, собирай ряды из трёх и больше, набери очки до цели за 20 ходов.
   Злодей сбоку охраняет самоцветы и грустнеет, чем ближе игрок к цели */
MG.register('match3', {
  title: 'Три в ряд',
  icon: 'diamonds-four',
  controls: 'Поменяй соседние камни: два касания или свайп',
  hint: [['Клик, клик', 'обмен соседей'], ['Свайп', 'на телефоне']],
  goal: 'набрать нужные очки за 20 ходов',
  make(api) {
    const { C, randInt, clamp } = api;
    const lvl = api.cfg.diff;
    const COLS = 8, ROWS = 6, S = 50, X0 = 222, Y0 = 52;
    const GOAL = { easy: 900, normal: 1200, hard: 1500 }[lvl] || 1200;
    const MOVES = 20;
    const KINDS = [
      { color: '#FF6B6B', shape: 'circle' },
      { color: '#FFD166', shape: 'diamond' },
      { color: '#5EEAD4', shape: 'square' },
      { color: '#A78BFA', shape: 'triangle' },
      { color: '#FF8A1F', shape: 'hex' },
      { color: '#F472B6', shape: 'star' }
    ];
    const NK = lvl === 'easy' ? 5 : 6;

    /* Поле: grid[r][c] = камень { k, x, y } (x, y - где камень нарисован сейчас, в клетках) */
    const grid = Array.from({ length: ROWS }, () => new Array(COLS).fill(null));
    const stone = (k, c, y) => ({ k, x: c, y, vy: 0, pop: 0, dying: false, s: 1 });
    const kindAt = (c, r) => (r >= 0 && r < ROWS && c >= 0 && c < COLS && grid[r][c] ? grid[r][c].k : -1);
    const swapCells = (c1, r1, c2, r2) => { const t = grid[r1][c1]; grid[r1][c1] = grid[r2][c2]; grid[r2][c2] = t; };
    function kindNoMatch(c, r) {
      const bad = new Set();
      if (c >= 2 && kindAt(c - 1, r) === kindAt(c - 2, r)) bad.add(kindAt(c - 1, r));
      if (r >= 2 && kindAt(c, r - 1) === kindAt(c, r - 2)) bad.add(kindAt(c, r - 1));
      let k;
      do { k = randInt(0, NK - 1); } while (bad.has(k));
      return k;
    }
    function findMatches() {
      const hit = new Set();
      let bonus = 0;
      const run = (cellsOf, len) => {
        let n = 1;
        for (let i = 1; i <= len; i++) {
          const a = cellsOf(i), b = cellsOf(i - 1);
          if (i < len && kindAt(a[0], a[1]) >= 0 && kindAt(a[0], a[1]) === kindAt(b[0], b[1])) { n++; continue; }
          if (n >= 3) {
            for (let j = i - n; j < i; j++) { const q = cellsOf(j); hit.add(q[1] * COLS + q[0]); }
            bonus += n === 4 ? 20 : n >= 5 ? 50 : 0;
          }
          n = 1;
        }
      };
      for (let r = 0; r < ROWS; r++) run(i => [i, r], COLS);
      for (let c = 0; c < COLS; c++) run(i => [c, i], ROWS);
      return { hit, bonus };
    }
    function findMove() {
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          for (const [dc, dr] of [[1, 0], [0, 1]]) {
            const c2 = c + dc, r2 = r + dr;
            if (c2 >= COLS || r2 >= ROWS) continue;
            swapCells(c, r, c2, r2);
            const n = findMatches().hit.size;
            swapCells(c, r, c2, r2);
            if (n) return [c, r, c2, r2];
          }
        }
      }
      return null;
    }
    function fillBoard(grow) {
      for (let tries = 0; tries < 60; tries++) {
        for (let r = 0; r < ROWS; r++) grid[r].fill(null);
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { const st = stone(kindNoMatch(c, r), c, r); if (grow) st.s = 0; grid[r][c] = st; }
        if (findMove()) return;
      }
    }
    fillBoard(false);

    /* Рисовалки: у каждого цвета своя форма, чтобы камни различались не только цветом */
    function shapePath(shape, x, y, r) {
      const ctx = api.ctx;
      if (shape === 'square') return api.rr(x - r * 0.78, y - r * 0.78, r * 1.56, r * 1.56, r * 0.3);
      ctx.beginPath();
      if (shape === 'circle') ctx.arc(x, y, r * 0.92, 0, Math.PI * 2);
      else if (shape === 'diamond') { ctx.moveTo(x, y - r); ctx.lineTo(x + r * 0.82, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r * 0.82, y); }
      else if (shape === 'triangle') { ctx.moveTo(x, y - r); ctx.lineTo(x + r * 0.98, y + r * 0.78); ctx.lineTo(x - r * 0.98, y + r * 0.78); }
      else if (shape === 'hex') for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + i * Math.PI / 3; ctx.lineTo(x + Math.cos(a) * r * 0.95, y + Math.sin(a) * r * 0.95); }
      else for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? r * 0.5 : r * 1.05; ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad); }
      ctx.closePath();
    }
    function drawStone(k, x, y, r) {
      if (r <= 0.5) return;
      const ctx = api.ctx, K = KINDS[k];
      shapePath(K.shape, x, y, r);
      ctx.fillStyle = K.color; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)'; ctx.stroke();
      shapePath(K.shape, x, y + (K.shape === 'triangle' ? r * 0.12 : 0), r * 0.52);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'; ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.beginPath(); ctx.ellipse(x - r * 0.3, y - r * 0.36, r * 0.2, r * 0.11, -0.6, 0, Math.PI * 2); ctx.fill();
    }
    /* Злодей с настроением: m = 0 ухмыляется и хмурит брови, m = 1 грустит и плачет */
    function moodVillain(x, y, w, h, m) {
      const ctx = api.ctx, t = api.time;
      ctx.fillStyle = C.villainDark;
      ctx.beginPath(); ctx.moveTo(x + w * 0.16, y + 4); ctx.lineTo(x + w * 0.27, y - h * 0.26); ctx.lineTo(x + w * 0.4, y + 4); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x + w * 0.6, y + 4); ctx.lineTo(x + w * 0.73, y - h * 0.26); ctx.lineTo(x + w * 0.84, y + 4); ctx.fill();
      ctx.fillStyle = C.villain; api.rr(x, y, w, h, Math.min(12, w * 0.3)); ctx.fill();
      const ecx = x + w / 2, ecy = y + h * 0.36, gap = w * 0.17, er = Math.max(3, w * 0.1);
      api.eyes(ecx, ecy, gap, er, m > 0.7 ? 0 : Math.sin(t * 0.8) * 0.8, false);
      const tilt = m < 0.35 ? 1 : m < 0.7 ? 0 : -1;
      ctx.strokeStyle = C.ink; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      for (const s of [-1, 1]) {
        const ox = ecx + s * gap;
        ctx.beginPath(); ctx.moveTo(ox + s * er, ecy - er - 4 - tilt * 2.5); ctx.lineTo(ox - s * er, ecy - er - 4 + tilt * 2.5); ctx.stroke();
      }
      const my = y + h * 0.74, curve = (0.4 - m) * h * 0.3;
      ctx.beginPath(); ctx.moveTo(x + w * 0.32, my); ctx.quadraticCurveTo(x + w * 0.5, my + curve, x + w * 0.68, my); ctx.stroke();
      if (m >= 0.7) {
        const f = (t * 0.9) % 1;
        ctx.globalAlpha = 1 - f;
        ctx.fillStyle = '#7DD3FC';
        const tx = ecx + gap + er * 0.6, ty = ecy + er + 3 + f * 16;
        ctx.beginPath(); ctx.moveTo(tx, ty - 5); ctx.quadraticCurveTo(tx + 4, ty + 1, tx, ty + 3); ctx.quadraticCurveTo(tx - 4, ty + 1, tx, ty - 5); ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    const g = {
      lives: 1, maxLives: 0, score: 0, moves: MOVES,
      phase: 'idle', timer: 0, chain: 0, pair: null, sel: null, drag: null, cur: null,
      hintMove: findMove(), idleT: 0, flinch: 0, msg: '', msgT: 0, float: null, auto: false, ended: false,
      status() { return `Ходы ${this.moves} · цель ${GOAL}`; },
      say(text) { this.msg = text; this.msgT = 1.3; },
      cheat() {
        this.lives = 99; this.auto = true;
        this.score = Math.max(this.score, GOAL - 10);
        this.moves = Math.max(this.moves, 1);
      },
      trySwap(c1, r1, c2, r2) {
        if (this.phase !== 'idle' || this.ended) return;
        if (Math.abs(c1 - c2) + Math.abs(r1 - r2) !== 1) return;
        swapCells(c1, r1, c2, r2);
        this.pair = [c1, r1, c2, r2];
        this.phase = 'swap'; this.sel = null; this.drag = null; this.idleT = 0;
      },
      cellAt(p) {
        const c = Math.floor((p.x - X0) / S), r = Math.floor((p.y - Y0) / S);
        return c >= 0 && r >= 0 && c < COLS && r < ROWS ? { c, r } : null;
      },
      /* Касание: выбрать камень, второе касание по соседу меняет их, по тому же снимает выбор */
      press(cell) {
        this.idleT = 0;
        if (this.phase !== 'idle' || this.ended) return false;
        const s = this.sel;
        if (s && Math.abs(s.c - cell.c) + Math.abs(s.r - cell.r) === 1) { this.trySwap(s.c, s.r, cell.c, cell.r); return false; }
        const same = !!(s && s.c === cell.c && s.r === cell.r);
        this.sel = cell;
        return same ? 'same' : true;
      },
      onPointerDown(p) {
        const cell = this.cellAt(p);
        if (!cell) { this.sel = null; return; }
        this.cur = null;
        const res = this.press(cell);
        this.drag = res ? { c: cell.c, r: cell.r, x: p.x, y: p.y, same: res === 'same' } : null;
      },
      onPointerMove(p) {
        const dr = this.drag;
        if (!dr || this.phase !== 'idle') return;
        const dx = p.x - dr.x, dy = p.y - dr.y;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 16) return;
        const hor = Math.abs(dx) > Math.abs(dy);
        const c2 = dr.c + (hor ? Math.sign(dx) : 0), r2 = dr.r + (hor ? 0 : Math.sign(dy));
        this.drag = null;
        if (c2 >= 0 && r2 >= 0 && c2 < COLS && r2 < ROWS) this.trySwap(dr.c, dr.r, c2, r2);
      },
      onPointerUp() {
        if (this.drag && this.drag.same) this.sel = null;
        this.drag = null;
      },
      onKey(code) {
        const mv = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[code];
        if (mv) {
          const base = this.cur || this.sel || { c: 3, r: 2 };
          this.cur = { c: clamp(base.c + (this.cur ? mv[0] : 0), 0, COLS - 1), r: clamp(base.r + (this.cur ? mv[1] : 0), 0, ROWS - 1) };
          this.idleT = 0;
          return;
        }
        if ((code === 'Enter' || code === 'Space') && this.cur) {
          if (this.press(this.cur) === 'same') this.sel = null;
        }
      },
      settle(dt) {
        let done = true;
        for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < COLS; c++) {
            const st = grid[r][c];
            if (!st) continue;
            if (st.s < 1) st.s = Math.min(1, st.s + dt * 5);
            if (st.x !== c) { const v = 7.5 * dt; st.x = Math.abs(c - st.x) <= v ? c : st.x + Math.sign(c - st.x) * v; }
            if (st.y < r) {
              st.vy = Math.min(st.vy + 45 * dt, 16);
              st.y = Math.min(r, st.y + st.vy * dt);
              if (st.y === r) st.vy = 0;
            } else if (st.y > r) { const v = 7.5 * dt; st.y = Math.max(r, st.y - v); }
            if (st.x !== c || st.y !== r || st.s < 1) done = false;
          }
        }
        return done;
      },
      clear(m) {
        let sx = 0, sy = 0;
        for (const i of m.hit) {
          const c = i % COLS, r = Math.floor(i / COLS), st = grid[r][c];
          st.dying = true;
          sx += c; sy += r;
          api.burst(X0 + c * S + S / 2, Y0 + r * S + S / 2, KINDS[st.k].color, 4);
        }
        const pts = (m.hit.size * 10 + m.bonus) * this.chain;
        this.score += pts;
        this.flinch = 0.35;
        this.float = { text: `+${pts}`, x: X0 + (sx / m.hit.size) * S + S / 2, y: Y0 + (sy / m.hit.size) * S + S / 2, t: 0.9 };
        if (this.chain >= 2) this.say(`Каскад ×${this.chain}!`);
        this.phase = 'clear'; this.timer = 0.2;
      },
      collapse() {
        for (let c = 0; c < COLS; c++) {
          const keep = [];
          for (let r = ROWS - 1; r >= 0; r--) { const st = grid[r][c]; if (st && !st.dying) keep.push(st); }
          const missing = ROWS - keep.length;
          for (let r = ROWS - 1, i = 0; r >= 0; r--, i++) {
            if (i < keep.length) grid[r][c] = keep[i];
            else { const st = stone(randInt(0, NK - 1), c, r - missing); st.vy = 2; grid[r][c] = st; }
          }
        }
      },
      checkEnd() {
        if (this.ended) return;
        if (this.score >= GOAL) {
          this.ended = true;
          for (let i = 0; i < 4; i++) api.burst(X0 + 50 + i * 100, Y0 + 150, KINDS[i].color, 14);
          return api.win();
        }
        if (this.moves <= 0) { this.ended = true; return api.lose(); }
        this.hintMove = findMove();
        if (!this.hintMove) { fillBoard(true); this.hintMove = findMove(); this.say('Ходов нет, перемешиваю'); }
      },
      update(dt) {
        this.msgT -= dt; this.flinch -= dt;
        if (this.float) { this.float.t -= dt; this.float.y -= 30 * dt; if (this.float.t <= 0) this.float = null; }
        const settled = this.settle(dt);
        if (this.phase === 'idle') {
          this.idleT += dt;
          if (this.auto && settled && !this.ended) { const mv = findMove(); if (mv) this.trySwap(...mv); }
          return;
        }
        if (this.phase === 'swap') {
          if (!settled) return;
          const m = findMatches();
          if (!m.hit.size) { const [a, b, c, e] = this.pair; swapCells(a, b, c, e); this.phase = 'back'; return; }
          this.moves--; this.chain = 1;
          return this.clear(m);
        }
        if (this.phase === 'back') { if (settled) this.phase = 'idle'; return; }
        if (this.phase === 'clear') {
          this.timer -= dt;
          const f = clamp(1 - this.timer / 0.2, 0, 1);
          for (const row of grid) for (const st of row) if (st && st.dying) st.pop = f;
          if (this.timer > 0) return;
          this.collapse();
          this.phase = 'fall';
          return;
        }
        if (this.phase === 'fall' && settled) {
          const m = findMatches();
          if (m.hit.size) { this.chain++; return this.clear(m); }
          this.phase = 'idle'; this.idleT = 0;
          this.checkEnd();
        }
      },
      draw() {
        const ctx = api.ctx, t = api.time;
        api.starfield('#100E1A', 0, 0.35);

        /* Левая панель: злодей, его реплика, путь к цели и ходы */
        const m = clamp(this.score / GOAL, 0, 1);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.035)'; api.rr(10, 52, 202, 302, 14); ctx.fill();
        const shake = this.flinch > 0 ? Math.sin(t * 50) * 3 : 0, bob = Math.sin(t * 2) * 2;
        moodVillain(71 + shake, 104 + bob, 80, 80, m);
        api.nameTag(api.cfg.villain, 111, 80 + bob);
        const line = m < 0.35 ? '«Не отдам мои камни!»' : m < 0.7 ? '«Эй, полегче!»' : m < 1 ? '«Только не это…»' : '«Забирай, забирай…»';
        api.txt(line, 111, 212, 13, C.text, 700, 'center');
        api.txt('охраняет самоцветы', 111, 230, 11, C.muted, 500, 'center');
        api.txt('До цели', 24, 262, 12, C.muted, 600);
        api.txt(`${Math.min(this.score, GOAL)} из ${GOAL}`, 198, 262, 12, C.text, 700, 'right');
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'; api.rr(24, 270, 174, 10, 5); ctx.fill();
        if (m > 0) { ctx.fillStyle = C.gold; api.rr(24, 270, Math.max(10, 174 * m), 10, 5); ctx.fill(); }
        api.txt('Ходы', 24, 304, 12, C.muted, 600);
        api.txt(String(this.moves), 198, 304, 12, this.moves <= 3 ? C.danger : C.text, 700, 'right');
        for (let i = 0; i < MOVES; i++) {
          ctx.fillStyle = i < this.moves ? (this.moves <= 3 ? C.danger : C.hero) : 'rgba(255, 255, 255, 0.1)';
          api.rr(24 + (i % 10) * 17.6, 314 + Math.floor(i / 10) * 14, 13, 9, 3); ctx.fill();
        }

        /* Поле */
        ctx.fillStyle = '#151327'; api.rr(X0 - 6, Y0 - 6, COLS * S + 12, ROWS * S + 12, 14); ctx.fill();
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
          ctx.fillStyle = (r + c) % 2 ? '#1E1B35' : '#1A172E';
          api.rr(X0 + c * S + 2, Y0 + r * S + 2, S - 4, S - 4, 9); ctx.fill();
        }
        if (this.phase === 'idle' && this.idleT > 5 && this.hintMove && !this.sel && !this.ended) {
          const [a, b, c, e] = this.hintMove;
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.25 + 0.25 * Math.sin(t * 6)})`; ctx.lineWidth = 2;
          for (const [hc, hr] of [[a, b], [c, e]]) { api.rr(X0 + hc * S + 3, Y0 + hr * S + 3, S - 6, S - 6, 9); ctx.stroke(); }
        }
        if (this.sel) {
          ctx.fillStyle = 'rgba(255, 209, 102, 0.16)'; api.rr(X0 + this.sel.c * S + 2, Y0 + this.sel.r * S + 2, S - 4, S - 4, 9); ctx.fill();
          ctx.strokeStyle = C.gold; ctx.lineWidth = 3; ctx.stroke();
        }
        ctx.save();
        ctx.beginPath(); ctx.rect(X0 - 6, Y0 - 6, COLS * S + 12, ROWS * S + 12); ctx.clip();
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
          const st = grid[r][c];
          if (!st) continue;
          const selected = this.sel && this.sel.c === c && this.sel.r === r && this.phase === 'idle';
          const scale = (st.dying ? 1 - st.pop : st.s) * (selected ? 1 + 0.07 * Math.sin(t * 10) : 1);
          drawStone(st.k, X0 + st.x * S + S / 2, Y0 + st.y * S + S / 2, 18 * scale);
        }
        ctx.restore();
        if (this.cur) { ctx.strokeStyle = C.teal; ctx.lineWidth = 2; api.rr(X0 + this.cur.c * S + 1, Y0 + this.cur.r * S + 1, S - 2, S - 2, 10); ctx.stroke(); }
        if (this.float) {
          ctx.globalAlpha = clamp(this.float.t * 2, 0, 1);
          api.txt(this.float.text, this.float.x + 1, this.float.y + 1, 20, C.ink, 800, 'center');
          api.txt(this.float.text, this.float.x, this.float.y, 20, C.gold, 800, 'center');
          ctx.globalAlpha = 1;
        }
        if (this.msgT > 0 && this.msg) {
          ctx.globalAlpha = clamp(this.msgT * 3, 0, 1);
          ctx.font = `700 14px ${api.FONT}`;
          const w = ctx.measureText(this.msg).width + 30, mx = X0 + COLS * S / 2;
          ctx.fillStyle = 'rgba(11, 11, 14, 0.85)'; api.rr(mx - w / 2, Y0 + ROWS * S / 2 - 18, w, 36, 18); ctx.fill();
          api.txt(this.msg, mx, Y0 + ROWS * S / 2 + 5, 14, C.gold, 700, 'center');
          ctx.globalAlpha = 1;
        }
      }
    };
    return g;
  }
});
