/* Последний рубеж — ядро: пространство имён, ГСЧ, кубики, утилиты */
(function () {
  'use strict';
  const ZG = (window.ZG = window.ZG || {});

  const params = new URLSearchParams(location.search);
  ZG.params = params;

  /* ---------- Генератор случайных чисел (mulberry32, сохраняемое состояние) ---------- */
  ZG.rng = {
    state: (Date.now() ^ 0x9e3779b9) >>> 0,
    seed(s) { this.state = s >>> 0; },
    next() {
      let t = (this.state = (this.state + 0x6d2b79f5) >>> 0);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    int(n) { return Math.floor(this.next() * n); },
    pick(a) { return a[this.int(a.length)]; },
    shuffle(a) {
      for (let i = a.length - 1; i > 0; i--) {
        const j = this.int(i + 1);
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
  };
  if (params.get('seed')) ZG.rng.seed(parseInt(params.get('seed'), 10) || 1);

  /* ---------- Кубики ---------- */
  ZG.DIE_ORDER = ['d4', 'd6', 'd8', 'd10', 'd12'];
  ZG.sides = (d) => parseInt(String(d).slice(1), 10);
  ZG.rollDie = (d) => 1 + ZG.rng.int(ZG.sides(d));
  ZG.dieAvg = (d) => (ZG.sides(d) + 1) / 2;
  ZG.dieStep = (d, n) => {
    const i = Math.max(0, Math.min(ZG.DIE_ORDER.length - 1, ZG.DIE_ORDER.indexOf(d) + n));
    return ZG.DIE_ORDER[i];
  };
  /** Форма слова по роду карты: ZG.gf(def, 'повержен', 'повержена', 'повержено') */
  ZG.gf = (def, m, f, n) => (def && def.g === 'f' ? f : def && def.g === 'n' ? (n || m) : m);
  /** Строка кубиков: ['d6','d6'], 2 → «2d6+2» */
  ZG.diceStr = (dice, bonus) => {
    const cnt = {};
    (dice || []).forEach((d) => (cnt[d] = (cnt[d] || 0) + 1));
    // все кубики, включая нестандартные (d3), по убыванию граней
    const parts = Object.keys(cnt).sort((a, b) => ZG.sides(b) - ZG.sides(a)).map((d) => `${cnt[d]}${ZG.T('die')}${ZG.sides(d)}`);
    let s = parts.join('+');
    if (bonus) s += (bonus > 0 ? (s ? '+' : '+') : '−') + Math.abs(bonus);
    return s || '0';
  };

  /* ---------- Скорость анимаций ---------- */
  ZG.speed = params.get('fast') ? 0.08 : 1;
  ZG.sleep = (ms) => new Promise((r) => setTimeout(r, Math.max(0, ms * ZG.speed)));
  ZG.nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));

  /* ---------- DOM ---------- */
  ZG.$ = (sel, root) => (root || document).querySelector(sel);
  ZG.$$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  ZG.esc = (s) =>
    String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  ZG.html = (s) => {
    const t = document.createElement('template');
    t.innerHTML = s.trim();
    return t.content.firstElementChild;
  };

  ZG.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  ZG.clone = (o) => JSON.parse(JSON.stringify(o));
  ZG.sum = (a) => a.reduce((x, y) => x + y, 0);
  ZG.count = (arr, fn) => arr.reduce((n, x) => n + (fn(x) ? 1 : 0), 0);
  ZG.plural = (n, one, few, many) => {
    const a = Math.abs(n) % 100, b = a % 10;
    if (a > 10 && a < 20) return many;
    if (b > 1 && b < 5) return few;
    if (b === 1) return one;
    return many;
  };
})();
