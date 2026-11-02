/* Загрузчик жанров: подключает модули по порядку показа в конструкторе.
   Новый жанр: файл assets/genres/<id>.js с MG.register(...) и строка в списке ниже */
(() => {
  window.MG_LOADING = true;
  const LIST = ['runner', 'space', 'collector', 'racing', 'horror', 'quiz', 'breakout', 'flyer', 'match3', 'snake'];
  const base = document.currentScript.src.replace(/index\.js(\?.*)?$/, '');
  const ver = (document.currentScript.src.match(/\?v=[^&]+/) || [''])[0];
  let left = LIST.length;
  const done = () => { if (--left === 0) document.dispatchEvent(new CustomEvent('mg:genres-loaded')); };
  for (const id of LIST) {
    const s = document.createElement('script');
    s.src = `${base}${id}.js${ver}`;
    s.async = false;
    s.onload = done;
    s.onerror = () => { console.warn('жанр не загрузился:', id); done(); };
    document.head.appendChild(s);
  }
})();
