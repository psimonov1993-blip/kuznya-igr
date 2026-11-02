/* Жанр «Платформер»: собрать 8 звёзд на платформах и не попасться злодею, который ускоряется с каждой звездой */
MG.register('collector', {
  title: 'Платформер',
  icon: 'star',
  controls: 'Кнопки на экране или стрелки и пробел',
  hint: [['← →', 'бег'], ['Пробел', 'прыжок']],
  goal: 'собрать 8 звёзд и не попасться',
  make(api) {
    const { W, C, clamp, overlap, inRect, input } = api;
    const d = api.diff;
    const PLATFORMS = [
      { x: 0, y: 330, w: 640, h: 30 },
      { x: 70, y: 262, w: 130, h: 12 }, { x: 250, y: 212, w: 130, h: 12 }, { x: 440, y: 262, w: 130, h: 12 },
      { x: 140, y: 150, w: 120, h: 12 }, { x: 360, y: 112, w: 130, h: 12 }, { x: 540, y: 180, w: 90, h: 12 }
    ];
    const SPOTS = [[95, 236], [315, 186], [505, 236], [200, 124], [425, 86], [585, 154], [330, 304], [548, 302]];
    const BTN = { left: { x: 12, y: 300, w: 52, h: 48 }, right: { x: 72, y: 300, w: 52, h: 48 }, jump: { x: W - 64, y: 300, w: 52, h: 48 } };
    const pressed = name => { for (const p of input.ptrs.values()) if (inRect(p, BTN[name])) return true; return false; };
    return {
      hero: { x: 150, y: 228, w: 26, h: 34, vy: 0, onGround: true, inv: 0, coyote: 0, facing: 1 },
      villain: { x: 300, y: 294, w: 34, h: 36, dir: 1, speed: 70 * d.speed },
      stars: SPOTS.map(([x, y]) => ({ x, y, taken: false })),
      lives: d.lives, score: 0, btnJump: 0,
      status() { return `Звёзды ${this.stars.filter(s => s.taken).length} из ${this.stars.length}`; },
      onPointerDown(p) { if (inRect(p, BTN.jump)) this.btnJump = 0.15; },
      cheat() {
        this.lives = 99;
        this.stars.forEach((s, i) => { if (i) s.taken = true; });
        const s = this.stars[0];
        Object.assign(this.hero, { x: s.x - 13, y: s.y - 17, vy: 0, inv: 9 });
      },
      update(dt) {
        const h = this.hero;
        let dir = 0;
        if (input.keys.has('ArrowLeft') || input.keys.has('KeyA') || pressed('left')) dir -= 1;
        if (input.keys.has('ArrowRight') || input.keys.has('KeyD') || pressed('right')) dir += 1;
        if (dir) h.facing = dir;
        h.x = clamp(h.x + dir * 220 * dt, 0, W - h.w);
        h.inv -= dt; h.coyote -= dt; this.btnJump -= dt;
        const wantJump = api.useJump() || this.btnJump > 0;
        if (wantJump && (h.onGround || h.coyote > 0)) { h.vy = -640; h.onGround = false; h.coyote = 0; this.btnJump = 0; }
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
            s.taken = true; this.score += 10; v.speed *= 1.08; api.burst(s.x, s.y, C.gold, 10);
          }
        }
        if (h.inv <= 0 && overlap({ x: h.x + 3, y: h.y + 3, w: h.w - 6, h: h.h - 3 }, { x: v.x + 4, y: v.y + 4, w: v.w - 8, h: v.h - 4 })) {
          this.lives--; api.burst(h.x + h.w / 2, h.y + h.h / 2, C.danger, 12);
          if (this.lives <= 0) return api.lose();
          h.x = 150; h.y = 228; h.vy = 0; h.inv = 1.5;
        }
        if (this.stars.every(s => s.taken)) { this.score += 50; api.win(); }
      },
      draw() {
        const ctx = api.ctx, t = api.time;
        api.starfield('#121019', 0, 0.35);
        ctx.fillStyle = 'rgba(255, 209, 102, 0.08)';
        ctx.beginPath(); ctx.arc(560, 60, 34, 0, Math.PI * 2); ctx.fill();
        PLATFORMS.forEach((p, i) => {
          ctx.fillStyle = i === 0 ? '#272727' : '#313131';
          api.rr(p.x, p.y, p.w, p.h, i === 0 ? 0 : 6); ctx.fill();
          if (i > 0) { ctx.fillStyle = 'rgba(255, 138, 31, 0.5)'; ctx.fillRect(p.x + 6, p.y, p.w - 12, 2); }
        });
        for (const s of this.stars) if (!s.taken) api.star(s.x, s.y + Math.sin(t * 3 + s.x) * 3, 10, C.gold, Math.sin(t + s.y) * 0.3);
        const v = this.villain;
        api.drawVillain(v.x, v.y, v.w, v.h, v.dir);
        api.nameTag(api.cfg.villain, v.x + v.w / 2, v.y - 10);
        const h = this.hero;
        api.drawHero(h.x, h.y, h.w, h.h, h.facing, 0, h.inv > 0);
        api.nameTag(api.cfg.hero, h.x + h.w / 2, h.y - 6);
        api.button(BTN.left, '◀', pressed('left'));
        api.button(BTN.right, '▶', pressed('right'));
        api.button(BTN.jump, '▲', pressed('jump'));
      }
    };
  }
});
