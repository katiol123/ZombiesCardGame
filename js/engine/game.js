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
  G.nightBonus = () => (G.S().difficulty === 'hard' ? 3 : 2);
  G.phaseAt = (pos) => (Math.floor((Math.max(1, pos) - 1) / 5) % 2 ? 'night' : 'day');

  /* ============================== Экземпляры карт ============================== */
  G.inst = (id, flags) => {
    const m = G.M();
    return Object.assign({ u: m.uid++, id }, flags || {});
  };
  G.allPiles = (mh) => [...mh.deck, ...mh.hand, ...mh.discard];
  G.infCount = (mh) => ZG.count(G.allPiles(mh), (i) => i.id === 'infection');
  G.heroesAt = (li, aliveOnly = true) => G.M().heroes.filter((h) => h.loc === li && (!aliveOnly || !h.dead));
  G.loc = (mh) => G.M().locations[mh.loc];
  G.ldef = (loc) => ZG.LOCATIONS[loc.id];
  G.openLocs = () => G.M().locations.filter((l) => !l.closed);
  G.hname = (mh) => ZG.HEROES[mh.id].name.split(' ')[0];

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
    else if (mode === 'banish') { /* карта уходит в коробку */ }
  };

  /* ============================== Создание миссии ============================== */
  G.LOC_SIZE = 7;
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
    const villains = R.shuffle([def.boss, ...Array(n - 1).fill(def.henchman)]);
    m.locations.forEach((l, i) => {
      l.deck.push(G.inst(villains[i]));
      R.shuffle(l.deck);
    });

    // Часы
    const len = (S.difficulty === 'hard' ? 26 : 30) + (special.clockMod || 0);
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
      const mh = { pi, id: ph.id, deck, hand: [], discard: [], loc: 0, dead: false, turned: false };
      const hs = G.handSize(ph);
      while (mh.hand.length < hs && mh.deck.length) mh.hand.push(mh.deck.shift());
      m.heroes.push(mh);
    });
    G.log(`Миссия «${def.name}» начинается.`, 'sys');
    ZG.Save.persist();
    return m;
  };

  /* ============================== Колоды героев (лагерь) ============================== */
  G.BASICS = { weapon: ['knife', 'bat', 'pistol'], item: ['flashlight', 'jacket'], consumable: ['bandage', 'ammo'], ally: ['neighbor'], resolve: ['hope'] };

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
    return (d.tier === 9 ? 3.5 : d.tier) * 10 + (d.basic ? 0 : 1);
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
      const cands = pool.filter((id) => ZG.card(id).type === t).sort((a, b) => G.cardValue(b) - G.cardValue(a));
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

  G.deckValid = (ph) => {
    const comp = G.deckComp(ph);
    return ZG.CARD_TYPES.every((t) => ZG.count(ph.deck, (id) => ZG.card(id).type === t) === comp[t]);
  };

  /* ============================== Главный цикл ============================== */
  G.run = async function () {
    const m = G.M();
    const ui = UI();
    ui.showBoard();
    while (!m.over) {
      if (m.heroes.every((h) => h.dead)) return G.finish(false, 'dead');
      const mh = m.heroes[m.active];
      if (mh.dead) { G.advance(); continue; }
      ZG.Save.persist();
      ui.renderBoard();
      if (m.heroes.filter((h) => !h.dead).length > 1) await ui.handoff(mh);
      const fc = await G.flipClock(mh);
      if (fc === 'lose') return G.finish(false, 'time');
      m.ts = { moved: false, explored: false, explores: 1, closeTried: false, rested: false, gave: false, scouted: false, med: false, evaded: false };
      ui.renderBoard();
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
    const cd = ZG.CLOCK[c.id];
    if (c.id !== 'calm') G.log(`Часы: ${cd.name}. ${cd.text}`, 'clock');
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
        }
        break;
      }
      case 'broadcast':
        if (mh.deck.length) mh.hand.push(mh.deck.shift());
        break;
      case 'dawn':
        m.heroes.filter((h) => !h.dead).forEach((h) => G.heal(h, 1));
        break;
      case 'fog':
        m.turnMods.fog = true;
        break;
      default:
    }
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
      close: !loc.closed && loc.deck.length === 0 && !ts.closeTried,
      rest: loc.closed && !ts.rested && !ts.explored && mh.discard.length > 0,
      give: !ts.gave && others.length > 0 && mh.hand.some((c) => c.id !== 'infection'),
      scout: mh.id === 'ten' && !ts.scouted && G.openLocs().some((l) => l.deck.length),
      fieldmed: mh.id === 'marina' && !ts.med && mh.hand.length > 0 && G.heroesAt(mh.loc).some((h) => h.discard.length || G.infCount(h)),
    };
    a.cards = [];
    mh.hand.forEach((c) => {
      const d = ZG.card(c.id);
      (d.plays || []).forEach((p, pi) => {
        if (p.on !== 'action') return;
        if (G.actionUsable(mh, p)) a.cards.push({ u: c.u, pi });
      });
    });
    return a;
  };

  G.actionUsable = function (mh, p) {
    const loc = G.loc(mh);
    const here = G.heroesAt(mh.loc);
    if (p.explore) return !loc.closed && loc.deck.length > 0;
    if (p.heal) return (p.target === 'here' ? here : [mh]).some((h) => h.discard.length > 0);
    if (p.cure) return (p.target === 'here' ? here : [mh]).some((h) => G.infCount(h) > 0);
    if (p.scout) return G.openLocs().some((l) => l.deck.length);
    if (p.draw) return mh.deck.length > 0;
    if (p.lure) return !loc.closed && loc.noise > 0 && G.openLocs().length > 1;
    return false;
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
            mh.loc = act.loc;
            m.ts.moved = true;
            G.log(`${G.hname(mh)} идёт в «${G.ldef(G.loc(mh)).name}».`, 'move');
          }
          break;
        case 'explore':
          m.ts.explores--;
          r = await G.explore(mh);
          break;
        case 'close':
          r = await G.tryClose(mh, loc, false);
          break;
        case 'rest': {
          m.ts.rested = true;
          m.ts.explores = 0;
          const n = G.heal(mh, 3);
          G.log(`${G.hname(mh)} отдыхает в убежище и восстанавливает ${n} карт.`, 'good');
          await ui.banner('Отдых', `Перетасовано в колоду: ${n}`, 'good');
          break;
        }
        case 'give':
          await G.give(mh);
          break;
        case 'scout':
          m.ts.scouted = true;
          await G.scout(mh);
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
    }
  };

  G.endTurn = async function (mh) {
    const ph = G.ph(mh);
    const hs = G.handSize(ph);
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

  G.scout = async function (mh) {
    const locs = G.openLocs().filter((l) => l.deck.length);
    const li = await UI().pickLocation('Разведка: какую локацию осмотреть?', locs.map((l) => G.M().locations.indexOf(l)));
    if (li == null) return;
    const l = G.M().locations[li];
    const toBottom = await UI().scout(l.deck[0], l);
    if (toBottom) l.deck.push(l.deck.shift());
    G.log(`${G.hname(mh)} разведывает «${G.ldef(l).name}».`, 'move');
  };

  G.fieldMed = async function (mh) {
    const us = await UI().pickCards(mh, 1, 'Полевая медицина', 'Сбросьте карту из руки.', true);
    if (!us.length) return;
    const targets = G.heroesAt(mh.loc).filter((h) => h.discard.length || G.infCount(h));
    const t = targets.length === 1 ? targets[0] : await UI().pickHero('Кого лечить?', targets);
    if (!t) return;
    const opts = [];
    if (t.discard.length) opts.push({ label: 'Перевязать', sub: '2 случайные карты из сброса — в колоду', key: 'heal' });
    if (G.infCount(t)) opts.push({ label: 'Очистить рану', sub: 'Изгнать 1 Инфекцию', key: 'cure' });
    opts.push({ label: T('act_cancel'), key: 'x' });
    const k = opts[await UI().choose({ title: 'Полевая медицина', text: `Пациент: ${G.hname(t)}`, options: opts })].key;
    if (k === 'x') return;
    G.moveByMode(mh, us[0], 'discard');
    G.M().ts.med = true;
    if (k === 'heal') {
      const n = G.heal(t, 2);
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
    if ((p.heal || p.cure) && p.target === 'here') {
      const ok = here.filter((h) => (p.heal ? h.discard.length : G.infCount(h)));
      target = ok.length === 1 ? ok[0] : await ui.pickHero(p.heal ? 'Кого лечить?' : 'Кого исцелить?', ok);
      if (!target) return null;
    }
    let lureTo = null;
    if (p.lure) {
      const cand = G.openLocs().filter((l) => l !== G.loc(mh)).map((l) => G.M().locations.indexOf(l));
      lureTo = await ui.pickLocation('Куда увести шум?', cand);
      if (lureTo == null) return null;
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
    if (p.cure) {
      const n = G.cure(target, p.cure === 'all' ? 99 : p.cure);
      G.log(`${G.hname(target)}: изгнано Инфекций — ${n}.`, 'good');
      ui.fxHeal(target);
    }
    if (p.draw) {
      for (let i = 0; i < p.draw && mh.deck.length; i++) mh.hand.push(mh.deck.shift());
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
    const inst = loc.deck.shift();
    G.log(`${G.hname(mh)} исследует «${G.ldef(loc).name}».`, 'move');
    return await G.encounter(mh, inst, loc);
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
    } else if (def.type === 'event') {
      await ui.tip('event');
      r = await G.event(mh, inst, loc);
    } else {
      await ui.tip('acquire');
      r = await G.acquire(mh, inst, loc);
    }
    await ui.encounterClose();
    if (r !== 'win') await G.checkHorde(loc);
    ui.renderBoard();
    return r;
  };

  /* ---------- Сложности ---------- */
  G.enemyCheck = function (def, loc, i, hits) {
    const m = G.M();
    const mods = [];
    if (!def.living && m.phase === 'night') mods.push({ label: 'Ночь', v: G.nightBonus() });
    const lm = (G.ldef(loc).mods || {}).enemyDc;
    if (lm) mods.push({ label: 'Локация', v: lm });
    if (m.turnMods.fog) mods.push({ label: 'Туман', v: 1 });
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
    return { kind: 'close', skills: ld.close.skills, dc: ld.close.dc, base: ld.close.dc, mods: [], title: title || `${T('check_close')}: ${ld.name}` };
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
      if (mh.id === 'ten' && !m.ts.evaded) options.push({ label: 'Ускользнуть', sub: `Проверка Скрытности ${dcNow}`, key: 'power' });
      mh.hand.forEach((c) => {
        const d = ZG.card(c.id);
        (d.plays || []).forEach((p) => {
          if (p.on === 'evade') options.push({ label: `Сбросить «${d.name}»`, sub: 'Гарантированное уклонение', key: 'card', u: c.u });
        });
      });
      if (options.length) {
        options.push({ label: 'Сражаться', sub: '', key: 'fight', primary: true });
        const o = options[await ui.choose({ title: T('evade_q'), text: def.name, options, keepCard: true })];
        let evaded = false;
        if (o.key === 'power') {
          m.ts.evaded = true;
          const res = await G.doCheck(mh, { kind: 'evade', skills: ['stealth', 'dex'], dc: dcNow, base: dcNow, mods: [], title: `Ускользнуть: ${def.name}`, cardId: def.id });
          evaded = res.success;
        } else if (o.key === 'card') {
          G.moveByMode(mh, o.u, 'discard');
          evaded = true;
        }
        if (evaded) {
          loc.deck.push(inst);
          R.shuffle(loc.deck);
          G.log(`${G.hname(mh)} уклоняется от встречи: ${def.name}.`, 'move');
          await ui.banner('Ушли незамеченными', `${def.name} возвращается в колоду локации`, 'good');
          return null;
        }
      }
    }
    // до проверки
    if (def.before && def.before.damage) {
      G.log(`${def.name} атакует первым: ${def.before.damage} урона.`, 'bad');
      await G.damage(mh, def.before.damage, { source: def.name });
    }
    if (def.before && def.before.infectCheck) {
      const ic = def.before.infectCheck;
      const res = await G.doCheck(mh, G.eventCheck(ic, loc, `${def.name}: увернуться`, def));
      if (!res.success) await G.infect(mh);
    }
    if (mh.dead) return null;
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
    if (ok) {
      m.stats.kills++;
      G.S().campaign.stats.kills++;
      ui.fxDefeat();
      G.log(T('defeated', { name: def.name }), 'good');
      if (def.toxic) {
        const tr = await G.doCheck(mh, G.eventCheck(def.toxic, loc, `${def.name}: брызги заразы`, def));
        if (!tr.success) await G.infect(mh);
      }
      if (def.type === 'henchman' && !loc.closed && !mh.dead) {
        const c = await ui.choose({
          title: 'Вожак повержен',
          text: `Попытаться заколотить «${G.ldef(loc).name}» прямо сейчас? (${ZG.cardCheckLineClose(loc)})`,
          options: [{ label: 'Заколотить', primary: true }, { label: 'Позже' }],
        });
        if (c === 0) return await G.tryClose(mh, loc, true);
      }
      if (isBoss) return await G.bossDefeated(mh, inst, loc);
      return null;
    }
    // поражение
    const dmg = Math.min(ck.dc - res.total, G.dmgCap(def)) + (def.dmgAdd || 0);
    const taken = await G.damage(mh, dmg, { source: def.name, bite: def.bite });
    if ((def.bite && taken > 0) || def.infectOnFail) await G.infect(mh);
    if (def.theft && !mh.dead && mh.hand.length) {
      const c = mh.hand.splice(R.int(mh.hand.length), 1)[0];
      G.log(`${def.name} отбирает «${ZG.card(c.id).name}».`, 'bad');
      await ui.banner('Ограблен!', `${def.name} забирает «${ZG.card(c.id).name}»`, 'bad');
    }
    if (def.failSummon) {
      G.openLocs().forEach((l) => {
        l.deck.push(G.inst(ZG.boxPick('enemy', G.def().tier)));
        R.shuffle(l.deck);
      });
      G.log(`${def.name} зовёт мёртвых: в каждую открытую локацию пришёл мертвец.`, 'bad');
      await ui.banner('Зов Матриарх', 'В каждую открытую локацию пришёл мертвец', 'bad');
    }
    if (!loc.closed) {
      loc.deck.push(inst);
      R.shuffle(loc.deck);
    }
    G.log(T('undefeated', { name: def.name }), 'bad');
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
      G.log(T('lost_find', { name: def.name }), 'bad');
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
        await G.damage(mh, n, { source: 'Препятствие' });
      }
      if (fx.noise) { G.addNoise(loc, fx.noise); ui.fxNoise(loc); G.log(`Шум +${fx.noise}.`, 'bad'); }
      if (fx.infect) await G.infect(mh);
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
          G.log(`Незнакомец был укушен (к6 = ${roll}) и обращается!`, 'bad');
          await ui.banner(`к6 = ${roll}`, 'Он был укушен…', 'bad');
          const r = await G.encounter(mh, G.inst('strangerz'), loc, { noEvade: true });
          if (r === 'win') return r;
        } else {
          mh.hand.push(c);
          G.log(`Незнакомец присоединяется (к6 = ${roll}).`, 'loot');
          await ui.gain(c, `к6 = ${roll}: он чист`);
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
    if (mh.id === 'marina' && wp && ZG.card(wp.id).traits.includes('Тихое') && !opts.includes('medicine')) opts.push('medicine');
    let skill = ctx.skill && opts.includes(ctx.skill) ? ctx.skill : null;
    if (!skill) skill = opts.slice().sort((a, b) => G.skillScore(ph, b) - G.skillScore(ph, a))[0];
    const sv = G.skillValue(ph, skill);
    const dice = [{ d: sv.die, src: ZG.skillName(skill) }];
    let bonus = sv.bonus;
    const parts = [];
    if (sv.bonus) parts.push({ label: ZG.skillName(skill), v: sv.bonus });
    let noise = 0;
    let noiseMod = 0;
    ctx.played.forEach((p) => {
      const pl = G.playDef(p);
      const name = ZG.card(p.id).name;
      const ds = night && pl.nightDice ? pl.nightDice : pl.dice || [];
      ds.forEach((d) => dice.push({ d, src: name }));
      const sd = night && pl.nightSkillDie ? pl.nightSkillDie : pl.skillDie || 0;
      for (let i = 0; i < sd; i++) dice.push({ d: sv.die, src: name });
      if (pl.bonus) { bonus += pl.bonus; parts.push({ label: name, v: pl.bonus }); }
      noise += pl.noise || 0;
      noiseMod += pl.noiseMod || 0;
    });
    if (mh.id === 'grom') {
      if (ck.kind === 'combat' && wp) dice.push({ d: 'd4', src: 'Боевой опыт' });
      if (wp && (G.playDef(wp).noise || 0) > 0) noise += 1;
    }
    if (mh.id === 'marina' && skill === 'medicine') dice.push({ d: 'd4', src: 'Твёрдая рука' });
    if (mh.id === 'palych') {
      if (ck.kind === 'close') dice.push({ d: 'd6', src: 'Золотые руки' });
      if (ck.kind === 'acquire' && ck.card && (ck.card.type === 'weapon' || ck.card.type === 'item')) { bonus += 2; parts.push({ label: 'Барахольщик', v: 2 }); }
    }
    if (ck.enemy && ck.enemy.armor && (skill === 'melee' || ZG.attrOf(skill) === 'str')) {
      bonus -= ck.enemy.armor;
      parts.push({ label: 'Броня врага', v: -ck.enemy.armor });
    }
    noise = Math.max(0, noise + noiseMod);
    const avg = ZG.sum(dice.map((x) => ZG.dieAvg(x.d))) + bonus;
    const chance = G.chance(dice.map((x) => x.d), bonus, ck.dc);
    return { skill, opts, dice, bonus, parts, noise, avg, chance };
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
    if (ck.kind === 'evade') return false;
    if (owner !== ctx.mh) {
      if (!pl.help || owner.dead || owner.loc !== ctx.mh.loc) return false;
    }
    if (pl.kind !== 'any') {
      if (pl.kind === 'noncombat') { if (ck.kind === 'combat') return false; }
      else if (!pl.kind.includes(ck.kind)) return false;
    }
    if (ctx.played.some((p) => p.u === inst.u)) return false;
    if (ctx.played.some((p) => ZG.card(p.id).type === def.type)) return false;
    if (pl.night && m.phase !== 'night') return false;
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
    const rolls = pool.dice.map((x) => ({ d: x.d, src: x.src, v: ZG.rollDie(x.d) }));
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
      if (pl.rechargeOnSuccess && res.success && mode === 'discard') mode = 'recharge';
      G.moveByMode(owner, p.u, mode);
    });
    if (res.pool.noise > 0) {
      const loc = G.loc(mh);
      G.addNoise(loc, res.pool.noise);
      UI().fxNoise(loc);
    }
    G.log(`${G.hname(mh)}: ${check.title} — ${res.total} против ${check.dc}: ${res.success ? 'успех' : 'провал'}.`, res.success ? 'good' : 'bad');
    return res;
  };

  /* ============================== Урон, инфекция, смерть ============================== */
  G.damageNeeded = function (mh, n, plays) {
    let reduce = 0;
    let removed = 0;
    plays.forEach((p) => {
      const pl = G.playDef(p);
      reduce = pl.reduce === 'all' ? Infinity : reduce + pl.reduce;
      if (pl.mode !== 'reveal') removed++;
    });
    const left = Math.max(0, n - reduce);
    return Math.min(left, mh.hand.length - removed);
  };

  G.damage = async function (mh, n, opts) {
    opts = opts || {};
    if (n <= 0 || mh.dead) return 0;
    await UI().tip('damage');
    const r = await UI().damage(mh, n, opts);
    let reduce = 0;
    r.plays.forEach((p) => {
      const pl = G.playDef(p);
      reduce = pl.reduce === 'all' ? Infinity : reduce + pl.reduce;
      G.moveByMode(mh, p.u, pl.mode);
    });
    r.discards.forEach((u) => G.moveByMode(mh, u, 'discard'));
    const taken = Math.max(0, n - reduce);
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
        if (p.on === 'infect') opts.push({ label: `Сбросить «${d.name}»`, sub: 'Отменить заражение', u: c.u });
      });
    });
    if (opts.length) {
      opts.push({ label: 'Принять заражение', sub: '' });
      const i = await ui.choose({ title: 'Укус!', text: 'Можно отменить Инфекцию.', options: opts });
      if (opts[i].u) {
        G.moveByMode(mh, opts[i].u, 'discard');
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

  G.checkHorde = async function (loc) {
    if (loc.closed || loc.noise < loc.limit) return;
    const size = (G.def().special || {}).hordeSize || 2;
    for (let i = 0; i < size; i++) loc.deck.push(G.inst(ZG.boxPick('enemy', G.def().tier)));
    R.shuffle(loc.deck);
    loc.noise = 0;
    G.M().stats.hordes++;
    G.log(`ОРДА! +${size} мертвецов в «${G.ldef(loc).name}».`, 'bad');
    await UI().horde(loc, size);
  };

  /* ============================== Баррикады и угроза ============================== */
  G.tryClose = async function (mh, loc, fromHench) {
    if (!fromHench) G.M().ts.closeTried = true;
    await UI().tip('close');
    const res = await G.doCheck(mh, G.closeCheck(loc));
    if (!res.success) {
      G.log(`Не удалось заколотить «${G.ldef(loc).name}».`, 'bad');
      return null;
    }
    const bi = loc.deck.findIndex((i) => ZG.card(i.id).type === 'boss');
    if (bi >= 0) {
      const b = loc.deck.splice(bi, 1)[0];
      await UI().banner(T('boss_hiding'), `${ZG.card(b.id).name} выходит из темноты`, 'bad');
      return await G.encounter(mh, b, loc, { noEvade: true });
    }
    await G.closeLoc(loc);
    return null;
  };

  G.closeLoc = async function (loc) {
    loc.closed = true;
    loc.deck = [];
    loc.noise = 0;
    G.log(T('barricade_done', { loc: G.ldef(loc).name }), 'good');
    await UI().barricade(loc);
  };

  G.bossDefeated = async function (mh, inst, loc) {
    const m = G.M();
    const def = ZG.card(inst.id);
    const ui = UI();
    if (!loc.closed) await G.closeLoc(loc);
    const open = G.openLocs();
    const guarded = new Set();
    for (const l of open) {
      const hs = G.heroesAt(m.locations.indexOf(l));
      for (const h of hs) {
        const c = await ui.choose({
          title: 'Перекрыть путь',
          text: T('corner_q', { hero: G.hname(h), loc: G.ldef(l).name }) + ` (${ZG.cardCheckLineClose(l)})`,
          options: [{ label: 'Перекрыть', primary: true }, { label: 'Нет' }],
        });
        if (c !== 0) continue;
        const res = await G.doCheck(h, G.closeCheck(l, `Перекрыть: ${G.ldef(l).name}`));
        if (res.success) { guarded.add(l); break; }
      }
    }
    const remaining = open.filter((l) => !guarded.has(l));
    if (!remaining.length) {
      G.log(T('boss_cornered'), 'win');
      await ui.banner(T('boss_cornered'), `${def.name} уничтожен`, 'win');
      return 'win';
    }
    const dest = R.pick(remaining);
    dest.deck.push(inst);
    R.shuffle(dest.deck);
    G.log(T('boss_flee', { boss: def.name, loc: G.ldef(dest).name }), 'bad');
    await ui.banner('Угроза отступает!', `${def.name} уходит в «${G.ldef(dest).name}». Заколотите остальные локации, чтобы загнать её в угол.`, 'bad');
    return null;
  };

  /* ============================== Итоги миссии ============================== */
  G.finish = function (win, reason) {
    const S = G.S();
    const m = S.mission;
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
        if (c.v) vault.push(c.id);
        else if (c.l && !mh.dead) { vault.push(c.id); loot.push(c.id); }
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
    S.lastResult = { win, reason, idx: m.idx, stats: m.stats, turns: m.turn, scars, loot, reward, dead: m.heroes.filter((h) => h.dead).map((h) => h.id) };
    S.mission = null;
    S.screen = 'result';
    G.ensureDecks();
    ZG.Save.persist();
    UI().showResult();
  };
})();
