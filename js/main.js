/* Точка входа */
(function () {
  'use strict';
  const ZG = window.ZG;
  /** Ждём шрифты (логотип, заголовки, текст), чтобы стартовый экран не «прыгал» с запасного шрифта на свой */
  function fontsReady() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    const probe = 'Последний рубеж Last';
    const all = Promise.all([
      document.fonts.load(`400 40px "Rubik Wet Paint"`, probe),
      document.fonts.load(`400 16px "Oswald"`, probe),
      document.fonts.load(`600 16px "Oswald"`, probe),
      document.fonts.load(`400 16px "Roboto Condensed"`, probe),
      document.fonts.load(`700 16px "Roboto Condensed"`, probe),
      document.fonts.load(`italic 400 16px "PT Serif"`, probe),
    ]).catch(() => {});
    // на всякий случай не ждём дольше 2.5 с
    return Promise.race([all, new Promise((r) => setTimeout(r, 2500))]);
  }
  /* ---------- Предзагрузка картинок ----------
   * Без неё арт героев, локаций и карт на сайте проявляется с задержкой при первом показе.
   * need(urls, ms) — дождаться нужных картинок (не дольше ms); warm() — тихо прогреть весь арт в фоне. */
  const P = (ZG.Preload = { done: new Map(), keep: [] });
  P.one = function (url) {
    if (!url) return Promise.resolve();
    if (P.done.has(url)) return P.done.get(url);
    const pr = new Promise((res) => {
      const im = new Image();
      im.decoding = 'async';
      im.onload = () => { (im.decode ? im.decode().catch(() => {}) : Promise.resolve()).then(res); };
      im.onerror = () => res();
      im.src = url;
      P.keep.push(im); // держим ссылку, чтобы декодированная картинка не выгружалась
    });
    P.done.set(url, pr);
    return pr;
  };
  P.need = function (urls, ms) {
    const all = Promise.all([...new Set(urls.filter(Boolean))].map(P.one));
    return Promise.race([all, new Promise((r) => setTimeout(r, ms || 2500))]);
  };
  P.art = (group, id) => (window.ZG_ART && window.ZG_ART[group] && window.ZG_ART[group][id]) || null;
  /** Картинки, нужные на поле миссии: локации, герои, карты в колодах */
  P.missionUrls = function (locIds, heroIds, cardIds) {
    return [].concat(
      locIds.map((id) => P.art('locations', id)),
      heroIds.map((id) => P.art('avatars', id)), heroIds.map((id) => P.art('heroes', id)),
      [...new Set(cardIds)].map((id) => P.art('cards', id)));
  };
  P.warm = function () {
    const A = window.ZG_ART || {};
    const order = ['avatars', 'heroes', 'locations', 'missions', 'cards'];
    const queue = [];
    order.forEach((g) => Object.values(A[g] || {}).forEach((u) => queue.push(u)));
    let i = 0;
    const next = () => {
      if (i >= queue.length) return;
      const u = queue[i++];
      P.one(u).then(() => setTimeout(next, 0));
    };
    for (let k = 0; k < 3; k++) next(); // три потока, чтобы не мешать игре
  };

  window.addEventListener('DOMContentLoaded', () => {
    ZG.Settings.load();
    ZG.FX.init();
    fontsReady().then(() => {
      ZG.UI.showTitle();
      setTimeout(P.warm, 300);
    });
  });
  window.addEventListener('error', (e) => {
    console.error('[Последний рубеж]', e.message, e.error);
  });
  window.addEventListener('unhandledrejection', (e) => {
    console.error('[Последний рубеж] promise', e.reason);
  });
})();
