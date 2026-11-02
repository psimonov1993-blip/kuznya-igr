/* Жанр «Разбей стену»: платформа героя отбивает мяч, разбивает пять рядов кирпичей
   и злодея-босса в центре стены, которому нужно 5 ударов */
MG.register('breakout', {
  title: 'Разбей стену',
  icon: 'squares-four',
  controls: 'Веди пальцем или стрелками, касание или пробел: мяч',
  hint: [['← →', 'или палец: платформа'], ['Пробел', 'запуск мяча']],
  goal: 'разбить все кирпичи и злодея в центре стены',
  make(api) {
    const { W, H, C, rand, clamp, input } = api;
    const d = api.diff;
    const COLS = 8, ROWS = 5, BW = 70, BH = 18, GAP = 5, BX = 20, BY = 62;
    const COLORS = ['#FF6B6B', '#FFD166', '#5EEAD4', '#60A5FA', '#F472B6'];
    const LEFT = 8, RIGHT = W - 8, TOP = 48, PY = 324, PH = 16, R = 6;
    const PW = Math.round(104 - (d.speed - 1) * 60);
    const BASE = 300 * d.speed, MAX = 430 * d.speed;
    const bricks = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if ((c === 3 || c === 4) && r >= 1 && r <= 3) continue;
        bricks.push({ x: BX + c * (BW + GAP), y: BY + r * (BH + GAP), w: BW, h: BH, color: COLORS[r], alive: true });
      }
    }
    function circle(x, y, r) { const ctx = api.ctx; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }

    return {
      pad: { x: W / 2 - PW / 2 },
      ball: { x: W / 2, y: PY - R - 1, vx: 0, vy: 0, held: true },
      bricks,
      boss: { x: BX + 3 * (BW + GAP), y: BY + BH + GAP, w: BW * 2 + GAP, h: BH * 3 + GAP * 2, hp: 5, max: 5, flash: 0, alive: true },
      sp: BASE, lives: d.lives, score: 0, trail: [], age: 0,
      status() { return `Кирпичей ${this.bricks.filter(b => b.alive).length}, злодей ${this.boss.hp} из ${this.boss.max}`; },
      cheat() {
        this.lives = 99;
        for (const k of this.bricks) k.alive = false;
        const bo = this.boss, b = this.ball;
        bo.hp = 1;
        Object.assign(b, { held: false, x: bo.x + bo.w / 2, y: bo.y + bo.h + 40, vx: 0, vy: -this.sp });
      },
      /* Столкновение мяча с прямоугольником: отражение по оси меньшего перекрытия и выталкивание наружу */
      hit(k) {
        const b = this.ball;
        const nx = clamp(b.x, k.x, k.x + k.w), ny = clamp(b.y, k.y, k.y + k.h);
        const dx = b.x - nx, dy = b.y - ny;
        if (dx * dx + dy * dy > R * R) return false;
        const ox = Math.min(b.x + R - k.x, k.x + k.w - (b.x - R));
        const oy = Math.min(b.y + R - k.y, k.y + k.h - (b.y - R));
        if (ox < oy) {
          if (b.x < k.x + k.w / 2) { b.vx = -Math.abs(b.vx); b.x = k.x - R; } else { b.vx = Math.abs(b.vx); b.x = k.x + k.w + R; }
        } else if (b.y < k.y + k.h / 2) { b.vy = -Math.abs(b.vy); b.y = k.y - R; } else { b.vy = Math.abs(b.vy); b.y = k.y + k.h + R; }
        return true;
      },
      speedUp() {
        const b = this.ball;
        this.sp = Math.min(this.sp + 3 * d.speed, MAX);
        const m = Math.hypot(b.vx, b.vy) || 1;
        b.vx *= this.sp / m; b.vy *= this.sp / m;
      },
      move(h) {
        const b = this.ball, p = this.pad, bo = this.boss;
        b.x += b.vx * h; b.y += b.vy * h;
        if (b.x - R < LEFT) { b.x = LEFT + R; b.vx = Math.abs(b.vx); }
        if (b.x + R > RIGHT) { b.x = RIGHT - R; b.vx = -Math.abs(b.vx); }
        if (b.y - R < TOP) { b.y = TOP + R; b.vy = Math.abs(b.vy); }
        if (b.vy > 0 && b.y + R >= PY && b.y + R <= PY + PH + 6 && b.x >= p.x - R && b.x <= p.x + PW + R) {
          const a = clamp((b.x - (p.x + PW / 2)) / (PW / 2), -1, 1) * 1.05;
          b.vx = Math.sin(a) * this.sp; b.vy = -Math.cos(a) * this.sp; b.y = PY - R;
        }
        for (const k of this.bricks) {
          if (k.alive && this.hit(k)) {
            k.alive = false; this.score += 10;
            api.burst(k.x + k.w / 2, k.y + k.h / 2, k.color, 8);
            this.speedUp();
            break;
          }
        }
        if (bo.alive && this.hit(bo)) {
          bo.hp--; bo.flash = 0.22; this.score += 20;
          api.burst(b.x, b.y, C.villain, 10);
          if (bo.hp <= 0) { bo.alive = false; this.score += 100; api.burst(bo.x + bo.w / 2, bo.y + bo.h / 2, C.villain, 40); }
        }
        if (!bo.alive && this.bricks.every(k => !k.alive)) { this.score += 50; api.win(); return true; }
        if (b.y - R > H) {
          this.lives--; api.burst(clamp(b.x, 20, W - 20), H - 8, C.danger, 14);
          if (this.lives <= 0) { api.lose(); return true; }
          Object.assign(b, { held: true, vx: 0, vy: 0 });
          this.sp = Math.max(BASE, this.sp * 0.9);
          this.trail = [];
          return true;
        }
        return false;
      },
      update(dt) {
        const p = this.pad, b = this.ball;
        this.age += dt;
        this.boss.flash -= dt;
        let target = null;
        for (const q of input.ptrs.values()) target = q.x;
        let dir = 0;
        if (input.keys.has('ArrowLeft') || input.keys.has('KeyA')) dir -= 1;
        if (input.keys.has('ArrowRight') || input.keys.has('KeyD')) dir += 1;
        if (target !== null) p.x += clamp(target - (p.x + PW / 2), -1500 * dt, 1500 * dt);
        else p.x += dir * 480 * dt;
        p.x = clamp(p.x, LEFT, RIGHT - PW);
        const launch = api.useJump() || api.useTap();
        if (b.held) {
          b.x = p.x + PW / 2; b.y = PY - R - 1;
          if (launch) {
            const a = rand(-0.35, 0.35);
            Object.assign(b, { held: false, vx: Math.sin(a) * this.sp, vy: -Math.cos(a) * this.sp });
          }
          return;
        }
        const n = Math.max(1, Math.ceil(this.sp * dt / 5));
        for (let i = 0; i < n; i++) if (this.move(dt / n)) return;
        this.trail.push({ x: b.x, y: b.y });
        if (this.trail.length > 6) this.trail.shift();
      },
      draw() {
        const ctx = api.ctx, t = api.time, p = this.pad, b = this.ball, bo = this.boss;
        api.starfield('#0F0E18', 0, 0.35);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(LEFT - 1, H); ctx.lineTo(LEFT - 1, TOP - 1); ctx.lineTo(RIGHT + 1, TOP - 1); ctx.lineTo(RIGHT + 1, H); ctx.stroke();

        for (const k of this.bricks) {
          if (!k.alive) continue;
          ctx.fillStyle = k.color; api.rr(k.x, k.y, k.w, k.h, 5); ctx.fill();
          ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'; ctx.fillRect(k.x + 6, k.y + 3, k.w - 12, 3);
          ctx.fillStyle = 'rgba(0, 0, 0, 0.18)'; ctx.fillRect(k.x + 4, k.y + k.h - 4, k.w - 8, 2);
        }

        if (bo.alive) {
          ctx.fillStyle = bo.flash > 0 ? '#F5F3EE' : '#2A2142'; api.rr(bo.x, bo.y, bo.w, bo.h, 10); ctx.fill();
          ctx.strokeStyle = C.villain; ctx.lineWidth = 2; api.rr(bo.x, bo.y, bo.w, bo.h, 10); ctx.stroke();
          api.drawVillain(bo.x + bo.w / 2 - 30, bo.y + 14, 60, 36, clamp((b.x - (bo.x + bo.w / 2)) / 120, -1, 1));
          for (let i = 0; i < bo.max; i++) {
            ctx.fillStyle = i < bo.hp ? C.villain : 'rgba(255, 255, 255, 0.16)';
            circle(bo.x + bo.w / 2 + (i - (bo.max - 1) / 2) * 12, bo.y + bo.h - 7, 3.5);
          }
          api.nameTag(api.cfg.villain, bo.x + bo.w / 2, bo.y + 2);
        }

        ctx.fillStyle = C.hero; api.rr(p.x, PY, PW, PH, 8); ctx.fill();
        ctx.fillStyle = C.gold; api.rr(p.x + 8, PY + PH - 4, PW - 16, 3, 1.5); ctx.fill();
        ctx.font = `700 11px ${api.FONT}`;
        api.txt(api.fitWord(api.cfg.hero, PW - 16), p.x + PW / 2, PY + 11, 11, C.ink, 700, 'center');

        this.trail.forEach((q, i) => {
          ctx.fillStyle = `rgba(255, 209, 102, ${0.05 + i * 0.04})`;
          circle(q.x, q.y, R * (0.5 + i * 0.08));
        });
        ctx.fillStyle = 'rgba(255, 209, 102, 0.22)'; circle(b.x, b.y, R + 4);
        ctx.fillStyle = '#FFFFFF'; circle(b.x, b.y, R);

        if (b.held && this.age > 0) {
          ctx.globalAlpha = 0.7 + Math.sin(t * 5) * 0.25;
          api.txt('Касание или пробел: запуск мяча', W / 2, 252, 14, C.text, 700, 'center');
          ctx.globalAlpha = 0.6;
          api.txt('Платформу веди пальцем или стрелками', W / 2, 274, 12, C.muted, 600, 'center');
          ctx.globalAlpha = 1;
        }
      }
    };
  }
});
