/* Точка входа */
(function () {
  'use strict';
  const ZG = window.ZG;
  window.addEventListener('DOMContentLoaded', () => {
    ZG.Settings.load();
    ZG.FX.init();
    ZG.UI.showTitle();
  });
  window.addEventListener('error', (e) => {
    console.error('[Последний рубеж]', e.message, e.error);
  });
  window.addEventListener('unhandledrejection', (e) => {
    console.error('[Последний рубеж] promise', e.reason);
  });
})();
