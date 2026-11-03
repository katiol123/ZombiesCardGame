/* Визуальные эффекты: пепел, искры, брызги крови, вспышки, тряска, переходы */
(function () {
  'use strict';
  const ZG = window.ZG;
  const FX = (ZG.FX = {});
  let cv, ctx, W, H, dpr;
  const parts = [];
  const bursts = [];
  let last = 0;

  FX.init = function () {
    cv = document.getElementById('fx-canvas');
    ctx = cv.getContext('2d');
    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = window.innerWidth; H = window.innerHeight;
      cv.width = W * dpr; cv.height = H * dpr;
      cv.style.width = W + 'px'; cv.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);
    for (let i = 0; i < 70; i++) parts.push(spawnAsh(true));
    requestAnimationFrame(loop);
  };

  function spawnAsh(anywhere) {
    const ember = Math.random() < 0.18;
    return {
      x: Math.random() * W,
      y: anywhere ? Math.random() * H : H + 10,
      vx: (Math.random() - 0.5) * 0.25,
      vy: -(0.15 + Math.random() * 0.45),
      r: ember ? 1 + Math.random() * 1.6 : 0.6 + Math.random() * 1.8,
      a: 0.15 + Math.random() * 0.45,
      ember,
      ph: Math.random() * 6.28,
    };
  }

  function loop(t) {
    const dt = Math.min(50, t - last) / 16.7;
    last = t;
    if (!document.documentElement.classList.contains('no-fx')) {
      ctx.clearRect(0, 0, W, H);
      const night = document.body.classList.contains('night');
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        p.ph += 0.02 * dt;
        p.x += (p.vx + Math.sin(p.ph) * 0.15) * dt;
        p.y += p.vy * dt;
        if (p.y < -10 || p.x < -10 || p.x > W + 10) parts[i] = spawnAsh(false);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, 6.283);
        if (p.ember) {
          ctx.fillStyle = night ? `rgba(140,170,255,${p.a * 0.8})` : `rgba(255,${120 + (p.r * 30) | 0},60,${p.a})`;
          ctx.shadowBlur = 8;
          ctx.shadowColor = night ? '#8aa8ff' : '#ff7a3a';
        } else {
          ctx.fillStyle = `rgba(190,185,175,${p.a * 0.55})`;
          ctx.shadowBlur = 0;
        }
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      for (let i = bursts.length - 1; i >= 0; i--) {
        const b = bursts[i];
        b.life -= dt;
        if (b.life <= 0) { bursts.splice(i, 1); continue; }
        b.vy += b.g * dt;
        b.x += b.vx * dt; b.y += b.vy * dt;
        b.vx *= 0.98;
        ctx.globalAlpha = Math.max(0, b.life / b.max);
        ctx.fillStyle = b.c;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, 6.283);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else if (ctx) ctx.clearRect(0, 0, W, H);
    requestAnimationFrame(loop);
  }

  /** Взрыв частиц: kind = blood | gold | toxic | spark */
  FX.burst = function (x, y, kind, n) {
    const colors = {
      blood: ['#8b0f0a', '#b3160f', '#d63c2f', '#5e0705'],
      gold: ['#ffd36b', '#f5b942', '#fff2c0', '#e0a642'],
      toxic: ['#8dbb3f', '#b5e05a', '#5c8a1f'],
      spark: ['#ffb36b', '#ff7a3a', '#fff0c0'],
      blue: ['#9fb8ff', '#d7e2ff', '#5b7bd6'],
    }[kind || 'spark'];
    n = n || 40;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283;
      const s = 1.5 + Math.random() * (kind === 'blood' ? 7 : 5);
      bursts.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - (kind === 'gold' ? 2 : 1),
        g: kind === 'gold' ? 0.05 : 0.22, r: 1 + Math.random() * (kind === 'blood' ? 3.5 : 2.4),
        c: colors[(Math.random() * colors.length) | 0], life: 40 + Math.random() * 40, max: 80,
      });
    }
  };
  FX.burstAt = function (el, kind, n) {
    if (!el) return FX.burst(W / 2, H / 2, kind, n);
    const r = el.getBoundingClientRect();
    FX.burst(r.left + r.width / 2, r.top + r.height / 2, kind, n);
  };

  FX.flash = function (kind) {
    const f = document.getElementById('flash');
    f.className = '';
    void f.offsetWidth;
    f.className = kind;
  };
  FX.shake = function (el) {
    el = el || document.getElementById('app');
    el.classList.remove('shake');
    void el.offsetWidth;
    el.classList.add('shake');
    setTimeout(() => el.classList.remove('shake'), 500);
  };

  /** Затемнение-переход между экранами */
  FX.transition = async function (fn) {
    const t = document.getElementById('transition');
    t.classList.add('on');
    await ZG.sleep(420);
    await fn();
    await ZG.nextFrame();
    t.classList.remove('on');
  };

  FX.setNight = function (night) {
    document.body.classList.toggle('night', !!night);
  };
})();
