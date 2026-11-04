/* Автогенерация текстов правил карт и локаций из их механики */
(function () {
  'use strict';
  const ZG = window.ZG;
  const T = ZG.T;

  const VERB = { reveal: 'Покажите', discard: 'Сбросьте', recharge: 'Перезарядите', banish: 'Изгоните', burn: 'Сожгите', technique: 'Примените', display: 'Выложите', bury: 'Захороните' };
  const KIND = {
    combat: 'боевой проверки',
    acquire: 'проверки поиска',
    event: 'проверки препятствия',
    close: 'попытки заколотить',
    evade: 'уклонения',
  };
  const TYPE_GEN = { weapon: 'Оружие', item: 'Снаряжение', consumable: 'Расходник', ally: 'Союзника', resolve: 'Решимость', technique: 'Приём' };

  const skillsList = (arr) => arr.map(ZG.skillName).join(' / ');

  function kindText(k) {
    if (!k || k === 'any') return 'любой проверки';
    if (k === 'noncombat') return 'небоевой проверки';
    if (k.length === 1) return KIND[k[0]];
    return k.map((x) => KIND[x]).join(' или ');
  }

  function bonusText(p) {
    const parts = [];
    if (p.dice && p.dice.length) parts.push('+' + ZG.diceStr(p.dice, p.bonus));
    else if (p.bonus) parts.push((p.bonus > 0 ? '+' : '−') + Math.abs(p.bonus));
    if (p.skillDie) parts.push(`+${p.skillDie} ${ZG.plural(p.skillDie, 'кубик', 'кубика', 'кубиков')} навыка`);
    let s = parts.join(', ');
    if (p.nightDice) s += ` (ночью +${ZG.diceStr(p.nightDice)})`;
    if (p.nightSkillDie) s += ` (ночью +${p.nightSkillDie})`;
    return s;
  }

  function healText(h) {
    if (!h.dice || !h.dice.length) return `${h.bonus} ${ZG.plural(h.bonus, 'карту', 'карты', 'карт')}`;
    return `${ZG.diceStr(h.dice, h.bonus)} карт`;
  }

  const TYPE_SRCH = { weapon: 'оружия', item: 'снаряжения', consumable: 'расходника', ally: 'союзника', resolve: 'Решимости', technique: 'приёма' };
  ZG.playText = function (p) {
    if (p.text) return p.text; // особая формулировка
    const v = VERB[p.mode];
    const tgt = p.target === 'here' ? 'герой на вашей локации' : 'вы';
    if (p.on === 'check') {
      let s = `${v} для ${p.cardTypes ? 'проверки поиска ' + p.cardTypes.map((t) => TYPE_SRCH[t] || t).join(' или ') : kindText(p.kind)}`;
      if (p.weapon) s += ` (${skillsList(p.weapon)})`;
      if (p.skills && !p.weapon) s += ` навыком ${skillsList(p.skills)}`;
      if (p.trait) s += ` с оружием «${p.trait}»`;
      if (p.night) s += ' ночью';
      s += ':';
      const b = bonusText(p);
      if (b) s += ' ' + b;
      if (p.noiseMod) s += (b ? ', шум ' : ' шум ') + `${p.noiseMod > 0 ? '+' : '−'}${Math.abs(p.noiseMod)}`;
      s += '.';
      if (p.noise && p.noiseOthers) s += ` Шум +${p.noise} в этой локации и +${p.noiseOthers} в остальных.`;
      else if (p.noise) s += ` Шум +${p.noise}.`;
      if (p.gainCard) s = s.replace(/\.$/, '') + ` и возьмите в руку карту «${ZG.card(p.gainCard).name}».`;
      if (p.ignoreArmor) s += ' Игнорирует броню врага.';
      if (p.rechargeOnSuccess) s += ` При успехе перезарядите вместо ${p.mode === 'bury' ? 'захоронения' : 'сброса'}.`;
      if (p.burnOnFail) s += ' При провале проверки сожгите.';
      if (p.rechargeCheck) s += ` После проверки — ${skillsList(p.rechargeCheck.skills)} ${p.rechargeCheck.dc}: успех — перезарядите вместо сброса.`;
      if (p.oneToFive) s += ` С навыком «${ZG.skillName(p.oneToFive)}» единица на этом кубике считается за 5.`;
      if (p.help) s += ' Можно сыграть в проверку соседа по локации.';
      return s;
    }
    if (p.on === 'damage') {
      return `${v}, получая урон${p.combatOnly ? ' в бою' : ''}${p.onlyType ? ' (' + p.onlyType.map((t) => ZG.DMG_TYPES[t]).join(', ') + ')' : ''}: ${p.reduce === 'all' ? 'заблокируйте весь урон' : `заблокируйте ${p.reduce} урона`}.`;
    }
    if (p.on === 'evade') return `${v} при встрече с врагом (не Угрозой): уклонитесь от него.`;
    if (p.on === 'infect') return `${v}, получая Инфекцию: отмените её.`;
    if (p.on === 'action') {
      if (p.mode === 'display') return 'Выложите в свой ход перед собой (не больше 2 выложенных карт).';
      const fx = [];
      if (p.craft) fx.push(`смастерите базовое ${TYPE_GEN[p.craft] || p.craft} в руку`);
      if (p.clearConds) fx.push(`снимите все состояния ${p.target === 'self' ? 'с себя' : 'героя на вашей локации'}`);
      if (p.gain) fx.push(`найдите случайного ${TYPE_GEN[p.gain] || p.gain}`);
      if (p.clearCond) fx.push(`снимите «${ZG.CONDS[p.clearCond].name}»`);
      if (p.heal) fx.push(`${p.target === 'here' ? 'герой на вашей локации перетасовывает' : 'перетасуйте'} ${healText(p.heal)} из сброса в колоду`);
      if (p.cure) fx.push(`${tgt === 'вы' ? 'изгоните' : 'герой на вашей локации изгоняет'} ${p.cure === 'all' ? 'все Инфекции' : '1 Инфекцию'}`);
      if (p.explore) fx.push('исследуйте ещё раз');
      if (p.scout) fx.push('посмотрите верхнюю карту любой локации, можете положить её вниз');
      if (p.draw) fx.push(`возьмите ${p.draw === 1 && p.time ? 'карту из колоды' : `${p.draw} ${ZG.plural(p.draw, 'карту', 'карты', 'карт')}`}${p.putBack ? `, затем перезарядите ${p.putBack} из руки` : ''}`);
      if (p.lure) fx.push('перенесите весь шум вашей локации в другую открытую локацию');
      if (p.time) fx.push(`Часы +${p.time}`);
      return `${v} в свой ход: ${fx.join(', ')}.`;
    }
    return '';
  };

  ZG.cardRules = function (def) {
    const lines = [];
    if (def.text) lines.push(def.text);
    // у врагов без ручного текста свойства описываются автоматически
    if (ZG.isEnemy(def) && !def.text) {
      if (def.living) lines.push('Человек.');
      if (def.noiseOnEncounter) lines.push(`При встрече: шум локации +${def.noiseOnEncounter}.`);
      if (def.before && def.before.damage) lines.push(`До проверки: ${def.before.damage} урон.`);
      if (def.noEvade) lines.push('От него нельзя уклониться.');
      if (def.armor) lines.push(`Броня: проверки Силой и Рукопашной против него −${def.armor}.`);
      if (def.theft) lines.push(`Если вы не победили ${ZG.gf(def, 'его', 'её', 'его')}, ${ZG.gf(def, 'он', 'она', 'оно')} забирает случайную карту из руки.`);
    }
    if (ZG.isEnemy(def) && def.dmgType) lines.push(`Урон: ${ZG.DMG_TYPES[def.dmgType]}.`);
    if (ZG.isEnemy(def)) lines.push(`Провал: урон = ${def.halfDmg ? 'половина разницы, с округлением вниз' : 'разница'} (макс. ${ZG.Game.dmgCap(def)}${def.dmgAdd ? `, +${def.dmgAdd}` : ''})${def.bite ? '. Укус → Инфекция' : ''}${def.inflict ? (def.inflictCheck ? `. Рана → проверка ${skillsList(def.inflictCheck.skills)} ${def.inflictCheck.dc}, при провале — ${ZG.CONDS[def.inflict].name}` : `. Рана → ${ZG.CONDS[def.inflict].name}`) : ''}.`);
    if (def.plays && def.plays.length) def.plays.forEach((p) => lines.push(ZG.playText(p)));
    if (def.displayed) {
      const dd = def.displayed;
      const ef = [];
      if (dd.reduce) ef.push(`блок ${dd.reduce} урона${dd.combatOnly ? ' в бою' : ''} каждый раз`);
      if (dd.hand) ef.push(`размер руки +${dd.hand}`);
      if (dd.check) ef.push(`+${ZG.diceStr(dd.check.dice)} к ${kindText(dd.check.kind === 'noncombat' ? 'noncombat' : dd.check.kind)}${dd.check.night ? ' ночью' : ''}`);
      lines.push(`Пока выложена: ${ef.join(', ')}.`);
    }
    const tr = def.traits || [];
    if (tr.includes('Огнестрел') || tr.includes('Тяжёлое')) lines.push('Без владения: −4.');
    if (tr.includes('Тяжёлая броня')) lines.push('Без владения: сгорает после блока.');
    if (ZG.isEnemy(def)) {
      const tt = [];
      if (def.weak) Object.keys(def.weak).forEach((t) => tt.push(`уязвим: ${t} +${ZG.diceStr([def.weak[t]])}`));
      if (def.resist) Object.keys(def.resist).forEach((t) => tt.push(`стойкий: ${t} −${def.resist[t]}`));
      if (def.immune && def.immune.length) tt.push(`иммунитет: ${def.immune.join(', ')}`);
      if (tt.length) { const x = tt.join(' · '); lines.push(x[0].toUpperCase() + x.slice(1) + '.'); }
    }
    return lines;
  };

  ZG.cardCheckLine = function (def) {
    if (ZG.isEnemy(def)) return `${T('defeat')}: ${T('check_combat')} ${def.dc}${def.hits > 1 ? ' ×' + def.hits : ''}`;
    if (def.type === 'event') {
      if (def.check) return `${T('overcome')}: ${skillsList(def.check.skills)} ${def.check.dc}`;
      return 'Выбор';
    }
    if (def.acquire) return `${T('find')}: ${skillsList(def.acquire.skills)} ${def.acquire.dc}`;
    return '';
  };

  ZG.locationRules = function (ldef, mission) {
    const out = [];
    const m = ldef.mods || {};
    if (m.enemyDc) out.push(`Мертвецы и люди здесь +${m.enemyDc} к сложности.`);
    if (m.eventDc) out.push(`Препятствия здесь +${m.eventDc} к сложности.`);
    if (m.acquireDc) {
      Object.keys(m.acquireDc).forEach((t) => out.push(`Искать ${TYPE_GEN[t]} здесь проще (${m.acquireDc[t]}).`));
    }
    const r = ldef.rules || {};
    const fxs = (list) => (list || []).map((f) => {
      if (f.damage) return `${f.damage === 'd4' ? '1d4' : f.damage} урона${f.dmgType ? ' (' + ZG.DMG_TYPES[f.dmgType] + ')' : ''}`;
      if (f.noise) return `шум +${f.noise}`;
      if (f.cond) return `«${ZG.CONDS[f.cond].name}»`;
      if (f.summon) return 'приходит мертвец';
      if (f.clock) return `−${f.clock} Часы`;
      return '';
    }).filter(Boolean).join(', ');
    if (r.undeadDc) out.push(`Мертвецы здесь +${r.undeadDc}.`);
    if (r.livingDc) out.push(`Люди здесь +${r.livingDc}.`);
    if (r.enemyDmgType) out.push(`Враги здесь бьют: ${ZG.DMG_TYPES[r.enemyDmgType]}.`);
    if (r.exploreNoise) out.push(`Каждое исследование: шум +${r.exploreNoise}.`);
    if (r.nightExtra) out.push('Ночью первое исследование за ход даёт +1 исследование.');
    if (r.hordeTop) out.push('Орда кладётся на верх колоды.');
    if (r.findsStay) out.push('Проваленная находка не теряется — уходит под низ колоды.');
    if (r.firearmNoise) out.push(`Огнестрел здесь: шум +${r.firearmNoise}.`);
    if (r.stealthBonus) out.push(`Уклонение и Скрытность +${r.stealthBonus}.`);
    if (r.noGive) out.push('Здесь нельзя передавать карты.');
    if (r.enterCheck) out.push(`При входе: ${r.enterCheck.skills.map(ZG.skillName).join(' / ')} ${r.enterCheck.dc}, провал — ${fxs(r.enterCheck.fail)}.`);
    if (r.endTurn) out.push(`В конце хода здесь: ${r.endTurn.skills.map(ZG.skillName).join(' / ')} ${r.endTurn.dc}, провал — ${fxs(r.endTurn.fail)}.`);
    if (r.closeCost) out.push(`Чтобы заколотить, сбросьте ${TYPE_GEN[r.closeCost] || r.closeCost}.`);
    if (r.closeTwice) out.push('Заколотить: нужны 2 успешные проверки подряд.');
    if (r.closeFail) out.push(`Провал попытки заколотить: ${fxs(r.closeFail)}.`);
    return out;
  };

  ZG.closeRewardText = function (ldef) {
    const fx = ldef.onClose || [];
    const parts = [];
    fx.forEach((f) => {
      if (f.time) parts.push(`Часы +${f.time}`);
      if (f.healHere) parts.push(`герои здесь лечат ${f.healHere}`);
      if (f.cureHere) parts.push(`герои здесь изгоняют ${f.cureHere} Инфекц.`);
      if (f.condsHere) parts.push('снять состояния героев здесь');
      if (f.quiet) parts.push(`шум всех локаций −${f.quiet}`);
      if (f.gain) parts.push(`случайное ${TYPE_GEN[f.gain] || f.gain}`);
    });
    return parts.join(', ');
  };

  ZG.cardTypeLabel = function (def) {
    if (def.type === 'enemy' && def.living) return T('type_living');
    return T('type_' + def.type);
  };

  ZG.cardName = function (def) {
    const pack = ZG.STR[ZG.LANG] && ZG.STR[ZG.LANG].cards;
    return (pack && pack[def.id] && pack[def.id].name) || def.name;
  };
})();
