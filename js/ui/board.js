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
    const app = document.getElementById('app');
    app.innerHTML = `<div class="board screen" id="board">
      <div class="topbar" id="topbar"></div>
      <div class="locs" id="locs"></div>
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
    const def = G().def();
    const left = m.clock.length - m.clockPos;
    const night = m.phase === 'night' && m.turn > 0;
    const nextPhaseIn = 5 - ((Math.max(1, m.clockPos) - 1) % 5) - 1;
    document.getElementById('topbar').innerHTML = `
      <div class="mtitle"><small>Миссия ${def.num} · ${esc(def.place)}</small>${esc(def.name)}</div>
      <div class="spacer"></div>
      <div class="clockw ${night ? 'night' : ''} ${left <= 5 ? 'low' : ''}" title="Карты Часов: осталось ${left}. Смена дня и ночи через ${nextPhaseIn + 1} ${ZG.plural(nextPhaseIn + 1, 'ход', 'хода', 'ходов')}.">
        <div class="phase">${ZG.icon(night ? 'moon' : 'sun')}</div>
        <div><div class="cnum">${left}</div></div>
        <div><div class="clab">${night ? T('night') : T('day')} · ${T('turns_left')}</div><div class="clockbar"><i style="width:${(left / m.clock.length) * 100}%"></i></div></div>
      </div>
      <button class="btn icon ghost" data-act="rules" title="${T('rules')}">${ZG.icon('book')}</button>
      <button class="btn icon ghost" data-act="menu" title="Меню">${ZG.icon('menu')}</button>`;
  };

  UI.renderLocs = function () {
    const m = G().M();
    const active = m.heroes[m.active];
    const html = m.locations.map((l, i) => {
      const ld = ZG.LOCATIONS[l.id];
      const heroes = m.heroes.filter((h) => h.loc === i);
      const segs = Array.from({ length: l.limit }, (_, k) => `<i class="${k < l.noise ? 'on' : ''} ${k < l.noise && l.noise >= l.limit - 1 ? 'hot' : ''}"></i>`).join('');
      const rules = ZG.locationRules(ld).map((t) => `<div class="lrule">${esc(t)}</div>`).join('');
      const pick = UI.pickMode && UI.pickMode.indices.includes(i);
      return `<div class="loc ${l.closed ? 'closed' : ''} ${active && active.loc === i ? 'here' : ''} ${pick ? 'pickable' : ''} ${UI.closingLoc === i ? 'closing' : ''}" data-i="${i}" style="--hc:${active ? ZG.HEROES[active.id].color : ''}">
        <div class="lart">${ZG.art('locations', ld.id, ld.icon)}
          ${l.closed ? '' : `<div class="lstack" title="Карт в колоде локации">${ZG.icon('cards')} ${l.deck.length}</div>`}</div>
        ${l.closed ? '<div class="planks"><div class="plank p1"></div><div class="plank p2"></div></div>' : ''}
        <div class="lbody">
          <h3>${esc(ld.name)}</h3>
          ${l.closed ? `<span class="shelter-tag">${ZG.icon('tent')} ${T('barricaded')} · ${T('shelter')}</span>` : `
          <div class="noise-meter" data-noise="${i}" title="Шум ${l.noise} из ${l.limit}. При пороге приходит орда.">${ZG.icon('noise')}<div class="segs">${segs}</div><span>${l.noise}/${l.limit}</span></div>
          ${rules}
          <div class="lclose">${ZG.icon('hammer')} ${esc(ZG.cardCheckLineClose(l))}</div>
          ${l.deck.length === 0 ? `<div class="lrule" style="color:var(--amber)">${T('empty_loc')} — можно заколотить</div>` : ''}`}
          <div class="ltokens">${heroes.map((h) => UI.avatar(h.id, (h === active ? 'active ' : '') + (h.dead ? 'dead' : ''))).join('')}</div>
        </div>
      </div>`;
    }).join('');
    document.getElementById('locs').innerHTML = html;
  };

  UI.renderParty = function () {
    const m = G().M();
    document.getElementById('party').innerHTML = m.heroes.map((h, i) => {
      const hd = ZG.HEROES[h.id];
      const inf = G().infCount(h);
      const loc = ZG.LOCATIONS[m.locations[h.loc].id];
      return `<div class="pmini ${i === m.active ? 'active' : ''} ${h.dead ? 'dead' : ''}" data-hero="${i}">
        ${UI.avatar(h.id, h.dead ? 'dead' : '')}
        <div class="pinfo"><div class="pname">${esc(hd.name)}</div>
        <div class="pstats">${h.dead ? (h.turned ? 'Обращение' : 'Гибель') : `<span title="${T('deck')}">${ZG.icon('cards')} ${h.deck.length}</span><span title="${T('hand')}">${ZG.icon('hand')} ${h.hand.length}</span><span class="inf-pips" title="${T('infection')} ${inf}/3">${[0, 1, 2].map((k) => `<i class="${k < inf ? 'on' : ''}"></i>`).join('')}</span><span title="Локация">${ZG.icon('mappin')} ${esc(loc.name)}</span>`}</div></div>
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
    const mh = m.heroes[m.active];
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
    const hs = G().handSize(ph);
    const dis = (k) => (!w || !w[k] ? 'disabled' : '');
    const ts = m.ts || {};
    let hint = '';
    if (w) {
      if (w.explore) hint = 'Исследуйте локацию или сыграйте карту действия.';
      else if (w.close) hint = 'Локация обыскана — заколотите её!';
      else if (w.rest) hint = 'Вы в убежище: можно отдохнуть.';
      else hint = 'Можно завершить ход.';
    }
    tray.innerHTML = `
      <div class="hero-panel" style="--hc:${hd.color}">
        <div class="hp-top">${UI.avatar(mh.id)}<div><div class="hp-name">${esc(hd.name)}</div><div class="hp-role">${esc(hd.role)}</div></div></div>
        ${UI.statsHTML(ph)}
        <div class="piles">
          <div class="pile ${mh.deck.length <= 2 ? 'warn' : ''}" title="Колода — это здоровье"><b>${mh.deck.length}</b>${T('deck')}</div>
          <div class="pile"><b>${mh.discard.length}</b>${T('discard')}</div>
          <div class="pile inf" title="Три Инфекции — обращение"><b>${inf}/3</b>☣</div>
        </div>
      </div>
      <div class="hand-wrap">
        <div class="hand-label"><span>${T('hand')} · ${mh.hand.length}/${hs}</span><span>${esc(hd.powers.map((p) => p.name).join(' · '))}</span></div>
        <div class="hand">${hand || '<div class="muted" style="padding:30px">Рука пуста</div>'}</div>
      </div>
      <div class="actions">
        <button class="btn" data-act="move" ${dis('move')}>${ZG.icon('footprints')} ${T('act_move')}</button>
        <button class="btn primary ${w && w.explore ? 'pulse' : ''}" data-act="explore" ${dis('explore')}>${ZG.icon('search')} ${T('act_explore')}${ts.explores > 1 ? ' ×' + ts.explores : ''}</button>
        ${w && w.close ? `<button class="btn primary pulse wide" data-act="close">${ZG.icon('hammer')} ${T('act_close')}</button>` : ''}
        ${w && w.rest ? `<button class="btn good wide" data-act="rest">${ZG.icon('tent')} ${T('act_rest')} (+2)</button>` : ''}
        ${mh.id === 'ten' ? `<button class="btn" data-act="scout" ${dis('scout')}>${ZG.icon('eye')} ${T('act_scout')}</button>` : ''}
        ${mh.id === 'marina' ? `<button class="btn" data-act="fieldmed" ${dis('fieldmed')}>${ZG.icon('cross')} Медицина</button>` : ''}
        <button class="btn" data-act="give" ${dis('give')}>${ZG.icon('swap')} ${T('act_give')}</button>
        <button class="btn ${w && !w.explore && !w.close ? 'pulse' : ''} ${mh.id === 'ten' || mh.id === 'marina' ? '' : 'wide'}" data-act="end" ${w ? '' : 'disabled'}>${ZG.icon('next')} ${T('act_end')}</button>
        <div class="hint">${esc(hint)}</div>
      </div>`;
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
    if (act === 'menu') return UI.gameMenu();
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
  UI.modePop = function (anchor, opts) {
    return new Promise((resolve) => {
      document.querySelectorAll('.mode-pop').forEach((x) => x.remove());
      const el = ZG.html(`<div class="mode-pop panel">${opts.map((o, i) => `<button class="choice" data-i="${i}"><b>${esc(o.label)}</b>${o.sub ? `<span>${esc(o.sub)}</span>` : ''}</button>`).join('')}</div>`);
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
      el.querySelectorAll('.choice').forEach((b) => b.addEventListener('click', () => done(opts[+b.dataset.i].pi)));
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
      const bar = ZG.html(`<div class="tip panel" style="bottom:auto;top:70px;left:50%;right:auto;transform:translateX(-50%)"><h4>${ZG.icon('mappin')} ${esc(title)}</h4><p>Выберите подсвеченную локацию.</p><div class="row"><span></span><button class="btn small ghost">${T('act_cancel')}</button></div></div>`);
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
      const el = ZG.html(`<div class="handoff" style="--hc:${hd.color}"><div class="k">${T('handoff')}</div>${UI.avatar(mh.id)}<h1>${esc(hd.name)}</h1><div class="role">${esc(hd.role)}</div><button class="btn primary" style="min-width:220px">${T('handoff_ready')}</button></div>`);
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
    card.style.animationDuration = ((ev ? 2.1 : 1.2) * Math.max(ZG.speed, 0.25)) + 's';
    document.body.appendChild(el);
    await ZG.sleep(ev ? 2100 : 1200);
    el.remove();
    if (phaseChanged) {
      const night = m.phase === 'night';
      ZG.FX.setNight(night);
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
      const el = UI.overlay(`<div class="encounter"><div class="enc-card drop">${cardHtml}<div class="enc-hero">${UI.avatar(mh.id)} ${esc(hd.name.split(' ')[0])}</div></div><div class="enc-panel panel">${head}</div></div>`, 'enc-ov');
      UI.enc = { el, depth: 1 };
    }
    await ZG.sleep(280);
    const fl = UI.enc.el.querySelector('.card-flipper');
    if (fl) fl.classList.remove('down');
    await ZG.sleep(650);
    const cardEl = UI.enc.el.querySelector('.enc-card .card');
    if (d.type === 'boss') { ZG.FX.flash('red'); ZG.FX.shake(); ZG.FX.burstAt(cardEl, 'blood', 70); }
    else if (ZG.isEnemy(d)) ZG.FX.burstAt(cardEl, 'blood', 22);
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
  UI.fxLoot = function () {
    const b = UI.cardBox();
    if (!b) return;
    b.classList.add('acquired');
    ZG.FX.burstAt(b, 'gold', 60);
    ZG.FX.flash('green');
  };
  UI.fxLost = function () {
    const b = UI.cardBox();
    if (b) b.classList.add('lost');
  };

  /* ============================== Проверка ============================== */
  const KIND_LABEL = { combat: 'check_combat', acquire: 'check_acquire', event: 'check_event', close: 'check_close', evade: 'act_scout' };

  UI.check = function (ctx) {
    return new Promise((resolve) => {
      let panel = UI.encPanel();
      let own = null;
      if (!panel) {
        const loc = G().loc(ctx.mh);
        own = UI.overlay(`<div class="encounter"><div class="enc-card drop">${ctx.check.kind === 'close' ? UI.locCardHTML(loc) : ctx.check.cardId ? UI.cardHTML(ctx.check.cardId, { size: 'big' }) : UI.locCardHTML(loc)}</div><div class="enc-panel panel"></div></div>`, 'enc-ov');
        panel = own.querySelector('.enc-panel');
      }
      const st = { rolled: false };
      const render = () => UI.renderCheck(panel, ctx, st, finish);
      const finish = async (res) => {
        if (own) await UI.closeOverlay(own);
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
    const slotTypes = ['weapon', 'item', 'consumable', 'ally', 'resolve'];
    const slots = slotTypes.map((t) => {
      const p = ctx.played.find((x) => ZG.card(x.id).type === t);
      if (!p) return `<div class="slotbox">${T('slot_' + t)}</div>`;
      const owner = m.heroes.find((h) => h.id === p.owner);
      return `<div class="slotbox filled" data-unplay="${p.u}" title="Убрать"><span class="sl-name">${esc(ZG.card(p.id).name)}</span>${T('mode_' + g.playDef(p).mode)}${owner !== mh ? ' · ' + esc(g.hname(owner)) : ''}</div>`;
    }).join('');
    const dice = pool.dice.map((x) => `<div class="die ${x.d}"><span>${T('die')}${ZG.sides(x.d)}</span><small>${esc(x.src.slice(0, 12))}</small></div>`).join('');
    const pct = Math.round(pool.chance * 100);
    const handCards = (owner) => owner.hand.map((c) => {
      const d = ZG.card(c.id);
      const okPis = (d.plays || []).map((p, pi) => (g.canPlay(ctx, owner, c, pi) ? pi : -1)).filter((x) => x >= 0);
      const inPool = ctx.played.some((p) => p.u === c.u);
      const badge = okPis.length ? okPis.map((pi) => playBadge(d.plays[pi])).join(' / ') : '';
      if (owner !== mh && !inPool && !okPis.length) return '';
      return UI.cardHTML(c, { u: c.u, size: 'sm', cls: inPool ? 'inpool' : okPis.length ? 'playable' : 'unplayable', badge: inPool ? 'в проверке' : badge });
    }).join('');
    const helpers = m.heroes.filter((h) => h !== mh && !h.dead && h.loc === mh.loc && h.hand.some((c) => (ZG.card(c.id).plays || []).some((p, pi) => g.canPlay(ctx, h, c, pi) || ctx.played.some((x) => x.u === c.u))));
    const helpHtml = helpers.map((h) => `<div class="sec-label">${UI.avatar(h.id)} ${T('help_cards')}: ${esc(g.hname(h))}</div><div class="mini-hand" data-owner="${h.id}">${handCards(h)}</div>`).join('');

    panel.innerHTML = `
      <div class="sub">${esc(hd.name)} · ${T(KIND_LABEL[ck.kind] || 'check')}</div>
      <h2>${esc(ck.title)}</h2>
      <div class="dc-box"><div class="dc-big"><b>${ck.dc}</b><span>${T('dc')}</span></div>
        <div class="dc-mods"><div>База: ${ck.base != null ? ck.base : ck.dc}</div>${modsHtml}${pool.parts.map((p) => `<div class="${p.v < 0 ? 'm-up' : 'm-down'}">${esc(p.label)}: ${p.v > 0 ? '+' : ''}${p.v}</div>`).join('')}</div></div>
      <div class="sec-label">${T('skill_use')}</div>
      <div class="skill-chips">${chips}</div>
      <div class="slots-row">${slots}</div>
      <div class="pool-row" id="pool-row"><div class="dice" id="dice">${dice}</div>
        <div class="pool-sum">${pool.noise ? `<span style="color:var(--amber)">${ZG.icon('noise')} ${T('noise_add')} +${pool.noise}</span>` : `<span>${ZG.icon('noise')} тихо</span>`}<b>${ZG.diceStr(pool.dice.map((x) => x.d), pool.bonus)}</b>≈ ${pool.avg.toFixed(1)}</div></div>
      <div class="chance-lab"><span>Шанс успеха</span><span>${pct}%</span></div><div class="chance"><i style="width:${pct}%"></i></div>
      <div id="check-bottom">
        <div class="sec-label">${T('your_cards')}</div>
        <div class="mini-hand" data-owner="${mh.id}">${handCards(mh) || `<span class="muted">${T('no_cards')}</span>`}</div>
        ${helpHtml}
        <div class="enc-actions"><button class="btn primary pulse" data-roll>${ZG.icon('dice')} ${T('roll')}</button></div>
      </div>`;

    panel.querySelectorAll('[data-skill]').forEach((el) => el.addEventListener('click', () => {
      ctx.skill = el.dataset.skill;
      g.pruneCtx(ctx);
      st.render();
    }));
    panel.querySelectorAll('[data-unplay]').forEach((el) => el.addEventListener('click', () => {
      ctx.played = ctx.played.filter((p) => p.u !== +el.dataset.unplay);
      g.pruneCtx(ctx);
      st.render();
    }));
    panel.querySelectorAll('.mini-hand').forEach((row) => {
      const owner = m.heroes.find((h) => h.id === row.dataset.owner);
      row.querySelectorAll('.card').forEach((el) => el.addEventListener('click', async () => {
        const u = +el.dataset.u;
        if (ctx.played.some((p) => p.u === u)) {
          ctx.played = ctx.played.filter((p) => p.u !== u);
          g.pruneCtx(ctx);
          return st.render();
        }
        const c = owner.hand.find((x) => x.u === u);
        const d = ZG.card(c.id);
        const pis = (d.plays || []).map((p, pi) => (g.canPlay(ctx, owner, c, pi) ? pi : -1)).filter((x) => x >= 0);
        if (!pis.length) return UI.inspect(c);
        let pi = pis[0];
        if (pis.length > 1) {
          pi = await UI.modePop(el, pis.map((k) => ({ label: T('mode_' + d.plays[k].mode) + ' · ' + playBadge(d.plays[k]), sub: ZG.playText(d.plays[k]), pi: k })));
          if (pi == null) return;
        }
        ctx.played.push({ owner: owner.id, u, id: c.id, pi });
        g.pruneCtx(ctx);
        st.render();
      }));
    });
    panel.querySelector('[data-roll]').addEventListener('click', () => UI.doRoll(panel, ctx, finish));
    UI.keyRoll = () => { const b = panel.querySelector('[data-roll]'); if (b) b.click(); };
  };

  UI.doRoll = async function (panel, ctx, finish) {
    UI.keyRoll = null;
    const res = G().rollCheck(ctx);
    panel.querySelectorAll('[data-skill],[data-unplay]').forEach((el) => (el.style.pointerEvents = 'none'));
    const bottom = panel.querySelector('#check-bottom');
    bottom.innerHTML = `<div class="total-line">${T('rolling')}</div>`;
    const diceEl = panel.querySelector('#dice');
    diceEl.innerHTML = res.rolls.map((r) => `<div class="die ${r.d} rolling"><span>?</span><small>${esc(r.src.slice(0, 12))}</small></div>`).join('');
    const els = Array.from(diceEl.querySelectorAll('.die'));
    let spin = true;
    (async () => {
      while (spin) {
        els.forEach((e, i) => { if (e.classList.contains('rolling')) e.querySelector('span').textContent = 1 + Math.floor(Math.random() * ZG.sides(res.rolls[i].d)); });
        await new Promise((r) => setTimeout(r, 60));
      }
    })();
    await ZG.sleep(700);
    let run = res.pool.bonus;
    for (let i = 0; i < els.length; i++) {
      const e = els[i];
      e.classList.remove('rolling');
      e.classList.add('landed');
      e.querySelector('span').textContent = res.rolls[i].v;
      if (res.rolls[i].v === ZG.sides(res.rolls[i].d)) { e.classList.add('max'); ZG.FX.burstAt(e, 'spark', 14); }
      run += res.rolls[i].v;
      bottom.querySelector('.total-line').innerHTML = `Итого: <b>${run}</b> против ${res.dc}`;
      await ZG.sleep(180);
    }
    spin = false;
    await ZG.sleep(250);
    const ok = res.success;
    bottom.innerHTML = `<div class="result-banner ${ok ? 'ok' : 'bad'}">${ok ? T('success') : T('fail')}</div>
      <div class="total-line">${res.rolls.map((r) => r.v).join(' + ')}${res.pool.bonus ? (res.pool.bonus > 0 ? ' + ' : ' − ') + Math.abs(res.pool.bonus) : ''} = <b>${res.total}</b> против ${res.dc}${ok ? '' : ` · разница ${res.dc - res.total}`}</div>
      <div class="enc-actions"><button class="btn ${ok ? 'good' : 'primary'}" data-cont>${T('continue')}</button></div>`;
    if (ok) { ZG.FX.flash('green'); ZG.FX.burstAt(panel.querySelector('.result-banner'), 'gold', 40); }
    else { ZG.FX.flash('red'); ZG.FX.shake(UI.cardBox() || undefined); }
    const btn = bottom.querySelector('[data-cont]');
    UI.keyRoll = () => btn.click();
    btn.addEventListener('click', () => {
      UI.keyRoll = null;
      finish(res);
    });
    if (ZG.params.get('fast')) btn.focus();
  };

  /* ============================== Урон ============================== */
  UI.damage = function (mh, n, opts) {
    return new Promise((resolve) => {
      const g = G();
      const plays = [];
      const sel = new Set();
      ZG.FX.flash('red');
      ZG.FX.shake();
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
        const need = g.damageNeeded(mh, n, plays);
        // убрать лишние выделения
        while (sel.size > need) sel.delete([...sel].pop());
        const usedU = new Set(plays.map((p) => p.u));
        const cards = mh.hand.map((c) => {
          const d = ZG.card(c.id);
          const red = (d.plays || []).map((p, pi) => (p.on === 'damage' && !usedU.has(c.u) && !plays.some((x) => ZG.card(x.id).type === d.type) ? pi : -1)).filter((x) => x >= 0);
          const used = usedU.has(c.u);
          const badge = used ? 'защита' : red.length ? 'Защита' : '';
          return UI.cardHTML(c, { u: c.u, cls: `${used ? 'inpool' : ''} ${red.length ? 'playable' : ''} ${sel.has(c.u) ? 'selected' : ''}`, badge });
        }).join('');
        const reduced = plays.length ? `<div class="muted">Защита: ${plays.map((p) => esc(ZG.card(p.id).name)).join(', ')}</div>` : '';
        panel.innerHTML = `<div class="dmg-head"><div class="dmg-num">−${n}</div><div><h2>${T('dmg_title')}: ${esc(hd.name.split(' ')[0])}</h2><div class="mtext" style="margin:0">${opts.source ? esc(opts.source) + '. ' : ''}${opts.bite ? '<span style="color:var(--toxic)">Укус: если урон пройдёт — Инфекция.</span> ' : ''}</div>${reduced}</div></div>
          <div class="mtext" style="margin-top:10px">${need ? `Выберите ${need} ${ZG.plural(need, 'карту', 'карты', 'карт')} для сброса. Карты с защитой можно сыграть, нажав на них.` : T('dmg_none')}</div>
          <div class="hand">${cards || '<span class="muted">Рука пуста</span>'}</div>
          <div class="enc-actions" style="align-items:center;margin-top:8px"><span class="muted">${T('dmg_choose', { a: sel.size, b: need })}</span><button class="btn primary" data-ok ${sel.size === need ? '' : 'disabled'}>${T('dmg_accept')}</button></div>`;
        panel.querySelectorAll('.hand .card').forEach((el) => el.addEventListener('click', async () => {
          const u = +el.dataset.u;
          const c = mh.hand.find((x) => x.u === u);
          const d = ZG.card(c.id);
          if (usedU.has(u)) {
            const i = plays.findIndex((p) => p.u === u);
            plays.splice(i, 1);
            return render();
          }
          const red = (d.plays || []).map((p, pi) => (p.on === 'damage' ? pi : -1)).filter((x) => x >= 0);
          if (red.length && !plays.some((x) => ZG.card(x.id).type === d.type) && !sel.has(u)) {
            const opts2 = red.map((pi) => ({ label: T('mode_' + d.plays[pi].mode), sub: ZG.playText(d.plays[pi]), pi }));
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
          else if (sel.size < g.damageNeeded(mh, n, plays)) sel.add(u);
          render();
        }));
        panel.querySelector('[data-ok]').addEventListener('click', done);
      };
      ZG.FX.burstAt(document.querySelector('.hero-panel .avatar'), 'blood', 50);
      // если защититься нечем и выбора нет — авто
      const anyRed = mh.hand.some((c) => (ZG.card(c.id).plays || []).some((p) => p.on === 'damage'));
      if (!anyRed && mh.hand.length <= n) {
        mh.hand.forEach((c) => sel.add(c.u));
        render();
        return;
      }
      render();
    });
  };

  /* ============================== Эффекты событий ============================== */
  UI.horde = async function (loc, n) {
    const i = G().M().locations.indexOf(loc);
    UI.renderBoard();
    const el = document.querySelector(`.loc[data-i="${i}"]`);
    if (el) { el.classList.add('horde-hit'); ZG.FX.burstAt(el, 'blood', 80); }
    ZG.FX.flash('red');
    ZG.FX.shake();
    await UI.banner(T('horde'), T('horde_sub', { n, loc: ZG.LOCATIONS[loc.id].name }), 'horde bad');
  };

  UI.barricade = async function (loc) {
    const i = G().M().locations.indexOf(loc);
    UI.closingLoc = i;
    UI.renderBoard();
    const el = document.querySelector(`.loc[data-i="${i}"]`);
    if (el) ZG.FX.burstAt(el, 'spark', 40);
    await UI.banner(T('barricaded'), T('barricade_done', { loc: ZG.LOCATIONS[loc.id].name }), 'good');
    UI.closingLoc = null;
  };

  UI.fxNoise = function (loc) {
    const i = G().M().locations.indexOf(loc);
    UI.renderLocs();
    const el = document.querySelector(`[data-noise="${i}"]`);
    if (el) el.classList.add('pulse');
  };

  UI.fxInfect = async function (mh, n) {
    ZG.FX.flash('toxic');
    ZG.FX.burstAt(UI.cardBox() || document.querySelector('.hero-panel .avatar'), 'toxic', 60);
    UI.toast(`${ZG.icon('biohazard')} ${esc(G().hname(mh))}: Инфекция ${n}/3`, 'bad');
    UI.renderParty();
    await ZG.sleep(700);
  };

  UI.fxHeal = function (mh) {
    const i = G().M().heroes.indexOf(mh);
    ZG.FX.burstAt(document.querySelector(`.pmini[data-hero="${i}"]`), 'gold', 30);
    UI.renderBoard();
  };

  UI.fxDeath = async function (mh, reason) {
    ZG.FX.flash('red');
    ZG.FX.shake();
    UI.renderBoard();
    const name = ZG.HEROES[mh.id].name;
    await UI.banner(reason === 'turned' ? 'Обращение' : 'Гибель', reason === 'turned' ? `${name} больше не человек. Теперь в этой локации бродит ещё один мертвец.` : `${name} выбился из сил. Колода иссякла.`, 'bad', true);
  };

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      if (UI.keyRoll && document.activeElement && document.activeElement.tagName !== 'BUTTON') { e.preventDefault(); UI.keyRoll(); }
    }
    if (!UI.waiting || UI.encPanel()) return;
    if (e.key === 'e' || e.key === 'у') UI.onAct('explore');
  });
})();
