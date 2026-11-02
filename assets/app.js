/* Мастерская ИГР: поведение страницы (меню, жанры, конструктор, заявки, анимации) */
(() => {
  'use strict';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  const LEAD_URL = 'https://terminator.pw/webhook/masterskaya-igr-lead';

  /* ---------- Жанры: каталог и демо ---------- */
  const GENRES = [
    { id: 'runner', img: 'runner', title: 'Раннер', icon: 'person-simple-run', text: 'Беги, прыгай, догоняй злодея', live: true },
    { id: 'space', img: 'space', title: 'Космобой', icon: 'rocket-launch', text: 'Космическая аркада с боссом', live: true },
    { id: 'collector', img: 'platformer', title: 'Платформер', icon: 'star', text: 'Прыжки по платформам за звёздами', live: true },
    { id: 'racing', img: 'racing', title: 'Гонки', icon: 'steering-wheel', text: 'Обгоны и монеты на трёх полосах', live: true },
    { id: 'horror', img: 'horror', title: 'Хоррор-лабиринт', short: 'Хоррор', icon: 'ghost', text: 'Темнота, фонарь и ключ от двери', live: true },
    { id: 'quiz', img: 'quiz', title: 'Викторина', icon: 'exam', text: 'Тренажёр для урока и экзамена', live: true },
    { id: 'breakout', img: 'breakout', title: 'Разбей стену', short: 'Стена', icon: 'squares-four', text: 'Мяч, платформа и стена злодея', live: true },
    { id: 'flyer', img: 'flyer', title: 'Полёт', icon: 'bird', text: 'Одно касание, проём за проёмом', live: true },
    { id: 'match3', img: 'match3', title: 'Три в ряд', icon: 'diamonds-four', text: 'Самоцветы, каскады и комбо', live: true },
    { id: 'snake', img: 'snake', title: 'Змейка', icon: 'wave-sine', text: 'Классика с твоими героями', live: true },
    { id: 'dialog', img: 'dialog', title: 'Квест с диалогами', icon: 'chats-circle', text: 'История, где ответ меняет сюжет' },
    { id: 'tower', img: 'tower', title: 'Защита башен', icon: 'castle-turret', text: 'Строй башни, держи дорогу' },
    { id: 'tycoon', img: 'tycoon', title: 'Ферма и магнат', icon: 'plant', text: 'Строй, собирай урожай, богатей' },
    { id: 'fighting', img: 'fighting', title: 'Арена', icon: 'sword', text: 'Поединок героя и злодея' },
    { id: 'physics', img: 'physics', title: 'Физическая головоломка', icon: 'gear-six', text: 'Рычаги, верёвки и шарик до цели' },
    { id: 'catcher', img: 'catcher', title: 'Поймай', icon: 'basket', text: 'Лови подарки, не лови бомбы' }
  ];

  const grid = document.getElementById('genre-grid');
  const pick = document.getElementById('genre-pick');
  GENRES.forEach((g, i) => {
    const card = document.createElement('article');
    card.className = 'gcard reveal' + (g.live ? ' live' : '');
    card.style.setProperty('--i', String(i % 4));
    card.innerHTML = `
      <figure><img src="img/g-${g.img}.webp" alt="" width="640" height="640" loading="lazy" decoding="async">
        <span class="badge caption-3">${g.live ? '▶ Можно сыграть' : 'Скоро'}</span></figure>
      <div class="gbody"><h3 class="title-2"></h3><p class="body-6"></p></div>
      ${g.live
        ? `<div class="gact"><button class="btn btn-primary button-sm" type="button" data-play="${g.id}"><i class="ph ph-play" aria-hidden="true"></i>Играть</button></div>`
        : '<div class="soon caption-1"><i class="ph ph-clock" aria-hidden="true"></i>Появится в сервисе</div>'}`;
    card.querySelector('h3').textContent = g.title;
    card.querySelector('p').textContent = g.text;
    card.querySelector('img').alt = `${g.title}: ${g.text}`;
    grid.appendChild(card);
    if (g.live) {
      const label = document.createElement('label');
      label.className = 'option';
      label.innerHTML = `<input type="radio" name="genre" value="${g.id}"${i === 0 ? ' checked' : ''}><span class="card-opt caption-4"><i class="ph ph-${g.icon}" aria-hidden="true"></i></span>`;
      label.querySelector('.card-opt').append(g.short || g.title);
      pick.appendChild(label);
    }
  });
  grid.classList.add('stagger');

  /* ---------- Мобильное меню ---------- */
  const burger = document.querySelector('.burger');
  const menu = document.getElementById('mobile-menu');
  const menuItems = [...menu.querySelectorAll('a')];
  const step = Math.min(60, 400 / menuItems.length);
  function setMenu(open) {
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    menu.classList.toggle('open', open);
    menu.setAttribute('aria-hidden', String(!open));
    document.body.style.overflow = open ? 'hidden' : '';
    menuItems.forEach((a, i) => { a.style.transitionDelay = open ? `${Math.round(i * step)}ms` : '0ms'; a.tabIndex = open ? 0 : -1; });
  }
  menuItems.forEach(a => { a.tabIndex = -1; a.addEventListener('click', () => setMenu(false)); });
  burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && menu.classList.contains('open')) { setMenu(false); burger.focus(); } });

  /* ---------- Текущий раздел ---------- */
  const navLinks = [...document.querySelectorAll('.nav-links a')];
  if ('IntersectionObserver' in window) {
    const spy = new IntersectionObserver(entries => {
      for (const en of entries) if (en.isIntersecting) navLinks.forEach(a => a.setAttribute('aria-current', String(a.getAttribute('href') === '#' + en.target.id)));
    }, { rootMargin: '-45% 0px -50% 0px' });
    ['genres', 'demo', 'how', 'plans', 'biz', 'faq'].forEach(id => { const el = document.getElementById(id); if (el) spy.observe(el); });
  }

  /* ---------- Появление блоков, один раз ---------- */
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      for (const en of entries) if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(el => io.observe(el));
  } else reveals.forEach(el => el.classList.add('in'));

  /* ---------- Слоган по словам (B11) ---------- */
  const tag = document.getElementById('tagline');
  const words = [];
  if (tag) {
    const split = (node, hot) => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.append(part); return; }
            const s = document.createElement('span');
            s.className = hot ? 'w hot' : 'w';
            s.textContent = part;
            frag.append(s); words.push(s);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) split(n, hot || n.hasAttribute('data-hot'));
      });
    };
    split(tag, false);
    if (reduce) words.forEach(w => w.classList.add('on'));
  }

  /* ---------- Прокрутка: слоган и параллакс главной картинки ---------- */
  const heroImg = document.getElementById('hero-img');
  let ticking = false;
  function onScroll() {
    ticking = false;
    const vh = window.innerHeight;
    if (tag && !reduce) {
      const r = tag.getBoundingClientRect();
      const startLine = vh * 0.85, endLine = vh * 0.4;
      const p = Math.max(0, Math.min(1, (startLine - r.top) / (startLine - endLine + r.height * 0.5)));
      const n = Math.round(p * words.length);
      words.forEach((w, i) => w.classList.toggle('on', i < n));
    }
    if (heroImg && !reduce && window.scrollY < vh * 1.2) heroImg.style.transform = `scale(1.04) translateY(${(window.scrollY * 0.08).toFixed(1)}px)`;
  }
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* ---------- Телефон в первом экране ---------- */
  const phone = document.getElementById('phone-screen');
  const phoneLabel = document.getElementById('phone-label');
  if (phone) {
    const shows = ['runner', 'horror', 'racing', 'match3', 'space', 'quiz'].map(id => GENRES.find(g => g.img === id));
    const imgs = shows.map((g, i) => {
      const im = document.createElement('img');
      im.src = `img/g-${g.img}.webp`; im.alt = ''; im.loading = i ? 'lazy' : 'eager';
      if (!i) im.className = 'on';
      phone.insertBefore(im, phone.firstChild);
      return im;
    });
    let cur = 0;
    if (!reduce && window.innerWidth >= 1000) {
      setInterval(() => {
        imgs[cur].classList.remove('on');
        cur = (cur + 1) % imgs.length;
        imgs[cur].classList.add('on');
        phoneLabel.textContent = shows[cur].title;
      }, 2600);
    }
  }

  /* ---------- Наклон карточек за курсором ---------- */
  if (finePointer && !reduce) {
    grid.addEventListener('pointermove', e => {
      const card = e.target.closest('.gcard');
      if (!card) return;
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `translateY(-4px) rotateX(${(-y * 6).toFixed(2)}deg) rotateY(${(x * 6).toFixed(2)}deg)`;
    });
    grid.addEventListener('pointerout', e => {
      const card = e.target.closest('.gcard');
      if (card && !card.contains(e.relatedTarget)) card.style.transform = '';
    });
  }

  /* ---------- Конструктор демо ---------- */
  const form = document.getElementById('demo-form');
  const buildBtn = document.getElementById('build-btn');
  const skeleton = document.getElementById('skeleton');
  const skStatus = document.getElementById('sk-status');
  const demo = () => window.MGDemo;
  const errors = {
    hero: v => v ? '' : 'Впиши имя героя, хватит одного слова',
    villain: v => v ? '' : 'Впиши имя злодея, хватит одного слова',
    plot: v => v.length >= 10 ? '' : 'Опиши сюжет хотя бы одним предложением'
  };
  function readForm() {
    const fd = new FormData(form);
    const s = name => String(fd.get(name) || '').replace(/\s+/g, ' ').trim();
    return { genre: s('genre'), purpose: s('purpose'), desc: s('desc'), hero: s('hero'), villain: s('villain'), plot: s('plot') };
  }
  function validateDemo(v) {
    let first = null;
    for (const [name, check] of Object.entries(errors)) {
      const msg = check(v[name]);
      const input = form.elements[name];
      document.getElementById('e-' + name).textContent = msg;
      input.setAttribute('aria-invalid', String(!!msg));
      if (msg && !first) first = input;
    }
    if (first) first.focus();
    return !first;
  }
  ['hero', 'villain', 'plot'].forEach(name => form.elements[name].addEventListener('input', () => {
    const input = form.elements[name];
    if (input.getAttribute('aria-invalid') !== 'true') return;
    const msg = errors[name](input.value.trim());
    document.getElementById('e-' + name).textContent = msg;
    input.setAttribute('aria-invalid', String(!!msg));
  }));
  function buildDemo(scroll) {
    const v = readForm();
    if (!validateDemo(v) || !demo()) return;
    buildBtn.disabled = true;
    skeleton.classList.add('show');
    ['Читаю описание и сюжет', 'Собираю уровень из шаблона жанра', 'Расставляю героев'].forEach((t, i) => setTimeout(() => { skStatus.textContent = t; }, i * 230));
    setTimeout(() => {
      demo().build(v);
      skeleton.classList.remove('show');
      buildBtn.disabled = false;
      if (scroll || window.innerWidth < 1040) document.getElementById('screen').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    }, 700);
  }
  form.addEventListener('submit', e => { e.preventDefault(); buildDemo(false); });
  grid.addEventListener('click', e => {
    const btn = e.target.closest('[data-play]');
    if (!btn) return;
    const radio = form.querySelector(`input[name="genre"][value="${btn.dataset.play}"]`);
    if (radio) radio.checked = true;
    buildDemo(true);
  });
  document.getElementById('btn-restart').addEventListener('click', () => demo() && demo().restart());
  const fullBtn = document.getElementById('btn-full');
  fullBtn.addEventListener('click', () => demo() && demo().fullscreen());
  document.addEventListener('mg:ready', () => {
    fullBtn.hidden = !demo().canFullscreen;
    demo().build(readForm());
  });

  /* ---------- Заявки ---------- */
  const tpl = document.getElementById('lead-tpl');
  const CHANNELS = {
    telegram: { label: 'Ник в Telegram или телефон', ph: '@username или +7 900 000-00-00', mode: 'text', ac: 'off' },
    max: { label: 'Телефон или ник в Max', ph: '+7 900 000-00-00', mode: 'tel', ac: 'tel' },
    phone: { label: 'Телефон', ph: '+7 900 000-00-00', mode: 'tel', ac: 'tel' },
    email: { label: 'Почта', ph: 'name@mail.ru', mode: 'email', ac: 'email' }
  };
  const CH_NAMES = { telegram: 'Telegram', max: 'Max', phone: 'по телефону', email: 'на почту' };
  const reEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const isPhone = v => { const d = v.replace(/\D/g, ''); return /^[+\d\s()-]+$/.test(v) && d.length >= 10 && d.length <= 15; };
  const isNick = v => /^@?[A-Za-z][A-Za-z0-9_]{4,31}$/.test(v) || /(t\.me|max\.ru)\//i.test(v);
  const contactOk = (ch, v) => ch === 'email' ? reEmail.test(v) : ch === 'phone' ? isPhone(v) : (isPhone(v) || isNick(v));

  function setupLeadForm(f, prefix) {
    f.appendChild(tpl.content.cloneNode(true));
    f.querySelectorAll('[data-name]').forEach(el => { el.id = `${prefix}-${el.dataset.name}`; });
    f.querySelectorAll('[data-for]').forEach(l => { l.htmlFor = `${prefix}-${l.dataset.for}`; });
    const contact = f.querySelector('[data-name="contact"]');
    const contactLabel = f.querySelector('[data-contact-label]');
    const msg = f.querySelector('[data-msg]');
    const err = name => f.querySelector(`[data-err="${name}"]`);
    contact.setAttribute('aria-describedby', `${prefix}-err-contact`);
    err('contact').id = `${prefix}-err-contact`;
    const applyChannel = () => {
      const ch = f.querySelector('input[name="channel"]:checked').value;
      const c = CHANNELS[ch];
      contactLabel.textContent = c.label; contact.placeholder = c.ph; contact.inputMode = c.mode; contact.autocomplete = c.ac;
      contact.type = ch === 'email' ? 'email' : 'text';
      if (contact.getAttribute('aria-invalid') === 'true') { contact.setAttribute('aria-invalid', 'false'); err('contact').textContent = ''; }
    };
    f.querySelectorAll('input[name="channel"]').forEach(r => r.addEventListener('change', applyChannel));
    applyChannel();

    f.addEventListener('submit', async e => {
      e.preventDefault();
      const name = f.elements.name.value.trim();
      const ch = f.querySelector('input[name="channel"]:checked').value;
      const cv = contact.value.trim();
      const consent = f.elements.consent.checked;
      const checks = [
        ['name', name.length >= 2 ? '' : 'Впиши имя, чтобы мы знали, как обратиться', f.elements.name],
        ['contact', !cv ? 'Впиши, куда ответить' : contactOk(ch, cv) ? '' : (ch === 'email' ? 'Проверь почту: нужен адрес вида name@mail.ru' : ch === 'phone' ? 'Проверь телефон: нужно 10 цифр и больше' : 'Нужен телефон или ник вида @username'), contact],
        ['consent', consent ? '' : 'Без согласия на обработку данных заявку отправить нельзя', f.elements.consent]
      ];
      let first = null;
      for (const [k, m, el] of checks) { err(k).textContent = m; el.setAttribute('aria-invalid', String(!!m)); if (m && !first) first = el; }
      if (first) { first.focus(); return; }
      if (f.elements.website.value) return;

      const btn = f.querySelector('button[type="submit"]');
      btn.disabled = true; msg.className = 'form-msg body-5'; msg.textContent = 'Отправляю заявку';
      const params = new URLSearchParams(location.search);
      const id = 'MG-' + Date.now().toString(36).toUpperCase().slice(-6);
      const payload = {
        id, name, channel: ch, contact: cv,
        interest: f.elements.interest.value, message: f.elements.message.value.trim(),
        game: f._game || null, source: f._source || prefix,
        page: location.href.split('#')[0], utm: Object.fromEntries([...params].filter(([k]) => k.startsWith('utm_'))),
        sent_at: new Date().toISOString(), consent: true
      };
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 15000);
      try {
        const res = await fetch(LEAD_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: ctrl.signal });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const done = document.createElement('div');
        done.className = 'done';
        done.innerHTML = '<i class="ph-fill ph-check-circle" aria-hidden="true"></i><b class="heading-6"></b><p class="body-6 muted"></p>';
        done.querySelector('b').textContent = `Заявка ${id} отправлена`;
        done.querySelector('p').textContent = `Ответим ${ch === 'telegram' || ch === 'max' ? 'в ' + CH_NAMES[ch] : CH_NAMES[ch]}: ${cv}. А пока можно собрать ещё одну игру в демо`;
        f.replaceChildren(done);
      } catch (_) {
        msg.className = 'form-msg err body-5';
        msg.textContent = 'Заявка не ушла: сервер приёма не ответил. Данные в форме сохранены, попробуй отправить ещё раз через минуту';
        btn.disabled = false;
      } finally { clearTimeout(timer); }
    });
    return f;
  }

  setupLeadForm(document.getElementById('lead-inline'), 'li');
  const modal = document.getElementById('lead-modal');
  const modalForm = setupLeadForm(document.getElementById('lead-modal-form'), 'lm');
  const modalSub = document.getElementById('lead-sub');
  document.getElementById('lead-close').addEventListener('click', () => modal.close());
  modal.addEventListener('click', e => { if (e.target === modal) modal.close(); });

  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-lead]');
    if (!btn) return;
    if (!modalForm.elements.name) { location.hash = 'zayavka'; return; }
    const kind = btn.dataset.lead;
    modalForm.elements.interest.value = btn.dataset.interest || modalForm.elements.interest.value;
    modalForm._source = kind;
    const attach = modalForm.querySelector('[data-attach]');
    if (kind === 'game') {
      const v = readForm();
      const g = GENRES.find(x => x.id === v.genre);
      modalForm._game = Object.assign({ genre_title: g ? g.title : v.genre }, v);
      attach.hidden = false;
      attach.querySelector('[data-attach-text]').textContent = `${g ? g.title : v.genre}: ${v.hero} против злодея ${v.villain}`;
      modalSub.textContent = 'Соберём настоящую игру по твоему черновику';
    } else {
      modalForm._game = null;
      attach.hidden = true;
      modalSub.textContent = kind === 'biz' ? 'Расскажи про акцию или выставку, предложим сценарий' : 'Ответим туда, где тебе удобно';
    }
    if (typeof modal.showModal === 'function') modal.showModal(); else location.hash = 'zayavka';
    setTimeout(() => modalForm.elements.name.focus(), 50);
  });
})();
