/* Герои, характеристики и навыки */
(function () {
  'use strict';
  const ZG = window.ZG;

  ZG.ATTRS = ['str', 'dex', 'wit', 'end', 'will'];
  /** навык → характеристика */
  ZG.SKILLS = {
    melee: 'str',
    shooting: 'dex',
    stealth: 'dex',
    tech: 'wit',
    medicine: 'wit',
    survival: 'end',
    persuasion: 'will',
  };
  ZG.attrOf = (s) => ZG.SKILLS[s] || s;
  ZG.skillName = (s) => ZG.T((ZG.SKILLS[s] ? 'skill_' : 'attr_') + s);

  ZG.CARD_TYPES = ['weapon', 'item', 'consumable', 'ally', 'resolve', 'technique'];

  /* Владение: какие свойства карт требуют обучения */
  ZG.PROF = {
    firearms: { name: 'Огнестрел', trait: 'Огнестрел', kind: 'weapon' },
    heavyweapons: { name: 'Тяжёлое оружие', trait: 'Тяжёлое', kind: 'weapon' },
    heavyarmor: { name: 'Тяжёлая броня', trait: 'Тяжёлая броня', kind: 'armor' },
  };

  /* Состояния */
  ZG.CONDS = {
    poison: { name: 'Отравление', icon: 'vial', text: 'После добора руки случайная карта из руки уходит под низ колоды (3 раза). Раньше снимается Антибиотиками, медицинскими приёмами или Полевой медициной.' },
    vuln: { name: 'Уязвимость', icon: 'biohazard', text: 'Нельзя уменьшать урон кислотой, холодом, электричеством и огнём — ни картами, ни бронёй. Проходит через 3 хода.' },
    decay: { name: 'Распад', icon: 'skull', text: 'В конце каждого своего хода бросьте d4: 1 — Решимость, 2 — Союзники, 3 — Оружие и Приёмы, 4 — Снаряжение и Расходники. Все карты этого типа из сброса захораниваются до конца миссии. Снимается медицинскими приёмами, Сывороткой или Полевой медициной.' },
    numb: { name: 'Онемение', icon: 'moon', text: 'В каждой проверке все кубики наибольшего размера становятся на шаг меньше (d12→d10, d10→d8…). Снимается медицинскими приёмами, Сывороткой или Полевой медициной.' },
    doom: { name: 'Обречённость', icon: 'hourglass', text: 'В начале хода сбросьте карту Решимости из руки — или потеряйте карту Часов. Проходит через 3 хода или от Консервов.' },
    terror: { name: 'Ночной ужас', icon: 'eye', text: 'Действует только ночью: в начале хода бросок Воли 5, при провале сбросьте случайную карту из руки. Проходит на рассвете.' },
    detained: { name: 'Задержан', icon: 'lock', text: 'Ход заканчивается сразу, а следующий свой ход герой пропускает (Часы при этом идут). Пока задержан — не может перекрывать локации перед боем с Угрозой и помогать соседям картами. Снимается в конце пропущенного хода; медициной не снимается.' },
  };
  ZG.DMG_TYPES = { acid: 'кислота', cold: 'холод', electric: 'электричество', fire: 'огонь' };


  ZG.HEROES = {
    marina: {
      acc: 'Марину',
      id: 'marina',
      name: 'Марина Шор',
      role: 'Фельдшер скорой',
      icon: 'cross',
      color: '#5fb3a1',
      attrs: { str: 'd4', dex: 'd8', wit: 'd12', end: 'd6', will: 'd8' },
      skills: { medicine: 3, persuasion: 2 },
      hand: 5,
      deck: { weapon: 2, item: 3, consumable: 4, ally: 2, resolve: 3, technique: 1 },
      prof: [],
      start: ['knife', 'flashlight', 'jacket', 'binoculars', 'bandage', 'bandage', 'painkillers', 'cannedfood', 'neighbor', 'rex', 'hope', 'hope', 'prayer', 'triage', 'acidsyringe'],
      powers: [
        { id: 'fieldmed', name: 'Полевая медицина', text: 'Вместо первого исследования за ход покажите карту с признаком «Медицина» и выберите героя в своей локации (можно себя). На выбор: он перетасовывает 1d4+1 случайных карт из сброса в колоду, или изгоняет 1 Инфекцию, или снимает все состояния. Показанная карта сбрасывается.' },
        { id: 'steady', name: 'Твёрдая рука', text: 'В бою с оружием «Тихое» +1d4, и можно бросать кубик Смекалки вместо Ловкости (без бонуса Медицины).' },
      ],
      bio: 'Двенадцать лет на скорой в Холлоу-Крик. Видела, как всё началось — в собственной машине.',
    },
    grom: {
      acc: 'Грома',
      id: 'grom',
      name: 'Джек «Гром» Харлан',
      role: 'Бывший морпех',
      icon: 'crosshair',
      color: '#c2683f',
      attrs: { str: 'd10', dex: 'd8', wit: 'd4', end: 'd8', will: 'd6' },
      skills: { melee: 2, shooting: 3, survival: 1 },
      hand: 4,
      deck: { weapon: 4, item: 3, consumable: 3, ally: 1, resolve: 2, technique: 2 },
      prof: ['firearms', 'heavyweapons', 'heavyarmor'],
      start: ['pistol', 'pistol', 'bat', 'knife', 'jacket', 'jacket', 'flashlight', 'ammo', 'ammo', 'bandage', 'trucker', 'hope', 'hope', 'doubletap', 'headshot'],
      powers: [
        { id: 'veteran', name: 'Боевой опыт', text: 'Ваши боевые проверки с оружием получают +1d4.' },
        { id: 'loud', name: 'Громкий', text: 'Если ваше оружие шумит, шум этой проверки +1, но и боевая проверка получает +1d6.' },
      ],
      bio: 'Вернулся домой за тишиной. Тишины больше не будет.',
    },
    ten: {
      acc: 'Тень',
      id: 'ten',
      name: 'Лиза «Тень» Морроу',
      role: 'Паркурщица',
      icon: 'wind',
      color: '#8c7ad6',
      attrs: { str: 'd4', dex: 'd12', wit: 'd8', end: 'd6', will: 'd6' },
      skills: { stealth: 3, shooting: 1 },
      hand: 5,
      deck: { weapon: 2, item: 2, consumable: 3, ally: 2, resolve: 4, technique: 2 },
      prof: ['firearms'],
      start: ['knife', 'pistol', 'flashlight', 'pads', 'energy', 'bandage', 'molotov', 'rex', 'neighbor', 'hope', 'hope', 'hope', 'prayer', 'ambush', 'sprint'],
      powers: [
        { id: 'evade', name: 'Ускользнуть', text: 'Раз в ход, встретив мертвеца или человека (не Угрозу и не того, от кого «нельзя уклониться»), можете уклониться: проверка Скрытности против сложности врага +2. Успех — враг уходит под низ колоды локации.' },
        { id: 'silent', name: 'Бесшумная', text: 'Боевые проверки с оружием «Тихое» получают +1d4.' },
        { id: 'scout', name: 'Разведка', text: 'Раз в ход, до исследования: перезарядите карту из руки (кроме Инфекции), чтобы посмотреть верхнюю карту любой локации; можете положить её вниз колоды.' },
      ],
      bio: 'Крыши Холлоу-Крик она знает лучше, чем его улицы. Теперь это пригодилось.',
    },
    palych: {
      acc: 'Ключа',
      id: 'palych',
      name: 'Рэй «Ключ» Доусон',
      role: 'Механик',
      icon: 'wrench',
      color: '#c9a646',
      attrs: { str: 'd8', dex: 'd6', wit: 'd10', end: 'd8', will: 'd4' },
      skills: { tech: 3, melee: 2 },
      hand: 5,
      deck: { weapon: 3, item: 4, consumable: 3, ally: 1, resolve: 2, technique: 2 },
      prof: ['heavyweapons', 'heavyarmor'],
      start: ['crowbar', 'bat', 'hatchet', 'toolbox', 'flashlight', 'jacket', 'trashlid', 'antibiotics', 'bandage', 'cannedfood', 'trucker', 'hope', 'hope', 'brace', 'headshot'],
      powers: [
        { id: 'carpenter', name: 'Золотые руки', text: 'Попытки заколотить получают +1d4. Боевые проверки с оружием «Инструмент» получают +1d4.' },
        { id: 'scrounger', name: 'Барахольщик', text: 'Проверки поиска Оружия и Снаряжения получают +2.' },
      ],
      bio: 'Тридцать лет держал автомастерскую на 9-й улице Холлоу-Крик. Чинил всё, что ездит, — теперь заколачивает всё, что открывается. Говорит, видал и похуже.',
    },
  };
  /** Короткое имя героя: прозвище, если есть («Гром»), иначе имя («Марина») */
  ZG.heroShort = (id) => { const n = ZG.HEROES[id].name; const m = n.match(/«(.+?)»/); return m ? m[1] : n.split(' ')[0]; };
  ZG.HERO_ORDER = ['marina', 'grom', 'ten', 'palych'];

  ZG.SCARS = [
    { id: 'scar_hand', text: 'Дрожащие руки: −1 к размеру руки', hand: -1 },
    { id: 'scar_str', text: 'Сломанные рёбра: −1 к Силе', attr: 'str' },
    { id: 'scar_dex', text: 'Хромота: −1 к Ловкости', attr: 'dex' },
    { id: 'scar_wit', text: 'Кошмары: −1 к Смекалке', attr: 'wit' },
    { id: 'scar_end', text: 'Лихорадка: −1 к Выдержке', attr: 'end' },
    { id: 'scar_will', text: 'Пустой взгляд: −1 к Воле', attr: 'will' },
  ];
})();
