/* Жанр «Полёт»: герой держится в воздухе взмахами и пролетает проёмы в кристальных колоннах злодея,
   за последней, двенадцатой колонной его ждёт сам злодей */
MG.register('flyer', {
  title: 'Полёт',
  icon: 'bird',
  controls: 'Пробел, стрелка вверх или касание: взмах',
  hint: [['Пробел', 'или касание: взмах']],
  goal: 'пролететь 12 проёмов в кристальных колоннах',
  make(api) {
    const { W, H, C, rand, clamp, overlap } = api;
    const d = api.diff;
    const TOP = 46, GROUND = 334, NEED = 12, CW = 58, SPACING = 236, HX = 160, START_Y = 190;
    const GAP = Math.round(130 - (d.speed - 1) * 75);
    const SPEED = 150 * d.speed;
    const PEAKS = Array.from({ length: 16 }, (_, i) => ({ x: i * 48, h: rand(30, 95), w: rand(30, 56) }));

    function crystal(x, baseY, tipY, gold) {
      const ctx = api.ctx, s = tipY > baseY ? 1 : -1, k = 18;
      ctx.beginPath();
      ctx.moveTo(x, baseY);
      ctx.lineTo(x, tipY - s * k);
      ctx.lineTo(x + CW * 0.3, tipY - s * 5);
      ctx.lineTo(x + CW * 0.55, tipY);
      ctx.lineTo(x + CW * 0.8, tipY - s * 8);
      ctx.lineTo(x + CW, tipY - s * k * 0.8);
      ctx.lineTo(x + CW, baseY);
      ctx.closePath();
      ctx.fillStyle = C.villainDark; ctx.fill();
      ctx.strokeStyle = gold ? C.gold : C.villain; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = 'rgba(167, 139, 250, 0.45)';
      ctx.beginPath();
      ctx.moveTo(x + 7, baseY); ctx.lineTo(x + 7, tipY - s * (k + 6)); ctx.lineTo(x + CW * 0.3, tipY - s * 10); ctx.lineTo(x + CW * 0.38, baseY);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.fillRect(x + CW * 0.66, tipY - s * 34, 3, 3);
      ctx.fillRect(x + CW * 0.5, tipY - s * 64, 2, 2);
    }

    const g = {
      hero: { y: START_Y, vy: 0, inv: 0, hold: 2, flap: 0 },
      cols: [], made: 0, passed: 0, scroll: 0, lastGapY: START_Y - GAP / 2, villain: null, age: 0, auto: false,
      lives: d.lives, score: 0,
      status() { return `Проёмы ${this.passed} из ${NEED}`; },
      makeCol(x, gy) {
        const lo = TOP + 26, hi = GROUND - 26 - GAP;
        if (gy === undefined) gy = clamp(this.lastGapY + rand(-110, 110), lo, hi);
        this.lastGapY = gy; this.made++;
        const c = { x, gy, passed: false, last: this.made === NEED };
        this.cols.push(c);
        if (c.last) this.villain = { x: x + CW + 110, y: gy + GAP / 2 - 24 };
      },
      cheat() {
        this.lives = 99; this.auto = true;
        this.cols = []; this.made = NEED - 1; this.passed = NEED - 1;
        Object.assign(this.hero, { y: START_Y, vy: 0, inv: 9, hold: 6 });
        this.makeCol(HX + 40, START_Y - GAP / 2);
      },
      hurt() {
        const h = this.hero;
        this.lives--; api.burst(HX, h.y, C.danger, 14);
        if (this.lives <= 0) return api.lose();
        Object.assign(h, { y: START_Y, vy: 0, inv: 1.8, hold: 1.0 });
      },
      update(dt) {
        const h = this.hero;
        this.age += dt;
        h.inv -= dt; h.flap -= dt;
        const tap = api.useJump() || api.useTap();
        if (h.hold > 0) {
          h.hold -= dt; h.vy = 0;
          if (tap) { h.hold = 0; h.vy = -330; h.flap = 0.25; }
        } else {
          if (tap) { h.vy = -330; h.flap = 0.25; }
          h.vy = Math.min(h.vy + 1150 * dt, 520);
          h.y += h.vy * dt;
        }
        if (h.y < TOP + 12) { h.y = TOP + 12; h.vy = Math.max(0, h.vy); }

        const dx = SPEED * dt;
        this.scroll += dx;
        for (const c of this.cols) c.x -= dx;
        if (this.villain) this.villain.x -= dx;
        const lastC = this.cols[this.cols.length - 1];
        if (this.made < NEED && (!lastC || lastC.x < W + 40 - SPACING)) {
          this.makeCol(lastC ? lastC.x + SPACING : W + 40, this.made === 0 ? START_Y - GAP / 2 + rand(-40, 40) : undefined);
        }

        for (const c of this.cols) {
          if (!c.passed && c.x + CW < HX - 12) {
            c.passed = true; this.passed++; this.score += 10;
            api.burst(HX, h.y, C.gold, 6);
            if (this.passed >= NEED) {
              const v = this.villain;
              if (v) api.burst(v.x + 22, v.y + 24, C.villain, 30);
              this.score += 50;
              return api.win();
            }
          }
        }
        this.cols = this.cols.filter(c => c.x + CW > -20);

        if (h.y + 10 >= GROUND) {
          if (h.inv > 0) { h.y = GROUND - 10; h.vy = -280; }
          else return this.hurt();
        }
        if (h.inv <= 0) {
          const hb = { x: HX - 12, y: h.y - 10, w: 24, h: 20 };
          for (const c of this.cols) {
            const top = { x: c.x + 4, y: 0, w: CW - 8, h: c.gy - 2 };
            const bot = { x: c.x + 4, y: c.gy + GAP + 2, w: CW - 8, h: GROUND - c.gy - GAP };
            if (overlap(hb, top) || overlap(hb, bot)) return this.hurt();
          }
        }
      },
      draw() {
        const ctx = api.ctx, t = api.time, h = this.hero;
        api.starfield('#0D0B18', 0, 0.45);
        const off = this.scroll * 0.3;
        ctx.fillStyle = '#1C1530';
        for (const m of PEAKS) {
          const x = ((m.x - off) % 768 + 768) % 768 - 64;
          ctx.beginPath(); ctx.moveTo(x, GROUND); ctx.lineTo(x + m.w * 0.5, GROUND - m.h); ctx.lineTo(x + m.w, GROUND); ctx.fill();
        }

        for (const c of this.cols) {
          crystal(c.x, 0, c.gy, c.last);
          crystal(c.x, GROUND, c.gy + GAP, c.last);
        }

        const v = this.villain;
        if (v && v.x < W + 60) {
          const bob = Math.sin(t * 3) * 5;
          ctx.fillStyle = 'rgba(167, 139, 250, 0.16)';
          ctx.beginPath(); ctx.arc(v.x + 22, v.y + 24 + bob, 40, 0, Math.PI * 2); ctx.fill();
          api.drawVillain(v.x, v.y + bob, 44, 48, -1);
          api.nameTag(api.cfg.villain, v.x + 22, v.y + bob - 14);
        }

        ctx.fillStyle = '#1A1726'; ctx.fillRect(0, GROUND, W, H - GROUND);
        ctx.fillStyle = C.villainDark; ctx.fillRect(0, GROUND, W, 3);
        ctx.fillStyle = 'rgba(167, 139, 250, 0.25)';
        const gs = this.scroll % 40;
        for (let x = -gs; x < W; x += 40) ctx.fillRect(x, GROUND + 12, 18, 3);

        const bob = h.hold > 0 ? Math.sin(t * 6) * 4 : 0;
        const y = h.y + bob;
        if (!(h.inv > 0 && Math.floor(t * 12) % 2)) {
          ctx.save();
          ctx.translate(HX, y); ctx.rotate(clamp(h.vy / 700, -0.45, 0.7));
          const flap = h.flap > 0 ? Math.sin((0.25 - h.flap) / 0.25 * Math.PI) : Math.sin(t * 8) * 0.3;
          ctx.fillStyle = C.gold;
          ctx.beginPath(); ctx.moveTo(-2, -2); ctx.lineTo(-24, -12 - flap * 12); ctx.lineTo(-10, 6); ctx.closePath(); ctx.fill();
          api.drawHero(-14, -12, 28, 24, 1, 0, false);
          ctx.restore();
        }
        api.nameTag(api.cfg.hero, HX, y - 18);

        if (h.hold > 0 && this.age > 0 && !this.auto) {
          ctx.globalAlpha = 0.65 + Math.sin(t * 5) * 0.25;
          api.txt('Касание или пробел: взмах', W / 2, GROUND - 22, 14, C.text, 700, 'center');
          ctx.globalAlpha = 1;
        }
      }
    };
    return g;
  }
});
