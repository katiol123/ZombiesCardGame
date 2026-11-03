/* Локации, карты Часов и миссии кампании «Первые дни» */
(function () {
  'use strict';
  const ZG = window.ZG;

  /* Состав колоды локации: e=мертвецы, w=оружие, i=снаряжение, c=расходники, a=союзники, r=решимость, v=препятствия
   * close: проверка, чтобы заколотить; noise: порог орды; mods: модификаторы локации */
  const L = {};
  const loc = (o) => (L[o.id] = o);

  /* ---------- Миссия 1: Больница Святой Анны ---------- */
  loc({ id: 'lobby', name: 'Приёмный покой', icon: 'hospital', deck: { e: 3, w: 1, i: 1, c: 2, a: 1, r: 0, v: 1 },
    close: { skills: ['tech', 'str'], dc: 6 }, noise: 7, mods: {},
    flavor: 'Каталки поперёк коридора. Табло всё ещё показывает очередь: 47.' });
  loc({ id: 'wards', name: 'Палаты', icon: 'bed', deck: { e: 3, w: 0, i: 1, c: 3, a: 1, r: 0, v: 1 },
    close: { skills: ['wit', 'tech', 'str'], dc: 6 }, noise: 6, mods: { acquireDc: { consumable: -1 } },
    flavor: 'Пустые кровати. Ремни на некоторых разорваны.' });
  loc({ id: 'morgue', name: 'Морг', icon: 'skull', deck: { e: 4, w: 1, i: 1, c: 0, a: 0, r: 1, v: 2 },
    close: { skills: ['str', 'tech'], dc: 7 }, noise: 7, mods: { enemyDc: 1 },
    flavor: 'Холодильные камеры открыты изнутри.' });
  loc({ id: 'pharmacy', name: 'Аптека', icon: 'pill', deck: { e: 2, w: 0, i: 1, c: 4, a: 1, r: 0, v: 1 },
    close: { skills: ['tech', 'str'], dc: 7 }, noise: 6, mods: { acquireDc: { consumable: -1 } },
    flavor: 'Решётка выломана. Но не всё вынесли.' });
  loc({ id: 'boiler', name: 'Котельная', icon: 'factory', deck: { e: 2, w: 2, i: 2, c: 0, a: 0, r: 1, v: 2 },
    close: { skills: ['tech', 'end'], dc: 6 }, noise: 8, mods: {},
    flavor: 'Гул труб глушит шаги. Твои — и их.' });
  loc({ id: 'ambulance', name: 'Парковка скорой', icon: 'car', deck: { e: 3, w: 1, i: 1, c: 0, a: 2, r: 1, v: 1 },
    close: { skills: ['str', 'survival'], dc: 6 }, noise: 5, mods: {},
    flavor: 'Мигалки крутятся без звука. Двери машин распахнуты.' });

  /* ---------- Миссия 2: Супермаркет «Фэйрвью» ---------- */
  loc({ id: 'salesfloor', name: 'Торговый зал', icon: 'store', deck: { e: 3, w: 1, i: 1, c: 2, a: 1, r: 0, v: 1 },
    close: { skills: ['str', 'tech'], dc: 7 }, noise: 6, mods: {},
    flavor: 'Тележки, рассыпанные хлопья, кровь на кафеле.' });
  loc({ id: 'storage', name: 'Склад', icon: 'warehouse', deck: { e: 3, w: 1, i: 2, c: 2, a: 0, r: 0, v: 1 },
    close: { skills: ['tech'], dc: 7 }, noise: 6, mods: { acquireDc: { item: -1 } },
    flavor: 'Стеллажи до потолка. Что-то скребётся наверху.' });
  loc({ id: 'butchery', name: 'Мясной отдел', icon: 'knife', deck: { e: 4, w: 2, i: 0, c: 1, a: 0, r: 1, v: 1 },
    close: { skills: ['str'], dc: 7 }, noise: 6, mods: { enemyDc: 1 },
    flavor: 'Холодильник не работает третий день. Запах ведёт их сюда.' });
  loc({ id: 'security', name: 'Офис охраны', icon: 'eye', deck: { e: 3, w: 2, i: 1, c: 0, a: 1, r: 1, v: 1 },
    close: { skills: ['tech', 'wit'], dc: 7 }, noise: 6, mods: { acquireDc: { weapon: -1 } },
    flavor: 'Мониторы показывают зал. На каждом — движение.' });
  loc({ id: 'loading', name: 'Погрузочная рампа', icon: 'truck', deck: { e: 3, w: 1, i: 1, c: 1, a: 2, r: 0, v: 1 },
    close: { skills: ['str', 'survival'], dc: 6 }, noise: 5, mods: {},
    flavor: 'Фура с открытым кузовом. Внутри темно.' });
  loc({ id: 'parking', name: 'Парковка', icon: 'car', deck: { e: 4, w: 1, i: 1, c: 1, a: 1, r: 1, v: 0 },
    close: { skills: ['survival', 'str'], dc: 7 }, noise: 5, mods: {},
    flavor: 'Сотня машин. За каждой может кто-то стоять.' });

  /* ---------- Миссия 3: Радиовышка на холме ---------- */
  loc({ id: 'hillfoot', name: 'Подножие холма', icon: 'trees', deck: { e: 3, w: 1, i: 1, c: 2, a: 1, r: 1, v: 0 },
    close: { skills: ['survival'], dc: 7 }, noise: 6, mods: {},
    flavor: 'Серпантин уходит в туман.' });
  loc({ id: 'rangerhut', name: 'Будка смотрителя', icon: 'building', deck: { e: 2, w: 2, i: 2, c: 1, a: 1, r: 0, v: 1 },
    close: { skills: ['tech', 'str'], dc: 7 }, noise: 6, mods: {},
    flavor: 'Журнал смотрителя обрывается на полуслове.' });
  loc({ id: 'generator', name: 'Генераторная', icon: 'bolt', deck: { e: 3, w: 0, i: 3, c: 1, a: 0, r: 1, v: 1 },
    close: { skills: ['tech'], dc: 8 }, noise: 5, mods: { acquireDc: { item: -1 } },
    flavor: 'Дизель, который нужно запустить. И который будет орать на всю долину.' });
  loc({ id: 'trail', name: 'Лесная тропа', icon: 'trees', deck: { e: 3, w: 1, i: 0, c: 2, a: 1, r: 1, v: 1 },
    close: { skills: ['survival', 'stealth'], dc: 7 }, noise: 7, mods: {},
    flavor: 'Между соснами мелькают силуэты.' });
  loc({ id: 'transformer', name: 'Трансформаторная', icon: 'bolt', deck: { e: 3, w: 1, i: 2, c: 1, a: 0, r: 0, v: 2 },
    close: { skills: ['tech', 'wit'], dc: 8 }, noise: 6, mods: { eventDc: 1 },
    flavor: 'Гудит. Искрит. Пахнет озоном и горелым мясом.' });
  loc({ id: 'mastbase', name: 'Площадка вышки', icon: 'tower', deck: { e: 4, w: 1, i: 1, c: 1, a: 0, r: 1, v: 1 },
    close: { skills: ['str', 'tech'], dc: 8 }, noise: 5, mods: { enemyDc: 1 },
    flavor: 'Сто двадцать метров ржавой стали. Наверху мигает красный огонь.' });

  /* ---------- Миссия 4: Мародёры ---------- */
  loc({ id: 'gasstation', name: 'Заправка «Тексако»', icon: 'fuel', deck: { e: 3, w: 1, i: 1, c: 2, a: 1, r: 0, v: 1 },
    close: { skills: ['tech', 'str'], dc: 8 }, noise: 6, mods: {},
    flavor: 'Колонки разбиты. В магазинчике кто-то сидит в темноте.' });
  loc({ id: 'junkyard', name: 'Автосвалка', icon: 'trash', deck: { e: 3, w: 2, i: 2, c: 0, a: 0, r: 1, v: 1 },
    close: { skills: ['tech'], dc: 8 }, noise: 6, mods: { acquireDc: { weapon: -1, item: -1 } },
    flavor: 'Лабиринт ржавых кузовов. Идеальное место для засады.' });
  loc({ id: 'gangcamp', name: 'Лагерь банды', icon: 'tent', deck: { e: 4, w: 2, i: 1, c: 1, a: 0, r: 0, v: 1 },
    close: { skills: ['str', 'stealth'], dc: 9 }, noise: 5, mods: { enemyDc: 1 },
    flavor: 'Костёр, бочки, клетка. В клетке — люди.' });
  loc({ id: 'motel', name: 'Мотель «Пайнс»', icon: 'bed', deck: { e: 3, w: 0, i: 1, c: 2, a: 2, r: 1, v: 0 },
    close: { skills: ['tech', 'wit'], dc: 8 }, noise: 6, mods: {},
    flavor: 'Неоновая вывеска моргает: «СВОБОДНЫЕ НОМЕРА».' });
  loc({ id: 'highway', name: 'Шоссе 26', icon: 'road', deck: { e: 4, w: 1, i: 1, c: 1, a: 1, r: 1, v: 0 },
    close: { skills: ['survival', 'str'], dc: 8 }, noise: 5, mods: {},
    flavor: 'Брошенные машины до горизонта.' });
  loc({ id: 'diner', name: 'Закусочная «У Мэгги»', icon: 'coffee', deck: { e: 3, w: 1, i: 0, c: 3, a: 1, r: 1, v: 0 },
    close: { skills: ['str', 'tech'], dc: 7 }, noise: 6, mods: { acquireDc: { consumable: -1 } },
    flavor: 'На стойке недопитый кофе и надпись кетчупом: «БЕГИТЕ».' });

  /* ---------- Миссия 5: Мост Мэдисон ---------- */
  loc({ id: 'checkpoint', name: 'Блокпост', icon: 'flag', deck: { e: 4, w: 2, i: 1, c: 1, a: 0, r: 1, v: 0 },
    close: { skills: ['str', 'tech'], dc: 9 }, noise: 6, mods: { acquireDc: { weapon: -1 } },
    flavor: 'Мешки с песком, прожекторы, тела в камуфляже.' });
  loc({ id: 'jam', name: 'Пробка на шоссе', icon: 'car', deck: { e: 4, w: 1, i: 1, c: 2, a: 1, r: 0, v: 0 },
    close: { skills: ['survival', 'stealth'], dc: 9 }, noise: 5, mods: {},
    flavor: 'Они пытались уехать. Они всё ещё в машинах.' });
  loc({ id: 'pylons', name: 'Опоры моста', icon: 'bridge', deck: { e: 3, w: 1, i: 2, c: 1, a: 0, r: 1, v: 1 },
    close: { skills: ['tech'], dc: 9 }, noise: 6, mods: { eventDc: 1 },
    flavor: 'Сапёры заложили заряды. Таймер тикает.' });
  loc({ id: 'fieldhospital', name: 'Полевой госпиталь', icon: 'tent', deck: { e: 4, w: 0, i: 1, c: 3, a: 1, r: 0, v: 0 },
    close: { skills: ['medicine', 'wit'], dc: 8 }, noise: 6, mods: { acquireDc: { consumable: -1 } },
    flavor: 'Палатки с красным крестом. Койки пусты. Почти.' });
  loc({ id: 'embankment', name: 'Набережная', icon: 'waves', deck: { e: 3, w: 1, i: 1, c: 1, a: 1, r: 2, v: 0 },
    close: { skills: ['survival'], dc: 8 }, noise: 7, mods: {},
    flavor: 'Река несёт тела к океану.' });
  loc({ id: 'evac', name: 'Пункт эвакуации', icon: 'flag', deck: { e: 4, w: 1, i: 1, c: 1, a: 1, r: 1, v: 0 },
    close: { skills: ['str', 'persuasion'], dc: 9 }, noise: 5, mods: { enemyDc: 1 },
    flavor: 'Последний вертолёт улетел вчера. Но кто-то ещё отвечает по рации.' });

  ZG.LOCATIONS = L;

  /* ============================== КАРТЫ ЧАСОВ ============================== */
  ZG.CLOCK = {
    calm: { id: 'calm', names: ['Тишина', 'Скрип ставней', 'Далёкий лай', 'Ветер в проводах', 'Капает вода', 'Шорох за стеной'], icon: 'hourglass', text: '' },
    siren: { id: 'siren', name: 'Далёкая сирена', icon: 'noise', text: 'Шум всех открытых локаций +1.' },
    rain: { id: 'rain', name: 'Ливень', icon: 'waves', text: 'Шум всех локаций −1.' },
    hunger: { id: 'hunger', name: 'Голод', icon: 'can', text: 'Каждый живой герой сбрасывает верхнюю карту своей колоды.' },
    howl: { id: 'howl', name: 'Вой из темноты', icon: 'skull', text: 'В случайную открытую локацию приходит мертвец.' },
    broadcast: { id: 'broadcast', name: 'Обрывок радиопередачи', icon: 'radio', text: 'Активный герой перетасовывает 1 карту из сброса в колоду.' },
    dawn: { id: 'dawn', name: 'Холодный рассвет', icon: 'sunrise', text: 'Каждый живой герой перетасовывает 1 случайную карту из сброса в колоду.' },
    fog: { id: 'fog', name: 'Туман', icon: 'smoke', text: 'В этот ход проверки поиска −1 к сложности, но враги +1.' },
  };

  /* ============================== МИССИИ ============================== */
  ZG.MISSIONS = [
    {
      id: 'm1', num: 1, name: 'Нулевой пациент', icon: 'hospital', tier: 0,
      place: 'Больница Святой Анны',
      intro: [
        'Третьи сутки больница Святой Анны молчит. Последнее, что передали по рации: «Карантин. Не входить».',
        'Вы прячетесь в подсобке приёмного покоя. За дверью шаркают шаги. Где-то в здании — доктор Хейл, главврач. Говорят, это он привёз сюда «нулевого пациента».',
        'Найдите его. Остановите. Выберитесь живыми.',
      ],
      goal: 'Найдите и уничтожьте Доктора Хейла. Побеждённый, он сбегает в любую открытую локацию — заколачивайте их или перекрывайте героями, чтобы загнать его в угол.',
      rule: 'Обучение: подсказки включены. Ночь наступает каждые 5 ходов.',
      boss: 'drhale', henchman: 'orderly',
      locations: ['lobby', 'wards', 'morgue', 'pharmacy', 'boiler', 'ambulance'],
      clockEvents: ['siren', 'howl', 'dawn', 'broadcast', 'rain', 'hunger', 'fog'],
      reward: { card: 'scalpel', text: 'Трофей: Скальпель доктора Хейла' },
      outro: 'Хейл падает. В его кармане — пропуск «Хейл Биомед» и список адресов. Город ещё не знает, что это было только начало.',
    },
    {
      id: 'm2', num: 2, name: 'Последние покупки', icon: 'store', tier: 1,
      place: 'Супермаркет «Фэйрвью»',
      intro: [
        'Еды осталось на два дня. Супермаркет «Фэйрвью» на окраине — единственное место, которое ещё не разграбили до конца.',
        'Проблема в том, что старый охранник Бёрк всё ещё на посту. Мёртвый, в бронежилете, и он никого не пропускает.',
        'Наберите припасов. Уйдите до того, как магазин станет вашей могилой.',
      ],
      goal: 'Уничтожьте Охранника Бёрка. Его бронежилет ослабляет удары Силой и Рукопашной — ищите огнестрел.',
      rule: 'Полные полки: найдя Расходник, получите ещё один случайный Расходник.',
      special: { bonusConsumable: true },
      boss: 'burke', henchman: 'butcher',
      locations: ['salesfloor', 'storage', 'butchery', 'security', 'loading', 'parking'],
      clockEvents: ['siren', 'howl', 'hunger', 'broadcast', 'rain', 'fog', 'siren'],
      reward: { card: 'baton', text: 'Трофей: Дубинка Бёрка' },
      outro: 'Багажник полон консервов. По радио в машине вдруг пробивается голос: «…вышка на холме Кэрролл… кто-нибудь…»',
    },
    {
      id: 'm3', num: 3, name: 'Голос в эфире', icon: 'tower', tier: 1,
      place: 'Радиовышка на холме Кэрролл',
      intro: [
        'Сигнал идёт с вышки на холме Кэрролл. Если её запустить, можно связаться с эвакуационным пунктом.',
        'Но на холме обосновалось нечто. Мертвецы стекаются туда со всей долины, будто их кто-то зовёт.',
        'Её называют Матриарх. Её крик — сигнал для мёртвых.',
      ],
      goal: 'Заставьте Матриарх замолчать. Следите за шумом: её крик легко вызывает орду.',
      rule: 'Помехи: порог орды во всех локациях на 1 ниже.',
      special: { noiseLimitMod: -1 },
      boss: 'matriarch', henchman: 'echo',
      locations: ['hillfoot', 'rangerhut', 'generator', 'trail', 'transformer', 'mastbase'],
      clockEvents: ['siren', 'siren', 'howl', 'howl', 'rain', 'dawn', 'broadcast'],
      reward: { card: 'armyradio', text: 'Трофей: Армейская рация' },
      outro: 'Эфир шипит. Потом — чёткий голос: «Мост Мэдисон. Эвакуация через 48 часов. Мост будет взорван». Путь лежит через шоссе 26. Там хозяйничает Кейн.',
    },
    {
      id: 'm4', num: 4, name: 'Закон Кейна', icon: 'raider', tier: 2,
      place: 'Шоссе 26',
      intro: [
        'Бывший помощник шерифа Кейн собрал банду и перекрыл шоссе. Плата за проезд — всё, что у вас есть. Иногда — вы сами.',
        'У Кейна есть грузовик с полным баком. И клетка с пленниками.',
        'Мёртвые медленные. Живые — нет.',
      ],
      goal: 'Одолейте Главаря Кейна и заберите грузовик. Его люди воруют карты — не держите в руке лишнего.',
      rule: 'Засада: в каждой локации прячется лишний Мародёр.',
      special: { extraEnemy: 'looter' },
      boss: 'kane', henchman: 'thug',
      locations: ['gasstation', 'junkyard', 'gangcamp', 'motel', 'highway', 'diner'],
      clockEvents: ['siren', 'howl', 'hunger', 'hunger', 'broadcast', 'fog', 'rain'],
      reward: { card: 'sawedoff', text: 'Трофей: Обрез Кейна' },
      outro: 'Грузовик заводится с третьего раза. Пленники из клетки забираются в кузов. Впереди — мост Мэдисон.',
    },
    {
      id: 'm5', num: 5, name: 'Мост', icon: 'bridge', tier: 2,
      place: 'Мост Мэдисон',
      intro: [
        'Эвакуационный пункт — на другом берегу. Сапёры уже заминировали опоры. Мост взорвут, как только последний вертолёт поднимется в воздух.',
        'Но к мосту стянулась вся мёртвая долина. И впереди неё идёт Колосс — гора сросшихся тел.',
        'Это последний рубеж. Дальше — только река.',
      ],
      goal: 'Уничтожьте Колосса (две победы подряд) до того, как мост взлетит на воздух.',
      rule: 'Время на исходе: Часы короче на 4 хода. Орда приводит 3 мертвецов вместо 2.',
      special: { clockMod: -4, hordeSize: 3 },
      boss: 'colossus', henchman: 'veteran',
      locations: ['checkpoint', 'jam', 'pylons', 'fieldhospital', 'embankment', 'evac'],
      clockEvents: ['siren', 'siren', 'howl', 'howl', 'hunger', 'dawn', 'broadcast'],
      reward: null,
      outro: 'Колосс рушится в реку. Вы бежите по мосту, и за спиной поднимается огненная стена. Вертолёт ждёт. Первые дни закончились. Начинается всё остальное.',
    },
  ];
})();
