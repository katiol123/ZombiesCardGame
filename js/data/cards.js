/* Коробка карт: находки (оружие, снаряжение, расходники, союзники, решимость),
 * мертвецы, люди, вожаки, угрозы, препятствия и инфекция.
 *
 * Розыгрыш карт (plays):
 *  on: 'check' | 'damage' | 'action' | 'evade' | 'infect'
 *  mode: 'reveal' (показать, карта остаётся в руке) | 'discard' | 'recharge' (под низ колоды) | 'banish'
 *  kind: 'any' | 'noncombat' | ['combat','acquire','event','close']
 *  weapon: навыки, которыми выполняется бой с этим оружием
 *  dice / bonus / skillDie / noise / noiseMod / nightDice / trait / night / help
 *  reduce (урон), heal, cure, explore, scout, draw, lure
 *  Тексты правил генерируются автоматически (js/engine/text.js), поэтому всегда совпадают с механикой.
 */
(function () {
  'use strict';
  const ZG = window.ZG;
  const C = {};
  const add = (list) => list.forEach((c) => (C[c.id] = c));

  const COMBAT = ['combat'];
  const NONCOMBAT = 'noncombat';

  /* ============================== ОРУЖИЕ ============================== */
  add([
    { id: 'knife', type: 'weapon', name: 'Кухонный нож', tier: 0, basic: true, icon: 'knife', traits: ['Ближнее', 'Тихое'],
      acquire: { skills: ['dex', 'melee'], dc: 4 },
      plays: [{ on: 'check', mode: 'reveal', kind: COMBAT, weapon: ['str', 'dex', 'melee'], dice: ['d4'], bonus: 1 }],
      flavor: 'Ещё вчера им резали хлеб.' },
    { id: 'bat', type: 'weapon', name: 'Бейсбольная бита', tier: 0, basic: true, icon: 'bat', traits: ['Ближнее'],
      acquire: { skills: ['str', 'melee'], dc: 5 },
      plays: [{ on: 'check', mode: 'reveal', kind: COMBAT, weapon: ['str', 'melee'], dice: ['d6'], noise: 1 }],
      flavor: '«Холлоу-Крик Хорнетс», чемпионы округа 2019.' },
    { id: 'crowbar', type: 'weapon', name: 'Монтировка', tier: 0, icon: 'wrench', traits: ['Ближнее', 'Инструмент'],
      acquire: { skills: ['str', 'tech'], dc: 5 },
      plays: [
        { on: 'check', mode: 'reveal', kind: COMBAT, weapon: ['str', 'melee'], dice: ['d6'], noise: 1 },
        { on: 'check', mode: 'reveal', kind: ['close'], dice: ['d4'] },
      ],
      flavor: 'Открывает двери. И черепа.' },
    { id: 'hatchet', type: 'weapon', name: 'Туристический топорик', tier: 0, icon: 'axe', traits: ['Ближнее', 'Инструмент'],
      acquire: { skills: ['str', 'survival'], dc: 5 },
      plays: [{ on: 'check', mode: 'reveal', kind: COMBAT, weapon: ['str', 'melee'], dice: ['d6'], bonus: 1, noise: 1 }],
      flavor: 'Куплен для рыбалки, которой так и не случилось.' },
    { id: 'pistol', type: 'weapon', name: 'Пистолет 9 мм', tier: 0, basic: true, icon: 'gun', traits: ['Огнестрел'],
      acquire: { skills: ['dex', 'shooting'], dc: 6 },
      plays: [{ on: 'check', mode: 'reveal', kind: COMBAT, weapon: ['dex', 'shooting'], dice: ['d8'], noise: 3 }],
      flavor: 'Каждый выстрел — приглашение на ужин.' },
    { id: 'nailbat', type: 'weapon', name: 'Бита с гвоздями', tier: 1, icon: 'bat', traits: ['Ближнее', 'Самоделка'],
      acquire: { skills: ['tech', 'str'], dc: 6 },
      plays: [{ on: 'check', mode: 'reveal', kind: COMBAT, weapon: ['str', 'melee'], dice: ['d8'], noise: 1 }],
      flavor: 'Кто-то потратил на неё целый вечер. Вечер, которого у него не было.' },
    { id: 'machete', type: 'weapon', name: 'Мачете', tier: 1, icon: 'sword', traits: ['Ближнее', 'Тихое'],
      acquire: { skills: ['str', 'melee'], dc: 7 },
      plays: [{ on: 'check', mode: 'reveal', kind: COMBAT, weapon: ['str', 'dex', 'melee'], dice: ['d8'], bonus: 1 }],
      flavor: 'Садовый инвентарь мистера Оуэнса.' },
    { id: 'shotgun', type: 'weapon', name: 'Помповый дробовик', tier: 1, icon: 'shotgun', traits: ['Огнестрел'],
      acquire: { skills: ['dex', 'shooting'], dc: 7 },
      plays: [{ on: 'check', mode: 'reveal', kind: COMBAT, weapon: ['str', 'dex', 'shooting'], dice: ['d6', 'd6'], noise: 4 }],
      flavor: 'Решает проблему. Создаёт новые.' },
    { id: 'crossbow', type: 'weapon', name: 'Арбалет', tier: 1, icon: 'crossbow', traits: ['Дальнее', 'Тихое'],
      acquire: { skills: ['dex', 'shooting'], dc: 7 },
      plays: [{ on: 'check', mode: 'reveal', kind: COMBAT, weapon: ['dex', 'shooting'], dice: ['d8'] }],
      flavor: 'Тишина — лучшая броня.' },
    { id: 'fireaxe', type: 'weapon', name: 'Пожарный топор', tier: 1, icon: 'axe', traits: ['Ближнее', 'Тяжёлое', 'Инструмент'],
      acquire: { skills: ['str'], dc: 8 },
      plays: [
        { on: 'check', mode: 'reveal', kind: COMBAT, weapon: ['str', 'melee'], dice: ['d10'], noise: 1 },
        { on: 'check', mode: 'discard', kind: COMBAT, weapon: ['str', 'melee'], dice: ['d10', 'd6'], noise: 1 },
      ],
      flavor: 'Снят со стены за стеклом «Разбить в случае пожара». Случай подходящий.' },
    { id: 'revolver', type: 'weapon', name: 'Револьвер шерифа', tier: 1, icon: 'gun', traits: ['Огнестрел'],
      acquire: { skills: ['dex', 'shooting'], dc: 7 },
      plays: [{ on: 'check', mode: 'reveal', kind: COMBAT, weapon: ['dex', 'shooting'], dice: ['d10'], noise: 3 }],
      flavor: 'Шериф Колдуэлл так и не успел его достать.' },
    { id: 'rifle', type: 'weapon', name: 'Охотничий карабин', tier: 2, icon: 'shotgun', traits: ['Огнестрел', 'Дальнее'],
      acquire: { skills: ['dex', 'shooting'], dc: 9 },
      plays: [
        { on: 'check', mode: 'reveal', kind: COMBAT, weapon: ['dex', 'shooting'], dice: ['d12'], bonus: 1, noise: 3 },
        { on: 'check', mode: 'recharge', kind: COMBAT, weapon: ['dex', 'shooting'], dice: ['d12', 'd8'], bonus: 1, noise: 3 },
      ],
      flavor: 'Оптика видит то, что ты предпочёл бы не видеть.' },
    { id: 'chainsaw', type: 'weapon', name: 'Бензопила', tier: 2, icon: 'saw', traits: ['Ближнее', 'Тяжёлое'],
      acquire: { skills: ['str', 'tech'], dc: 9 },
      plays: [{ on: 'check', mode: 'reveal', kind: COMBAT, weapon: ['str', 'melee'], dice: ['d10', 'd10'], noise: 5 }],
      flavor: 'Слышно на три квартала. Им — тоже.' },
    { id: 'scalpel', type: 'weapon', name: 'Скальпель доктора Хейла', tier: 9, reward: true, icon: 'knife', traits: ['Ближнее', 'Тихое', 'Трофей'],
      acquire: { skills: ['dex'], dc: 4 },
      plays: [{ on: 'check', mode: 'reveal', kind: COMBAT, weapon: ['dex', 'melee', 'medicine'], dice: ['d6'], bonus: 2 }],
      flavor: 'Хирургическая сталь. Хирургическая точность.' },
    { id: 'baton', type: 'weapon', name: 'Дубинка Бёрка', tier: 9, reward: true, icon: 'bat', traits: ['Ближнее', 'Трофей'],
      acquire: { skills: ['str'], dc: 4 },
      plays: [
        { on: 'check', mode: 'reveal', kind: COMBAT, weapon: ['str', 'melee'], dice: ['d8'], bonus: 2, noise: 1 },
        { on: 'damage', mode: 'reveal', reduce: 1 },
      ],
      flavor: 'Утяжелённая. Бёрк любил свою работу.' },
    { id: 'sawedoff', type: 'weapon', name: 'Обрез Кейна', tier: 9, reward: true, icon: 'shotgun', traits: ['Огнестрел', 'Трофей'],
      acquire: { skills: ['dex'], dc: 4 },
      plays: [{ on: 'check', mode: 'reveal', kind: COMBAT, weapon: ['str', 'dex', 'shooting'], dice: ['d8', 'd8'], noise: 4 }],
      flavor: 'Кейн говорил, что это самый честный аргумент.' },
  ]);

  /* ============================== СНАРЯЖЕНИЕ ============================== */
  add([
    { id: 'flashlight', type: 'item', name: 'Фонарик', tier: 0, basic: true, icon: 'flashlight', traits: ['Свет'],
      acquire: { skills: ['wit'], dc: 4 },
      plays: [{ on: 'check', mode: 'reveal', kind: NONCOMBAT, dice: ['d4'], nightDice: ['d8'] }],
      flavor: 'Батарейки — новая валюта.' },
    { id: 'jacket', type: 'item', name: 'Кожаная куртка', tier: 0, basic: true, icon: 'shield', traits: ['Броня'],
      acquire: { skills: ['end', 'survival'], dc: 4 },
      plays: [{ on: 'damage', mode: 'recharge', reduce: 1 }],
      flavor: 'Зубам нужно время, чтобы прогрызть кожу. Иногда этого времени хватает.' },
    { id: 'trashlid', type: 'item', name: 'Крышка от мусорного бака', tier: 0, basic: true, icon: 'shield', traits: ['Броня', 'Щит'],
      acquire: { skills: ['str', 'survival'], dc: 4 },
      plays: [
        { on: 'damage', mode: 'recharge', reduce: 1, combatOnly: true },
        { on: 'damage', mode: 'burn', reduce: 'all' },
      ],
      flavor: 'Гнётся. Звенит. Держит.' },
    { id: 'pads', type: 'item', name: 'Наколенники и налокотники', tier: 0, icon: 'shield', traits: ['Броня'],
      acquire: { skills: ['dex', 'survival'], dc: 4 },
      plays: [
        { on: 'damage', mode: 'recharge', reduce: 1 },
        { on: 'check', mode: 'reveal', kind: NONCOMBAT, skills: ['dex', 'stealth'], bonus: 1 },
      ],
      flavor: 'Асфальт не прощает. Зубы — тем более.' },
    { id: 'helmet', type: 'item', name: 'Мотоциклетный шлем', tier: 1, icon: 'shield', traits: ['Броня'],
      acquire: { skills: ['end', 'survival'], dc: 6 },
      plays: [
        { on: 'damage', mode: 'reveal', reduce: 1 },
        { on: 'damage', mode: 'recharge', reduce: 2 },
      ],
      flavor: 'Визор в трещинах. Каждая — чья-то попытка.' },
    { id: 'backpack', type: 'item', name: 'Туристический рюкзак', tier: 0, icon: 'backpack', traits: [],
      acquire: { skills: ['end'], dc: 4 },
      plays: [{ on: 'action', mode: 'recharge', draw: 2, putBack: 1 }],
      flavor: 'Сорок литров надежды.' },
    { id: 'toolbox', type: 'item', name: 'Набор инструментов', tier: 0, icon: 'wrench', traits: ['Инструмент'],
      acquire: { skills: ['wit', 'tech'], dc: 5 },
      plays: [
        { on: 'check', mode: 'reveal', kind: ['close'], dice: ['d6'] },
        { on: 'check', mode: 'reveal', kind: ['acquire', 'event'], skills: ['tech'], dice: ['d4'] },
      ],
      flavor: 'Молоток, гвозди, изолента. Святая троица.' },
    { id: 'binoculars', type: 'item', name: 'Бинокль', tier: 0, icon: 'binoculars', traits: [],
      acquire: { skills: ['wit'], dc: 5 },
      plays: [{ on: 'action', mode: 'recharge', scout: true }],
      flavor: 'Лучше увидеть их первым.' },
    { id: 'lockpicks', type: 'item', name: 'Отмычки', tier: 1, icon: 'lock', traits: ['Инструмент'],
      acquire: { skills: ['dex', 'tech'], dc: 6 },
      plays: [{ on: 'check', mode: 'reveal', kind: ['acquire', 'event', 'close'], skills: ['tech', 'dex', 'stealth', 'wit'], dice: ['d6'] }],
      flavor: 'Закрытая дверь — это просто вежливая просьба.' },
    { id: 'riotgear', type: 'item', name: 'Полицейская защита', tier: 1, icon: 'shield', traits: ['Броня'],
      acquire: { skills: ['str', 'end'], dc: 7 },
      plays: [
        { on: 'damage', mode: 'reveal', reduce: 1 },
        { on: 'damage', mode: 'recharge', reduce: 3 },
      ],
      flavor: 'Щитки, наручи, шлем. Рассчитаны на толпу. Почти.' },
    { id: 'silencer', type: 'item', name: 'Самодельный глушитель', tier: 1, icon: 'can', traits: ['Самоделка'],
      acquire: { skills: ['tech'], dc: 6 },
      plays: [{ on: 'check', mode: 'reveal', kind: COMBAT, trait: 'Огнестрел', noiseMod: -3, bonus: 0 }],
      flavor: 'Масляный фильтр и немного изоленты.' },
    { id: 'gasmask', type: 'item', name: 'Противогаз', tier: 1, icon: 'mask', traits: ['Броня'],
      acquire: { skills: ['end', 'survival'], dc: 6 },
      plays: [{ on: 'infect', mode: 'discard' }],
      flavor: 'Дышать тяжело. Но дышать.' },
    { id: 'medkit', type: 'item', name: 'Армейская аптечка', tier: 2, icon: 'medkit', traits: ['Медицина'],
      acquire: { skills: ['medicine', 'wit'], dc: 7 },
      plays: [{ on: 'action', mode: 'recharge', heal: { dice: ['d4'], bonus: 1 }, target: 'here' }],
      flavor: 'Маркировка Национальной гвардии.' },
    { id: 'vest', type: 'item', name: 'Бронежилет', tier: 2, icon: 'shield', traits: ['Броня'],
      acquire: { skills: ['str', 'end'], dc: 8 },
      plays: [
        { on: 'damage', mode: 'reveal', reduce: 2 },
        { on: 'damage', mode: 'discard', reduce: 'all' },
      ],
      flavor: 'Класс защиты IIIA. От укусов не сертифицирован.' },
    { id: 'nvg', type: 'item', name: 'Прибор ночного видения', tier: 2, icon: 'goggles', traits: ['Свет'],
      acquire: { skills: ['wit', 'tech'], dc: 8 },
      plays: [{ on: 'check', mode: 'reveal', kind: 'any', night: true, dice: ['d8'] }],
      flavor: 'Зелёный мир. Мёртвые в нём светятся иначе.' },
    { id: 'armyradio', type: 'item', name: 'Армейская рация', tier: 9, reward: true, icon: 'radio', traits: ['Трофей'],
      acquire: { skills: ['wit'], dc: 4 },
      plays: [{ on: 'action', mode: 'recharge', explore: true }],
      flavor: '«…эвакуация с моста Мэдисон… повторяю…»' },
  ]);

  /* ============================== РАСХОДНИКИ ============================== */
  add([
    { id: 'bandage', type: 'consumable', name: 'Бинты', tier: 0, basic: true, icon: 'bandage', traits: ['Медицина'],
      acquire: { skills: ['survival', 'medicine'], dc: 3 },
      plays: [{ on: 'action', mode: 'burn', heal: { dice: ['d4'] }, target: 'here' }],
      flavor: 'Туго. Ещё туже.' },
    { id: 'ammo', type: 'consumable', name: 'Патроны', tier: 0, basic: true, icon: 'ammo', traits: [],
      acquire: { skills: ['dex', 'survival'], dc: 4 },
      plays: [{ on: 'check', mode: 'burn', kind: COMBAT, trait: 'Огнестрел', dice: ['d6'] }],
      flavor: 'Считай каждый.' },
    { id: 'painkillers', type: 'consumable', name: 'Обезболивающее', tier: 0, icon: 'pill', traits: ['Медицина'],
      acquire: { skills: ['medicine', 'wit'], dc: 4 },
      plays: [{ on: 'damage', mode: 'burn', reduce: 2 }],
      flavor: 'Боль никуда не уходит. Просто ждёт.' },
    { id: 'energy', type: 'consumable', name: 'Энергетик', tier: 0, icon: 'bolt', traits: [],
      acquire: { skills: ['survival'], dc: 3 },
      plays: [{ on: 'check', mode: 'burn', kind: 'any', dice: ['d4'], bonus: 1 }],
      flavor: '«Взрывной вкус граната». Тёплый.' },
    { id: 'cannedfood', type: 'consumable', name: 'Консервы', tier: 0, icon: 'can', traits: ['Еда'],
      acquire: { skills: ['survival'], dc: 3 },
      plays: [{ on: 'action', mode: 'burn', heal: { dice: [], bonus: 2 }, target: 'self' }],
      flavor: 'Тушёнка, срок годности — до конца света. Подходит.' },
    { id: 'molotov', type: 'consumable', name: 'Коктейль Молотова', tier: 0, icon: 'bottle', traits: ['Огонь'],
      acquire: { skills: ['survival', 'tech'], dc: 5 },
      plays: [{ on: 'check', mode: 'burn', kind: COMBAT, dice: ['d6', 'd6'], noise: 2 }],
      flavor: 'Мёртвые горят. Медленно.' },
    { id: 'antibiotics', type: 'consumable', name: 'Антибиотики', tier: 1, icon: 'pill', traits: ['Медицина'],
      acquire: { skills: ['medicine'], dc: 6 },
      plays: [{ on: 'action', mode: 'burn', cure: 1, target: 'here' }],
      flavor: 'Замедляют. Не лечат. Никто не знает, что лечит.' },
    { id: 'smoke', type: 'consumable', name: 'Дымовая шашка', tier: 1, icon: 'smoke', traits: [],
      acquire: { skills: ['tech', 'survival'], dc: 5 },
      plays: [{ on: 'evade', mode: 'burn' }],
      flavor: 'Мертвецы не видят в дыму. Ты тоже.' },
    { id: 'flare', type: 'consumable', name: 'Сигнальная ракета', tier: 1, icon: 'flare', traits: ['Огонь'],
      acquire: { skills: ['survival'], dc: 5 },
      plays: [{ on: 'action', mode: 'burn', lure: true }],
      flavor: 'Красная звезда над крышами. Все головы поворачиваются туда.' },
    { id: 'adrenaline', type: 'consumable', name: 'Шприц адреналина', tier: 2, icon: 'syringe', traits: ['Медицина'],
      acquire: { skills: ['medicine'], dc: 7 },
      plays: [{ on: 'check', mode: 'burn', kind: 'any', dice: ['d10'] }],
      flavor: 'Сердце бьётся за двоих.' },
    { id: 'serum', type: 'consumable', name: 'Экспериментальная сыворотка', tier: 2, icon: 'vial', traits: ['Медицина'],
      acquire: { skills: ['medicine', 'wit'], dc: 8 },
      plays: [{ on: 'action', mode: 'burn', cure: 'all', target: 'here' }],
      flavor: 'Партия 7-Б. На этикетке — логотип «Хейл Биомед».' },
    { id: 'pipebomb', type: 'consumable', name: 'Самодельная бомба', tier: 2, icon: 'bomb', traits: ['Огонь', 'Самоделка'],
      acquire: { skills: ['tech'], dc: 7 },
      plays: [{ on: 'check', mode: 'burn', kind: COMBAT, dice: ['d6', 'd6', 'd6'], noise: 4 }],
      flavor: 'Фитиль — пять секунд. Плюс-минус три.' },
  ]);

  /* ============================== СОЮЗНИКИ ============================== */
  add([
    { id: 'rex', type: 'ally', name: 'Пёс Рекс', tier: 0, icon: 'paw', traits: ['Животное'],
      acquire: { skills: ['persuasion', 'survival'], dc: 4 },
      plays: [{ on: 'action', mode: 'recharge', explore: true }],
      flavor: 'Чует мертвецов за квартал. И молчит.' },
    { id: 'neighbor', type: 'ally', name: 'Миссис Хэлли', tier: 0, basic: true, icon: 'user', traits: ['Горожанин'],
      acquire: { skills: ['persuasion'], dc: 4 },
      plays: [{ on: 'check', mode: 'recharge', kind: ['acquire'], dice: ['d6'] }],
      flavor: '«Ключ от кладовой Миллеров под третьим горшком».' },
    { id: 'trucker', type: 'ally', name: 'Дальнобойщик Бадди', tier: 0, icon: 'truck', traits: ['Горожанин'],
      acquire: { skills: ['persuasion', 'str'], dc: 5 },
      plays: [{ on: 'check', mode: 'recharge', kind: COMBAT, dice: ['d6'], noise: 1 }],
      flavor: 'Двести сорок фунтов и монтировка.' },
    { id: 'nurse', type: 'ally', name: 'Медсестра Джун', tier: 1, icon: 'cross', traits: ['Медик'],
      acquire: { skills: ['persuasion', 'medicine'], dc: 6 },
      plays: [{ on: 'action', mode: 'recharge', heal: { dice: ['d4'], bonus: 1 }, target: 'here' }],
      flavor: 'Последняя смена длится уже четвёртые сутки.' },
    { id: 'deputy', type: 'ally', name: 'Помощник шерифа Риз', tier: 1, icon: 'badge', traits: ['Закон'],
      acquire: { skills: ['persuasion'], dc: 6 },
      plays: [
        { on: 'check', mode: 'recharge', kind: COMBAT, dice: ['d8'], noise: 2 },
        { on: 'action', mode: 'discard', explore: true },
      ],
      flavor: 'Значок ещё блестит. Руки уже не дрожат.' },
    { id: 'kid', type: 'ally', name: 'Мальчишка Томми', tier: 1, icon: 'child', traits: ['Горожанин'],
      acquire: { skills: ['will', 'persuasion'], dc: 5 },
      plays: [
        { on: 'action', mode: 'recharge', scout: true },
        { on: 'check', mode: 'discard', kind: ['event'], dice: ['d6'] },
      ],
      flavor: 'Знает все лазейки в заборах. Не знает, где мама.' },
    { id: 'engineer', type: 'ally', name: 'Инженер Сэм', tier: 1, icon: 'wrench', traits: ['Горожанин'],
      acquire: { skills: ['tech', 'persuasion'], dc: 6 },
      plays: [{ on: 'check', mode: 'recharge', kind: ['close'], dice: ['d8'] }],
      flavor: 'Строил мосты. Теперь строит стены.' },
    { id: 'bouncer', type: 'ally', name: 'Вышибала Тони', tier: 1, icon: 'shield', traits: ['Горожанин'],
      acquire: { skills: ['persuasion', 'str'], dc: 6 },
      plays: [
        { on: 'damage', mode: 'discard', reduce: 3 },
        { on: 'check', mode: 'recharge', kind: COMBAT, dice: ['d4'], noise: 1 },
      ],
      flavor: '«Я двадцать лет стоял у дверей. Постою и сейчас».' },
    { id: 'hunter', type: 'ally', name: 'Охотница Мэйбл', tier: 2, icon: 'crossbow', traits: ['Охотник'],
      acquire: { skills: ['persuasion', 'survival'], dc: 8 },
      plays: [{ on: 'check', mode: 'recharge', kind: COMBAT, dice: ['d10'] }],
      flavor: 'Семьдесят два года, лук и ни капли жалости.' },
    { id: 'priest', type: 'ally', name: 'Отец Дуглас', tier: 2, icon: 'church', traits: ['Вера'],
      acquire: { skills: ['persuasion', 'will'], dc: 7 },
      plays: [{ on: 'check', mode: 'recharge', kind: 'any', skillDie: 1 }],
      flavor: '«Господь оставил этот город. Я — нет».' },
    { id: 'stranger', type: 'ally', name: 'Незнакомец', tier: 9, eventOnly: true, icon: 'user', traits: ['Чужак'],
      acquire: { skills: ['persuasion'], dc: 4 },
      plays: [{ on: 'check', mode: 'recharge', kind: COMBAT, dice: ['d6'], bonus: 1 }],
      flavor: 'Не назвал имени. Не показал руку под повязкой.' },
  ]);

  /* ============================== РЕШИМОСТЬ ============================== */
  add([
    { id: 'hope', type: 'resolve', name: 'Надежда', tier: 0, basic: true, icon: 'candle', traits: [],
      acquire: { skills: ['will', 'persuasion'], dc: 4 },
      plays: [
        { on: 'check', mode: 'discard', kind: 'any', skillDie: 1, help: true },
        { on: 'action', mode: 'discard', explore: true },
      ],
      flavor: 'Где-то там ещё есть свет.' },
    { id: 'prayer', type: 'resolve', name: 'Молитва', tier: 0, icon: 'church', traits: ['Вера'],
      acquire: { skills: ['will'], dc: 5 },
      plays: [{ on: 'check', mode: 'discard', kind: 'any', skillDie: 1, nightSkillDie: 2, help: true }],
      flavor: 'Ночью слова звучат громче.' },
    { id: 'rage', type: 'resolve', name: 'Ярость', tier: 1, icon: 'fire', traits: [],
      acquire: { skills: ['will', 'str'], dc: 5 },
      plays: [{ on: 'check', mode: 'discard', kind: COMBAT, skillDie: 2, help: true }],
      flavor: 'Они забрали всё. Пусть платят.' },
    { id: 'memory', type: 'resolve', name: 'Фото семьи', tier: 1, icon: 'photo', traits: [],
      acquire: { skills: ['will'], dc: 5 },
      plays: [{ on: 'check', mode: 'discard', kind: 'any', skillDie: 1, help: true, rechargeOnSuccess: true }],
      flavor: 'Ради них. Всегда ради них.' },
    { id: 'secondwind', type: 'resolve', name: 'Второе дыхание', tier: 1, icon: 'heartbeat', traits: [],
      acquire: { skills: ['will', 'end'], dc: 5 },
      plays: [
        { on: 'check', mode: 'discard', kind: 'any', dice: ['d6'], help: true },
        { on: 'action', mode: 'burn', heal: { dice: [], bonus: 2 }, target: 'self' },
      ],
      flavor: 'Ещё шаг. Ещё один.' },
    { id: 'miracle', type: 'resolve', name: 'Чудом уцелел', tier: 1, icon: 'heart', traits: [],
      acquire: { skills: ['will', 'survival'], dc: 5 },
      plays: [
        { on: 'damage', mode: 'discard', reduce: 'all' },
        { on: 'check', mode: 'discard', kind: 'any', skillDie: 1, help: true },
      ],
      flavor: 'Зубы сомкнулись в сантиметре. Опять.' },
    { id: 'lastlight', type: 'resolve', name: 'Последний луч', tier: 2, icon: 'sunrise', traits: [],
      acquire: { skills: ['will'], dc: 7 },
      plays: [{ on: 'check', mode: 'discard', kind: 'any', skillDie: 2, help: true }],
      flavor: 'Утро наступит. Хотя бы для кого-то.' },
  ]);

  /* ============================== ИНФЕКЦИЯ ============================== */
  add([
    { id: 'infection', type: 'infection', name: 'Инфекция', tier: 0, icon: 'biohazard', traits: ['Проклятие'], plays: [],
      text: 'Нельзя сыграть. Если у героя 3 Инфекции (в руке, колоде и сбросе) — он обращается.',
      flavor: 'Жар. Жажда. Голоса за стеной, которых нет.' },
  ]);

  /* ============================== МЕРТВЕЦЫ И ЛЮДИ ============================== */
  add([
    { id: 'shambler', type: 'enemy', name: 'Шатун', tier: 0, icon: 'skull', dc: 6, bite: true,
      flavor: 'Когда-то он продавал страховки.' },
    { id: 'crawler', type: 'enemy', name: 'Ползун', tier: 0, icon: 'skull', dc: 4, bite: true, infectOnFail: true,
      text: 'Если вы не победили его, получите Инфекцию, даже если урона не было.',
      flavor: 'Ног нет. Голод остался.' },
    { id: 'runner', type: 'enemy', name: 'Бегун', tier: 0, icon: 'skull', dc: 5, bite: true, before: { damage: 1 }, noEvade: true,
      text: 'До проверки: 1 урон. От него нельзя уклониться.',
      flavor: 'Свежий. Быстрый. Злой.' },
    { id: 'patient', type: 'enemy', name: 'Пациент', tier: 0, icon: 'skull', dc: 5, bite: true,
      flavor: 'Капельница всё ещё волочится за ним.' },
    { id: 'bloater', type: 'enemy', name: 'Толстяк', tier: 0, icon: 'skull', dc: 7, toxic: { skills: ['end', 'survival'], dc: 5 },
      text: 'После победы над ним: проверка Выдержки или Выживания 5, при провале — Инфекция.',
      flavor: 'Раздутый, как утопленник. Лучше не протыкать.' },
    { id: 'strangerz', type: 'enemy', name: 'Незнакомец (обращённый)', tier: 9, eventOnly: true, icon: 'skull', dc: 7, bite: true, noEvade: true,
      text: 'Он обратился прямо у вас на руках. Уклониться нельзя.',
      flavor: 'Повязка сползла. Под ней — следы зубов.' },
    { id: 'screamer', type: 'enemy', name: 'Крикун', tier: 0, icon: 'skull', dc: 6, bite: true, noiseOnEncounter: 2,
      text: 'При встрече: шум локации +2.',
      flavor: 'Его вой будит весь квартал.' },
    { id: 'deadcop', type: 'enemy', name: 'Мёртвый коп', tier: 1, icon: 'skull', dc: 8, bite: true, armor: 2,
      text: 'Бронежилет: проверки Силой и Рукопашной против него −2.',
      flavor: 'Значок 4471. Всё ещё на посту.' },
    { id: 'deaddog', type: 'enemy', name: 'Мёртвый пёс', tier: 1, icon: 'paw', dc: 6, bite: true, before: { damage: 1 }, noEvade: true,
      text: 'До проверки: 1 урон. От него нельзя уклониться.',
      flavor: 'Ошейник с биркой «Бадди». Хозяина рядом нет.' },
    { id: 'looter', type: 'enemy', living: true, name: 'Мародёр', tier: 1, icon: 'raider', dc: 7, theft: true,
      text: 'Человек. Если вы не победили его, он забирает (изгоняет) случайную карту из вашей руки.',
      flavor: '«Рюкзак. Медленно. На землю».' },
    { id: 'swarm', type: 'enemy', name: 'Стая', tier: 1, icon: 'skulls', dc: 9, bite: true, dmgAdd: 1,
      text: 'Урон от неё +1.',
      flavor: 'Пятеро. Нет, семеро. Нет…' },
    { id: 'spitter', type: 'enemy', name: 'Харкун', tier: 1, icon: 'skull', dc: 7, bite: true, before: { infectCheck: { skills: ['end', 'survival'], dc: 5 } },
      text: 'До проверки: Выдержка или Выживание 5, при провале — Инфекция.',
      flavor: 'Чёрная слизь летит на два метра.' },
    { id: 'soldierz', type: 'enemy', name: 'Солдат-мертвец', tier: 2, icon: 'skull', dc: 10, bite: true, armor: 2,
      text: 'Бронежилет: проверки Силой и Рукопашной против него −2.',
      flavor: 'Нашивка Нацгвардии. Каска пробита.' },
    { id: 'brute', type: 'enemy', name: 'Громила', tier: 2, icon: 'skull', dc: 11, bite: true, dmgAdd: 1,
      text: 'Урон от него +1.',
      flavor: 'При жизни он был вышибалой. Ничего не изменилось.' },
    { id: 'raider', type: 'enemy', living: true, name: 'Рейдер', tier: 2, icon: 'raider', dc: 9, theft: true, before: { damage: 1 },
      text: 'Человек. До проверки: 1 урон (стреляет первым). Если вы не победили его, он изгоняет случайную карту из вашей руки.',
      flavor: 'Банда Кейна. Красная бандана — их знак.' },
  ]);

  /* ============================== ВОЖАКИ И УГРОЗЫ ============================== */
  add([
    { id: 'orderly', type: 'henchman', name: 'Санитар', tier: 0, icon: 'ghost', dc: 8, bite: true,
      text: 'Вожак. Победив его, можно сразу попытаться заколотить локацию.',
      flavor: 'Ключи от всех дверей на поясе.' },
    { id: 'drhale', type: 'boss', name: 'Доктор Хейл', tier: 0, icon: 'bossskull', dc: 11, bite: true, before: { damage: 1 },
      text: 'Угроза. До проверки: 1 урон (скальпелем).',
      flavor: 'Главврач больницы Святой Анны. Он знал, что вводит пациентам.' },

    { id: 'butcher', type: 'henchman', name: 'Мясник', tier: 1, icon: 'ghost', dc: 9, bite: true, dmgAdd: 1,
      text: 'Вожак. Урон от него +1. Победив его, можно сразу попытаться заколотить локацию.',
      flavor: 'Фартук всё ещё белый. Местами.' },
    { id: 'burke', type: 'boss', name: 'Охранник Бёрк', tier: 1, icon: 'bossskull', dc: 13, bite: true, armor: 3,
      text: 'Угроза. Бронежилет: проверки Силой и Рукопашной против него −3.',
      flavor: 'Сорок лет охранял «Фэйрвью». Продолжает.' },

    { id: 'echo', type: 'henchman', name: 'Эхо', tier: 1, icon: 'ghost', dc: 9, bite: true, noiseOnEncounter: 2,
      text: 'Вожак. При встрече: шум +2. Победив его, можно сразу попытаться заколотить локацию.',
      flavor: 'Повторяет последние слова своих жертв.' },
    { id: 'matriarch', type: 'boss', name: 'Матриарх', tier: 1, icon: 'bossskull', dc: 14, bite: true, noiseOnEncounter: 3, failSummon: true,
      text: 'Угроза. При встрече: шум +3. Если вы не победили её — в каждую открытую локацию приходит мертвец.',
      flavor: 'Её крик — радиосигнал для мёртвых.' },

    { id: 'thug', type: 'henchman', living: true, name: 'Головорез', tier: 2, icon: 'raider', dc: 10, theft: true,
      text: 'Вожак, человек. Если вы не победили его, он изгоняет случайную карту из руки. Победив его, можно сразу попытаться заколотить локацию.',
      flavor: '«Кейн передаёт привет».' },
    { id: 'kane', type: 'boss', living: true, name: 'Главарь Кейн', tier: 2, icon: 'bossskull', dc: 15, theft: true, before: { damage: 2 },
      text: 'Угроза, человек. До проверки: 2 урона. Если вы не победили его, он изгоняет случайную карту из руки.',
      flavor: 'Бывший помощник шерифа. Теперь закон — он.' },

    { id: 'veteran', type: 'henchman', name: 'Ветеран-мертвец', tier: 2, icon: 'ghost', dc: 11, bite: true, armor: 2,
      text: 'Вожак. Проверки Силой и Рукопашной против него −2. Победив его, можно сразу попытаться заколотить локацию.',
      flavor: 'Медали звенят при каждом шаге.' },
    { id: 'colossus', type: 'boss', name: 'Колосс', tier: 2, icon: 'bossskull', dc: 16, bite: true, dmgAdd: 1, hits: 2,
      text: 'Угроза. Нужно победить в двух проверках подряд. Урон от него +1.',
      flavor: 'Сросшиеся тела десятков мертвецов. Мост дрожит под его шагами.' },
  ]);

  /* ============================== ПРЕПЯТСТВИЯ ============================== */
  /* fx: damage, noise, infect, clock, gain(type), summon, shock, banishType, healHere, exploreAgain */
  add([
    { id: 'rubble', type: 'event', name: 'Заваленный коридор', tier: 0, icon: 'alert',
      check: { skills: ['str', 'survival'], dc: 6 }, fail: [{ clock: 1 }],
      text: 'Провал: вы теряете время — сбросьте верхнюю карту Часов.', flavor: 'Каталки, стулья, чьё-то тело.' },
    { id: 'cans', type: 'event', name: 'Растяжка с банками', tier: 0, icon: 'alert',
      check: { skills: ['dex', 'stealth'], dc: 6 }, fail: [{ noise: 3 }],
      text: 'Провал: шум локации +3.', flavor: 'Кто-то здесь уже держал оборону.' },
    { id: 'glass', type: 'event', name: 'Битое стекло', tier: 0, icon: 'alert',
      check: { skills: ['dex', 'stealth'], dc: 5 }, fail: [{ damage: 'd4' }],
      text: 'Провал: 1к4 урона.', flavor: 'Хруст под ногами слышно в соседнем квартале.' },
    { id: 'locker', type: 'event', name: 'Запертый шкафчик', tier: 0, icon: 'lock',
      check: { skills: ['tech', 'str'], dc: 7 }, success: [{ gain: 'item' }],
      text: 'Успех: найдите случайное Снаряжение. Провал: ничего не происходит.', flavor: 'Табличка: «Д-р Хейл. Личное».' },
    { id: 'body', type: 'event', name: 'Тело на полу', tier: 0, icon: 'alert',
      check: { skills: ['wit', 'medicine'], dc: 5 }, success: [{ gain: 'consumable' }], fail: [{ summon: true }],
      text: 'Успех: обыщите карманы — случайный Расходник. Провал: тело встаёт — встреча с мертвецом.', flavor: 'Не шевелится. Пока.' },
    { id: 'cries', type: 'event', name: 'Крики о помощи', tier: 0, icon: 'users', choice: [
      { label: 'Помочь', sub: 'Убеждение или Воля 6. Успех: союзник. Провал: 2 урона, шум +2.',
        check: { skills: ['persuasion', 'will'], dc: 6 }, success: [{ gain: 'ally' }], fail: [{ damage: 2 }, { noise: 2 }] },
      { label: 'Пройти мимо', sub: 'Крики стихают за спиной. Изгоните случайную Решимость из колоды и потеряйте 1 карту Часов.',
        effects: [{ banishType: 'resolve' }, { clock: 1 }] },
    ], text: 'Выбор: помочь или пройти мимо.', flavor: '«Пожалуйста! Они в подвале! Пожалуйста!»' },
    { id: 'woundedstranger', type: 'event', name: 'Раненый незнакомец', tier: 0, icon: 'user', choice: [
      { label: 'Взять с собой', sub: 'Получите союзника «Незнакомец». Бросьте к6: на 1–2 он укушен и обращается прямо сейчас.',
        effects: [{ stranger: true }] },
      { label: 'Забрать рюкзак', sub: 'Два случайных Расходника. Изгоните случайную Решимость из своей колоды.',
        effects: [{ gain: 'consumable' }, { gain: 'consumable' }, { banishType: 'resolve' }] },
    ], text: 'Выбор: взять его с собой или забрать рюкзак.', flavor: 'Он прижимает к себе руку под окровавленной повязкой.' },
    { id: 'smokefill', type: 'event', name: 'Задымление', tier: 0, icon: 'smoke',
      check: { skills: ['end', 'survival'], dc: 6 }, fail: [{ damage: 2 }],
      text: 'Провал: 2 урона.', flavor: 'Где-то горит проводка.' },
    { id: 'alarm', type: 'event', name: 'Сигнализация', tier: 0, icon: 'noise',
      check: { skills: ['tech', 'wit'], dc: 7 }, fail: [{ noise: 4 }],
      text: 'Провал: шум локации +4.', flavor: 'Аккумулятор, будь он проклят, ещё жив.' },
    { id: 'nursery', type: 'event', name: 'Детская комната', tier: 0, icon: 'child',
      check: { skills: ['will', 'end'], dc: 6 }, success: [{ gain: 'resolve' }], fail: [{ shock: 2 }],
      text: 'Успех: найдите Решимость. Провал: шок — сбросьте 2 случайные карты из руки.', flavor: 'Мобиль над кроваткой всё ещё крутится.' },
    { id: 'stash', type: 'event', name: 'Тайник выживальщика', tier: 0, icon: 'backpack',
      check: { skills: ['wit', 'survival'], dc: 6 }, success: [{ gain: 'weapon' }], fail: [{ damage: 'd4' }],
      text: 'Успех: случайное Оружие. Провал: ловушка — 1к4 урона.', flavor: 'Крестик на карте. Растяжка у двери.' },
    { id: 'silence', type: 'event', name: 'Обманчивая тишина', tier: 0, icon: 'eye',
      check: { skills: ['stealth', 'wit'], dc: 6 }, fail: [{ summon: true }],
      text: 'Провал: встреча с мертвецом из темноты.', flavor: 'Слишком тихо. Так не бывает.' },
    { id: 'tripwire', type: 'event', name: 'Мина-растяжка', tier: 1, icon: 'bomb',
      check: { skills: ['dex', 'tech'], dc: 8 }, fail: [{ damage: 'd6' }, { noise: 2 }],
      text: 'Провал: 1к6 урона, шум +2.', flavor: 'Работа банды Кейна.' },
    { id: 'fire', type: 'event', name: 'Пожар', tier: 1, icon: 'fire',
      check: { skills: ['end', 'survival'], dc: 8 }, fail: [{ damage: 2 }, { noise: 2 }],
      text: 'Провал: 2 урона, шум +2.', flavor: 'Огонь ест дом за домом. Город горит уже неделю.' },
    { id: 'survivors', type: 'event', name: 'Группа выживших', tier: 1, icon: 'users', choice: [
      { label: 'Поделиться припасами', sub: 'Изгоните случайную карту из руки. Получите союзника и Решимость.',
        effects: [{ banishRandomHand: 1 }, { gain: 'ally' }, { gain: 'resolve' }] },
      { label: 'Прогнать', sub: 'Убеждение или Сила 7. Провал: драка — 2 урона.',
        check: { skills: ['persuasion', 'str'], dc: 7 }, fail: [{ damage: 2 }] },
    ], text: 'Выбор: поделиться или прогнать.', flavor: 'Трое. Голодные глаза. Один держит ружьё.' },
    { id: 'quarantine', type: 'event', name: 'Карантинная зона', tier: 1, icon: 'biohazard',
      check: { skills: ['medicine', 'wit'], dc: 7 }, success: [{ gain: 'consumable' }], fail: [{ infect: 1 }],
      text: 'Успех: случайный Расходник. Провал: Инфекция.', flavor: 'Жёлтая лента. Белые мешки. Один шевелится.' },
  ]);

  /* ============================== ПОМОЩНИКИ ============================== */
  ZG.CARDS = C;

  /** Определение карты по id (поддерживает динамических «обращённых» героев) */
  ZG.card = function (id) {
    if (C[id]) return C[id];
    if (id && id.startsWith('turned_')) {
      const hid = id.slice(7);
      const h = ZG.HEROES[hid];
      const def = {
        id, type: 'enemy', name: `Обращённый: ${h ? h.name.split(' ')[0] : '?'}`, tier: 0, icon: 'skull', dc: 9, bite: true,
        heroArt: hid, text: 'Это был ваш друг. Был.', flavor: 'Знакомая куртка. Чужие глаза.',
      };
      C[id] = def;
      return def;
    }
    return null;
  };

  ZG.isEnemy = (d) => d && (d.type === 'enemy' || d.type === 'henchman' || d.type === 'boss');
  ZG.isBoon = (d) => d && ZG.CARD_TYPES.includes(d.type);

  /** Случайная карта из коробки по типу и уровню миссии */
  ZG.boxPick = function (type, tier) {
    const pool = Object.values(C).filter((c) => {
      if (c.type !== type || c.reward || c.eventOnly || c.tier > 2) return false;
      if (c.type === 'event' && c.tier > tier) return false;
      return c.tier <= tier;
    });
    const weighted = [];
    pool.forEach((c) => {
      const w = c.tier === tier ? 3 : 1;
      for (let i = 0; i < w; i++) weighted.push(c.id);
    });
    return ZG.rng.pick(weighted);
  };
})();
