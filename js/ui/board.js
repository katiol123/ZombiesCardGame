/* Игровое поле: локации, отряд, журнал, лоток героя, встречи, проверки, урон */
(function () {
  'use strict';
  const ZG = window.ZG;
  const T = ZG.T;
  const esc = ZG.esc;
  const UI = ZG.UI;
  const G = () => ZG.Game;

  UI.seen = new Set();
  UI.waiting = null; // { resolve, mh, actions }
  UI.pickMode = null; // { indices, resolve }

  /* ============================== Каркас ============================== */
  UI.showBoard = function () {
    ZG.Audio.music('missions');
    const app = document.getElementById('app');
    app.innerHTML = `<div class="board screen" id="board">
      <div class="topbar" id="topbar"></div>
      <div class="locs" id="locs"></div>
      <div class="weather" id="weather"><i class="w-rain"></i><i class="w-rain w2"></i><i class="w-fog"></i><i class="w-fog f2"></i></div>
      <div class="side"><div class="party" id="party"></div><div class="loglist" id="log"></div></div>
      <div class="tray" id="tray"></div>
    </div>`;
    const m = G().M();
    ZG.FX.setNight(m.phase === 'night' && m.turn > 0);
    UI.seen = new Set();
    m.heroes.forEach((h) => h.hand.forEach((c) => UI.seen.add(c.u)));
    UI.bindBoard();
    UI.renderBoard();
  };

  UI.bindBoard = function () {
    const b = document.getElementById('board');
    b.addEventListener('click', (e) => {
      const t = e.target.closest('[data-act]');
      if (t) return UI.onAct(t.dataset.act, t);
      const lc = e.target.closest('.loc');
      if (lc && UI.pickMode) {
        const i = +lc.dataset.i;
        if (UI.pickMode.indices.includes(i)) {
          const pm = UI.pickMode;
          UI.pickMode = null;
          UI.renderBoard();
          pm.resolve(i);
        }
        return;
      }
      const hc = e.target.closest('#tray .hand .card');
      if (hc) UI.onHandCard(+hc.dataset.u, hc);
    });
  };

  UI.renderBoard = function () {
    if (!document.getElementById('board')) return;
    UI.renderTop();
    UI.renderLocs();
    UI.renderParty();
    UI.renderLog();
    UI.renderTray();
  };

  UI.renderTop = function () {
    const m = G().M();
    ZG.Audio.ambient && ZG.Audio.ambient(m.turnEvent && m.turnEvent.id === 'rain' && !m.over ? 'rain' : null);
    // погода события хода — на поле весь ход
    const b = document.getElementById('board');
    const ev = m.turnEvent && !m.over ? m.turnEvent.id : null;
    if (b) ['rain', 'fog'].forEach((w) => b.classList.toggle('w-' + w, ev === w));
    const def = G().def();
    const left = m.clock.length - m.clockPos;
    const night = m.phase === 'night' && m.turn > 0;
    const nextPhaseIn = 5 - ((Math.max(1, m.clockPos) - 1) % 5) - 1;
    document.getElementById('topbar').innerHTML = `
      <div class="mtitle"><small>Миссия ${def.num} · ${esc(def.place)}</small>${esc(def.name)}</div>
      <div class="spacer"></div>
      ${def.special && def.special.objective ? `<div class="clockw" title="Цель миссии"><div class="phase">${ZG.icon('fuel')}</div><div class="cnum">${m.obj || 0}/${def.special.objective.need}</div><div class="clab">${esc(def.special.objective.label)}${m.bossDown ? '<br>Угроза уничтожена' : ''}</div></div>` : ''}
      <div class="clockw ${night ? 'night' : ''} ${left <= 5 ? 'low' : ''}" title="Карты Часов: осталось ${left}. Смена дня и ночи через ${nextPhaseIn + 1} ${ZG.plural(nextPhaseIn + 1, 'ход', 'хода', 'ходов')}.">
        <div class="phase">${ZG.icon(night ? 'moon' : 'sun')}</div>
        <div><div class="cnum">${left}</div></div>
        <div><div class="clab">${night ? T('night') : T('day')} · ${T('turns_left')}</div><div class="clockbar"><i style="width:${(left / m.clock.length) * 100}%"></i></div></div>
      </div>
      ${UI.turnEventChip(m)}
      <button class="btn icon ghost" data-act="rules" title="${T('rules')}">${ZG.icon('book')}</button>
      <button class="btn icon ghost" data-act="menu" title="Меню">${ZG.icon('menu')}</button>`;
  };

  /** Плашка «событие хода» в верхней панели */
  /** Разовый эффект события хода на поле (сирена, вой, голод, радио, рассвет) */
  UI.eventFx = async function (id, locIdx) {
    const b = document.getElementById('board');
    if (!b) return;
    const cls = 'fx-' + id;
    if (id === 'siren') ZG.Audio.sfx('siren', 0.7); // звук и вспышки — одновременно
    b.classList.remove(cls); void b.offsetWidth; b.classList.add(cls);
    if (id === 'howl' && locIdx != null) {
      const el = document.querySelector(`.loc[data-i="${locIdx}"]`);
      if (el) { el.classList.remove('howl-shake'); void el.offsetWidth; el.classList.add('howl-shake'); }
    }
    if (id === 'howl') ZG.Audio.sfx('growl', 0.7);
    await ZG.sleep(id === 'siren' ? 1700 : 1100);
    b.classList.remove(cls);
  };

  UI.turnEventChip = function (m) {
    const e = m.turnEvent;
    if (!e) return '';
    const ev = e.id !== 'calm';
    const cd = ZG.CLOCK[e.id] || {};
    const text = ev ? cd.text : 'Ничего не произошло.';
    return `<button class="turnev ${ev ? 'ev' : ''}" data-act="turnev" title="${esc(e.name + '. ' + text + (e.detail ? ' ' + e.detail : ''))}">
      <span class="tei">${ZG.icon(ev ? cd.icon : m.phase === 'night' ? 'moon' : 'hourglass')}</span>
      <span class="tet"><small>Событие хода ${e.turn}</small><b>${esc(e.name)}</b>${ev && e.id === 'fog' ? '<em>действует до конца хода</em>' : ''}</span></button>`;
  };

  /** Цветовая подложка локации по её смыслу (пока нет рисованного арта) */
  const LOC_TINT = {
    hospital: '90, 160, 140', bed: '90, 150, 140', pill: '110, 170, 150', medkit: '110, 170, 150', vial: '120, 170, 90', biohazard: '140, 170, 60',
    fire: '220, 110, 40', factory: '200, 110, 50', fuel: '210, 140, 50', bolt: '220, 200, 80', hammer: '190, 120, 60',
    waves: '60, 120, 200', bridge: '80, 120, 180', trees: '70, 130, 80', paw: '120, 110, 70', tent: '150, 130, 90', binoculars: '110, 130, 90',
    skull: '170, 40, 40', knife: '180, 40, 40', lock: '140, 60, 60', door: '130, 80, 60', flag: '120, 120, 140',
    car: '130, 120, 110', truck: '150, 130, 70', road: '130, 120, 100', store: '170, 130, 70', warehouse: '120, 110, 100', coffee: '160, 110, 70', trash: '110, 120, 80',
    building: '110, 110, 150', tower: '150, 70, 70', eye: '120, 80, 150', book: '140, 110, 160',
  };
  UI.locTint = (icon) => LOC_TINT[icon] || '140, 40, 30';

  UI.renderLocs = function () {
    const m = G().M();
    const active = m.heroes[m.active];
    const html = m.locations.map((l, i) => {
      const ld = ZG.LOCATIONS[l.id];
      const heroes = m.heroes.filter((h) => h.loc === i);
      // шум — звуковые круги от картинки локации: чем громче, тем чаще и краснее
      const lvl = Math.min(1, l.noise / Math.max(1, l.limit));
      const alarm = !l.closed && l.noise > 0 && l.noise >= l.limit - 1;
      const rd = +(2.8 - 1.9 * lvl).toFixed(2);
      const ph = Date.now() % (rd * 1000);
      const segs = Array.from({ length: l.limit }, (_, k) => `<i class="${k < l.noise ? 'on' : ''} ${k < l.noise && l.noise >= l.limit - 1 ? 'hot' : ''}"></i>`).join('');
      const rings = !l.closed && l.noise > 0 ? `<div class="nrings" style="--rd:${rd}s;--rh:${Math.round(42 - 42 * lvl)};--ra:${(0.35 + 0.5 * lvl).toFixed(2)}">${[0, 1, 2].map((k) => `<i style="animation-delay:${-ph - (k * rd * 1000) / 3}ms"></i>`).join('')}</div>` : '';
      const rules = ZG.locationRules(ld).map((t) => `<div class="lrule">${esc(t)}</div>`).join('');
      const pick = UI.pickMode && UI.pickMode.indices.includes(i);
      const free = !l.closed && (m.bossFree || []).includes(i);
      return `<div class="loc ${l.closed ? 'closed' : ''} ${free ? 'boss-free' : ''} ${alarm ? 'alarm' : ''} ${active && active.loc === i ? 'here' : ''} ${pick ? 'pickable' : ''} ${UI.closingLoc === i ? 'closing' : ''}" data-i="${i}" style="--hc:${active ? ZG.HEROES[active.id].color : ''}">
        <div class="lart" style="--lt:${UI.locTint(ld.icon)}">${ZG.art('locations', ld.id, ld.icon)}${rings}
          ${l.closed ? '<div class="planks"><div class="plank p1"></div><div class="plank p2"></div></div>' : `<div class="lstack" title="Карт в колоде локации">${ZG.icon('cards')} ${l.deck.length}</div>`}
          ${free ? `<div class="boss-free-tag" title="Угроза сбежала не сюда: локация была перекрыта или заколочена во время её побега">${ZG.icon('shield')} Угрозы нет</div>` : ''}</div>
        <div class="lbody">
          <h3>${esc(ld.name)}</h3>
          ${l.closed ? `<span class="shelter-tag">${ZG.icon('tent')} ${T('barricaded')}</span>` : `
          <div class="noise-meter ${alarm ? 'hot' : ''}" data-noise="${i}" title="Шум ${l.noise} из ${l.limit}. При пороге приходит орда.">${ZG.icon('noise')}<div class="segs">${segs}</div><span><b>${l.noise}</b>/${l.limit}</span>${alarm ? '<em>орда близко</em>' : ''}</div>
          ${rules}
          <div class="lclose">${ZG.icon('hammer')} ${esc(ZG.cardCheckLineClose(l))}</div>
          ${ZG.closeRewardText(ld) ? `<div class="lreward" title="Награда, когда локация заколочена">${ZG.icon('trophy')} ${esc(ZG.closeRewardText(ld))}</div>` : ''}
          ${l.deck.length === 0 ? `<div class="lrule" style="color:var(--amber)">${T('empty_loc')} — можно заколотить</div>` : ''}`}
          <div class="ltokens">${heroes.map((h) => UI.avatar(h.id, (h === active ? 'active ' : '') + (h.dead ? 'dead' : '')).replace('class="avatar', `data-tok="${h.id}" class="avatar`)).join('')}</div>
        </div>
      </div>`;
    }).join('');
    const locsEl = document.getElementById('locs');
    // где стояли фишки героев до перерисовки — чтобы при переходе фишка плавно перелетела
    const tokBefore = new Map();
    locsEl.querySelectorAll('[data-tok]').forEach((el) => tokBefore.set(el.dataset.tok, { r: el.getBoundingClientRect(), html: el.outerHTML }));
    const prevLoc = UI._tokLoc || {};
    UI._tokLoc = {};
    m.heroes.forEach((h) => (UI._tokLoc[h.id] = h.loc));
    locsEl.innerHTML = html;
    // раскладка: до 4 локаций — в ряд, 5–6 — по 3 в ряд (3+2 или 3×3), дальше — по 4
    const n = m.locations.length;
    const cols = n <= 4 ? n : n <= 6 ? 3 : 4;
    locsEl.style.setProperty('--cols', cols);
    locsEl.classList.toggle('two-rows', n > cols);
    UI.fitLocText(locsEl);
    // пока фишка в полёте, на новом месте она скрыта (поле может перерисоваться во время перелёта)
    UI._tokFlying = UI._tokFlying || new Set();
    UI._tokFlying.forEach((id) => { const e = locsEl.querySelector(`[data-tok="${id}"]`); if (e) e.style.visibility = 'hidden'; });
    // фишка героя, сменившего локацию, плавно перелетает со старого места на новое
    if (ZG.speed >= 0.2 && !document.documentElement.classList.contains('no-fx')) {
      m.heroes.forEach((h) => {
        const old = tokBefore.get(h.id);
        if (!old || prevLoc[h.id] == null || prevLoc[h.id] === h.loc) return;
        const el = locsEl.querySelector(`[data-tok="${h.id}"]`);
        if (!el) return;
        const to = el.getBoundingClientRect();
        if (!to.width || !old.r.width) return;
        el.style.visibility = 'hidden';
        UI._tokFlying.add(h.id);
        const fl = ZG.html(`<div class="tok-fly">${old.html}</div>`);
        if (fl.firstElementChild) fl.firstElementChild.style.visibility = '';
        Object.assign(fl.style, { left: old.r.left + 'px', top: old.r.top + 'px', width: old.r.width + 'px', height: old.r.height + 'px' });
        document.body.appendChild(fl);
        const dx = to.left - old.r.left, dy = to.top - old.r.top;
        const lift = Math.min(140, 40 + Math.hypot(dx, dy) * 0.25);
        const sc = to.width / old.r.width;
        const a = fl.animate([
          { transform: 'translate(0,0) scale(1)' },
          { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - lift}px) scale(${1.35 * ((1 + sc) / 2)})`, offset: 0.5 },
          { transform: `translate(${dx}px, ${dy}px) scale(${sc})` },
        ], { duration: 650 * Math.max(ZG.speed || 1, 0.4), easing: 'cubic-bezier(.45,.05,.35,1)', fill: 'forwards' });
        const done = () => { fl.remove(); UI._tokFlying.delete(h.id); const cur = document.querySelector(`#locs [data-tok="${h.id}"]`); if (cur) { cur.style.visibility = ''; cur.classList.add('tok-landed'); } };
        a.finished.then(done).catch(done);
      });
    }
  };

  /** Текст правил локаций: один размер для всех карточек — самый крупный, при котором поле помещается без прокрутки */
  UI.fitLocText = function (locsEl) {
    locsEl.style.removeProperty('--lfs');
    if (window.innerWidth <= 900) return;
    const fits = () => locsEl.scrollHeight <= locsEl.clientHeight + 1;
    if (!fits()) return; // уже тесно — оставляем базовый размер
    for (const fs of [16, 15, 14, 13.5]) {
      locsEl.style.setProperty('--lfs', fs + 'px');
      if (fits()) return;
    }
    locsEl.style.removeProperty('--lfs');
  };

  UI.renderParty = function () {
    const m = G().M();
    document.getElementById('party').innerHTML = m.heroes.map((h, i) => {
      const hd = ZG.HEROES[h.id];
      const inf = G().infCount(h);
      const loc = ZG.LOCATIONS[m.locations[h.loc].id];
      return `<div class="pmini ${i === m.active ? 'active' : ''} ${h.dead ? 'dead' : ''}" data-hero="${i}">
        ${UI.avatar(h.id, h.dead ? 'dead' : '')}
        <div class="pinfo"><div class="pname">${esc(UI.shortName(h.id))}</div>
        <div class="pstats">${h.dead ? (h.turned ? 'Обращение' : 'Гибель') : `<span title="${T('deck')}">${ZG.icon('cards')} ${h.deck.length}</span><span title="${T('hand')}">${ZG.icon('hand')} ${h.hand.length}</span><span class="inf-pips" title="${T('infection')} ${inf}/3">${[0, 1, 2].map((k) => `<i class="${k < inf ? 'on' : ''}"></i>`).join('')}</span><span class="ploc" title="Локация">${ZG.icon('mappin')} ${esc(loc.name)}</span>${Object.keys(h.conds || {}).map((k) => `<span title="${esc(ZG.CONDS[k].name + ': ' + ZG.CONDS[k].text)}" style="color:#ff9c86">${ZG.icon(ZG.CONDS[k].icon)}</span>`).join('')}`}</div></div>
      </div>`;
    }).join('');
  };

  UI.renderLog = function () {
    const m = G().M();
    const el = document.getElementById('log');
    if (!el) return;
    el.innerHTML = `<div class="lh">${ZG.icon('scroll')} ${T('log')}</div>` + m.log.slice(-60).map((l) => `<div class="logline ${l.k}">${esc(l.t)}</div>`).join('');
    el.scrollTop = el.scrollHeight;
  };
  UI.logAdded = function () { UI.renderLog(); };

  /* ---------- Лоток ---------- */
  UI.renderTray = function () {
    const m = G().M();
    // во время решения о перекрытии пути панель показывает того, кто решает
    const mh = UI.trayHero || m.heroes[m.active];
    const tray = document.getElementById('tray');
    if (!mh) return;
    const ph = G().ph(mh);
    const hd = ZG.HEROES[mh.id];
    const inf = G().infCount(mh);
    const w = UI.waiting && UI.waiting.mh === mh ? UI.waiting.actions : null;
    const actCards = new Set((w ? w.cards : []).map((c) => c.u));
    const hand = mh.hand.map((c) => {
      const isNew = !UI.seen.has(c.u);
      UI.seen.add(c.u);
      const usable = actCards.has(c.u);
      return UI.cardHTML(c, { u: c.u, cls: `${isNew ? 'new' : ''} ${usable ? 'playable' : ''}`, badge: usable ? 'Действие' : '' });
    }).join('');
    const hs = G().handSizeMh(mh);
    const dis = (k) => (!w || !w[k] ? 'disabled' : '');
    const ts = m.ts || {};
    let hint = '';
    if (w) {
      if (w.explore) hint = 'Исследуйте локацию или сыграйте карту действия.';
      else if (w.close) hint = 'Локация обыскана — заколотите её!';
      else hint = 'Можно завершить ход.';
    }
    // полёт карт: сравниваем с последним ВИДИМЫМ состоянием руки. Пока поверх открыто окно (урон, обновление руки,
    // проверка), рука под ним меняется без анимации, а когда окно закроется — карты полетят в стопки и из колоды.
    const visible = !document.querySelector('#overlay-root > .overlay') && ZG.speed >= 0.2 && !document.documentElement.classList.contains('no-fx');
    const shot = UI._trayShot && UI._trayShot.hero === mh.id ? UI._trayShot : null;
    const flipOn = visible && !!shot;
    const before = flipOn ? shot.cards : new Map();
    const deckBefore = flipOn ? shot.deck : null;
    tray.innerHTML = `
      <div class="hero-panel" style="--hc:${hd.color}">
        <div class="hp-top">${UI.avatar(mh.id)}<div><div class="hp-name">${esc(hd.name)}</div><div class="hp-role">${esc(hd.role)}</div></div><button class="btn small ghost tray-toggle" data-act="traytoggle">${UI.trayCollapsed ? 'Рука ▴' : 'Свернуть ▾'}</button></div>
        <div class="hp-body">${UI.avatar(mh.id, 'portrait', true)}<div class="hp-info">
        ${UI.statsHTML(ph)}
        <div class="power-list">${hd.powers.map((p, i) => `<button class="power-chip" data-power="${i}" style="--hc:${hd.color}">${ZG.icon('star')} ${esc(p.name)}</button>`).join('')}</div>
        ${mh.id === 'kremen' ? (() => { const n = mh.discard.length; const d = ZG.adrenalineDie(n); return `<div><span class="adr-chip ${d ? '' : 'off'}" title="Адреналин (только в бою): 4–6 карт в сбросе — +1d4, 7–9 — +1d6, 10+ — +1d8">${ZG.icon('heartbeat')} ${d ? '+1' + d : '—'} · сброс ${n}${d === 'd8' ? '' : '/' + (n < 4 ? 4 : n < 7 ? 7 : 10)}</span></div>`; })() : ''}
        ${(() => {
          // 3 и больше состояний — компактные значки (на ПК), название и описание — по наведению или нажатию
          const ks = Object.keys(mh.conds || {});
          if (!ks.length) return '';
          const compact = ks.length >= 3;
          return `<div class="cond-row ${compact ? 'compact' : ''}">${ks.map((k) => `<span class="cond ${compact ? 'icon-only' : ''}" data-cond="${k}" title="${esc(ZG.CONDS[k].name)}: ${esc(ZG.CONDS[k].text)}">${ZG.icon(ZG.CONDS[k].icon)}<span class="cn"> ${esc(ZG.CONDS[k].name)}</span></span>`).join('')}</div>`;
        })()}
        </div></div>
        <div class="piles">
          <div class="pile ${mh.deck.length <= 2 ? 'warn' : ''}" title="Колода — это здоровье"><b>${mh.deck.length}</b>${T('deck')}</div>
          <div class="pile"><b>${mh.discard.length}</b>${T('discard')}</div>
          <div class="pile" title="Сожжено навсегда: ${(mh.burned || []).length}. Захоронено до конца миссии (Распад): ${(mh.buried || []).length}."><b>${(mh.burned || []).length + (mh.buried || []).length}</b>${T('burned')}</div>
          <div class="pile inf" title="Три Инфекции — обращение"><b>${inf}/3</b>☣</div>
        </div>
      </div>
      <div class="hand-wrap">
        <div class="hand-label"><span>${T('hand')} · ${mh.hand.length}/${hs}</span></div>
        <div class="hand">${hand || '<div class="muted" style="padding:30px">Рука пуста</div>'}</div>
      </div>
      <div class="actions">
        <button class="btn" data-act="move" ${dis('move')}>${ZG.icon('footprints')} ${T('act_move')}</button>
        <button class="btn primary ${w && w.explore ? 'pulse' : ''}" data-act="explore" ${dis('explore')}>${ZG.icon('search')} ${T('act_explore')}${ts.explores > 1 ? ' ×' + ts.explores : ''}</button>
        ${w && w.close ? `<button class="btn primary pulse wide" data-act="close">${ZG.icon('hammer')} ${T('act_close')}</button>` : ''}
        ${mh.id === 'ten' ? `<button class="btn" data-act="scout" ${dis('scout')}>${ZG.icon('eye')} ${T('act_scout')}</button>` : ''}
        ${mh.id === 'marina' ? `<button class="btn" data-act="fieldmed" ${dis('fieldmed')}>${ZG.icon('cross')} Медицина</button>` : ''}
        <button class="btn" data-act="give" ${dis('give')}>${ZG.icon('swap')} ${T('act_give')}</button>
        <button class="btn ${w && !w.explore && !w.close ? 'pulse' : ''} ${mh.id === 'ten' || mh.id === 'marina' ? '' : 'wide'}" data-act="end" ${w ? '' : 'disabled'}>${ZG.icon('next')} ${T('act_end')}</button>
        <div class="hint">${esc(hint)}</div>
      </div>`;
    tray.classList.toggle('collapsed', !!UI.trayCollapsed);
    const bd = document.getElementById('board');
    if (bd) bd.classList.toggle('tray-small', !!UI.trayCollapsed);
    UI.fitHand(tray.querySelector('.hand'));
    UI._handFlying.forEach((u) => { const e = tray.querySelector(`.hand .card[data-u="${u}"]`); if (e) { e.style.visibility = 'hidden'; e.classList.remove('new'); } });
    if (flipOn && before.size) UI.trayFlights(tray, mh, before, deckBefore);
    if (visible || !shot) {
      // запомнить, как рука выглядит сейчас (для следующего сравнения)
      const cards = new Map();
      tray.querySelectorAll('.hand .card[data-u]').forEach((el) => cards.set(+el.dataset.u, { r: el.getBoundingClientRect(), html: el.outerHTML }));
      const dp = tray.querySelector('.piles .pile');
      UI._trayShot = { hero: mh.id, cards, deck: dp ? dp.getBoundingClientRect() : null };
    }
    // телефон: поле оставляет снизу место ровно под нижнюю панель, чтобы журнал не прятался под ней
    const setTrayH = () => document.documentElement.style.setProperty('--tray-h', tray.offsetHeight + 'px');
    setTrayH();
    if (window.ResizeObserver && UI.trayEl !== tray) { if (UI.trayRO) UI.trayRO.disconnect(); UI.trayEl = tray; UI.trayRO = new ResizeObserver(setTrayH); UI.trayRO.observe(tray); }
  };

  /** Полёт копии карты. Копия рисуется в своём естественном размере и масштабируется, поэтому выглядит
   * ровно как карта в руке. target — прямоугольник или функция, возвращающая ЖИВОЙ прямоугольник цели
   * (карта приземляется точно туда, где останется лежать, даже если рука за это время сдвинулась). */
  UI.flyCard = function (html, from, target, o) {
    o = o || {};
    return new Promise((resolve) => {
      const fl = ZG.html(`<div class="fly-hand-card">${html}</div>`);
      const card = fl.firstElementChild;
      if (card) { card.classList.remove('new', 'playable', 'selected', 'inpool', 'ghost-in', 'unghost', 'returning'); card.style.visibility = ''; card.style.marginLeft = ''; }
      document.body.appendChild(fl);
      const nat = fl.getBoundingClientRect();
      const w0 = nat.width || 150, h0 = nat.height || 214;
      const tgt = () => (typeof target === 'function' ? target() : target) || from;
      const sp = Math.max(ZG.speed || 1, 0.4);
      const dur = (o.dur || 520) * sp;
      const t0 = performance.now();
      const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
      const step = () => {
        const t = Math.min(1, (performance.now() - t0) / dur);
        const k = ease(t);
        const to = tgt();
        const s0 = from.width / w0, s1 = to.width / w0;
        // clipTo/clipFrom: карта выровнена по верху цели и плавно «сворачивается» по высоте до её размера
        const fx = from.left + from.width / 2, fy = o.clipFrom ? from.top + (h0 * s0) / 2 : from.top + from.height / 2;
        const tx = to.left + to.width / 2, ty = o.clipTo ? to.top + (h0 * s1) / 2 : to.top + to.height / 2;
        const lift = o.lift != null ? o.lift : Math.min(110, 30 + Math.hypot(tx - fx, ty - fy) * 0.18);
        const cx = (fx + tx) / 2, cy = Math.min(fy, ty) - lift;
        // квадратичная кривая: дуга над столом
        const x = (1 - k) * (1 - k) * fx + 2 * (1 - k) * k * cx + k * k * tx;
        const y = (1 - k) * (1 - k) * fy + 2 * (1 - k) * k * cy + k * k * ty;
        const sc = s0 + (s1 - s0) * k;
        const sm = (q) => { q = Math.max(0, Math.min(1, q)); return q * q * (3 - 2 * q); };
        let clip = 0;
        if (o.clipTo) clip = Math.max(clip, (1 - Math.min(1, to.height / (h0 * s1))) * sm((k - 0.45) / 0.55));
        if (o.clipFrom) clip = Math.max(clip, (1 - Math.min(1, from.height / (h0 * s0))) * (1 - sm(k / 0.4))); // разворачивается в начале пути
        fl.style.clipPath = clip > 0.001 ? `inset(0 0 ${(clip * 100).toFixed(2)}% 0 round 6px)` : '';
        const rot = (o.rot || 0) * Math.sin(Math.PI * k);
        fl.style.transform = `translate(${x - (w0 * sc) / 2}px, ${y - (h0 * sc) / 2}px) scale(${sc}) rotate(${rot}deg)`;
        fl.style.opacity = o.fade ? String(1 - 0.9 * k) : '1';
        if (t < 1) requestAnimationFrame(step);
        else { fl.remove(); resolve(); }
      };
      step();
    });
  };
  // совместимость: старое имя
  UI.flyCardEl = (html, from, to, o) => UI.flyCard(html, from, to, o);

  /** Карты, которые сейчас летят в руку: их место в руке пустует, пока карта не приземлится */
  UI._handFlying = new Set();
  /** Откуда прилетит карта, только что попавшая в руку (u → прямоугольник показанной карты) */
  UI._handSource = new Map();
  UI.markHandSource = function (u, el, keep) {
    if (u == null || !el || !el.isConnected) return;
    const r = el.getBoundingClientRect();
    if (!r.width) return;
    if (keep) {
      // карта «выходит» из центра элемента (например, награда из заколоченной локации)
      const w = Math.min(150, r.width * 0.6), h = w * 1.43;
      UI._handSource.set(u, { left: r.left + r.width / 2 - w / 2, top: r.top + r.height / 2 - h / 2, width: w, height: h });
      return;
    }
    UI._handSource.set(u, { left: r.left, top: r.top, width: r.width, height: r.height });
    el.style.visibility = 'hidden';
  };
  UI.awaitFlights = () => UI._flightP || Promise.resolve();

  /** Карты, ушедшие из руки, летят в свои стопки; добранные — вылетают из колоды на своё место в руке */
  UI.trayFlights = function (tray, mh, before, deckBefore) {
    const piles = tray.querySelectorAll('.piles .pile');
    const now = new Set(mh.hand.map((c) => c.u));
    const has = (pile, u) => (pile || []).some((c) => c.u === u);
    const m = G().M();
    const jobs = [];
    before.forEach((b, u) => {
      if (now.has(u)) return;
      let target = null;
      if (has(mh.discard, u)) target = piles[1];
      else if (has(mh.deck, u)) target = piles[0];
      else if (has(mh.burned, u) || has(mh.buried, u)) target = piles[2];
      else {
        const other = m.heroes.findIndex((h) => h !== mh && has(h.hand, u));
        if (other >= 0) target = document.querySelector(`.pmini[data-hero="${other}"]`);
      }
      const r = target ? target.getBoundingClientRect() : null;
      // в стопку карта уходит маленькой — по размеру стопки
      const to = r ? { left: r.left + r.width / 2 - r.height * 0.35, top: r.top, width: r.height * 0.7, height: r.height } : { left: b.r.left, top: b.r.top - 120, width: b.r.width * 0.4, height: b.r.height * 0.4 };
      jobs.push(UI.flyCard(b.html, b.r, to, { fade: !target, rot: target === piles[1] ? 10 : -8 }));
    });
    // добор: новые карты по очереди вылетают из колоды и садятся точно на своё место
    const deckR = deckBefore || (piles[0] && piles[0].getBoundingClientRect());
    if (deckR) {
      let k = 0;
      tray.querySelectorAll('.hand .card[data-u]').forEach((el) => {
        const u = +el.dataset.u;
        if (before.has(u) || !has(mh.hand, u)) return;
        el.classList.remove('new');
        el.style.visibility = 'hidden';
        UI._handFlying.add(u);
        const html = el.outerHTML;
        const live = () => { const e = document.querySelector(`#tray .hand .card[data-u="${u}"]`); return e ? e.getBoundingClientRect() : null; };
        const delay = k++ * 140 * Math.max(ZG.speed || 1, 0.4);
        // найденная/полученная карта летит оттуда, где её только что показали; добранная — из колоды
        const src = UI._handSource.get(u);
        UI._handSource.delete(u);
        const from = src || { left: deckR.left + deckR.width / 2 - deckR.height * 0.35, top: deckR.top, width: deckR.height * 0.7, height: deckR.height };
        jobs.push(new Promise((res) => setTimeout(res, delay)).then(() => UI.flyCard(html, from, live, src ? { rot: 0, dur: 680 } : { rot: -8, dur: 560 })).then(() => {
          UI._handFlying.delete(u);
          const e = document.querySelector(`#tray .hand .card[data-u="${u}"]`);
          if (e) e.style.visibility = '';
          ZG.Audio.cardLand && ZG.Audio.cardLand();
        }));
      });
    }
    UI._flightP = Promise.all(jobs);
    return UI._flightP;
  };

  /* ---------- Ожидание действия ---------- */
  UI.waitAction = function (mh, actions) {
    return new Promise((resolve) => {
      UI.waiting = { resolve, mh, actions };
      UI.renderBoard();
    });
  };

  UI.finishWait = function (act) {
    const w = UI.waiting;
    if (!w) return;
    UI.waiting = null;
    UI.renderTray();
    w.resolve(act);
  };

  UI.onAct = async function (act) {
    if (act === 'rules') return UI.showRules(true);
    if (act === 'turnev') {
      const e = G().M().turnEvent; if (!e) return;
      const cd = ZG.CLOCK[e.id] || {};
      return UI.alert(`Событие хода ${e.turn}: ${e.name}`, `<p>${esc(e.id === 'calm' ? 'Тишина — в этот ход Часы не принесли события.' : cd.text)}</p>${e.detail ? `<p class="muted">${esc(e.detail)}</p>` : ''}<p class="muted">Каждый ход начинается с карты Часов. Осталось карт: ${G().M().clock.length - G().M().clockPos}.</p>`);
    }
    if (act === 'menu') return UI.gameMenu();
    if (act === 'traytoggle') { UI.trayCollapsed = !UI.trayCollapsed; return UI.renderTray(); }
    const w = UI.waiting;
    if (!w) return;
    const a = w.actions;
    if (act === 'move' && a.move) {
      const m = G().M();
      const idx = m.locations.map((_, i) => i).filter((i) => i !== w.mh.loc);
      const li = await UI.pickLocation('Куда идти?', idx);
      if (li != null && UI.waiting === w) UI.finishWait({ type: 'move', loc: li });
      return;
    }
    if (act === 'end') {
      if (a.explore && G().M().ts.explores > 0) {
        const ok = await UI.confirm('Завершить ход?', 'Вы ещё не исследовали локацию в этот ход.');
        if (!ok) return;
      }
      return UI.finishWait({ type: 'end' });
    }
    if (a[act]) UI.finishWait({ type: act });
  };

  UI.onHandCard = async function (u, el) {
    const w = UI.waiting;
    const m = G().M();
    const mh = m.heroes[m.active];
    const inst = mh.hand.find((c) => c.u === u);
    if (!inst) return;
    const usable = w ? w.actions.cards.filter((c) => c.u === u) : [];
    if (!usable.length) return UI.inspect(inst);
    const d = ZG.card(inst.id);
    const opts = usable.map((c) => ({ label: `${T('mode_' + d.plays[c.pi].mode)}`, sub: ZG.playText(d.plays[c.pi]), pi: c.pi }));
    opts.push({ label: 'Осмотреть', sub: '', pi: -1 });
    const pi = await UI.modePop(el, opts);
    if (pi == null) return;
    if (pi === -1) return UI.inspect(inst);
    if (UI.waiting === w) UI.finishWait({ type: 'card', u, pi });
  };

  /** Всплывающее меню режимов розыгрыша возле карты */
  UI.modePop = async function (anchor, opts) {
    // подсказка «Как играть карты» указывает на нажатую карту
    anchor.setAttribute('data-tip-anchor', '');
    await UI.tip('modes');
    anchor.removeAttribute('data-tip-anchor');
    return new Promise((resolve) => {
      document.querySelectorAll('.mode-pop').forEach((x) => x.remove());
      const el = ZG.html(`<div class="mode-pop panel">${opts.map((o, i) => `<button class="choice ${o.disabled ? 'off' : ''}" data-i="${i}" ${o.disabled ? 'aria-disabled="true"' : ''}><b>${esc(o.label)}</b>${o.sub ? `<span>${esc(o.sub)}</span>` : ''}${o.reason ? `<em>${esc(o.reason)}</em>` : ''}</button>`).join('')}</div>`);
      document.body.appendChild(el);
      const r = anchor.getBoundingClientRect();
      const h = el.offsetHeight;
      let left = Math.min(window.innerWidth - 280, Math.max(8, r.left + r.width / 2 - 135));
      let top = r.top - h - 10;
      if (top < 8) top = Math.min(window.innerHeight - h - 8, r.bottom + 10);
      el.style.left = left + 'px';
      el.style.top = top + 'px';
      const done = (v) => { el.remove(); document.removeEventListener('pointerdown', outside, true); resolve(v); };
      const outside = (e) => { if (!el.contains(e.target)) done(null); };
      setTimeout(() => document.addEventListener('pointerdown', outside, true), 0);
      el.querySelectorAll('.choice').forEach((b) => b.addEventListener('click', () => { if (!opts[+b.dataset.i].disabled) done(opts[+b.dataset.i].pi); }));
    });
  };

  UI.pickLocation = function (title, indices) {
    return new Promise((resolve) => {
      if (!document.getElementById('board') || UI.encPanel()) {
        // модальный список (если поле перекрыто)
        const m = G().M();
        return UI.choose({ title, options: [...indices.map((i) => ({ label: ZG.LOCATIONS[m.locations[i].id].name })), { label: T('act_cancel') }] })
          .then((k) => resolve(k < indices.length ? indices[k] : null));
      }
      UI.pickMode = { indices, resolve };
      UI.renderLocs();
      const firstPick = document.querySelector('.loc.pickable');
      if (firstPick) firstPick.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      // компактная плашка поверх верхней панели — не закрывает подсвеченные локации
      const bar = ZG.html(`<div class="tip panel pick-bar"><span class="pb-ic">${ZG.icon('mappin')}</span><span class="pb-t"><b>${esc(title)}</b><small>Выберите подсвеченную локацию</small></span><button class="btn small ghost">${T('act_cancel')}</button></div>`);
      document.body.appendChild(bar);
      const prev = UI.pickMode;
      const cleanup = () => bar.remove();
      prev.resolve = (v) => { cleanup(); resolve(v); };
      bar.querySelector('.btn').addEventListener('click', () => {
        UI.pickMode = null;
        cleanup();
        UI.renderLocs();
        resolve(null);
      });
    });
  };

  /* ============================== Передача хода, Часы ============================== */
  UI.handoff = function (mh) {
    return new Promise((resolve) => {
      const hd = ZG.HEROES[mh.id];
      const m = G().M();
      const lart = m && m.locations[mh.loc] ? UI.locArtUrl(m.locations[mh.loc].id) : null;
      const lname = m && m.locations[mh.loc] ? ZG.LOCATIONS[m.locations[mh.loc].id].name : '';
      const el = ZG.html(`<div class="handoff ${lart ? 'has-art' : ''}" style="--hc:${hd.color}">${lart ? `<div class="ho-art" style="background-image:url('${lart}')"></div><div class="ho-loc">${ZG.icon('mappin')} ${esc(lname)}</div>` : ''}<div class="k">${T('handoff')}</div>${UI.avatar(mh.id)}<h1>${esc(hd.name)}</h1><div class="role">${esc(hd.role)}</div><button class="btn primary" style="min-width:220px">${T('handoff_ready')}</button></div>`);
      document.body.appendChild(el);
      el.querySelector('.btn').addEventListener('click', async () => {
        el.style.transition = 'opacity .4s';
        el.style.opacity = '0';
        await ZG.sleep(380);
        el.remove();
        resolve();
      });
    });
  };

  UI.clockFlip = async function (c, phaseChanged) {
    const m = G().M();
    UI.renderTop();
    const cd = ZG.CLOCK[c.id];
    const ev = c.id !== 'calm';
    const name = ev ? cd.name : c.name || 'Тишина';
    const el = ZG.html(`<div class="clock-flip"><div class="clock-card ${ev ? '' : 'quick'}"><div class="b">${ZG.icon('hourglass')}</div>
      <div class="f ${ev ? 'ev' : ''}"><div class="ph">${T('clock')} · ход ${m.turn} · ${m.phase === 'night' ? T('night') : T('day')}</div>${ZG.icon(ev ? cd.icon : m.phase === 'night' ? 'moon' : 'hourglass')}<h3>${esc(name)}</h3>${ev ? `<p>${esc(cd.text)}</p>` : ''}</div></div></div>`);
    const card = el.querySelector('.clock-card');
    ZG.Audio.synth('tick');
    document.body.appendChild(el);
    if (ev) {
      // событие держится на экране, пока игрок его не прочтёт (клик или 7 с)
      card.classList.add('hold');
      card.style.animationDuration = (0.9 * Math.max(ZG.speed, 0.25)) + 's';
      el.classList.add('wait');
      const dim = ZG.html('<div class="clock-dim"></div>');
      document.body.appendChild(dim);
      el.querySelector('.f').insertAdjacentHTML('beforeend', '<div class="tap">Щёлкните, чтобы продолжить</div>');
      await new Promise((res) => {
        const t = setTimeout(res, 7000 * ZG.speed);
        const go = () => { clearTimeout(t); document.removeEventListener('keydown', key); res(); };
        const key = (e) => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') go(); };
        el.addEventListener('click', go, { once: true });
        dim.addEventListener('click', go, { once: true });
        document.addEventListener('keydown', key);
      });
      dim.remove();
      card.classList.remove('hold'); card.classList.add('away');
      card.style.animationDuration = (0.5 * Math.max(ZG.speed, 0.25)) + 's';
      await ZG.sleep(500);
    } else {
      card.style.animationDuration = (1.2 * Math.max(ZG.speed, 0.25)) + 's';
      await ZG.sleep(1200);
    }
    el.remove();
    if (phaseChanged) {
      const night = m.phase === 'night';
      ZG.FX.setNight(night);
      ZG.Audio.sfx(night ? 'psychedelic' : 'tension', 0.8);
      ZG.FX.burst(window.innerWidth / 2, window.innerHeight * 0.4, night ? 'blue' : 'spark', 50);
      await UI.banner(night ? T('phase_night_banner') : T('phase_day_banner'), night ? T('phase_night_sub', { n: G().nightBonus() }) : T('phase_day_sub'), night ? 'night' : 'warn');
    }
    UI.renderBoard();
  };

  /* ============================== Встреча ============================== */
  UI.enc = null;
  UI.encPanel = () => (UI.enc && UI.enc.el.isConnected ? UI.enc.el.querySelector('.enc-panel') : null);

  UI.encounterOpen = async function (inst, mh, loc) {
    const d = ZG.card(inst.id);
    const hd = ZG.HEROES[mh.id];
    const cardHtml = UI.cardHTML(inst, { size: 'big', flip: true });
    const head = `<div class="sub">${esc(hd.name)} · ${esc(ZG.LOCATIONS[loc.id].name)}</div><h2>${esc(ZG.cardTypeLabel(d))}</h2>`;
    if (UI.enc && UI.enc.el.isConnected) {
      UI.enc.depth++;
      const box = UI.enc.el.querySelector('.enc-card');
      box.className = 'enc-card drop';
      box.querySelector('.card').outerHTML = cardHtml;
      UI.enc.el.querySelector('.enc-panel').innerHTML = head;
    } else {
      const el = UI.overlay(`<div class="encounter"><div class="enc-card drop">${cardHtml}<div class="enc-hero">${UI.avatar(mh.id)} ${esc(ZG.heroShort(mh.id))}</div></div><div class="enc-panel panel">${head}</div></div>`, 'enc-ov');
      UI.enc = { el, depth: 1 };
    }
    await ZG.sleep(280);
    ZG.Audio.sfx('flip', 0.8);
    const fl = UI.enc.el.querySelector('.card-flipper');
    if (fl) fl.classList.remove('down');
    await ZG.sleep(650);
    const cardEl = UI.enc.el.querySelector('.enc-card .card');
    if (d.type === 'boss') { ZG.FX.flash('red'); ZG.FX.shake(); ZG.FX.burstAt(cardEl, 'blood', 70); ZG.Audio.sfx('braam'); ZG.Audio.sfx('growl', 0.8); }
    else if (ZG.isEnemy(d)) { ZG.FX.burstAt(cardEl, 'blood', 22); if (!d.living) ZG.Audio.sfx('growl', d.type === 'henchman' ? 1 : 0.75); else ZG.Audio.sfx('braam', 0.5); }
    else if (ZG.isBoon(d)) ZG.FX.burstAt(cardEl, 'gold', 18);
    await ZG.sleep(200);
  };

  UI.encounterClose = async function () {
    if (!UI.enc) return;
    UI.enc.depth--;
    if (UI.enc.depth > 0) return;
    const el = UI.enc.el;
    UI.enc = null;
    const box = el.querySelector('.enc-card');
    if (box && /defeated|acquired|lost/.test(box.className)) await ZG.sleep(650);
    // найденная карта не исчезает вместе с окном, а перелетает в руку
    if (box && box.classList.contains('acquired') && box.dataset.u) UI.markHandSource(+box.dataset.u, box.querySelector('.card'));
    await UI.closeOverlay(el);
    UI.renderBoard();
  };

  /** Досрочно убрать окно встречи (например, чтобы показать побег Угрозы на поле) */
  UI.encounterDismiss = async function () {
    if (!UI.enc) return;
    const el = UI.enc.el;
    UI.enc = null;
    const box = el.querySelector('.enc-card');
    if (box && /defeated|acquired|lost/.test(box.className)) await ZG.sleep(650);
    await UI.closeOverlay(el);
    UI.renderBoard();
  };

  UI.cardBox = () => (UI.enc && UI.enc.el.isConnected ? UI.enc.el.querySelector('.enc-card') : null);
  UI.fxDefeat = function () {
    const b = UI.cardBox();
    if (!b) return;
    b.classList.add('defeated');
    ZG.FX.burstAt(b, 'blood', 60);
  };
  UI.fxLoot = function (inst) {
    const b = UI.cardBox();
    if (!b) return;
    b.classList.add('acquired');
    if (inst) b.dataset.u = inst.u;
    ZG.Audio.synth('loot');
    ZG.FX.burstAt(b, 'gold', 60);
    ZG.FX.flash('green');
  };
  UI.fxLost = function () {
    const b = UI.cardBox();
    if (b) b.classList.add('lost');
  };

  /* ============================== Проверка ============================== */
  const KIND_LABEL = { combat: 'check_combat', acquire: 'check_acquire', event: 'check_event', close: 'check_close', evade: 'check_evade' };

  UI.check = function (ctx) {
    return new Promise((resolve) => {
      let panel = UI.encPanel();
      let own = null;
      if (!panel) {
        const loc = G().loc(ctx.mh);
        own = UI.overlay(`<div class="encounter"><div class="enc-card drop">${ctx.check.kind === 'close' ? UI.locCardHTML(loc) : ctx.check.cardId ? UI.cardHTML(ctx.check.cardId, { size: 'big' }) : UI.locCardHTML(loc)}</div><div class="enc-panel panel"></div></div>`, 'enc-ov');
        panel = own.querySelector('.enc-panel');
      }
      let restore = null; // карта встречи, временно подменённая картой локации
      if (!own && ctx.check.kind === 'close' && ctx.check.locIdx != null) {
        const box = UI.cardBox();
        if (box) {
          box.className = 'enc-card drop';
          const c = box.querySelector('.card');
          if (c) {
            const prev = c.outerHTML;
            c.outerHTML = UI.locCardHTML(G().M().locations[ctx.check.locIdx]);
            restore = () => {
              const b = UI.cardBox();
              const cur = b && b.querySelector('.card');
              if (!cur) return;
              b.className = 'enc-card drop';
              cur.outerHTML = prev;
            };
          }
        }
      }
      const st = { rolled: false };
      const render = () => UI.renderCheck(panel, ctx, st, finish);
      const finish = async (res) => {
        if (own) await UI.closeOverlay(own);
        if (restore) restore();
        resolve(res);
      };
      st.render = render;
      render();
    });
  };

  function playBadge(pl) {
    const parts = [];
    if (pl.dice && pl.dice.length) parts.push('+' + ZG.diceStr(pl.dice, pl.bonus));
    else if (pl.bonus) parts.push('+' + pl.bonus);
    if (pl.skillDie) parts.push(`+${pl.skillDie}🎲`);
    if (pl.noiseMod) parts.push(`шум ${pl.noiseMod}`);
    return parts.join(' ') || T('mode_' + pl.mode);
  }

  UI.renderCheck = function (panel, ctx, st, finish) {
    const keepScroll = panel.scrollTop;
    const keepWin = window.scrollY;
    const ovs = panel.closest('.overlay');
    const keepOv = ovs ? ovs.scrollTop : 0;
    const g = G();
    const m = g.M();
    const ck = ctx.check;
    const mh = ctx.mh;
    const ph = g.ph(mh);
    const pool = g.pool(ctx);
    const hd = ZG.HEROES[mh.id];
    const modsHtml = (ck.mods || []).map((x) => `<div class="${x.v > 0 ? 'm-up' : 'm-down'}">${esc(x.label)}: ${x.v > 0 ? '+' : ''}${x.v}</div>`).join('');
    const chips = pool.opts.map((s) => {
      const v = g.skillValue(ph, s);
      return `<span class="chip ${s === pool.skill ? 'on' : ''}" data-skill="${s}">${esc(ZG.skillName(s))} <b>${T('die')}${ZG.sides(v.die)}${v.bonus ? (v.bonus > 0 ? '+' : '') + v.bonus : ''}</b></span>`;
    }).join('');
    const slotTypes = ['weapon', 'item', 'consumable', 'ally', 'resolve', 'technique'];
    const slots = slotTypes.map((t) => {
      // по одной карте типа от каждого героя — показываем все сыгранные
      const ps = ctx.played.filter((x) => ZG.card(x.id).type === t);
      if (!ps.length) return `<div class="slotbox">${T('slot_' + t)}</div>`;
      const one = (p) => {
        const owner = m.heroes.find((h) => h.id === p.owner);
        const cd = ZG.card(p.id);
        return `<div class="sl-item" data-unplay="${p.u}" title="Убрать"><span class="sl-thumb">${ZG.art('cards', p.id, cd.icon || 'cards')}</span><span class="sl-txt"><span class="sl-name">${esc(ZG.card(p.id).name)}</span><span class="sl-mode">${T('mode_' + g.playDef(p).mode)}${owner !== mh ? ' · ' + esc(g.hname(owner)) : ''}</span></span></div>`;
      };
      return `<div class="slotbox filled ${ps.length > 1 ? 'multi' : ''}">${ps.map(one).join('')}</div>`;
    }).join('');
    const dice = pool.dice.map((x) => `<div class="die ${x.d}"><div class="die-body"><span>${T('die')}${ZG.sides(x.d)}</span></div><small title="${esc(x.src)}">${esc(x.src.length > 12 ? x.src.slice(0, 11) + '…' : x.src)}</small></div>`).join('');
    const pct = Math.round(pool.chance * 100);
    const handCards = (owner) => owner.hand.map((c) => {
      const d = ZG.card(c.id);
      const okPis = (d.plays || []).map((p, pi) => (g.canPlay(ctx, owner, c, pi) ? pi : -1)).filter((x) => x >= 0);
      const inPool = ctx.played.some((p) => p.u === c.u);
      const badge = okPis.length ? okPis.map((pi) => playBadge(d.plays[pi])).join(' / ') : '';
      if (owner !== mh && !inPool && !okPis.length) return '';
      return UI.cardHTML(c, { u: c.u, size: 'sm', cls: inPool ? 'inpool' : okPis.length ? 'playable' : 'unplayable', badge: inPool ? 'в проверке' : badge });
    }).join('');
    const helpers = m.heroes.filter((h) => h !== mh && !h.dead && h.hand.some((c) => (ZG.card(c.id).plays || []).some((p, pi) => g.canPlay(ctx, h, c, pi) || ctx.played.some((x) => x.u === c.u))));
    // помощь соседей — одной лентой: группы карт рядом, над каждой — кто помогает
    if (helpers.length) setTimeout(() => UI.tip('help'), 400);
    const helpHtml = helpers.length ? `<div class="sec-label help-head">${T('help_cards')} — можно сыграть в эту проверку</div><div class="help-row">${helpers.map((h) => `<div class="help-grp"><div class="help-who">${UI.avatar(h.id)} ${esc(g.hname(h))}${h.loc !== mh.loc ? ' <small>(другая локация)</small>' : ''}</div><div class="mini-hand" data-owner="${h.id}">${handCards(h)}</div></div>`).join('')}</div>` : '';

    panel.innerHTML = `
      <div class="sub">${esc(hd.name)} · ${T(KIND_LABEL[ck.kind] || 'check')}</div>
      <h2>${esc(ck.title)}</h2>
      <div class="dc-box"><div class="dc-big"><b>${ck.dc}</b><span>${T('dc')}</span></div>
        <div class="dc-mods"><div class="dc-cap">Сложность</div><div>База: ${ck.base != null ? ck.base : ck.dc}</div>${modsHtml}</div></div>
      <div class="sec-label">${T('skill_use')}</div>
      <div class="skill-chips">${chips}</div>
      <div class="slots-row">${slots}</div>
      <div class="pool-row" id="pool-row"><div class="dice" id="dice">${dice}</div>
        ${pool.parts.length ? `<div class="roll-mods"><span class="rm-cap">К броску</span>${pool.parts.map((p) => `<span class="rm ${p.v < 0 ? 'neg' : 'pos'}">${esc(p.label)} ${p.v > 0 ? '+' : '−'}${Math.abs(p.v)}</span>`).join('')}</div>` : ''}
        <div class="pool-sum">${pool.noise ? `<span style="color:var(--amber)">${ZG.icon('noise')} ${T('noise_add')} +${pool.noise}</span>` : `<span>${ZG.icon('noise')} тихо</span>`}<b>${ZG.diceStr(pool.dice.map((x) => x.d), pool.bonus)}</b>≈ ${pool.avg.toFixed(1)}</div></div>
      <div class="chance-lab"><span>Шанс успеха</span><span>${pct}%</span></div><div class="chance"><i style="width:${pct}%"></i></div>
      <div id="check-bottom">
        <div class="sec-label">${T('your_cards')}</div>
        <div class="mini-hand" data-owner="${mh.id}">${handCards(mh) || `<span class="muted">${T('no_cards')}</span>`}</div>
        ${helpHtml}
        <div class="enc-actions"><button class="btn primary pulse" data-roll>${ZG.icon('dice')} ${T('roll')}</button></div>
      </div>`;

    // карта, отданная в проверку, остаётся в руке «призраком»: видно, откуда она ушла
    panel.querySelectorAll('.mini-hand .card.inpool').forEach((e) => (e.title = 'В проверке — нажмите, чтобы вернуть в руку'));
    const fx = ZG.speed >= 0.2 && !document.documentElement.classList.contains('no-fx');
    const mark = (u, cls) => {
      if (!fx) return;
      const e = panel.querySelector(`.mini-hand .card[data-u="${u}"]`);
      if (e) { e.classList.add(cls); setTimeout(() => e.classList.remove(cls), 600); }
    };
    panel.querySelectorAll('[data-skill]').forEach((el) => el.addEventListener('click', () => {
      ctx.skill = el.dataset.skill;
      g.pruneCtx(ctx);
      st.render();
    }));
    // карта возвращается из слота в руку: летит обратно и «проявляется» на месте призрака
    const unplay = (u) => {
      const slotEl = panel.querySelector(`.sl-item[data-unplay="${u}"]`);
      const ghost = panel.querySelector(`.mini-hand .card[data-u="${u}"]`);
      const fromR = slotEl && slotEl.getBoundingClientRect();
      const html = ghost && ghost.outerHTML.replace(/<span class="badge-play">[^<]*<\/span>/, ''); // летит уже не «в проверке»
      ctx.played = ctx.played.filter((p) => p.u !== u);
      g.pruneCtx(ctx);
      st.render();
      if (!fx || !fromR || !html) return;
      const live = () => { const e = panel.querySelector(`.mini-hand .card[data-u="${u}"]`); return e ? e.getBoundingClientRect() : null; };
      const back = panel.querySelector(`.mini-hand .card[data-u="${u}"]`);
      if (back) back.classList.add('returning');
      UI.flyCard(html, fromR, live, { dur: 420, clipFrom: true }).then(() => {
        const e = panel.querySelector(`.mini-hand .card[data-u="${u}"]`);
        if (e) { e.classList.remove('returning'); e.classList.add('unghost'); setTimeout(() => e.classList.remove('unghost'), 600); }
      });
    };
    panel.querySelectorAll('[data-unplay]').forEach((el) => el.addEventListener('click', () => unplay(+el.dataset.unplay)));
    panel.querySelectorAll('.mini-hand').forEach((row) => {
      const owner = m.heroes.find((h) => h.id === row.dataset.owner);
      row.querySelectorAll('.card').forEach((el) => el.addEventListener('click', async () => {
        const u = +el.dataset.u;
        if (ctx.played.some((p) => p.u === u)) return unplay(u);
        const c = owner.hand.find((x) => x.u === u);
        const d = ZG.card(c.id);
        const pis = (d.plays || []).map((p, pi) => (g.canPlay(ctx, owner, c, pi) ? pi : -1)).filter((x) => x >= 0);
        if (!pis.length) return UI.inspect(c);
        let pi = pis[0];
        if (pis.length > 1) {
          pi = await UI.modePop(el, pis.map((k) => ({ label: T('mode_' + d.plays[k].mode) + ' · ' + playBadge(d.plays[k]), sub: ZG.playText(d.plays[k]), pi: k })));
          if (pi == null) return;
        }
        const fromR = el.getBoundingClientRect(), fromHtml = el.outerHTML;
        ctx.played.push({ owner: owner.id, u, id: c.id, pi });
        g.pruneCtx(ctx);
        st.render();
        mark(u, 'ghost-in');
        // карта летит из руки в свой слот проверки
        const slot = panel.querySelector(`.sl-item[data-unplay="${u}"]`);
        if (slot && ZG.speed >= 0.2 && !document.documentElement.classList.contains('no-fx')) {
          slot.style.visibility = 'hidden';
          UI.flyCardEl(fromHtml, fromR, slot.getBoundingClientRect(), { dur: 460, clipTo: true }).then(() => { slot.style.visibility = ''; slot.classList.add('sl-landed'); });
        }
      }));
    });
    panel.querySelectorAll('.mini-hand').forEach(UI.fitHand);
    panel.scrollTop = keepScroll;
    if (ovs) ovs.scrollTop = keepOv;
    window.scrollTo(0, keepWin);
    panel.querySelector('[data-roll]').addEventListener('click', () => UI.doRoll(panel, ctx, finish));
    UI.keyRoll = () => { const b = panel.querySelector('[data-roll]'); if (b) b.click(); };
  };

  /** Комиксная надпись при попадании: звук зависит от оружия */
  UI.comicHit = function (ctx) {
    const w = (ctx.played || []).map((p) => ZG.card(p.id)).find((d) => d.type === 'weapon');
    const tr = (w && w.traits) || [];
    const pool = tr.includes('Огнестрел') ? ['БАХ!', 'БДЫЩ!', 'ПАФ!']
      : tr.includes('Огонь') ? ['ВЖУХ!', 'ФШШ!']
      : tr.includes('Электричество') ? ['ТРЕСК!', 'ВЗЗТ!']
      : tr.includes('Дальнее') ? ['ВЖИК!', 'ТУК!']
      : tr.includes('Тяжёлое') ? ['ХРЯСЬ!', 'БУМ!']
      : w ? ['ХРЯСЬ!', 'ШМЯК!', 'БАМ!'] : ['БАМ!', 'ТЫЦ!'];
    const word = pool[Math.floor(Math.random() * pool.length)];
    const box = document.querySelector('.enc-ov .enc-card .card') || (UI.cardBox && UI.cardBox());
    const r = box && box.offsetParent !== null ? box.getBoundingClientRect() : { left: innerWidth / 2 - 100, top: innerHeight / 3, width: 200, height: 200 };
    const el = ZG.html(`<div class="comic-hit" style="left:${Math.round(r.left + r.width / 2)}px;top:${Math.round(Math.max(90, Math.min(innerHeight - 90, r.top + Math.min(r.height * 0.32, 150))))}px;--rot:${(Math.random() * 16 - 8).toFixed(1)}deg"><div class="ch-burst"></div><b>${word}</b></div>`);
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1500);
  };

  UI.doRoll = async function (panel, ctx, finish) {
    UI.keyRoll = null;
    const res = G().rollCheck(ctx);
    panel.querySelectorAll('[data-skill],[data-unplay]').forEach((el) => (el.style.pointerEvents = 'none'));
    const bottom = panel.querySelector('#check-bottom');
    const diceEl = panel.querySelector('#dice');
    // 3D-кубики: карты руки плавно уходят, полоса кубиков плавно раскрывается вниз в стол,
    // и только потом кубики катятся по физике и ложатся результатом игры
    const use3d = ZG.Dice3D && ZG.Dice3D.available() && ZG.speed >= 0.2 && !document.documentElement.classList.contains('no-fx');
    if (use3d) {
      // карты руки плавно тают, затем место под ними плавно схлопывается
      bottom.style.height = bottom.offsetHeight + 'px';
      bottom.style.overflow = 'hidden';
      bottom.style.transition = 'opacity .38s ease';
      void bottom.offsetHeight;
      bottom.style.opacity = '0';
      await ZG.sleep(380);
      bottom.style.transition = 'height .34s ease';
      bottom.style.height = '44px';
      await ZG.sleep(340);
      bottom.style.transition = 'opacity .25s ease';
      bottom.innerHTML = `<div class="total-line">${T('rolling')}</div>`;
      bottom.style.opacity = '1'; bottom.style.height = ''; bottom.style.overflow = '';
      const tray = ZG.html('<div class="dice-tray" title="Нажмите, чтобы ускорить"></div>');
      diceEl.parentElement.insertBefore(tray, diceEl);
      diceEl.innerHTML = '';
      tray.addEventListener('click', () => ZG.Dice3D.hurry());
      const hc = ZG.HEROES[ctx.mh.id].color;
      const specs = res.rolls.map((r) => ({ d: r.d, v: r.v, theme: ZG.Dice3D.theme(r.src, ctx.check.kind, ctx, hc) }));
      // на телефоне стол может оказаться ниже края экрана — плавно подвести к нему
      if (window.innerWidth <= 900) setTimeout(() => tray.scrollIntoView({ block: 'center', behavior: 'smooth' }), 120);
      await ZG.sleep(480); // стол раскрывается вниз
      // звук — в момент, когда кубики фактически начинают лететь
      try { await ZG.Dice3D.roll(tray, specs, () => ZG.Audio.sfx('dice')); } catch (e) { console.error(e); }
    } else { ZG.Audio.sfx('dice'); bottom.innerHTML = `<div class="total-line">${T('rolling')}</div>`; }
    diceEl.innerHTML = res.rolls.map((r) => `<div class="die ${r.d} ${use3d ? '' : 'rolling'}"><div class="die-body"><span>?</span></div><small>${esc(r.src.slice(0, 12))}</small></div>`).join('');
    const els = Array.from(diceEl.querySelectorAll('.die'));
    let spin = !use3d;
    (async () => {
      while (spin) {
        els.forEach((e, i) => { if (e.classList.contains('rolling')) e.querySelector('span').textContent = 1 + Math.floor(Math.random() * ZG.sides(res.rolls[i].d)); });
        await new Promise((r) => setTimeout(r, 60));
      }
    })();
    if (!use3d) await ZG.sleep(700);
    let run = res.pool.bonus;
    for (let i = 0; i < els.length; i++) {
      const e = els[i];
      e.classList.remove('rolling');
      e.classList.add('landed');
      e.querySelector('span').textContent = res.rolls[i].v;
      if (res.rolls[i].v === ZG.sides(res.rolls[i].d)) { e.classList.add('max'); ZG.FX.burstAt(e, 'spark', 14); }
      run += res.rolls[i].v;
      bottom.querySelector('.total-line').innerHTML = `Итого: <b>${run}</b> против ${res.dc}`;
      await ZG.sleep(use3d ? 90 : 180);
    }
    spin = false;
    await ZG.sleep(250);
    const ok = res.success;
    // после успешного боя игра продолжает сама через пару секунд (клик или Enter — сразу)
    const auto = ok && ctx.check && ctx.check.kind === 'combat'; // только успешный бой; провал — по кнопке
    const AUTO_MS = Math.round(2200 * Math.max(ZG.speed, 0.3));
    bottom.innerHTML = `<div class="result-banner ${ok ? 'ok' : 'bad'}">${ok ? T('success') : T('fail')}</div>
      <div class="total-line">${res.rolls.map((r) => r.v).join(' + ')}${res.pool.bonus ? (res.pool.bonus > 0 ? ' + ' : ' − ') + Math.abs(res.pool.bonus) : ''} = <b>${res.total}</b> против ${res.dc}${ok ? '' : ` · разница ${res.dc - res.total}`}</div>
      ${auto ? '' : `<div class="enc-actions"><button class="btn ${ok ? 'good' : 'primary'}" data-cont>${T('continue')}</button></div>`}`;
    ZG.Audio.synth(ok ? 'success' : 'fail');
    if (window.innerWidth <= 900) { const rb = bottom.querySelector('.result-banner'); if (rb) rb.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
    if (ok) { ZG.FX.flash('green'); ZG.FX.burstAt(panel.querySelector('.result-banner'), 'gold', 40); }
    if (ok && ctx.check && ctx.check.kind === 'combat') UI.comicHit(ctx);
    if (!ok) { ZG.FX.flash('red'); ZG.FX.shake(UI.cardBox() || undefined); }
    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      UI.keyRoll = null;
      finish(res);
    };
    UI.keyRoll = go;
    if (auto) {
      const t = setTimeout(go, AUTO_MS);
      bottom.addEventListener('click', () => { clearTimeout(t); go(); }, { once: true });
    } else {
      const btn = bottom.querySelector('[data-cont]');
      btn.addEventListener('click', go);
      if (ZG.params.get('fast')) btn.focus();
    }
  };

  /* ============================== Урон ============================== */
  UI.damage = function (mh, n, opts) {
    return new Promise((resolve) => {
      const g = G();
      const plays = [];
      const sel = new Set();
      // те же правила, что и в движке (броня — только физический урон и т.д.)
      const isRed = (p, d) => p.on === 'damage' && G().playBlocks(p, opts, d);
      /** Почему эта защита сейчас не работает */
      const whyNot = (p, d) => {
        if (opts.noReduce) return 'Уязвимость: этот урон нельзя уменьшить';
        if (p.physical && opts.dmgType) return `не защищает от урона «${ZG.DMG_TYPES[opts.dmgType]}» — только от физического`;
        if (p.nonPhysical && !opts.dmgType) return 'защищает только от огня, кислоты, электричества и холода';
        if (p.onlyType && !p.onlyType.includes(opts.dmgType)) return `защищает только от урона «${p.onlyType.map((t) => ZG.DMG_TYPES[t]).join(', ')}»`;
        if (opts.pierceShield && G().isShield(d)) return 'враг пробивает щит';
        if (opts.pierceLight && G().lightArmor(d)) return 'враг пробивает лёгкую броню';
        if (p.combatOnly && !opts.combat) return 'работает только в бою';
        return 'сейчас не действует';
      };
      ZG.FX.flash('red');
      ZG.FX.shake();
      ZG.Audio.synth('hit');
      const hd = ZG.HEROES[mh.id];
      let panel = UI.encPanel();
      let own = null;
      if (!panel) {
        own = UI.overlay(`<div class="modal panel dmg-modal"></div>`);
        panel = own.querySelector('.modal');
      }
      const done = async () => {
        if (own) await UI.closeOverlay(own);
        resolve({ plays, discards: [...sel] });
      };
      const render = () => {
        const need = g.damageNeeded(mh, n, plays, opts);
        // убрать лишние выделения
        while (sel.size > need) sel.delete([...sel].pop());
        const usedU = new Set(plays.map((p) => p.u));
        const cards = mh.hand.map((c) => {
          const d = ZG.card(c.id);
          const red = (d.plays || []).map((p, pi) => (isRed(p, d) && !usedU.has(c.u) && !plays.some((x) => G().blockSlot(ZG.card(x.id)) === G().blockSlot(d)) ? pi : -1)).filter((x) => x >= 0);
          const used = usedU.has(c.u);
          const burnArmor = red.length && G().missingProf(mh, c.id).includes('heavyarmor');
          const inf = c.id === 'infection';
          // выбранный блок: что станет с картой (останется / под колоду / в сброс / сгорит)
          const up = used ? plays.find((x) => x.u === c.u) : null;
          const upMode = up ? G().effMode(mh, c.id, d.plays[up.pi]) : '';
          const UPL = { reveal: 'блок · останется', recharge: 'блок · под колоду', discard: 'блок · в сброс', burn: 'блок · сгорит', technique: 'блок · перезарядка' };
          const badge = inf ? 'нельзя' : used ? (UPL[upMode] || 'блок') : sel.has(c.u) ? 'в сброс' : red.length ? (burnArmor ? 'Блок · сгорит' : 'Блок') : '';
          return UI.cardHTML(c, { u: c.u, cls: `${used ? 'blocking' : ''} ${used && upMode === 'burn' ? 'burning' : ''} ${red.length ? 'playable' : ''} ${sel.has(c.u) ? 'selected' : ''} ${inf ? 'disabled' : ''}`, badge });
        }).join('');
        const reduced = plays.length ? `<div class="muted">Защита: ${plays.map((p) => esc(ZG.card(p.id).name)).join(', ')}</div>` : '';
        panel.innerHTML = `<div class="dmg-head"><div class="dmg-num">−${n}</div><div><h2>${T('dmg_title')}: ${esc(ZG.heroShort(mh.id))}</h2><div class="mtext" style="margin:0">${opts.source ? esc(opts.source) + '. ' : ''}${opts.dmgType ? `<span style="color:var(--amber)">Тип урона: ${ZG.DMG_TYPES[opts.dmgType]}.</span> ` : ''}${opts.noReduce ? '<span style="color:var(--blood2)">Уязвимость: этот урон нельзя уменьшить.</span> ' : ''}${opts.pierceLight ? '<span style="color:var(--blood2)">Пробивает лёгкую броню: из брони помогает только тяжёлая.</span> ' : ''}${opts.pierceShield ? '<span style="color:var(--blood2)">Пробивает щит: щиты не помогают.</span> ' : ''}${opts.bite ? '<span style="color:var(--toxic)">Укус: если пройдёт 2+ урона — Инфекция.</span> ' : ''}</div>${reduced}</div></div>
          <div class="mtext" style="margin-top:10px">${need ? `Выберите ${need} ${ZG.plural(need, 'карту', 'карты', 'карт')} для сброса. Карты с защитой можно сыграть, нажав на них.` : T('dmg_none')}</div>
          <div class="hand">${cards || '<span class="muted">Рука пуста</span>'}</div>
          <div class="enc-actions" style="align-items:center;margin-top:8px"><span class="muted">${T('dmg_choose', { a: sel.size, b: need })}</span><button class="btn primary" data-ok ${sel.size === need ? '' : 'disabled'}>${T('dmg_accept')}</button></div>`;
        panel.querySelectorAll('.hand .card').forEach((el) => el.addEventListener('click', async () => {
          const u = +el.dataset.u;
          const c = mh.hand.find((x) => x.u === u);
          const d = ZG.card(c.id);
          if (c.id === 'infection') { UI.toast('Инфекцию нельзя сбросить как урон', 'bad'); return; }
          if (usedU.has(u)) {
            const i = plays.findIndex((p) => p.u === u);
            plays.splice(i, 1);
            return render();
          }
          const red = (d.plays || []).map((p, pi) => (isRed(p, d) ? pi : -1)).filter((x) => x >= 0);
          const slotBusy = plays.some((x) => G().blockSlot(ZG.card(x.id)) === G().blockSlot(d));
          const dmgPlays = (d.plays || []).map((p, pi) => (p.on === 'damage' ? pi : -1)).filter((x) => x >= 0);
          // у карты есть защита — показать все её варианты; неработающие перечёркнуты, с причиной
          if (dmgPlays.length && !sel.has(u)) {
            const opts2 = dmgPlays.map((pi) => {
              const ok = red.includes(pi) && !slotBusy;
              const reason = ok ? '' : red.includes(pi) ? 'уже сыграна защита этого типа' : whyNot(d.plays[pi], d);
              return { label: T('mode_' + d.plays[pi].mode), sub: ZG.playText(d.plays[pi]), pi, disabled: !ok, reason };
            });
            opts2.push({ label: 'Сбросить как урон', sub: '', pi: -2 });
            const pi = await UI.modePop(el, opts2);
            if (pi == null) return;
            if (pi >= 0) {
              plays.push({ owner: mh.id, u, id: c.id, pi });
              sel.delete(u);
              return render();
            }
          }
          if (sel.has(u)) sel.delete(u);
          else if (sel.size < g.damageNeeded(mh, n, plays, opts)) sel.add(u);
          render();
        }));
        UI.fitHand(panel.querySelector('.hand'));
        panel.querySelector('[data-ok]').addEventListener('click', done);
      };
      ZG.FX.burstAt(UI.heroAvatarEl(), 'blood', 50);
      // если защититься нечем и выбора нет — авто
      const anyRed = mh.hand.some((c) => (ZG.card(c.id).plays || []).some((p) => isRed(p, ZG.card(c.id))));
      const discardable = mh.hand.filter((c) => c.id !== 'infection');
      if (!anyRed && discardable.length <= n) {
        discardable.forEach((c) => sel.add(c.u));
        render();
        return;
      }
      render();
    });
  };

  /* ============================== Эффекты событий ============================== */
  /** Окно «Набега»: жетоны банды, вскрытые карты по одной, итог */
  /** Видимый портрет активного героя (большой на компьютере, кружок на телефоне) */
  UI.heroAvatarEl = () => [...document.querySelectorAll('.hero-panel .avatar')].find((e) => e.offsetParent) || document.querySelector('.hero-panel .avatar');

  UI.raid = async function (li, steps, losses, why) {
    const m = G().M();
    const loc = m.locations[li];
    const lname = ZG.LOCATIONS[loc.id].name;
    const LBL = { kill: ['убит', 'kill'], join: ['к банде: +1 жетон', 'join'], loot: ['унесли', 'loot'], stop: ['стоп', 'stop'], stay: ['нет жетона', 'stop'] };
    const tok = (k) => `<span class="raid-tok ${k ? '' : 'none'}">${ZG.icon('raider')}</span>`;
    const tokRow = (n) => (n > 0 ? Array.from({ length: n }, () => tok(1)).join('') : '<span class="muted">жетонов нет</span>');
    const lossHtml = losses.length
      ? `<div class="raid-loss">${losses.map((l) => `<div class="raid-lost"><div class="help-who">${UI.avatar(l.mh.id)} ${esc(ZG.heroShort(l.mh.id))} теряет</div>${UI.cardHTML(l.c, { size: 'sm' })}</div>`).join('')}</div>`
      : '<div class="mtext muted">Героев здесь нет — грабят только колоду.</div>';
    const start = steps.length ? steps[0].tokens + (steps[0].res === 'kill' ? 1 : 0) - (steps[0].res === 'join' ? 1 : 0) : 3;
    const ov = UI.overlay(`<div class="modal panel raid-modal"><h2>${ZG.icon('raider')} Набег банды: ${esc(lname)}</h2>
      ${lossHtml}
      <div class="sec-label">Разграбление колоды</div>
      <div class="raid-tokens">${tokRow(start)}</div>
      <div class="raid-stage"><div class="raid-deck"><div class="rd-back">${ZG.icon('biohazard')}</div><span class="rd-n">${loc.deck.length + steps.filter((x) => ['kill', 'join', 'loot'].includes(x.res)).length}</span></div><div class="raid-row"></div></div>
      <div class="mtext raid-sum"></div>
      <div class="enc-actions"><button class="btn primary" data-ok disabled>${T('continue')}</button></div></div>`);
    ZG.Audio.sfx('raid', 0.9);
    const quick = ZG.speed < 0.2;
    const sp = Math.max(ZG.speed, 0.4);
    const pause = (ms) => (quick ? Promise.resolve() : ZG.sleep(ms * sp));
    if (!quick) { ZG.FX.flash('red'); ZG.FX.shake(); }
    // потери героев — по одной: карту вырывают из рук
    const lost = [...ov.querySelectorAll('.raid-lost')];
    lost.forEach((el) => el.classList.add('pending'));
    for (const el of lost) {
      await pause(300);
      el.classList.remove('pending'); el.classList.add('stolen');
      ZG.Audio.synth && ZG.Audio.synth('curse');
    }
    if (lost.length) await pause(400);
    const row = ov.querySelector('.raid-row');
    const tk = ov.querySelector('.raid-tokens');
    const deckN = ov.querySelector('.rd-n');
    let cur = start;
    const setTokens = async (n) => {
      // жетоны меняются по одному: убитые бандиты гаснут, новые вливаются в банду
      while (cur > n) {
        const t = [...tk.querySelectorAll('.raid-tok:not(.gone)')].pop();
        if (!t) break;
        t.classList.add('gone'); cur--;
        await pause(260);
        t.remove();
      }
      while (cur < n) {
        const e = tk.querySelector('.muted'); if (e) e.remove();
        tk.insertAdjacentHTML('beforeend', `<span class="raid-tok join">${ZG.icon('raider')}</span>`); cur++;
        await pause(260);
      }
      if (cur <= 0 && !tk.querySelector('.raid-tok:not(.gone)')) tk.innerHTML = '<span class="muted">жетонов нет</span>';
    };
    let left = +deckN.textContent;
    for (const st of steps) {
      await pause(380);
      const [lbl, cls] = LBL[st.res];
      const el = ZG.html(`<div class="raid-step">${UI.cardHTML(st.c, { size: 'sm' })}<div class="raid-lbl">${esc(lbl)}</div></div>`);
      row.appendChild(el);
      if (['kill', 'join', 'loot'].includes(st.res)) deckN.textContent = --left;
      ZG.Audio.synth && ZG.Audio.synth('flip');
      await pause(520);
      el.classList.add('res', cls);
      if (st.res === 'kill') { ZG.Audio.synth && ZG.Audio.synth('hit'); ZG.FX.burstAt && ZG.FX.burstAt(el, 'blood', 30); }
      await setTokens(st.tokens);
      el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: quick ? 'auto' : 'smooth' });
    }
    await pause(300);
    ov.querySelector('.raid-deck').classList.add('done');
    const kills = steps.filter((x) => x.res === 'kill').length;
    const last = steps[steps.length - 1];
    const end = why === 'villain' ? `Бандиты наткнулись на «${esc(ZG.card(last.c.id).name)}» и ушли.` : why === 'tokens' ? 'Жетоны кончились — банда уходит.' : steps.length ? 'Колода выпотрошена до дна.' : 'Колода пуста — грабить нечего.';
    ov.querySelector('.raid-sum').innerHTML = `${end} Колода перемешана.${kills ? ` Стрельба: шум +${kills}.` : ''}`;
    ov.querySelector('.raid-sum').classList.add('show');
    const ok = ov.querySelector('[data-ok]');
    ok.disabled = false;
    await new Promise((res) => ok.addEventListener('click', res, { once: true }));
    await UI.closeOverlay(ov);
  };

  UI.horde = async function (loc, n, attacked) {
    const i = G().M().locations.indexOf(loc);
    UI.renderBoard();
    const el = document.querySelector(`.loc[data-i="${i}"]`);
    if (el) { el.classList.add('horde-hit'); ZG.FX.burstAt(el, 'blood', 80); }
    ZG.FX.flash('red');
    ZG.FX.shake();
    ZG.Audio.sfx('braam');
    setTimeout(() => ZG.Audio.sfx('growl'), 400);
    await UI.banner(T('horde'), attacked ? `Один мертвец нападает на ${ZG.HEROES[attacked.id].acc || UI.shortName(attacked.id)} прямо сейчас${n > 1 ? `, ещё ${n - 1} — в колоду локации` : ''}` : T('horde_sub', { n, loc: ZG.LOCATIONS[loc.id].name }), 'horde bad');
  };

  /** URL картинки локации (или null) */
  UI.locArtUrl = (id) => (window.ZG_ART && window.ZG_ART.locations && window.ZG_ART.locations[id]) || null;

  /** Окно «Перекрыть путь»: решает герой h — показываем его руку, колоду, состояния и шанс */
  UI.guardAsk = function (h, l, info, opt) {
    opt = opt || {};
    return new Promise((resolve) => {
      const g = G();
      const hd = ZG.HEROES[h.id];
      const conds = Object.keys(h.conds || {}).map((k) => `<span class="cond" title="${esc(ZG.CONDS[k].text)}">${ZG.icon(ZG.CONDS[k].icon)} ${esc(ZG.CONDS[k].name)}</span>`).join('');
      const pct = Math.round(info.chance * 100);
      const art = UI.locArtUrl(l.id);
      const ov = UI.overlay(`<div class="modal panel guard-modal">
        ${art ? `<div class="guard-art" style="background-image:url('${art}')"></div>` : ''}
        <h2>${ZG.icon('hammer')} ${esc(opt.title || 'Перекрыть путь: ' + g.ldef(l).name)}</h2>
        <div class="mtext">${esc(opt.text || 'Перед боем с Угрозой можно перекрыть эту локацию, чтобы Угрозе некуда было бежать. Проверка — та же, что при заколачивании, со всеми её условиями и штрафом за провал; награда «Когда заколочено» при этом не срабатывает.')}</div>
        ${info.extra ? `<div class="mtext" style="color:var(--amber)">${esc(info.extra[0].toUpperCase() + info.extra.slice(1))}.</div>` : ''}
        <div class="guard-hero" style="--hc:${hd.color}">${UI.avatar(h.id)}
          <div><b>${esc(hd.name)}</b> <span class="muted">решает и проходит проверку</span>
          <div class="guard-stats"><span>${ZG.icon('cards')} Колода ${h.deck.length}</span><span>Сброс ${h.discard.length}</span><span>${ZG.icon('hand')} Рука ${h.hand.length}</span><span>☣ ${g.infCount(h)}/3</span>${conds ? `<span class="cond-row">${conds}</span>` : ''}</div></div></div>
        <div class="guard-check"><div><span class="muted">Проверка</span><b>${esc(info.line)}</b></div><div><span class="muted">Лучший навык</span><b>${esc(info.skill)}</b></div><div><span class="muted">Шанс без карт</span><b class="${pct >= 60 ? 'good' : pct >= 35 ? 'mid' : 'bad'}">${pct}%</b></div></div>
        <div class="sec-label">Рука — подсвечены карты, которыми можно усилить проверку</div>
        <div class="hand">${h.hand.map((c) => UI.cardHTML(c, { u: c.u, size: 'sm', cls: (info.playable || []).includes(c.u) ? 'playable' : 'unplayable' })).join('') || '<span class="muted">Рука пуста</span>'}</div>
        <div class="enc-actions"><button class="btn ghost" data-no>${esc(opt.no || 'Не перекрывать')}</button><button class="btn primary" data-ok>${esc(opt.ok || 'Перекрыть')}</button></div></div>`);
      if (UI.fitHand) requestAnimationFrame(() => UI.fitHand(ov.querySelector('.hand')));
      const done = async (v) => { await UI.closeOverlay(ov); resolve(v); };
      ov.querySelector('[data-ok]').addEventListener('click', () => done(0));
      ov.querySelector('[data-no]').addEventListener('click', () => done(1));
    });
  };

  UI.barricade = async function (loc) {
    const i = G().M().locations.indexOf(loc);
    UI.closingLoc = i;
    // окно встречи не должно закрывать заколачивание
    const encOv = document.querySelector('.enc-ov');
    if (encOv) encOv.classList.add('peek');
    UI.renderBoard();
    if (encOv) await ZG.sleep(250);
    const el = document.querySelector(`.loc[data-i="${i}"]`);
    if (el) ZG.FX.burstAt(el, 'spark', 40);
    ZG.Audio.sfx('hammer', 0.9);
    const art = UI.locArtUrl(loc.id);
    if (art) {
      const show = ZG.html(`<div class="close-show"><div class="cs-art" style="background-image:url('${art}')"><div class="cs-plank p1"></div><div class="cs-plank p2"></div><div class="cs-stamp">${esc(T('barricaded'))}</div></div><div class="cs-name">${esc(ZG.LOCATIONS[loc.id].name)}</div></div>`);
      document.body.appendChild(show);
      await ZG.sleep(2100);
      show.classList.add('out');
      await ZG.sleep(350);
      show.remove();
    } else await UI.banner(T('barricaded'), T('barricade_done', { loc: ZG.LOCATIONS[loc.id].name }), 'good');
    UI.closingLoc = null;
    if (encOv) encOv.classList.remove('peek');
  };

  UI.fxNoise = function (loc) {
    const i = G().M().locations.indexOf(loc);
    UI.renderLocs();
    const el = document.querySelector(`[data-noise="${i}"]`);
    if (el) el.classList.add('pulse');
    ZG.Audio.synth('noise');
  };

  UI.fxInfect = async function (mh, n) {
    ZG.Audio.sfx('heartbeat', 1);
    if (n >= 2) ZG.Audio.sfx('psychedelic', 0.6);
    ZG.FX.flash('toxic');
    ZG.FX.burstAt(UI.cardBox() || UI.heroAvatarEl(), 'toxic', 60);
    UI.toast(`${ZG.icon('biohazard')} ${esc(G().hname(mh))}: Инфекция ${n}/3`, 'bad');
    UI.renderParty();
    await ZG.sleep(700);
  };

  UI.fxHeal = function (mh) {
    ZG.Audio.synth('heal');
    const i = G().M().heroes.indexOf(mh);
    ZG.FX.burstAt(document.querySelector(`.pmini[data-hero="${i}"]`), 'gold', 30);
    UI.renderBoard();
  };

  UI.fxDeath = async function (mh, reason) {
    ZG.Audio.sfx('braam');
    if (reason === 'turned') setTimeout(() => ZG.Audio.sfx('growl'), 600);
    ZG.FX.flash('red');
    ZG.FX.shake();
    UI.renderBoard();
    const name = ZG.HEROES[mh.id].name;
    await UI.banner(reason === 'turned' ? 'Обращение' : 'Гибель', reason === 'turned' ? `${name} больше не человек. Теперь в этой локации бродит ещё один мертвец.` : `${name} выбился из сил. Колода иссякла.`, 'bad', true);
  };

  // нажатие на значок состояния — его название и что оно делает
  document.addEventListener('click', (e) => {
    const c = e.target.closest && e.target.closest('.hero-panel .cond[data-cond]');
    if (!c) return;
    const d = ZG.CONDS[c.dataset.cond];
    if (d) UI.toast(`${ZG.icon(d.icon)} <b>${esc(d.name)}</b>: ${esc(d.text)}`, 'bad');
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      if (UI.keyRoll && document.activeElement && document.activeElement.tagName !== 'BUTTON') { e.preventDefault(); UI.keyRoll(); }
    }
    if (!UI.waiting || UI.encPanel()) return;
    // поверх доски открыто окно (меню, правила, галерея) — горячие клавиши не действуют
    if (UI.menuOpen || document.querySelector('#overlay-root > .overlay') || (e.target && /INPUT|TEXTAREA/.test(e.target.tagName))) return;
    if (e.key === 'e' || e.key === 'у') UI.onAct('explore');
  });
})();

(function () {
  const ZG = window.ZG;
  const UI = ZG.UI;
  /** Сжать ряд карт веером, если он не помещается */
  UI.fitHand = function (el) {
    if (!el) return;
    const cards = Array.from(el.querySelectorAll(':scope > .card'));
    el.classList.remove('fanned');
    cards.forEach((c) => (c.style.marginLeft = ''));
    if (cards.length < 2 || window.innerWidth <= 900) return;
    // карты могут быть уменьшены через CSS zoom: меряем реальную ширину на экране
    const cw = cards[0].getBoundingClientRect().width;
    const z = cw / (cards[0].offsetWidth || cw) || 1;
    // в ряду помощи группа сжимается по содержимому — меряем весь ряд
    const avail = (el.closest('.help-row') || el).getBoundingClientRect().width - 16;
    const gap = 10;
    if (cards.length * (cw + gap) <= avail) return;
    const step = Math.max(cw * 0.32, (avail - cw) / (cards.length - 1));
    el.classList.add('fanned');
    cards.forEach((c, i) => { if (i) c.style.marginLeft = (step - cw) / z + 'px'; });
  };
  UI.shortName = (id) => ZG.heroShort(id);
  /* Всплывающее описание способности героя (панель внизу справа) */
  let powTip = null;
  const hidePow = () => { if (powTip) powTip.remove(); powTip = null; };
  const showPow = (chip) => {
    hidePow();
    const m = ZG.Game.M && ZG.Game.M();
    if (!m) return;
    const mh = UI.trayHero || m.heroes[m.active];
    const hd = ZG.HEROES[mh.id];
    const p = hd.powers[+chip.dataset.power];
    if (!p) return;
    powTip = ZG.html(`<div class="power-tip" style="--hc:${hd.color}"><div class="pt-head">${ZG.icon('star')} ${ZG.escape ? ZG.escape(p.name) : p.name}</div><div class="pt-text"></div><div class="pt-who">${hd.name}</div></div>`);
    powTip.querySelector('.pt-text').textContent = p.text;
    powTip.querySelector('.pt-head').lastChild.textContent = ' ' + p.name;
    powTip._chip = chip; powTip._t = Date.now();
    document.body.appendChild(powTip);
    const r = chip.getBoundingClientRect();
    const w = powTip.offsetWidth, h = powTip.offsetHeight;
    let x = r.left - w - 12;
    if (x < 8) x = Math.min(innerWidth - w - 8, r.left);
    let y = Math.max(8, Math.min(innerHeight - h - 8, r.top + r.height / 2 - h / 2));
    if (x === r.left) y = Math.max(8, r.top - h - 10);
    powTip.style.left = x + 'px'; powTip.style.top = y + 'px';
  };
  document.addEventListener('mouseover', (e) => { const c = e.target.closest && e.target.closest('.power-chip'); if (c) showPow(c); });
  document.addEventListener('mouseout', (e) => { const c = e.target.closest && e.target.closest('.power-chip'); if (c && !(e.relatedTarget && c.contains(e.relatedTarget))) hidePow(); });
  document.addEventListener('click', (e) => { const c = e.target.closest && e.target.closest('.power-chip'); if (c) { e.stopPropagation(); if (powTip && powTip._chip === c && Date.now() - powTip._t > 400) hidePow(); else if (!powTip || powTip._chip !== c) showPow(c); } else hidePow(); }, true);
  /* Чёткий просмотр карты в окнах проверки и урона: вместо масштабирования (оно размывает уменьшенные карты)
     рядом показывается крупная копия карты в полном размере. */
  /* Единый код для всей игры: окна проверки/урона, лагерь, брифинг, итоги миссии, галерея.
     Любой контейнер с атрибутом data-peek включает увеличение своих карт при наведении. */
  const PEEK_SEL = '.enc-panel .hand .card, .enc-panel .mini-hand .card, .dmg-modal .hand .card, [data-peek] .card:not(.big)';
  let peekEl = null, peekFor = null;
  const hidePeek = () => { if (peekEl) peekEl.remove(); peekEl = null; peekFor = null; };
  const findInst = (u) => {
    const m = ZG.Game.M && ZG.Game.M();
    if (!m) return null;
    for (const h of m.heroes) for (const pile of [h.hand, h.displayed || []]) { const c = pile.find((x) => x.u === u); if (c) return c; }
    return null;
  };
  document.addEventListener('mouseover', (e) => {
    if (window.innerWidth <= 900 || !window.matchMedia('(hover: hover)').matches) return;
    const el = e.target.closest && e.target.closest(PEEK_SEL);
    if (!el) { if (peekEl && !(e.target.closest && e.target.closest('.card-peek'))) hidePeek(); return; }
    if (peekFor === el) return;
    hidePeek();
    // экземпляр карты из миссии (с её состоянием), иначе — карта по id, иначе — копия самого элемента (локации)
    const inst = el.dataset.u != null ? findInst(+el.dataset.u) : null;
    let big = '';
    if (inst) big = UI.cardHTML(inst, { size: 'big' });
    else if (el.dataset.u == null && el.dataset.cid && ZG.card(el.dataset.cid)) big = UI.cardHTML(el.dataset.cid, { size: 'big' });
    else if (el.dataset.u == null && el.closest('[data-peek]')) {
      const cl = el.cloneNode(true);
      cl.classList.remove('mini', 'mid', 'small', 'out', 'selected'); cl.classList.add('big'); cl.removeAttribute('style');
      big = cl.outerHTML;
    }
    if (!big) return;
    peekFor = el;
    peekEl = ZG.html(`<div class="card-peek">${big}</div>`);
    document.body.appendChild(peekEl);
    const r = el.getBoundingClientRect();
    const W = 260, H = 372, pad = 10;
    // справа от карты, иначе слева; по вертикали — вровень с картой, в пределах экрана
    let x = r.right + 14;
    if (x + W > innerWidth - pad) x = r.left - 14 - W;
    if (x < pad) x = Math.min(innerWidth - W - pad, Math.max(pad, r.left + r.width / 2 - W / 2));
    let y = r.top + r.height / 2 - H / 2;
    y = Math.max(pad, Math.min(innerHeight - H - pad, y));
    peekEl.style.left = Math.round(x) + 'px';
    peekEl.style.top = Math.round(y) + 'px';
  });
  document.addEventListener('mousedown', hidePeek, true);
  window.addEventListener('scroll', hidePeek, true);
  window.addEventListener('resize', () => {
    const le = document.getElementById('locs'); if (le && UI.fitLocText) UI.fitLocText(le);
    document.querySelectorAll('#tray .hand, .enc-panel .mini-hand').forEach(UI.fitHand);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    // Esc отменяет выбор локации («Куда идти?»), если поверх нет окон
    const pb = document.querySelector('.pick-bar .btn');
    if (pb && !document.querySelector('#overlay-root > .overlay')) { pb.click(); return; }
    const ovs = document.querySelectorAll('#overlay-root > .overlay');
    const top = ovs[ovs.length - 1];
    if (top) {
      const x = top.querySelector('[data-x]');
      if (x) return x.click();
      if (top.querySelector('.inspect')) return top.click();
    }
    const pop = document.querySelector('.mode-pop');
    if (pop) pop.remove();
  });
})();

(function () {
  const ZG = window.ZG;
  const UI = ZG.UI;
  UI.fxCond = async function (mh, key) {
    const c = ZG.CONDS[key];
    ZG.FX.flash(key === 'poison' || key === 'decay' ? 'toxic' : 'red');
    if (key === 'terror' || key === 'decay' || key === 'doom') ZG.Audio.sfx('psychedelic');
    ZG.Audio.synth && ZG.Audio.synth('curse');
    UI.toast(`${ZG.icon(c.icon)} ${ZG.esc(ZG.Game.hname(mh))}: ${ZG.esc(c.name)}`, 'bad');
    UI.renderBoard();
    await ZG.sleep(500);
  };
})();

/* ============================== Анимации карт ============================== */
(function () {
  const ZG = window.ZG;
  const UI = ZG.UI;
  const sleep = ZG.sleep;
  const fast = () => ZG.speed < 0.2;

  const locEl = (i) => document.querySelector(`.loc[data-i="${i}"]`);
  const rectOf = (el) => {
    if (!el) return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const t = el.querySelector('.lstack') || el.querySelector('.lart') || el;
    const r = t.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  };

  /** Перелёт одной карты из точки в точку */
  UI.fly = function (from, to, o) {
    o = o || {};
    if (fast() || document.documentElement.classList.contains('no-fx')) return Promise.resolve();
    const el = document.createElement('div');
    el.className = 'fly-card ' + (o.cls || '');
    el.innerHTML = o.html || ZG.icon(o.icon || 'biohazard');
    document.body.appendChild(el);
    const dur = (o.dur || 700) * Math.max(ZG.speed, 0.4);
    const rot = o.rot != null ? o.rot : (Math.random() * 40 - 20);
    const mid = { x: (from.x + to.x) / 2 + (o.arc || 0), y: Math.min(from.y, to.y) - (o.lift != null ? o.lift : 90) };
    const kf = [
      { transform: `translate(${from.x - 27}px, ${from.y - 38}px) rotate(0deg) scale(${o.s0 || 0.6})`, opacity: 0 },
      { transform: `translate(${mid.x - 27}px, ${mid.y - 38}px) rotate(${rot / 2}deg) scale(1)`, opacity: 1, offset: 0.45 },
      { transform: `translate(${to.x - 27}px, ${to.y - 38}px) rotate(${rot}deg) scale(${o.s1 || 0.5})`, opacity: o.fadeEnd ? 0 : 0.9 },
    ];
    const a = el.animate(kf, { duration: dur, delay: (o.delay || 0) * Math.max(ZG.speed, 0.4), easing: 'cubic-bezier(.3,.7,.3,1)', fill: 'both' });
    return a.finished.then(() => el.remove()).catch(() => el.remove());
  };

  const peek = async (on) => {
    const ov = document.querySelector('.enc-ov');
    if (ov) ov.classList.toggle('peek', on);
    if (on) { UI.renderBoard(); await sleep(250); }
  };

  /** Бегство Угрозы: одинаковые рубашки разлетаются по неперекрытым локациям */
  UI.escapeAnim = async function (fromIdx, toIdxs) {
    await peek(true);
    const from = rectOf(locEl(fromIdx));
    ZG.Audio.synth && ZG.Audio.synth('flip');
    await Promise.all(toIdxs.map((t, k) => UI.fly(from, rectOf(locEl(t)), { delay: k * 160, icon: 'skull', dur: 900, lift: 140 })
      .then(() => { const e = locEl(t); if (e) { e.classList.remove('receive'); void e.offsetWidth; e.classList.add('receive'); ZG.Audio.synth && ZG.Audio.synth('click'); } })));
    await sleep(300);
    await peek(false);
  };

  /** Зачистка локации: карты вылетают из колоды и сгорают */
  UI.purgeAnim = async function (idx, n) {
    if (!n) return;
    await peek(true);
    const el = locEl(idx);
    const from = rectOf(el);
    if (el) el.classList.add('purge');
    ZG.Audio.synth && ZG.Audio.synth('curse');
    const jobs = [];
    for (let k = 0; k < Math.min(n, 10); k++) {
      const ang = (k / Math.min(n, 10)) * Math.PI * 2;
      const to = { x: from.x + Math.cos(ang) * 140, y: from.y - 60 - Math.abs(Math.sin(ang)) * 90 };
      jobs.push(UI.fly(from, to, { delay: k * 70, cls: 'burn', icon: 'fire', dur: 650, lift: 40, fadeEnd: true, s0: 0.5, s1: 0.3 })
        .then(() => ZG.FX.burst(to.x, to.y, 'spark', 12)));
    }
    await Promise.all(jobs);
    if (el) el.classList.remove('purge');
    await peek(false);
  };

  /** Карты прилетают в локацию из-за края экрана (орда, вой) */
  UI.flyIn = async function (idx, n, icon) {
    const to = rectOf(locEl(idx));
    const jobs = [];
    for (let k = 0; k < n; k++) {
      const side = Math.random() < 0.5 ? -60 : window.innerWidth + 60;
      jobs.push(UI.fly({ x: side, y: Math.random() * window.innerHeight * 0.6 + 80 }, to, { delay: k * 150, icon: icon || 'skull', dur: 800, lift: 30 }));
    }
    await Promise.all(jobs);
    const e = locEl(idx);
    if (e) { e.classList.remove('receive'); void e.offsetWidth; e.classList.add('receive'); }
  };

  /** Вожак переходит между локациями: стрелка «откуда → куда», открытая карта летит по ней, обе колоды тасуются */
  UI.moveCardAnim = async function (fromIdx, toIdx, cardId) {
    if (fast() || document.documentElement.classList.contains('no-fx')) return;
    await peek(true);
    const fe = locEl(fromIdx), te = locEl(toIdx);
    const A = rectOf(fe), B = rectOf(te);
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'move-arrow');
    svg.setAttribute('width', innerWidth); svg.setAttribute('height', innerHeight);
    const len = Math.hypot(B.x - A.x, B.y - A.y);
    const lift = Math.min(160, len * 0.35);
    const cx = (A.x + B.x) / 2, cy = Math.min(A.y, B.y) - lift;
    svg.innerHTML = `<defs><marker id="mvhead" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#e0a642"/></marker></defs>
      <path class="mv-line" d="M${A.x},${A.y} Q${cx},${cy} ${B.x},${B.y}" fill="none" stroke="#e0a642" stroke-width="4" stroke-linecap="round" stroke-dasharray="10 9" marker-end="url(#mvhead)"/>`;
    document.body.appendChild(svg);
    const path = svg.querySelector(".mv-line");
    const plen = path.getTotalLength();
    const sp = Math.max(ZG.speed, 0.4);
    path.animate([{ strokeDashoffset: plen, opacity: 0 }, { strokeDashoffset: 0, opacity: 1 }], { duration: 450 * sp, easing: 'ease-out', fill: 'both' });
    [fe, te].forEach((e) => { if (e) e.classList.add('mv-mark'); });
    await sleep(380 * sp);
    // открытая карта: поднимается из колоды, переворачивается лицом вверх и летит по стрелке
    const card = ZG.html(`<div class="move-card">${UI.cardHTML(cardId, { size: 'mini' })}</div>`);
    document.body.appendChild(card);
    const W = 112, H = 160;
    const pts = [0, 0.25, 0.5, 0.75, 1].map((t) => { const q = path.getPointAtLength(plen * t); return { x: q.x - W / 2, y: q.y - H / 2 }; });
    const a1 = card.animate([
      { transform: `translate(${pts[0].x}px, ${pts[0].y + 20}px) scale(.4) rotateY(90deg)`, opacity: 0 },
      { transform: `translate(${pts[0].x}px, ${pts[0].y - 30}px) scale(1) rotateY(0deg)`, opacity: 1 },
    ], { duration: 420 * sp, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'forwards' });
    await a1.finished.catch(() => {});
    await sleep(380 * sp);
    const a2 = card.animate([
      { transform: `translate(${pts[0].x}px, ${pts[0].y - 30}px) rotate(0deg)` },
      { transform: `translate(${pts[1].x}px, ${pts[1].y - 20}px) rotate(-5deg)` },
      { transform: `translate(${pts[2].x}px, ${pts[2].y - 10}px) rotate(-2deg)` },
      { transform: `translate(${pts[3].x}px, ${pts[3].y - 5}px) rotate(3deg)` },
      { transform: `translate(${pts[4].x}px, ${pts[4].y - 30}px) rotate(0deg)` },
    ], { duration: 900 * sp, easing: 'cubic-bezier(.45,.05,.4,1)', fill: 'forwards' });
    await a2.finished.catch(() => {});
    await sleep(250 * sp);
    const a3 = card.animate([
      { transform: `translate(${pts[4].x}px, ${pts[4].y - 30}px) scale(1)`, opacity: 1 },
      { transform: `translate(${pts[4].x}px, ${pts[4].y + 10}px) scale(.35)`, opacity: 0 },
    ], { duration: 380 * sp, easing: 'ease-in', fill: 'forwards' });
    await a3.finished.catch(() => {});
    card.remove();
    // обе колоды перетасовываются
    [fe, te].forEach((e) => { if (!e) return; e.classList.remove('mv-mark', 'shuffle'); void e.offsetWidth; e.classList.add('shuffle'); });
    ZG.Audio.synth && ZG.Audio.synth('flip');
    svg.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400 * sp, fill: 'forwards' });
    await sleep(600 * sp);
    svg.remove();
    [fe, te].forEach((e) => e && e.classList.remove('shuffle'));
    await peek(false);
  };

  /** Карта переходит из одной локации в другую */
  UI.flyBetween = async function (fromIdx, toIdx, icon) {
    await peek(true);
    await UI.fly(rectOf(locEl(fromIdx)), rectOf(locEl(toIdx)), { icon: icon || 'ghost', dur: 900, lift: 120 });
    const e = locEl(toIdx);
    if (e) { e.classList.remove('receive'); void e.offsetWidth; e.classList.add('receive'); }
    await peek(false);
  };
})();
