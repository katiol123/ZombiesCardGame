/* Прототип 3D-кубиков с физикой для «Последнего рубежа».
 * three.js — отрисовка, cannon-es — физика.
 * Бросок сначала полностью просчитывается без показа (быстро), затем проигрывается как анимация.
 * Режимы:
 *   honest — результат = грань, которой кубик лёг вверх;
 *   forced — результат задан заранее (как сейчас решает игра); после просчёта цифры на гранях
 *            переставляются так, чтобы сверху оказалось нужное число. Сам полёт — настоящая физика.
 */
(function () {
  'use strict';
  const T = window.THREE, C = window.CANNON;

  /* ---------- Геометрия кубиков ---------- */
  const PHI = (1 + Math.sqrt(5)) / 2;
  function verts(type) {
    if (type === 'd4') return [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]];
    if (type === 'd6') { const v = []; for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) v.push([x, y, z]); return v; }
    if (type === 'd8') return [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
    if (type === 'd10') {
      // пятиугольный трапецоэдр: грани-«дельтоиды» плоские при a = h(1−cos36°)/(1+cos36°)
      const h = 1.05, c = Math.cos(Math.PI / 5), a = (h * (1 - c)) / (1 + c);
      const v = [[0, h, 0], [0, -h, 0]];
      for (let i = 0; i < 10; i++) { const ang = (i * Math.PI) / 5; v.push([Math.cos(ang), i % 2 ? -a : a, Math.sin(ang)]); }
      return v;
    }
    if (type === 'd12') {
      const v = [], p = PHI, q = 1 / PHI;
      for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) v.push([x, y, z]);
      for (const a of [-1, 1]) for (const b of [-1, 1]) { v.push([0, a * q, b * p]); v.push([a * q, b * p, 0]); v.push([a * p, 0, b * q]); }
      return v;
    }
    throw new Error('dice type ' + type);
  }
  const SIZE = { d4: 0.95, d6: 0.62, d8: 0.9, d10: 0.88, d12: 0.62 };

  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]); return [a[0] / l, a[1] / l, a[2] / l]; };

  /** Грани выпуклого многогранника: ищем плоскости, по одну сторону которых лежат все вершины */
  function convexFaces(V) {
    const faces = [], seen = new Set(), EPS = 1e-6;
    for (let i = 0; i < V.length; i++) for (let j = i + 1; j < V.length; j++) for (let k = j + 1; k < V.length; k++) {
      let n = cross(sub(V[j], V[i]), sub(V[k], V[i]));
      if (Math.hypot(...n) < EPS) continue;
      n = norm(n);
      let d = dot(n, V[i]);
      let pos = 0, neg = 0;
      for (const v of V) { const s = dot(n, v) - d; if (s > EPS) pos++; else if (s < -EPS) neg++; }
      if (pos && neg) continue;
      if (pos) { n = n.map((x) => -x); d = -d; }
      const on = V.map((v, idx) => idx).filter((idx) => Math.abs(dot(n, V[idx]) - d) < 1e-5);
      const key = on.slice().sort((a, b) => a - b).join(',');
      if (seen.has(key)) continue;
      seen.add(key);
      // упорядочить вершины грани по кругу (против часовой стрелки, если смотреть снаружи)
      const cen = on.reduce((s, idx) => [s[0] + V[idx][0] / on.length, s[1] + V[idx][1] / on.length, s[2] + V[idx][2] / on.length], [0, 0, 0]);
      const ax = norm(sub(V[on[0]], cen)), ay = cross(n, ax);
      on.sort((a, b) => Math.atan2(dot(sub(V[a], cen), ay), dot(sub(V[a], cen), ax)) - Math.atan2(dot(sub(V[b], cen), ay), dot(sub(V[b], cen), ax)));
      faces.push({ idx: on, n, cen });
    }
    return faces;
  }

  /* ---------- Текстуры граней ---------- */
  function faceCanvas(color, ink, label, d4corners) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 256;
    const g = cv.getContext('2d');
    g.fillStyle = color; g.fillRect(0, 0, 256, 256);
    // лёгкая потёртость
    for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.06})`; g.fillRect(Math.random() * 256, Math.random() * 256, 2 + Math.random() * 3, 2 + Math.random() * 3); }
    g.fillStyle = ink; g.textAlign = 'center'; g.textBaseline = 'middle';
    if (d4corners) {
      g.font = 'bold 54px Oswald, Arial, sans-serif';
      for (const c of d4corners) {
        g.save(); g.translate(c.x, c.y); g.rotate(c.rot); g.fillText(String(c.v), 0, 0); g.restore();
      }
    } else {
      g.font = `bold ${label >= 10 ? 104 : 124}px Oswald, Arial, sans-serif`;
      g.fillText(String(label), 128, 136);
      if (label === 6 || label === 9) g.fillRect(98, 196, 60, 9);
    }
    const tex = new T.CanvasTexture(cv);
    tex.colorSpace = T.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }

  /** Модель одного кубика: меш с отдельным материалом на каждую грань + физическое тело */
  function makeDie(type, color, ink) {
    const s = SIZE[type];
    const V = verts(type).map((v) => v.map((x) => x * s));
    const F = convexFaces(V);
    const n = type === 'd4' ? 4 : F.length;
    const values = Array.from({ length: n }, (_, i) => i + 1); // d6..d12: номер грани; d4: номер вершины
    const pos = [], uv = [], groups = [];
    const faceUV = []; // для d4: координаты вершин на текстуре
    F.forEach((f, fi) => {
      const ax = norm(sub(V[f.idx[0]], f.cen)), ay = cross(f.n, ax);
      const pts = f.idx.map((i) => [dot(sub(V[i], f.cen), ax), dot(sub(V[i], f.cen), ay)]);
      const R = Math.max(...pts.map((p) => Math.hypot(p[0], p[1])));
      const toUV = (p) => [0.5 + (p[0] / R) * 0.47, 0.5 + (p[1] / R) * 0.47];
      faceUV.push(f.idx.map((vi, k) => ({ vi, uv: toUV(pts[k]) })));
      const start = pos.length / 3;
      for (let k = 1; k < f.idx.length - 1; k++) {
        for (const vi of [f.idx[0], f.idx[k], f.idx[k + 1]]) {
          pos.push(...V[vi]);
          const p = pts[f.idx.indexOf(vi)];
          uv.push(...toUV(p));
        }
      }
      groups.push({ start, count: pos.length / 3 - start, fi });
    });
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    groups.forEach((gr) => geo.addGroup(gr.start, gr.count, gr.fi));
    geo.computeVertexNormals();
    const mats = F.map(() => new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, metalness: 0.05, flatShading: true }));
    const mesh = new T.Mesh(geo, mats);
    mesh.castShadow = true; mesh.receiveShadow = true;

    const die = { type, mesh, F, V, values, faceUV, color, ink };
    die.paint = () => {
      F.forEach((f, fi) => {
        let tex;
        if (type === 'd4') {
          // на каждой грани — числа трёх её вершин, у каждой вершины; «верх» числа смотрит на вершину
          const corners = faceUV[fi].map((c) => {
            const x = c.uv[0] * 256, y = (1 - c.uv[1]) * 256;
            const cx = 128 + (x - 128) * 0.58, cy = 128 + (y - 128) * 0.58;
            return { x: cx, y: cy, v: values[c.vi], rot: Math.atan2(x - 128, -(y - 128)) };
          });
          tex = faceCanvas(color, ink, 0, corners);
        } else tex = faceCanvas(color, ink, values[fi]);
        if (mats[fi].map) mats[fi].map.dispose();
        mats[fi].map = tex; mats[fi].needsUpdate = true;
      });
    };
    die.paint();

    const shape = new C.ConvexPolyhedron({ vertices: V.map((v) => new C.Vec3(...v)), faces: F.map((f) => f.idx.slice()) });
    die.shape = shape;
    return die;
  }

  /** Что выпало: индекс грани (или вершины d4), смотрящей вверх, и насколько ровно кубик лежит */
  function topOf(die, q) {
    const quat = new T.Quaternion(q[0], q[1], q[2], q[3]);
    if (die.type === 'd4') {
      let best = -1, bi = 0;
      die.V.forEach((v, i) => { const w = new T.Vector3(...v).applyQuaternion(quat); if (w.y > best) { best = w.y; bi = i; } });
      // ровно = нижняя грань лежит на столе
      let flat = -2; die.F.forEach((f) => { const w = new T.Vector3(...f.n).applyQuaternion(quat); flat = Math.max(flat, -w.y); });
      return { index: bi, flat };
    }
    let best = -2, bi = 0;
    die.F.forEach((f, i) => { const w = new T.Vector3(...f.n).applyQuaternion(quat); if (w.y > best) { best = w.y; bi = i; } });
    return { index: bi, flat: best };
  }

  /* ---------- Сцена ---------- */
  const W = 9, H = 6; // стол
  function DiceTable(container) {
    this.container = container;
    const r = new T.WebGLRenderer({ antialias: true, alpha: true });
    r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    r.shadowMap.enabled = true; r.shadowMap.type = T.PCFSoftShadowMap;
    r.outputColorSpace = T.SRGBColorSpace;
    container.appendChild(r.domElement);
    this.renderer = r;
    const scene = new T.Scene();
    this.scene = scene;
    this.camera = new T.PerspectiveCamera(40, 1, 0.1, 100);
    this.camera.position.set(0, 9.2, 5.4); this.camera.lookAt(0, 0, 0.35);
    scene.add(new T.HemisphereLight(0xfff1dc, 0x1a1410, 0.75));
    const sun = new T.DirectionalLight(0xffe6c0, 1.9);
    sun.position.set(-4, 12, 5); sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 30 });
    scene.add(sun);
    // стол: тёмное сукно
    const cv = document.createElement('canvas'); cv.width = cv.height = 256;
    const g = cv.getContext('2d'); g.fillStyle = '#1d2a22'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,255,255'},${Math.random() * 0.05})`; g.fillRect(Math.random() * 256, Math.random() * 256, 1, 1); }
    const felt = new T.CanvasTexture(cv); felt.wrapS = felt.wrapT = T.RepeatWrapping; felt.repeat.set(4, 3); felt.colorSpace = T.SRGBColorSpace;
    const table = new T.Mesh(new T.PlaneGeometry(W + 2, H + 2), new T.MeshStandardMaterial({ map: felt, roughness: 0.95 }));
    table.rotation.x = -Math.PI / 2; table.receiveShadow = true; scene.add(table);
    this.dice = [];
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.render();
  }
  DiceTable.prototype.resize = function () {
    const w = this.container.clientWidth || 600, h = this.container.clientHeight || 400;
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = '100%'; this.renderer.domElement.style.height = '100%';
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    this.render();
  };
  DiceTable.prototype.render = function () { this.renderer.render(this.scene, this.camera); };
  DiceTable.prototype.clear = function () { this.dice.forEach((d) => this.scene.remove(d.mesh)); this.dice = []; };

  /** Просчитать бросок без показа: вернуть кадры движения каждого кубика */
  function simulate(dice, starts) {
    const world = new C.World({ gravity: new C.Vec3(0, -38, 0) });
    world.allowSleep = true;
    const mat = new C.Material('m');
    world.addContactMaterial(new C.ContactMaterial(mat, mat, { friction: 0.32, restitution: 0.26 }));
    const ground = new C.Body({ mass: 0, material: mat, shape: new C.Plane() });
    ground.quaternion.setFromEuler(-Math.PI / 2, 0, 0); world.addBody(ground);
    // невидимые бортики
    const wall = (x, z, ry) => { const b = new C.Body({ mass: 0, material: mat, shape: new C.Plane() }); b.position.set(x, 0, z); b.quaternion.setFromEuler(0, ry, 0); world.addBody(b); };
    wall(-W / 2, 0, Math.PI / 2); wall(W / 2, 0, -Math.PI / 2); wall(0, -H / 2, 0); wall(0, H / 2, Math.PI);
    const bodies = dice.map((d, i) => {
      const b = new C.Body({ mass: 1, material: mat, shape: d.shape, sleepSpeedLimit: 0.25, sleepTimeLimit: 0.12, angularDamping: 0.22, linearDamping: 0.12 });
      // старт — там, где кубик лежит на поле; его «подхватывают» и бросают к центру стола
      const st = starts[i];
      b.position.set(st.p[0], st.p[1] + 0.05, st.p[2]);
      b.quaternion.set(st.q[0], st.q[1], st.q[2], st.q[3]);
      const tx = (Math.random() - 0.5) * (W - 4), tz = (Math.random() - 0.5) * (H - 3);
      const dx = tx - st.p[0], dz = tz - st.p[2], len = Math.hypot(dx, dz) || 1;
      const sp = 7 + Math.random() * 4;
      b.velocity.set((dx / len) * sp, 7 + Math.random() * 3, (dz / len) * sp);
      b.angularVelocity.set((Math.random() - 0.5) * 34, (Math.random() - 0.5) * 34, (Math.random() - 0.5) * 34);
      world.addBody(b);
      return b;
    });
    const frames = dice.map(() => []);
    let calm = 0;
    for (let step = 0; step < 60 * 5; step++) {
      world.step(1 / 60);
      bodies.forEach((b, i) => frames[i].push([b.position.x, b.position.y, b.position.z, b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w]));
      // кубики почти не движутся несколько кадров подряд — бросок окончен
      const still = bodies.every((b) => b.sleepState === C.Body.SLEEPING || (b.velocity.length() < 0.12 && b.angularVelocity.length() < 0.25));
      calm = still ? calm + 1 : 0;
      if (step > 30 && calm >= 8) break;
    }
    return frames;
  }

  /**
   * Бросок. specs: [{ type, color, ink, value? }]. mode: 'honest' | 'forced'.
   * Возвращает Promise<[числа]> после окончания анимации.
   */
  /** Положить кубики на поле в ряд у ближнего края (до броска они просто лежат) */
  DiceTable.prototype.place = function (specs) {
    this.clear();
    const n = specs.length, gap = Math.min(1.5, (W - 2) / Math.max(1, n));
    specs.forEach((s, i) => {
      const d = makeDie(s.type, s.color, s.ink);
      // повернуть так, чтобы случайная грань лежала на столе
      const f = d.F[Math.floor(Math.random() * d.F.length)];
      const q = new T.Quaternion().setFromUnitVectors(new T.Vector3(...f.n), new T.Vector3(0, -1, 0));
      q.premultiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), Math.random() * 6.28));
      const minY = Math.min(...d.V.map((v) => new T.Vector3(...v).applyQuaternion(q).y));
      d.mesh.quaternion.copy(q);
      d.mesh.position.set((i - (n - 1) / 2) * gap, -minY, H / 2 - 1.1);
      d.spec = s;
      this.scene.add(d.mesh); this.dice.push(d);
    });
    this.render();
  };

  DiceTable.prototype.roll = function (specs, mode, speed) {
    // если на поле не те кубики — сначала разложить нужные
    const same = this.dice.length === specs.length && this.dice.every((d, i) => d.type === specs[i].type);
    if (!same) this.place(specs);
    const dice = this.dice;
    const starts = dice.map((d) => ({ p: d.mesh.position.toArray(), q: d.mesh.quaternion.toArray() }));
    let frames, tops, tries = 0;
    // перебросить без показа, если кубик встал «на ребро» или упёрся в соседа
    do {
      frames = simulate(dice, starts);
      tops = dice.map((d, i) => topOf(d, frames[i][frames[i].length - 1].slice(3)));
      tries++;
    } while (tops.some((t) => t.flat < 0.97) && tries < 12);
    const results = dice.map((d, i) => {
      const landed = tops[i].index;
      if (mode === 'forced' && specs[i].value != null) {
        // переставить цифры: нужное число — на ту грань (вершину), что окажется сверху
        const want = specs[i].value, j = d.values.indexOf(want);
        [d.values[landed], d.values[j]] = [d.values[j], d.values[landed]];
        d.paint();
      }
      return d.values[landed];
    });
    const len = Math.max(...frames.map((f) => f.length));
    const t0 = performance.now();
    return new Promise((resolve) => {
      const tick = () => {
        const k = Math.min(len - 1, Math.floor(((performance.now() - t0) / 1000) * 60 * (speed || 1)));
        dice.forEach((d, i) => { const f = frames[i][Math.min(k, frames[i].length - 1)]; d.mesh.position.set(f[0], f[1], f[2]); d.mesh.quaternion.set(f[3], f[4], f[5], f[6]); });
        this.render();
        if (k < len - 1) requestAnimationFrame(tick); else resolve(results);
      };
      tick();
    });
  };

  window.DiceTable = DiceTable;
})();
