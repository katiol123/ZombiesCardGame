/* Сохранения: 3 слота в localStorage, экспорт/импорт JSON, настройки */
(function () {
  'use strict';
  const ZG = window.ZG;
  const KEY = 'zg_last_stand_slot_';
  const SET = 'zg_last_stand_settings';
  const VERSION = 1;

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } },
  };

  ZG.Save = {
    SLOTS: 3,
    current: null, // текущий объект сохранения
    slot: 0,

    read(slot) {
      const raw = store.get(KEY + slot);
      if (!raw) return null;
      try {
        const s = JSON.parse(raw);
        return s && s.v ? s : null;
      } catch (e) { return null; }
    },
    write(slot, data) {
      data.updated = Date.now();
      data.rng = ZG.rng.state;
      return store.set(KEY + slot, JSON.stringify(data));
    },
    remove(slot) { store.del(KEY + slot); },
    persist() {
      if (this.current) this.write(this.slot, this.current);
    },
    load(slot) {
      const s = this.read(slot);
      if (!s) return null;
      this.current = s;
      this.slot = slot;
      if (s.rng && !ZG.params.get('seed')) ZG.rng.seed(s.rng);
      store.set(KEY + 'last', String(slot));
      return s;
    },
    lastSlot() {
      const v = parseInt(store.get(KEY + 'last'), 10);
      return Number.isFinite(v) && this.read(v) ? v : null;
    },
    firstFree() {
      for (let i = 0; i < this.SLOTS; i++) if (!this.read(i)) return i;
      return null;
    },

    newCampaign(slot, heroIds, difficulty) {
      const party = heroIds.map((id) => ({
        id,
        feats: { attr: {}, hand: 0, slots: {} },
        scars: [],
        deck: ZG.HEROES[id].start.slice(),
        featsPending: 0,
      }));
      const vault = [];
      party.forEach((h) => vault.push(...h.deck));
      const data = {
        v: VERSION,
        created: Date.now(),
        updated: Date.now(),
        difficulty: difficulty || 'normal',
        campaign: { progress: 0, done: [false, false, false, false, false], party, vault, tips: {}, stats: { kills: 0, finds: 0, deaths: 0 } },
        mission: null,
        screen: 'map',
      };
      this.current = data;
      this.slot = slot;
      store.set(KEY + 'last', String(slot));
      this.persist();
      return data;
    },

    exportSlot(slot) {
      const s = this.read(slot);
      if (!s) return;
      const blob = new Blob([JSON.stringify(s, null, 1)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `last-stand-slot${slot + 1}.json`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    },
    importInto(slot, text) {
      try {
        const s = JSON.parse(text);
        if (!s || !s.v || !s.campaign || !Array.isArray(s.campaign.party)) return false;
        return this.write(slot, s);
      } catch (e) { return false; }
    },
    summary(s) {
      if (!s) return null;
      const names = s.campaign.party.map((h) => ZG.HEROES[h.id].name.split(' ')[0]).join(', ');
      const m = ZG.MISSIONS[Math.min(s.campaign.progress, 4)];
      const done = s.campaign.done.filter(Boolean).length;
      return { names, mission: done >= 5 ? 'Кампания пройдена' : `Миссия ${m.num}: ${m.name}`, done, date: new Date(s.updated).toLocaleString('ru-RU'), inMission: !!s.mission };
    },
  };

  ZG.Settings = {
    data: { speed: 'normal', fx: true, tips: true },
    load() {
      try { Object.assign(this.data, JSON.parse(store.get(SET) || '{}')); } catch (e) { /* ignore */ }
      this.apply();
    },
    save() { store.set(SET, JSON.stringify(this.data)); this.apply(); },
    apply() {
      if (!ZG.params.get('fast')) ZG.speed = this.data.speed === 'fast' ? 0.45 : 1;
      document.documentElement.classList.toggle('no-fx', !this.data.fx);
    },
  };
})();
