/* Кузня игр: поведение страницы (меню, появление блоков, слоган, формы) */
(() => {
  'use strict';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
    menuItems.forEach((a, i) => {
      a.style.transitionDelay = open ? `${Math.round(i * step)}ms` : '0ms';
      a.tabIndex = open ? 0 : -1;
    });
  }
  menuItems.forEach(a => { a.tabIndex = -1; a.addEventListener('click', () => setMenu(false)); });
  burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && menu.classList.contains('open')) { setMenu(false); burger.focus(); }
  });

  /* ---------- Текущий раздел в меню ---------- */
  const navLinks = [...document.querySelectorAll('.nav-links a')];
  if ('IntersectionObserver' in window) {
    const spy = new IntersectionObserver(entries => {
      for (const en of entries) {
        if (!en.isIntersecting) continue;
        navLinks.forEach(a => a.setAttribute('aria-current', String(a.getAttribute('href') === '#' + en.target.id)));
      }
    }, { rootMargin: '-45% 0px -50% 0px' });
    ['demo', 'how', 'plans', 'biz', 'faq'].forEach(id => { const el = document.getElementById(id); if (el) spy.observe(el); });
  }

  /* ---------- Появление блоков (один раз) ---------- */
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      for (const en of entries) if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(el => io.observe(el));
  } else {
    reveals.forEach(el => el.classList.add('in'));
  }

  /* ---------- Слоган: слова проявляются по одному ---------- */
  const tag = document.getElementById('tagline');
  if (tag) {
    const words = [];
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
            frag.append(s);
            words.push(s);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) {
          split(n, hot || n.hasAttribute('data-hot'));
        }
      });
    };
    split(tag, false);

    if (reduce) {
      words.forEach(w => w.classList.add('on'));
    } else {
      let ticking = false;
      const update = () => {
        ticking = false;
        const vh = window.innerHeight;
        const r = tag.getBoundingClientRect();
        const startLine = vh * 0.85, endLine = vh * 0.4;
        const p = Math.max(0, Math.min(1, (startLine - r.top) / (startLine - endLine + r.height * 0.5)));
        const n = Math.round(p * words.length);
        words.forEach((w, i) => w.classList.toggle('on', i < n));
      };
      window.addEventListener('scroll', () => {
        if (!ticking) { ticking = true; requestAnimationFrame(update); }
      }, { passive: true });
      update();
    }
  }

  /* ---------- Конструктор демо ---------- */
  const form = document.getElementById('demo-form');
  const buildBtn = document.getElementById('build-btn');
  const skeleton = document.getElementById('skeleton');
  const skStatus = document.getElementById('sk-status');
  const demo = window.KuznyaDemo;

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

  function validate(v) {
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

  ['hero', 'villain', 'plot'].forEach(name => {
    form.elements[name].addEventListener('input', () => {
      const input = form.elements[name];
      if (input.getAttribute('aria-invalid') === 'true') {
        const msg = errors[name](input.value.trim());
        document.getElementById('e-' + name).textContent = msg;
        input.setAttribute('aria-invalid', String(!!msg));
      }
    });
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    const v = readForm();
    if (!validate(v) || !demo) return;
    const steps = ['Читаю описание и сюжет', 'Собираю уровень из шаблона жанра', 'Расставляю героев'];
    buildBtn.disabled = true;
    skeleton.classList.add('show');
    steps.forEach((t, i) => setTimeout(() => { skStatus.textContent = t; }, i * 230));
    setTimeout(() => {
      demo.build(v);
      skeleton.classList.remove('show');
      buildBtn.disabled = false;
      if (window.innerWidth < 1000) {
        document.getElementById('screen').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      }
    }, 700);
  });

  document.getElementById('btn-restart').addEventListener('click', () => demo && demo.restart());
  const fullBtn = document.getElementById('btn-full');
  if (demo && demo.canFullscreen) fullBtn.addEventListener('click', () => demo.fullscreen());
  else fullBtn.hidden = true;

  /* ---------- Ранний доступ ---------- */
  const wait = document.getElementById('wait-form');
  const waitInput = document.getElementById('w-contact');
  const waitMsg = document.getElementById('w-msg');
  wait.addEventListener('submit', e => {
    e.preventDefault();
    const v = waitInput.value.trim();
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
    const isTg = /^@?[A-Za-z][A-Za-z0-9_]{4,31}$/.test(v);
    waitMsg.className = 'form-msg';
    if (!v) {
      waitInput.setAttribute('aria-invalid', 'true');
      waitMsg.textContent = 'Впиши почту или ник в Telegram';
    } else if (!isEmail && !isTg) {
      waitInput.setAttribute('aria-invalid', 'true');
      waitMsg.textContent = 'Проверь адрес: нужна почта вида name@mail.ru или ник вида @username';
    } else {
      waitInput.setAttribute('aria-invalid', 'false');
      waitMsg.className = 'form-msg ok';
      waitMsg.textContent = 'Адрес в порядке. Это прототип страницы: приём заявок подключим перед запуском, пока контакт никуда не отправлен';
    }
  });

  document.getElementById('year').textContent = String(new Date().getFullYear());
})();
