/* Жанр «Викторина»: злодей задаёт примеры на счёт, игрок выбирает ответ из четырёх.
   Вопросы только сгенерированные: лёгкая сложность до 20, обычная таблица умножения, высокая примеры в два действия */
MG.register('quiz', {
  title: 'Викторина',
  icon: 'exam',
  controls: 'Касание ответа или клавиши 1, 2, 3, 4',
  hint: [['1 2 3 4', 'выбрать ответ'], ['Касание', 'по варианту']],
  goal: 'верно ответить злодею на 8 вопросов',
  make(api) {
    const { W, C, randInt, clamp, inRect } = api;
    const d = api.diff, lvl = api.cfg.diff;
    const NEED = 8;
    const LIMIT = { easy: 12, normal: 10, hard: 8 }[lvl] || 10;
    const GREEN = '#4ADE80';
    const OPTS = [0, 1, 2, 3].map(i => ({ x: 118 + (i % 2) * 208, y: 210 + Math.floor(i / 2) * 72, w: 196, h: 60 }));
    const BUBBLE = { x: 146, y: 54, w: 356, h: 118 };
    const HERO = { x: 548, y: 120, w: 36, h: 46 };
    const MINUS = '−';
    const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = randInt(0, i); [a[i], a[j]] = [a[j], a[i]]; } return a; };

    /* Пример по уровню: текст, ответ, «правдоподобные» ошибки (сначала типичные, потом соседние числа) */
    function example() {
      if (lvl === 'easy') {
        if (Math.random() < 0.5) {
          const a = randInt(2, 16), b = randInt(2, 20 - a), s = a + b;
          return { text: `${a} + ${b}`, answer: s, near: [s + 1, s - 1, s + 2, s - 2], far: [s + 10, s - 10, a > b ? a - b : b - a, s + 3] };
        }
        const a = randInt(6, 20), b = randInt(2, a - 1), s = a - b;
        return { text: `${a} ${MINUS} ${b}`, answer: s, near: [s + 1, s - 1, s + 2, s - 2], far: [a + b, s + 10, s + 3, s - 3] };
      }
      const a = randInt(2, 9), b = randInt(2, 9);
      if (lvl !== 'hard') {
        const s = a * b;
        return { text: `${a} × ${b}`, answer: s, near: [(a + 1) * b, (a - 1) * b, a * (b + 1), a * (b - 1)], far: [s + 1, s - 1, s + 10, s - 10, s + 2] };
      }
      const f = randInt(0, 3);
      if (f === 0) {
        const c = randInt(2, 19), s = a * b + c;
        return { text: `${a} × ${b} + ${c}`, answer: s, near: [a * (b + c), (a + 1) * b + c, s + 10], far: [s + 1, s - 1, s - 10, s + 2] };
      }
      if (f === 1) {
        const c = randInt(2, Math.min(19, a * b - 1)), s = a * b - c;
        return { text: `${a} × ${b} ${MINUS} ${c}`, answer: s, near: [a * b + c, b > c ? a * (b - c) : s + 10, s - 10], far: [s + 1, s - 1, s + 2, s - 2] };
      }
      if (f === 2) {
        const c = randInt(2, 19), s = c + a * b;
        return { text: `${c} + ${a} × ${b}`, answer: s, near: [(c + a) * b, c + a * (b + 1), s - 10], far: [s + 1, s - 1, s + 10, s + 2] };
      }
      const p = randInt(2, 7), q = randInt(2, 12 - p), c = randInt(2, 6), s = (p + q) * c;
      return { text: `(${p} + ${q}) × ${c}`, answer: s, near: [p + q * c, s + c, s - c], far: [s + 1, s - 1, s + 10, s - 10] };
    }
    const used = new Set();
    function question() {
      let e, n = 0;
      do { e = example(); } while (used.has(e.text) && ++n < 40);
      used.add(e.text);
      const wrong = [];
      for (const v of [...shuffle(e.near), ...shuffle(e.far)]) {
        if (wrong.length < 3 && Number.isInteger(v) && v >= 0 && v !== e.answer && !wrong.includes(v)) wrong.push(v);
      }
      for (let k = 3; wrong.length < 3; k++) if (!wrong.includes(e.answer + k)) wrong.push(e.answer + k);
      const options = shuffle([e.answer, ...wrong]);
      return { text: e.text, answer: e.answer, options, right: options.indexOf(e.answer) };
    }
    function fit(str, size, weight, maxW) {
      api.ctx.font = `${weight} ${size}px ${api.FONT}`;
      return api.fitWord(str, maxW);
    }
    function check(ctx, x, y, color) {
      ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x - 6, y); ctx.lineTo(x - 1, y + 5); ctx.lineTo(x + 7, y - 5); ctx.stroke();
    }
    function cross(ctx, x, y, color) {
      ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x - 5, y - 5); ctx.lineTo(x + 5, y + 5); ctx.moveTo(x + 5, y - 5); ctx.lineTo(x - 5, y + 5); ctx.stroke();
    }

    const g = {
      lives: d.lives, score: 0, correct: 0, asked: 0,
      q: null, phase: 'ask', left: LIMIT, pick: -1, ok: false, wait: 0, phaseT: 0,
      joy: 0, laugh: 0, shake: 0, auto: false,
      status() { return `Верно ${this.correct} из ${NEED}`; },
      next() {
        this.q = question(); this.asked++;
        this.phase = 'ask'; this.left = LIMIT; this.pick = -1; this.ok = false; this.phaseT = 0;
      },
      answer(i) {
        if (this.phase !== 'ask') return;
        const q = this.q;
        this.pick = i; this.phase = 'reveal'; this.phaseT = 0;
        this.ok = i === q.right;
        if (this.ok) {
          this.correct++;
          this.score += 50 + Math.round(this.left * 5);
          this.joy = 1.1; this.wait = 1.0;
          const b = OPTS[i];
          api.burst(b.x + b.w / 2, b.y + b.h / 2, GREEN, 10);
          api.burst(HERO.x + HERO.w / 2, HERO.y, C.gold, 12);
        } else {
          this.lives--;
          this.laugh = 1.5; this.shake = 0.4; this.wait = 1.7;
          if (i >= 0) { const b = OPTS[i]; api.burst(b.x + b.w / 2, b.y + b.h / 2, C.danger, 8); }
        }
      },
      cheat() { this.lives = 99; this.correct = Math.max(this.correct, NEED - 1); this.auto = true; },
      onKey(code) {
        const m = /^Digit([1-4])$/.exec(code);
        if (m) this.answer(Number(m[1]) - 1);
      },
      onPointerDown(p) {
        for (let i = 0; i < 4; i++) if (inRect(p, OPTS[i])) return this.answer(i);
      },
      update(dt) {
        this.phaseT += dt; this.joy -= dt; this.laugh -= dt; this.shake -= dt;
        if (this.phase === 'ask') {
          if (this.auto && this.phaseT > 0.3) return this.answer(this.q.right);
          this.left -= dt;
          if (this.left <= 0) { this.left = 0; this.answer(-1); }
          return;
        }
        this.wait -= dt;
        if (this.wait > 0) return;
        if (this.correct >= NEED) { api.burst(HERO.x + HERO.w / 2, HERO.y, C.gold, 24); return api.win(); }
        if (this.lives <= 0) return api.lose();
        this.next();
      },
      draw() {
        const ctx = api.ctx, t = api.time, q = this.q, villain = api.cfg.villain;
        api.starfield('#110F1B', 0, 0.35);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.03)'; ctx.fillRect(0, 186, W, 174);

        /* Злодей слева, смеётся над ошибкой */
        const laugh = this.laugh > 0 ? Math.abs(Math.sin(t * 16)) * 6 : Math.sin(t * 2) * 1.5;
        const vx = 34, vy = 98 - laugh;
        api.drawVillain(vx, vy, 78, 80, 1);
        api.nameTag(villain, vx + 39, vy - 24);
        if (this.laugh > 0) api.txt('Ха-ха!', vx + 39, 200, 15, C.villain, 700, 'center');

        /* Пузырь с вопросом */
        const B = BUBBLE;
        ctx.fillStyle = '#1E1B2E'; api.rr(B.x, B.y, B.w, B.h, 16); ctx.fill();
        ctx.strokeStyle = 'rgba(167, 139, 250, 0.4)'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = '#1E1B2E';
        ctx.beginPath(); ctx.moveTo(B.x + 1, B.y + 52); ctx.lineTo(B.x - 16, B.y + 66); ctx.lineTo(B.x + 1, B.y + 76); ctx.fill();
        ctx.strokeStyle = 'rgba(167, 139, 250, 0.4)';
        ctx.beginPath(); ctx.moveTo(B.x, B.y + 52); ctx.lineTo(B.x - 16, B.y + 66); ctx.lineTo(B.x, B.y + 76); ctx.stroke();
        let head, headColor = C.muted;
        if (this.phase === 'ask') head = `${villain} спрашивает:`;
        else if (this.ok) { head = `Верно! ${api.cfg.hero} молодец`; headColor = GREEN; }
        else if (this.pick < 0) { head = `Время вышло. Ответ: ${q.answer}`; headColor = C.danger; }
        else { head = `Неверно. Правильный ответ: ${q.answer}`; headColor = C.danger; }
        api.txt(fit(head, 14, 600, B.w - 32), B.x + B.w / 2, B.y + 30, 14, headColor, 600, 'center');
        const tail = this.phase === 'ask' ? '?' : String(q.answer);
        const left = `${q.text} = `;
        ctx.font = `800 38px ${api.FONT}`;
        const wl = ctx.measureText(left).width, wt = ctx.measureText(tail).width;
        const x0 = B.x + B.w / 2 - (wl + wt) / 2;
        api.txt(left, x0, B.y + 86, 38, C.text, 800);
        api.txt(tail, x0 + wl, B.y + 86, 38, this.phase === 'ask' ? C.gold : (this.ok ? GREEN : C.teal), 800);
        api.txt(`Вопрос ${this.asked}`, B.x + B.w - 14, B.y + B.h - 10, 11, C.muted, 600, 'right');

        /* Герой справа, прыгает от радости */
        const joy = this.joy > 0 ? Math.abs(Math.sin(t * 12)) * 14 : 0;
        const sad = !this.ok && this.phase === 'reveal' ? Math.sin(t * 40) * 2 : 0;
        api.drawHero(HERO.x + sad, HERO.y - joy, HERO.w, HERO.h, -1, 0, false);
        api.nameTag(api.cfg.hero, HERO.x + HERO.w / 2, HERO.y - joy - 8);
        if (this.joy > 0) for (let i = 0; i < 3; i++) api.star(HERO.x + HERO.w / 2 + Math.cos(t * 4 + i * 2.1) * 30, HERO.y + 16 - joy + Math.sin(t * 4 + i * 2.1) * 18, 6, C.gold, t * 3);

        /* Полоска времени */
        const p = this.phase === 'ask' ? clamp(this.left / LIMIT, 0, 1) : (this.ok ? clamp(this.left / LIMIT, 0, 1) : 0);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'; api.rr(118, 190, 404, 10, 5); ctx.fill();
        ctx.fillStyle = p > 0.5 ? C.teal : p > 0.25 ? C.gold : C.danger;
        if (p > 0) { api.rr(118, 190, Math.max(10, 404 * p), 10, 5); ctx.fill(); }
        api.txt(`${Math.ceil(this.phase === 'ask' || this.ok ? this.left : 0)} с`, 530, 200, 12, C.muted, 700);

        /* Четыре варианта 2x2 */
        for (let i = 0; i < 4; i++) {
          const b = OPTS[i];
          const right = this.phase === 'reveal' && i === q.right;
          const wrong = this.phase === 'reveal' && i === this.pick && !this.ok;
          const dim = this.phase === 'reveal' && !right && !wrong;
          const dx = wrong && this.shake > 0 ? Math.sin(t * 60) * 4 : 0;
          ctx.globalAlpha = dim ? 0.45 : 1;
          ctx.fillStyle = right ? 'rgba(74, 222, 128, 0.25)' : wrong ? 'rgba(255, 107, 107, 0.25)' : 'rgba(255, 255, 255, 0.07)';
          api.rr(b.x + dx, b.y, b.w, b.h, 14); ctx.fill();
          ctx.strokeStyle = right ? GREEN : wrong ? C.danger : 'rgba(255, 255, 255, 0.16)';
          ctx.lineWidth = right || wrong ? 2.5 : 1.5; ctx.stroke();
          ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
          ctx.beginPath(); ctx.arc(b.x + dx + 26, b.y + b.h / 2, 14, 0, Math.PI * 2); ctx.fill();
          api.txt(String(i + 1), b.x + dx + 26, b.y + b.h / 2 + 5, 14, C.muted, 700, 'center');
          api.txt(String(q.options[i]), b.x + dx + b.w / 2 + 8, b.y + 41, 28, C.text, 800, 'center');
          if (right) check(ctx, b.x + b.w - 24, b.y + b.h / 2, GREEN);
          if (wrong) cross(ctx, b.x + dx + b.w - 24, b.y + b.h / 2, C.danger);
          ctx.globalAlpha = 1;
        }
      }
    };
    g.next();
    return g;
  }
});
