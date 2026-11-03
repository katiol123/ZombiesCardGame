/* Звук: фоновая музыка с плавной сменой и короткие эффекты.
 * Файлы лежат в assets/audio/. Браузеры разрешают звук только после первого клика — модуль ждёт его сам. */
(function () {
  'use strict';
  const ZG = window.ZG;
  const BASE = 'assets/audio/';
  const MUSIC = { missions: 'missions.mp3', shelter: 'shelter.mp3' };
  const SFX = { braam: 'braam.mp3', growl: 'growl.mp3', psychedelic: 'psychedelic.mp3', tension: 'tension.mp3', dice: 'dice.mp3' };
  const SFX_GAP = { growl: 900, braam: 1200, psychedelic: 1500, tension: 1500, dice: 200 };

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


  /* ============================== Процедурные звуки (WebAudio) ============================== */
  let ac = null;
  const ctx = () => {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ac = new AC();
    }
    if (ac.state === 'suspended') ac.resume().catch(() => {});
    return ac;
  };
  const out = (c, vol) => {
    const g = c.createGain();
    g.gain.value = vol * sfxVol();
    g.connect(c.destination);
    return g;
  };
  const noiseBuf = (c, dur) => {
    const b = c.createBuffer(1, Math.max(1, Math.floor(c.sampleRate * dur)), c.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  };
  const tone = (c, dst, type, f0, f1, t0, dur, peak) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(dst);
    o.start(t0); o.stop(t0 + dur + 0.05);
  };
  const burst = (c, dst, t0, dur, freq, q, peak, type) => {
    const n = c.createBufferSource();
    n.buffer = noiseBuf(c, dur);
    const f = c.createBiquadFilter();
    f.type = type || 'bandpass';
    f.frequency.value = freq;
    f.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(peak, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    n.connect(f); f.connect(g); g.connect(dst);
    n.start(t0); n.stop(t0 + dur + 0.02);
    return f;
  };
  const SYN = {
    dice(c, o, t) { for (let i = 0; i < 9; i++) burst(c, o, t + i * 0.055 + Math.random() * 0.02, 0.04, 1800 + Math.random() * 2200, 4, 0.5); },
    flip(c, o, t) { const f = burst(c, o, t, 0.28, 600, 1.2, 0.6); f.frequency.exponentialRampToValueAtTime(3500, t + 0.25); },
    success(c, o, t) { tone(c, o, 'triangle', 523, 0, t, 0.35, 0.35); tone(c, o, 'triangle', 784, 0, t + 0.09, 0.5, 0.3); tone(c, o, 'sine', 1046, 0, t + 0.18, 0.6, 0.15); },
    fail(c, o, t) { tone(c, o, 'sawtooth', 140, 60, t, 0.55, 0.25); tone(c, o, 'sine', 70, 40, t, 0.6, 0.5); burst(c, o, t, 0.15, 300, 0.7, 0.4, 'lowpass'); },
    loot(c, o, t) { [1046, 1318, 1568, 2093].forEach((f, i) => tone(c, o, 'sine', f, 0, t + i * 0.06, 0.4, 0.18)); },
    hammer(c, o, t) { [0, 0.22, 0.44].forEach((d) => { burst(c, o, t + d, 0.09, 900, 1, 0.8, 'lowpass'); tone(c, o, 'sine', 160, 70, t + d, 0.12, 0.6); }); },
    heal(c, o, t) { tone(c, o, 'sine', 440, 0, t, 0.9, 0.18); tone(c, o, 'sine', 660, 0, t + 0.1, 0.9, 0.14); tone(c, o, 'sine', 880, 0, t + 0.2, 0.8, 0.08); },
    hit(c, o, t) { burst(c, o, t, 0.18, 500, 0.8, 0.9, 'lowpass'); tone(c, o, 'sine', 110, 45, t, 0.3, 0.8); },
    tick(c, o, t) { tone(c, o, 'square', 2200, 0, t, 0.03, 0.12); tone(c, o, 'square', 1600, 0, t + 0.28, 0.03, 0.1); },
    curse(c, o, t) {
      [220, 311, 330].forEach((f) => {
        const osc = c.createOscillator(); const g = c.createGain(); const lfo = c.createOscillator(); const lg = c.createGain();
        osc.type = 'sawtooth'; osc.frequency.value = f; lfo.frequency.value = 7; lg.gain.value = 6;
        lfo.connect(lg); lg.connect(osc.frequency);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.08, t + 0.15); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
        const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400;
        osc.connect(lp); lp.connect(g); g.connect(o); osc.start(t); lfo.start(t); osc.stop(t + 1); lfo.stop(t + 1);
      });
    },
    click(c, o, t) { burst(c, o, t, 0.03, 2500, 3, 0.25); },
    noise(c, o, t) { tone(c, o, 'square', 330, 0, t, 0.08, 0.06); tone(c, o, 'square', 330, 0, t + 0.12, 0.08, 0.06); },
  };
  const SYN_VOL = { click: 0.25, tick: 0.5, dice: 0.6 };
  A.synth = function (name) {
    if (A.disabled || !A.unlocked || sfxVol() <= 0 || !SYN[name]) return;
    const c = ctx();
    if (!c) return;
    try { SYN[name](c, out(c, SYN_VOL[name] || 0.8), c.currentTime + 0.01); } catch (e) { /* ignore */ }
  };
  document.addEventListener('click', (e) => { if (e.target.closest('.btn, .choice, .chip')) A.synth('click'); }, true);

  const unlock = () => {
    if (A.unlocked) return;
    A.unlocked = true;
    ctx();
    Object.keys(SFX).forEach((k) => { A.cache[k] = new Audio(BASE + SFX[k]); A.cache[k].preload = 'auto'; });
    if (A.wanted) A.music(A.wanted);
  };
  window.addEventListener('pointerdown', unlock, { capture: true });
  window.addEventListener('keydown', unlock, { capture: true });
})();
