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
    bleed: { name: 'Кровотечение', icon: 'heartbeat', text: 'В начале каждого из 3 следующих ходов сбросьте верхнюю карту колоды. Раньше снимается медицинским лечением (Бинты, медицинские приёмы и карты, Полевая медицина) или отдыхом.' },
    fracture: { name: 'Перелом', icon: 'bat', text: 'Нельзя идти в другую локацию. Снимается отдыхом, Полевой медициной или медицинскими приёмами.' },
    panic: { name: 'Паника', icon: 'alert', text: 'Нельзя играть карты Решимости. Проходит в конце вашего следующего хода.' },
    exhausted: { name: 'Истощение', icon: 'hourglass', text: 'Размер руки −1. Снимается отдыхом или едой.' },
  };

  ZG.HEROES = {
    marina: {
      id: 'marina',
      name: 'Марина Шор',
      role: 'Фельдшер скорой',
      icon: 'cross',
      color: '#5fb3a1',
      attrs: { str: 'd6', dex: 'd8', wit: 'd10', end: 'd6', will: 'd8' },
      skills: { medicine: 3, persuasion: 2 },
      hand: 5,
      deck: { weapon: 1, item: 3, consumable: 4, ally: 2, resolve: 3, technique: 2 },
      prof: [],
      start: ['knife', 'flashlight', 'jacket', 'binoculars', 'bandage', 'bandage', 'painkillers', 'cannedfood', 'neighbor', 'rex', 'hope', 'hope', 'prayer', 'triage', 'suture'],
      powers: [
        { id: 'fieldmed', name: 'Полевая медицина', text: 'Раз в ход: сбросьте карту из руки, чтобы герой на вашей локации либо перетасовал 2 случайные карты из сброса в колоду, либо изгнал 1 Инфекцию.' },
        { id: 'steady', name: 'Твёрдая рука', text: 'Небоевые проверки Медицины получают +1к4. В бою с оружием «Тихое» можно использовать Медицину.' },
      ],
      bio: 'Двенадцать лет на скорой в Холлоу-Крик. Видела, как всё началось — в собственной машине.',
    },
    grom: {
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
        { id: 'veteran', name: 'Боевой опыт', text: 'Ваши боевые проверки с оружием получают +1к4.' },
        { id: 'loud', name: 'Громкий', text: 'Если ваше оружие шумит, шум этой проверки +1.' },
      ],
      bio: 'Вернулся домой за тишиной. Тишины больше не будет.',
    },
    ten: {
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
        { id: 'evade', name: 'Ускользнуть', text: 'Раз в ход, встретив мертвеца или человека (не Угрозу), можете уклониться: проверка Скрытности против сложности врага. Успех — враг уходит под низ колоды локации, а вы получаете +1 исследование.' },
        { id: 'silent', name: 'Бесшумная', text: 'Боевые проверки с оружием «Тихое» получают +1к4.' },
        { id: 'scout', name: 'Разведка', text: 'Раз в ход: посмотрите верхнюю карту любой локации, можете положить её вниз колоды.' },
      ],
      bio: 'Крыши Холлоу-Крик она знает лучше, чем его улицы. Теперь это пригодилось.',
    },
    palych: {
      id: 'palych',
      name: 'Пол «Палыч» Пашков',
      role: 'Механик',
      icon: 'wrench',
      color: '#c9a646',
      attrs: { str: 'd8', dex: 'd6', wit: 'd10', end: 'd8', will: 'd4' },
      skills: { tech: 3, melee: 2 },
      hand: 4,
      deck: { weapon: 3, item: 4, consumable: 3, ally: 1, resolve: 2, technique: 2 },
      prof: ['heavyweapons', 'heavyarmor'],
      start: ['crowbar', 'bat', 'hatchet', 'toolbox', 'flashlight', 'jacket', 'trashlid', 'molotov', 'bandage', 'cannedfood', 'trucker', 'hope', 'hope', 'brace', 'headshot'],
      powers: [
        { id: 'carpenter', name: 'Золотые руки', text: 'Проверки баррикады получают +1к6. Боевые проверки с оружием «Инструмент» получают +1к4.' },
        { id: 'scrounger', name: 'Барахольщик', text: 'Проверки поиска Оружия и Снаряжения получают +2.' },
      ],
      bio: 'Приехал из Тольятти в девяностых, держал автомастерскую на 9-й улице. Говорит, видал и похуже.',
    },
  };
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
