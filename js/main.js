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
    ]).catch(() => {});
    // на всякий случай не ждём дольше 2.5 с
    return Promise.race([all, new Promise((r) => setTimeout(r, 2500))]);
  }
  window.addEventListener('DOMContentLoaded', () => {
    ZG.Settings.load();
    ZG.FX.init();
    fontsReady().then(() => ZG.UI.showTitle());
  });
  window.addEventListener('error', (e) => {
    console.error('[Последний рубеж]', e.message, e.error);
  });
  window.addEventListener('unhandledrejection', (e) => {
    console.error('[Последний рубеж] promise', e.reason);
  });
})();
