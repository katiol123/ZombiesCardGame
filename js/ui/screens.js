/* Экраны: меню, слоты, отряд, карта кампании, брифинг, итоги, лагерь, правила, настройки */
(function () {
  'use strict';
  const ZG = window.ZG;
  const T = ZG.T;
  const esc = ZG.esc;
  const UI = ZG.UI;
  const G = () => ZG.Game;

  const app = () => document.getElementById('app');
  const show = (html) => {
    document.querySelectorAll('.banner,.tip,.mode-pop,.handoff,.clock-flip').forEach((x) => x.remove());
    document.getElementById('overlay-root').innerHTML = '';
    app().innerHTML = html;
    return app().firstElementChild;
  };
  const go = (fn) => ZG.FX.transition(fn);

  /* ============================== Главное меню ============================== */
  UI.showTitle = function () {
    ZG.FX.setNight(false);
    ZG.Audio.music('shelter');
    const last = ZG.Save.lastSlot();
    const s = show(`<div class="screen title-screen">
      <svg class="blood-drip" viewBox="0 0 1200 90" preserveAspectRatio="none"><path fill="#5a0b07" d="M0 0h1200v18c-30 0-30 40-45 40s-10-30-40-30-20 60-38 60-12-50-40-50-30 22-60 22-25-14-55-14-20 44-42 44-18-38-48-38-40 20-70 20S740 30 710 30s-20 52-40 52-22-60-50-60-30 18-60 18-25-10-48-10-15 34-38 34-24-30-50-30-30 12-60 12S330 26 300 26s-18 40-42 40-20-46-50-46-30 20-55 20S120 22 92 22 60 48 40 48 20 20 0 20z"/></svg>
      <h1 class="logo">ПОСЛЕДНИЙ <span class="accent">РУБЕЖ</span></h1>
      <div class="subtitle">${T('gameSubtitle')}</div>
      <p class="tagline flavor">${T('tagline')}</p>
      <div class="menu">
        ${last != null ? `<button class="btn primary" data-a="continue">${ZG.icon('next')} ${T('menu_continue')}</button>` : ''}
        <button class="btn ${last == null ? 'primary' : ''}" data-a="new">${ZG.icon('skull')} ${T('menu_new')}</button>
        <button class="btn" data-a="slots">${ZG.icon('save')} ${T('menu_load')}</button>
        <button class="btn" data-a="rules">${ZG.icon('book')} ${T('menu_rules')}</button>
        <button class="btn" data-a="settings">${ZG.icon('gear')} ${T('menu_settings')}</button>
      </div>
      <div class="version">v1.0 · соло и хот-сит, 1–4 героя</div>
    </div>`);
    s.querySelectorAll('[data-a]').forEach((b) => b.addEventListener('click', () => {
      const a = b.dataset.a;
      if (a === 'continue') UI.resume(last);
      if (a === 'new') go(() => UI.showSlots('new'));
      if (a === 'slots') go(() => UI.showSlots('load'));
      if (a === 'rules') UI.showRules();
      if (a === 'settings') UI.showSettings();
    }));
  };

  UI.resume = function (slot) {
    const S = ZG.Save.load(slot);
    if (!S) return UI.showTitle();
    go(() => {
      if (S.mission) { G().run(); return; } // не ждём всю миссию — иначе затемнение висит
      if (S.screen === 'result' && S.lastResult) return UI.showResult();
      if (S.screen === 'camp') return UI.showCamp();
      return UI.showMap();
    });
  };

  /* ============================== Слоты ============================== */
  UI.showSlots = function (mode) {
    ZG.Audio.music('shelter');
    const rows = [];
    for (let i = 0; i < ZG.Save.SLOTS; i++) {
      const s = ZG.Save.read(i);
      const sm = ZG.Save.summary(s);
      rows.push(`<div class="slot panel" data-i="${i}">
        <div class="slot-num">${i + 1}</div>
        <div class="slot-info">${sm ? `<b>${esc(sm.mission)}</b><span class="progress-dots">${ZG.MISSIONS.map((_, k) => `<i class="${k < sm.done ? 'on' : ''}"></i>`).join('')}</span><br><span class="muted">${esc(sm.names)} · ${esc(sm.date)}${sm.inMission ? ' · в миссии' : ''}</span>` : `<b class="muted">${T('slot_empty')}</b>`}</div>
        <div class="slot-actions">
          ${mode === 'new' ? `<button class="btn primary small" data-a="new">${T('slot_new_here')}</button>` : ''}
          ${sm && mode !== 'new' ? `<button class="btn primary small" data-a="load">${T('slot_load')}</button>` : ''}
          ${sm ? `<button class="btn small" data-a="export" title="Сохранить кампанию в файл">${ZG.icon('download')} ${T('slot_export')}</button>` : ''}
          <button class="btn small" data-a="import" title="Загрузить кампанию из файла">${ZG.icon('upload')} Импорт</button>
          ${sm ? `<button class="btn small ghost" data-a="del" title="${T('slot_delete')}">${ZG.icon('trash')}</button>` : ''}
        </div></div>`);
    }
    const s = show(`<div class="screen"><div class="page">
      <div class="page-head"><button class="btn icon ghost" data-back>${ZG.icon('x')}</button><h1>${mode === 'new' ? 'Где начать кампанию?' : T('slots_title')}</h1></div>
      <div class="slots">${rows.join('')}</div>
      <p class="muted" style="margin-top:18px">${T('save_note')} Экспорт сохраняет кампанию в JSON-файл — так её можно перенести на другое устройство.</p>
      <input type="file" accept=".json,application/json" hidden id="imp">
    </div></div>`);
    s.querySelector('[data-back]').addEventListener('click', () => go(UI.showTitle));
    const imp = s.querySelector('#imp');
    let impSlot = 0;
    imp.addEventListener('change', async () => {
      const f = imp.files[0];
      if (!f) return;
      const txt = await f.text();
      if (ZG.Save.importInto(impSlot, txt)) { UI.toast(T('slot_imported'), 'loot'); UI.showSlots(mode); }
      else UI.alert('Ошибка', T('slot_import_bad'));
    });
    s.querySelectorAll('.slot').forEach((row) => {
      const i = +row.dataset.i;
      row.querySelectorAll('[data-a]').forEach((b) => b.addEventListener('click', async () => {
        const a = b.dataset.a;
        if (a === 'new') {
          if (ZG.Save.read(i) && !(await UI.confirm('Перезапись', T('slot_confirm_overwrite')))) return;
          go(() => UI.showParty(i));
        }
        if (a === 'load') UI.resume(i);
        if (a === 'export') ZG.Save.exportSlot(i);
        if (a === 'import') { impSlot = i; imp.click(); }
        if (a === 'del' && (await UI.confirm(T('slot_delete'), T('slot_confirm_delete')))) { ZG.Save.remove(i); UI.showSlots(mode); }
      }));
    });
  };

  /* ============================== Выбор отряда ============================== */
  UI.showParty = function (slot) {
    const sel = new Set(['marina', 'grom']);
    let diff = 'normal';
    const s = show(`<div class="screen"><div class="page">
      <div class="page-head"><button class="btn icon ghost" data-back>${ZG.icon('x')}</button><h1>${T('party_title')}</h1></div>
      <p class="muted">${T('party_hint')}</p>
      <div class="hero-pick">${ZG.HERO_ORDER.map((id) => {
        const h = ZG.HEROES[id];
        const ph = { id, feats: { attr: {}, hand: 0, slots: {} }, scars: [] };
        return `<div class="hero-card" data-id="${id}" style="--hc:${h.color}">
          <div class="portrait">${ZG.art('heroes', id, h.icon)}<div class="check">${ZG.icon('x')}</div></div>
          <div class="body"><h3>${esc(h.name)}</h3><div class="role">${esc(h.role)}</div>
          ${UI.statsHTML(ph)}
          <div class="stat-row"><span class="stat">Рука <b>${h.hand}</b></span><span class="stat">Колода <b>15</b></span></div>
          ${h.powers.map((p) => `<div class="power"><b>${esc(p.name)}.</b> ${esc(p.text)}</div>`).join('')}
          <div class="prof">Владение: ${(h.prof || []).length ? h.prof.map((k) => esc(ZG.PROF[k].name)).join(', ') : 'нет'}</div>
          <p class="flavor" style="font-size:13px;margin:10px 0 0">${esc(h.bio)}</p></div></div>`;
      }).join('')}</div>
      <h2 style="margin-top:26px">${T('party_difficulty')}</h2>
      <div class="diff-row">
        <div class="diff" data-d="normal"><b>${T('diff_normal')}</b><div class="muted">${T('diff_normal_d')}</div></div>
        <div class="diff" data-d="hard"><b>${T('diff_hard')}</b><div class="muted">${T('diff_hard_d')}</div></div>
      </div>
      <div class="sticky-foot"><span class="muted" id="pcount"></span><button class="btn primary" data-start>${ZG.icon('skull')} ${T('party_start')}</button></div>
    </div></div>`);
    const upd = () => {
      s.querySelectorAll('.hero-card').forEach((c) => {
        c.classList.toggle('sel', sel.has(c.dataset.id));
        c.querySelector('.check').innerHTML = sel.has(c.dataset.id) ? '✓' : '';
      });
      s.querySelectorAll('.diff').forEach((d) => d.classList.toggle('sel', d.dataset.d === diff));
      s.querySelector('[data-start]').disabled = sel.size === 0;
      s.querySelector('#pcount').textContent = sel.size ? `Героев: ${sel.size} · локаций в миссии: ${Math.min(6, sel.size + 2)}` : T('party_need');
    };
    s.querySelectorAll('.hero-card').forEach((c) => c.addEventListener('click', () => {
      const id = c.dataset.id;
      if (sel.has(id)) sel.delete(id); else sel.add(id);
      upd();
    }));
    s.querySelectorAll('.diff').forEach((d) => d.addEventListener('click', () => { diff = d.dataset.d; upd(); }));
    s.querySelector('[data-back]').addEventListener('click', () => go(() => UI.showSlots('new')));
    s.querySelector('[data-start]').addEventListener('click', () => {
      const ids = ZG.HERO_ORDER.filter((id) => sel.has(id));
      ZG.Save.newCampaign(slot, ids, diff);
      go(() => UI.showBriefing(0));
    });
    upd();
  };

  /* ============================== Карта кампании ============================== */
  UI.showMap = function () {
    ZG.Audio.music('shelter');
    const S = ZG.Save.current;
    S.screen = 'map';
    ZG.Save.persist();
    const camp = S.campaign;
    const pending = camp.party.some((ph) => ph.featsPending > 0);
    const allDone = ZG.MISSIONS.every((_, i) => camp.done[i]);
    const s = show(`<div class="screen"><div class="page">
      <div class="page-head"><button class="btn icon ghost" data-a="menu" title="${T('menu_main')}">${ZG.icon('x')}</button><h1>${T('map_title')}</h1>
        <button class="btn ${pending ? 'primary pulse' : ''}" data-a="camp">${ZG.icon('tent')} ${T('map_camp')}${pending ? ' · опыт!' : ''}</button>
        <button class="btn icon ghost" data-a="rules" title="${T('rules')}">${ZG.icon('book')}</button></div>
      <div class="campaign-map">
        <div class="map-nodes">${ZG.MISSIONS.map((m, i) => {
          const done = camp.done[i];
          const avail = i <= camp.progress;
          const cur = avail && !done;
          const actHead = i === 0 ? '<div class="act-head">Акт I · Первые дни</div>' : i === 5 ? '<div class="act-head">Акт II · Другой берег</div>' : '';
          return actHead + `<div class="mnode ${done ? 'done' : ''} ${cur ? 'current' : ''} ${avail ? '' : 'locked'}">
            <div class="num">${m.num}</div><div class="micon">${ZG.art('missions', m.id, m.icon)}</div>
            <h3>${esc(m.name)}</h3><div class="place">${esc(m.place)}</div>
            <span class="badge">${done ? T('map_done') : cur ? 'Текущая' : avail ? '' : T('map_locked')}</span>
            ${avail ? `<button class="btn ${cur ? 'primary' : 'small'}" data-m="${i}">${done ? T('map_retry') : T('map_play')}</button>` : ''}
          </div>`;
        }).join('')}</div>
      </div>
      ${allDone ? `<div class="panel" style="padding:18px;margin-top:18px;text-align:center"><h2 style="color:var(--amber)">Кампания пройдена</h2><p class="flavor">${esc(ZG.MISSIONS[ZG.MISSIONS.length - 1].outro)}</p></div>` : ''}
      <div class="party-strip">${camp.party.map((ph) => {
        const h = ZG.HEROES[ph.id];
        return `<div class="party-chip">${UI.avatar(ph.id)}<div><b style="font-family:var(--font-head)">${esc(h.name)}</b><br><span class="muted" style="font-size:12px">${esc(h.role)} · колода ${ph.deck.length}${ph.scars.length ? ` · <span class="scar">шрамов: ${ph.scars.length}</span>` : ''}</span></div></div>`;
      }).join('')}</div>
      <p class="muted" style="margin-top:20px">Склад отряда: ${camp.vault.length} карт · Убито мертвецов: ${camp.stats.kills} · Находок: ${camp.stats.finds} · Потерь: ${camp.stats.deaths} · Сложность: ${S.difficulty === 'hard' ? T('diff_hard') : T('diff_normal')}</p>
    </div></div>`);
    s.querySelectorAll('[data-m]').forEach((b) => b.addEventListener('click', () => go(() => UI.showBriefing(+b.dataset.m))));
    s.querySelector('[data-a="camp"]').addEventListener('click', () => go(UI.showCamp));
    s.querySelector('[data-a="menu"]').addEventListener('click', () => go(UI.showTitle));
    s.querySelector('[data-a="rules"]').addEventListener('click', () => UI.showRules());
  };

  /* ============================== Брифинг ============================== */
  UI.showBriefing = function (idx) {
    ZG.Audio.music('shelter');
    setTimeout(() => ZG.Audio.sfx('tension'), 350);
    const m = ZG.MISSIONS[idx];
    const S = ZG.Save.current;
    S.screen = 'map';
    const n = Math.min(6, S.campaign.party.length + 2);
    const boss = ZG.card(m.boss);
    const hen = ZG.card(m.henchman);
    const s = show(`<div class="screen briefing"><div class="brief-box panel">
      <div class="brief-kicker">${m.act === 2 ? 'Акт II · ' : ''}Миссия ${m.num} из ${ZG.MISSIONS.length} · ${esc(m.place)}</div>
      <h1>${esc(m.name)}</h1>
      <div class="typewriter" id="tw"></div>
      <div class="brief-facts" id="facts">
        <div class="fact"><div class="k">${T('brief_goal')}</div>${esc(m.goal)}</div>
        <div class="fact"><div class="k">${T('brief_rule')}</div>${esc(m.rule)}</div>
        <div class="fact"><div class="k">${T('brief_threat')}</div><b>${esc(boss.name)}</b> — сложность ${boss.dc}${boss.hits ? ' ×' + boss.hits : ''}. ${esc(boss.text || '')}</div>
        <div class="fact"><div class="k">${T('brief_minion')}</div><b>${esc(hen.name)}</b> ×${n - 1 + (m.special && m.special.extraHench ? (m.special.extraHench === 'all' ? n : Math.min(m.special.extraHench, n)) : 0)} — сложность ${hen.dc}. Локаций: ${n}.</div>
      </div>
      <div class="enc-actions"><button class="btn ghost" data-back>${T('to_map')}</button><button class="btn primary" data-go>${ZG.icon('skull')} ${T('brief_start')}</button></div>
    </div></div>`);
    const tw = s.querySelector('#tw');
    let skip = false;
    const type = async () => {
      for (const para of m.intro) {
        const p = document.createElement('p');
        tw.appendChild(p);
        const caret = '<span class="caret"></span>';
        for (let i = 0; i <= para.length; i++) {
          if (skip) { p.textContent = para; break; }
          p.innerHTML = esc(para.slice(0, i)) + caret;
          await new Promise((r) => setTimeout(r, 16 * ZG.speed));
        }
        p.textContent = para;
        if (!skip) await ZG.sleep(250);
      }
      s.querySelector('#facts').classList.add('show');
    };
    type();
    s.querySelector('.brief-box').addEventListener('click', (e) => { if (!e.target.closest('.btn')) skip = true; });
    s.querySelector('[data-back]').addEventListener('click', () => go(UI.showMap));
    s.querySelector('[data-go]').addEventListener('click', () => {
      skip = true;
      go(() => { G().newMission(idx); G().run(); });
    });
  };

  /* ============================== Итоги миссии ============================== */
  UI.showResult = function () {
    ZG.Audio.music('shelter');
    const S = ZG.Save.current;
    const r = S.lastResult;
    const m = ZG.MISSIONS[r.idx];
    ZG.FX.setNight(false);
    const finalWin = r.win && r.idx === ZG.MISSIONS.length - 1;
    const s = show(`<div class="screen result-screen"><div class="result-box panel ${r.win ? 'win' : 'lose'}">
      <div class="brief-kicker">Миссия ${m.num} · ${esc(m.name)}</div>
      <h1>${r.win ? T('win_title') : T('lose_title')}</h1>
      <p class="flavor" style="font-size:17px">${r.win ? esc(m.outro) : r.reason === 'time' ? T('lose_time') : T('lose_dead')}</p>
      <div class="result-stats">
        <div class="rstat"><b>${r.turns}</b><span>ходов</span></div>
        <div class="rstat"><b>${r.stats.kills}</b><span>убито</span></div>
        <div class="rstat"><b>${r.stats.finds}</b><span>находок</span></div>
        <div class="rstat"><b>${r.stats.hordes}</b><span>орд</span></div>
      </div>
      ${r.reward ? `<h3 style="color:var(--amber)">${ZG.icon('trophy')} ${esc(m.reward.text)}</h3><div class="loot-row">${UI.cardHTML(r.reward, { size: 'mid' })}</div>` : ''}
      ${r.loot.length ? `<h3>Добыча (в склад отряда)</h3><div class="loot-row">${r.loot.map((id, i) => UI.cardHTML(id, { size: 'mini', cls: '' }).replace('class="card', `style="animation-delay:${i * 0.08}s" class="card`)).join('')}</div>` : ''}
      ${r.burned && r.burned.length ? `<h3 style="color:var(--blood2)">${ZG.icon('fire')} Сгорело навсегда: ${r.burned.length}</h3><p class="muted">${r.burned.map((id) => esc(ZG.card(id).name)).join(', ')}</p>` : ''}
      ${r.scars.length ? `<h3 style="color:var(--blood2)">Шрамы</h3>${r.scars.map((x) => `<p class="scar">${esc(ZG.HEROES[x.hero].name)}: ${esc(x.text)}</p>`).join('')}` : ''}
      ${!r.win ? '<p class="muted">Найденные карты сохранены. Миссию можно повторить.</p>' : ''}
      <div class="enc-actions" style="justify-content:center;margin-top:18px">
        ${r.win ? `<button class="btn primary" data-a="camp">${ZG.icon('tent')} ${T('to_camp')}</button>` : `<button class="btn primary" data-a="retry">${T('map_retry')}</button><button class="btn" data-a="camp">${ZG.icon('tent')} ${T('to_camp')}</button>`}
        <button class="btn ghost" data-a="map">${T('to_map')}</button>
      </div>
    </div></div>`);
    s.scrollTop = 0;
    if (r.win) setTimeout(() => { ZG.FX.burst(window.innerWidth / 2, window.innerHeight * 0.3, 'gold', 120); }, 300);
    if (finalWin) setTimeout(() => UI.banner('Источник уничтожен', 'Кампания завершена. Спасибо, что выжили.', 'win', true), 900);
    else if (r.win && r.idx === 4) setTimeout(() => UI.banner('Первые дни позади', 'Впереди — Акт II: «Другой берег»', 'win', true), 900);
    s.querySelectorAll('[data-a]').forEach((b) => b.addEventListener('click', () => {
      const a = b.dataset.a;
      S.lastResult = null;
      if (a === 'camp') go(UI.showCamp);
      if (a === 'map') go(UI.showMap);
      if (a === 'retry') go(() => UI.showBriefing(r.idx));
    }));
  };

  /* ============================== Лагерь ============================== */
  UI.campHero = 0;
  UI.showCamp = function (refresh) {
    ZG.Audio.music('shelter');
    const S = ZG.Save.current;
    S.screen = 'camp';
    const camp = S.campaign;
    const g = G();
    const prevScroll = refresh && app().firstElementChild ? app().firstElementChild.scrollTop : 0;
    if (!refresh) g.ensureDecks();
    ZG.Save.persist();
    const ph = camp.party[UI.campHero] || camp.party[0];
    const hd = ZG.HEROES[ph.id];
    const comp = g.deckComp(ph);
    const reserve = g.reserve();
    const tabs = camp.party.map((p, i) => `<div class="tab ${p === ph ? 'on' : ''}" data-h="${i}" style="--hc:${ZG.HEROES[p.id].color}">${UI.avatar(p.id)} ${esc(ZG.HEROES[p.id].name.split(' ')[0])}${p.featsPending ? '<span class="dot"></span>' : ''}${!g.deckValid(p) ? '<span class="dot bad"></span>' : ''}</div>`).join('');
    const featBox = ph.featsPending ? `<div class="feat-box"><h4>${ZG.icon('star')} ${T('camp_feat_pick')} (${ph.featsPending})</h4><div class="feat-opts">
      ${ZG.ATTRS.map((a) => {
        const cur = ph.feats.attr[a] || 0;
        return `<button class="choice" data-feat="attr:${a}" ${cur >= 3 ? 'disabled' : ''}><b>+1 ${esc(T('attr_' + a))}</b><span>сейчас ${hd.attrs[a].replace('d', T('die'))}${g.attrBonus(ph, a) ? (g.attrBonus(ph, a) > 0 ? '+' : '') + g.attrBonus(ph, a) : ''} (макс. +3)</span></button>`;
      }).join('')}
      <button class="choice" data-feat="hand" ${(ph.feats.hand || 0) >= 2 ? 'disabled' : ''}><b>${T('feat_hand')}</b><span>сейчас ${g.handSize(ph)} (макс. +2)</span></button>
      ${ZG.CARD_TYPES.map((t) => `<button class="choice" data-feat="slot:${t}"><b>+1 слот: ${esc(T('slot_' + t))}</b><span>колода станет больше — это лишнее «здоровье»</span></button>`).join('')}
      ${ph.scars.length ? `<button class="choice" data-feat="scar"><b>${T('feat_scar')}</b><span>${esc(ZG.SCARS.find((x) => x.id === ph.scars[0].id).text)}</span></button>` : ''}
    </div></div>` : '';
    const groups = ZG.CARD_TYPES.map((t) => {
      const mine = ph.deck.map((id, i) => ({ id, i })).filter((x) => ZG.card(x.id).type === t);
      const avail = reserve.filter((id) => ZG.card(id).type === t);
      const uniq = [...new Set(avail)].sort((a, b) => g.cardValue(b) - g.cardValue(a));
      const cnt = mine.length;
      const ok = cnt === comp[t];
      const empties = Array.from({ length: Math.max(0, comp[t] - cnt) }, () => `<div class="empty-slot">Пустой слот<br>${esc(T('slot_' + t))}</div>`).join('');
      return `<div class="type-group"><h4>${esc(T('type_' + t))} <span class="cnt ${ok ? 'ok' : 'bad'}">${cnt}/${comp[t]}</span></h4>
        <div class="card-row">${mine.map((x) => UI.cardHTML(x.id, { size: 'mini', title: 'Убрать в склад', badge: g.cardWarn(ph.id, x.id) }).replace('class="card', `data-rm="${x.i}" class="card`)).join('')}${empties}</div>
        ${uniq.length ? `<div class="sec-label" style="margin-top:8px">${T('camp_vault')}: ${uniq.length} ${ZG.plural(uniq.length, 'вид', 'вида', 'видов')}</div><div class="card-row">${uniq.map((id) => UI.cardHTML(id, { size: 'mini', cls: 'out', badge: '×' + ZG.count(avail, (x) => x === id) + (g.cardWarn(ph.id, id) ? ' · ' + g.cardWarn(ph.id, id) : ''), title: g.cardWarn(ph.id, id) ? 'Герою не подходит: ' + g.cardWarn(ph.id, id) : 'Взять в колоду' }).replace('class="card', `data-add="${id}" class="card`)).join('')}</div>` : ''}
        <div class="sec-label" style="margin-top:6px">${T('camp_supply')}: ${G().BASICS[t].map((id) => `<a href="#" data-basic="${id}" style="color:var(--amber)">${esc(ZG.card(id).name)}</a>`).join(', ')}</div>
      </div>`;
    }).join('');
    const s = show(`<div class="screen"><div class="page">
      <div class="page-head"><button class="btn icon ghost" data-back>${ZG.icon('x')}</button><h1>${T('camp_title')}</h1>
        <button class="btn" data-auto>${T('camp_auto')}</button><button class="btn primary" data-done>${T('camp_done')}</button></div>
      <p class="flavor" style="margin-top:-8px">Костёр в бочке, заколоченные окна, чей-то храп. Здесь можно перебрать снаряжение и залатать раны.</p>
      <div class="camp-tabs">${tabs}</div>
      <div class="camp-grid">
        <div class="camp-hero panel" style="--hc:${hd.color}">
          <div class="hp-top" style="display:flex;gap:12px;align-items:center">${UI.avatar(ph.id).replace('class="avatar', 'style="width:64px;height:64px;font-size:30px" class="avatar')}<div><h3>${esc(hd.name)}</h3><div class="role" style="color:var(--hc);font-size:12px;letter-spacing:.1em;text-transform:uppercase">${esc(hd.role)}</div></div></div>
          ${UI.statsHTML(ph)}
          <div class="stat-row"><span class="stat">Рука <b>${g.handSize(ph)}</b></span><span class="stat">Колода <b>${ZG.sum(Object.values(comp))}</b></span></div>
          ${hd.powers.map((p) => `<div class="power"><b>${esc(p.name)}.</b> ${esc(p.text)}</div>`).join('')}
          <div class="prof">Владение: ${(hd.prof || []).length ? hd.prof.map((k) => esc(ZG.PROF[k].name)).join(', ') : 'нет'}</div>
          ${ph.scars.length ? `<div><b class="scar">${T('scars')}:</b>${ph.scars.map((x) => `<div class="scar">${esc(ZG.SCARS.find((y) => y.id === x.id).text)}</div>`).join('')}</div>` : ''}
          ${featBox}
        </div>
        <div class="deck-section panel">
          <p class="muted" style="margin-top:0">Нажмите на карту колоды, чтобы вернуть её на склад; на карту склада — чтобы взять. Базовые запасы бесконечны.</p>
          ${groups}
        </div>
      </div>
    </div></div>`);
    if (refresh) {
      s.style.animation = 'none';
      s.scrollTop = prevScroll;
    }
    const rerender = () => { ZG.Save.persist(); UI.showCamp(true); };
    s.querySelectorAll('[data-h]').forEach((t) => t.addEventListener('click', () => { UI.campHero = +t.dataset.h; UI.showCamp(true); }));
    s.querySelectorAll('[data-rm]').forEach((c) => c.addEventListener('click', () => { ph.deck.splice(+c.dataset.rm, 1); rerender(); }));
    s.querySelectorAll('[data-add]').forEach((c) => c.addEventListener('click', () => {
      const id = c.dataset.add;
      const t = ZG.card(id).type;
      if (ZG.count(ph.deck, (x) => ZG.card(x).type === t) >= comp[t]) return UI.toast('Слоты этого типа заполнены — сначала уберите карту', 'bad');
      ph.deck.push(id);
      rerender();
    }));
    s.querySelectorAll('[data-basic]').forEach((a) => a.addEventListener('click', (e) => {
      e.preventDefault();
      const id = a.dataset.basic;
      const t = ZG.card(id).type;
      if (ZG.count(ph.deck, (x) => ZG.card(x).type === t) >= comp[t]) return UI.toast('Слоты этого типа заполнены', 'bad');
      camp.vault.push(id);
      ph.deck.push(id);
      rerender();
    }));
    s.querySelectorAll('[data-feat]').forEach((b) => b.addEventListener('click', () => {
      const [k, v] = b.dataset.feat.split(':');
      if (k === 'attr') ph.feats.attr[v] = (ph.feats.attr[v] || 0) + 1;
      if (k === 'hand') ph.feats.hand = (ph.feats.hand || 0) + 1;
      if (k === 'slot') { ph.feats.slots[v] = (ph.feats.slots[v] || 0) + 1; }
      if (k === 'scar') ph.scars.shift();
      ph.featsPending--;
      ZG.FX.burstAt(b, 'gold', 50);
      UI.toast(`${ZG.icon('star')} ${esc(hd.name.split(' ')[0])}: улучшение получено`, 'loot');
      g.ensureDecks();
      rerender();
    }));
    s.querySelector('[data-auto]').addEventListener('click', () => {
      ph.deck = [];
      g.autofill(ph);
      rerender();
    });
    const leave = async () => {
      const bad = camp.party.find((p) => !g.deckValid(p));
      if (bad) {
        if (!(await UI.confirm('Колода не собрана', T('camp_need', { name: ZG.HEROES[bad.id].name }) + '. Дозаполнить автоматически?'))) return;
        g.ensureDecks();
      }
      if (camp.party.some((p) => p.featsPending > 0) && !(await UI.confirm('Неиспользованный опыт', 'У кого-то остались неиспользованные улучшения. Всё равно выйти?'))) return;
      S.screen = 'map';
      ZG.Save.persist();
      go(UI.showMap);
    };
    s.querySelector('[data-done]').addEventListener('click', leave);
    s.querySelector('[data-back]').addEventListener('click', leave);
  };

  /* ============================== Правила ============================== */
  UI.showRules = function () {
    const ov = UI.overlay(`<div class="modal panel rules" style="width:min(860px,100%)">
      <div class="page-head" style="margin-bottom:6px"><h1 style="font-size:30px">Правила выживания</h1><button class="btn icon ghost" data-x>${ZG.icon('x')}</button></div>
      <p>Кооперативная карточная кампания на 1–4 героев. Все играют за одним устройством, передавая его по кругу. Цель каждой миссии — найти <b>Угрозу</b>, победить её и не дать ей сбежать, пока не закончились <b>Часы</b>.</p>
      <h2>Ход героя</h2>
      <ol>
        <li><b>Часы.</b> Переворачивается карта Часов. Иногда это событие (сирена, голод, вой): его карта задерживается на экране, а затем остаётся плашкой «Событие хода» в верхней панели — по клику можно перечитать. Каждые 5 ходов день сменяется ночью; на рассвете шум всех локаций снижается на 1. Длина Часов зависит от размера отряда: 20 / 25 / 27 / 30 ходов на 1 / 2 / 3 / 4 героев (в Акте II отряду из 3–4 героев +3 хода). В отряде из 3+ героев и на высокой сложности ночью мертвецы получают +3 вместо +2.</li>
        <li><b>Идти.</b> До исследования можно перейти в любую локацию.</li>
        <li><b>Исследовать.</b> Откройте верхнюю карту локации и разберитесь с ней. Одно исследование бесплатно; карты вроде «Пёс Рекс» или «Надежда» дают ещё.</li>
        <li><b>Заколотить.</b> Если колода локации пуста — попробуйте её заколотить (проверка «Заколотить», одна попытка за ход). Победив вожака, можно попытаться сразу, даже если в колоде ещё есть карты. Если при успехе в колоде притаилась Угроза, локация не закрывается: все остальные карты изгоняются, а Угроза остаётся в колоде — теперь её можно найти.</li>
        <li><b>Конец хода.</b> Сбросьте лишнее до размера руки и доберите карты. <b>Если добирать нечего — герой погибает.</b></li>
      </ol>
      <p>В любой момент своего хода можно играть карты с действием (лечение, разведка, ещё одно исследование) и один раз передать карту соседу по локации.</p>
      <h2>Проверки и кубики</h2>
      <p>Каждая проверка: кубик навыка героя (d4–d12) + бонус навыка + карты. Сумма должна быть не меньше сложности. В проверку можно сыграть <b>по одной карте каждого типа</b>: оружие, снаряжение, расходник, союзник, решимость. Решимость можно отдать соседу по локации.</p>
      <ul>
        <li><b>Показать</b> — карта остаётся в руке. <b>Сбросить</b> — в сброс (лечение может вернуть её в колоду). <b>Перезарядить</b> — под низ колоды. <b>Сжечь</b> — карта сгорает навсегда: она не лечится и не возвращается на склад после миссии (так работают все расходники). Опустевшие слоты в лагере заполняются базовыми запасами. <b>Изгнать</b> — навсегда.</li>
        <li>Бой без оружия — Сила, Ловкость или Рукопашная. Оружие задаёт свой навык и добавляет кубики.</li>
        <li>Панель проверки показывает точный шанс успеха.</li>
      </ul>
      <h2>Встречи</h2>
      <ul>
        <li><b>Мертвецы и люди:</b> победа — карта уходит из игры. Поражение — урон, равный разнице (но не больше 3 у обычных врагов, 4 у вожаков, 5 у Угрозы), и враг возвращается в колоду локации. Укус при уроне — Инфекция.</li>
        <li><b>Находки</b> (оружие, снаряжение, расходники, союзники, решимость): пройдите проверку — карта ваша до конца кампании. Провал — находка потеряна. Если миссия провалена, каждый выживший герой уносит только одну находку на свой выбор.</li>
        <li><b>Препятствия:</b> ловушки, пожары, моральный выбор.</li>
      </ul>
      <h2>Урон, инфекция, смерть</h2>
      <p>Урон — сброс карт из руки (Инфекцию сбросить как урон нельзя). Колода — это здоровье. Карты с действием «Блок» (куртка, шлем, крышка от бака, бронежилет, обезболивающее, Вышибала Тони, «Чудом уцелел») сыгрываются в окне урона и блокируют часть или весь урон — по одной карте каждого типа. Укус замешивает в колоду <b>Инфекцию</b>: её нельзя сыграть, а <b>три Инфекции превращают героя в мертвеца</b>. Погибшие герои возвращаются в лагерь со шрамом, но теряют найденное в этой миссии.</p>
      <h2>Приёмы</h2>
      <p>Приёмы — отдельный тип карт (удары, выстрелы, медицина, самоделки). После применения герой проходит проверку перезарядки указанным навыком: успех — карта уходит под низ колоды и вернётся, провал — в сброс. Если у героя нет нужного навыка вовсе, приём сгорает навсегда.</p>
      <h2>Владение</h2>
      <p>Огнестрел, тяжёлое оружие и тяжёлая броня требуют владения. Без него оружие даёт −4 к проверке, а тяжёлая броня сгорает после блока и не может быть выложена. Владение указано на карточке героя.</p>
      <h2>Состояния</h2>
      <ul>${Object.values(ZG.CONDS).map((c) => `<li><b>${c.name}.</b> ${c.text}</li>`).join('')}</ul>
      <p>Состояния снимаются только картами и способностями: медицинскими приёмами, Антибиотиками, Консервами, Полевой медициной Марины и т. п. Бесплатного отдыха нет.</p>
      <h2>Типы урона</h2>
      <p>Некоторые враги, ловушки и локации наносят урон <b>кислотой, холодом, электричеством или огнём</b> (указано на карте). Обычно такой урон блокируется как любой другой, но герой с состоянием «Уязвимость» не может его уменьшить ничем.</p>
      <h2>Особые правила локаций</h2>
      <p>У многих локаций есть свои правила (написаны на карточке): проверка при входе или в конце хода, цена попытки заколотить, двойная проверка, штраф за проваленную попытку заколотить, орда наверх колоды, тихие укрытия, опасный огнестрел и другие.</p>
      <h2>Уникальное в миссиях</h2>
      <p>В каждой миссии в колоды локаций замешиваются свои особые находки (около 4 видов) и свои виды врагов — без привязки к конкретной локации. Найдёте ли вы их — вопрос удачи.</p>
      <h2>Выложенные карты</h2>
      <p>Некоторые карты (Пёс Рекс, Ворон Отто, Бронежилет, Шлем, ПНВ) можно выложить перед собой в свой ход. Пока карта выложена, она работает постоянно: блокирует урон или добавляет кубик к проверкам. Не больше 2 выложенных карт. Грабители срывают выложенное в первую очередь — сорванная карта пропадает навсегда.</p>
      <h2>Уязвимости врагов</h2>
      <p>У врагов бывают уязвимости (карта с этим свойством даёт дополнительный кубик), стойкость (штраф к проверке) и иммунитет (кубики таких карт не считаются). Свойства карты указаны в её типе: «Огонь», «Тихое», «Тяжёлое», «Огнестрел», «Ближнее», «Дальнее».</p>
      <h2>Награды за заколоченные локации</h2>
      <p>У каждой локации есть награда «Когда заколочено» (видна на карточке локации): лишние ходы Часов, лечение, находка, тишина или снятие состояний. Выбирайте, что закрывать первым.</p>
      <h2>Шум и орда</h2>
      <p>Громкое оружие, крикуны и ловушки поднимают шум локации. Когда шум достигает порога — приходит <b>Орда</b>: в колоду локации замешиваются новые мертвецы. Тихое оружие, глушитель и сигнальные ракеты помогают.</p>
      <h2>Заколачивание и Угроза</h2>
      <p>Победив <b>вожака</b>, можно сразу попытаться заколотить его локацию, даже если в ней ещё есть карты. Это единственный шанс: если отказаться или провалить проверку, локацию придётся вычищать до пустой колоды. Лечение возможно только картами, способностями героев, событиями Часов и наградами за заколоченные локации.</p>
      <h3>Встреча с Угрозой</h3>
      <ol>
        <li><b>Перед боем</b> герои в других открытых локациях могут временно перекрыть их — проверкой «Заколотить» своей локации, в любом порядке. Локацию, где находится Угроза, так перекрыть нельзя. Перекрытие — обычная проверка «Заколотить» без цены и двойной проверки этой локации; оно не даёт награду «Когда заколочено», не убирает карты и действует только на эту встречу; провал ничего не закрывает.</li>
        <li><b>Если Угроза побеждена</b> и других Угроз в колоде её локации нет — локация заколачивается автоматически, без проверки: все оставшиеся карты изгоняются, срабатывает награда «Когда заколочено», а герои оттуда отступают в другие локации.</li>
        <li>Если все открытые локации заколочены или перекрыты — Угроза загнана в угол, победа.</li>
        <li>Иначе Угроза скрывается: в каждую неперекрытую открытую локацию замешивается по карте — в одну сама Угроза, в остальные «Ложный след» (+1 исследование). Где она — неизвестно.</li>
        <li>Если Угрозу не победили — она возвращается в колоду своей локации, перекрытия снимаются.</li>
      </ol>
      
      <h2>Лагерь</h2>
      <p>После успешной миссии каждый герой получает улучшение: +1 к характеристике, +1 к руке, +1 слот колоды или лечение шрама. В лагере колоды пересобираются из общего склада находок.</p>
      <h2>Управление</h2>
      <p><span class="kbd">E</span> — исследовать, <span class="kbd">Enter</span> — бросить кубики / продолжить. Кликните по карте в руке, чтобы сыграть или осмотреть её.</p>
    </div>`);
    const close = () => UI.closeOverlay(ov);
    ov.querySelector('[data-x]').addEventListener('click', close);
    ov.addEventListener('click', (e) => { if (e.target === ov) close(); });
  };

  /* ============================== Настройки и меню ============================== */
  UI.showSettings = function () {
    const st = ZG.Settings.data;
    const ov = UI.overlay(`<div class="modal panel"><div class="page-head" style="margin-bottom:6px"><h1 style="font-size:28px">${T('settings')}</h1><button class="btn icon ghost" data-x>${ZG.icon('x')}</button></div>
      <div class="set-row"><span>${T('set_speed')}</span><div class="seg" data-k="speed"><button data-v="normal">${T('normal')}</button><button data-v="fast">${T('fast')}</button></div></div>
      <div class="set-row"><span>${T('set_fx')}</span><div class="seg" data-k="fx"><button data-v="1">${T('on')}</button><button data-v="0">${T('off')}</button></div></div>
      <div class="set-row"><span>Музыка</span><div class="seg" data-k="music"><button data-v="1">${T('on')}</button><button data-v="0">${T('off')}</button></div></div>
      <div class="set-row"><span>Громкость музыки</span><input type="range" min="0" max="100" data-vol="musicVol" style="width:180px"></div>
      <div class="set-row"><span>Звуки</span><div class="seg" data-k="sfx"><button data-v="1">${T('on')}</button><button data-v="0">${T('off')}</button></div></div>
      <div class="set-row"><span>Громкость звуков</span><input type="range" min="0" max="100" data-vol="sfxVol" style="width:180px"></div>
      <div class="set-row"><span>${T('set_tips')}</span><div class="seg" data-k="tips"><button data-v="1">${T('on')}</button><button data-v="0">${T('off')}</button></div></div>
      <p class="muted">${T('save_note')}</p></div>`);
    const upd = () => {
      ov.querySelectorAll('.seg').forEach((sg) => {
        const k = sg.dataset.k;
        sg.querySelectorAll('button').forEach((b) => {
          const v = k === 'speed' ? b.dataset.v : b.dataset.v === '1';
          b.classList.toggle('on', st[k] === v);
        });
      });
    };
    ov.querySelectorAll('.seg button').forEach((b) => b.addEventListener('click', () => {
      const k = b.parentElement.dataset.k;
      st[k] = k === 'speed' ? b.dataset.v : b.dataset.v === '1';
      ZG.Settings.save();
      ZG.Audio.apply();
      upd();
    }));
    ov.querySelectorAll('[data-vol]').forEach((r) => {
      const k = r.dataset.vol;
      r.value = Math.round((st[k] != null ? st[k] : k === 'musicVol' ? 0.5 : 0.8) * 100);
      r.addEventListener('input', () => { st[k] = r.value / 100; ZG.Settings.save(); ZG.Audio.apply(); });
      r.addEventListener('change', () => { if (k === 'sfxVol') ZG.Audio.sfx('growl'); });
    });
    ov.querySelector('[data-x]').addEventListener('click', () => UI.closeOverlay(ov));
    upd();
  };

  UI.gameMenu = async function () {
    const i = await UI.choose({
      title: 'Меню',
      text: T('save_note'),
      options: [{ label: 'Вернуться в игру', primary: true }, { label: T('rules') }, { label: T('settings') }, { label: T('quit_mission'), sub: 'Прогресс сохранён на начало текущего хода' }],
    });
    if (i === 1) UI.showRules();
    if (i === 2) UI.showSettings();
    if (i === 3) {
      ZG.Save.current = null;
      location.reload();
    }
  };
})();
