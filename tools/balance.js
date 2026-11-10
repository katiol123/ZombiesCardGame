#!/usr/bin/env node
/*
 * Отчёт по балансу «Последнего рубежа».
 * Запуск:  node tools/balance.js   →   docs/balance.html
 *
 * Скрипт читает те же данные, что и игра (герои, карты, миссии, локации), и точно считает
 * вероятности бросков (перебором всех исходов кубиков, без случайности).
 *
 * Разделы отчёта:
 *  1. Миссии: средняя сложность врагов, препятствий, поиска и заколачивания по каждой миссии.
 *  2. Герои × миссии: шанс победить случайного врага миссии, вожака и Угрозу; шанс пройти препятствие,
 *     найти карту и заколотить локацию. Эталон — миссии 1–6 (пройдены живой игрой); выход
 *     следующих миссий за рамки эталона подсвечивается.
 *  3. Ценность карт: каждая карта переводится в общую «валюту» — очки броска за миссию.
 *     Небоевые эффекты (лечение, исследование, Часы, лечение Инфекции…) переводятся в очки по курсам
 *     из раздела ПАРАМЕТРЫ. Выбросы внутри типа и уровня подсвечиваются.
 *
 * Все допущения собраны в ПАРАМЕТРАХ ниже — их можно менять и перезапускать отчёт.
 */
'use strict';
const fs = require('fs');
const path = require('path');

/* ============================== ПАРАМЕТРЫ ============================== */
const P = {
  // Курс обмена: сколько «очков броска» стоит один небоевой эффект.
  // 1 очко броска ≈ +1 к одной проверке. Ориентир: +1 к проверке около порога ≈ +8–10% шанса.
  HEAL: 1.5, // 1 карта, возвращённая из сброса в колоду (колода — здоровье)
  EXPLORE: 4, // 1 дополнительное исследование (экономия времени)
  TIME: 5, // 1 карта Часов (+1 ход отряда)
  CURE: 4, // изгнать 1 Инфекцию (треть пути к обращению)
  CLEARCOND: 3, // снять состояние
  NOISE: 0.8, // 1 шум (цена, вычитается)
  DRAW: 1.5, // взять 1 карту
  SCOUT: 2, // посмотреть/переложить верхнюю карту локации
  GAIN: 3, // получить случайную карту
  LURE: 2, // увести шум
  RELOCATE: 2, // переместиться в другую локацию бесплатно
  CRAFT: 3, // смастерить карту
  SKILL_DIE: 4.5, // +1 кубик навыка (типичный d8)
  EVADE: 4, // гарантированно уклониться от врага (сэкономленный бой и урон)
  ADD_TRAIT: 2, // дать оружию признак стихии (обходит бронежилет, бьёт по уязвимости)
  // Сколько раз за миссию в среднем подворачивается случай сыграть эффект
  USES: { combat: 5, acquire: 5, event: 2, close: 1.5, evade: 2, damage: 3, infect: 1, action: 3 },
  // Сколько раз за миссию реально успевают сыграть карту (потолок) в зависимости от способа
  MODE_TIMES: { reveal: 4, recharge: 2, technique: 1.5, discard: 1.3, bury: 1, burn: 1 },
  // Цена способа розыгрыша (в картах здоровья, затем × HEAL)
  MODE_COST: { reveal: 0, recharge: 0, technique: 0, discard: 1, bury: 1.3, burn: 1.6 },
  HELP: 1.15, // карту можно сыграть в проверку соседа
  TARGET_HERE: 1.2, // эффект на любого героя в локации
  RESTRICTED: 0.7, // эффект только с оружием определённого признака
  // Рост героя по кампании: +1 к основному броску за каждые N пройденных миссий (макс. +3)
  XP_EVERY: 2,
  // Порог подсветки: отклонение шанса от эталона (миссии 1–6), в процентных пунктах
  REF_TOL: 10,
  // Порог выброса ценности карты: отклонение от медианы своего типа и уровня
  OUTLIER: 0.4,
  REF_MISSIONS: 6,
};

/* ============================== Загрузка данных игры ============================== */
const ROOT = path.join(__dirname, '..');
global.window = global;
global.location = { search: '' };
global.document = { addEventListener() {}, documentElement: { classList: { contains: () => false } } };
global.localStorage = { getItem: () => null, setItem() {} };
global.ZG = {};
['js/core/util.js', 'js/i18n/ru.js', 'js/data/heroes.js', 'js/data/icons.js', 'js/data/cards.js', 'js/data/missions.js'].forEach((f) => require(path.join(ROOT, f)));
const C = Object.values(ZG.CARDS);
const card = (id) => ZG.CARDS[id];

/* ============================== Вероятности ============================== */
const sides = (d) => +String(d).replace(/\D/g, '');
const avgDie = (d) => (sides(d) + 1) / 2;
/** Распределение суммы кубиков: массив вероятностей по значениям */
function pmf(dice) {
  let dist = new Map([[0, 1]]);
  for (const d of dice) {
    const n = sides(d);
    const nx = new Map();
    for (const [v, p] of dist) for (let k = 1; k <= n; k++) nx.set(v + k, (nx.get(v + k) || 0) + p / n);
    dist = nx;
  }
  return dist;
}
const pmfCache = new Map();
function pAtLeast(dice, bonus, dc) {
  const key = dice.slice().sort().join(',');
  if (!pmfCache.has(key)) pmfCache.set(key, pmf(dice));
  let s = 0;
  for (const [v, p] of pmfCache.get(key)) if (v + bonus >= dc) s += p;
  return s;
}
const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const median = (a) => { const s = a.slice().sort((x, y) => x - y); const n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : 0; };

/* ============================== Пулы карт по миссии (как ZG.boxPick) ============================== */
function pool(type, mi) {
  const m = ZG.MISSIONS[mi];
  const out = [];
  for (const c of C) {
    if (c.type !== type || c.reward || c.eventOnly) continue;
    if (c.mission) { if (c.mission !== m.id) continue; }
    else {
      if (c.missions && !c.missions.includes(m.id)) continue;
      if (c.tier > 3 || c.tier > m.tier) continue;
    }
    out.push({ c, w: c.mission ? 3 : c.tier === m.tier ? 3 : 1 });
  }
  return out;
}
const wavg = (list, f) => { let s = 0, w = 0; list.forEach((x) => { s += f(x.c) * x.w; w += x.w; }); return w ? s / w : 0; };

/* ============================== Герои ============================== */
const ELEM = ['Огонь', 'Кислота', 'Электричество', 'Холод'];
const PROF_OF = { 'Огнестрел': 'firearms', 'Тяжёлое': 'heavyweapons' };
function skillVal(h, s, xp) {
  // навык: кубик характеристики + бонус навыка; характеристика: только кубик
  const attr = ZG.SKILLS[s] || s;
  const die = h.attrs[attr];
  const b = ZG.SKILLS[s] ? h.skills[s] || 0 : 0;
  return { die, bonus: b + xp, attr };
}
function bestSkill(h, skills, xp) {
  let best = null;
  for (const s of skills) {
    const v = skillVal(h, s, xp);
    const sc = avgDie(v.die) + v.bonus;
    if (!best || sc > best.sc) best = { ...v, s, sc };
  }
  return best;
}
/** Бой героя оружием w против врага e: { dice, bonus } (или null, если оружие нельзя сыграть) */
function combatRoll(hid, w, e, xp, night) {
  const h = ZG.HEROES[hid];
  const d = w ? card(w) : null;
  // в каждом бою играют многоразовый режим оружия («показать» или «перезарядить»); одноразовые — разовый козырь
  const pl = d ? (d.plays || []).find((p) => p.on === 'check' && p.weapon && (p.mode === 'reveal' || p.mode === 'recharge')) : null;
  if (w && !pl) return null;
  const traits = new Set(d ? d.traits || [] : []);
  if (e.noMelee && traits.has('Ближнее')) return null;
  let skills = pl ? pl.weapon.slice() : ['str', 'melee', 'dex', 'shooting'];
  if (hid === 'marina' && traits.has('Медицина') && !skills.includes('wit')) skills.push('wit');
  const sk = bestSkill(h, skills, xp);
  const dice = [sk.die, ...(pl ? pl.dice || [] : [])];
  if (pl && pl.nightDice && night) dice.push(...pl.nightDice);
  let bonus = sk.bonus + (pl ? pl.bonus || 0 : 0);
  // владение
  for (const t of traits) if (PROF_OF[t] && !(h.prof || []).includes(PROF_OF[t])) bonus -= 4;
  // способности героев
  if (hid === 'grom' && w) { dice.push('d4'); if ((pl.noise || 0) > 0) dice.push('d6'); }
  if (hid === 'marina' && w && traits.has('Медицина')) dice.push('d4');
  if (hid === 'palych' && w && traits.has('Инструмент')) dice.push('d4');
  // свойства врага
  const ign = false;
  if (e.weak) for (const t of Object.keys(e.weak)) if (traits.has(t)) dice.push(e.weak[t]);
  if (e.resist && !ign) for (const t of Object.keys(e.resist)) if (traits.has(t)) bonus -= e.resist[t];
  if (e.immune && e.immune.some((t) => traits.has(t))) return { dice: [sk.die], bonus: sk.bonus, immune: true };
  const physical = !ELEM.some((t) => traits.has(t));
  if (e.armor && physical) bonus -= e.armor;
  if (e.strArmor && (sk.s === 'melee' || sk.attr === 'str')) bonus -= e.strArmor;
  return { dice, bonus, skill: sk.s };
}
function enemyDc(e, night, nightBonus) {
  return e.dc + (night ? nightBonus + (e.nightDc || 0) : 0);
}
function pBeat(hid, weapons, e, xp, night, nb) {
  const dc = enemyDc(e, night, nb);
  let best = 0, bw = null;
  for (const w of [null, ...weapons]) {
    const r = combatRoll(hid, w, e, xp, night);
    if (!r) continue;
    let p = pAtLeast(r.dice, r.bonus, dc);
    if (e.hits > 1) p = Math.pow(p, e.hits);
    if (p > best) { best = p; bw = w; }
  }
  return { p: best, w: bw };
}
function pCheck(hid, skills, dc, xp) {
  const sk = bestSkill(ZG.HEROES[hid], skills, xp);
  return pAtLeast([sk.die], sk.bonus, dc);
}
const heroWeaponsStart = (hid) => [...new Set(ZG.HEROES[hid].start.filter((id) => card(id) && card(id).type === 'weapon'))];
function weaponsFound(mi) {
  // трофеи прошлых миссий (находки случайны — их не считаем, это нижняя оценка)
  return ZG.MISSIONS.slice(0, mi).map((m) => m.reward && m.reward.card).filter((id) => id && card(id) && card(id).type === 'weapon');
}

/* ============================== Ценность карт ============================== */
const USED_KEYS = new Set(['on', 'mode', 'kind', 'weapon', 'dice', 'bonus', 'trait', 'noise', 'help', 'helpOnly', 'helpAnyLoc', 'heal', 'target', 'explore', 'cure', 'clearCond', 'clearConds', 'reduce', 'draw', 'scout', 'time', 'gain', 'gainCard', 'craft', 'lure', 'relocate', 'nightDice', 'skills', 'physical', 'combatOnly', 'text', 'rechargeOnSuccess', 'burnOnFail', 'perResolve', 'night', 'noiseOthers', 'noiseAtOwner', 'onlyType', 'enemyLiving', 'nonPhysical', 'weaponReveal', 'ignorePenalties', 'rechargeCheck', 'skillDie', 'nightSkillDie', 'cardTypes', 'notCardTypes', 'noiseMod', 'addTraits', 'putBack', 'oneToFive']);
const kindList = (k) => (k === 'any' ? ['combat', 'acquire', 'event', 'close', 'evade'] : k === 'noncombat' ? ['acquire', 'event', 'close', 'evade'] : Array.isArray(k) ? k : k ? [k] : []);
function playValue(d, p) {
  const notes = [];
  const unknown = Object.keys(p).filter((k) => !USED_KEYS.has(k));
  const mode = p.mode || 'reveal';
  let per = 0; // ценность одного розыгрыша
  let uses = 0; // поводов сыграть за миссию
  if (p.on === 'check' || p.on === 'evade') {
    const kinds = p.on === 'evade' ? ['evade'] : kindList(p.kind);
    uses = kinds.reduce((s, k) => s + (P.USES[k] || 0), 0);
    const sumDice = (ds) => (ds || []).reduce((t, x) => t + avgDie(x), 0);
    let gain = sumDice(p.dice) + (p.bonus || 0);
    if (p.nightDice) gain += 0.5 * (sumDice(p.nightDice) - sumDice(p.dice));
    // +N кубиков навыка: типичный кубик навыка — d8 (4.5)
    if (p.skillDie) gain += p.skillDie * P.SKILL_DIE;
    if (p.nightSkillDie) gain += 0.5 * (p.nightSkillDie - (p.skillDie || 0)) * P.SKILL_DIE;
    if (p.noiseMod) { gain += -p.noiseMod * P.NOISE; notes.push('гасит шум'); }
    if (p.addTraits) { gain += P.ADD_TRAIT; notes.push('даёт признак оружию'); }
    if (p.on === 'evade') { gain = P.EVADE; notes.push('автоматически уклониться'); }
    if (p.weapon) notes.push('оружие');
    if (p.trait || p.skills || p.enemyLiving || p.onlyType) { gain *= P.RESTRICTED; notes.push('с ограничением'); }
    if (p.cardTypes) { uses *= 0.2; notes.push('только для находок ' + p.cardTypes.join('/')); }
    if (p.perResolve) { gain += p.perResolve * 0.7; notes.push('+ за Решимость'); }
    if (p.ignorePenalties) { gain += 1; notes.push('игнор штрафов врага ≈ +1'); }
    per = gain - (p.noise || 0) * P.NOISE - (p.noiseOthers || 0) * P.NOISE * 2;
  } else if (p.on === 'damage') {
    uses = P.USES.damage * (p.combatOnly ? 0.7 : 1) * (p.physical ? 0.8 : 1);
    per = (p.reduce === 'all' ? 3 : p.reduce || 0) * P.HEAL;
  } else if (p.on === 'infect') {
    uses = P.USES.infect;
    per = P.CURE;
  } else if (p.on === 'action') {
    uses = P.USES.action;
    const tm = p.target === 'here' ? P.TARGET_HERE : 1;
    if (p.heal) per += (avg((p.heal.dice || []).map(avgDie)) * (p.heal.dice || []).length + (p.heal.bonus || 0)) * P.HEAL * tm;
    if (p.explore) per += P.EXPLORE;
    if (p.cure) per += (typeof p.cure === 'number' ? p.cure : 1) * P.CURE * tm;
    if (p.clearCond) per += P.CLEARCOND * 0.6 * tm;
    if (p.clearConds) per += P.CLEARCOND * tm;
    if (p.draw) per += (typeof p.draw === 'number' ? p.draw : 1) * P.DRAW * (p.putBack ? 0.6 : 1);
    if (p.scout) per += P.SCOUT;
    if (p.time) per += p.time * P.TIME;
    if (p.gain || p.gainCard) per += P.GAIN;
    if (p.craft) per += P.CRAFT;
    if (p.lure) per += P.LURE;
    if (p.relocate) per += P.RELOCATE;
    per -= (p.noise || 0) * P.NOISE;
  }
  if (p.help) { per *= P.HELP; notes.push('помощь соседу'); }
  // сколько раз за миссию карту реально сыграют: «показать» — каждый подходящий раз (не больше лимита),
  // «перезарядить» — пока она возвращается в колоду, «сбросить/сжечь» — около одного раза
  let times = Math.min(uses, P.MODE_TIMES[mode] != null ? P.MODE_TIMES[mode] : 1);
  if (p.rechargeOnSuccess) times = Math.min(uses, (P.MODE_TIMES[mode] + P.MODE_TIMES.recharge) / 2);
  const cost = (P.MODE_COST[mode] || 0) * P.HEAL * times;
  const val = per * times - cost;
  if (p.text && !p.dice && !p.heal && !p.explore && !p.reduce && !p.skillDie && !p.addTraits) unknown.push('text');
  return { val, per, mode, notes, unknown };
}
function cardValue(d) {
  const plays = (d.plays || []).map((p) => playValue(d, p));
  if (!plays.length && d.text && /находк/.test(d.text)) return { val: P.GAIN, plays: [{ mode: 'discard', per: P.GAIN, notes: ['ещё одна находка'], unknown: [] }], unknown: [] };
  if (!plays.length) return { val: 0, plays, unknown: ['нет эффектов'] };
  const vals = plays.map((x) => x.val).sort((a, b) => b - a);
  // все эффекты карты не сыграть одновременно: лучший целиком + остальные с весом 0.35
  const val = vals[0] + vals.slice(1).reduce((s, v) => s + Math.max(0, v) * 0.35, 0);
  const unknown = [...new Set(plays.flatMap((x) => x.unknown))];
  return { val, plays, unknown };
}

/* ============================== Расчёт ============================== */
const HEROES = Object.keys(ZG.HEROES);
const missions = ZG.MISSIONS.map((m, mi) => {
  const nb = 2; // ночь: +2 (+3 на сложном или при 3–4 героях)
  const enemies = pool('enemy', mi);
  const events = pool('event', mi);
  const boons = ['weapon', 'item', 'consumable', 'ally', 'resolve'].flatMap((t) => pool(t, mi));
  const locs = m.locations.map((id) => ZG.LOCATIONS[id]).filter(Boolean);
  const closeDc = avg(locs.map((l) => l.close.dc)) + ((m.special || {}).closeDcMod || 0);
  const hench = card(m.henchman), boss = card(m.boss);
  const xp = Math.min(3, Math.floor(mi / P.XP_EVERY));
  const heroes = {};
  for (const hid of HEROES) {
    const ws = [...new Set([...heroWeaponsStart(hid), ...weaponsFound(mi)])];
    const vs = (night) => wavg(enemies, (e) => pBeat(hid, ws, e, xp, night, nb).p);
    const ev = wavg(events, (e) => (e.check ? pCheck(hid, e.check.skills, e.check.dc, xp) : 1));
    const acq = wavg(boons, (b) => (b.acquire ? pCheck(hid, b.acquire.skills, b.acquire.dc, xp) : 1));
    const cl = avg(locs.map((l) => pCheck(hid, l.close.skills, l.close.dc + ((m.special || {}).closeDcMod || 0), xp) * (hid === 'palych' ? 1 : 1)));
    // «Золотые руки»: +1d4 к заколачиванию
    const clP = hid === 'palych' ? avg(locs.map((l) => { const sk = bestSkill(ZG.HEROES[hid], l.close.skills, xp); return pAtLeast([sk.die, 'd4'], sk.bonus, l.close.dc + ((m.special || {}).closeDcMod || 0)); })) : cl;
    heroes[hid] = {
      day: vs(false), night: vs(true),
      hench: hench ? pBeat(hid, ws, hench, xp, false, nb).p : 0,
      boss: boss ? pBeat(hid, ws, boss, xp, false, nb) : { p: 0 },
      event: ev, acquire: acq, close: clP,
    };
  }
  return {
    m, mi, xp,
    enemyDc: wavg(enemies, (e) => e.dc), enemyN: enemies.length,
    living: wavg(enemies, (e) => (e.living ? 1 : 0)),
    armored: enemies.filter((x) => x.c.armor).map((x) => x.c.name),
    eventDc: wavg(events, (e) => (e.check ? e.check.dc : 0)),
    acquireDc: wavg(boons, (b) => (b.acquire ? b.acquire.dc : 0)),
    closeDc, hench, boss, heroes,
  };
});

// эталон — миссии 1–6
const METRICS = [['day', 'Враг днём'], ['night', 'Враг ночью'], ['hench', 'Вожак'], ['boss', 'Угроза'], ['event', 'Препятствие'], ['acquire', 'Поиск'], ['close', 'Заколотить']];
const val = (h, k) => (k === 'boss' ? h.boss.p : h[k]);
const ref = {};
for (const hid of HEROES) for (const [k] of METRICS) {
  const xs = missions.slice(0, P.REF_MISSIONS).map((x) => val(x.heroes[hid], k));
  ref[hid + k] = { min: Math.min(...xs), max: Math.max(...xs), avg: avg(xs) };
}
const party = (x, k) => avg(HEROES.map((h) => val(x.heroes[h], k)));
const refParty = {};
for (const [k] of METRICS) { const xs = missions.slice(0, P.REF_MISSIONS).map((x) => party(x, k)); refParty[k] = { min: Math.min(...xs), max: Math.max(...xs) }; }

// ценность карт
const TYPES = ['weapon', 'item', 'consumable', 'ally', 'resolve', 'technique'];
const values = C.filter((d) => TYPES.includes(d.type)).map((d) => ({ d, ...cardValue(d) }));
const groups = {};
values.forEach((v) => { const k = v.d.type + ':' + Math.min(v.d.tier, 9); (groups[k] = groups[k] || []).push(v); });
Object.values(groups).forEach((g) => {
  const md = median(g.map((x) => x.val));
  g.forEach((x) => {
    x.median = md;
    x.dev = md > 0.5 ? (x.val - md) / md : 0;
    x.flag = g.length >= 3 && Math.abs(x.dev) > P.OUTLIER && Math.abs(x.val - md) > 1.5;
  });
});

/* ============================== HTML ============================== */
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pct = (p) => Math.round(p * 100);
const heat = (p) => `hsl(${Math.round(p * 120)} 55% ${22 + p * 8}%)`;
const hname = (h) => ZG.HEROES[h].name.replace(/^.*«(.+)».*$/, '$1').split(' ')[0];
function cell(p, r, mi) {
  let cls = '';
  if (r && mi >= P.REF_MISSIONS) {
    if (p * 100 < r.min * 100 - P.REF_TOL) cls = 'lo';
    else if (p * 100 > r.max * 100 + P.REF_TOL) cls = 'hi';
  }
  return `<td class="p ${cls}" style="background:${heat(p)}">${pct(p)}%</td>`;
}
const TYPE_RU = { weapon: 'Оружие', item: 'Снаряжение', consumable: 'Расходник', ally: 'Союзник', resolve: 'Решимость', technique: 'Приём' };
const MODE_RU = { reveal: 'показать', recharge: 'перезарядить', technique: 'приём', discard: 'сбросить', bury: 'захоронить', burn: 'сжечь' };

let html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Баланс: отчёт</title><style>
:root{--bg:#121316;--fg:#e6e0d4;--mut:#8d8a84;--edge:#2c2e34;--amber:#e0a642;--red:#d0503f;--green:#57b26a}
body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.45 system-ui,sans-serif}
main{max-width:1240px;margin:0 auto;padding:20px 16px 60px}
h1{font-size:24px;margin:0 0 4px}h2{margin:34px 0 8px;font-size:19px;border-bottom:1px solid var(--edge);padding-bottom:6px}h3{margin:20px 0 6px;font-size:15px}
.mut{color:var(--mut)}table{border-collapse:collapse;width:100%;margin:6px 0 10px;font-size:13px}
th,td{border:1px solid var(--edge);padding:4px 6px;text-align:left;vertical-align:top}th{background:#1b1d21;font-weight:600;position:sticky;top:0}
td.p{text-align:center;font-variant-numeric:tabular-nums;color:#fff;min-width:44px}
td.lo{outline:2px solid var(--red);outline-offset:-2px;font-weight:700}td.hi{outline:2px solid #6aa8ff;outline-offset:-2px;font-weight:700}
tr.ref td:first-child{border-left:3px solid var(--green)}tr.new td:first-child{border-left:3px solid var(--amber)}
.wrap{overflow-x:auto}.flag{color:var(--red);font-weight:700}.flag.up{color:#6aa8ff}
.box{background:#191a1e;border:1px solid var(--edge);border-radius:8px;padding:10px 14px;margin:10px 0}
code{background:#22242a;padding:1px 4px;border-radius:4px}.tag{display:inline-block;padding:0 6px;border-radius:8px;background:#2a2c33;font-size:12px;margin-right:4px}
</style></head><body><main>
<h1>Баланс «Последнего рубежа»</h1>
<div class="mut">Сгенерировано <code>node tools/balance.js</code>. Все вероятности посчитаны точно — перебором исходов кубиков.</div>
<div class="box"><b>Как читать.</b> Миссии 1–${P.REF_MISSIONS} — эталон: их прошли живой игрой, сложность ощущалась правильной.
Начиная с миссии ${P.REF_MISSIONS + 1} ячейка обводится <span class="flag">красным</span>, если шанс ниже худшего значения эталона более чем на ${P.REF_TOL} п.п.,
и <span class="flag up">синим</span>, если выше лучшего. Рост героя по кампании: +1 к броску за каждые ${P.XP_EVERY} пройденные миссии (макс. +3),
оружие — лучшее многоразовое (показать/перезарядить) из стартовой колоды и трофеев прошлых миссий; случайные находки не учтены, поэтому это нижняя оценка.</div>
`;

// 1. Миссии
html += `<h2>1. Миссии: сложность</h2><div class="wrap"><table><tr><th>Миссия</th><th>Ур.</th><th>Враги: ср. сложность</th><th>Люди</th><th>В броне</th><th>Вожак</th><th>Угроза</th><th>Препятствия</th><th>Поиск</th><th>Заколотить</th><th>Опыт</th></tr>`;
missions.forEach((x) => {
  html += `<tr class="${x.mi < P.REF_MISSIONS ? 'ref' : 'new'}"><td>${x.m.num}. ${esc(x.m.name)}</td><td>${x.m.tier}</td><td>${x.enemyDc.toFixed(1)} <span class="mut">(${x.enemyN} видов)</span></td><td>${pct(x.living)}%</td><td>${esc(x.armored.join(', ') || '—')}</td>
  <td>${x.hench ? esc(x.hench.name) + ' ' + x.hench.dc : '—'}</td><td>${x.boss ? esc(x.boss.name) + ' ' + x.boss.dc + (x.boss.hits > 1 ? ' ×' + x.boss.hits : '') : '—'}</td>
  <td>${x.eventDc.toFixed(1)}</td><td>${x.acquireDc.toFixed(1)}</td><td>${x.closeDc.toFixed(1)}</td><td>+${x.xp}</td></tr>`;
});
html += `</table></div><div class="mut">Средние взвешены так же, как игра выбирает карты в колоды локаций. Модификаторы отдельных локаций не учтены.</div>`;

// 2. Отряд в среднем
html += `<h2>2. Шанс успеха: среднее по всем героям</h2><div class="wrap"><table><tr><th>Миссия</th>${METRICS.map(([, l]) => `<th>${l}</th>`).join('')}</tr>`;
missions.forEach((x) => {
  html += `<tr class="${x.mi < P.REF_MISSIONS ? 'ref' : 'new'}"><td>${x.m.num}. ${esc(x.m.name)}</td>${METRICS.map(([k]) => cell(party(x, k), refParty[k], x.mi)).join('')}</tr>`;
});
html += `</table></div>`;

// 3. По героям
html += `<h2>3. Шанс успеха по героям</h2>`;
for (const hid of HEROES) {
  const h = ZG.HEROES[hid];
  html += `<h3>${esc(h.name)} <span class="mut">· ${esc(h.role)}</span></h3><div class="wrap"><table><tr><th>Миссия</th>${METRICS.map(([, l]) => `<th>${l}</th>`).join('')}<th>Оружие против Угрозы</th></tr>`;
  missions.forEach((x) => {
    const r = x.heroes[hid];
    html += `<tr class="${x.mi < P.REF_MISSIONS ? 'ref' : 'new'}"><td>${x.m.num}. ${esc(x.m.name)}</td>${METRICS.map(([k]) => cell(val(r, k), ref[hid + k], x.mi)).join('')}<td>${r.boss.w ? esc(card(r.boss.w).name) : 'без оружия'}</td></tr>`;
  });
  html += `</table></div>`;
}
html += `<div class="mut">Учтены: способности героев в бою (Боевой опыт, Громкий, Твёрдая рука, Золотые руки), владение оружием (−4 без него), уязвимости, стойкость и иммунитеты врагов, бронежилет и каска, ночь (+2, ночная охота).
Не учтены: карты усиления из руки (Решимость, приёмы, союзники), помощь соседей, «Ускользнуть» Тени, модификаторы локаций, мутации Угрозы.
Поэтому абсолютные проценты занижены — сравнивайте строки между собой, а не с 50%.</div>`;

// 4. Ценность карт
html += `<h2>4. Ценность карт</h2>
<div class="box"><b>Общая валюта — «очки броска за миссию».</b> 1 очко ≈ +1 к одной проверке. Небоевые эффекты переводятся по курсу:
<span class="tag">1 карта лечения = ${P.HEAL}</span><span class="tag">1 исследование = ${P.EXPLORE}</span><span class="tag">1 карта Часов = ${P.TIME}</span><span class="tag">изгнать Инфекцию = ${P.CURE}</span><span class="tag">снять состояние = ${P.CLEARCOND}</span><span class="tag">1 шум = −${P.NOISE}</span>.
Учитывается и способ розыгрыша: «показать» работает каждый раз бесплатно, «перезарядить» возвращает карту, «сбросить» стоит 1 карту здоровья, «сжечь» — ${P.MODE_COST.burn}.
<br>Цифра — не истина, а линейка: она нужна, чтобы сравнивать карты <b>одного типа и уровня</b> между собой. Курсы правятся в начале <code>tools/balance.js</code>:
если какая-то карта по ощущениям из игры сбалансирована, подберите курс так, чтобы она оказалась около медианы.
Карта помечается <span class="flag">▲/▼</span>, если отличается от медианы своего типа и уровня больше чем на ${Math.round(P.OUTLIER * 100)}%.</div>`;
for (const t of TYPES) {
  html += `<h3>${TYPE_RU[t]}</h3><div class="wrap"><table><tr><th>Ур.</th><th>Карта</th><th>Ценность</th><th>Медиана уровня</th><th>Эффекты (за розыгрыш)</th><th>Не учтено</th></tr>`;
  values.filter((v) => v.d.type === t).sort((a, b) => a.d.tier - b.d.tier || b.val - a.val).forEach((v) => {
    const fl = v.flag ? `<span class="flag ${v.dev > 0 ? '' : 'up'}">${v.dev > 0 ? '▲' : '▼'} ${v.dev > 0 ? '+' : ''}${Math.round(v.dev * 100)}%</span>` : '';
    html += `<tr><td>${v.d.tier === 9 ? '★' : v.d.tier}</td><td>${esc(v.d.name)}${v.d.reward ? ' <span class="mut">(трофей)</span>' : ''}</td><td><b>${v.val.toFixed(1)}</b> ${fl}</td><td class="mut">${v.median.toFixed(1)}</td>
      <td>${v.plays.map((p) => `${MODE_RU[p.mode] || p.mode}: ${p.per.toFixed(1)}${p.notes.length ? ' <span class="mut">(' + esc(p.notes.join(', ')) + ')</span>' : ''}`).join('<br>')}</td>
      <td class="mut">${esc(v.unknown.join(', '))}</td></tr>`;
  });
  html += `</table></div>`;
}
// средняя ценность по уровням
html += `<h3>Рост ценности по уровням (медиана)</h3><table><tr><th>Тип</th><th>Ур. 0</th><th>Ур. 1</th><th>Ур. 2</th><th>Ур. 3</th><th>Трофеи</th></tr>`;
for (const t of TYPES) html += `<tr><td>${TYPE_RU[t]}</td>${[0, 1, 2, 3, 9].map((k) => { const g = groups[t + ':' + k]; return `<td>${g ? median(g.map((x) => x.val)).toFixed(1) + ' <span class="mut">(' + g.length + ')</span>' : '—'}</td>`; }).join('')}</tr>`;
html += `</table><div class="mut">Ожидается рост слева направо. Если уровень 2 не лучше уровня 1 — находки поздних миссий не ощущаются наградой.</div>`;
html += `</main></body></html>`;

const out = path.join(ROOT, 'docs', 'balance.html');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log('Готово:', path.relative(ROOT, out));
// краткая сводка в консоль
const flagged = values.filter((v) => v.flag);
console.log(`Карт оценено: ${values.length}, выбросов: ${flagged.length}`);
missions.slice(P.REF_MISSIONS).forEach((x) => {
  const lows = [];
  for (const hid of HEROES) for (const [k, l] of METRICS) { const v = val(x.heroes[hid], k), r = ref[hid + k]; if (v * 100 < r.min * 100 - P.REF_TOL) lows.push(`${hname(hid)}/${l} ${pct(v)}% (эталон ≥${pct(r.min)}%)`); }
  if (lows.length) console.log(`М${x.m.num}: ниже эталона — ${lows.join('; ')}`);
});
if (process.env.DUMP) values.sort((a, b) => a.d.type.localeCompare(b.d.type) || a.d.tier - b.d.tier || b.val - a.val).forEach((v) => console.log(v.d.type.padEnd(10), String(v.d.tier).padEnd(2), v.d.name.slice(0, 24).padEnd(24), v.val.toFixed(1).padStart(6), v.median.toFixed(1).padStart(6), v.flag ? (v.dev > 0 ? '▲' : '▼') : ' ', v.plays.map((p) => p.mode + ':' + p.per.toFixed(1)).join(' | '), v.unknown.join(',')));
