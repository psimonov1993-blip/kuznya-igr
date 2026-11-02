/* Жанр «Космобой»: корабль стреляет сам, игрок уводит его от разведчиков, после 14 сбитых выходит злодей-босс */
MG.register('space', {
  title: 'Космобой',
  icon: 'rocket-launch',
  controls: 'Стрелки или ведение пальцем, стреляет сам',
  hint: [['← →', 'полёт'], ['Палец', 'веди по экрану']],
  goal: 'сбить 14 разведчиков и победить босса',
  make(api) {
    const { W, H, C, rand, clamp, overlap, input } = api;
    const d = api.diff;
    return {
      ship: { x: W / 2, y: 312, inv: 0 },
      bullets: [], enemies: [], shots: [], kills: 0, need: 14, boss: null,
      fire: 0, spawn: 0.8, lives: d.lives, score: 0,
      status() { return this.boss ? `${api.cfg.villain}: ${this.boss.hp} из ${this.boss.max}` : `Сбито ${this.kills} из ${this.need}`; },
      cheat() {
        this.lives = 99; this.kills = this.need; this.enemies = [];
        this.boss = { x: this.ship.x - 55, y: 70, w: 110, h: 62, hp: 1, max: 24, dir: 0, fire: 99 };
      },
      hurt() {
        this.lives--; this.ship.inv = 1.3; api.burst(this.ship.x, this.ship.y, C.danger, 12);
        if (this.lives <= 0) api.lose();
      },
      update(dt) {
        const s = this.ship;
        s.inv -= dt;
        let dir = 0;
        if (input.keys.has('ArrowLeft') || input.keys.has('KeyA')) dir -= 1;
        if (input.keys.has('ArrowRight') || input.keys.has('KeyD')) dir += 1;
        let target = null;
        for (const p of input.ptrs.values()) target = p.x;
        if (target !== null) s.x += clamp(target - s.x, -520 * dt, 520 * dt);
        else s.x += dir * 380 * dt;
        s.x = clamp(s.x, 24, W - 24);

        this.fire -= dt;
        if (this.fire <= 0) { this.bullets.push({ x: s.x, y: s.y - 18 }); this.fire = 0.2; }
        for (const b of this.bullets) b.y -= 560 * dt;
        this.bullets = this.bullets.filter(b => b.y > -10);

        if (!this.boss) {
          this.spawn -= dt;
          if (this.spawn <= 0) {
            this.enemies.push({ x: rand(40, W - 40), y: -20, r: 14, vy: rand(70, 130) * d.speed, ph: rand(0, 6.28) });
            this.spawn = rand(0.5, 0.95) / d.speed;
          }
        }
        for (const e of this.enemies) { e.y += e.vy * dt; e.x += Math.sin(api.time * 2 + e.ph) * 40 * dt; }
        for (const b of this.bullets) {
          for (const e of this.enemies) {
            if (!e.dead && Math.abs(b.x - e.x) < e.r + 3 && Math.abs(b.y - e.y) < e.r + 6) {
              e.dead = true; b.y = -100; this.kills++; this.score += 10; api.burst(e.x, e.y, C.villain, 8);
            }
          }
        }
        this.enemies = this.enemies.filter(e => !e.dead && e.y < H + 30);
        if (this.kills >= this.need && !this.boss) this.boss = { x: W / 2 - 55, y: -80, w: 110, h: 62, hp: 24, max: 24, dir: 1, fire: 1.4 };

        const bo = this.boss;
        if (bo) {
          if (bo.y < 70) bo.y += 60 * dt;
          bo.x += bo.dir * 110 * d.speed * dt;
          if (bo.x < 20 || bo.x + bo.w > W - 20) bo.dir *= -1;
          bo.fire -= dt;
          if (bo.fire <= 0 && bo.y >= 40) {
            const cx = bo.x + bo.w / 2, cy = bo.y + bo.h;
            for (const a of [-0.35, 0, 0.35]) this.shots.push({ x: cx, y: cy, vx: Math.sin(a) * 160, vy: 170 * d.speed });
            bo.fire = 1.0 / d.speed;
          }
          for (const b of this.bullets) {
            if (b.x > bo.x && b.x < bo.x + bo.w && b.y > bo.y && b.y < bo.y + bo.h) {
              api.burst(b.x, b.y, C.gold, 3); b.y = -100; bo.hp--; this.score += 5;
              if (bo.hp <= 0) { api.burst(bo.x + bo.w / 2, bo.y + bo.h / 2, C.villain, 40); this.score += 100; return api.win(); }
            }
          }
        }
        for (const sh of this.shots) { sh.x += sh.vx * dt; sh.y += sh.vy * dt; }
        this.shots = this.shots.filter(sh => sh.y < H + 10 && !sh.dead);

        if (s.inv <= 0) {
          const sb = { x: s.x - 13, y: s.y - 12, w: 26, h: 24 };
          for (const e of this.enemies) if (overlap(sb, { x: e.x - e.r, y: e.y - e.r, w: e.r * 2, h: e.r * 2 })) { e.dead = true; return this.hurt(); }
          for (const sh of this.shots) if (overlap(sb, { x: sh.x - 5, y: sh.y - 5, w: 10, h: 10 })) { sh.dead = true; return this.hurt(); }
        }
      },
      draw() {
        const ctx = api.ctx, t = api.time;
        api.starfield('#08080F', 1, 0.8);
        ctx.fillStyle = C.gold;
        for (const b of this.bullets) ctx.fillRect(b.x - 2, b.y - 8, 4, 12);
        for (const e of this.enemies) {
          ctx.fillStyle = C.villainDark; ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(e.x, e.y - 2, 5, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(e.x, e.y - 1, 2.5, 0, Math.PI * 2); ctx.fill();
        }
        const bo = this.boss;
        if (bo) {
          api.drawVillain(bo.x, bo.y, bo.w, bo.h, 0);
          api.nameTag(api.cfg.villain, bo.x + bo.w / 2, bo.y - 14);
          ctx.fillStyle = 'rgba(255,255,255,0.12)'; api.rr(bo.x, bo.y + bo.h + 8, bo.w, 6, 3); ctx.fill();
          ctx.fillStyle = C.villain; api.rr(bo.x, bo.y + bo.h + 8, Math.max(6, bo.w * bo.hp / bo.max), 6, 3); ctx.fill();
        }
        ctx.fillStyle = C.villain;
        for (const sh of this.shots) { ctx.beginPath(); ctx.arc(sh.x, sh.y, 5, 0, Math.PI * 2); ctx.fill(); }
        const s = this.ship;
        if (!(s.inv > 0 && Math.floor(t * 12) % 2)) {
          ctx.fillStyle = Math.floor(t * 20) % 2 ? C.gold : C.danger;
          ctx.beginPath(); ctx.moveTo(s.x - 6, s.y + 14); ctx.lineTo(s.x, s.y + 24 + rand(0, 6)); ctx.lineTo(s.x + 6, s.y + 14); ctx.fill();
          ctx.fillStyle = C.hero;
          ctx.beginPath(); ctx.moveTo(s.x, s.y - 18); ctx.lineTo(s.x + 17, s.y + 14); ctx.lineTo(s.x - 17, s.y + 14); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(s.x, s.y + 2, 5, 0, Math.PI * 2); ctx.fill();
        }
        api.nameTag(api.cfg.hero, s.x, s.y - 22);
      }
    };
  }
});
