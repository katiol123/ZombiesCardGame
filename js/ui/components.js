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
    const art = d.heroArt ? ZG.art('heroes', d.heroArt, ZG.HEROES[d.heroArt].icon, 'hero-' + d.heroArt) : ZG.art('cards', d.id, d.icon || 'alert');
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
    const attrs = (o.u != null ? ` data-u="${o.u}"` : '') + ` data-cid="${d.id}"`;
    const badge = o.badge && o.isNew ? `<span class="badges"><span class="badge-play">${esc(o.badge)}</span><span class="badge-new">новая</span></span>`
      : (o.badge ? `<span class="badge-play">${esc(o.badge)}</span>` : '') + (o.isNew ? '<span class="badge-new">новая</span>' : '');
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
      <div class="ctext">${rules}<p>Порог орды: ${loc.limit != null ? loc.limit : Math.max(3, ld.noise)}</p></div>
      <div class="cflavor">${esc(ld.flavor)}</div></div></div>`;
  };

  UI.avatar = function (heroId, cls, full) {
    const h = ZG.HEROES[heroId];
    // full — портрет в полный рост (спрайт героя) вместо кружка-аватарки
    const av = !full && window.ZG_ART && window.ZG_ART.avatars && window.ZG_ART.avatars[heroId] ? 'avatars' : 'heroes';
    // в миссии портрет показывает состояние: Инфекция — зелёные прожилки, тающая колода — трещины
    let st = '';
    const M = document.getElementById('board') && ZG.Game.M && ZG.Game.M();
    const mh = M && M.heroes.find((x) => x.id === heroId);
    if (mh && !mh.dead) {
      const inf = ZG.Game.infCount(mh);
      if (inf) st += ` inf${Math.min(3, inf)}`;
      if (mh.deck.length <= 2) st += ' crack2';
      else if (mh.deck.length <= 5) st += ' crack1';
    }
    return `<div class="avatar${st} ${cls || ''}" style="--hc:${h.color}" title="${esc(h.name)}">${ZG.art(av, heroId, h.icon)}${st ? '<i class="av-fx"></i>' : ''}</div>`;
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
      let picked = false;
      if (o.escIndex != null) {
        // Esc выбирает указанный вариант (например, «Вернуться в игру»)
        const onKey = (e) => { if (e.key !== 'Escape' || picked || !host.isConnected) return; document.removeEventListener('keydown', onKey); const b = host.querySelector(`.choice[data-i="${o.escIndex}"]`); if (b) b.click(); };
        document.addEventListener('keydown', onKey);
      }
      host.querySelectorAll('.choice').forEach((b) => b.addEventListener('click', async () => {
        if (picked) return;
        picked = true;
        const i = +b.dataset.i;
        // выбор принят — кнопки больше не кликаются и не висят на экране
        host.querySelectorAll('.choice').forEach((x) => { x.disabled = true; x.classList.toggle('chosen', x === b); });
        if (ov) await UI.closeOverlay(ov);
        else if (panel && panel.isConnected) { const list = panel.querySelector('.choice-list'); if (list) list.classList.add('done'); }
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
    // баннер должен успеть прочитаться и в «быстром» режиме: анимация и ожидание — одной длины
    const k = ZG.params.get('fast') ? Math.max(ZG.speed, 0.3) : Math.max(ZG.speed, 0.85);
    el.style.animationDuration = ((long ? 3.4 : 2.4) * k) + 's';
    document.body.appendChild(el);
    await new Promise((r) => setTimeout(r, (long ? 3300 : 2300) * k));
    el.remove();
  };

  UI.toast = function (text, kind) {
    const box = document.getElementById('toasts');
    // то же сообщение уже на экране — не плодим копии, а продлеваем его
    const same = [...box.children].find((e) => e.dataset.txt === text);
    if (same) { clearTimeout(same._t); same._t = setTimeout(() => same.remove(), 2900); return; }
    const el = ZG.html(`<div class="toast ${kind || ''}">${text}</div>`);
    el.dataset.txt = text;
    box.appendChild(el);
    el._t = setTimeout(() => el.remove(), 2900);
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
      n = Math.min(n, cards.length); // нельзя требовать больше карт, чем есть — иначе кнопка не включится никогда
      if (n <= 0 && !cancellable) return resolve([]);
      const ov = UI.overlay(`<div class="modal panel dmg-modal"><h2>${esc(title)}</h2><div class="mtext">${esc(text)}</div>
        <div class="hand">${cards.map((c) => UI.cardHTML(c, { u: c.u })).join('')}</div>
        <div class="enc-actions" style="margin-top:12px;align-items:center"><span class="muted cnt"></span>
        ${cancellable ? `<button class="btn ghost" data-x>${T('act_cancel')}</button>` : ''}<button class="btn primary" data-ok>${T('continue')}</button></div></div>`);
      const upd = () => {
        ov.querySelector('.cnt').textContent = `Выбрано: ${sel.size} из ${n}`;
        ov.querySelector('[data-ok]').classList.toggle('not-ready', sel.size !== n);
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
      let closing = false;
      ov.querySelector('[data-ok]').addEventListener('click', async () => {
        if (closing) return;
        if (sel.size !== n) {
          // объяснить, почему не продолжаем, вместо молчаливой неактивной кнопки
          const left = n - sel.size;
          const cnt = ov.querySelector('.cnt');
          cnt.textContent = `Сначала нажмите на ${left} ${ZG.plural(left, 'карту', 'карты', 'карт')} выше (выбрано ${sel.size} из ${n})`;
          cnt.classList.remove('warn-pulse'); void cnt.offsetWidth; cnt.classList.add('warn-pulse');
          ov.querySelector('.hand').classList.remove('hint-pulse'); void ov.offsetWidth; ov.querySelector('.hand').classList.add('hint-pulse');
          return;
        }
        closing = true;
        await UI.closeOverlay(ov); resolve([...sel]);
      });
      const x = ov.querySelector('[data-x]');
      if (x) x.addEventListener('click', async () => { await UI.closeOverlay(ov); resolve([]); });
      upd();
    });
  };

  /** Выбрать от min до max карт из руки (обновление руки в конце хода) */
  UI.pickRange = function (mh, min, max, title, text, filter, canBack) {
    return new Promise((resolve) => {
      const sel = new Set();
      const cards = mh.hand.filter((c) => !filter || filter(c));
      max = Math.min(max, cards.length);
      min = Math.min(min, max);
      if (max <= 0) return resolve([]);
      const ov = UI.overlay(`<div class="modal panel dmg-modal"><h2>${esc(title)}</h2><div class="mtext">${text}</div>
        <div class="hand">${cards.map((c) => UI.cardHTML(c, { u: c.u })).join('')}</div>
        <div class="enc-actions" style="margin-top:12px;align-items:center">${canBack ? '<button class="btn" data-back title="Вернуться к ходу и доиграть карты">← Назад</button>' : ''}<span class="muted cnt"></span><button class="btn primary" data-ok>${T('continue')}</button></div></div>`);
      const upd = () => {
        ov.querySelector('.cnt').textContent = min ? `Выбрано: ${sel.size} (нужно не меньше ${min})` : (sel.size ? `Сбросить: ${sel.size}` : 'Ничего не сбрасывать');
        ov.querySelector('[data-ok]').classList.toggle('not-ready', sel.size < min);
        ov.querySelectorAll('.hand .card').forEach((el) => el.classList.toggle('selected', sel.has(+el.dataset.u)));
      };
      ov.querySelectorAll('.hand .card').forEach((el) => el.addEventListener('click', () => {
        const u = +el.dataset.u;
        if (sel.has(u)) sel.delete(u); else if (sel.size < max) sel.add(u);
        upd();
      }));
      if (UI.fitHand) requestAnimationFrame(() => UI.fitHand(ov.querySelector('.hand')));
      let closing = false;
      ov.querySelector('[data-ok]').addEventListener('click', async () => {
        if (closing) return;
        if (sel.size < min) {
          const cnt = ov.querySelector('.cnt');
          cnt.textContent = `Сбросьте ещё ${min - sel.size} — рука больше своего размера`;
          cnt.classList.remove('warn-pulse'); void cnt.offsetWidth; cnt.classList.add('warn-pulse');
          return;
        }
        closing = true;
        await UI.closeOverlay(ov); resolve([...sel]);
      });
      const bk = ov.querySelector('[data-back]');
      if (bk) bk.addEventListener('click', async () => { if (closing) return; closing = true; await UI.closeOverlay(ov); resolve(null); });
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
    combat: ['Бой', 'Сыграйте <b>оружие</b> из руки — оно задаёт навык и добавляет кубики. Можно добавить по одной карте каждого типа: снаряжение, расходник, союзника, приём, решимость. Следите за <b>шумом</b>: громкое оружие приближает орду.'],
    acquire: ['Находка', 'Пройдите проверку, чтобы забрать карту в руку. Провал — находка потеряна. Ночью искать труднее (+1 к сложности), а в некоторых локациях определённые вещи найти легче.'],
    event: ['Препятствие', 'Препятствия проверяют навыки. Провал наносит урон, поднимает шум или крадёт время. Некоторые — моральный выбор без правильного ответа.'],
    damage: ['Урон', 'Урон — это сброс карт из руки. Колода — ваше здоровье: если в конце хода нечего добрать, герой погибает. Карты с меткой <b>«Блок»</b> (броня, обезболивающее, некоторые союзники) блокируют урон — нажмите на них до сброса.'],
    infection: ['Инфекция', 'Укус, если прошло 2+ урона, замешивает в колоду карту Инфекции. Её нельзя сыграть и нельзя сбросить как урон. <b>Три Инфекции — и герой обращается</b>, становясь мертвецом в своей локации. Лечите: Марина, Антибиотики, Сыворотка.'],
    henchman: ['Вожак', 'Победив вожака, можно сразу попытаться <b>заколотить</b> локацию. Заколоченная локация даёт свою награду и отрезает Угрозе путь.'],
    boss: ['Угроза!', 'Перед боем герои в других открытых локациях могут временно перекрыть их, чтобы ей некуда было бежать. Победите её — и её локация заколотится сама (если там нет других Угроз). Если все локации заколочены или временно перекрыты — победа. Иначе Угроза скроется: в каждую неперекрытую локацию уйдёт по карте — сама Угроза или Ложный след.'],
    close: ['Заколотить локацию', 'Локацию можно заколотить, когда её колода пуста (одна попытка за ход). Победив вожака, можно попытаться сразу — но только в этот момент. Если здесь притаилась Угроза, локация останется открытой, но всё остальное из неё будет вычищено — в колоде останется только Угроза.'],
    noise: ['Шум и орда', 'Громкое оружие, некоторые карты и события поднимают <b>шум</b> локации — смотрите на шкалу и звуковые круги на картинке. Когда шум дойдёт до порога, придёт <b>орда</b>: несколько мертвецов, и первый сразу нападает на героя в этой локации. Утром шум везде спадает на 1, а заколоченная локация затихает навсегда.'],
    modes: ['Как играть карты', '<b>Показать</b> — бесплатно, карта остаётся в руке. <b>Перезарядить</b> — карта уходит под низ колоды и вернётся позже. <b>Сбросить</b> — в сброс (лечение может вернуть её в колоду). <b>Сжечь</b> — навсегда. Чем дороже способ, тем сильнее обычно эффект.'],
    help: ['Помощь соседа', 'Герои в вашей локации могут сыграть в <b>вашу</b> проверку свои карты с пометкой «можно сыграть в проверку соседа» (чаще всего Решимость). Это не их ход, но тратятся их карты. Нажмите на карту соседа, чтобы добавить её.'],
    endturn: ['Конец хода', 'В конце хода вы <b>обновляете руку</b>: можно сбросить любые ненужные карты (лишние сверх размера руки — обязательно), а затем добрать руку из колоды. <b>Колода — это здоровье</b>: если добрать нечего, герой погибает. Лечение возвращает карты из сброса в колоду.'],
    nonphys: ['Нефизический урон', 'Этот урон — огонь, холод, кислота или электричество. <b>Броня от него не защищает.</b> Помогут лекарства, союзники, Решимость и специальное снаряжение: Противогаз и Костюм химзащиты (кислота), Самоспасатель (любой нефизический).'],
    conds: ['Состояния', 'Состояние держится, пока его не снимут; что оно делает — видно, если навести на значок в панели героя. Антибиотики снимают Отравление, Консервы — Обречённость, а «Полевая медицина» Марины снимает любые состояния.'],
    evade: ['Уклонение', 'От врага можно уклониться и не сражаться: это стоит карты или проверки. Враг не исчезает — он уходит <b>под низ</b> колоды локации и встретится вам снова, когда колода подойдёт к концу.'],
    camp: ['Лагерь', 'За каждую пройденную миссию герои получают <b>очко опыта</b>: +1 к характеристике, владение оружием или больший размер руки. Найденные карты ложатся на <b>склад</b> — из него вы собираете колоды героев перед следующей миссией.'],
    guard: ['Перекрыть пути', 'Победив Угрозу, вы ещё не выиграли: если ей есть куда бежать, она скроется в другую открытую локацию, и охоту придётся продолжать. Поэтому <b>перед боем</b> герои, стоящие в других открытых локациях, могут их <b>временно перекрыть</b> (та же проверка, что при заколачивании, со всеми условиями и штрафом за провал, но без награды). Если победить Угрозу, когда все остальные открытые локации заколочены или перекрыты, — миссия выиграна. Совет: заранее расставьте героев по открытым локациям.'],
    block: ['Блокировка урона', 'В окне урона можно сыграть карты с меткой <b>«Блок»</b> — по одной карте каждого типа (одно Снаряжение, один Расходник, один Союзник…). Но если у карты типа <b>«Снаряжение»</b> есть признак <b>«Щит»</b> (крышка от бака, тактический щит), её можно сыграть вместе с другой блокирующей картой «Снаряжение» без этого признака — только один щит за раз. Помните: броня держит лишь физический урон.'],
    technique: ['Приёмы и перезарядка', 'После приёма герой проходит <b>проверку перезарядки</b> — она указана внизу карты (↻). Успех — приём уходит под низ колоды и вернётся, провал — в сброс. Нужен именно <b>навык</b> из списка: если ни одного нет, приём <b>сгорает навсегда</b>. Характеристику (например, Волю) знают все.'],
    noskill: ['Нет навыка', 'У героя нет навыка для этой проверки — он бросает кубик <b>характеристики</b>, на которой навык основан (Медицина и Техника — Смекалка, Стрельба и Скрытность — Ловкость…), но без бонуса навыка. Помогут карты из руки и помощь соседа.'],
    night: ['Ночь', 'Ночью враги — и мертвецы, и люди — опаснее (+{n} к сложности боя), а находки искать труднее (+1 к сложности поиска). Фонари и молитвы ночью сильнее.'],
  };

  /** На что указывает подсказка: селекторы элементов интерфейса (берутся видимые, не больше двух) */
  UI.TIP_TARGETS = {
    start: ['#tray [data-act="explore"]', '#topbar .clockw:not([title="Цель миссии"])'],
    combat: ['.enc-panel .slots-row .slotbox', '.enc-panel .pool-sum'],
    acquire: ['.enc-panel .dc-box'],
    event: ['.enc-panel .dc-box'],
    damage: ['.dmg-modal .hand', '.enc-panel .dmg-head'],
    infection: ['.hero-panel .pile.inf|left'],
    henchman: ['.enc-card .card'],
    boss: ['.enc-card .card'],
    close: ['#tray [data-act="close"]'],
    noise: ['@noise'],
    modes: ['[data-tip-anchor]'],
    help: ['.enc-panel .help-row'],
    endturn: ['.hero-panel .piles|left'],
    nonphys: ['.dmg-head'],
    conds: ['.hero-panel .cond-row|left'],
    camp: ['.feat-box', '.vault-toggle'],
    block: ['.hand .card.playable'],
    technique: ['.ccheck.rc'],
    noskill: ['.enc-panel .skill-chips'],
    night: ['#topbar .clockw.night', '#topbar .clockw'],
  };
  /** Что ещё подсказка не должна закрывать (кроме подсвеченных элементов) */
  UI.TIP_AVOID = { block: ['.dmg-modal .hand', '.enc-panel .hand'], damage: ['.dmg-modal .hand'], help: ['.enc-panel .help-row'], modes: ['.mode-pop'] };
  const tipTargets = (key) => {
    const out = [];
    for (const raw of UI.TIP_TARGETS[key] || []) {
      const [sel, dir] = raw.split('|');
      let el = null;
      if (sel === '@noise') {
        // шкала шума локации, где стоит ходящий герой (иначе — самая шумная)
        const m = ZG.Game.M && ZG.Game.M();
        const li = m && m.heroes[m.active] ? m.heroes[m.active].loc : -1;
        el = document.querySelector(`.noise-meter[data-noise="${li}"]`) || [...document.querySelectorAll('.noise-meter')].sort((a, b) => +b.querySelector('b').textContent - +a.querySelector('b').textContent)[0];
      } else el = [...document.querySelectorAll(sel)].find((e) => e.offsetParent !== null && e.getBoundingClientRect().width > 0);
      if (el && !out.includes(el)) { el._tipDir = dir || ''; out.push(el); }
      if (out.length >= 2) break;
    }
    return out;
  };
  /** Красная прыгающая стрелка и пульсирующая рамка у элемента, пока открыта подсказка */
  const hit = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  /** Подсказка не должна закрывать то, на что указывает: перенести её в свободный угол */
  const dodge = (tipEl, targets, key) => {
    const avoid = (UI.TIP_AVOID[key] || []).map((sel) => document.querySelector(sel)).filter((e) => e && e.offsetParent !== null);
    const rs = [...targets, ...avoid].map((t) => t.getBoundingClientRect()).filter((r) => r.width);
    if (!rs.length || !rs.some((r) => hit(tipEl.getBoundingClientRect(), r))) return;
    const mob = innerWidth <= 900;
    const spots = mob
      ? [{ top: '118px', bottom: 'auto' }, { top: 'auto', bottom: '16px' }]
      : [{ left: '16px', top: '80px', right: 'auto', bottom: 'auto' }, { left: 'auto', right: '16px', top: '80px', bottom: 'auto' }, { left: 'auto', right: '16px', top: 'auto', bottom: '16px' }, { left: '16px', right: 'auto', top: 'auto', bottom: '16px' }];
    for (const sp of spots) {
      Object.assign(tipEl.style, sp);
      if (!rs.some((r) => hit(tipEl.getBoundingClientRect(), r))) return;
    }
  };
  const pointAt = (key, tipEl) => {
    const marks = [];
    let alive = true, frame = 0;
    const place = () => {
      if (!alive) return;
      // элементы ищутся заново каждый кадр: поле и окна постоянно перерисовываются
      const targets = tipTargets(key);
      if (tipEl && frame++ % 15 === 0) dodge(tipEl, targets, key);
      while (marks.length > targets.length) { const m = marks.pop(); m.arrow.remove(); m.ring.remove(); }
      while (marks.length < targets.length) {
        const arrow = ZG.html('<div class="tip-arrow"><svg viewBox="0 0 40 52"><path d="M20 50 L4 28 H14 V2 H26 V28 H36 Z"/></svg></div>');
        const ring = ZG.html('<div class="tip-ring"></div>');
        document.body.append(arrow, ring);
        marks.push({ arrow, ring });
      }
      targets.forEach((t, i) => {
        const r = t.getBoundingClientRect();
        const { arrow, ring } = marks[i];
        const hidden = !t.isConnected || !r.width;
        arrow.style.display = ring.style.display = hidden ? 'none' : '';
        if (hidden) return;
        // рамка — вокруг элемента, но не за краем экрана (иначе свечение обрезается)
        const L0 = Math.max(4, r.left - 6), T0 = Math.max(4, r.top - 6);
        const R0 = Math.min(innerWidth - 4, r.right + 6), B0 = Math.min(innerHeight - 4, r.bottom + 6);
        Object.assign(ring.style, { left: L0 + 'px', top: T0 + 'px', width: R0 - L0 + 'px', height: B0 - T0 + 'px' });
        // стрелка: сверху (по умолчанию), снизу у верхнего края, или слева для панели героя у края экрана
        const side = t._tipDir === 'left' && r.left > 70;
        const below = !side && r.top < 80;
        arrow.classList.toggle('up', below);
        arrow.classList.toggle('right', side);
        if (side) {
          arrow.style.left = Math.round(r.left - 64) + 'px';
          arrow.style.top = Math.round(Math.max(4, Math.min(innerHeight - 56, r.top + r.height / 2 - 26))) + 'px';
        } else {
          arrow.style.left = Math.round(Math.max(4, Math.min(innerWidth - 44, r.left + r.width / 2 - 20))) + 'px';
          arrow.style.top = Math.round(below ? r.bottom + 10 : r.top - 62) + 'px';
        }
      });
      requestAnimationFrame(place);
    };
    requestAnimationFrame(place);
    return () => { alive = false; marks.forEach((m) => { m.arrow.remove(); m.ring.remove(); }); };
  };

  // подсказки, которые указывают на элементы поля: если поверх открыто окно, показать их, когда оно закроется
  const BOARD_TIPS = new Set(['infection', 'conds', 'noise', 'night', 'endturn', 'start', 'close']);
  const deferred = new Set();
  UI.tip = function (key) {
    const S = ZG.Save.current;
    if (!S || !ZG.Settings.data.tips || S.campaign.tips[key] || !UI.TIPS[key]) return Promise.resolve();
    if (BOARD_TIPS.has(key) && document.getElementById('board') && document.querySelector('#overlay-root > .overlay')) {
      // игра не ждёт эту подсказку (иначе окно не закроется) — она появится, когда поле освободится
      if (!deferred.has(key)) {
        deferred.add(key);
        const wait = () => {
          if (!ZG.Save.current || !document.getElementById('board')) { deferred.delete(key); return; }
          if (document.querySelector('#overlay-root > .overlay')) return setTimeout(wait, 250);
          deferred.delete(key);
          setTimeout(() => { if (!document.querySelector('#overlay-root > .overlay')) UI.tip(key); else wait(); }, 350);
        };
        setTimeout(wait, 250);
      }
      return Promise.resolve();
    }
    S.campaign.tips[key] = true;
    const h = UI.TIPS[key][0];
    const p = UI.TIPS[key][1].replace('{n}', ZG.Game.M && ZG.Game.M() ? ZG.Game.nightBonus() : 2);
    // подсказки показываются по очереди, а не стопкой
    const prev = UI._tipQ || Promise.resolve();
    const shown = prev.then(() => new Promise((resolve) => {
      const el = ZG.html(`<div class="tip panel"><h4>${ZG.icon('book')} ${esc(h)}</h4><p>${p}</p><div class="row"><label><input type="checkbox" data-off> Больше не показывать подсказки</label><button class="btn small primary">${T('ok')}</button></div></div>`);
      document.body.appendChild(el);
      const unpoint = pointAt(key, el);
      el.querySelector('.btn').addEventListener('click', () => {
        if (el.querySelector('[data-off]').checked) { ZG.Settings.data.tips = false; ZG.Settings.save(); }
        unpoint();
        el.remove();
        resolve();
      });
    }));
    UI._tipQ = shown;
    return shown;
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
