/* Жанр «Раннер»: герой бежит сам, прыжком уходит от прислужников злодея и догоняет его к финишу */
MG.register('runner', {
  title: 'Раннер',
  icon: 'person-simple-run',
  controls: 'Пробел, стрелка вверх или касание экрана: прыжок',
  hint: [['Пробел', 'или касание: прыжок']],
  goal: 'догнать злодея до финиша',
  make(api) {
    const { W, H, C, rand, clamp, overlap } = api;
    const GROUND = 300;
    const d = api.diff;
    const CITY = Array.from({ length: 14 }, (_, i) => ({ x: i * 52, w: rand(36, 50), h: rand(50, 130) }));
    return {
      hero: { x: 90, y: GROUND - 40, w: 30, h: 40, vy: 0, onGround: true, inv: 0, coyote: 0 },
      obstacles: [], coins: [], dist: 0, nextAt: 520, goal: 6400,
      speed: 250 * d.speed, lives: d.lives, score: 0, bonus: 0,
      status() { return ''; },
      cheat() { this.lives = 99; this.dist = this.goal - 40; },
      update(dt) {
        const h = this.hero;
        this.speed = Math.min(430, (250 + this.dist * 0.022) * d.speed);
        this.dist += this.speed * dt;
        this.score = Math.floor(this.dist / 20) + this.bonus;
        h.coyote -= dt; h.inv -= dt;
        if ((h.onGround || h.coyote > 0) && (api.useJump() || api.useTap())) { h.vy = -620; h.onGround = false; h.coyote = 0; }
        h.vy += 1900 * dt;
        h.y += h.vy * dt;
        if (h.y >= GROUND - h.h) {
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
            this.lives--; h.inv = 1.2; api.burst(h.x + h.w / 2, h.y + h.h / 2, C.danger);
            if (this.lives <= 0) return api.lose();
          }
        }
        for (const c of this.coins) {
          if (!c.taken && Math.abs(c.x - (h.x + h.w / 2)) < 22 && Math.abs(c.y - (h.y + h.h / 2)) < 26) {
            c.taken = true; this.bonus += 10; api.burst(c.x, c.y, C.gold, 6);
          }
        }
        if (this.dist >= this.goal) { api.burst(h.x + 60, h.y, C.gold, 24); api.win(); }
      },
      draw() {
        const ctx = api.ctx, t = api.time;
        api.starfield('#100F1A');
        const off = (this.dist * 0.25) % 728;
        for (const b of CITY) {
          const x = ((b.x - off) % 728 + 728) % 728 - 40;
          ctx.fillStyle = '#1C1B2A'; ctx.fillRect(x, GROUND - b.h, b.w, b.h);
          ctx.fillStyle = 'rgba(255, 209, 102, 0.35)';
          for (let wy = GROUND - b.h + 10; wy < GROUND - 12; wy += 18) ctx.fillRect(x + 8, wy, 6, 6);
        }
        ctx.fillStyle = '#272727'; ctx.fillRect(0, GROUND, W, H - GROUND);
        ctx.fillStyle = '#313131';
        const stripe = this.dist % 48;
        for (let x = -stripe; x < W; x += 48) ctx.fillRect(x, GROUND + 18, 24, 4);

        const p = clamp(this.dist / this.goal, 0, 1);
        const vx = 560 - Math.max(0, (p - 0.82) / 0.18) * 400;
        const vb = Math.abs(Math.sin(t * 10)) * 4;
        api.drawVillain(vx, GROUND - 46 - vb, 38, 46, -1);
        api.nameTag(api.cfg.villain, vx + 19, GROUND - 58 - vb);
        for (const c of this.coins) api.star(c.x, c.y, 9, C.gold, t * 2);
        for (const o of this.obstacles) api.drawMinion(o.x, o.y, o.w, o.h);

        const h = this.hero;
        const bob = h.onGround ? -Math.abs(Math.sin(this.dist / 18)) * 3 : 0;
        api.drawHero(h.x, h.y, h.w, h.h, 1, bob, h.inv > 0);
        api.nameTag(api.cfg.hero, h.x + h.w / 2, h.y + bob - 6);

        ctx.fillStyle = 'rgba(255,255,255,0.12)'; api.rr(180, 14, 280, 8, 4); ctx.fill();
        ctx.fillStyle = C.hero; api.rr(180, 14, Math.max(8, 280 * p), 8, 4); ctx.fill();
        api.txt('до злодея', 320, 40, 11, C.muted, 600, 'center');
      }
    };
  }
});
