/* Компоненты интерфейса: карты, аватары, модальные окна, баннеры, подсказки, выборы */
(function () {
  'use strict';
  const ZG = window.ZG;
  const T = ZG.T;
  const esc = ZG.esc;
  const UI = (ZG.UI = ZG.UI || {});
  const ROMAN = ['I', 'II', 'III'];

  /* ============================== Карта ============================== */
  UI.cardHTML = function (x, o) {
    o = o || {};
    const d = typeof x === 'string' ? ZG.card(x) : x && x.u != null ? ZG.card(x.id) : x;
    if (!d) return '';
    const cls = ['card', 't-' + d.type];
    if (d.living) cls.push('living');
    if (o.size) cls.push(o.size);
    if (o.cls) cls.push(o.cls);
    if (o.flip) cls.push('flip');
    let corner = '';
    if (ZG.isEnemy(d)) corner = `${ZG.icon('skull')} ${d.dc}`;
    else if (d.type === 'infection') corner = '☣';
    else if (d.tier === 9) corner = '★';
    else if (d.tier != null && d.type !== 'event') corner = ROMAN[d.tier] || '';
    const art = d.heroArt ? ZG.art('heroes', d.heroArt, ZG.HEROES[d.heroArt].icon) : ZG.art('cards', d.id, d.icon || 'alert');
    const traits = (d.traits || []).filter((t) => t && t !== ZG.cardTypeLabel(d));
    const typeLine = ZG.cardTypeLabel(d) + (traits.length ? ' · ' + traits.join(', ') : '');
    const check = ZG.cardCheckLine(d);
    const ruleLines = ZG.cardRules(d);
    const rules = ruleLines.map((t) => `<p>${esc(t)}</p>`).join('');
    const tlen = ruleLines.join(' ').length + (d.recharge ? 20 : 0) + (check.length > 28 ? 20 : 0);
    if (tlen > 165) cls.push('xdense');
    else if (tlen > 105) cls.push('dense');
    const face = `<div class="face">
        <div class="chead"><span class="cname">${esc(ZG.cardName(d))}</span>${corner ? `<span class="ctier">${corner}</span>` : ''}</div>
        <div class="cart">${art}</div>
        <div class="ctype">${esc(typeLine)}</div>
        ${check ? `<div class="ccheck">${esc(check)}</div>` : ''}
        ${d.recharge ? `<div class="ccheck rc" title="Без навыка — сгорает">↻ ${esc(d.recharge.skills.length > 4 ? 'любой навык' : d.recharge.skills.map(ZG.skillName).join(' / '))} ${d.recharge.dc}</div>` : ''}
        <div class="ctext">${rules}</div>
        ${d.flavor ? `<div class="cflavor">${esc(d.flavor)}</div>` : ''}
      </div>`;
    const attrs = o.u != null ? ` data-u="${o.u}"` : '';
    const badge = o.badge ? `<span class="badge-play">${esc(o.badge)}</span>` : '';
    const title = o.title ? ` title="${esc(o.title)}"` : '';
    if (o.flip) {
      return `<div class="${cls.join(' ')}"${attrs}${title}><div class="card-flipper down">${face}<div class="back">${ZG.icon('biohazard')}</div></div>${badge}</div>`;
    }
    return `<div class="${cls.join(' ')}"${attrs}${title}>${face}${badge}</div>`;
  };

  /** Карточка локации в формате большой карты (для проверок баррикады) */
  UI.locCardHTML = function (loc, size) {
    const ld = ZG.LOCATIONS[loc.id];
    const rules = ZG.locationRules(ld).map((t) => `<p>${esc(t)}</p>`).join('');
    return `<div class="card t-location ${size || 'big'}"><div class="face">
      <div class="chead"><span class="cname">${esc(ld.name)}</span><span class="ctier">${ZG.icon('planks')}</span></div>
      <div class="cart">${ZG.art('locations', ld.id, ld.icon)}</div>
      <div class="ctype">${T('type_location')}</div>
      <div class="ccheck">${T('close_check')}: ${esc(ZG.cardCheckLineClose(loc))}</div>
      <div class="ctext">${rules}<p>Порог орды: ${loc.limit}</p></div>
      <div class="cflavor">${esc(ld.flavor)}</div></div></div>`;
  };

  UI.avatar = function (heroId, cls) {
    const h = ZG.HEROES[heroId];
    return `<div class="avatar ${cls || ''}" style="--hc:${h.color}" title="${esc(h.name)}">${ZG.art('heroes', heroId, h.icon)}</div>`;
  };

  UI.statsHTML = function (ph) {
    const h = ZG.HEROES[ph.id];
    const attrs = ZG.ATTRS.map((a) => {
      const b = ZG.Game.attrBonus(ph, a);
      return `<span class="stat" title="${esc(T('attr_' + a))}">${esc(T('attr_' + a)).slice(0, 3)} <b>${ZG.T('die')}${ZG.sides(h.attrs[a])}${b ? (b > 0 ? '+' + b : '−' + -b) : ''}</b></span>`;
    }).join('');
    const skills = Object.keys(h.skills).map((s) => {
      const v = ZG.Game.skillValue(ph, s);
      return `<span class="stat skill" title="${esc(ZG.skillName(s))}: ${ZG.T('die')}${ZG.sides(v.die)}+${v.bonus}">${esc(ZG.skillName(s))} <b>+${h.skills[s]}</b></span>`;
    }).join('');
    return `<div class="stat-row">${attrs}</div><div class="stat-row">${skills}</div>`;
  };

  /* ============================== Оверлеи ============================== */
  UI.overlay = function (inner, cls) {
    const el = ZG.html(`<div class="overlay ${cls || ''}">${inner}</div>`);
    document.getElementById('overlay-root').appendChild(el);
    return el;
  };
  UI.closeOverlay = async function (el) {
    if (!el || !el.isConnected) return;
    el.classList.add('out');
    await ZG.sleep(280);
    el.remove();
  };

  /** Универсальный выбор. Если открыта встреча — рисуется в её панели. */
  UI.choose = function (o) {
    return new Promise((resolve) => {
      const opts = o.options.map((op, i) => `<button class="choice ${op.primary ? 'primary' : ''}" data-i="${i}" ${op.disabled ? 'disabled' : ''}><b>${esc(op.label)}</b>${op.sub ? `<span>${esc(op.sub)}</span>` : ''}</button>`).join('');
      const body = `<h2>${esc(o.title)}</h2>${o.text ? `<div class="mtext">${esc(o.text)}</div>` : ''}${o.card ? `<div style="display:flex;justify-content:center;margin-bottom:14px">${UI.cardHTML(o.card, { size: 'mid' })}</div>` : ''}<div class="choice-list">${opts}</div>`;
      const panel = UI.encPanel();
      let ov = null;
      let host;
      if (panel) { panel.innerHTML = body; host = panel; }
      else { ov = UI.overlay(`<div class="modal panel">${body}</div>`); host = ov; }
      host.querySelectorAll('.choice').forEach((b) => b.addEventListener('click', async () => {
        const i = +b.dataset.i;
        if (ov) await UI.closeOverlay(ov);
        resolve(i);
      }));
    });
  };

  UI.confirm = async function (title, text) {
    return (await UI.choose({ title, text, options: [{ label: T('yes'), primary: true }, { label: T('no') }] })) === 0;
  };

  UI.alert = function (title, html, btn) {
    return new Promise((resolve) => {
      const ov = UI.overlay(`<div class="modal panel"><h2>${esc(title)}</h2><div class="mtext">${html}</div><div class="enc-actions"><button class="btn primary">${esc(btn || T('ok'))}</button></div></div>`);
      ov.querySelector('.btn').addEventListener('click', async () => { await UI.closeOverlay(ov); resolve(); });
    });
  };

  UI.banner = async function (title, sub, kind, long) {
    const el = ZG.html(`<div class="banner ${kind || ''} ${long ? 'long' : ''}"><h2>${esc(title)}</h2>${sub ? `<p>${esc(sub)}</p>` : ''}</div>`);
    el.style.animationDuration = ((long ? 3.4 : 2.4) * Math.max(ZG.speed, 0.3)) + 's';
    document.body.appendChild(el);
    await ZG.sleep(long ? 3200 : 2200);
    el.remove();
  };

  UI.toast = function (text, kind) {
    const el = ZG.html(`<div class="toast ${kind || ''}">${text}</div>`);
    document.getElementById('toasts').appendChild(el);
    setTimeout(() => el.remove(), 2900);
  };

  /* ============================== Выбор героя / карт / локации ============================== */
  UI.pickHero = function (title, heroes) {
    return new Promise((resolve) => {
      const opts = heroes.map((h, i) => {
        const hd = ZG.HEROES[h.id];
        return `<button class="choice" data-i="${i}" style="flex-direction:row;align-items:center;gap:12px">${UI.avatar(h.id)}<div><b>${esc(hd.name)}</b><br><span>Рука ${h.hand.length} · Колода ${h.deck.length} · Сброс ${h.discard.length} · ☣ ${ZG.Game.infCount(h)}/3</span></div></button>`;
      }).join('');
      const ov = UI.overlay(`<div class="modal panel"><h2>${esc(title)}</h2><div class="choice-list">${opts}</div><div class="enc-actions" style="margin-top:14px"><button class="btn ghost" data-x>${T('act_cancel')}</button></div></div>`);
      ov.querySelectorAll('.choice').forEach((b) => b.addEventListener('click', async () => { await UI.closeOverlay(ov); resolve(heroes[+b.dataset.i]); }));
      ov.querySelector('[data-x]').addEventListener('click', async () => { await UI.closeOverlay(ov); resolve(null); });
    });
  };

  /** Выбрать ровно n карт из руки героя */
  UI.pickCards = function (mh, n, title, text, cancellable, filter) {
    return new Promise((resolve) => {
      const sel = new Set();
      const cards = mh.hand.filter((c) => !filter || filter(c));
      const ov = UI.overlay(`<div class="modal panel dmg-modal"><h2>${esc(title)}</h2><div class="mtext">${esc(text)}</div>
        <div class="hand">${cards.map((c) => UI.cardHTML(c, { u: c.u })).join('')}</div>
        <div class="enc-actions" style="margin-top:12px;align-items:center"><span class="muted cnt"></span>
        ${cancellable ? `<button class="btn ghost" data-x>${T('act_cancel')}</button>` : ''}<button class="btn primary" data-ok disabled>${T('continue')}</button></div></div>`);
      const upd = () => {
        ov.querySelector('.cnt').textContent = `Выбрано: ${sel.size} из ${n}`;
        ov.querySelector('[data-ok]').disabled = sel.size !== n;
        ov.querySelectorAll('.hand .card').forEach((el) => el.classList.toggle('selected', sel.has(+el.dataset.u)));
      };
      ov.querySelectorAll('.hand .card').forEach((el) => el.addEventListener('click', () => {
        const u = +el.dataset.u;
        if (sel.has(u)) sel.delete(u);
        else if (sel.size < n) sel.add(u);
        else if (n === 1) { sel.clear(); sel.add(u); }
        upd();
      }));
      if (UI.fitHand) requestAnimationFrame(() => UI.fitHand(ov.querySelector('.hand')));
      ov.querySelector('[data-ok]').addEventListener('click', async () => { await UI.closeOverlay(ov); resolve([...sel]); });
      const x = ov.querySelector('[data-x]');
      if (x) x.addEventListener('click', async () => { await UI.closeOverlay(ov); resolve([]); });
      upd();
    });
  };

  UI.inspect = function (inst) {
    const ov = UI.overlay(`<div class="inspect" style="display:flex;flex-direction:column;align-items:center;gap:18px">${UI.cardHTML(inst, { size: 'big' })}<button class="btn" data-x>${T('close')}</button></div>`);
    const close = () => UI.closeOverlay(ov);
    ov.addEventListener('click', close);
  };

  UI.scout = function (inst, loc) {
    return new Promise((resolve) => {
      const ld = ZG.LOCATIONS[loc.id];
      const ov = UI.overlay(`<div class="modal panel" style="text-align:center"><h2>Разведка: ${esc(ld.name)}</h2><div class="mtext">Верхняя карта колоды локации:</div>
        <div style="display:flex;justify-content:center;margin:10px 0 18px">${UI.cardHTML(inst, { size: 'mid' })}</div>
        <div class="choice-list"><button class="choice" data-k="0"><b>Оставить сверху</b><span>Следующий, кто исследует, встретит её</span></button>
        <button class="choice" data-k="1"><b>Положить вниз</b><span>Убрать в самый низ колоды</span></button></div></div>`);
      ov.querySelectorAll('.choice').forEach((b) => b.addEventListener('click', async () => { await UI.closeOverlay(ov); resolve(b.dataset.k === '1'); }));
    });
  };

  UI.gain = async function (inst, title) {
    ZG.Audio.synth('loot');
    const ov = UI.overlay(`<div style="display:flex;flex-direction:column;align-items:center;gap:14px;pointer-events:none"><div class="result-banner ok" style="font-size:38px">${esc(title || 'Находка!')}</div>${UI.cardHTML(inst, { size: 'mid', cls: 'new' })}</div>`);
    ov.style.background = 'rgba(4,4,6,.55)';
    await ZG.sleep(150);
    ZG.FX.burstAt(ov.querySelector('.card'), 'gold', 50);
    await ZG.sleep(1300);
    await UI.closeOverlay(ov);
  };

  /* ============================== Подсказки ============================== */
  UI.TIPS = {
    start: ['Ваш ход', 'Каждый ход переворачивается карта Часов. Можно <b>пойти</b> в другую локацию (до исследования), затем <b>исследовать</b> — открыть верхнюю карту локации. Карты в руке с действием подсвечены: кликните, чтобы сыграть. Цель — найти Угрозу и загнать её в угол.'],
    combat: ['Бой', 'Сыграйте <b>оружие</b> из руки — оно задаёт навык и добавляет кубики. Можно добавить по одной карте каждого типа: снаряжение, расходник, союзника, решимость. Следите за <b>шумом</b>: громкое оружие приближает орду.'],
    acquire: ['Находка', 'Пройдите проверку, чтобы забрать карту в руку. Провал — находка потеряна. Ночью искать проще, а в некоторых локациях определённые вещи найти легче.'],
    event: ['Препятствие', 'Препятствия проверяют навыки. Провал наносит урон, поднимает шум или крадёт время. Некоторые — моральный выбор без правильного ответа.'],
    damage: ['Урон', 'Урон — это сброс карт из руки. Колода — ваше здоровье: если в конце хода нечего добрать, герой погибает. Карты с меткой <b>«Блок»</b> (броня, обезболивающее, некоторые союзники) блокируют урон — нажмите на них до сброса.'],
    infection: ['Инфекция', 'Укус замешивает в колоду карту Инфекции. Её нельзя сыграть. <b>Три Инфекции — и герой обращается</b>, становясь мертвецом в своей локации. Лечите: Марина, Антибиотики, Сыворотка.'],
    henchman: ['Вожак', 'Победив вожака, можно сразу попытаться <b>заколотить</b> локацию. Заколоченная локация даёт свою награду и отрезает Угрозе путь.'],
    boss: ['Угроза!', 'Перед боем герои в других локациях могут перекрыть пути. Победите её — и её локация заколотится сама (если там нет других Угроз). Если все открытые локации закрыты или перекрыты — победа. Иначе Угроза скроется: в каждую неперекрытую локацию уйдёт по карте — сама Угроза или Ложный след.'],
    close: ['Баррикада', 'Локацию можно заколотить, если её колода пуста или в ней повержен вожак (одна попытка за ход). Если здесь притаилась Угроза, локация останется открытой, но всё остальное из неё будет вычищено — в колоде останется только Угроза.'],
    night: ['Ночь', 'Ночью мертвецы опаснее (+{n} к сложности боя), но находки искать проще. Фонари и молитвы ночью сильнее.'],
  };

  UI.tip = function (key) {
    const S = ZG.Save.current;
    if (!S || !ZG.Settings.data.tips || S.campaign.tips[key] || !UI.TIPS[key]) return Promise.resolve();
    S.campaign.tips[key] = true;
    const h = UI.TIPS[key][0];
    const p = UI.TIPS[key][1].replace('{n}', ZG.Game.M && ZG.Game.M() ? ZG.Game.nightBonus() : 2);
    return new Promise((resolve) => {
      const el = ZG.html(`<div class="tip panel"><h4>${ZG.icon('book')} ${esc(h)}</h4><p>${p}</p><div class="row"><label><input type="checkbox" data-off> Больше не показывать подсказки</label><button class="btn small primary">${T('ok')}</button></div></div>`);
      document.body.appendChild(el);
      el.querySelector('.btn').addEventListener('click', () => {
        if (el.querySelector('[data-off]').checked) { ZG.Settings.data.tips = false; ZG.Settings.save(); }
        el.remove();
        resolve();
      });
    });
  };
})();

/* Автоподгонка текста карт: сначала убирается художественная строка, затем уменьшается шрифт правил */
(function () {
  const ZG = window.ZG;
  const fitCard = (el) => {
    if (el.dataset.fit === '1') return;
    const t = el.querySelector('.ctext');
    if (!t || !t.clientHeight) return;
    el.dataset.fit = '1';
    if (t.scrollHeight <= t.clientHeight + 1) return;
    const fl = el.querySelector('.cflavor');
    if (fl) fl.style.display = 'none';
    let fs = parseFloat(getComputedStyle(t).fontSize);
    let guard = 0;
    while (t.scrollHeight > t.clientHeight + 1 && fs > 6.5 && guard++ < 20) {
      fs -= 0.4;
      t.style.fontSize = fs + 'px';
      t.style.lineHeight = '1.12';
    }
    if (t.scrollHeight > t.clientHeight + 1) el.classList.add('clipped');
  };
  ZG.UI.fitCards = (root) => (root || document).querySelectorAll('.card').forEach(fitCard);
  let pending = false;
  const mo = new MutationObserver(() => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => { pending = false; ZG.UI.fitCards(); });
  });
  window.addEventListener('DOMContentLoaded', () => mo.observe(document.body, { childList: true, subtree: true }));
})();
