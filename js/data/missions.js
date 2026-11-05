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
    close: { skills: ['wit', 'tech', 'will'], dc: 6 }, noise: 6, mods: { acquireDc: { consumable: -1 } },
    flavor: 'Пустые кровати. Ремни на некоторых разорваны.' });
  loc({ id: 'morgue', name: 'Морг', icon: 'skull', deck: { e: 4, w: 1, i: 1, c: 0, a: 0, r: 1, v: 2 },
    close: { skills: ['will', 'tech'], dc: 7 }, noise: 7, mods: { enemyDc: 1 },
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
  loc({ id: 'salesfloor', name: 'Торговый зал', icon: 'store', deck: { e: 1, w: 1, i: 1, c: 2, a: 1, r: 0, v: 1 },
    close: { skills: ['str', 'tech'], dc: 7 }, noise: 6, mods: {},
    flavor: 'Тележки, рассыпанные хлопья, кровь на кафеле.' });
  loc({ id: 'storage', name: 'Склад', icon: 'warehouse', deck: { e: 0, w: 1, i: 2, c: 2, a: 0, r: 0, v: 1 },
    close: { skills: ['tech'], dc: 7 }, noise: 6, mods: { acquireDc: { item: -1 } },
    flavor: 'Стеллажи до потолка. Что-то скребётся наверху.' });
  loc({ id: 'butchery', name: 'Мясной отдел', icon: 'knife', deck: { e: 3, w: 2, i: 0, c: 1, a: 0, r: 1, v: 1 },
    close: { skills: ['str'], dc: 7 }, noise: 6, mods: { enemyDc: 1 },
    flavor: 'Холодильник не работает третий день. Запах ведёт их сюда.' });
  loc({ id: 'security', name: 'Офис охраны', icon: 'eye', deck: { e: 1, w: 2, i: 1, c: 0, a: 1, r: 1, v: 1 },
    close: { skills: ['tech', 'wit'], dc: 7 }, noise: 6, mods: { acquireDc: { weapon: -1 } },
    flavor: 'Мониторы показывают зал. На каждом — движение.' });
  loc({ id: 'loading', name: 'Погрузочная рампа', icon: 'truck', deck: { e: 3, w: 1, i: 1, c: 1, a: 2, r: 0, v: 1 },
    close: { skills: ['str', 'survival'], dc: 6 }, noise: 5, mods: {},
    flavor: 'Фура с открытым кузовом. Внутри темно.' });
  loc({ id: 'parking', name: 'Парковка', icon: 'car', deck: { e: 4, w: 1, i: 1, c: 1, a: 1, r: 1, v: 0 },
    close: { skills: ['survival', 'dex'], dc: 7 }, noise: 5, mods: {},
    flavor: 'Сотня машин. За каждой может кто-то стоять.' });

  /* ---------- Миссия 3: Радиовышка на холме ---------- */
  loc({ id: 'hillfoot', name: 'Подножие холма', icon: 'trees', deck: { e: 3, w: 1, i: 1, c: 2, a: 1, r: 1, v: 0 },
    close: { skills: ['survival'], dc: 7 }, noise: 6, mods: {},
    flavor: 'Серпантин уходит в туман.' });
  loc({ id: 'rangerhut', name: 'Будка смотрителя', icon: 'building', deck: { e: 2, w: 2, i: 2, c: 1, a: 1, r: 0, v: 1 },
    close: { skills: ['tech', 'will'], dc: 7 }, noise: 6, mods: {},
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
    close: { skills: ['persuasion', 'stealth'], dc: 9 }, noise: 5, mods: { enemyDc: 1 },
    flavor: 'Костёр, бочки, клетка. В клетке — люди.' });
  loc({ id: 'motel', name: 'Мотель «Пайнс»', icon: 'bed', deck: { e: 3, w: 0, i: 1, c: 2, a: 2, r: 1, v: 0 },
    close: { skills: ['tech', 'wit'], dc: 8 }, noise: 6, mods: {},
    flavor: 'Неоновая вывеска моргает: «СВОБОДНЫЕ НОМЕРА».' });
  loc({ id: 'highway', name: 'Шоссе 26', icon: 'road', deck: { e: 4, w: 1, i: 1, c: 1, a: 1, r: 1, v: 0 },
    close: { skills: ['survival', 'str'], dc: 8 }, noise: 5, mods: {},
    flavor: 'Брошенные машины до горизонта.' });
  loc({ id: 'diner', name: 'Закусочная «У Мэгги»', icon: 'coffee', deck: { e: 3, w: 1, i: 0, c: 3, a: 1, r: 1, v: 0 },
    close: { skills: ['persuasion', 'tech'], dc: 7 }, noise: 6, mods: { acquireDc: { consumable: -1 } },
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
    close: { skills: ['will', 'persuasion'], dc: 9 }, noise: 5, mods: { enemyDc: 1 },
    flavor: 'Последний вертолёт улетел вчера. Но кто-то ещё отвечает по рации.' });


  /* ---------- Миссия 6: Карантинный лагерь Форт-Ривер ---------- */
  loc({ id: 'gate', name: 'КПП «Альфа»', icon: 'flag', deck: { e: 3, w: 2, i: 1, c: 1, a: 0, r: 1, v: 1 },
    close: { skills: ['str', 'tech'], dc: 9 }, noise: 6, mods: { acquireDc: { weapon: -1 } },
    flavor: 'Шлагбаум, вышка, прожектор. И список фамилий на стене.' });
  loc({ id: 'tents', name: 'Палаточный городок', icon: 'tent', deck: { e: 0, w: 0, i: 1, c: 3, a: 2, r: 1, v: 0 },
    close: { skills: ['survival', 'persuasion'], dc: 8 }, noise: 6, mods: {},
    flavor: 'Сотни коек. На каждой — бирка с номером.' });
  loc({ id: 'lab', name: 'Мобильная лаборатория', icon: 'vial', deck: { e: 1, w: 0, i: 2, c: 3, a: 0, r: 0, v: 2 },
    close: { skills: ['tech', 'medicine', 'end'], dc: 9 }, noise: 5, mods: { acquireDc: { consumable: -1 }, eventDc: 1 },
    flavor: 'Логотип «Хейл Биомед» на каждом ящике с пробирками.' });
  loc({ id: 'armory', name: 'Склад вооружения', icon: 'warehouse', deck: { e: 3, w: 3, i: 1, c: 1, a: 0, r: 0, v: 1 },
    close: { skills: ['tech', 'str'], dc: 9 }, noise: 6, mods: { enemyDc: 1 },
    flavor: 'Половина стоек пуста. Вторую охраняют.' });
  loc({ id: 'isolation', name: 'Изолятор', icon: 'lock', deck: { e: 5, w: 0, i: 1, c: 1, a: 1, r: 1, v: 1 },
    close: { skills: ['will', 'end'], dc: 9 }, noise: 5, mods: { enemyDc: 1 },
    flavor: 'Двери заварены снаружи. Изнутри — стук.' });
  loc({ id: 'helipad', name: 'Вертолётная площадка', icon: 'flag', deck: { e: 3, w: 1, i: 1, c: 1, a: 1, r: 2, v: 1 },
    close: { skills: ['survival', 'tech'], dc: 8 }, noise: 7, mods: {},
    flavor: 'Последний вертолёт стоит без топлива. Лопасти скрипят на ветру.' });

  /* ---------- Миссия 7: Шахта Блэкстоун ---------- */
  loc({ id: 'shaftentry', name: 'Устье шахты', icon: 'door', deck: { e: 3, w: 1, i: 2, c: 1, a: 1, r: 1, v: 0 },
    close: { skills: ['str', 'tech'], dc: 8 }, noise: 6, mods: {},
    flavor: 'Табличка «Без каски не входить». Касок не осталось.' });
  loc({ id: 'cage', name: 'Клеть подъёмника', icon: 'warehouse', deck: { e: 1, w: 1, i: 1, c: 1, a: 0, r: 1, v: 2 },
    close: { skills: ['tech'], dc: 9 }, noise: 5, mods: { eventDc: 1 },
    flavor: 'Трос стонет. До дна — двести метров.' });
  loc({ id: 'drift', name: 'Штрек №3', icon: 'road', deck: { e: 4, w: 2, i: 1, c: 1, a: 0, r: 0, v: 1 },
    close: { skills: ['dex', 'survival'], dc: 9 }, noise: 5, mods: { enemyDc: 1 },
    flavor: 'Узкий, низкий, бесконечный. Шаги отдаются со всех сторон.' });
  loc({ id: 'pumproom', name: 'Насосная', icon: 'waves', deck: { e: 2, w: 0, i: 3, c: 1, a: 0, r: 1, v: 1 },
    close: { skills: ['tech', 'end'], dc: 9 }, noise: 6, mods: { acquireDc: { item: -1 } },
    flavor: 'Вода по колено. Насосы молчат.' });
  loc({ id: 'shelterroom', name: 'Убежище горноспасателей', icon: 'medkit', deck: { e: 2, w: 0, i: 1, c: 3, a: 2, r: 1, v: 0 },
    close: { skills: ['wit', 'will'], dc: 8 }, noise: 6, mods: { acquireDc: { consumable: -1 } },
    flavor: 'Запас воздуха на 72 часа. Отсчёт идёт с понедельника.' });
  loc({ id: 'deepface', name: 'Забой', icon: 'hammer', deck: { e: 4, w: 1, i: 1, c: 1, a: 0, r: 1, v: 1 },
    close: { skills: ['str', 'tech'], dc: 10 }, noise: 4, mods: { enemyDc: 1 },
    flavor: 'Здесь нашли то, что не стоило находить.' });

  /* ---------- Миссия 8: Лагерь «Сосновый ручей» ---------- */
  loc({ id: 'campfire', name: 'Кострище', icon: 'fire', deck: { e: 3, w: 1, i: 1, c: 2, a: 1, r: 1, v: 0 },
    close: { skills: ['survival', 'str'], dc: 8 }, noise: 6, mods: {},
    flavor: 'Угли ещё тёплые. Кто-то был здесь вчера.' });
  loc({ id: 'cabins', name: 'Домики вожатых', icon: 'building', deck: { e: 3, w: 1, i: 2, c: 1, a: 1, r: 1, v: 0 },
    close: { skills: ['tech', 'dex'], dc: 8 }, noise: 6, mods: {},
    flavor: 'Расписание на двери: «Ночная игра. 21:00».' });
  loc({ id: 'lake', name: 'Озеро', icon: 'waves', deck: { e: 3, w: 1, i: 1, c: 1, a: 1, r: 2, v: 0 },
    close: { skills: ['survival', 'end'], dc: 9 }, noise: 7, mods: {},
    flavor: 'Байдарки перевёрнуты. Что-то движется под водой.' });
  loc({ id: 'ranger', name: 'Пост лесничего', icon: 'binoculars', deck: { e: 3, w: 2, i: 1, c: 1, a: 1, r: 0, v: 1 },
    close: { skills: ['tech', 'survival'], dc: 9 }, noise: 6, mods: { acquireDc: { weapon: -1 } },
    flavor: 'Капканы, ружья, и записка: «Они идут стаей».' });
  loc({ id: 'ravine', name: 'Овраг', icon: 'trees', deck: { e: 4, w: 1, i: 0, c: 1, a: 0, r: 1, v: 2 },
    close: { skills: ['survival', 'dex'], dc: 10 }, noise: 5, mods: { enemyDc: 1, eventDc: 1 },
    flavor: 'Кости. Много костей.' });
  loc({ id: 'den', name: 'Логово', icon: 'paw', deck: { e: 5, w: 0, i: 1, c: 1, a: 0, r: 1, v: 1 },
    close: { skills: ['str', 'survival'], dc: 10 }, noise: 5, mods: { enemyDc: 1 },
    flavor: 'Пахнет мокрой шерстью и смертью.' });

  /* ---------- Миссия 9: Школа Ривертона ---------- */
  loc({ id: 'busyard', name: 'Автобусный парк', icon: 'truck', deck: { e: 3, w: 1, i: 2, c: 1, a: 1, r: 0, v: 1 },
    close: { skills: ['tech', 'str'], dc: 9 }, noise: 6, mods: {},
    flavor: 'Жёлтый автобус №12. Ключ в замке. Бак пуст.' });
  loc({ id: 'gym', name: 'Спортзал', icon: 'building', deck: { e: 4, w: 2, i: 1, c: 1, a: 0, r: 1, v: 0 },
    close: { skills: ['persuasion', 'end'], dc: 9 }, noise: 5, mods: { enemyDc: 1 },
    flavor: 'Здесь был пункт эвакуации. Здесь он и остался.' });
  loc({ id: 'cafeteria', name: 'Столовая', icon: 'coffee', deck: { e: 3, w: 0, i: 1, c: 3, a: 1, r: 1, v: 0 },
    close: { skills: ['str', 'tech'], dc: 8 }, noise: 6, mods: { acquireDc: { consumable: -1 } },
    flavor: 'Подносы, лужи, детские рюкзаки.' });
  loc({ id: 'chemlab', name: 'Кабинет химии', icon: 'vial', deck: { e: 3, w: 1, i: 2, c: 2, a: 0, r: 0, v: 1 },
    close: { skills: ['tech', 'wit'], dc: 9 }, noise: 6, mods: { acquireDc: { item: -1 } },
    flavor: 'Таблица Менделеева в брызгах. Вытяжка ещё работает.' });
  loc({ id: 'library', name: 'Библиотека', icon: 'book', deck: { e: 3, w: 0, i: 1, c: 1, a: 2, r: 2, v: 0 },
    close: { skills: ['wit', 'stealth'], dc: 8 }, noise: 7, mods: {},
    flavor: '«Соблюдайте тишину». Наконец-то все соблюдают.' });
  loc({ id: 'boilerroom', name: 'Подвал', icon: 'factory', deck: { e: 4, w: 1, i: 1, c: 1, a: 0, r: 1, v: 1 },
    close: { skills: ['tech', 'end'], dc: 10 }, noise: 5, mods: { enemyDc: 1 },
    flavor: 'Сторож прятал здесь бензин для газонокосилок.' });

  /* ---------- Миссия 10: Комплекс «Хейл Биомед» ---------- */
  loc({ id: 'lobbyhb', name: 'Вестибюль', icon: 'building', deck: { e: 4, w: 1, i: 1, c: 1, a: 1, r: 1, v: 0 },
    close: { skills: ['str', 'tech'], dc: 10 }, noise: 6, mods: {},
    flavor: 'Мраморный пол. Слоган на стене: «Мы лечим будущее».' });
  loc({ id: 'offices', name: 'Офисы', icon: 'building', deck: { e: 3, w: 1, i: 2, c: 1, a: 1, r: 1, v: 0 },
    close: { skills: ['wit', 'will'], dc: 9 }, noise: 6, mods: {},
    flavor: 'Шредеры забиты. Не успели.' });
  loc({ id: 'vivarium', name: 'Виварий', icon: 'paw', deck: { e: 5, w: 0, i: 1, c: 1, a: 0, r: 1, v: 1 },
    close: { skills: ['will', 'end'], dc: 10 }, noise: 5, mods: { enemyDc: 1 },
    flavor: 'Клетки открыты. Подопытными были не только мыши.' });
  loc({ id: 'cleanroom', name: 'Чистая зона', icon: 'biohazard', deck: { e: 3, w: 0, i: 2, c: 3, a: 0, r: 0, v: 1 },
    close: { skills: ['tech', 'medicine'], dc: 10 }, noise: 5, mods: { acquireDc: { consumable: -1 }, eventDc: 1 },
    flavor: 'Белые стены. Красные отпечатки ладоней.' });
  loc({ id: 'server', name: 'Серверная', icon: 'bolt', deck: { e: 3, w: 1, i: 2, c: 1, a: 1, r: 1, v: 0 },
    close: { skills: ['tech', 'wit'], dc: 10 }, noise: 6, mods: { acquireDc: { item: -1 } },
    flavor: 'Где-то здесь — формула. И приказ об утилизации свидетелей.' });
  loc({ id: 'sublevel', name: 'Подуровень Ноль', icon: 'skull', deck: { e: 4, w: 1, i: 1, c: 1, a: 0, r: 2, v: 0 },
    close: { skills: ['str', 'end', 'tech'], dc: 11 }, noise: 4, mods: { enemyDc: 1 },
    flavor: 'Ангар экзоскелетов. Пять стоек пусты. Одна — ещё тёплая.' });


  /* Награда «Когда заколочено»: time — +карты Часов, healHere — лечение героев на локации,
   * gain — закрывший берёт случайную карту, quiet — шум всех локаций −N, cureHere — изгнать Инфекции,
   * condsHere — снять состояния героев на локации */
  const ON_CLOSE = {
    lobby: [{ time: 1 }], wards: [{ healHere: 3 }], morgue: [{ gain: 'weapon' }], pharmacy: [{ cureHere: 1 }], boiler: [{ quiet: 2 }], ambulance: [{ gain: 'ally' }],
    salesfloor: [{ gain: 'consumable' }], storage: [{ gain: 'item' }], butchery: [{ gain: 'weapon' }], security: [{ time: 1 }], loading: [{ gain: 'ally' }], parking: [{ quiet: 2 }],
    hillfoot: [{ healHere: 2 }], rangerhut: [{ gain: 'weapon' }], generator: [{ time: 1 }], trail: [{ quiet: 2 }], transformer: [{ gain: 'item' }], mastbase: [{ condsHere: true }, { healHere: 2 }],
    gasstation: [{ gain: 'consumable' }], junkyard: [{ gain: 'item' }], gangcamp: [{ gain: 'ally' }], motel: [{ healHere: 3 }], highway: [{ time: 1 }], diner: [{ condsHere: true }, { healHere: 1 }],
    checkpoint: [{ gain: 'weapon' }], jam: [{ time: 1 }], pylons: [{ quiet: 3 }], fieldhospital: [{ cureHere: 1 }, { healHere: 2 }], embankment: [{ gain: 'resolve' }], evac: [{ time: 2 }],
    gate: [{ gain: 'weapon' }], tents: [{ healHere: 2 }], lab: [{ cureHere: 2 }], armory: [{ gain: 'weapon' }], isolation: [{ quiet: 2 }], helipad: [{ time: 1 }],
    shaftentry: [{ time: 1 }], cage: [{ gain: 'item' }], drift: [{ quiet: 2 }], pumproom: [{ gain: 'technique' }], shelterroom: [{ healHere: 3 }, { condsHere: true }], deepface: [{ gain: 'weapon' }],
    campfire: [{ healHere: 2 }], cabins: [{ gain: 'ally' }], lake: [{ quiet: 2 }], ranger: [{ gain: 'weapon' }], ravine: [{ time: 1 }], den: [{ condsHere: true }],
    busyard: [{ time: 1 }], gym: [{ gain: 'technique' }], cafeteria: [{ healHere: 2 }], chemlab: [{ gain: 'consumable' }], library: [{ gain: 'resolve' }], boilerroom: [{ quiet: 2 }],
    lobbyhb: [{ time: 1 }], offices: [{ gain: 'item' }], vivarium: [{ quiet: 2 }], cleanroom: [{ cureHere: 2 }], server: [{ time: 1 }], sublevel: [{ gain: 'weapon' }],
  };
  Object.keys(ON_CLOSE).forEach((id) => { if (L[id]) L[id].onClose = ON_CLOSE[id]; });


  /* Особые правила локаций:
   * closeFail[fx] — штраф за провал баррикады; closeTwice — нужны 2 успешные проверки; closeCost — для попытки сбросьте карту типа;
   * undeadDc/livingDc — сложность мертвецов/людей; enemyDmgType — тип урона врагов здесь; exploreNoise — шум за исследование;
   * nightExtra — ночью первое исследование здесь даёт +1 исследование; hordeTop — орда кладётся наверх колоды;
   * findsStay — проваленная находка уходит под низ колоды, а не теряется; firearmNoise — доп. шум огнестрела;
   * stealthBonus — бонус к уклонению и Скрытности; noGive — нельзя передавать карты;
   * endTurn{skills,dc,fail} — проверка героя здесь в конце хода; enterCheck{skills,dc,fail} — проверка при входе. */
  const RULES = {
    lobby: { exploreNoise: 1 },
    wards: { nightExtra: true },
    morgue: { enemyDmgType: 'cold' },
    pharmacy: { findsStay: true, closeFail: [{ damage: 1 }] },
    boiler: { enemyDmgType: 'fire', stealthBonus: 2 },
    ambulance: { closeCost: 'item' },
    salesfloor: { hordeTop: true },
    storage: { closeTwice: true },
    butchery: { endTurn: { skills: ['end', 'survival'], dc: 5, fail: [{ cond: 'poison' }] } },
    security: { closeFail: [{ noise: 3 }] },
    parking: { enterCheck: { skills: ['stealth', 'dex'], dc: 5, fail: [{ damage: 1 }] } },
    generator: { enemyDmgType: 'electric', closeFail: [{ damage: 2, dmgType: 'electric' }] },
    transformer: { enemyDmgType: 'electric', endTurn: { skills: ['tech', 'dex'], dc: 6, fail: [{ damage: 1, dmgType: 'electric' }] } },
    trail: { stealthBonus: 2, nightExtra: true },
    mastbase: { closeTwice: true },
    gasstation: { firearmNoise: 2, closeFail: [{ damage: 2, dmgType: 'fire' }, { noise: 2 }] },
    gangcamp: { livingDc: 2, noGive: true },
    junkyard: { findsStay: true },
    motel: { endTurn: { skills: ['will'], dc: 5, fail: [{ cond: 'terror' }] } },
    highway: { enterCheck: { name: 'Плата за проезд', skills: ['stealth'], dc: 6, fail: [{ toll: 1 }] } },
    diner: { enterCheck: { name: 'Плата за проезд', skills: ['stealth'], dc: 6, fail: [{ toll: 1 }] } },
    pylons: { closeCost: 'item', closeFail: [{ damage: 'd4', dmgType: 'fire' }] },
    embankment: { enemyDmgType: 'cold', enterCheck: { skills: ['end', 'survival'], dc: 5, fail: [{ cond: 'numb' }] } },
    jam: { hordeTop: true },
    evac: { closeTwice: true },
    lab: { enemyDmgType: 'acid', endTurn: { skills: ['end', 'medicine'], dc: 6, fail: [{ cond: 'poison' }] } },
    isolation: { undeadDc: 2, closeFail: [{ summon: true }] },
    armory: { findsStay: true, livingDc: 1 },
    gate: { enterCheck: { skills: ['stealth', 'persuasion'], dc: 6, fail: [{ damage: 1 }, { noise: 2 }] } },
    cage: { closeTwice: true, closeFail: [{ damage: 2 }] },
    drift: { exploreNoise: 1, hordeTop: true },
    pumproom: { enemyDmgType: 'cold', enterCheck: { skills: ['end', 'str'], dc: 6, fail: [{ cond: 'numb' }] } },
    deepface: { enemyDmgType: 'fire', firearmNoise: 2 },
    lake: { enemyDmgType: 'cold' },
    ravine: { enterCheck: { skills: ['dex', 'survival'], dc: 6, fail: [{ damage: 'd4' }] } },
    den: { undeadDc: 1, closeCost: 'resolve' },
    ranger: { findsStay: true },
    gym: { hordeTop: true, exploreNoise: 1 },
    chemlab: { enemyDmgType: 'acid', closeFail: [{ damage: 1, dmgType: 'acid' }, { cond: 'vuln' }] },
    library: { stealthBonus: 2, firearmNoise: 2 },
    boilerroom: { closeCost: 'item' },
    cleanroom: { enemyDmgType: 'acid', endTurn: { skills: ['end', 'medicine'], dc: 6, fail: [{ cond: 'decay' }] } },
    server: { enemyDmgType: 'electric', closeTwice: true },
    vivarium: { hordeTop: true, undeadDc: 1 },
    sublevel: { endTurn: { skills: ['will'], dc: 7, fail: [{ cond: 'doom' }] }, closeFail: [{ summon: true }] },
    lobbyhb: { enterCheck: { skills: ['stealth', 'wit'], dc: 7, fail: [{ noise: 3 }] } },
  };
  Object.keys(RULES).forEach((id) => { if (L[id]) L[id].rules = RULES[id]; });

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
      rule: 'Помехи: порог орды во всех локациях на 1 ниже. Эхо идёт на крик: когда в локации собирается орда, одно Эхо из другой открытой локации переходит туда.',
      special: { noiseLimitMod: -1, henchToHorde: true },
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
      rule: 'Засада: в каждой локации прячется лишний Мародёр. Набег: каждые 4 хода банда грабит самую шумную открытую локацию. Каждый герой там теряет случайную карту из руки (захоронена до конца миссии). Затем банда с 3 жетонами вскрывает колоду: первая карта бесплатно, каждая следующая — жетон. Находки, препятствия и чужих людей уносят; мертвеца убивают за жетон (шум +1); Мародёры и байкеры уходят с бандой (+1 жетон). Угроза, вожак или нехватка жетонов останавливают набег, колода перемешивается.',
      special: { extraEnemy: 'looter', raidEvery: 4, raidTokens: 3 },
      boss: 'kane', henchman: 'thug',
      locations: ['gasstation', 'highway', 'gangcamp', 'junkyard', 'diner', 'motel'],
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
      rule: 'Время на исходе: Часы короче на 2 хода. Орда приводит 3 мертвецов вместо 2. Сапёры помогают: заколотить любую локацию на 2 легче.',
      special: { clockMod: -2, hordeSize: 3, closeDcMod: -2, closeDcLabel: 'Сапёры помогают' },
      boss: 'colossus', henchman: 'veteran',
      locations: ['checkpoint', 'jam', 'pylons', 'fieldhospital', 'embankment', 'evac'],
      clockEvents: ['siren', 'siren', 'howl', 'howl', 'hunger', 'dawn', 'broadcast'],
      reward: null,
      outro: 'Колосс рушится в реку. Вы бежите по мосту, и за спиной поднимается огненная стена. Вертолёт… не ждёт. Он улетает без вас. Первые дни закончились. На другом берегу — карантинный лагерь Форт-Ривер. Начинается Акт II.',
    },

    {
      id: 'm6', num: 6, act: 2, name: 'Фильтр', icon: 'biohazard', tier: 3,
      place: 'Карантинный лагерь Форт-Ривер',
      intro: [
        'Другой берег. Колючая проволока, прожекторы, громкоговоритель: «Всем выжившим — пройти фильтрацию».',
        'Фильтрация оказалась простой: кого укусили — в изолятор. Кого не укусили — в изолятор «на наблюдение».',
        'Полковник Ридж знает, что такое «Хейл Биомед». И он не собирается никого выпускать.',
      ],
      goal: 'Одолейте Полковника Риджа. Его солдаты — люди: не боятся ночи, строже к заражённым и задерживают тех, кто не подчинился.',
      rule: 'Заражённый воздух: в начале каждой ночи каждый герой проходит проверку Выдержки или Выживания 6, при провале — Инфекция. В каждой локации прячется лишний солдат. Обход: каждые 3 хода один Санитарный патруль переходит в самую шумную открытую локацию.',
      special: { nightInfect: { skills: ['end', 'survival'], dc: 6 }, extraEnemy: 'soldier', clockMod: 2, henchPatrol: 3 },
      boss: 'ridge', henchman: 'patrol',
      locations: ['gate', 'tents', 'lab', 'armory', 'isolation', 'helipad'],
      clockEvents: ['siren', 'howl', 'hunger', 'broadcast', 'dawn', 'fog', 'siren'],
      reward: { card: 'assaultrifle', text: 'Трофей: Винтовка полковника' },
      outro: 'В сейфе Риджа — карта с пометками. Красным обведена шахта Блэкстоун: «Партия 7-Б. Склад». Если там сыворотка — там и ответ.',
    },
    {
      id: 'm7', num: 7, act: 2, name: 'Глубина', icon: 'hammer', tier: 3,
      place: 'Шахта Блэкстоун',
      intro: [
        'Шахту закрыли в восемьдесят девятом. «Хейл Биомед» арендовала её в двадцать третьем — «для хранения образцов».',
        'Под землёй не бывает дня. Только фонари, эхо и шаги, которые не совпадают с вашими.',
        'В самом глубоком забое что-то растёт. Сыворотка смешалась с подземной плесенью — и проросла сквозь мертвецов. Шахтёры зовут её Матерью-Грибницей.',
      ],
      goal: 'Найдите и выжгите Мать-Грибницу в вечной темноте шахты. Огонь — её слабость.',
      rule: 'Вечная ночь: под землёй всегда ночь — мертвецы сильнее, искать проще, фонари и молитвы работают в полную силу. Эхо: порог орды на 1 ниже.',
      special: { forceNight: true, noiseLimitMod: -1, clockMod: 2 },
      boss: 'holt', henchman: 'foreman',
      locations: ['shaftentry', 'cage', 'drift', 'pumproom', 'shelterroom', 'deepface'],
      clockEvents: ['siren', 'howl', 'howl', 'hunger', 'dawn', 'broadcast', 'rain'],
      reward: { card: 'minerlamp', text: 'Трофей: Лампа горноспасателя' },
      outro: 'Ящики с сывороткой пусты. Накладная: «Отправлено в лагерь «Сосновый ручей» — полевые испытания». Детский лагерь.',
    },
    {
      id: 'm8', num: 8, act: 2, name: 'Стая', icon: 'paw', tier: 3,
      place: 'Детский лагерь «Сосновый ручей»',
      intro: [
        'Лагерь пуст уже месяц. Но не мёртв.',
        'Здесь испытывали сыворотку на животных. Волков из питомника выпустил сам лесничий, Кроули, — и сам заразился. Теперь он ведёт стаю.',
        'Он не ждёт вас в одном месте. Он охотится.',
      ],
      goal: 'Выследите и убейте Егеря Кроули. Он минирует лес капканами каждые 3 хода — чем дольше охота, тем опаснее тропы.',
      rule: 'Капканы: каждые 3 хода Егерь ставит «Медвежий капкан» в случайную открытую локацию. Наткнувшись на него, пройдите проверку Ловкость / Выживание 7: успех — капкан ваш, провал — 1d4 урона и Онемение. Орда приводит 3 мертвецов.',
      special: { trapEvery: 3, trapCard: 'beartrap', hordeSize: 3 },
      boss: 'alpha', henchman: 'packwolf',
      locations: ['campfire', 'cabins', 'lake', 'ranger', 'ravine', 'den'],
      clockEvents: ['howl', 'howl', 'siren', 'hunger', 'dawn', 'fog', 'rain'],
      reward: { card: 'alphafang', text: 'Трофей: Свисток егеря' },
      outro: 'В журнале вожатых — последняя запись: «Детей увезли автобусом в школу Ривертона. Автобус не вернулся». Дети могут быть живы.',
    },
    {
      id: 'm9', num: 9, act: 2, name: 'Последний автобус', icon: 'truck', tier: 3,
      place: 'Средняя школа Ривертона',
      intro: [
        'Автобус №12 стоит у школы. Внутри — следы детских ладоней на запотевших окнах. Изнутри.',
        'Двенадцать детей заперлись в кабинете музыки. Живые. Голодные. Ждут.',
        'Чтобы увезти их, нужно топливо. А директор Брэдшоу всё ещё звонит в звонок на перемену.',
      ],
      goal: 'Соберите 3 канистры топлива и уничтожьте Директора Брэдшоу. Без топлива победа над Угрозой не закончит миссию.',
      rule: 'Топливо: в локациях спрятаны 4 канистры (проверка Силы, Выживания или Техники 5; при провале канистра остаётся в колоде). Нужно 3.',
      special: { objective: { card: 'fuelcan', count: 4, need: 3, label: 'Топливо' }, clockMod: 2 },
      boss: 'principal', henchman: 'hallmonitor',
      locations: ['busyard', 'gym', 'cafeteria', 'chemlab', 'library', 'boilerroom'],
      clockEvents: ['siren', 'siren', 'howl', 'hunger', 'broadcast', 'dawn', 'fog'],
      reward: { card: 'busdriver', text: 'Новый союзник: Водитель Глория' },
      outro: 'Автобус ревёт, дети поют что-то фальшиво и громко. Глория ведёт машину туда, откуда всё началось: штаб-квартира «Хейл Биомед». Пора закончить это.',
    },
    {
      id: 'm10', num: 10, act: 2, name: 'Источник', icon: 'biohazard', tier: 3,
      place: 'Комплекс «Хейл Биомед»',
      intro: [
        'Стеклянная башня на холме над Холлоу-Криком. Здесь всё и началось.',
        'Корпорация включила протокол зачистки. Здание охраняет «Чистильщик» — боевой экзоскелет, внутри которого давно мёртвый оператор.',
        'Протокол не знает усталости и не знает пощады. Второго шанса может не быть.',
      ],
      goal: 'Уничтожьте Чистильщика: две победы подряд. Пропуска побеждённой Охраны облегчают вторую проверку. Огонь его не берёт, электричество — да.',
      rule: 'Орда приводит 3 мертвецов. В каждой локации — лишний Харкун. Схемы здания с пропуска Хейла: заколотить любую локацию на 2 легче.',
      special: { extraEnemy: 'spitter', hordeSize: 3, clockMod: 6, closeDcMod: -2, closeDcLabel: 'Схемы здания' },
      boss: 'patientzero', henchman: 'guardz',
      locations: ['lobbyhb', 'offices', 'vivarium', 'cleanroom', 'server', 'sublevel'],
      clockEvents: ['siren', 'siren', 'howl', 'howl', 'hunger', 'dawn', 'broadcast'],
      reward: null,
      outro: 'Экзоскелет падает, гидравлика шипит и затихает. В серверной вы находите формулу — не лекарство, но начало. Над Холлоу-Криком встаёт солнце. Впервые за много дней вы смотрите на него без страха. Кампания завершена.',
    },
  ];
})();
