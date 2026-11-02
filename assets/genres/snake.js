/* Жанр «Змейка»: змейка героя из оранжевых бусин собирает 12 звёзд,
   злодей медленно бродит по полю живым препятствием 2x2 клетки */
MG.register('snake', {
  title: 'Змейка',
  icon: 'line-segments',
  controls: 'Стрелки или свайп по экрану: поворот',
  hint: [['Стрелки', 'поворот'], ['Свайп', 'или касание сбоку']],
  goal: 'собрать 12 звёзд и не врезаться в злодея',
  make(api) {
    const { C, randInt, clamp } = api;
    const d = api.diff;
    const S = 20, GX = 20, GY = 52, COLS = 30, ROWS = 15, NEED = 12;
    const STEP = 0.14 / d.speed, V_STEP = 0.6 / d.speed;
    const cx = x => GX + x * S + S / 2, cy = y => GY + y * S + S / 2;
    const UP = { x: 0, y: -1 }, DOWN = { x: 0, y: 1 }, LEFT = { x: -1, y: 0 }, RIGHT = { x: 1, y: 0 };
    const KEYS = { ArrowUp: UP, KeyW: UP, ArrowDown: DOWN, KeyS: DOWN, ArrowLeft: LEFT, KeyA: LEFT, ArrowRight: RIGHT, KeyD: RIGHT };
    const in2x2 = (c, x, y) => c.x >= x && c.x <= x + 1 && c.y >= y && c.y <= y + 1;
    function circle(x, y, r) { const ctx = api.ctx; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }

    const g = {
      body: [], from: [], dir: RIGHT, queue: [], acc: 0, grow: 0, pause: 0, done: false,
      stars: 0, star: null, villain: { x: 21, y: 6, px: 21, py: 6, dx: 0, dy: 1, acc: 0, slide: 1 },
      lives: d.lives, score: 0, sw: null, age: 0,
      status() { return `Звёзды ${this.stars} из ${NEED}`; },
      stepTime() { return STEP * (1 - this.stars * 0.015); },
      onSnake(x, y) { return this.body.some(c => c.x === x && c.y === y); },
      placeStar() {
        const v = this.villain, h = this.body[0];
        for (let i = 0; i < 500; i++) {
          const x = randInt(1, COLS - 2), y = randInt(1, ROWS - 2);
          if (this.onSnake(x, y)) continue;
          if (x >= v.x - 1 && x <= v.x + 2 && y >= v.y - 1 && y <= v.y + 2) continue;
          if (h && Math.abs(h.x - x) + Math.abs(h.y - y) < 4) continue;
          this.star = { x, y };
          return;
        }
        this.star = { x: 1, y: 1 };
      },
      spawnSnake() {
        const v = this.villain;
        const opts = [
          { x: 5, y: 7, dir: RIGHT }, { x: 24, y: 7, dir: LEFT }, { x: 5, y: 3, dir: RIGHT },
          { x: 24, y: 11, dir: LEFT }, { x: 5, y: 11, dir: RIGHT }, { x: 24, y: 3, dir: LEFT }
        ];
        let best = opts[0], bestD = -1;
        for (const o of opts) {
          let dmin = 99;
          for (let i = -2; i <= 7; i++) {
            const px = o.x + o.dir.x * i;
            dmin = Math.min(dmin, Math.max(Math.abs(px - (v.x + 0.5)), Math.abs(o.y - (v.y + 0.5))));
          }
          if (dmin > bestD) { bestD = dmin; best = o; }
        }
        this.dir = best.dir; this.queue = [];
        this.body = [0, 1, 2].map(i => ({ x: best.x - best.dir.x * i, y: best.y }));
        this.from = this.body.map(c => ({ ...c }));
        this.acc = 0; this.grow = 0; this.pause = 0.8;
        if (!this.star || this.onSnake(this.star.x, this.star.y)) this.placeStar();
      },
      turn(nd) {
        const last = this.queue.length ? this.queue[this.queue.length - 1] : this.dir;
        if ((nd.x === last.x && nd.y === last.y) || (nd.x === -last.x && nd.y === -last.y)) return;
        if (this.queue.length < 2) this.queue.push(nd);
        if (this.pause > 0.12) this.pause = 0.12;
      },
      swipe(dx, dy) { this.turn(Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? LEFT : RIGHT) : (dy < 0 ? UP : DOWN)); },
      onKey(code) { if (KEYS[code]) this.turn(KEYS[code]); },
      onPointerDown(p) { this.sw = { x: p.x, y: p.y, used: false }; },
      onPointerMove(p) {
        const s = this.sw;
        if (!s) return;
        const dx = p.x - s.x, dy = p.y - s.y;
        if (Math.max(Math.abs(dx), Math.abs(dy)) >= 20) { this.swipe(dx, dy); s.x = p.x; s.y = p.y; s.used = true; }
      },
      onPointerUp(p) {
        const s = this.sw;
        this.sw = null;
        if (!s || s.used) return;
        const dx = p.x - s.x, dy = p.y - s.y;
        if (Math.max(Math.abs(dx), Math.abs(dy)) >= 20) return this.swipe(dx, dy);
        /* короткое касание: поворот в сторону касания относительно головы */
        const h = this.body[0], hx = cx(h.x), hy = cy(h.y);
        const last = this.queue.length ? this.queue[this.queue.length - 1] : this.dir;
        if (last.x !== 0) this.turn(p.y < hy ? UP : DOWN);
        else this.turn(p.x < hx ? LEFT : RIGHT);
      },
      cheat() {
        this.lives = 99; this.stars = NEED - 1; this.age = 99;
        this.villain = { x: 25, y: 12, px: 25, py: 12, dx: 0, dy: -1, acc: 0, slide: 1 };
        this.dir = RIGHT; this.queue = []; this.grow = 0;
        this.body = [{ x: 6, y: 7 }, { x: 5, y: 7 }, { x: 4, y: 7 }];
        this.from = this.body.map(c => ({ ...c }));
        this.star = { x: 9, y: 7 }; this.pause = 0; this.acc = 0;
      },
      moveVillain() {
        const v = this.villain, h = this.body[0];
        const banned = [UP, DOWN, LEFT, RIGHT].map(o => ({ x: h.x + o.x, y: h.y + o.y }));
        banned.push({ x: h.x + this.dir.x * 2, y: h.y + this.dir.y * 2 });
        const ok = (x, y) => {
          if (x < 0 || y < 0 || x + 1 >= COLS || y + 1 >= ROWS) return false;
          if (this.body.some(c => in2x2(c, x, y)) || banned.some(c => in2x2(c, x, y))) return false;
          return !(this.star && in2x2(this.star, x, y));
        };
        if (Math.random() < 0.3 || !ok(v.x + v.dx, v.y + v.dy)) {
          const all = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => ok(v.x + dx, v.y + dy));
          if (!all.length) return;
          [v.dx, v.dy] = all[Math.floor(Math.random() * all.length)];
        }
        v.px = v.x; v.py = v.y; v.x += v.dx; v.y += v.dy; v.slide = 0;
      },
      hurt(x, y) {
        api.burst(cx(clamp(x, 0, COLS - 1)), cy(clamp(y, 0, ROWS - 1)), C.danger, 14);
        this.lives--;
        if (this.lives <= 0) { this.done = true; return api.lose(); }
        this.spawnSnake();
      },
      step() {
        if (this.queue.length) this.dir = this.queue.shift();
        const h = this.body[0], nx = h.x + this.dir.x, ny = h.y + this.dir.y;
        if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) return this.hurt(nx, ny);
        const n = this.body.length - (this.grow > 0 ? 0 : 1);
        for (let i = 0; i < n; i++) if (this.body[i].x === nx && this.body[i].y === ny) return this.hurt(nx, ny);
        const v = this.villain;
        if (in2x2({ x: nx, y: ny }, v.x, v.y)) return this.hurt(nx, ny);
        this.from = this.body.map(c => ({ ...c }));
        this.body.unshift({ x: nx, y: ny });
        if (this.grow > 0) { this.grow--; this.from.push({ ...this.body[this.body.length - 1] }); } else this.body.pop();
        if (this.star && nx === this.star.x && ny === this.star.y) {
          this.stars++; this.score += 10; this.grow += 2;
          api.burst(cx(nx), cy(ny), C.gold, 12);
          if (this.stars >= NEED) { this.score += 50; this.done = true; return api.win(); }
          this.placeStar();
        }
      },
      update(dt) {
        if (this.done) return;
        this.age += dt;
        const v = this.villain;
        v.slide = Math.min(1, v.slide + dt / 0.25);
        v.acc += dt;
        if (v.acc >= V_STEP) { v.acc -= V_STEP; this.moveVillain(); }
        if (this.pause > 0) { this.pause -= dt; return; }
        this.acc += dt;
        while (this.acc >= this.stepTime()) {
          this.acc -= this.stepTime();
          this.step();
          if (this.pause > 0 || this.done) break;
        }
      },
      draw() {
        const ctx = api.ctx, t = api.time;
        api.starfield('#0E0D16', 0, 0.3);
        ctx.fillStyle = '#16151F'; api.rr(GX - 4, GY - 4, COLS * S + 8, ROWS * S + 8, 10); ctx.fill();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
        for (let y = 0; y < ROWS; y++) for (let x = y % 2; x < COLS; x += 2) ctx.fillRect(GX + x * S, GY + y * S, S, S);
        ctx.strokeStyle = 'rgba(255, 138, 31, 0.4)'; ctx.lineWidth = 2;
        api.rr(GX - 4, GY - 4, COLS * S + 8, ROWS * S + 8, 10); ctx.stroke();

        if (this.star) {
          const sx = cx(this.star.x), sy = cy(this.star.y);
          ctx.fillStyle = 'rgba(255, 209, 102, 0.16)'; circle(sx, sy, 15 + Math.sin(t * 4) * 2);
          api.star(sx, sy, 10, C.gold, t * 1.5);
        }

        const v = this.villain, e = 1 - Math.pow(1 - v.slide, 2);
        const vx = GX + (v.px + (v.x - v.px) * e) * S, vy = GY + (v.py + (v.y - v.py) * e) * S;
        const head = this.body[0];
        api.drawVillain(vx + 3, vy + 9, 34, 29, head ? clamp((head.x - v.x) / 6, -1, 1) : 0);
        api.nameTag(api.cfg.villain, vx + S, vy - 1);

        if (!this.body.length) return;
        const a = this.pause > 0 ? 0 : clamp(this.acc / this.stepTime(), 0, 1);
        const pos = this.body.map((b, i) => {
          const f = this.from[i] || b;
          return { x: cx(f.x + (b.x - f.x) * a), y: cy(f.y + (b.y - f.y) * a) };
        });
        const blink = this.pause > 0 && Math.floor(t * 10) % 2;
        if (!blink) {
          for (let i = pos.length - 1; i >= 0; i--) {
            const r = i === 0 ? 9.5 : Math.max(6, 8.5 - i * 0.12);
            ctx.fillStyle = i === 0 ? C.hero : i === 1 ? C.gold : (i % 2 ? '#FFA24D' : C.hero);
            circle(pos[i].x, pos[i].y, r);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.28)'; circle(pos[i].x - r * 0.3, pos[i].y - r * 0.35, r * 0.3);
          }
          const hx = pos[0].x, hy = pos[0].y, dx = this.dir.x, dy = this.dir.y;
          for (const s of [-1, 1]) {
            const ex = hx + dx * 3 - dy * 4.5 * s, ey = hy + dy * 3 + dx * 4.5 * s;
            ctx.fillStyle = '#FFFFFF'; circle(ex, ey, 3.4);
            ctx.fillStyle = C.ink; circle(ex + dx * 1.3, ey + dy * 1.3, 1.8);
          }
        }
        api.nameTag(api.cfg.hero, pos[0].x, pos[0].y - 11);

        if (this.age > 0 && this.age < 4 && this.stars === 0) {
          ctx.globalAlpha = clamp(4 - this.age, 0, 1) * 0.75;
          api.txt('Свайп, стрелки или касание сбоку от головы', 320, GY + ROWS * S - 12, 13, C.text, 600, 'center');
          ctx.globalAlpha = 1;
        }
      }
    };
    g.spawnSnake();
    g.pause = 0.6;
    return g;
  }
});
