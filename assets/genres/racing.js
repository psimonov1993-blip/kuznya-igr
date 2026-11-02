/* Жанр «Гонки»: вид сверху, машина героя меняет полосу на трёхполосной дороге, уходит от машин прислужников
   и конусов, собирает монеты, а к финишу догоняет машину злодея */
MG.register('racing', {
  title: 'Гонки',
  icon: 'steering-wheel',
  controls: 'Стрелки или касание слева и справа: смена полосы',
  hint: [['← →', 'смена полосы'], ['Касание', 'слева или справа']],
  goal: 'уйти от машин прислужников и догнать злодея к финишу',
  make(api) {
    const { W, H, C, rand, clamp, overlap } = api;
    const d = api.diff;
    const ROAD = 170, LANE = 100, ROAD_W = 300;
    const laneX = i => ROAD + LANE * i + LANE / 2;
    const laneOf = x => clamp(Math.floor((x - ROAD) / LANE), 0, 2);
    const HERO_Y = 268, CAR_W = 40, CAR_H = 66, V_W = 50, V_H = 82;
    const GOAL = 11000, CHASE_FROM = GOAL - 2400, CALM = GOAL - 650;
    const SCENERY = Array.from({ length: 12 }, (_, i) => ({ side: i % 2, y: i * 40 + rand(0, 20), x: rand(22, 118), r: rand(11, 19), lamp: i % 3 === 0 }));

    function circle(x, y, r) { const ctx = api.ctx; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
    /* Машина сверху: up = едет вверх (фары сверху), иначе навстречу (фары снизу) */
    function car(x, y, w, h, body, up, stripe) {
      const ctx = api.ctx;
      ctx.fillStyle = '#0B0B0E';
      for (const k of [0.15, 0.63]) {
        api.rr(x - 4, y + h * k, 7, h * 0.22, 2); ctx.fill();
        api.rr(x + w - 3, y + h * k, 7, h * 0.22, 2); ctx.fill();
      }
      ctx.fillStyle = body; api.rr(x, y, w, h, 10); ctx.fill();
      if (stripe) { ctx.fillStyle = stripe; ctx.fillRect(x + w / 2 - 7, y + 3, 4, h - 6); ctx.fillRect(x + w / 2 + 3, y + 3, 4, h - 6); }
      ctx.fillStyle = 'rgba(14, 14, 22, 0.88)';
      api.rr(x + 6, up ? y + h * 0.24 : y + h * 0.59, w - 12, h * 0.17, 4); ctx.fill();
      api.rr(x + 8, up ? y + h * 0.7 : y + h * 0.18, w - 16, h * 0.12, 3); ctx.fill();
      const fy = up ? y + 2 : y + h - 5, ry = up ? y + h - 5 : y + 2;
      ctx.fillStyle = '#FFF3C4'; ctx.fillRect(x + 7, fy, 7, 3); ctx.fillRect(x + w - 14, fy, 7, 3);
      ctx.fillStyle = C.danger; ctx.fillRect(x + 7, ry, 6, 3); ctx.fillRect(x + w - 13, ry, 6, 3);
    }

    return {
      hero: { lane: 1, x: laneX(1), inv: 0 },
      things: [], villain: null, dist: 0, nextAt: 520, speed: 240 * d.speed, age: 0,
      lives: d.lives, score: 0, bonus: 0, press: { side: 0, t: 0 },
      status() { return ''; },
      steer(dir) { this.hero.lane = clamp(this.hero.lane + dir, 0, 2); this.press = { side: dir, t: 0.2 }; },
      onKey(code) {
        if (code === 'ArrowLeft' || code === 'KeyA') this.steer(-1);
        if (code === 'ArrowRight' || code === 'KeyD') this.steer(1);
      },
      onPointerDown(p) { this.steer(p.x < W / 2 ? -1 : 1); },
      cheat() { this.lives = 99; this.hero.inv = 99; this.dist = GOAL - 300; this.things = []; this.age = 99; },
      laneClear(l, yMax) { return !this.things.some(o => !o.hit && o.lane === l && o.y < yMax); },
      spawnRow() {
        const v = this.villain;
        const banned = v ? [v.lane, laneOf(v.x)] : [];
        const open = [0, 1, 2].filter(l => !banned.includes(l)).sort(() => Math.random() - 0.5);
        const p = this.dist / GOAL;
        const n = v ? 1 : (Math.random() < 0.25 + p * 0.5 ? 2 : 1);
        const block = open.slice(0, n), free = open.slice(n);
        for (const l of block) {
          if (Math.random() < 0.68) this.things.push({ kind: 'car', lane: l, x: laneX(l) - CAR_W / 2, y: -CAR_H - 10, w: CAR_W, h: CAR_H, vx: 0, rot: 0 });
          else this.things.push({ kind: 'cone', lane: l, x: laneX(l) - 12, y: -34, w: 24, h: 24, vx: 0, rot: 0 });
        }
        if (free.length && Math.random() < 0.6) {
          const l = free[Math.floor(Math.random() * free.length)];
          for (let i = 0; i < 3; i++) this.things.push({ kind: 'coin', lane: l, x: laneX(l), y: -24 - i * 36, ph: i * 0.7 });
        }
      },
      update(dt) {
        const h = this.hero;
        this.age += dt;
        this.speed = Math.min(440, 240 + this.dist * 0.018) * d.speed;
        const dy = this.speed * dt;
        this.dist += dy;
        h.inv -= dt; this.press.t -= dt;
        h.x += clamp(laneX(h.lane) - h.x, -620 * dt, 620 * dt);

        if (this.dist >= CHASE_FROM && !this.villain) this.villain = { lane: 1, x: laneX(1), y: -110, wait: 1.4 };
        const v = this.villain;
        if (v) {
          const k = clamp((this.dist - CHASE_FROM) / (GOAL - CHASE_FROM), 0, 1);
          const yEnd = HERO_Y - V_H - 16;
          v.y = -110 + (yEnd + 110) * (k < 0.75 ? k / 0.75 * 0.55 : 0.55 + (k - 0.75) / 0.25 * 0.45);
          v.wait -= dt;
          if (v.wait <= 0 && this.dist < CALM) {
            const opts = [v.lane - 1, v.lane + 1].filter(l => l >= 0 && l <= 2 && this.laneClear(l, v.y + V_H + 30));
            if (opts.length) { v.lane = opts[Math.floor(Math.random() * opts.length)]; v.wait = rand(1.4, 2.2); }
          }
          v.x += clamp(laneX(v.lane) - v.x, -160 * dt, 160 * dt);
        }

        if (this.dist >= this.nextAt && this.dist < CALM) {
          this.spawnRow();
          this.nextAt = this.dist + rand(230, 320) + this.speed * 0.22;
        }
        for (const o of this.things) {
          o.y += dy + (o.kind === 'car' && !o.hit ? 80 * d.speed * dt : 0);
          if (o.hit) { o.x += o.vx * dt; o.rot += Math.sign(o.vx) * 7 * dt; }
        }

        const hb = { x: h.x - CAR_W / 2 + 5, y: HERO_Y + 6, w: CAR_W - 10, h: CAR_H - 12 };
        for (const o of this.things) {
          if (o.kind === 'coin') {
            if (!o.taken && Math.abs(o.x - h.x) < 26 && o.y > HERO_Y - 10 && o.y < HERO_Y + CAR_H + 10) {
              o.taken = true; this.bonus += 10; api.burst(o.x, o.y, C.gold, 6);
            }
            continue;
          }
          if (o.hit || h.inv > 0) continue;
          if (overlap(hb, { x: o.x + 3, y: o.y + 3, w: o.w - 6, h: o.h - 6 })) {
            o.hit = true; o.vx = (o.x + o.w / 2 < h.x ? -1 : 1) * 280;
            this.lives--; h.inv = 1.3;
            api.burst(h.x, HERO_Y + 12, C.danger, 14);
            if (this.lives <= 0) return api.lose();
          }
        }
        this.things = this.things.filter(o => !o.taken && o.y < H + 90 && o.x > -90 && o.x < W + 90);
        this.score = Math.floor(this.dist / 40) + this.bonus;
        if (this.dist >= GOAL) {
          if (v) api.burst(v.x, v.y + V_H / 2, C.villain, 30);
          api.burst(h.x, HERO_Y, C.gold, 20);
          this.score += 100;
          api.win();
        }
      },
      draw() {
        const ctx = api.ctx, t = api.time, h = this.hero;
        ctx.fillStyle = '#12111A'; ctx.fillRect(0, 0, W, H);
        for (const s of SCENERY) {
          const y = (s.y + this.dist) % 480 - 60;
          if (s.lamp) {
            const lx = s.side ? ROAD + ROAD_W + 16 : ROAD - 16;
            ctx.fillStyle = 'rgba(255, 209, 102, 0.1)'; circle(lx, y, 22);
            ctx.fillStyle = C.gold; circle(lx, y, 3.5);
          }
          const x = s.side ? W - s.x : s.x;
          ctx.fillStyle = '#1A2A25'; circle(x, y, s.r);
          ctx.fillStyle = '#22382F'; circle(x - s.r * 0.25, y - s.r * 0.25, s.r * 0.6);
        }

        ctx.fillStyle = '#24232C'; ctx.fillRect(ROAD, 0, ROAD_W, H);
        const off = this.dist % 40;
        for (let y = -40 + off; y < H; y += 40) {
          ctx.fillStyle = 'rgba(232, 228, 220, 0.75)'; ctx.fillRect(ROAD - 8, y, 8, 20); ctx.fillRect(ROAD + ROAD_W, y, 8, 20);
          ctx.fillStyle = '#C24E4E'; ctx.fillRect(ROAD - 8, y + 20, 8, 20); ctx.fillRect(ROAD + ROAD_W, y + 20, 8, 20);
        }
        ctx.fillStyle = 'rgba(245, 243, 238, 0.4)';
        const dash = this.dist % 60;
        for (let y = -60 + dash; y < H; y += 60) for (const lx of [ROAD + LANE, ROAD + LANE * 2]) ctx.fillRect(lx - 2, y, 4, 30);

        for (const o of this.things) {
          if (o.kind !== 'coin') continue;
          ctx.save(); ctx.translate(o.x, o.y); ctx.scale(Math.max(0.25, Math.abs(Math.cos(t * 4 + o.ph))), 1);
          ctx.fillStyle = C.gold; circle(0, 0, 9);
          ctx.strokeStyle = '#D9A13A'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 5.5, 0, Math.PI * 2); ctx.stroke();
          ctx.restore();
        }
        for (const o of this.things) {
          if (o.kind === 'coin') continue;
          ctx.save();
          ctx.translate(o.x + o.w / 2, o.y + o.h / 2); ctx.rotate(o.rot); ctx.translate(-o.w / 2, -o.h / 2);
          if (o.hit) ctx.globalAlpha = 0.6;
          if (o.kind === 'cone') {
            ctx.fillStyle = '#2B1F22'; api.rr(0, 0, 24, 24, 5); ctx.fill();
            ctx.fillStyle = C.danger; circle(12, 12, 10);
            ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(12, 12, 5.5, 0, Math.PI * 2); ctx.stroke();
          } else {
            car(0, 0, o.w, o.h, C.villainDark, false);
            ctx.fillStyle = '#FFFFFF'; circle(o.w / 2, o.h * 0.47, 6.5);
            ctx.fillStyle = C.ink; circle(o.w / 2, o.h * 0.47 + 2, 3.2);
          }
          ctx.restore();
        }

        const v = this.villain;
        if (v && v.y > -V_H - 30) {
          const vx = v.x - V_W / 2;
          car(vx, v.y, V_W, V_H, '#4B3593', true, C.villain);
          api.drawVillain(vx + 11, v.y + V_H * 0.42, V_W - 22, 24, clamp((h.x - v.x) / 120, -1, 1));
          api.nameTag(api.cfg.villain, v.x, v.y - 4);
        }

        const tilt = clamp((laneX(h.lane) - h.x) / LANE, -1, 1) * 0.22;
        if (!(h.inv > 0 && Math.floor(t * 12) % 2)) {
          ctx.save();
          ctx.translate(h.x, HERO_Y + CAR_H / 2); ctx.rotate(tilt); ctx.translate(-CAR_W / 2, -CAR_H / 2);
          car(0, 0, CAR_W, CAR_H, C.hero, true, C.gold);
          ctx.restore();
        }
        api.nameTag(api.cfg.hero, h.x, HERO_Y - 4);

        for (const side of [-1, 1]) {
          const x = side < 0 ? ROAD / 2 : W - ROAD / 2, y = 304;
          ctx.globalAlpha = this.press.t > 0 && this.press.side === side ? 0.55 : 0.16;
          ctx.fillStyle = C.text;
          ctx.beginPath(); ctx.moveTo(x + side * 14, y); ctx.lineTo(x - side * 10, y - 20); ctx.lineTo(x - side * 10, y + 20); ctx.closePath(); ctx.fill();
          ctx.globalAlpha = 1;
        }
        if (this.age > 0 && this.age < 3) {
          ctx.globalAlpha = clamp(3 - this.age, 0, 1) * 0.9;
          api.txt('Касайся слева или справа', W / 2, 190, 15, C.text, 700, 'center');
          ctx.globalAlpha = 1;
        }

        const g = ctx.createLinearGradient(0, 0, 0, 50);
        g.addColorStop(0, 'rgba(11, 11, 14, 0.85)'); g.addColorStop(1, 'rgba(11, 11, 14, 0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, 50);
        const p = clamp(this.dist / GOAL, 0, 1);
        ctx.fillStyle = 'rgba(255,255,255,0.14)'; api.rr(190, 14, 260, 8, 4); ctx.fill();
        ctx.fillStyle = C.hero; api.rr(190, 14, Math.max(8, 260 * p), 8, 4); ctx.fill();
        api.txt('до злодея', 320, 40, 11, C.muted, 600, 'center');
      }
    };
  }
});
