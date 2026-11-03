/* Звук: фоновая музыка с плавной сменой и короткие эффекты.
 * Файлы лежат в assets/audio/. Браузеры разрешают звук только после первого клика — модуль ждёт его сам. */
(function () {
  'use strict';
  const ZG = window.ZG;
  const BASE = 'assets/audio/';
  const MUSIC = { missions: 'missions.mp3', shelter: 'shelter.mp3' };
  const SFX = { braam: 'braam.mp3', growl: 'growl.mp3', psychedelic: 'psychedelic.mp3', tension: 'tension.mp3' };
  const SFX_GAP = { growl: 900, braam: 1200, psychedelic: 1500, tension: 1500 };

  const A = (ZG.Audio = {
    unlocked: false,
    current: null, // { name, el }
    wanted: null,
    cache: {},
    lastSfx: {},
    disabled: !!ZG.params.get('fast'),
  });

  const set = () => ZG.Settings.data;
  const musicVol = () => (set().music === false ? 0 : (set().musicVol != null ? set().musicVol : 0.5));
  const sfxVol = () => (set().sfx === false ? 0 : (set().sfxVol != null ? set().sfxVol : 0.8));

  function fade(el, to, ms, done) {
    const from = el.volume;
    const t0 = performance.now();
    const step = (t) => {
      const k = Math.min(1, (t - t0) / ms);
      el.volume = Math.max(0, Math.min(1, from + (to - from) * k));
      if (k < 1) requestAnimationFrame(step);
      else if (done) done();
    };
    requestAnimationFrame(step);
  }

  /** Сменить фоновую музыку ('missions' | 'shelter' | null) */
  A.music = function (name) {
    A.wanted = name;
    if (A.disabled || !A.unlocked) return;
    if (A.current && A.current.name === name) {
      if (A.current.el.paused && musicVol() > 0) A.current.el.play().catch(() => {});
      return;
    }
    const old = A.current;
    if (old) fade(old.el, 0, 1400, () => { old.el.pause(); });
    A.current = null;
    if (!name || !MUSIC[name]) return;
    const el = new Audio(BASE + MUSIC[name]);
    el.loop = true;
    el.volume = 0;
    el.preload = 'auto';
    A.current = { name, el };
    if (musicVol() > 0) {
      el.play().then(() => fade(el, musicVol(), 2000)).catch(() => {});
    }
  };

  /** Короткий звук */
  A.sfx = function (name, vol) {
    if (A.disabled || !A.unlocked || !SFX[name] || sfxVol() <= 0) return;
    const now = performance.now();
    if (A.lastSfx[name] && now - A.lastSfx[name] < (SFX_GAP[name] || 300)) return;
    A.lastSfx[name] = now;
    if (!A.cache[name]) {
      A.cache[name] = new Audio(BASE + SFX[name]);
      A.cache[name].preload = 'auto';
    }
    const el = A.cache[name].cloneNode();
    el.volume = Math.max(0, Math.min(1, sfxVol() * (vol || 1)));
    el.play().catch(() => {});
  };

  /** Применить изменения настроек громкости */
  A.apply = function () {
    if (!A.current) { if (A.wanted) A.music(A.wanted); return; }
    const v = musicVol();
    if (v <= 0) A.current.el.pause();
    else {
      A.current.el.volume = v;
      if (A.current.el.paused) A.current.el.play().catch(() => {});
    }
  };

  const unlock = () => {
    if (A.unlocked) return;
    A.unlocked = true;
    Object.keys(SFX).forEach((k) => { A.cache[k] = new Audio(BASE + SFX[k]); A.cache[k].preload = 'auto'; });
    if (A.wanted) A.music(A.wanted);
  };
  window.addEventListener('pointerdown', unlock, { capture: true });
  window.addEventListener('keydown', unlock, { capture: true });
})();
