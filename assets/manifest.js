/* =====================================================================
 *  МАНИФЕСТ ГРАФИКИ
 *  Сейчас все карты используют векторные иконки-заглушки.
 *  Чтобы поставить свою картинку:
 *   1. Положите файл в assets/cards/, assets/heroes/, assets/locations/ или assets/missions/
 *      (подойдут .png .jpg .webp; пропорции: карты 2:1 (800×400), герои 1:1 (512×512),
 *      локации 2:1 (800×400), миссии 1:1 (256×256)). Полный список имён — assets/ART_LIST.md
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
