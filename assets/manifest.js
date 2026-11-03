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
  cards: {
    biker: 'assets/cards/biker.webp',
    blindminer: 'assets/cards/blindminer.webp',
    bloater: 'assets/cards/bloater.webp',
    brute: 'assets/cards/brute.webp',
    crawler: 'assets/cards/crawler.webp',
    deadcop: 'assets/cards/deadcop.webp',
    deaddog: 'assets/cards/deaddog.webp',
    hazmat: 'assets/cards/hazmat.webp',
    looter: 'assets/cards/looter.webp',
    mutant: 'assets/cards/mutant.webp',
    patient: 'assets/cards/patient.webp',
    raider: 'assets/cards/raider.webp',
    runner: 'assets/cards/runner.webp',
    screamer: 'assets/cards/screamer.webp',
    shambler: 'assets/cards/shambler.webp',
    soldier: 'assets/cards/soldier.webp',
    soldierz: 'assets/cards/soldierz.webp',
    spitter: 'assets/cards/spitter.webp',
    stalker: 'assets/cards/stalker.webp',
    swarm: 'assets/cards/swarm.webp',
    thug: 'assets/cards/thug.webp',
    wolfz: 'assets/cards/wolfz.webp',
  },
  heroes: {},
  locations: {},
  missions: {},
};
