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
    const tb = document.getElementById('toasts'); if (tb) tb.innerHTML = ''; // уведомления не переживают смену экрана
    document.getElementById('overlay-root').innerHTML = '';
    app().innerHTML = html;
    return app().firstElementChild;
  };
  const go = (fn, dir) => ZG.FX.transition(fn, dir);

  /* ============================== Главное меню ============================== */
  UI.showTitle = function () {
    ZG.FX.setNight(false); ZG.Audio.ambient && ZG.Audio.ambient(null);
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
        ${UI.devOn() ? `<button class="btn ghost" data-a="gallery">${ZG.icon('cards')} Галерея</button>` : ''}
      </div>
      <div class="version">v1.0 · соло и хот-сит, 1–4 героя</div>
    </div>`);
    s.querySelectorAll('[data-a]').forEach((b) => b.addEventListener('click', () => {
      const a = b.dataset.a;
      if (a === 'gallery') return UI.showGallery();
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
      <div class="hero-carousel"><button class="hc-nav prev" data-hc="-1" aria-label="Назад">‹</button><div class="hero-pick">${ZG.HERO_ORDER.map((id) => {
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
      }).join('')}</div><button class="hc-nav next" data-hc="1" aria-label="Вперёд">›</button></div>
      <div class="sticky-foot">
        <div class="diff-seg"><span class="muted">${T('party_difficulty')}:</span>
          <button class="diff" data-d="normal" title="${esc(T('diff_normal_d'))}"><b>${T('diff_normal')}</b></button>
          <button class="diff" data-d="hard" title="${esc(T('diff_hard_d'))}"><b>${T('diff_hard')}</b></button>
          <span class="muted diff-note" id="diffnote"></span></div>
        <span class="muted" id="pcount"></span><button class="btn primary" data-start>${ZG.icon('skull')} ${T('party_start')}</button></div>
    </div></div>`);
    const upd = () => {
      s.querySelectorAll('.hero-card').forEach((c) => {
        c.classList.toggle('sel', sel.has(c.dataset.id));
        c.querySelector('.check').innerHTML = sel.has(c.dataset.id) ? '✓' : '';
      });
      s.querySelectorAll('.diff').forEach((d) => d.classList.toggle('sel', d.dataset.d === diff));
      s.querySelector('#diffnote').textContent = T(diff === 'hard' ? 'diff_hard_d' : 'diff_normal_d');
      s.querySelector('[data-start]').disabled = sel.size === 0;
      s.querySelector('#pcount').textContent = sel.size ? `Героев: ${sel.size} · локаций в миссии: ${Math.min(6, sel.size + 2)}` : T('party_need');
    };
    s.querySelectorAll('.hero-card').forEach((c) => c.addEventListener('click', () => {
      const id = c.dataset.id;
      if (sel.has(id)) sel.delete(id);
      else if (sel.size >= 4) return UI.toast('В отряде не больше 4 героев — сначала уберите кого-нибудь', 'bad');
      else sel.add(id);
      upd();
    }));
    s.querySelectorAll('.diff').forEach((d) => d.addEventListener('click', () => { diff = d.dataset.d; upd(); }));
    // карусель героев: стрелки листают на одну карточку, колесо мыши — по горизонтали
    const row = s.querySelector('.hero-pick');
    const stepW = () => { const c = row.querySelector('.hero-card'); return c ? c.getBoundingClientRect().width + 18 : 320; };
    const navUpd = () => {
      s.querySelector('.hc-nav.prev').classList.toggle('off', row.scrollLeft < 4);
      s.querySelector('.hc-nav.next').classList.toggle('off', row.scrollLeft + row.clientWidth >= row.scrollWidth - 4);
    };
    s.querySelectorAll('[data-hc]').forEach((b) => b.addEventListener('click', () => row.scrollBy({ left: +b.dataset.hc * stepW(), behavior: 'smooth' })));
    row.addEventListener('scroll', navUpd, { passive: true });
    row.addEventListener('wheel', (e) => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { row.scrollBy({ left: e.deltaY, behavior: 'auto' }); e.preventDefault(); } }, { passive: false });
    requestAnimationFrame(navUpd);
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
          return actHead + `<div class="mnode ${done ? 'done' : ''} ${cur ? 'current' : ''} ${avail ? '' : 'locked'}" style="--lt:${UI.locTint ? UI.locTint(m.icon) : '140, 40, 30'}">
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
    s.querySelectorAll('[data-m]').forEach((b) => b.addEventListener('click', () => go(() => UI.showBriefing(+b.dataset.m), 'zoom')));
    s.querySelector('[data-a="camp"]').addEventListener('click', () => go(UI.showCamp, 'left'));
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
    const s = show(`<div class="screen briefing" data-peek><div class="brief-box panel">
      <div class="brief-kicker">${m.act === 2 ? 'Акт II · ' : ''}Миссия ${m.num} из ${ZG.MISSIONS.length} · ${esc(m.place)}</div>
      <h1>${esc(m.name)}</h1>
      <div class="typewriter" id="tw"></div>
      <div class="brief-facts" id="facts">
        <div class="fact"><div class="k">${T('brief_goal')}</div>${esc(m.goal)}</div>
        <div class="fact"><div class="k">${T('brief_rule')}</div>${esc(m.rule)}</div>
        <div class="fact brief-foes">
          <div class="bf"><div class="k">${T('brief_threat')}</div>${UI.cardHTML(m.boss, { size: 'mid' })}</div>
          <div class="bf"><div class="k">${T('brief_minion')} <b class="bf-n">×${n - 1}</b></div>${UI.cardHTML(m.henchman, { size: 'mid' })}<div class="muted bf-note">Локаций в миссии: ${n}</div></div>
        </div>
      </div>
      <div class="enc-actions"><button class="btn ghost" data-back>${T('to_map')}</button><button class="btn primary" data-go>${ZG.icon('skull')} ${T('brief_start')}</button></div>
    </div>
      ${(() => { const arts = m.locations.map((id) => ({ id, url: UI.locArtUrl && UI.locArtUrl(id) })).filter((x) => x.url); return arts.length ? `<div class="brief-locs">${arts.map((x, i) => `<div class="bl ${i >= n ? 'extra' : ''}" style="background-image:url('${x.url}')" title="${i >= n ? 'Только для отряда побольше' : ''}"><span>${esc(ZG.LOCATIONS[x.id].name)}</span></div>`).join('')}</div>` : ''; })()}
    </div>`);
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
    s.querySelector('[data-back]').addEventListener('click', () => go(UI.showMap, 'out'));
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
    ZG.FX.setNight(false); ZG.Audio.ambient && ZG.Audio.ambient(null);
    const finalWin = r.win && r.idx === ZG.MISSIONS.length - 1;
    const s = show(`<div class="screen result-screen" data-peek><div class="result-box panel ${r.win ? 'win' : 'lose'}">
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
      ${(r.lostHeroes || []).length ? `<h3 style="color:var(--blood2)">${ZG.icon('skull')} Потеряны навсегда</h3>${r.lostHeroes.map((id) => `<p class="scar">${esc(ZG.HEROES[id].name)} обратился в мертвеца и больше не вернётся в отряд.</p>`).join('')}` : ''}
      ${r.win && (r.xpGot || []).length ? `<p class="muted">Опыт получили: ${r.xpGot.map((id) => esc(ZG.heroShort(id))).join(', ')}.${(r.dead || []).filter((id) => !(r.lostHeroes || []).includes(id)).length ? ' Погибшие герои опыт за эту миссию не получают — его можно заработать, пройдя миссию снова.' : ''}</p>` : ''}
      ${r.partyGone ? '<p class="scar">В отряде не осталось никого. Кампания окончена.</p>' : ''}
      ${!r.win && !r.partyGone ? '<p class="muted">Найденные карты сохранены. Миссию можно повторить.</p>' : ''}
      <div class="enc-actions" style="justify-content:center;margin-top:18px">
        ${r.partyGone ? `<button class="btn primary" data-a="title">${T('menu_main')}</button>` : r.win ? `<button class="btn primary" data-a="camp">${ZG.icon('tent')} ${T('to_camp')}</button>` : `<button class="btn primary" data-a="retry">${T('map_retry')}</button><button class="btn" data-a="camp">${ZG.icon('tent')} ${T('to_camp')}</button>`}
        ${r.partyGone ? '' : `<button class="btn ghost" data-a="map">${T('to_map')}</button>`}
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
      if (a === 'title') { ZG.Save.remove(ZG.Save.slot); ZG.Save.current = null; go(UI.showTitle); }
    }));
  };

  /* ============================== Лагерь ============================== */
  UI.campHero = 0;
  UI.showCamp = function (refresh) {
    if (!refresh) UI.campOpen = new Set(); // при входе в лагерь все ряды склада свёрнуты
    ZG.Audio.music('shelter');
    setTimeout(() => UI.tip('camp'), 600);
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
    const tabs = camp.party.map((p, i) => `<div class="tab ${p === ph ? 'on' : ''}" data-h="${i}" style="--hc:${ZG.HEROES[p.id].color}">${UI.avatar(p.id)} ${esc(ZG.heroShort(p.id))}${p.featsPending ? '<span class="dot"></span>' : ''}${!g.deckValid(p) ? '<span class="dot bad"></span>' : ''}</div>`).join('');
    const featBox = ph.featsPending ? `<div class="feat-box"><h4>${ZG.icon('star')} ${T('camp_feat_pick')} (${ph.featsPending})</h4><div class="feat-opts">
      ${ZG.ATTRS.map((a) => {
        const cur = ph.feats.attr[a] || 0;
        return `<button class="choice" data-feat="attr:${a}" ${cur >= 3 ? 'disabled' : ''}><b>+1 ${esc(T('attr_' + a))}</b><span>сейчас ${hd.attrs[a].replace('d', T('die'))}${g.attrBonus(ph, a) ? (g.attrBonus(ph, a) > 0 ? '+' : '') + g.attrBonus(ph, a) : ''} (макс. +3)</span></button>`;
      }).join('')}
      <button class="choice" data-feat="hand" ${(ph.feats.hand || 0) >= 2 || ph.featsPending < 2 ? 'disabled' : ''}><b>${T('feat_hand')} · 2 опыта</b><span>сейчас ${g.handSize(ph)} (макс. +2)</span></button>
      ${Object.keys(ZG.PROF).filter((k) => !g.hasProf(ph, k)).map((k) => `<button class="choice" data-feat="prof:${k}" ${ph.featsPending < 2 ? 'disabled' : ''}><b>Владение: ${esc(ZG.PROF[k].name)} · 2 опыта</b><span>${k === 'heavyarmor' ? 'тяжёлая броня больше не сгорает после блока' : 'без штрафа −4 к проверке'}</span></button>`).join('')}
      ${ZG.CARD_TYPES.map((t) => `<button class="choice" data-feat="slot:${t}"><b>+1 слот: ${esc(T('slot_' + t))}</b><span>колода станет больше — это лишнее «здоровье»</span></button>`).join('')}
      ${ph.scars.length ? `<button class="choice" data-feat="scar"><b>${T('feat_scar')}</b><span>${esc(ZG.SCARS.find((x) => x.id === ph.scars[0].id).text)}</span></button>` : ''}
    </div></div>` : '';
    const groups = ZG.CARD_TYPES.map((t) => {
      const mine = ph.deck.map((id, i) => ({ id, i })).filter((x) => ZG.card(x.id).type === t);
      const avail = reserve.filter((id) => ZG.card(id).type === t);
      const uniq = [...new Set(avail)].sort((a, b) => g.cardValue(b) - g.cardValue(a));
      const isNew = (id) => (camp.newIds || []).includes(id);
      const cnt = mine.length;
      const ok = cnt === comp[t];
      const empties = Array.from({ length: Math.max(0, comp[t] - cnt) }, () => `<div class="empty-slot">Пустой слот<br>${esc(T('slot_' + t))}</div>`).join('');
      return `<div class="type-group"><h4>${esc(T('type_' + t))} <span class="cnt ${ok ? 'ok' : 'bad'}">${cnt}/${comp[t]}</span></h4>
        <div class="card-row">${mine.map((x) => UI.cardHTML(x.id, { size: 'mini', title: 'Убрать в склад', badge: g.cardWarn(ph.id, x.id), isNew: isNew(x.id) }).replace('class="card', `data-rm="${x.i}" class="card`)).join('')}${empties}</div>
        ${uniq.length ? `<button class="vault-toggle ${UI.campOpen.has(t) ? 'open' : ''}" data-vt="${t}">${ZG.icon('backpack')} ${T('camp_vault')}: ${uniq.length} ${ZG.plural(uniq.length, 'вид', 'вида', 'видов')} <span class="vt-arrow">${UI.campOpen.has(t) ? '▴ свернуть' : '▾ показать'}</span></button><div class="card-row vault-row" ${UI.campOpen.has(t) ? '' : 'hidden'}><div class="vault-up" title="Карта со склада уходит в ряд колоды выше"><b>▲</b><span>в колоду</span></div>${uniq.map((id) => UI.cardHTML(id, { size: 'mini', cls: 'out', isNew: isNew(id), badge: '×' + ZG.count(avail, (x) => x === id) + (g.cardWarn(ph.id, id) ? ' · ' + g.cardWarn(ph.id, id) : ''), title: g.cardWarn(ph.id, id) ? 'Герою не подходит: ' + g.cardWarn(ph.id, id) : 'Взять в колоду' }).replace('class="card', `data-add="${id}" class="card`)).join('')}</div>` : ''}
        ${uniq.length
          ? `<div class="sec-label muted" style="margin-top:6px">${T('camp_supply')}: только когда на складе не осталось карт этого типа</div>`
          : `<div class="sec-label" style="margin-top:6px">${T('camp_supply')}: ${G().BASICS[t].map((id) => `<a href="#" data-basic="${id}" style="color:var(--amber)">${esc(ZG.card(id).name)}</a>`).join(', ')}</div>`}
      </div>`;
    }).join('');
    const s = show(`<div class="screen" data-peek><div class="page">
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
          <div class="prof">Владение: ${[...(hd.prof || []), ...(ph.feats.prof || [])].length ? [...(hd.prof || []), ...(ph.feats.prof || [])].map((k) => esc(ZG.PROF[k].name)).join(', ') : 'нет'}</div>
          ${ph.scars.length ? `<div><b class="scar">${T('scars')}:</b>${ph.scars.map((x) => `<div class="scar">${esc(ZG.SCARS.find((y) => y.id === x.id).text)}</div>`).join('')}</div>` : ''}
        </div>
        <div class="deck-section panel">
          ${featBox}
          <p class="muted" style="margin-top:0">Нажмите на карту колоды, чтобы вернуть её на склад. Чтобы взять карту со склада, откройте его кнопкой «Общий склад» под нужным рядом. Базовые запасы бесконечны, но брать их можно, только когда на складе не осталось карт этого типа.</p>
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
    s.querySelectorAll('[data-vt]').forEach((b) => b.addEventListener('click', () => {
      const t = b.dataset.vt;
      if (UI.campOpen.has(t)) UI.campOpen.delete(t); else UI.campOpen.add(t);
      const open = UI.campOpen.has(t);
      b.classList.toggle('open', open);
      b.querySelector('.vt-arrow').textContent = open ? '▴ свернуть' : '▾ показать';
      b.nextElementSibling.hidden = !open;
    }));
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
      if (g.reserve().some((x) => ZG.card(x).type === t)) return UI.toast('Сначала возьмите карты этого типа со склада', 'bad');
      camp.vault.push(id);
      ph.deck.push(id);
      rerender();
    }));
    s.querySelectorAll('[data-feat]').forEach((b) => b.addEventListener('click', () => {
      const [k, v] = b.dataset.feat.split(':');
      if (k === 'attr') ph.feats.attr[v] = (ph.feats.attr[v] || 0) + 1;
      const cost = k === 'hand' || k === 'prof' ? 2 : 1;
      if (ph.featsPending < cost) return;
      if (k === 'hand') ph.feats.hand = (ph.feats.hand || 0) + 1;
      if (k === 'prof') ph.feats.prof = [...(ph.feats.prof || []), v];
      if (k === 'slot') { ph.feats.slots[v] = (ph.feats.slots[v] || 0) + 1; }
      if (k === 'scar') ph.scars.shift();
      ph.featsPending -= cost;
      ZG.FX.burstAt(b, 'gold', 50);
      UI.toast(`${ZG.icon('star')} ${esc(ZG.heroShort(ph.id))}: улучшение получено`, 'loot');
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
      go(UI.showMap, 'right');
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
        <li><b>Часы.</b> Переворачивается карта Часов. Иногда это событие (сирена, голод, вой): его карта задерживается на экране, а затем остаётся плашкой «Событие хода» в верхней панели — по клику можно перечитать. Каждые 5 ходов день сменяется ночью; на рассвете шум всех локаций снижается на 1. В Часах 30 карт при любом размере отряда: одиночке хватает времени, но ему приходится справляться со всем самому, а большой отряд делит время на всех. Некоторые миссии добавляют или убирают карты Часов. Ночью все враги — и мертвецы, и люди — получают +2 к сложности боя (в отряде из 3+ героев и на высокой сложности +3), а проверки поиска становятся на 1 сложнее.</li>
        <li><b>Идти.</b> До исследования можно перейти в любую локацию.</li>
        <li><b>Исследовать.</b> Откройте верхнюю карту локации и разберитесь с ней. Одно исследование бесплатно; карты вроде «Пёс Рекс» или «Надежда» дают ещё.</li>
        <li><b>Заколотить.</b> Если колода локации пуста — попробуйте её заколотить (проверка «Заколотить», одна попытка за ход). Победив вожака, можно попытаться сразу, даже если в колоде ещё есть карты. Если при успехе в колоде притаилась Угроза, локация не закрывается: все остальные карты изгоняются, а Угроза остаётся в колоде — теперь её можно найти.</li>
        <li><b>Конец хода.</b> Обновите руку: можно сбросить любые ненужные карты (лишние сверх размера руки — обязательно), затем доберите руку из колоды. <b>Если добирать нечего — герой погибает.</b></li>
      </ol>
      <p>В любой момент своего хода можно играть карты с действием (лечение, разведка, ещё одно исследование) и один раз передать карту соседу по локации.</p>
      <h2>Проверки и кубики</h2>
      <p>Каждая проверка: кубик навыка героя (d4–d12) + бонус навыка + карты. Сумма должна быть не меньше сложности. В проверку можно сыграть <b>по одной карте каждого типа от каждого героя</b>: оружие, снаряжение, расходник, союзник, приём, решимость. Решимость можно отдать соседу по локации.</p>
      <ul>
        <li><b>Показать</b> — карта остаётся в руке. <b>Сбросить</b> — в сброс (лечение может вернуть её в колоду). <b>Перезарядить</b> — под низ колоды. <b>Сжечь</b> — карта сгорает навсегда: она не лечится и не возвращается на склад после миссии (так работают все расходники). Опустевшие слоты в лагере заполняются базовыми запасами. <b>Изгнать</b> — навсегда.</li>
        <li><b>Навык и характеристика.</b> Каждый навык опирается на характеристику: Медицина и Техника — на Смекалку, Рукопашная — на Силу, Стрельба и Скрытность — на Ловкость, Выживание — на Выдержку, Убеждение — на Волю. Если нужного навыка у героя нет, он всё равно проходит проверку: бросает кубик этой характеристики без бонуса навыка. Если в проверке указано несколько вариантов («Медицина / Ловкость»), берётся лучший для героя.</li>
        <li>Бой без оружия — Сила, Ловкость или Рукопашная. Оружие задаёт свой навык и добавляет кубики.</li>
        <li>Панель проверки показывает точный шанс успеха.</li>
      </ul>
      <h2>Встречи</h2>
      <ul>
        <li><b>Мертвецы и люди:</b> победа — карта уходит из игры. Поражение — урон, равный разнице (но не больше 3 у обычных врагов, 4 у вожаков, 5 у Угрозы), и враг возвращается в колоду локации. Укус, если прошло 2+ урона, — Инфекция. Мимо некоторых врагов можно пройти, а от некоторых нельзя уклониться — это написано на их карте.</li>
        <li><b>Находки</b> (оружие, снаряжение, расходники, союзники, решимость): пройдите проверку — карта ваша до конца кампании. Провал — находка потеряна. Если миссия провалена, каждый выживший герой уносит только одну находку на свой выбор.</li>
        <li><b>Препятствия:</b> ловушки, пожары, моральный выбор.</li>
      </ul>
      <h2>Урон, инфекция, смерть</h2>
      <p>Урон — сброс карт из руки (Инфекцию сбросить как урон нельзя). Колода — это здоровье. Карты с действием «Блок» (куртка, шлем, крышка от бака, бронежилет, обезболивающее, Вышибала Тони, «Чудом уцелел») сыгрываются в окне урона и блокируют часть или весь урон — по одной карте каждого типа. Если у карты типа «Снаряжение» есть признак «Щит» (крышка от бака, тактический щит), её можно сыграть вместе с другой блокирующей картой «Снаряжение» без этого признака — но только один щит за раз. Укус замешивает в колоду <b>Инфекцию</b>: её нельзя сыграть, а <b>три Инфекции превращают героя в мертвеца</b>. Погибшие герои возвращаются в лагерь со шрамом, но теряют найденное в этой миссии.</p>
      <h2>Приёмы</h2>
      <p>Приёмы — отдельный тип карт (удары, выстрелы, медицина, самоделки). Внизу карты указана проверка перезарядки, например «↻ Медицина 6». После применения герой бросает лучший из указанных навыков, которые у него есть: успех — карта уходит под низ колоды и вернётся, провал — в сброс.</p>
      <p><b>Здесь нужен именно навык, а не характеристика.</b> Если у героя нет ни одного из указанных навыков, приём после применения <b>сгорает навсегда</b> (например, «Шов на ходу» с перезарядкой Медициной у Грома). Если в списке есть характеристика (например, Воля), она есть у всех — такой приём не сгорает. Подсказка «Без навыка — сгорает» видна при наведении на строку перезарядки, а автосборка колоды в лагере не кладёт герою приёмы, которые у него сгорят.</p>
      <h2>Владение</h2>
      <p>Огнестрел, тяжёлое оружие и тяжёлая броня требуют владения. Без него оружие даёт −4 к проверке, а тяжёлая броня сгорает после блока. Владение указано на карточке героя.</p>
      <h2>Состояния</h2>
      <ul>${Object.values(ZG.CONDS).map((c) => `<li><b>${c.name}.</b> ${c.text}</li>`).join('')}</ul>
      <p>Состояния снимаются только картами и способностями: медицинскими приёмами, Антибиотиками, Консервами, Полевой медициной Марины и т. п. Сами по себе они не проходят: держатся до конца миссии. Бесплатного отдыха нет.</p>
      <h2>Типы урона</h2>
      <p>Некоторые враги, ловушки и локации наносят урон <b>кислотой, холодом, электричеством или огнём</b> (указано на карте). Броня (карты с признаком «Броня») защищает только от <b>физического</b> урона — кислота, холод, электричество и огонь проходят сквозь неё. От них спасает специальное снаряжение (Противогаз и Костюм химзащиты — от кислоты, Самоспасатель — от любого нефизического урона), а также лекарства, союзники и Решимость. Герой с состоянием «Уязвимость» не может уменьшить такой урон ничем.</p>
      <h2>Особые правила локаций</h2>
      <p>У многих локаций есть свои правила (написаны на карточке): проверка при входе или в конце хода, цена попытки заколотить, заколачивание без проверки ценой сожжённой карты, двойная проверка, штраф за проваленную попытку заколотить, орда наверх колоды, тихие укрытия, опасный огнестрел и другие.</p>
      <h2>Уникальное в миссиях</h2>
      <p>В каждой миссии в колоды локаций замешиваются свои особые находки (около 4 видов) и свои виды врагов — без привязки к конкретной локации. Найдёте ли вы их — вопрос удачи.</p>
      <h2>Уязвимости врагов</h2>
      <p>У врагов бывают уязвимости (карта с этим свойством даёт дополнительный кубик), стойкость (штраф к проверке) и иммунитет (кубики таких карт не считаются). Свойства карты указаны в её типе: «Огонь», «Кислота», «Тихое», «Тяжёлое», «Огнестрел», «Ближнее», «Дальнее». Кислота, огонь, электричество и холод — нефизический урон: как он подействует, зависит от свойств врага (уязвимость, стойкость, иммунитет). Едкая смазка добавляет кислоту оружию ближнего боя на одну атаку. <b>Бронежилет</b> врага даёт штраф к броску против любого физического удара — ближнего, дальнего и без оружия, — но не замечает огонь, кислоту, электричество и холод. <b>Каска</b> даёт штраф только к проверкам Силой и Рукопашной.</p>
      <h2>Награды за заколоченные локации</h2>
      <p>У каждой локации есть награда «Когда заколочено» (видна на карточке локации): лишние ходы Часов, лечение, находка, тишина или снятие состояний. Выбирайте, что закрывать первым.</p>
      <h2>Шум и орда</h2>
      <p>Громкое оружие, крикуны и ловушки поднимают шум локации. Когда шум достигает порога — приходит <b>Орда</b>. Если ходящий герой в этой локации, первый мертвец сразу нападает на него (исследование при этом не тратится), а остальные замешиваются в колоду. Если героя там нет — в колоду уходят все. Когда порог достигнут событием Часов в начале хода, ходящим считается герой, чей ход начинается. Тихое оружие, глушитель и сигнальные ракеты помогают.</p>
      <h2>Заколачивание и Угроза</h2>
      <p>Победив <b>вожака</b>, можно сразу попытаться заколотить его локацию, даже если в ней ещё есть карты. Это единственный шанс: если отказаться или провалить проверку, локацию придётся вычищать до пустой колоды. Лечение возможно только картами, способностями героев, событиями Часов и наградами за заколоченные локации.</p>
      <h3>Встреча с Угрозой</h3>
      <ol>
        <li><b>Перед боем</b> герои в других открытых локациях могут временно перекрыть их — проверкой «Заколотить» своей локации, в любом порядке. Локацию, где находится Угроза, так перекрыть нельзя. Перекрытие — это то же условие «При закрытии», что и при заколачивании: с ценой попытки, двойной проверкой или сжиганием карты, если они указаны, и со штрафом за провал. Но эффекты окончательного закрытия не срабатывают: награды «Когда заколочено» нет, карты не убираются, а перекрытие действует только на эту встречу.</li>
        <li><b>Если Угроза побеждена</b> и других Угроз в колоде её локации нет — локация заколачивается автоматически, без проверки: все оставшиеся карты изгоняются, срабатывает награда «Когда заколочено», а герои оттуда отступают в другие локации.</li>
        <li>Если все открытые локации заколочены или перекрыты — Угроза загнана в угол, победа.</li>
        <li>Иначе Угроза скрывается: в каждую неперекрытую открытую локацию замешивается по карте — в одну сама Угроза, в остальные «Ложный след» (+1 исследование). Где она — неизвестно.</li>
        <li>Если Угрозу не победили — она возвращается в колоду своей локации, перекрытия снимаются.</li>
      </ol>
      
      <h2>Лагерь</h2>
      <p>За первую победу в каждой миссии каждый выживший герой получает 1 опыт (погибший в миссии опыта не получает, но может заработать его, переиграв миссию). Обращённый герой потерян для кампании навсегда. За 1 опыт: +1 к характеристике (до +3), +1 слот колоды или лечение шрама. За 2 опыта: +1 к размеру руки (до +2) или новое владение (Огнестрел, Тяжёлое оружие, Тяжёлая броня). В лагере колоды пересобираются из общего склада находок.</p>
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
      <div class="set-row"><span>3D-кубики</span><div class="seg" data-k="dice3d"><button data-v="1">${T('on')}</button><button data-v="0">${T('off')}</button></div></div>
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
    const opts = [{ label: 'Вернуться в игру', primary: true }, { label: T('rules') }, { label: T('settings') }, { label: T('quit_mission'), sub: 'Прогресс сохранён на начало текущего хода' }];
    if (UI.devOn()) opts.push({ label: 'Галерея', sub: 'Все карты, локации, миссии и состояния' });
    UI.menuOpen = true;
    const i = await UI.choose({ title: 'Меню', text: T('save_note'), options: opts, escIndex: 0 }); // Esc = «Вернуться в игру»
    UI.menuOpen = false;
    if (i === 1) UI.showRules();
    if (i === 2) UI.showSettings();
    if (i === 3) {
      ZG.Save.current = null;
      location.reload();
    }
    if (i === 4) UI.showGallery();
  };

  /* ============================== Галерея разработчика (код test1) ============================== */
  UI.devOn = () => !!(ZG.Settings.data && ZG.Settings.data.dev);
  {
    // код набирается на клавиатуре в меню (главном или игровом); по физическим клавишам — работает в любой раскладке
    const CODE = 'test1';
    const KEYS = { KeyT: 't', KeyE: 'e', KeyS: 's', Digit1: '1', Numpad1: '1' };
    let buf = '';
    document.addEventListener('keydown', (e) => {
      if (UI.devOn()) return;
      if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
      const inMenu = UI.menuOpen || document.querySelector('.title-screen');
      if (!inMenu) { buf = ''; return; }
      buf = (buf + (KEYS[e.code] || '#')).slice(-CODE.length);
      if (buf !== CODE) return;
      ZG.Settings.data.dev = true; ZG.Settings.save();
      UI.toast(`${ZG.icon('cards')} Галерея открыта`, 'loot');
      if (document.querySelector('.title-screen')) UI.showTitle();
      else if (UI.menuOpen) {
        const list = document.querySelector('#overlay-root .overlay:last-child .choice-list');
        if (list) {
          const btn = ZG.html('<button class="choice"><b>Галерея</b><span>Все карты, локации, миссии и состояния</span></button>');
          btn.addEventListener('click', async () => { const ov = btn.closest('.overlay'); UI.menuOpen = false; UI.showGallery(); if (ov) { UI.closeOverlay(ov); } });
          list.appendChild(btn);
        }
      }
    });
  }

  UI.showGallery = function () {
    const types = ['weapon', 'item', 'consumable', 'ally', 'resolve', 'technique', 'enemy', 'living', 'event', 'henchman', 'boss', 'objective', 'decoy', 'infection'];
    const all = Object.values(ZG.CARDS).filter((d) => d && d.id && !d.heroArt);
    const tkey = (d) => (d.type === 'enemy' && d.living ? 'living' : d.type);
    const groups = types.map((t) => ({ t, list: all.filter((d) => tkey(d) === t) })).filter((g) => g.list.length);
    const other = all.filter((d) => !types.includes(tkey(d)));
    if (other.length) groups.push({ t: 'other', list: other });
    const sortCards = (a, b) => (a.tier || 0) - (b.tier || 0) || ZG.cardName(a).localeCompare(ZG.cardName(b), 'ru');
    const cardsTab = groups.map((g) => `<div class="gal-group" data-g><h3>${esc(g.t === 'other' ? 'Прочее' : T('type_' + g.t))} <span class="muted">· ${g.list.length}</span></h3>
      <div class="gal-row">${g.list.sort(sortCards).map((d) => UI.cardHTML(d.id, { size: 'mini' }).replace('class="card', `data-name="${esc(ZG.cardName(d).toLowerCase())}" class="card`)).join('')}</div></div>`).join('');
    const locsTab = ZG.MISSIONS.map((mi) => `<div class="gal-group" data-g><h3>Миссия ${mi.num}: ${esc(mi.name)}</h3>
      <div class="gal-row">${mi.locations.filter((id) => ZG.LOCATIONS[id]).map((id) => UI.locCardHTML({ id }, 'mini').replace('class="card', `data-name="${esc(ZG.LOCATIONS[id].name.toLowerCase())}" class="card`)).join('')}</div></div>`).join('');
    const mini = (id) => (ZG.card(id) ? UI.cardHTML(id, { size: 'mini' }) : '');
    const missionsTab = ZG.MISSIONS.map((mi) => `<div class="gal-mission panel">
      <div class="gm-head">${ZG.art('missions', mi.id, mi.icon)}<div><div class="muted">Миссия ${mi.num} · ${esc(mi.place || '')} · уровень ${mi.tier}</div><h3>${esc(mi.name)}</h3></div></div>
      <p><b>Цель.</b> ${esc(mi.goal || '')}</p>
      ${mi.rule ? `<p><b>Особое правило.</b> ${esc(mi.rule)}</p>` : ''}
      <p><b>Локации:</b> ${mi.locations.map((id) => esc((ZG.LOCATIONS[id] || {}).name || id)).join(', ')}</p>
      <p><b>События Часов:</b> ${(mi.clockEvents || []).map((id) => esc((ZG.CLOCK[id] || {}).name || id)).join(', ')}</p>
      ${mi.reward ? `<p><b>Награда:</b> ${esc(mi.reward.text)}</p>` : ''}
      <div class="gal-row">${mini(mi.boss)}${mini(mi.henchman)}${mi.reward ? mini(mi.reward.card) : ''}</div>
    </div>`).join('');
    const condsTab = `<div class="gal-conds">${Object.keys(ZG.CONDS).map((k) => `<div class="gal-cond panel"><h3>${ZG.icon(ZG.CONDS[k].icon)} ${esc(ZG.CONDS[k].name)}</h3><p>${esc(ZG.CONDS[k].text)}</p></div>`).join('')}</div>
      <h3 style="margin-top:18px">События Часов</h3><div class="gal-conds">${Object.values(ZG.CLOCK).map((c) => `<div class="gal-cond panel"><h3>${ZG.icon(c.icon)} ${esc(c.name || (c.names || [])[0] || c.id)}</h3><p>${esc(c.text || 'Ничего не происходит.')}</p></div>`).join('')}</div>`;
    const TABS = [['cards', `Карты (${all.length})`, cardsTab], ['locs', 'Локации', locsTab], ['missions', 'Миссии', missionsTab], ['conds', 'Состояния', condsTab]];
    const ov = UI.overlay(`<div class="gallery panel" data-peek>
      <div class="gal-head"><h2>${ZG.icon('cards')} Галерея</h2>
        <div class="gal-tabs">${TABS.map(([k, l], i) => `<button class="tab ${i ? '' : 'on'}" data-gt="${k}">${esc(l)}</button>`).join('')}</div>
        <input class="gal-search" type="search" placeholder="Поиск по названию…">
        <button class="btn icon ghost" data-x title="Закрыть">${ZG.icon('x')}</button></div>
      <div class="gal-body">${TABS.map(([k, , h], i) => `<div class="gal-pane" data-gp="${k}" ${i ? 'hidden' : ''}>${h}</div>`).join('')}</div>
    </div>`);
    const close = () => UI.closeOverlay(ov);
    ov.querySelector('[data-x]').addEventListener('click', close);
    ov.addEventListener('click', (e) => { if (e.target === ov) close(); });
    const search = ov.querySelector('.gal-search');
    const filter = () => {
      const q = search.value.trim().toLowerCase();
      ov.querySelectorAll('.gal-pane [data-name]').forEach((el) => { el.hidden = !!q && !el.dataset.name.includes(q); });
      ov.querySelectorAll('.gal-group').forEach((g) => { g.hidden = !!q && !g.querySelector('[data-name]:not([hidden])'); });
    };
    search.addEventListener('input', filter);
    ov.querySelectorAll('[data-gt]').forEach((b) => b.addEventListener('click', () => {
      ov.querySelectorAll('[data-gt]').forEach((x) => x.classList.toggle('on', x === b));
      ov.querySelectorAll('[data-gp]').forEach((p) => { p.hidden = p.dataset.gp !== b.dataset.gt; });
      ov.querySelector('.gal-body').scrollTop = 0;
    }));
  };
})();
