/* Движок миссии: ходы, исследование, проверки, урон, инфекция, шум, баррикады, угроза */
(function () {
  'use strict';
  const ZG = window.ZG;
  const R = ZG.rng;
  const T = ZG.T;
  const G = (ZG.Game = {});
  const UI = () => ZG.UI;

  G.S = () => ZG.Save.current;
  G.M = () => ZG.Save.current && ZG.Save.current.mission;
  G.def = () => ZG.MISSIONS[G.M().idx];
  G.ph = (mh) => G.S().campaign.party[mh.pi];
  G.hdef = (mh) => ZG.HEROES[mh.id];

  /* ============================== Статы героя ============================== */
  G.attrBonus = (ph, attr) => (ph.feats.attr[attr] || 0) - ph.scars.filter((s) => s.attr === attr).length;
  G.skillValue = (ph, skill) => {
    const hd = ZG.HEROES[ph.id];
    const attr = ZG.attrOf(skill);
    const die = hd.attrs[attr];
    let bonus = G.attrBonus(ph, attr);
    if (skill !== attr) bonus += hd.skills[skill] || 0;
    return { die, bonus };
  };
  G.skillScore = (ph, skill) => {
    const v = G.skillValue(ph, skill);
    return ZG.dieAvg(v.die) + v.bonus + (ZG.HEROES[ph.id].skills[skill] ? 0.01 : 0);
  };
  G.handSize = (ph) => Math.max(2, ZG.HEROES[ph.id].hand + (ph.feats.hand || 0) - ph.scars.filter((s) => s.hand).length);
  G.deckComp = (ph) => {
    const base = ZG.HEROES[ph.id].deck;
    const out = {};
    ZG.CARD_TYPES.forEach((t) => (out[t] = base[t] + ((ph.feats.slots || {})[t] || 0)));
    return out;
  };
  G.nightBonus = () => (G.S().difficulty === 'hard' || (G.M() && G.M().heroes.length >= 3) ? 3 : 2);
  G.special = () => (G.M() ? ZG.MISSIONS[G.M().idx].special || {} : {});
  G.phaseAt = (pos) => (G.special().forceNight ? 'night' : Math.floor((Math.max(1, pos) - 1) / 5) % 2 ? 'night' : 'day');

  /* ============================== Экземпляры карт ============================== */
  G.inst = (id, flags) => {
    const m = G.M();
    return Object.assign({ u: m.uid++, id }, flags || {});
  };
  G.allPiles = (mh) => [...mh.deck, ...mh.hand, ...mh.discard, ...(mh.displayed || []), ...(mh.buried || [])];

  /* ============================== Владение, состояния ============================== */
  /** Владение: врождённое у героя или выученное за опыт в лагере */
  G.learnedProf = (id) => { const S = G.S(); const ph = S && S.campaign && S.campaign.party.find((p) => p.id === id); return (ph && ph.feats && ph.feats.prof) || []; };
  G.hasProf = (mh, key) => (ZG.HEROES[mh.id].prof || []).includes(key) || G.learnedProf(mh.id).includes(key);
  /** Каких владений не хватает герою для карты */
  G.missingProf = (mh, id) => {
    const d = ZG.card(id);
    return Object.keys(ZG.PROF).filter((k) => (d.traits || []).includes(ZG.PROF[k].trait) && !G.hasProf(mh, k));
  };
  G.conds = (mh) => (mh.conds = mh.conds || {});
  G.addCond = async function (mh, key) {
    if (mh.dead) return;
    const c = G.conds(mh);
    if (c[key]) return;
    c[key] = key === 'vuln' || key === 'doom' || key === 'poison' ? 3 : 1;
    G.log(`${G.hname(mh)}: состояние «${ZG.CONDS[key].name}».`, 'bad');
    await UI().fxCond(mh, key);
  };
  G.clearConds = function (mh, keys) {
    const c = G.conds(mh);
    const had = Object.keys(c).filter((k) => (keys ? keys.includes(k) : k !== 'detained'));
    had.forEach((k) => delete c[k]);
    if (had.length) G.log(`${G.hname(mh)}: снято — ${had.map((k) => ZG.CONDS[k].name).join(', ')}.`, 'good');
    return had.length;
  };
  G.handSizeMh = (mh) => Math.max(2, G.handSize(G.ph(mh)) + ZG.sum((mh.displayed || []).map((c) => (ZG.card(c.id).displayed || {}).hand || 0)));
  /** Эффективный режим карты урона: тяжёлая броня без владения сгорает */
  G.effMode = (mh, id, pl) => (pl.on === 'damage' && G.missingProf(mh, id).includes('heavyarmor') ? 'burn' : pl.mode);

  /** Проверка перезарядки приёма */
  G.techRecharge = function (owner, c) {
    const d = ZG.card(c.id);
    const rc = d.recharge || { skills: [], dc: 99 };
    const hd = ZG.HEROES[owner.id];
    // навык должен быть у героя; характеристика (например, Воля) есть у всех
    const known = rc.skills.filter((sk) => ZG.ATTRS.includes(sk) || (hd.skills[sk] || 0) > 0);
    if (!known.length) {
      (owner.burned = owner.burned || []).push(c);
      G.log(`«${d.name}»: у ${G.hname(owner)} нет навыка — приём сгорает.`, 'bad');
      UI().toast(`${ZG.icon('fire')} «${ZG.esc(d.name)}» сгорает: нет навыка`, 'bad');
      return;
    }
    const ph = G.ph(owner);
    const sk = known.sort((a, b) => G.skillScore(ph, b) - G.skillScore(ph, a))[0];
    const v = G.skillValue(ph, sk);
    const roll = ZG.rollDie(v.die) + v.bonus;
    if (roll >= rc.dc) {
      owner.deck.push(c);
      G.log(`«${d.name}»: перезарядка ${ZG.skillName(sk)} ${roll}/${rc.dc} — под низ колоды.`, 'good');
      UI().toast(`${ZG.icon('swap')} «${ZG.esc(d.name)}» перезаряжен (${roll}/${rc.dc})`, 'loot');
    } else {
      owner.discard.push(c);
      G.log(`«${d.name}»: перезарядка ${ZG.skillName(sk)} ${roll}/${rc.dc} — в сброс.`, 'bad');
      UI().toast(`«${ZG.esc(d.name)}» в сброс (${roll}/${rc.dc})`, 'bad');
    }
  };
  G.infCount = (mh) => ZG.count(G.allPiles(mh), (i) => i.id === 'infection');
  G.heroesAt = (li, aliveOnly = true) => G.M().heroes.filter((h) => h.loc === li && (!aliveOnly || !h.dead));
  G.loc = (mh) => G.M().locations[mh.loc];
  G.ldef = (loc) => ZG.LOCATIONS[loc.id];
  G.lrule = (loc) => (loc && ZG.LOCATIONS[loc.id].rules) || {};
  G.openLocs = () => G.M().locations.filter((l) => !l.closed);
  G.hname = (mh) => ZG.heroShort(mh.id);

  G.log = (text, kind) => {
    const m = G.M();
    if (!m) return;
    m.log.push({ t: text, k: kind || '', turn: m.turn });
    if (m.log.length > 250) m.log.shift();
    UI() && UI().logAdded && UI().logAdded();
  };

  G.removeFrom = (pile, u) => {
    const i = pile.findIndex((c) => c.u === u);
    return i >= 0 ? pile.splice(i, 1)[0] : null;
  };
  G.findOwner = (u) => {
    for (const h of G.M().heroes) if (h.hand.some((c) => c.u === u)) return h;
    return null;
  };
  /** Переместить карту из руки владельца согласно режиму */
  G.moveByMode = (owner, u, mode) => {
    if (mode === 'reveal') return;
    const c = G.removeFrom(owner.hand, u);
    if (!c) return;
    if (mode === 'discard') owner.discard.push(c);
    else if (mode === 'recharge') owner.deck.push(c);
    else if (mode === 'burn') { (owner.burned = owner.burned || []).push(c); }
    else if (mode === 'technique') G.techRecharge(owner, c);
    else if (mode === 'display') { (owner.displayed = owner.displayed || []).push(c); }
    else if (mode === 'banish') { /* карта уходит в коробку навсегда */ }
    else if (mode === 'bury') { (owner.buried = owner.buried || []).push(c); } // до конца миссии
  };

  /* ============================== Создание миссии ============================== */
  G.LOC_SIZE = 7;
  G.CLOCK_BY_PARTY = [20, 25, 27, 30];
  G.enemyDmgType = (def, loc) => def.dmgType || ((G.ldef(loc).rules || {}).enemyDmgType) || null;
  G.dmgCap = (def) => def.maxDmg || (def.type === 'boss' ? 5 : def.type === 'henchman' ? 4 : 3);
  G.newMission = function (idx) {
    const S = G.S();
    const def = ZG.MISSIONS[idx];
    const camp = S.campaign;
    G.ensureDecks();
    const party = camp.party;
    const n = Math.min(def.locations.length, party.length + 2);
    const m = {
      idx, uid: 1, turn: 0, active: 0, clock: [], clockPos: 0, locations: [], heroes: [], log: [],
      phase: 'day', stats: { kills: 0, finds: 0, hordes: 0 }, reserve: [], turnMods: {}, ts: null, over: false,
    };
    S.mission = m;
    S.screen = 'mission';

    // резерв склада = склад минус колоды героев
    const vault = camp.vault.slice();
    party.forEach((ph) => ph.deck.forEach((id) => {
      const i = vault.indexOf(id);
      if (i >= 0) vault.splice(i, 1);
    }));
    m.reserve = vault;

    const tier = def.tier;
    const special = def.special || {};
    const MAP = { e: 'enemy', w: 'weapon', i: 'item', c: 'consumable', a: 'ally', r: 'resolve', v: 'event' };
    def.locations.slice(0, n).forEach((lid) => {
      const ld = ZG.LOCATIONS[lid];
      const deck = [];
      Object.keys(ld.deck).forEach((k) => {
        for (let i = 0; i < ld.deck[k]; i++) deck.push(G.inst(ZG.boxPick(MAP[k], tier)));
      });
      if (R.next() < 0.6) deck.push(G.inst(ZG.boxPick('technique', tier)));
      // колода локации: 7 случайных карт из состава (минимум 2 врага)
      R.shuffle(deck);
      const isE = (c) => ZG.isEnemy(ZG.card(c.id));
      const trimmed = [];
      deck.filter(isE).slice(0, 2).forEach((c) => trimmed.push(c));
      const size = party.length >= 3 ? G.LOC_SIZE - 1 : G.LOC_SIZE;
      deck.forEach((c) => { if (trimmed.length < size && !trimmed.includes(c)) trimmed.push(c); });
      deck.length = 0;
      deck.push(...trimmed);
      if (special.extraEnemy) deck.push(G.inst(special.extraEnemy));
      m.locations.push({ id: lid, deck, noise: 0, closed: false, limit: Math.max(3, ld.noise + (special.noiseLimitMod || 0)) });
    });
    if (special.objective) {
      m.obj = 0;
      for (let i = 0; i < special.objective.count; i++) {
        const l = m.locations[i % m.locations.length];
        l.deck.push(G.inst(special.objective.card));
      }
    }
    if (special.forceNight) m.phase = 'night';
    const villains = R.shuffle([def.boss, ...Array(n - 1).fill(def.henchman)]);
    m.locations.forEach((l, i) => {
      l.deck.push(G.inst(villains[i]));
      R.shuffle(l.deck);
    });
    // особое правило: дополнительные вожаки (несколько в одной локации)
    if (special.extraHench) {
      const targets = special.extraHench === 'all' ? m.locations.slice() : R.shuffle(m.locations.slice()).slice(0, Math.min(special.extraHench, m.locations.length));
      targets.forEach((l) => {
        l.deck.push(G.inst(def.henchman));
        R.shuffle(l.deck);
      });
    }

    // Часы
    const len = G.CLOCK_BY_PARTY[Math.min(4, party.length) - 1] - (S.difficulty === 'hard' ? 4 : 0) + (special.clockMod || 0) + (def.act === 2 ? (party.length >= 3 ? 5 : party.length === 2 ? 3 : 0) : 0);
    const evCount = Math.round(len * 0.3);
    const evs = [];
    for (let i = 0; i < evCount; i++) evs.push(def.clockEvents[i % def.clockEvents.length]);
    const cards = evs.map((id) => ({ id }));
    while (cards.length < len - 2) cards.push({ id: 'calm', name: R.pick(ZG.CLOCK.calm.names) });
    R.shuffle(cards);
    m.clock = [{ id: 'calm', name: 'Тишина' }, { id: 'calm', name: R.pick(ZG.CLOCK.calm.names) }, ...cards];

    // Герои
    party.forEach((ph, pi) => {
      const deck = R.shuffle(ph.deck.map((id) => G.inst(id, { v: 1 })));
      const mh = { pi, id: ph.id, deck, hand: [], discard: [], burned: [], displayed: [], conds: {}, loc: 0, dead: false, turned: false };
      const hs = G.handSize(ph);
      while (mh.hand.length < hs && mh.deck.length) mh.hand.push(mh.deck.shift());
      m.heroes.push(mh);
    });
    G.log(`Миссия «${def.name}» начинается.`, 'sys');
    ZG.Save.persist();
    return m;
  };

  /* ============================== Колоды героев (лагерь) ============================== */
  G.BASICS = { weapon: ['knife', 'bat', 'pistol'], item: ['flashlight', 'jacket', 'trashlid'], consumable: ['bandage', 'ammo'], ally: ['neighbor'], resolve: ['hope'], technique: ['focus'] };

  G.reserve = function () {
    const camp = G.S().campaign;
    const v = camp.vault.slice();
    camp.party.forEach((ph) => ph.deck.forEach((id) => {
      const i = v.indexOf(id);
      if (i >= 0) v.splice(i, 1);
    }));
    return v;
  };

  G.cardValue = (id) => {
    const d = ZG.card(id);
    return (d.tier === 9 || d.mission ? 3.5 : d.tier) * 10 + (d.basic ? 0 : 1);
  };

  /** Привести колоды к составу: убрать недостающие на складе карты, лишние вернуть, пустые слоты заполнить */
  G.ensureDecks = function () {
    const camp = G.S().campaign;
    const pool = camp.vault.slice();
    camp.party.forEach((ph) => {
      const comp = G.deckComp(ph);
      const kept = [];
      ph.deck.forEach((id) => {
        const i = pool.indexOf(id);
        const t = ZG.card(id).type;
        if (i >= 0 && ZG.count(kept, (k) => ZG.card(k).type === t) < comp[t]) {
          pool.splice(i, 1);
          kept.push(id);
        }
      });
      ph.deck = kept;
    });
    camp.party.forEach((ph) => G.autofill(ph, pool));
  };

  /** Дозаполнить колоду героя лучшими картами из пула, затем базовыми запасами */
  G.autofill = function (ph, pool) {
    const camp = G.S().campaign;
    if (!pool) pool = G.reserve();
    const comp = G.deckComp(ph);
    ZG.CARD_TYPES.forEach((t) => {
      let have = ZG.count(ph.deck, (id) => ZG.card(id).type === t);
      const cands = pool.filter((id) => ZG.card(id).type === t && G.cardUsable(ph.id, id)).sort((a, b) => G.cardValue(b) - G.cardValue(a));
      while (have < comp[t]) {
        let id = cands.shift();
        if (id) pool.splice(pool.indexOf(id), 1);
        else {
          id = G.BASICS[t][ZG.count(ph.deck, (x) => ZG.card(x).type === t) % G.BASICS[t].length];
          camp.vault.push(id);
        }
        ph.deck.push(id);
        have++;
      }
    });
  };

  /** Подходит ли карта герою: есть владение и навык перезарядки приёма */
  G.cardUsable = (heroId, id) => {
    const d = ZG.card(id);
    if (G.missingProf({ id: heroId }, id).length) return false;
    if (d.recharge && !d.recharge.skills.some((sk) => (ZG.HEROES[heroId].skills[sk] || 0) > 0)) return false;
    return true;
  };
  G.cardWarn = (heroId, id) => {
    const d = ZG.card(id);
    const miss = G.missingProf({ id: heroId }, id);
    if (miss.includes('heavyarmor')) return 'сгорит';
    if (miss.length) return '−4';
    if (d.recharge && !d.recharge.skills.some((sk) => (ZG.HEROES[heroId].skills[sk] || 0) > 0)) return 'сгорит';
    return '';
  };

  G.deckValid = (ph) => {
    const comp = G.deckComp(ph);
    return ZG.CARD_TYPES.every((t) => ZG.count(ph.deck, (id) => ZG.card(id).type === t) === comp[t]);
  };

  /* ============================== Главный цикл ============================== */
  G.run = async function () {
    const m = G.M();
    const ui = UI();
    m.hordeBusy = false;
    ui.showBoard();
    while (!m.over) {
      if (m.heroes.every((h) => h.dead)) return G.finish(false, 'dead');
      const mh = m.heroes[m.active];
      if (mh.dead) { G.advance(); continue; }
      ZG.Save.persist();
      ui.renderBoard();
      if (m.heroes.filter((h) => !h.dead).length > 1) await ui.handoff(mh);
      // флаги хода обнуляются до Часов: орда от события Часов уже воюет в новом ходу
      m.ts = { moved: false, explored: false, explores: 1, closeTried: false, rested: false, gave: false, scouted: false, med: false, evaded: false };
      const fc = await G.flipClock(mh);
      if (fc === 'lose') return G.finish(false, 'time');
      await G.startTurnConds(mh);
      if (mh.dead) { G.advance(); continue; }
      ui.renderBoard();
      if (m.ts.forceEnd && !mh.dead) {
        // ход закончился ещё в начале (например, героя задержали в бою с ордой от события Часов)
        await G.endTurn(mh);
        if (m.heroes.every((h) => h.dead)) return G.finish(false, 'dead');
        G.advance();
        continue;
      }
      if (G.conds(mh).detained) {
        // задержанный герой пропускает ход; состояние снимается в конце этого хода
        G.log(`${G.hname(mh)} задержан и пропускает ход.`, 'bad');
        await ui.banner('Ход пропущен', `${G.hname(mh)} задержан`, 'bad');
        await G.endTurn(mh);
        G.clearConds(mh, ['detained']);
        ui.renderBoard();
        if (m.heroes.every((h) => h.dead)) return G.finish(false, 'dead');
        G.advance();
        continue;
      }
      await G.tipsForTurn();
      const r = await G.turn(mh);
      if (r === 'win') return G.finish(true);
      if (m.heroes.every((h) => h.dead)) return G.finish(false, 'dead');
      if (!mh.dead) await G.endTurn(mh);
      if (m.heroes.every((h) => h.dead)) return G.finish(false, 'dead');
      G.advance();
    }
  };

  G.advance = () => {
    const m = G.M();
    m.active = (m.active + 1) % m.heroes.length;
  };

  G.tipsForTurn = async () => {
    const m = G.M();
    if (m.turn === 1) await UI().tip('start');
    if (m.phase === 'night') await UI().tip('night');
  };

  /* ============================== Часы ============================== */
  G.flipClock = async function (mh) {
    const m = G.M();
    if (m.clockPos >= m.clock.length) return 'lose';
    const c = m.clock[m.clockPos++];
    m.turn++;
    const old = m.phase;
    m.phase = G.phaseAt(m.clockPos);
    m.turnMods = {};
    await UI().clockFlip(c, old !== m.phase && m.turn > 1);
    const sp = G.special();
    if (sp.nightInfect && old === 'day' && m.phase === 'night') {
      await UI().banner('Заражённый воздух', 'Каждый герой проверяет Выдержку или Выживание', 'bad');
      for (const h of m.heroes) {
        if (h.dead) continue;
        const r = await G.doCheck(h, { kind: 'event', skills: sp.nightInfect.skills, dc: sp.nightInfect.dc, base: sp.nightInfect.dc, mods: [], title: `Заражённый воздух: ${G.hname(h)}`, locIdx: h.loc });
        if (!r.success) await G.infect(h);
      }
    }
    if (sp.henchPatrol && m.turn > 1 && m.turn % sp.henchPatrol === 0) {
      const hid = G.def().henchman;
      const open = G.openLocs();
      const sources = open.filter((l) => l.deck.some((c) => c.id === hid));
      if (sources.length && open.length > 1) {
        const loudest = (exclude) => open.filter((l) => l !== exclude).sort((a, b) => b.noise - a.noise || R.next() - 0.5)[0];
        const from = R.pick(sources);
        const to = loudest(from);
        await G.moveHench(from, to, 'Обход');
      }
    }
    if (sp.trapEvery && m.turn > 1 && m.turn % sp.trapEvery === 0) {
      // Капканы Угрозы: в случайную открытую локацию замешивается препятствие
      const open = G.openLocs();
      if (open.length) {
        const to = R.pick(open);
        to.deck.push(G.inst(sp.trapCard));
        R.shuffle(to.deck);
        G.log(`${ZG.card(G.def().boss).name} ставит капкан: в «${G.ldef(to).name}» теперь «${ZG.card(sp.trapCard).name}».`, 'bad');
        await UI().flyIn(m.locations.indexOf(to), 1, 'alert');
        await UI().banner('Капкан', `В «${G.ldef(to).name}» появился «${ZG.card(sp.trapCard).name}»`, 'bad');
      }
    }
    if (sp.raidEvery && m.turn > 1 && m.turn % sp.raidEvery === 0) await G.raid(sp.raidTokens || 3);
    if (old === 'night' && m.phase === 'day') {
      m.heroes.forEach((h) => { if (G.conds(h).terror) G.clearConds(h, ['terror']); });
      m.locations.forEach((l) => (l.noise = Math.max(0, l.noise - 1)));
      G.log('Утро: шум всех локаций −1.', 'clock');
    }
    const cd = ZG.CLOCK[c.id];
    if (c.id !== 'calm') G.log(`Часы: ${cd.name}. ${cd.text}`, 'clock');
    // событие хода — видно в верхней панели весь ход
    m.turnEvent = { id: c.id, name: c.id === 'calm' ? (c.name || 'Тишина') : cd.name, turn: m.turn, detail: '' };
    switch (c.id) {
      case 'siren':
        for (const l of G.openLocs()) { G.addNoise(l, 1); }
        for (const l of G.openLocs()) await G.checkHorde(l);
        break;
      case 'rain':
        m.locations.forEach((l) => (l.noise = Math.max(0, l.noise - 1)));
        break;
      case 'hunger':
        m.heroes.filter((h) => !h.dead && h.deck.length).forEach((h) => h.discard.push(h.deck.shift()));
        break;
      case 'howl': {
        const open = G.openLocs();
        if (open.length) {
          const l = R.pick(open);
          l.deck.push(G.inst(ZG.boxPick('enemy', G.def().tier)));
          R.shuffle(l.deck);
          G.log(`В локацию «${G.ldef(l).name}» пришёл мертвец.`, 'bad');
          m.turnEvent.detail = `Мертвец пришёл в «${G.ldef(l).name}».`;
          await UI().flyIn(m.locations.indexOf(l), 1);
        }
        break;
      }
      case 'broadcast':
        G.heal(mh, 1);
        break;
      case 'dawn':
        m.heroes.filter((h) => !h.dead).forEach((h) => G.heal(h, 1));
        break;
      case 'fog':
        m.turnMods.fog = true;
        break;
      default:
    }
    if (m.clockPos === m.clock.length) ZG.Audio.sfx('braam');
    if (m.clockPos === m.clock.length) await UI().banner('Последний ход!', 'Часы на исходе. Если Угроза не будет повержена — миссия провалена.', 'bad');
    else if (m.clock.length - m.clockPos === 5) await UI().banner('Осталось 5 ходов', 'Время уходит.', 'warn');
    return null;
  };

  /* ============================== Ход героя ============================== */
  G.actions = function (mh) {
    const m = G.M();
    const ts = m.ts;
    const loc = G.loc(mh);
    const others = G.heroesAt(mh.loc).filter((h) => h !== mh);
    const a = {
      move: !ts.explored && !ts.moved && m.locations.length > 1,
      explore: ts.explores > 0 && !loc.closed && loc.deck.length > 0,
      close: !loc.closed && loc.deck.length === 0 && !ts.closeTried && (!G.lrule(loc).closeCost || mh.hand.some((c) => ZG.card(c.id).type === G.lrule(loc).closeCost)),
      give: !ts.gave && !G.lrule(loc).noGive && others.length > 0 && mh.hand.some((c) => c.id !== 'infection'),
      // «Разведка» Тени: только до исследования и за перезарядку карты из руки (не Инфекции)
      scout: mh.id === 'ten' && !ts.scouted && !ts.explored && mh.hand.some((c) => c.id !== 'infection') && G.openLocs().some((l) => l.deck.length),
      // «Полевая медицина»: вместо первого исследования хода, за карту с признаком «Медицина»
      fieldmed: mh.id === 'marina' && !ts.med && !ts.explored && ts.explores > 0 && mh.hand.some(G.isMedCard) && G.heroesAt(mh.loc).some((h) => h.discard.length || G.infCount(h) || Object.keys(G.conds(h)).filter((k) => k !== 'detained').length),
    };
    a.cards = [];
    mh.hand.forEach((c) => {
      const d = ZG.card(c.id);
      (d.plays || []).forEach((p, pi) => {
        if (p.on !== 'action') return;
        if (G.actionUsable(mh, p, c)) a.cards.push({ u: c.u, pi });
      });
    });
    return a;
  };

  G.actionUsable = function (mh, p, c) {
    const loc = G.loc(mh);
    const here = G.heroesAt(mh.loc);
    if (p.mode === 'display') return (mh.displayed || []).length < 2 && !(c && G.missingProf(mh, c.id).length);
    if (p.craft || p.gain || p.time) return true;
    if (p.clearConds && here.some((h) => Object.keys(G.conds(h)).length)) return true;
    if (p.explore) return !loc.closed && loc.deck.length > 0;
    if (p.heal) return (p.target === 'here' ? here : [mh]).some((h) => h.discard.length > 0);
    if (p.cure) return (p.target === 'here' ? here : [mh]).some((h) => G.infCount(h) > 0);
    if (p.scout) return G.openLocs().some((l) => l.deck.length);
    if (p.draw) return mh.deck.length > 0;
    if (p.lure) return !loc.closed && loc.noise > 0 && G.openLocs().length > 1;
    if (p.relocate) return G.openLocs().some((l) => l !== loc);
    return false;
  };

  /** Переход героя в локацию (с проверкой входа, если она есть) */
  G.enterLoc = async function (mh, i, verb) {
    mh.loc = i;
    G.log(`${G.hname(mh)} ${verb || 'идёт'} в «${G.ldef(G.loc(mh)).name}».`, 'move');
    UI().renderBoard();
    const ec = G.lrule(G.loc(mh)).enterCheck;
    if (ec && !G.loc(mh).closed) {
      const er = await G.doCheck(mh, G.eventCheck(ec, G.loc(mh), ec.name || `Вход: ${G.ldef(G.loc(mh)).name}`, null));
      if (!er.success) return await G.applyFx(mh, G.loc(mh), ec.fail);
    }
    return null;
  };

  G.turn = async function (mh) {
    const m = G.M();
    const ui = UI();
    for (;;) {
      if (mh.dead) return null;
      ui.renderBoard();
      const act = await ui.waitAction(mh, G.actions(mh));
      const loc = G.loc(mh);
      let r = null;
      switch (act.type) {
        case 'move':
          if (act.loc !== mh.loc) {
            m.ts.moved = true;
            r = await G.enterLoc(mh, act.loc, 'идёт');
          }
          break;
        case 'explore':
          m.ts.explores--;
          r = await G.explore(mh);
          break;
        case 'close':
          r = await G.tryClose(mh, loc, false);
          break;
        case 'give':
          await G.give(mh);
          break;
        case 'scout':
          await G.scout(mh, { power: true });
          break;
        case 'fieldmed':
          await G.fieldMed(mh);
          break;
        case 'card':
          r = await G.playAction(mh, act.u, act.pi);
          break;
        case 'end':
          return null;
        default:
      }
      if (r === 'win') return 'win';
      if (m.heroes.every((h) => h.dead)) return null;
      if (m.ts.forceEnd) return null; // например, героя задержали
    }
  };

  G.endTurn = async function (mh) {
    const el = G.loc(mh);
    const et = G.lrule(el).endTurn;
    if (et && !el.closed && !mh.dead) {
      const er = await G.doCheck(mh, G.eventCheck(et, el, `Конец хода: ${G.ldef(el).name}`, null));
      if (!er.success) await G.applyFx(mh, el, et.fail);
      if (mh.dead) return;
    }
    const cs = G.conds(mh);
    if (cs.decay && mh.discard.length) {
      const r = ZG.rollDie('d4');
      const TYPES = { 1: ['resolve'], 2: ['ally'], 3: ['weapon', 'technique'], 4: ['item', 'consumable'] };
      const LBL = { 1: 'Решимость', 2: 'Союзники', 3: 'Оружие и Приёмы', 4: 'Снаряжение и Расходники' };
      const gone = mh.discard.filter((c) => TYPES[r].includes(ZG.card(c.id).type));
      mh.discard = mh.discard.filter((c) => !gone.includes(c));
      (mh.buried = mh.buried || []).push(...gone);
      G.log(`Распад (d4 = ${r}: ${LBL[r]}): захоронено ${gone.length}.`, gone.length ? 'bad' : '');
      if (gone.length) await UI().banner(`Распад: d4 = ${r}`, `${LBL[r]} из сброса захоронены: ${gone.length}`, 'bad');
    }
    ['vuln', 'doom'].forEach((k) => { if (cs[k]) { cs[k]--; if (!cs[k]) { delete cs[k]; G.log(`${G.hname(mh)}: «${ZG.CONDS[k].name}» проходит.`, 'good'); } } });
    const hs = G.handSizeMh(mh);
    if (mh.hand.length > hs) {
      const us = await UI().pickCards(mh, mh.hand.length - hs, 'Лишние карты', `Размер руки — ${hs}. Сбросьте ${mh.hand.length - hs}.`);
      us.forEach((u) => G.moveByMode(mh, u, 'discard'));
    }
    while (mh.hand.length < hs) {
      if (!mh.deck.length) {
        await G.kill(mh, 'exhausted');
        return;
      }
      mh.hand.push(mh.deck.shift());
    }
    if (cs.poison && mh.hand.length) {
      const c = mh.hand.splice(R.int(mh.hand.length), 1)[0];
      mh.deck.push(c);
      G.log(`Отравление: «${ZG.card(c.id).name}» уходит под низ колоды.`, 'bad');
      cs.poison--;
      if (!cs.poison) { delete cs.poison; G.log(`${G.hname(mh)}: яд выветрился.`, 'good'); }
      UI().toast(`${ZG.icon('vial')} Отравление: −1 карта в руке`, 'bad');
    }
  };

  /** Состояния в начале хода: Обречённость и Ночной ужас */
  G.startTurnConds = async function (mh) {
    const m = G.M();
    const cs = G.conds(mh);
    if (cs.doom) {
      const res = mh.hand.filter((c) => ZG.card(c.id).type === 'resolve');
      let paid = false;
      if (res.length) {
        const opts = res.map((c) => ({ label: `Сбросить «${ZG.card(c.id).name}»`, u: c.u }));
        opts.push({ label: 'Потерять карту Часов', sub: 'Время уходит быстрее' });
        const k = await UI().choose({ title: 'Обречённость', text: 'Сбросьте Решимость из руки или потеряйте карту Часов.', options: opts });
        if (opts[k].u) { G.moveByMode(mh, opts[k].u, 'discard'); paid = true; G.log(`${G.hname(mh)} гонит отчаяние прочь.`, 'card'); }
      }
      if (!paid) {
        m.clockPos = Math.min(m.clock.length, m.clockPos + 1);
        G.log('Обречённость: потеряна карта Часов.', 'bad');
        await UI().banner('Обречённость', 'Сброшена карта Часов', 'bad');
      }
    }
    if (cs.terror && m.phase === 'night' && mh.hand.length) {
      const v = G.skillValue(G.ph(mh), 'will');
      const roll = ZG.rollDie(v.die) + v.bonus;
      if (roll < 5) {
        const c = mh.hand.splice(R.int(mh.hand.length), 1)[0];
        mh.discard.push(c);
        G.log(`Ночной ужас: Воля ${roll}/5 — «${ZG.card(c.id).name}» выпадает из рук.`, 'bad');
        await UI().fxCond(mh, 'terror');
      } else G.log(`Ночной ужас: Воля ${roll}/5 — держится.`, 'good');
    }
  };

  /* ============================== Действия ============================== */
  G.give = async function (mh) {
    const others = G.heroesAt(mh.loc).filter((h) => h !== mh);
    const to = others.length === 1 ? others[0] : await UI().pickHero('Кому передать карту?', others);
    if (!to) return;
    const us = await UI().pickCards(mh, 1, 'Передать карту', `Выберите карту для: ${G.hname(to)}`, true, (c) => c.id !== 'infection');
    if (!us.length) return;
    const c = G.removeFrom(mh.hand, us[0]);
    to.hand.push(c);
    G.M().ts.gave = true;
    G.log(`${G.hname(mh)} передаёт «${ZG.card(c.id).name}» → ${G.hname(to)}.`, 'move');
  };

  G.scout = async function (mh, opts) {
    const locs = G.openLocs().filter((l) => l.deck.length);
    const li = await UI().pickLocation('Разведка: какую локацию осмотреть?', locs.map((l) => G.M().locations.indexOf(l)));
    if (li == null) return;
    const l = G.M().locations[li];
    if (opts && opts.power) {
      // цена способности: перезарядить карту из руки
      const us = await UI().pickCards(mh, 1, 'Разведка', 'Перезарядите карту из руки (она уйдёт под низ колоды), чтобы осмотреть локацию.', true, (c) => c.id !== 'infection');
      if (!us.length) return;
      const c = mh.hand.find((x) => x.u === us[0]);
      G.moveByMode(mh, us[0], 'recharge');
      G.M().ts.scouted = true;
      if (c) G.log(`${G.hname(mh)} перезаряжает «${ZG.card(c.id).name}» ради разведки.`, 'card');
    }
    const toBottom = await UI().scout(l.deck[0], l);
    if (toBottom) l.deck.push(l.deck.shift());
    G.log(`${G.hname(mh)} разведывает «${G.ldef(l).name}».`, 'move');
  };

  G.isMedCard = (c) => (ZG.card(c.id).traits || []).includes('Медицина');
  G.fieldMed = async function (mh) {
    const us = await UI().pickCards(mh, 1, 'Полевая медицина', 'Вместо первого исследования: покажите карту с признаком «Медицина». После лечения она уйдёт в сброс.', true, G.isMedCard);
    if (!us.length) return;
    const targets = G.heroesAt(mh.loc).filter((h) => h.discard.length || G.infCount(h) || Object.keys(G.conds(h)).filter((k) => k !== 'detained').length);
    const t = targets.length === 1 ? targets[0] : await UI().pickHero('Кого лечить?', targets);
    if (!t) return;
    const opts = [];
    if (t.discard.length) opts.push({ label: 'Перевязать', sub: '1d4+1 случайных карт из сброса — в колоду', key: 'heal' });
    if (G.infCount(t)) opts.push({ label: 'Очистить рану', sub: 'Изгнать 1 Инфекцию', key: 'cure' });
    if (Object.keys(G.conds(t)).filter((k) => k !== 'detained').length) opts.push({ label: 'Обработать и успокоить', sub: 'Снять все состояния', key: 'conds' });
    opts.push({ label: T('act_cancel'), key: 'x' });
    const k = opts[await UI().choose({ title: 'Полевая медицина', text: `Пациент: ${G.hname(t)}`, options: opts })].key;
    if (k === 'x') return;
    const shown = mh.hand.find((c) => c.u === us[0]);
    G.moveByMode(mh, us[0], 'discard');
    const ts = G.M().ts;
    ts.med = true;
    ts.explored = true; // лечение заменяет первое исследование
    ts.explores = Math.max(0, ts.explores - 1);
    if (shown) G.log(`Марина показывает «${ZG.card(shown.id).name}» и тратит исследование на лечение.`, 'card');
    if (k === 'conds') {
      G.clearConds(t);
      UI().fxHeal(t);
    } else if (k === 'heal') {
      const n = G.heal(t, ZG.rollDie('d4') + 1);
      G.log(`Марина лечит: ${G.hname(t)} восстанавливает ${n}.`, 'good');
      UI().fxHeal(t);
    } else {
      G.cure(t, 1);
      G.log(`Марина вычищает инфекцию у ${G.hname(t)}.`, 'good');
      UI().fxHeal(t);
    }
  };

  G.playAction = async function (mh, u, pi) {
    const c = mh.hand.find((x) => x.u === u);
    if (!c) return null;
    const d = ZG.card(c.id);
    const p = d.plays[pi];
    const here = G.heroesAt(mh.loc);
    const ui = UI();
    // выбор цели заранее (можно отменить)
    let target = mh;
    if (p.mode === 'display') {
      G.moveByMode(mh, u, 'display');
      G.log(`${G.hname(mh)} выкладывает «${d.name}».`, 'card');
      await ui.banner('Выложено', `«${d.name}» теперь работает постоянно`, 'good');
      return null;
    }
    if ((p.heal || p.cure || p.clearConds) && p.target === 'here') {
      const ok = here.filter((h) => (p.heal && h.discard.length) || (p.cure && G.infCount(h)) || (p.clearConds && Object.keys(G.conds(h)).length));
      target = ok.length === 1 ? ok[0] : await ui.pickHero(p.heal ? 'Кого лечить?' : 'Кого исцелить?', ok);
      if (!target) return null;
    }
    let lureTo = null;
    if (p.lure) {
      const cand = G.openLocs().filter((l) => l !== G.loc(mh)).map((l) => G.M().locations.indexOf(l));
      lureTo = await ui.pickLocation('Куда увести шум?', cand);
      if (lureTo == null) return null;
    }
    let relTo = null;
    if (p.relocate) {
      const cand = G.openLocs().filter((l) => l !== G.loc(mh)).map((l) => G.M().locations.indexOf(l));
      relTo = await ui.pickLocation('Куда отвезти?', cand);
      if (relTo == null) return null;
    }
    G.moveByMode(mh, u, p.mode);
    G.log(`${G.hname(mh)}: «${d.name}» — ${ZG.T('mode_' + p.mode).toLowerCase()}.`, 'card');
    if (p.heal) {
      const n0 = ZG.sum((p.heal.dice || []).map(ZG.rollDie)) + (p.heal.bonus || 0);
      const n = G.heal(target, n0);
      G.log(`${G.hname(target)} восстанавливает ${n} ${ZG.plural(n, 'карту', 'карты', 'карт')}.`, 'good');
      ui.fxHeal(target);
      await ui.banner('Лечение', `${G.hname(target)}: +${n} в колоду`, 'good');
    }
    if (p.clearConds) G.clearConds(target);
    if (p.heal && (d.traits || []).includes('Медицина')) G.clearConds(target, ['poison']);
    if (p.clearCond) G.clearConds(target, [p.clearCond]);
    if (p.gain) {
      const gc = G.inst(ZG.boxPick(p.gain, G.def().tier), { l: 1 });
      mh.hand.push(gc);
      G.log(`${G.hname(mh)} находит: «${ZG.card(gc.id).name}».`, 'loot');
      await ui.gain(gc);
    }
    if (p.time) {
      for (let i = 0; i < p.time; i++) G.M().clock.push({ id: 'calm', name: 'Выигранное время' });
      ui.renderBoard();
      G.log(`Часы +${p.time}.`, 'good');
      await ui.banner('Выиграно время', `Часы +${p.time}`, 'good');
    }
    if (p.craft) {
      const nc = G.inst(ZG.rng.pick(G.BASICS[p.craft]), { tmp: 1 });
      mh.hand.push(nc);
      G.log(`${G.hname(mh)} мастерит: «${ZG.card(nc.id).name}».`, 'loot');
      await ui.gain(nc, 'Смастерил!');
    }
    if (p.cure) {
      const n = G.cure(target, p.cure === 'all' ? 99 : p.cure);
      G.log(`${G.hname(target)}: изгнано Инфекций — ${n}.`, 'good');
      ui.fxHeal(target);
    }
    if (p.draw) {
      for (let i = 0; i < p.draw && mh.deck.length; i++) mh.hand.push(mh.deck.shift());
      if (p.putBack && mh.hand.length) {
        const us = await ui.pickCards(mh, Math.min(p.putBack, mh.hand.length), 'Уложить рюкзак', 'Положите карту под низ колоды (перезарядите).');
        us.forEach((u) => G.moveByMode(mh, u, 'recharge'));
      }
    }
    if (p.lure) {
      const from = G.loc(mh);
      const to = G.M().locations[lureTo];
      to.noise += from.noise;
      from.noise = 0;
      G.log(`Шум уведён в «${G.ldef(to).name}».`, 'card');
      await G.checkHorde(to);
    }
    if (p.scout) await G.scout(mh);
    if (relTo != null) {
      const rr = await G.enterLoc(mh, relTo, 'едет');
      if (rr) return rr;
    }
    if (p.explore) {
      return await G.explore(mh);
    }
    return null;
  };

  G.heal = function (mh, n) {
    let k = 0;
    for (let i = 0; i < n && mh.discard.length; i++) {
      const c = mh.discard.splice(R.int(mh.discard.length), 1)[0];
      mh.deck.push(c);
      k++;
    }
    R.shuffle(mh.deck);
    return k;
  };

  G.cure = function (mh, n) {
    let k = 0;
    for (const pile of [mh.hand, mh.discard, mh.deck]) {
      for (let i = pile.length - 1; i >= 0 && k < n; i--) {
        if (pile[i].id === 'infection') { pile.splice(i, 1); k++; }
      }
    }
    return k;
  };

  /* ============================== Встречи ============================== */
  G.explore = async function (mh) {
    const m = G.M();
    const loc = G.loc(mh);
    if (loc.closed || !loc.deck.length) return null;
    m.ts.explored = true;
    const lr = G.lrule(loc);
    if (lr.exploreNoise) { G.addNoise(loc, lr.exploreNoise); UI().fxNoise(loc); }
    const inst = loc.deck.shift();
    G.log(`${G.hname(mh)} исследует «${G.ldef(loc).name}».`, 'move');
    const r = await G.encounter(mh, inst, loc);
    if (lr.nightExtra && m.phase === 'night' && !m.ts.nightExtra && !mh.dead) {
      m.ts.nightExtra = true;
      m.ts.explores++;
      G.log('Ночь скрывает вас: +1 исследование.', 'good');
    }
    return r;
  };

  G.encounter = async function (mh, inst, loc, opts) {
    opts = opts || {};
    const def = ZG.card(inst.id);
    const ui = UI();
    await ui.encounterOpen(inst, mh, loc);
    let r = null;
    if (ZG.isEnemy(def)) {
      await ui.tip(def.type === 'boss' ? 'boss' : def.type === 'henchman' ? 'henchman' : 'combat');
      r = await G.fight(mh, inst, loc, opts);
    } else if (def.type === 'decoy') {
      G.M().ts.explores++;
      G.log(`${G.hname(mh)} находит лишь ложный след. +1 исследование.`, 'move');
      await ui.banner('Ложный след', 'Здесь её нет. +1 исследование', 'warn');
    } else if (def.type === 'event') {
      await ui.tip('event');
      r = await G.event(mh, inst, loc);
    } else {
      await ui.tip('acquire');
      r = await G.acquire(mh, inst, loc);
    }
    await ui.encounterClose();
    if (r !== 'win') {
      await G.checkHorde(loc);
      for (const l of G.openLocs()) if (l !== loc) await G.checkHorde(l);
    }
    ui.renderBoard();
    return r;
  };

  /* ---------- Сложности ---------- */
  G.enemyCheck = function (def, loc, i, hits) {
    const m = G.M();
    const mods = [];
    if (!def.living && m.phase === 'night') mods.push({ label: 'Ночь', v: G.nightBonus() });
    if (def.mutates && m.bossMut) mods.push({ label: def.mutateName || 'Мутация', v: m.bossMut });
    const lr = G.lrule(loc);
    if (!def.living && lr.undeadDc) mods.push({ label: 'Локация: мертвецы', v: lr.undeadDc });
    if (def.living && lr.livingDc) mods.push({ label: 'Локация: люди', v: lr.livingDc });
    const lm = (G.ldef(loc).mods || {}).enemyDc;
    if (lm) mods.push({ label: 'Локация', v: lm });
    if (m.turnMods.fog) mods.push({ label: 'Туман', v: 1 });
    if (def.loneDc) {
      // «Охота на одиночек»: герой один в локации
      const li = m.locations.indexOf(loc);
      if (m.heroes.filter((h) => !h.dead && h.loc === li).length <= 1) mods.push({ label: 'Охота на одиночек', v: def.loneDc });
    }
    if (def.packDc) {
      // «Охотятся вместе»: +1 за каждого другого непобеждённого такого же врага в открытых локациях
      const others = ZG.sum(G.openLocs().map((l) => l.deck.filter((c) => c.id === def.id).length));
      if (others) mods.push({ label: `Стая: ещё ${others}`, v: Math.min(def.packDc, others) });
    }
    if (def.filtration) {
      const fh = m.heroes[m.active];
      if (fh && G.infCount(fh) > 0) mods.push({ label: 'Фильтрация: есть Инфекция', v: def.filtration });
    }
    const dc = def.dc + ZG.sum(mods.map((x) => x.v));
    return {
      kind: 'combat', skills: ['str', 'dex', 'melee'], dc, base: def.dc, mods, enemy: def, cardId: def.id,
      title: `${T('check_combat')}: ${def.name}${hits > 1 ? ` (${i + 1}/${hits})` : ''}`,
    };
  };

  G.acquireCheck = function (def, loc) {
    const m = G.M();
    const mods = [];
    if (m.phase === 'night') mods.push({ label: 'Ночь', v: -1 });
    const am = ((G.ldef(loc).mods || {}).acquireDc || {})[def.type];
    if (am) mods.push({ label: 'Локация', v: am });
    if (m.turnMods.fog) mods.push({ label: 'Туман', v: -1 });
    const dc = Math.max(1, def.acquire.dc + ZG.sum(mods.map((x) => x.v)));
    return { kind: 'acquire', skills: def.acquire.skills, dc, base: def.acquire.dc, mods, card: def, cardId: def.id, title: `${T('check_acquire')}: ${def.name}` };
  };

  G.eventCheck = function (check, loc, title, def) {
    const mods = [];
    const em = (G.ldef(loc).mods || {}).eventDc;
    if (em) mods.push({ label: 'Локация', v: em });
    const dc = check.dc + ZG.sum(mods.map((x) => x.v));
    return { kind: 'event', skills: check.skills, dc, base: check.dc, mods, card: def, cardId: def && def.id, title };
  };

  G.closeCheck = function (loc, title) {
    const ld = G.ldef(loc);
    return { kind: 'close', skills: ld.close.skills, dc: ld.close.dc, base: ld.close.dc, mods: [], locIdx: G.M().locations.indexOf(loc), title: title || `${T('check_close')}: ${ld.name}` };
  };

  /** Удар по всем героям в локации: каждый проходит проверку, при провале — урон кубиком */
  G.areaBlast = async function (def, loc, spec, title, sub, what) {
    const m = G.M();
    await UI().banner(title, sub, 'bad');
    const li = m.locations.indexOf(loc);
    for (const h of m.heroes.filter((x) => !x.dead && x.loc === li)) {
      const br = await G.doCheck(h, { kind: 'event', skills: spec.skills, dc: spec.dc, base: spec.dc, mods: [], card: def, cardId: def.id, title: `${G.hname(h)}: в укрытие!` });
      if (!br.success) await G.damage(h, ZG.rollDie(spec.die), { source: `${def.name}: ${what}`, dmgType: spec.dmgType || 'fire' });
    }
  };

  /* ---------- Бой ---------- */
  G.fight = async function (mh, inst, loc, opts) {
    const m = G.M();
    const def = ZG.card(inst.id);
    const ui = UI();
    const isBoss = def.type === 'boss';
    if (def.noiseOnEncounter) {
      G.addNoise(loc, def.noiseOnEncounter);
      G.log(`${def.name} поднимает шум (+${def.noiseOnEncounter}).`, 'bad');
      ui.fxNoise(loc);
    }
    // уклонение
    if (!isBoss && !def.noEvade && !opts.noEvade) {
      const options = [];
      const dcNow = G.enemyCheck(def, loc, 0, 1).dc;
      const evadeDc = dcNow + 2; // «Ускользнуть»: на 2 сложнее, чем победить
      if (mh.id === 'ten' && !m.ts.evaded) options.push({ label: 'Ускользнуть', sub: `Проверка Скрытности ${evadeDc}`, key: 'power' });
      mh.hand.forEach((c) => {
        const d = ZG.card(c.id);
        (d.plays || []).forEach((p) => {
          if (p.on === 'evade') options.push({ label: `${ZG.T('mode_' + p.mode)}: «${d.name}»`, sub: 'Гарантированное уклонение', key: 'card', u: c.u, mode: p.mode });
        });
      });
      if (options.length) {
        options.push({ label: 'Сражаться', sub: '', key: 'fight', primary: true });
        const o = options[await ui.choose({ title: T('evade_q'), text: def.name, options, keepCard: true })];
        let evaded = false;
        if (o.key === 'power') {
          m.ts.evaded = true;
          const res = await G.doCheck(mh, { kind: 'evade', skills: ['stealth', 'dex'], dc: evadeDc, base: dcNow, mods: [{ label: 'Ускользнуть', v: 2 }], title: `Ускользнуть: ${def.name}`, cardId: def.id });
          evaded = res.success;
        } else if (o.key === 'card') {
          G.moveByMode(mh, o.u, o.mode || 'discard');
          evaded = true;
        }
        if (evaded) {
          loc.deck.push(inst);
          G.log(`${G.hname(mh)} уклоняется от встречи: ${def.name}.`, 'move');
          await ui.banner('Ушли незамеченными', `${def.name} уходит под низ колоды локации`, 'good');
          return null;
        }
      }
    }
    // Перед боем с Угрозой: герои в других открытых локациях могут временно перекрыть их
    if (isBoss) m.guarded = await G.villainGuards(mh, loc);
    // до проверки
    if (def.before && def.before.damage) {
      G.log(`${def.name} атакует первым: ${def.before.damage} урона.`, 'bad');
      await G.damage(mh, def.before.damage, { source: def.name, combat: true, dmgType: G.enemyDmgType(def, loc) });
    }
    if (def.before && def.before.infectCheck) {
      const ic = def.before.infectCheck;
      const res = await G.doCheck(mh, G.eventCheck(ic, loc, `${def.name}: увернуться`, def));
      if (!res.success) await G.infect(mh);
    }
    if (def.before && def.before.flameAll) await G.areaBlast(def, loc, def.before.flameAll, 'Огнемёт!', 'Струя огня по всей локации — все в укрытие!', 'огнемёт');
    if (def.before && def.before.pullCheck && mh.hand.length) {
      // «Утянуть на дно»: при провале случайная карта из руки уходит под низ колоды
      const pc = def.before.pullCheck;
      const res = await G.doCheck(mh, { kind: 'event', skills: pc.skills, dc: pc.dc, base: pc.dc, mods: [], card: def, cardId: def.id, title: `${def.name}: вырваться из хватки` });
      if (!res.success && mh.hand.length) {
        const c = mh.hand.splice(R.int(mh.hand.length), 1)[0];
        mh.deck.push(c);
        G.log(`${def.name} утягивает на дно «${ZG.card(c.id).name}» — карта уходит под низ колоды.`, 'bad');
        await ui.banner('Утянуто на дно', `«${ZG.card(c.id).name}» уходит под низ вашей колоды`, 'bad');
      }
    }
    if (mh.dead) {
      if (!loc.closed) { loc.deck.push(inst); R.shuffle(loc.deck); }
      return null;
    }
    // проверки боя
    const hits = def.hits || 1;
    let ok = true;
    let res = null;
    let ck = null;
    for (let i = 0; i < hits; i++) {
      ck = G.enemyCheck(def, loc, i, hits);
      res = await G.doCheck(mh, ck);
      if (!res.success) { ok = false; break; }
      if (i < hits - 1) await ui.banner('Он ещё стоит!', 'Нужна вторая победа подряд', 'warn');
    }
    // scatterMargin: победа с перевесом меньше N — враг разбегается и уходит под низ колоды локации
    if (ok && def.scatterMargin && res.total - res.dc < def.scatterMargin && !loc.closed) {
      loc.deck.push(inst);
      G.log(`${def.name} ${ZG.gf(def, 'отбит', 'отбита', 'отбито')} (перевес ${res.total - res.dc} < ${def.scatterMargin}): разбегается и уходит под низ колоды локации.`, 'move');
      await ui.banner(`${def.name} разбегается`, `Нужен перевес ${def.scatterMargin}+, чтобы добить. Уходит под низ колоды локации`, 'warn');
      return null;
    }
    // echoNoise: победа шумной проверкой — враг не гибнет, а уходит в самую шумную открытую локацию
    if (ok && def.echoNoise && res.pool && res.pool.noise > 0 && !loc.closed) {
      const others = G.openLocs().filter((l) => l !== loc).sort((a, b) => b.noise - a.noise || R.next() - 0.5);
      const to = others[0] || loc;
      to.deck.push(inst);
      R.shuffle(to.deck);
      G.log(`${def.name}: шум (+${res.pool.noise}) — ${ZG.gf(def, 'он', 'она', 'оно')} не гибнет, а уходит на звук в «${G.ldef(to).name}».`, 'bad');
      await ui.banner('Отзвук', `${def.name} уходит на шум в «${G.ldef(to).name}». Добить можно только тихо`, 'warn');
      if (to !== loc) await ui.flyBetween(m.locations.indexOf(loc), m.locations.indexOf(to), def.icon || 'ghost');
      return null;
    }
    // finishCheck: после победы в бою — небоевая проверка, чтобы добить; провал — враг замешивается обратно
    if (ok && def.finishCheck) {
      const fc = def.finishCheck;
      await ui.banner(`${def.name}: ещё ${ZG.gf(def, 'дышит', 'дышит', 'дышит')}!`, `Добить: ${fc.skills.map(ZG.skillName).join(' / ')} ${fc.dc}`, 'warn');
      const fr = await G.doCheck(mh, { kind: 'event', skills: fc.skills, dc: fc.dc, base: fc.dc, mods: [], card: def, cardId: def.id, title: `Добить: ${def.name}` });
      if (!fr.success) {
        if (!loc.closed) { loc.deck.push(inst); R.shuffle(loc.deck); }
        G.log(`${def.name} ${ZG.gf(def, 'выжил', 'выжила', 'выжило')} и уходит обратно в колоду локации.`, 'bad');
        return null;
      }
    }
    if (ok) {
      m.stats.kills++;
      G.S().campaign.stats.kills++;
      ui.fxDefeat();
      G.log(T('defeated', { name: def.name, pov: ZG.gf(def, 'повержен', 'повержена', 'повержено') }), 'good');
      if (def.lastSwing && !mh.dead) {
        // «Последний взмах»: побеждённый успевает ударить — увернуться
        const ls = def.lastSwing;
        await ui.banner('Последний взмах!', `${def.name} падает — но успевает замахнуться`, 'warn');
        const lr = await G.doCheck(mh, { kind: 'event', skills: ls.skills, dc: ls.dc, base: ls.dc, mods: [], card: def, cardId: def.id, title: `Увернуться: ${def.name}` });
        if (!lr.success) await G.damage(mh, ls.damage, { source: `${def.name}: последний взмах`, combat: true });
      }
      if (def.deathBlast) await G.areaBlast(def, loc, def.deathBlast, 'Граната!', 'Чека сорвана — все в локации, в укрытие!', 'граната');
      if (def.toxic) {
        const tr = await G.doCheck(mh, G.eventCheck(def.toxic, loc, `${def.name}: брызги заразы`, def));
        if (!tr.success) await G.infect(mh);
      }
      // Как в Pathfinder: заколотить можно только сразу после победы над вожаком.
      // Отказ или провал — шанс упущен, локацию придётся вычищать до пустой колоды.
      if (def.type === 'henchman' && !loc.closed && !mh.dead && !(loc.deck.length === 0 && m.ts.closeTried)) {
        const c = await ui.choose({
          title: 'Вожак повержен',
          text: `Попытаться заколотить «${G.ldef(loc).name}» прямо сейчас? (${ZG.cardCheckLineClose(loc)}) Это единственный шанс: если отказаться или провалить проверку, локацию придётся вычищать до пустой колоды.`,
          options: [{ label: 'Заколотить', primary: true }, { label: 'Не сейчас' }],
        });
        if (c === 0) return await G.tryClose(mh, loc, true);
      }
      if (isBoss) return await G.bossDefeated(mh, inst, loc);
      return null;
    }
    // поражение
    if (isBoss) m.guarded = [];
    const diff = ck.dc - res.total;
    const dmg = Math.min(def.halfDmg ? Math.floor(diff / 2) : diff, G.dmgCap(def)) + (def.dmgAdd || 0);
    const taken = await G.damage(mh, dmg, { source: def.name, bite: def.bite, combat: true, dmgType: G.enemyDmgType(def, loc), pierceLight: !!def.pierceLight });
    if ((def.bite && G.lastHit >= 2) || def.infectOnFail) await G.infect(mh); // укус заражает, только если 2+ урона прошло через броню и блоки
    if (def.inflict && taken > 0 && !mh.dead) {
      // inflictCheck: сначала проверка, состояние — только при провале
      const ic = def.inflictCheck;
      const avoid = ic ? (await G.doCheck(mh, { kind: 'event', skills: ic.skills, dc: ic.dc, base: ic.dc, mods: [], card: def, cardId: def.id, title: `${def.name}: рана — ${ZG.CONDS[def.inflict].name}?` })).success : false;
      if (!avoid) await G.addCond(mh, def.inflict);
      else G.log(`${G.hname(mh)}: рана чистая — без состояния «${ZG.CONDS[def.inflict].name}».`, 'good');
    }
    if (def.theft && !mh.dead && (mh.displayed || []).length) {
      const c = mh.displayed.splice(R.int(mh.displayed.length), 1)[0];
      G.log(`${def.name} срывает выложенную «${ZG.card(c.id).name}».`, 'bad');
      await ui.banner('Ограблен!', `${def.name} забирает «${ZG.card(c.id).name}»`, 'bad');
    } else if (def.theft && !mh.dead && mh.hand.length) {
      const c = mh.hand.splice(R.int(mh.hand.length), 1)[0];
      G.log(`${def.name} отбирает «${ZG.card(c.id).name}».`, 'bad');
      await ui.banner('Ограблен!', `${def.name} забирает «${ZG.card(c.id).name}»`, 'bad');
    }
    if (def.callShift && !loc.closed) {
      // «Свисток смены»: в локацию приходит его смена
      loc.deck.push(G.inst(def.callShift));
      R.shuffle(loc.deck);
      G.log(`${def.name} свистит: в «${G.ldef(loc).name}» приходит ${ZG.card(def.callShift).name}.`, 'bad');
      await ui.flyIn(m.locations.indexOf(loc), 1);
    }
    if (def.alarm) {
      // «Тревога»: теряется карта Часов
      m.clockPos = Math.min(m.clock.length, m.clockPos + def.alarm);
      G.log(`${def.name} поднимает тревогу: −${def.alarm} карта Часов.`, 'bad');
      ui.renderBoard();
      await ui.banner('Тревога!', `Комплекс блокируется: сброшена карта Часов`, 'bad');
    }
    if (def.purgeDiscard && !mh.dead && mh.discard.length) {
      // «Уничтожить улики»: случайные карты из сброса захоронены до конца миссии
      const gone = [];
      for (let i = 0; i < def.purgeDiscard && mh.discard.length; i++) gone.push(mh.discard.splice(R.int(mh.discard.length), 1)[0]);
      (mh.buried = mh.buried || []).push(...gone);
      const names = gone.map((c) => `«${ZG.card(c.id).name}»`).join(', ');
      G.log(`${def.name} уничтожает улики — ${G.hname(mh)}: из сброса до конца миссии захоронены ${names}.`, 'bad');
      await ui.banner('Улики уничтожены', `До конца миссии захоронены: ${names}`, 'bad');
    }
    if (def.detain && !mh.dead) {
      await G.addCond(mh, 'detained');
      m.ts.forceEnd = true;
      G.log(`${G.hname(mh)} задержан: ход окончен, следующий ход пропускается.`, 'bad');
      await ui.banner('Задержан!', `${G.hname(mh)}: ход заканчивается, следующий ход будет пропущен`, 'bad');
    }
    if (def.mutates) {
      m.bossMut = (m.bossMut || 0) + 1;
      G.log(`${def.name}: ${(def.mutateName || 'Мутация').toLowerCase()}, сложность +${m.bossMut}.`, 'bad');
      await ui.banner(`${def.mutateName || 'Мутация'}!`, `${def.name} становится сильнее: +${m.bossMut} к сложности`, 'bad');
    }
    if (def.failSummon) {
      G.openLocs().forEach((l) => {
        l.deck.push(G.inst(ZG.boxPick('enemy', G.def().tier)));
        R.shuffle(l.deck);
      });
      G.log(`${def.name} зовёт мёртвых: в каждую открытую локацию пришёл мертвец.`, 'bad');
      await ui.banner('Зов Матриарх', 'В каждую открытую локацию пришёл мертвец', 'bad');
    }
    // «Течение»: непобеждённый враг уплывает в другую открытую локацию
    const driftTo = def.drift && !loc.closed ? R.pick(G.openLocs().filter((l) => l !== loc)) : null;
    if (driftTo) {
      driftTo.deck.push(inst);
      R.shuffle(driftTo.deck);
      G.log(`${def.name} ${ZG.gf(def, 'не повержен', 'не повержена', 'не повержено')} — течение уносит ${ZG.gf(def, 'его', 'её', 'его')} в «${G.ldef(driftTo).name}».`, 'bad');
      await ui.flyBetween(m.locations.indexOf(loc), m.locations.indexOf(driftTo), def.icon || 'waves');
      return null;
    }
    if (!loc.closed) {
      loc.deck.push(inst);
      R.shuffle(loc.deck);
    }
    G.log(T('undefeated', { name: def.name, pov: ZG.gf(def, 'повержен', 'повержена', 'повержено') }), 'bad');
    return null;
  };

  ZG.cardCheckLineClose = (loc) => {
    const c = ZG.LOCATIONS[loc.id].close;
    return `${c.skills.map(ZG.skillName).join(' / ')} ${c.dc}`;
  };

  /* ---------- Поиск ---------- */
  G.acquire = async function (mh, inst, loc) {
    const m = G.M();
    const def = ZG.card(inst.id);
    if (def.type === 'objective') {
      const ob = G.special().objective;
      const res = await G.doCheck(mh, { kind: 'acquire', skills: def.acquire.skills, dc: def.acquire.dc, base: def.acquire.dc, mods: [], card: def, cardId: def.id, title: `${ob.label}: ${def.name}` });
      if (!res.success) {
        loc.deck.push(inst);
        R.shuffle(loc.deck);
        G.log(`${def.name} не поддалась — осталась в локации.`, 'bad');
        return null;
      }
      m.obj = (m.obj || 0) + 1;
      UI().fxLoot();
      G.log(`${ob.label}: ${m.obj}/${ob.need}.`, 'loot');
      await UI().banner(`${ob.label}: ${m.obj}/${ob.need}`, m.obj >= ob.need ? 'Достаточно! Осталось разобраться с Угрозой.' : 'Канистра в автобусе', 'good');
      if (m.bossDown && m.obj >= ob.need) {
        await UI().banner('Можно уезжать!', 'Топливо собрано, Угроза уничтожена', 'win');
        return 'win';
      }
      return null;
    }
    const res = await G.doCheck(mh, G.acquireCheck(def, loc));
    if (res.success) {
      inst.l = 1;
      mh.hand.push(inst);
      m.stats.finds++;
      G.S().campaign.stats.finds++;
      G.log(T('acquired', { name: def.name }), 'loot');
      UI().fxLoot();
      const sp = G.def().special || {};
      if (sp.bonusConsumable && def.type === 'consumable') {
        const extra = G.inst(ZG.boxPick('consumable', G.def().tier), { l: 1 });
        mh.hand.push(extra);
        G.log(`Полные полки: ещё «${ZG.card(extra.id).name}».`, 'loot');
        await UI().gain(extra, 'Полные полки!');
      }
    } else {
      if (G.lrule(loc).findsStay && !loc.closed) {
        loc.deck.push(inst);
        G.log(`«${def.name}» не далась — ушла под низ колоды локации.`, 'bad');
      } else G.log(T('lost_find', { name: def.name }), 'bad');
      UI().fxLost();
    }
    return null;
  };

  /* ---------- Препятствия ---------- */
  G.event = async function (mh, inst, loc) {
    const def = ZG.card(inst.id);
    const ui = UI();
    if (def.choice) {
      const idx = await ui.choose({ title: def.name, text: def.flavor, options: def.choice.map((c) => ({ label: c.label, sub: c.sub })), keepCard: true });
      const opt = def.choice[idx];
      G.log(`${G.hname(mh)}: «${def.name}» — ${opt.label}.`, 'card');
      if (opt.check) {
        const res = await G.doCheck(mh, G.eventCheck(opt.check, loc, `${def.name}: ${opt.label}`, def));
        return await G.applyFx(mh, loc, res.success ? opt.success : opt.fail);
      }
      return await G.applyFx(mh, loc, opt.effects);
    }
    const res = await G.doCheck(mh, G.eventCheck(def.check, loc, `${T('check_event')}: ${def.name}`, def));
    return await G.applyFx(mh, loc, res.success ? def.success : def.fail);
  };

  G.applyFx = async function (mh, loc, list) {
    const ui = UI();
    const tier = G.def().tier;
    for (const fx of list || []) {
      if (mh.dead) return null;
      if (fx.damage) {
        const n = typeof fx.damage === 'string' ? ZG.rollDie(fx.damage) : fx.damage;
        await G.damage(mh, n, { source: 'Препятствие', dmgType: fx.dmgType });
      }
      if (fx.noise) { G.addNoise(loc, fx.noise); ui.fxNoise(loc); G.log(`Шум +${fx.noise}.`, 'bad'); }
      if (fx.infect) await G.infect(mh);
      if (fx.cond) await G.addCond(mh, fx.cond);
      if (fx.explore && G.M().ts) {
        G.M().ts.explores += fx.explore;
        G.log(`${G.hname(mh)}: +${fx.explore} исследование.`, 'good');
        ui.toast(`${ZG.icon('search')} +${fx.explore} исследование`, 'loot');
      }
      if (fx.clock) {
        const m = G.M();
        m.clockPos = Math.min(m.clock.length, m.clockPos + fx.clock);
        G.log('Потеряно время: −1 карта Часов.', 'bad');
        await ui.banner('Время уходит', 'Сброшена карта Часов', 'bad');
      }
      if (fx.gain) {
        const c = G.inst(ZG.boxPick(fx.gain, tier), { l: 1 });
        mh.hand.push(c);
        G.log(`Найдено: «${ZG.card(c.id).name}».`, 'loot');
        await ui.gain(c);
      }
      if (fx.summon) {
        const e = G.inst(ZG.boxPick('enemy', tier));
        G.log('Из темноты появляется мертвец!', 'bad');
        const r = await G.encounter(mh, e, loc, { noEvade: false });
        if (r === 'win') return r;
      }
      if (fx.shock) {
        for (let i = 0; i < fx.shock && mh.hand.length; i++) mh.discard.push(mh.hand.splice(R.int(mh.hand.length), 1)[0]);
        G.log(`${G.hname(mh)} в шоке: сброшено ${fx.shock} карт.`, 'bad');
        await ui.banner('Шок', `Сброшены случайные карты из руки`, 'bad');
      }
      if (fx.banishType) {
        for (const pile of [mh.deck, mh.discard, mh.hand]) {
          const i = pile.findIndex((c) => ZG.card(c.id).type === fx.banishType);
          if (i >= 0) {
            const c = pile.splice(i, 1)[0];
            G.log(`Изгнано: «${ZG.card(c.id).name}». Это будет сниться.`, 'bad');
            await ui.banner('Это будет сниться', `Изгнана карта «${ZG.card(c.id).name}»`, 'bad');
            break;
          }
        }
      }
      if (fx.toll) {
        // «Плата за проезд»: герой сам выбирает, какую карту отдать
        const ok = (c) => c.id !== 'infection';
        if (mh.hand.some(ok)) {
          const us = await ui.pickCards(mh, fx.toll, 'Плата за проезд', 'Банда требует плату: сбросьте карту из руки.', false, ok);
          us.forEach((u) => { const c = mh.hand.find((x) => x.u === u); G.moveByMode(mh, u, 'discard'); G.log(`${G.hname(mh)} платит за проезд: «${ZG.card(c.id).name}».`, 'bad'); });
        }
      }
      if (fx.banishRandomHand) {
        if (mh.hand.length) {
          const c = mh.hand.splice(R.int(mh.hand.length), 1)[0];
          G.log(`Отдано: «${ZG.card(c.id).name}».`, 'card');
        }
      }
      if (fx.stranger) {
        const c = G.inst('stranger', { l: 1 });
        const roll = ZG.rollDie('d6');
        if (roll <= 2) {
          G.log(`Незнакомец был укушен (d6 = ${roll}) и обращается!`, 'bad');
          await ui.banner(`d6 = ${roll}`, 'Он был укушен…', 'bad');
          const r = await G.encounter(mh, G.inst('strangerz'), loc, { noEvade: true });
          if (r === 'win') return r;
        } else {
          mh.hand.push(c);
          G.log(`Незнакомец присоединяется (d6 = ${roll}).`, 'loot');
          await ui.gain(c, `d6 = ${roll}: он чист`);
        }
      }
    }
    return null;
  };

  /* ============================== Проверка ============================== */
  G.playDef = (p) => ZG.card(p.id).plays[p.pi];

  G.weaponPlay = (ctx) => ctx.played.find((p) => G.playDef(p).weapon);

  G.pool = function (ctx) {
    const m = G.M();
    const mh = ctx.mh;
    const ph = G.ph(mh);
    const ck = ctx.check;
    const night = m.phase === 'night';
    const wp = G.weaponPlay(ctx);
    let opts = wp ? G.playDef(wp).weapon.slice() : ck.skills.slice();
    // «Твёрдая рука»: с «Тихим» оружием — кубик Смекалки вместо Ловкости, без бонуса Медицины
    if (mh.id === 'marina' && wp && ZG.card(wp.id).traits.includes('Тихое') && !opts.includes('wit')) opts.push('wit');
    let skill = ctx.skill && opts.includes(ctx.skill) ? ctx.skill : null;
    if (!skill) skill = opts.slice().sort((a, b) => G.skillScore(ph, b) - G.skillScore(ph, a))[0];
    const sv = G.skillValue(ph, skill);
    const dice = [{ d: sv.die, src: ZG.skillName(skill) }];
    let bonus = sv.bonus;
    const parts = [];
    if (sv.bonus) parts.push({ label: ZG.skillName(skill), v: sv.bonus });
    let noise = 0;
    let noiseOthers = 0;
    let noiseMod = 0;
    ctx.played.forEach((p) => {
      const pl = G.playDef(p);
      const name = ZG.card(p.id).name;
      const ds = night && pl.nightDice ? pl.nightDice : pl.dice || [];
      const owner = G.M().heroes.find((h) => h.id === p.owner) || mh;
      const oneTo = pl.oneToFive && (ZG.HEROES[owner.id].skills[pl.oneToFive] || 0) > 0 ? 5 : 0;
      ds.forEach((d) => dice.push(oneTo ? { d, src: name, oneTo } : { d, src: name }));
      const sd = night && pl.nightSkillDie ? pl.nightSkillDie : pl.skillDie || 0;
      for (let i = 0; i < sd; i++) dice.push({ d: sv.die, src: name });
      if (pl.bonus) { bonus += pl.bonus; parts.push({ label: name, v: pl.bonus }); }
      noise += pl.noise || 0;
      noiseOthers += pl.noiseOthers || 0;
      noiseMod += pl.noiseMod || 0;
    });
    if (mh.id === 'ten' && ck.kind === 'combat' && wp && ZG.card(wp.id).traits.includes('Тихое')) dice.push({ d: 'd4', src: 'Бесшумная' });
    const plr = G.lrule(G.loc(mh));
    if (plr.firearmNoise && wp && ZG.card(wp.id).traits.includes('Огнестрел')) noise += plr.firearmNoise;
    if (plr.stealthBonus && (ck.kind === 'evade' || skill === 'stealth')) { bonus += plr.stealthBonus; parts.push({ label: 'Локация: укрытие', v: plr.stealthBonus }); }
    if (mh.id === 'grom') {
      if (ck.kind === 'combat' && wp) dice.push({ d: 'd4', src: 'Боевой опыт' });
      if (wp && (G.playDef(wp).noise || 0) > 0) { noise += 1; if (ck.kind === 'combat') dice.push({ d: 'd4', src: 'Громкий' }); } // «Громкий»: шум +1, но и +1d4
    }
    if (mh.id === 'marina' && skill === 'medicine' && ck.kind !== 'combat') dice.push({ d: 'd4', src: 'Твёрдая рука' });
    if (mh.id === 'palych') {
      if (ck.kind === 'close') dice.push({ d: 'd4', src: 'Золотые руки' });
      if (ck.kind === 'combat' && wp && ZG.card(wp.id).traits.includes('Инструмент')) dice.push({ d: 'd4', src: 'Золотые руки' });
      if (ck.kind === 'acquire' && ck.card && (ck.card.type === 'weapon' || ck.card.type === 'item')) { bonus += 2; parts.push({ label: 'Барахольщик', v: 2 }); }
    }
    if (wp) {
      G.missingProf(mh, wp.id).filter((k) => ZG.PROF[k].kind === 'weapon').forEach((k) => {
        bonus -= 4;
        parts.push({ label: `Нет владения: ${ZG.PROF[k].name}`, v: -4 });
      });
    }
    (mh.displayed || []).forEach((c) => {
      const dd = ZG.card(c.id).displayed;
      const pc = dd && dd.check;
      if (!pc) return;
      const kOk = pc.kind === 'any' || (pc.kind === 'noncombat' ? ck.kind !== 'combat' : pc.kind.includes(ck.kind));
      if (!kOk || (pc.night && !night)) return;
      (pc.dice || []).forEach((d) => dice.push({ d, src: ZG.card(c.id).name + ' (выл.)' }));
    });
    if (ck.enemy) {
      const en = ck.enemy;
      const traitsOf = (p) => ZG.card(p.id).traits || [];
      const playedTraits = new Set();
      ctx.played.forEach((p) => traitsOf(p).forEach((t) => playedTraits.add(t)));
      (en.immune || []).forEach((t) => {
        const bad = ctx.played.filter((p) => traitsOf(p).includes(t)).map((p) => ZG.card(p.id).name);
        if (!bad.length) return;
        for (let i = dice.length - 1; i >= 1; i--) if (bad.includes(dice[i].src)) dice.splice(i, 1);
        ctx.played.filter((p) => traitsOf(p).includes(t)).forEach((p) => { const b = G.playDef(p).bonus || 0; if (b) { bonus -= b; parts.push({ label: `Иммунитет (${t})`, v: -b }); } });
        parts.push({ label: `Иммунитет: ${t} — кубики не считаются`, v: 0 });
      });
      Object.keys(en.weak || {}).forEach((t) => { if (playedTraits.has(t)) dice.push({ d: en.weak[t], src: `Уязвим: ${t}` }); });
      Object.keys(en.resist || {}).forEach((t) => { if (playedTraits.has(t)) { bonus -= en.resist[t]; parts.push({ label: `Стойкость: ${t}`, v: -en.resist[t] }); } });
    }
    const ignoreArmor = ctx.played.some((p) => G.playDef(p).ignoreArmor);
    if (ignoreArmor && ck.enemy && ck.enemy.armor) parts.push({ label: 'Броня врага не действует', v: 0 });
    if (!ignoreArmor && ck.enemy && ck.enemy.armor && (skill === 'melee' || ZG.attrOf(skill) === 'str')) {
      bonus -= ck.enemy.armor;
      parts.push({ label: 'Броня врага', v: -ck.enemy.armor });
    }
    if (G.conds(mh).numb) {
      const top = Math.max(...dice.map((x) => ZG.sides(x.d)));
      if (top > 4) {
        dice.forEach((x) => { if (ZG.sides(x.d) === top) x.d = ZG.dieStep(x.d, -1); });
        parts.push({ label: `Онемение: d${top} → d${top - 2}`, v: 0 });
      }
    }
    noise = Math.max(0, noise + noiseMod);
    const avg = ZG.sum(dice.map((x) => ZG.dieAvg(x.d))) + bonus;
    const chance = G.chance(dice.map((x) => x.d), bonus, ck.dc);
    return { skill, opts, dice, bonus, parts, noise, noiseOthers, avg, chance };
  };

  /** Вероятность успеха (точная свёртка распределений) */
  G.chance = function (dice, bonus, dc) {
    let dist = new Map([[0, 1]]);
    dice.forEach((d) => {
      const s = ZG.sides(d);
      const nd = new Map();
      dist.forEach((p, v) => {
        for (let k = 1; k <= s; k++) nd.set(v + k, (nd.get(v + k) || 0) + p / s);
      });
      dist = nd;
    });
    let ok = 0;
    dist.forEach((p, v) => { if (v + bonus >= dc) ok += p; });
    return ok;
  };

  G.canPlay = function (ctx, owner, inst, pi) {
    const m = G.M();
    const def = ZG.card(inst.id);
    if (!def || !def.plays) return false;
    const pl = def.plays[pi];
    if (!pl || pl.on !== 'check') return false;
    const ck = ctx.check;
    if (pl.helpOnly && owner === ctx.mh) return false; // только в проверку соседа
    if (owner !== ctx.mh) {
      if (!pl.help || owner.dead || (owner.loc !== ctx.mh.loc && !pl.helpAnyLoc) || G.conds(owner).detained) return false;
    }
    if (pl.kind !== 'any') {
      if (pl.kind === 'noncombat') { if (ck.kind === 'combat') return false; }
      else if (!pl.kind.includes(ck.kind)) return false;
    }
    if (ctx.played.some((p) => p.u === inst.u)) return false;
    if (ctx.played.some((p) => p.owner === owner.id && ZG.card(p.id).type === def.type)) return false; // по одной карте каждого типа от каждого героя
    if (pl.night && m.phase !== 'night') return false;
    // по типу искомой карты (поиск): cardTypes — только для них, notCardTypes — кроме них
    const ct = ck.kind === 'acquire' && ck.card ? ck.card.type : null;
    if (pl.cardTypes && !(ct && pl.cardTypes.includes(ct))) return false;
    if (pl.notCardTypes && ct && pl.notCardTypes.includes(ct)) return false;
    // против живого человека / против мертвеца
    if (pl.enemyLiving != null && (!ck.enemy || !!ck.enemy.living !== pl.enemyLiving)) return false;
    if (pl.trait) {
      const wp = G.weaponPlay(ctx);
      if (!wp || !ZG.card(wp.id).traits.includes(pl.trait)) return false;
    }
    if (pl.skills) {
      const pool = G.pool(ctx);
      if (!pl.skills.includes(pool.skill) && !pl.skills.includes(ZG.attrOf(pool.skill))) return false;
    }
    return true;
  };

  /** Удалить сыгранные карты, ставшие недопустимыми (например, сменили оружие) */
  G.pruneCtx = function (ctx) {
    let changed = true;
    while (changed) {
      changed = false;
      for (let i = ctx.played.length - 1; i >= 0; i--) {
        const p = ctx.played[i];
        const rest = Object.assign({}, ctx, { played: ctx.played.filter((_, j) => j !== i) });
        const owner = ctx.mh.id === p.owner ? ctx.mh : G.M().heroes.find((h) => h.id === p.owner);
        if (!G.canPlay(rest, owner, { u: p.u, id: p.id }, p.pi)) {
          ctx.played.splice(i, 1);
          changed = true;
        }
      }
    }
  };

  G.rollCheck = function (ctx) {
    const pool = G.pool(ctx);
    const rolls = pool.dice.map((x) => { let v = ZG.rollDie(x.d); if (x.oneTo && v === 1) v = x.oneTo; return { d: x.d, src: x.src, v }; });
    const total = ZG.sum(rolls.map((r) => r.v)) + pool.bonus;
    return { pool, rolls, total, dc: ctx.check.dc, success: total >= ctx.check.dc };
  };

  G.doCheck = async function (mh, check) {
    const ctx = { mh, check, played: [], skill: null };
    const res = await UI().check(ctx);
    // применить режимы сыгранных карт
    ctx.played.forEach((p) => {
      const owner = G.M().heroes.find((h) => h.id === p.owner);
      const pl = G.playDef(p);
      let mode = pl.mode;
      if (pl.rechargeOnSuccess && res.success && (mode === 'discard' || mode === 'bury')) mode = 'recharge';
      if (pl.burnOnFail && !res.success) mode = 'burn';
      if (pl.rechargeCheck) {
        // проверка в конце: успех — перезарядить вместо сброса
        const rc = pl.rechargeCheck;
        const php = G.ph(owner);
        const sk = rc.skills.slice().sort((a, b) => G.skillScore(php, b) - G.skillScore(php, a))[0];
        const v = G.skillValue(php, sk);
        const roll = ZG.rollDie(v.die) + v.bonus;
        const okR = roll >= rc.dc;
        mode = okR ? 'recharge' : mode;
        G.log(`«${ZG.card(p.id).name}»: ${ZG.skillName(sk)} ${roll}/${rc.dc} — ${okR ? 'перезаряжен' : 'в сброс'}.`, okR ? 'good' : 'bad');
        UI().toast(`«${ZG.esc(ZG.card(p.id).name)}» ${okR ? 'перезаряжен' : 'в сброс'} (${roll}/${rc.dc})`, okR ? 'loot' : 'bad');
      }
      if (pl.noiseAtOwner) { const ol = G.loc(owner); G.addNoise(ol, pl.noiseAtOwner); UI().fxNoise(ol); }
      G.moveByMode(owner, p.u, mode);
      if (pl.gainCard) {
        // например, Оружейник Хэнк: «возьмите в руку карту Патроны»
        owner.hand.push(G.inst(pl.gainCard, { l: 1 }));
        G.log(`${G.hname(owner)} получает «${ZG.card(pl.gainCard).name}».`, 'loot');
      }
    });
    if (res.pool.noise > 0) {
      const loc = G.loc(mh);
      G.addNoise(loc, res.pool.noise);
      UI().fxNoise(loc);
    }
    if (res.pool.noiseOthers > 0) {
      const loc = G.loc(mh);
      G.openLocs().filter((l) => l !== loc).forEach((l) => { G.addNoise(l, res.pool.noiseOthers); UI().fxNoise(l); });
      G.log(`Шум +${res.pool.noiseOthers} во всех остальных локациях.`, 'bad');
    }
    G.log(`${G.hname(mh)}: ${check.title} — ${res.total} против ${check.dc}: ${res.success ? 'успех' : 'провал'}.`, res.success ? 'good' : 'bad');
    return res;
  };

  /* ============================== Урон, инфекция, смерть ============================== */
  G.passiveReduce = (mh, opts) => ZG.sum((mh.displayed || []).map((c) => {
    if (opts && opts.pierceLight && G.lightArmor(ZG.card(c.id))) return 0;
    const dd = ZG.card(c.id).displayed;
    return dd && dd.reduce && (!dd.combatOnly || (opts && opts.combat)) ? dd.reduce : 0;
  }));
  /** Лёгкая броня: «Броня» без «Тяжёлой брони» */
  G.lightArmor = (def) => !!def && (def.traits || []).includes('Броня') && !(def.traits || []).includes('Тяжёлая броня');
  G.playBlocks = (pl, opts, def) => !(opts && opts.noReduce) && !(opts && opts.pierceLight && G.lightArmor(def)) && (!pl.onlyType || pl.onlyType.includes(opts && opts.dmgType)) && (!pl.combatOnly || (opts && opts.combat));
  G.damageNeeded = function (mh, n, plays, opts) {
    let reduce = 0;
    let removed = 0;
    plays.forEach((p) => {
      const pl = G.playDef(p);
      if (!G.playBlocks(pl, opts, ZG.card(p.id))) return;
      reduce = pl.reduce === 'all' ? Infinity : reduce + pl.reduce;
      if (G.effMode(mh, p.id, pl) !== 'reveal') removed++;
    });
    const left = Math.max(0, n - reduce);
    // Инфекцию нельзя сбросить как урон
    const usedU = new Set(plays.map((p) => p.u));
    const canDiscard = mh.hand.filter((c) => c.id !== 'infection' && !usedU.has(c.u)).length;
    return Math.min(left, canDiscard);
  };

  G.damage = async function (mh, n, opts) {
    opts = opts || {};
    G.lastHit = 0; // урон, прошедший через броню и блоки (для укуса), даже если в руке нечего сбросить
    if (n <= 0 || mh.dead) return 0;
    opts.noReduce = !!(opts.dmgType && G.conds(mh).vuln);
    const pr = opts.noReduce ? 0 : G.passiveReduce(mh, opts);
    if (pr) {
      const blocked = Math.min(pr, n);
      n -= blocked;
      G.log(`Выложенная броня блокирует ${blocked} урона.`, 'good');
      if (n <= 0) { UI().toast(`${ZG.icon('shield')} Броня поглотила удар`, 'loot'); return 0; }
    }
    await UI().tip('damage');
    const r = await UI().damage(mh, n, opts);
    let reduce = 0;
    if (opts.noReduce) r.plays = [];
    r.plays = r.plays.filter((p) => G.playBlocks(G.playDef(p), opts, ZG.card(p.id)));
    r.plays.forEach((p) => {
      const pl = G.playDef(p);
      reduce = pl.reduce === 'all' ? Infinity : reduce + pl.reduce;
      G.moveByMode(mh, p.u, G.effMode(mh, p.id, pl));
    });
    r.discards = r.discards.filter((u) => { const c = mh.hand.find((x) => x.u === u); return c && c.id !== 'infection'; });
    r.discards.forEach((u) => G.moveByMode(mh, u, 'discard'));
    G.lastHit = Math.max(0, n - reduce);
    const taken = Math.min(G.lastHit, r.discards.length);
    G.log(`${G.hname(mh)} получает ${taken} урона${opts.source ? ` (${opts.source})` : ''}.`, taken ? 'bad' : '');
    return taken;
  };

  G.infect = async function (mh) {
    if (mh.dead) return false;
    const ui = UI();
    const opts = [];
    mh.hand.forEach((c) => {
      const d = ZG.card(c.id);
      (d.plays || []).forEach((p) => {
        if (p.on === 'infect') opts.push({ label: `${ZG.T('mode_' + p.mode)}: «${d.name}»`, sub: 'Отменить заражение', u: c.u, mode: p.mode });
      });
    });
    if (opts.length) {
      opts.push({ label: 'Принять заражение', sub: '' });
      const i = await ui.choose({ title: 'Укус!', text: 'Можно отменить Инфекцию.', options: opts });
      if (opts[i].u) {
        G.moveByMode(mh, opts[i].u, opts[i].mode || 'discard');
        G.log(`${G.hname(mh)} избегает заражения.`, 'good');
        return false;
      }
    }
    mh.deck.push(G.inst('infection'));
    R.shuffle(mh.deck);
    const n = G.infCount(mh);
    G.log(T('infected', { name: G.hname(mh) }) + ` (${n}/3).`, 'bad');
    await ui.fxInfect(mh, n);
    await ui.tip('infection');
    if (n >= 3) await G.kill(mh, 'turned');
    return true;
  };

  G.kill = async function (mh, reason) {
    if (mh.dead) return;
    mh.dead = true;
    const loc = G.loc(mh);
    if (reason === 'turned') {
      mh.turned = true;
      if (!loc.closed) {
        loc.deck.push(G.inst('turned_' + mh.id));
        R.shuffle(loc.deck);
      }
      G.log(T('turned', { name: G.hname(mh) }), 'death');
    } else {
      G.log(T('died', { name: G.hname(mh) }) + ' — колода иссякла.', 'death');
    }
    await UI().fxDeath(mh, reason);
  };

  /* ============================== Шум и орда ============================== */
  G.addNoise = function (loc, n) {
    if (loc.closed) return;
    loc.noise = Math.max(0, loc.noise + n);
  };

  /** «Набег» банды («Закон Кейна»): самая шумная открытая локация.
   * Герои там захоранивают по случайной карте из руки. Банда с жетонами вскрывает колоду:
   * первая карта бесплатно, каждая следующая — жетон. Мертвеца убивают за жетон (шум +1, карта изгнана),
   * свои (gang) уходят с бандой (+1 жетон), остальное уносят. Угроза/вожак или нехватка жетонов — стоп. */
  G.raid = async function (tokens) {
    const m = G.M();
    const open = G.openLocs();
    if (!open.length) return;
    const top = Math.max(...open.map((l) => l.noise));
    const loc = R.pick(open.filter((l) => l.noise === top));
    const li = m.locations.indexOf(loc);
    const lname = G.ldef(loc).name;
    G.log(`НАБЕГ! Банда грабит «${lname}».`, 'bad');
    // потери героев
    const losses = [];
    for (const h of G.heroesAt(li)) {
      const pool = h.hand.filter((c) => c.id !== 'infection');
      if (!pool.length) continue;
      const c = R.pick(pool);
      h.hand.splice(h.hand.indexOf(c), 1);
      (h.buried = h.buried || []).push(c);
      losses.push({ mh: h, c });
      G.log(`${G.hname(h)}: банда забирает «${ZG.card(c.id).name}» (захоронено до конца миссии).`, 'bad');
    }
    // разграбление колоды
    const steps = [];
    let kills = 0, n = 0, why = 'deck';
    while (loc.deck.length) {
      if (n > 0) {
        if (tokens < 1) { why = 'tokens'; break; }
        tokens--;
      }
      const c = loc.deck[0];
      const d = ZG.card(c.id);
      n++;
      if (d.type === 'boss' || d.type === 'henchman') { steps.push({ c, res: 'stop', tokens }); why = 'villain'; break; }
      if (d.type === 'enemy' && !d.living) {
        if (tokens < 1) { steps.push({ c, res: 'stay', tokens }); why = 'tokens'; break; }
        tokens--;
        loc.deck.shift();
        kills++;
        steps.push({ c, res: 'kill', tokens });
        continue;
      }
      loc.deck.shift();
      if (d.gang) { tokens++; steps.push({ c, res: 'join', tokens }); continue; }
      steps.push({ c, res: 'loot', tokens });
    }
    R.shuffle(loc.deck);
    steps.forEach((st) => {
      const nm = ZG.card(st.c.id).name;
      if (st.res === 'kill') G.log(`Бандиты убивают «${nm}».`, 'card');
      else if (st.res === 'join') G.log(`«${nm}» уходит с бандой.`, 'card');
      else if (st.res === 'loot') G.log(`Бандиты уносят «${nm}».`, 'card');
    });
    const last = steps[steps.length - 1];
    if (why === 'tokens') G.log('Жетоны кончились — банда уходит.', 'card');
    if (why === 'villain') G.log(`Бандиты наткнулись на «${ZG.card(last.c.id).name}» и ушли.`, 'bad');
    await UI().raid(li, steps, losses, why);
    if (kills) {
      G.addNoise(loc, kills);
      UI().fxNoise(loc);
      G.log(`Стрельба банды: шум +${kills}.`, 'bad');
    }
    UI().renderBoard();
    if (kills) await G.checkHorde(loc);
  };

  /** Перемещение вожака между локациями (особые правила миссий) */
  G.moveHench = async function (from, to, why) {
    if (!from || !to || from === to || to.closed) return;
    const hid = G.def().henchman;
    const i = from.deck.findIndex((c) => c.id === hid);
    if (i < 0) return;
    const c = from.deck.splice(i, 1)[0];
    to.deck.push(c);
    R.shuffle(to.deck);
    const name = ZG.card(hid).name;
    await UI().flyBetween(G.M().locations.indexOf(from), G.M().locations.indexOf(to), 'ghost');
    G.log(`${why}: ${name} уходит из «${G.ldef(from).name}» в «${G.ldef(to).name}».`, 'bad');
    ZG.Audio.sfx('growl', 0.7);
    await UI().banner(`${why}: ${name}`, `Из «${G.ldef(from).name}» в «${G.ldef(to).name}»`, 'warn');
    UI().renderBoard();
  };

  G.checkHorde = async function (loc) {
    if (loc.closed || loc.noise < loc.limit) return;
    const m = G.M();
    if (m.hordeBusy) return; // идёт бой с ордой — новая орда дождётся его конца
    const size = (G.def().special || {}).hordeSize || 2;
    const zs = Array.from({ length: size }, () => G.inst(ZG.boxPick('enemy', G.def().tier)));
    // Если ходящий герой здесь — орда сразу нападает на него (право на исследование сохраняется).
    // При событии Часов в начале хода ходящим считается герой, чей ход начинается.
    const mh = m.heroes[m.active];
    const here = mh && !mh.dead && mh.loc === m.locations.indexOf(loc);
    // если ходящий здесь — нападает только первый мертвец, остальные уходят в колоду
    const attacker = here ? zs[0] : null;
    const rest = here ? zs.slice(1) : zs;
    if (rest.length) {
      if (G.lrule(loc).hordeTop) rest.forEach((z) => loc.deck.unshift(z));
      else { rest.forEach((z) => loc.deck.push(z)); R.shuffle(loc.deck); }
    }
    loc.noise = 0;
    m.stats.hordes++;
    UI().renderBoard();
    await UI().flyIn(m.locations.indexOf(loc), size);
    G.log(here ? `ОРДА! +${size} мертвецов в «${G.ldef(loc).name}»: один сразу нападает на ${ZG.HEROES[mh.id].acc || G.hname(mh)}${rest.length ? `, ${rest.length} — в колоду локации` : ''}.` : `ОРДА! +${size} мертвецов в «${G.ldef(loc).name}».`, 'bad');
    await UI().horde(loc, size, here ? mh : null);
    if ((G.def().special || {}).henchToHorde) {
      const hid = G.def().henchman;
      const src = G.openLocs().filter((l) => l !== loc && l.deck.some((c) => c.id === hid));
      if (src.length) await G.moveHench(R.pick(src), loc, 'На крик');
    }
    if (here) {
      m.hordeBusy = true;
      try {
        if (!mh.dead && !m.over) await G.encounter(mh, attacker, loc, { horde: true });
      } finally { m.hordeBusy = false; }
      // шум, накопленный в боях с ордой, проверяется только после всех её боёв
      if (!mh.dead && !m.over) for (const l of G.openLocs()) await G.checkHorde(l);
    }
  };

  /* ============================== Баррикады и угроза ============================== */
  G.tryClose = async function (mh, loc, fromHench) {
    G.M().ts.closeTried = true; // одна попытка за ход — в т.ч. сразу после победы над вожаком
    await UI().tip('close');
    const lr = G.lrule(loc);
    if (lr.closeCost) {
      const t = lr.closeCost;
      const ok = mh.hand.filter((c) => ZG.card(c.id).type === t);
      if (!ok.length) {
        G.log(`Чтобы заколотить «${G.ldef(loc).name}», нужно сбросить ${ZG.T('type_' + t)} — в руке нет.`, 'bad');
        await UI().banner('Нечем заколотить', `Нужно сбросить карту типа «${ZG.T('type_' + t)}»`, 'warn');
        return null;
      }
      const us = await UI().pickCards(mh, 1, 'Цена попытки', `Сбросьте карту типа «${ZG.T('type_' + t)}», чтобы попытаться заколотить.`, false, (c) => ZG.card(c.id).type === t);
      us.forEach((u) => G.moveByMode(mh, u, 'discard'));
    }
    let res = await G.doCheck(mh, G.closeCheck(loc));
    if (res.success && lr.closeTwice) {
      await UI().banner('Ещё одна доска', 'Нужна вторая успешная проверка', 'warn');
      res = await G.doCheck(mh, G.closeCheck(loc, `${T('check_close')}: ${G.ldef(loc).name} (2/2)`));
    }
    if (!res.success) {
      G.log(`Не удалось заколотить «${G.ldef(loc).name}».`, 'bad');
      if (lr.closeFail) return await G.applyFx(mh, loc, lr.closeFail);
      return null;
    }
    // Если в колоде притаилась Угроза — локация остаётся открытой, всё остальное изгоняется
    const villains = loc.deck.filter((i) => ZG.card(i.id).type === 'boss');
    if (villains.length) {
      const banished = loc.deck.length - villains.length;
      await UI().purgeAnim(G.M().locations.indexOf(loc), banished);
      G.rescueObjectives(loc, loc.deck.filter((c) => ZG.card(c.id).type === 'objective'));
      loc.deck = R.shuffle(villains);
      loc.henchDown = false;
      G.log(`«${G.ldef(loc).name}» не заколочена: здесь притаилась Угроза. Изгнано карт: ${banished}. Угроза осталась в колоде.`, 'bad');
      ZG.Audio.sfx('braam');
      await UI().banner(T('boss_hiding'), `Локация остаётся открытой. Всё остальное вычищено (${banished}) — в колоде осталась только Угроза.`, 'bad', true);
      return null;
    }
    await G.closeLoc(loc);
    return null;
  };

  /** Карты-цели (канистры) не изгоняются: они переносятся в другую открытую локацию или сразу засчитываются */
  G.rescueObjectives = function (loc, cards) {
    if (!cards || !cards.length) return;
    const m = G.M();
    const ob = G.special().objective;
    const open = G.openLocs().filter((l) => l !== loc);
    cards.forEach((c) => {
      if (open.length) {
        const to = R.pick(open);
        to.deck.push(c);
        R.shuffle(to.deck);
        G.log(`«${ZG.card(c.id).name}» перенесена в «${G.ldef(to).name}».`, 'loot');
      } else if (ob) {
        m.obj = (m.obj || 0) + 1;
        G.log(`«${ZG.card(c.id).name}» найдена при зачистке: ${ob.label} ${m.obj}/${ob.need}.`, 'loot');
      }
    });
  };

  G.closeLoc = async function (loc) {
    const purged = loc.deck.filter((c) => ZG.card(c.id).type !== 'objective').length;
    if (purged) await UI().purgeAnim(G.M().locations.indexOf(loc), purged);
    G.rescueObjectives(loc, loc.deck.filter((c) => ZG.card(c.id).type === 'objective'));
    loc.closed = true;
    loc.deck = [];
    loc.noise = 0;
    G.log(T('barricade_done', { loc: G.ldef(loc).name }), 'good');
    await UI().barricade(loc);
    await G.closeReward(loc);
  };

  G.closeReward = async function (loc) {
    const m = G.M();
    const fx = G.ldef(loc).onClose;
    if (!fx || !fx.length) return;
    const li = m.locations.indexOf(loc);
    const here = G.heroesAt(li);
    const closer = m.heroes[m.active] && !m.heroes[m.active].dead ? m.heroes[m.active] : here[0];
    const lines = [];
    for (const f of fx) {
      if (f.time) {
        for (let i = 0; i < f.time; i++) m.clock.push({ id: 'calm', name: 'Передышка' });
        UI().renderBoard();
        lines.push(`Часы +${f.time}`);
      }
      if (f.healHere) here.forEach((h) => { const n = G.heal(h, f.healHere); if (n) lines.push(`${G.hname(h)}: лечение ${n}`); });
      if (f.cureHere) here.forEach((h) => { const n = G.cure(h, f.cureHere); if (n) lines.push(`${G.hname(h)}: −${n} Инфекция`); });
      if (f.condsHere) here.forEach((h) => { if (G.clearConds(h)) lines.push(`${G.hname(h)}: состояния сняты`); });
      if (f.quiet) { m.locations.forEach((l) => (l.noise = Math.max(0, l.noise - f.quiet))); lines.push(`Шум всех локаций −${f.quiet}`); }
      if (f.gain && closer) {
        const c = G.inst(ZG.boxPick(f.gain, G.def().tier), { l: 1 });
        closer.hand.push(c);
        lines.push(`${G.hname(closer)} находит «${ZG.card(c.id).name}»`);
      }
    }
    if (lines.length) {
      G.log(`Награда за «${G.ldef(loc).name}»: ${lines.join('; ')}.`, 'loot');
      await UI().banner('Награда: заколочено', lines.join(' · '), 'good');
      UI().renderBoard();
    }
  };

  /** Временное перекрытие путей перед боем с Угрозой (не в её локации) */
  G.villainGuards = async function (mh, loc) {
    const m = G.M();
    const ui = UI();
    const guarded = [];
    for (const l of G.openLocs()) {
      if (l === loc) continue;
      const li = m.locations.indexOf(l);
      for (const h of G.heroesAt(li)) {
        if (G.conds(h).detained) { G.log(`${G.hname(h)} задержан и не может перекрыть «${G.ldef(l).name}».`, 'bad'); continue; }
        const c = await ui.choose({
          title: 'Перекрыть путь',
          text: `${G.hname(h)}: перед боем с Угрозой перекрыть «${G.ldef(l).name}», чтобы ей некуда было бежать? (${ZG.cardCheckLineClose(l)}) Награда «Когда заколочено» при этом не срабатывает.`,
          options: [{ label: 'Перекрыть', primary: true }, { label: 'Нет' }],
        });
        if (c !== 0) continue;
        const res = await G.doCheck(h, G.closeCheck(l, `Перекрыть: ${G.ldef(l).name}`));
        if (res.success) {
          guarded.push(li);
          G.log(`«${G.ldef(l).name}» временно перекрыта.`, 'good');
          break;
        }
      }
    }
    return guarded;
  };

  G.bossDefeated = async function (mh, inst, loc) {
    const m = G.M();
    const def = ZG.card(inst.id);
    const ui = UI();
    const guarded = new Set((m.guarded || []).map((i) => m.locations[i]));
    m.guarded = [];
    // окно боя убираем сразу: дальше всё (закрытие, отступление, побег) показывается на поле
    await ui.encounterDismiss();
    // 1–3. Других злодеев в колоде нет — локация закрывается автоматически, карты изгоняются, срабатывает награда
    if (!loc.closed) {
      const villains = loc.deck.filter((c) => ZG.card(c.id).type === 'boss');
      if (villains.length) {
        // в колоде есть ещё Угроза: локация не закрывается, всё остальное (включая вожаков) изгоняется
        const banished = loc.deck.length - villains.length;
        await UI().purgeAnim(m.locations.indexOf(loc), banished);
        G.rescueObjectives(loc, loc.deck.filter((c) => ZG.card(c.id).type === 'objective'));
        loc.deck = R.shuffle(villains);
        loc.henchDown = false;
        G.log(`«${G.ldef(loc).name}» не закрыта: в колоде есть ещё Угроза. Изгнано карт: ${banished}.`, 'bad');
      } else await G.closeLoc(loc);
    }
    // Угроза не может бежать туда, где её победили, и в перекрытые локации
    const remaining = G.openLocs().filter((l) => !guarded.has(l) && l !== loc);
    const ob = G.special().objective;
    if (!remaining.length && ob && (m.obj || 0) < ob.need) {
      m.bossDown = true;
      G.log(`${def.name} ${ZG.gf(def, 'уничтожен', 'уничтожена', 'уничтожено')}. Не хватает: ${ob.label} ${m.obj || 0}/${ob.need}.`, 'win');
      await ui.banner(T('boss_cornered'), `${def.name} ${ZG.gf(def, 'уничтожен', 'уничтожена', 'уничтожено')}. Теперь соберите ${ob.label.toLowerCase()}: ${m.obj || 0}/${ob.need}`, 'win');
      return null;
    }
    if (!remaining.length) {
      G.log(T('boss_cornered'), 'win');
      await ui.banner(T('boss_cornered'), `${def.name} ${ZG.gf(def, 'уничтожен', 'уничтожена', 'уничтожено')}`, 'win');
      return 'win';
    }
    // 4. Герои из закрытой локации уходят в другие локации
    if (loc.closed) {
      const li = m.locations.indexOf(loc);
      const others = m.locations.map((_, i) => i).filter((i) => i !== li);
      for (const h of G.heroesAt(li)) {
        if (!others.length) break;
        const openOthers = others.filter((i) => !m.locations[i].closed);
        const pickFrom = openOthers.length ? openOthers : others;
        let to = await ui.pickLocation(`${G.hname(h)}: куда отступить из заколоченной локации?`, pickFrom);
        if (to == null) to = R.pick(pickFrom);
        h.loc = to;
        G.log(`${G.hname(h)} уходит в «${G.ldef(m.locations[to]).name}».`, 'move');
      }
      ui.renderBoard();
    }
    // Бегство: Угроза и «Ложные следы» — по одной карте в каждую неперекрытую открытую локацию
    await UI().escapeAnim(m.locations.indexOf(loc), remaining.map((l) => m.locations.indexOf(l)));
    const cards = R.shuffle([inst, ...Array(remaining.length - 1).fill(0).map(() => G.inst('falsetrail'))]);
    remaining.forEach((l, i) => {
      l.deck.push(cards[i]);
      R.shuffle(l.deck);
    });
    G.log(`Угроза («${def.name}») скрылась. В ${remaining.length} ${ZG.plural(remaining.length, 'локацию', 'локации', 'локаций')} замешано по карте: Угроза или Ложный след.`, 'bad');
    ZG.Audio.sfx('braam');
    await ui.banner('Угроза скрылась', remaining.length > 1 ? `Где — неизвестно. В каждую неперекрытую локацию (${remaining.length}) ушла одна карта: Угроза или Ложный след.` : `Ей осталось только одно укрытие: «${G.ldef(remaining[0]).name}».`, 'bad', true);
    return null;
  };


  /* ============================== Итоги миссии ============================== */
  G.finish = async function (win, reason) {
    const S = G.S();
    const m = S.mission;
    // при провале каждый выживший сам выбирает одну находку
    const chosen = {};
    if (!win) {
      for (const mh of m.heroes) {
        if (mh.dead) continue;
        const looted = G.allPiles(mh).filter((c) => c.l && !c.v && ZG.isBoon(ZG.card(c.id)));
        if (looted.length > 1) {
          const k = await UI().choose({ title: `${G.hname(mh)}: что унести?`, text: 'Миссия провалена. Из найденного можно спасти только одну карту.', options: looted.map((c) => ({ label: ZG.card(c.id).name, sub: ZG.cardTypeLabel(ZG.card(c.id)) })) });
          chosen[mh.id] = looted[k].u;
        } else if (looted.length) chosen[mh.id] = looted[0].u;
      }
    }
    const camp = S.campaign;
    const def = ZG.MISSIONS[m.idx];
    m.over = true;
    // пересчёт склада
    const vault = m.reserve.slice();
    const loot = [];
    m.heroes.forEach((mh) => {
      G.allPiles(mh).forEach((c) => {
        const d = ZG.card(c.id);
        if (!ZG.isBoon(d)) return;
        if (c.tmp) return;
        if (c.v) vault.push(c.id);
        else if (c.l && !mh.dead && (win || chosen[mh.id] === c.u)) { vault.push(c.id); loot.push(c.id); }
      });
    });
    const scars = [];
    m.heroes.forEach((mh) => {
      if (!mh.dead) return;
      const ph = G.ph(mh);
      const sc = R.pick(ZG.SCARS);
      ph.scars.push({ id: sc.id, attr: sc.attr, hand: sc.hand });
      scars.push({ hero: mh.id, text: sc.text });
      camp.stats.deaths++;
    });
    let reward = null;
    if (win) {
      if (!camp.done[m.idx] && def.reward) { vault.push(def.reward.card); reward = def.reward.card; }
      if (!camp.done[m.idx]) camp.party.forEach((ph) => (ph.featsPending = (ph.featsPending || 0) + 1));
      camp.done[m.idx] = true;
      camp.progress = Math.max(camp.progress, m.idx + 1);
    }
    camp.vault = vault;
    const burnedIds = []; m.heroes.forEach((mh) => (mh.burned || []).forEach((c) => burnedIds.push(c.id)));
    S.lastResult = { burned: burnedIds, win, reason, idx: m.idx, stats: m.stats, turns: m.turn, scars, loot, reward, dead: m.heroes.filter((h) => h.dead).map((h) => h.id) };
    S.mission = null;
    S.screen = 'result';
    G.ensureDecks();
    ZG.Save.persist();
    UI().showResult();
  };
})();
