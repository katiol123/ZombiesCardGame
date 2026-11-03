/* =====================================================================
 *  МАНИФЕСТ ГРАФИКИ
 *  Сейчас все карты используют векторные иконки-заглушки.
 *  Чтобы поставить свою картинку:
 *   1. Положите файл в assets/cards/, assets/heroes/ или assets/locations/
 *      (подойдут .png .jpg .webp; рекомендуемые пропорции: карты 4:3, герои 1:1, локации 16:9).
 *   2. Впишите путь ниже по id карты/героя/локации (id смотрите в js/data/*.js).
 *  Пример:
 *    cards:     { shambler: 'assets/cards/shambler.webp' },
 *    heroes:    { marina: 'assets/heroes/marina.png' },
 *    locations: { lobby: 'assets/locations/lobby.jpg' },
 *    missions:  { m1: 'assets/locations/hospital.jpg' },
 * ===================================================================== */
window.ZG_ART = {
  cards: {},
  heroes: {},
  locations: {},
  missions: {},
};
