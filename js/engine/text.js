/* Автогенерация текстов правил карт и локаций из их механики */
(function () {
  'use strict';
  const ZG = window.ZG;
  const T = ZG.T;

  const VERB = { reveal: 'Покажите', discard: 'Сбросьте', recharge: 'Перезарядите', banish: 'Изгоните' };
  const KIND = {
    combat: 'боевой проверки',
    acquire: 'проверки поиска',
    event: 'проверки препятствия',
    close: 'проверки баррикады',
  };
  const TYPE_GEN = { weapon: 'Оружие', item: 'Снаряжение', consumable: 'Расходник', ally: 'Союзника', resolve: 'Решимость' };

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

  ZG.playText = function (p) {
    const v = VERB[p.mode];
    const tgt = p.target === 'here' ? 'герой на вашей локации' : 'вы';
    if (p.on === 'check') {
      let s = `${v} для ${kindText(p.kind)}`;
      if (p.weapon) s += ` (${skillsList(p.weapon)})`;
      if (p.skills && !p.weapon) s += ` навыком ${skillsList(p.skills)}`;
      if (p.trait) s += ` с оружием «${p.trait}»`;
      if (p.night) s += ' ночью';
      s += ':';
      const b = bonusText(p);
      if (b) s += ' ' + b;
      if (p.noiseMod) s += ` шум ${p.noiseMod > 0 ? '+' : '−'}${Math.abs(p.noiseMod)}`;
      s += '.';
      if (p.noise) s += ` Шум +${p.noise}.`;
      if (p.rechargeOnSuccess) s += ' При успехе перезарядите вместо сброса.';
      if (p.help) s += ' Можно сыграть в проверку соседа по локации.';
      return s;
    }
    if (p.on === 'damage') {
      return `${v}, получая урон: ${p.reduce === 'all' ? 'предотвратите весь урон' : `уменьшите урон на ${p.reduce}`}.`;
    }
    if (p.on === 'evade') return `${v} при встрече с врагом (не Угрозой): уклонитесь от него.`;
    if (p.on === 'infect') return `${v}, получая Инфекцию: отмените её.`;
    if (p.on === 'action') {
      const fx = [];
      if (p.heal) fx.push(`${p.target === 'here' ? 'герой на вашей локации перетасовывает' : 'перетасуйте'} ${healText(p.heal)} из сброса в колоду`);
      if (p.cure) fx.push(`${tgt === 'вы' ? 'изгоните' : 'герой на вашей локации изгоняет'} ${p.cure === 'all' ? 'все Инфекции' : '1 Инфекцию'}`);
      if (p.explore) fx.push('исследуйте ещё раз');
      if (p.scout) fx.push('посмотрите верхнюю карту любой локации, можете положить её вниз');
      if (p.draw) fx.push(`возьмите ${p.draw} ${ZG.plural(p.draw, 'карту', 'карты', 'карт')}${p.putBack ? `, затем перезарядите ${p.putBack} из руки` : ''}`);
      if (p.lure) fx.push('перенесите весь шум вашей локации в другую открытую локацию');
      return `${v} в свой ход: ${fx.join(', ')}.`;
    }
    return '';
  };

  ZG.cardRules = function (def) {
    const lines = [];
    if (def.text) lines.push(def.text);
    if (ZG.isEnemy(def)) lines.push(`Провал: урон = разница, но не больше ${ZG.Game.dmgCap(def)}${def.dmgAdd ? ` (+${def.dmgAdd})` : ''}${def.bite ? '. Укус: Инфекция, если урон прошёл' : ''}.`);
    if (def.plays && def.plays.length) def.plays.forEach((p) => lines.push(ZG.playText(p)));
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
    return out;
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
