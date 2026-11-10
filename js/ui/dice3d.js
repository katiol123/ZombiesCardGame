/* 3D-кубики с физикой (three.js + cannon-es).
 * Бросок сначала полностью просчитывается без показа, затем проигрывается как анимация.
 * Результат задаёт игра (ZG.rollDie): после просчёта цифры на гранях переставляются так,
 * чтобы сверху оказалось нужное число. Полёт и падение — настоящая физика.
 *
 * ZG.Dice3D.available()            — можно ли показывать 3D (есть WebGL и включено в настройках)
 * ZG.Dice3D.roll(container, specs) — specs: [{ d: 'd8', v: 5, theme }], Promise после остановки
 * ZG.Dice3D.hurry()                — ускорить текущий бросок (клик по столу)
 */
(function () {
  'use strict';
  const T = window.THREE, C = window.CANNON;
  const D3 = (ZG.Dice3D = {});
  if (!T || !C) { D3.available = () => false; return; }

  /* ---------- Геометрия ---------- */
  const PHI = (1 + Math.sqrt(5)) / 2;
  function verts(type) {
    if (type === 'd4') return [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]];
    if (type === 'd6') { const v = []; for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) v.push([x, y, z]); return v; }
    if (type === 'd8') return [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
    if (type === 'd10') {
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
    return verts('d6');
  }
  const SIZE = { d4: 0.6, d6: 0.62, d8: 0.9, d10: 0.88, d12: 0.62 }; // d4 — пирамидка: её вершины дальше от центра, поэтому масштаб меньше
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]); return [a[0] / l, a[1] / l, a[2] / l]; };

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
      const cen = on.reduce((s, idx) => [s[0] + V[idx][0] / on.length, s[1] + V[idx][1] / on.length, s[2] + V[idx][2] / on.length], [0, 0, 0]);
      const ax = norm(sub(V[on[0]], cen)), ay = cross(n, ax);
      on.sort((a, b) => Math.atan2(dot(sub(V[a], cen), ay), dot(sub(V[a], cen), ax)) - Math.atan2(dot(sub(V[b], cen), ay), dot(sub(V[b], cen), ax)));
      faces.push({ idx: on, n, cen });
    }
    return faces;
  }
  // геометрия каждого вида считается один раз
  const GEO = {};
  function geoOf(type) {
    if (GEO[type]) return GEO[type];
    const s = SIZE[type] || 0.7;
    const V = verts(type).map((v) => v.map((x) => x * s));
    const F = convexFaces(V);
    const pos = [], uv = [], groups = [], faceUV = [], labels = [];
    F.forEach((f, fi) => {
      let ax = norm(sub(V[f.idx[0]], f.cen)), ay = cross(f.n, ax);
      // d10: грань — длинный «воздушный змей». Цифру ставим вдоль него: верх цифры смотрит на полюс
      const pole = type === 'd10' ? f.idx.find((i) => i < 2) : undefined;
      if (pole !== undefined) {
        const up = sub(V[pole], f.cen);
        ay = norm(sub(up, f.n.map((x) => x * dot(up, f.n))));
        ax = cross(ay, f.n);
      }
      const pts = f.idx.map((i) => [dot(sub(V[i], f.cen), ax), dot(sub(V[i], f.cen), ay)]);
      const R = Math.max(...pts.map((p) => Math.hypot(p[0], p[1])));
      const toUV = (p) => [0.5 + (p[0] / R) * 0.47, 0.5 + (p[1] / R) * 0.47];
      faceUV.push(f.idx.map((vi, k) => ({ vi, uv: toUV(pts[k]) })));
      if (pole !== undefined) {
        // широкая часть грани: между полюсом и поперечной диагональю, ближе к ней
        const pp = pts[f.idx.indexOf(pole)];
        const far = pts.reduce((b, p) => (Math.hypot(p[0] - pp[0], p[1] - pp[1]) > Math.hypot(b[0] - pp[0], b[1] - pp[1]) ? p : b), pp);
        const at = [pp[0] + (far[0] - pp[0]) * 0.56, pp[1] + (far[1] - pp[1]) * 0.56];
        const uvp = toUV(at);
        const len = Math.hypot(far[0] - pp[0], far[1] - pp[1]);
        labels[fi] = { x: uvp[0] * 256, y: (1 - uvp[1]) * 256, px: ((len * 0.27) / R) * 0.47 * 256 * 1.35 };
      }
      const start = pos.length / 3;
      for (let k = 1; k < f.idx.length - 1; k++) for (const vi of [f.idx[0], f.idx[k], f.idx[k + 1]]) { pos.push(...V[vi]); uv.push(...toUV(pts[f.idx.indexOf(vi)])); }
      groups.push({ start, count: pos.length / 3 - start, fi });
    });
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    groups.forEach((gr) => geo.addGroup(gr.start, gr.count, gr.fi));
    geo.computeVertexNormals();
    const shape = new C.ConvexPolyhedron({ vertices: V.map((v) => new C.Vec3(...v)), faces: F.map((f) => f.idx.slice()) });
    return (GEO[type] = { V, F, geo, faceUV, shape, labels });
  }

  /* ---------- Тематические текстуры ---------- */
  // wear: blood (бой), dust (поиск), concrete (препятствие), wood (заколотить), glow (стихия), plain
  function faceCanvas(th, label, d4corners, place) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 256;
    const g = cv.getContext('2d');
    const grad = g.createRadialGradient(128, 110, 20, 128, 128, 190);
    grad.addColorStop(0, th.color); grad.addColorStop(1, th.edge || th.color);
    g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
    const rnd = Math.random;
    if (th.wear === 'wood') {
      for (let i = 0; i < 26; i++) { g.strokeStyle = `rgba(40,22,8,${0.12 + rnd() * 0.15})`; g.lineWidth = 1 + rnd() * 2; g.beginPath(); const y = rnd() * 256; g.moveTo(0, y); g.bezierCurveTo(80, y + rnd() * 20 - 10, 170, y + rnd() * 20 - 10, 256, y + rnd() * 16 - 8); g.stroke(); }
    }
    if (th.wear === 'concrete' || th.wear === 'dust') {
      for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '0,0,0' : '255,255,255'},${rnd() * (th.wear === 'dust' ? 0.08 : 0.14)})`; const r = rnd() * 2.5; g.fillRect(rnd() * 256, rnd() * 256, r, r); }
    }
    for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(0,0,0,${rnd() * 0.07})`; g.fillRect(rnd() * 256, rnd() * 256, 2 + rnd() * 4, 1 + rnd() * 2); } // царапины
    if (th.wear === 'blood') {
      const n = 2 + Math.floor(rnd() * 4);
      for (let i = 0; i < n; i++) {
        const x = rnd() * 256, y = rnd() * 256, r = 6 + rnd() * 22;
        g.fillStyle = `rgba(${110 + rnd() * 40},8,6,${0.45 + rnd() * 0.35})`;
        g.beginPath(); g.arc(x, y, r, 0, 6.3); g.fill();
        for (let k = 0; k < 7; k++) { g.beginPath(); g.arc(x + (rnd() - 0.5) * r * 3, y + (rnd() - 0.5) * r * 3, 1 + rnd() * 4, 0, 6.3); g.fill(); }
      }
    }
    if (th.wear === 'glow') {
      g.strokeStyle = th.glowColor || 'rgba(255,255,255,.5)'; g.lineWidth = 10; g.strokeRect(8, 8, 240, 240);
    }
    g.fillStyle = th.ink; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 4;
    if (d4corners) {
      g.font = 'bold 56px Oswald, Arial, sans-serif';
      for (const c of d4corners) { g.save(); g.translate(c.x, c.y); g.rotate(c.rot); g.fillText(String(c.v), 0, 0); g.restore(); }
    } else {
      const pl = place || { x: 128, y: 136, px: 128 };
      const px = label >= 10 ? pl.px * 0.83 : pl.px;
      g.font = `bold ${Math.round(px)}px Oswald, Arial, sans-serif`;
      g.fillText(String(label), pl.x, pl.y);
      if (label === 6 || label === 9) g.fillRect(pl.x - px * 0.18, pl.y + px * 0.44, px * 0.36, Math.max(4, px * 0.07));
    }
    const tex = new T.CanvasTexture(cv);
    tex.colorSpace = T.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }

  function makeDie(type, th) {
    const G = geoOf(type);
    const mats = G.F.map(() => new T.MeshStandardMaterial({ color: 0xffffff, roughness: th.rough != null ? th.rough : 0.55, metalness: th.metal || 0.05, flatShading: true, emissive: th.emissive ? new T.Color(th.emissive) : new T.Color(0x000000), emissiveIntensity: th.emissive ? 0.35 : 0 }));
    const mesh = new T.Mesh(G.geo, mats);
    mesh.castShadow = true; mesh.receiveShadow = true;
    const n = type === 'd4' ? 4 : G.F.length;
    const die = { type, mesh, G, values: Array.from({ length: n }, (_, i) => i + 1), th, mats };
    die.paint = () => {
      G.F.forEach((f, fi) => {
        let tex;
        if (type === 'd4') {
          const corners = G.faceUV[fi].map((c) => {
            const x = c.uv[0] * 256, y = (1 - c.uv[1]) * 256;
            return { x: 128 + (x - 128) * 0.58, y: 128 + (y - 128) * 0.58, v: die.values[c.vi], rot: Math.atan2(x - 128, -(y - 128)) };
          });
          tex = faceCanvas(th, 0, corners);
        } else tex = faceCanvas(th, die.values[fi], null, G.labels && G.labels[fi]);
        if (mats[fi].map) mats[fi].map.dispose();
        mats[fi].map = tex; mats[fi].needsUpdate = true;
      });
    };
    die.paint();
    die.dispose = () => mats.forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); });
    return die;
  }

  function topOf(die, q) {
    const quat = new T.Quaternion(q[0], q[1], q[2], q[3]);
    const G = die.G;
    if (die.type === 'd4') {
      let best = -1e9, bi = 0;
      G.V.forEach((v, i) => { const w = new T.Vector3(...v).applyQuaternion(quat); if (w.y > best) { best = w.y; bi = i; } });
      let flat = -2; G.F.forEach((f) => { flat = Math.max(flat, -new T.Vector3(...f.n).applyQuaternion(quat).y); });
      return { index: bi, flat };
    }
    let best = -2, bi = 0;
    G.F.forEach((f, i) => { const y = new T.Vector3(...f.n).applyQuaternion(quat).y; if (y > best) { best = y; bi = i; } });
    return { index: bi, flat: best };
  }

  /* ---------- Сцена: одна на всю игру, холст переносится в нужный контейнер ---------- */
  let S = null;
  function scene() {
    if (S) return S;
    const r = new T.WebGLRenderer({ antialias: true, alpha: true });
    r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    r.shadowMap.enabled = true; r.shadowMap.type = T.PCFSoftShadowMap;
    r.outputColorSpace = T.SRGBColorSpace;
    r.domElement.className = 'dice3d-canvas';
    const sc = new T.Scene();
    const cam = new T.PerspectiveCamera(34, 2, 0.1, 100);
    sc.add(new T.HemisphereLight(0xfff1dc, 0x1a1410, 0.8));
    const sun = new T.DirectionalLight(0xffe6c0, 1.9);
    sun.position.set(-3, 12, 5); sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 6, bottom: -6, near: 1, far: 30 });
    sc.add(sun);
    // стол: потёртое сукно в тон игры
    const cv = document.createElement('canvas'); cv.width = cv.height = 256;
    const g = cv.getContext('2d'); g.fillStyle = '#1b1f1a'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 5000; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,255,255'},${Math.random() * 0.05})`; g.fillRect(Math.random() * 256, Math.random() * 256, 1, 1); }
    const felt = new T.CanvasTexture(cv); felt.wrapS = felt.wrapT = T.RepeatWrapping; felt.repeat.set(6, 2); felt.colorSpace = T.SRGBColorSpace;
    const table = new T.Mesh(new T.PlaneGeometry(40, 20), new T.MeshStandardMaterial({ map: felt, roughness: 0.95 }));
    table.rotation.x = -Math.PI / 2; table.receiveShadow = true; sc.add(table);
    S = { r, sc, cam, dice: [], W: 12, H: 4 };
    return S;
  }

  D3.available = () => {
    if (ZG.Settings && ZG.Settings.data && ZG.Settings.data.dice3d === false) return false;
    if (D3._gl == null) { try { const c = document.createElement('canvas'); D3._gl = !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { D3._gl = false; } }
    return D3._gl;
  };

  function fit(container) {
    const s = scene();
    const w = container.clientWidth || 600, h = container.clientHeight || 220;
    s.r.setSize(w, h, false);
    s.r.domElement.style.width = '100%'; s.r.domElement.style.height = '100%';
    s.cam.aspect = w / h;
    // размер стола под пропорции контейнера: высота стола ~4.4, ширина по аспекту
    s.H = 3.5; s.W = Math.max(4.6, s.H * (w / h) * 0.95);
    const fov = (s.cam.fov * Math.PI) / 180;
    const dist = (s.H / 2 + 0.6) / Math.tan(fov / 2);
    s.cam.position.set(0, dist * 0.99, dist * 0.14); // почти отвесно сверху: верхняя грань читается однозначно
    s.cam.lookAt(0, 0, -0.05);
    s.cam.updateProjectionMatrix();
  }

  function simulate(dice, starts) {
    const s = scene();
    const W = s.W, H = s.H;
    const world = new C.World({ gravity: new C.Vec3(0, -32, 0) });
    world.allowSleep = true;
    const mat = new C.Material('dice'), floorM = new C.Material('floor'), wallM = new C.Material('wall');
    world.addContactMaterial(new C.ContactMaterial(mat, floorM, { friction: 0.2, restitution: 0.42 }));
    world.addContactMaterial(new C.ContactMaterial(mat, wallM, { friction: 0.02, restitution: 0.88 })); // борта — упругие, кубики от них отскакивают
    world.addContactMaterial(new C.ContactMaterial(mat, mat, { friction: 0.2, restitution: 0.5 }));
    const ground = new C.Body({ mass: 0, material: floorM, shape: new C.Plane() });
    ground.quaternion.setFromEuler(-Math.PI / 2, 0, 0); world.addBody(ground);
    const wall = (x, z, ry) => { const b = new C.Body({ mass: 0, material: wallM, shape: new C.Plane() }); b.position.set(x, 0, z); b.quaternion.setFromEuler(0, ry, 0); world.addBody(b); };
    wall(-W / 2, 0, Math.PI / 2); wall(W / 2, 0, -Math.PI / 2); wall(0, -H / 2, 0); wall(0, H / 2, Math.PI);
    // бросок с силой: низко над столом, в сторону дальнего борта и вбок — кубики бьются о борта и друг о друга
    const bodies = dice.map((d, i) => {
      const b = new C.Body({ mass: 1, material: mat, shape: d.G.shape, sleepSpeedLimit: 0.3, sleepTimeLimit: 0.12, angularDamping: 0.08, linearDamping: 0.02 });
      const st = starts[i];
      b.position.set(st.p[0], st.p[1] + 0.25, st.p[2]);
      b.quaternion.set(st.q[0], st.q[1], st.q[2], st.q[3]);
      // у каждого кубика своё направление: вперёд и вбок, к дальнему и боковым бортам
      const ang = (Math.random() < 0.5 ? -1 : 1) * (0.3 + Math.random() * 0.8);
      const sp = 15 + Math.random() * 7;
      b.velocity.set(Math.sin(ang) * sp, 3 + Math.random() * 2.5, -Math.cos(ang) * sp * 0.75);
      b.angularVelocity.set((Math.random() - 0.5) * 50, (Math.random() - 0.5) * 50, (Math.random() - 0.5) * 50);
      world.addBody(b);
      return b;
    });
    const frames = dice.map(() => []);
    let calm = 0;
    for (let step = 0; step < 60 * 5; step++) {
      world.step(1 / 60);
      bodies.forEach((b, i) => frames[i].push([b.position.x, b.position.y, b.position.z, b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w]));
      const still = bodies.every((b) => b.sleepState === C.Body.SLEEPING || (b.velocity.length() < 0.12 && b.angularVelocity.length() < 0.25));
      calm = still ? calm + 1 : 0;
      if (step > 30 && calm >= 8) break;
    }
    return frames;
  }

  let hurry = 1;
  D3.hurry = () => { hurry = 6; };

  /** Бросок в контейнере. specs: [{ d, v, theme }] */
  D3.roll = function (container, specs, onStart) {
    const s = scene();
    s.dice.forEach((d) => { s.sc.remove(d.mesh); d.dispose(); });
    s.dice = [];
    container.appendChild(s.r.domElement);
    fit(container);
    hurry = 1;
    // кубики лежат в ряд у ближнего края — их «подхватывают» и бросают
    const n = specs.length, gap = Math.min(1.45, (s.W - 1.5) / Math.max(1, n));
    const dice = specs.map((sp, i) => {
      const d = makeDie(sp.d, sp.theme);
      const f = d.G.F[Math.floor(Math.random() * d.G.F.length)];
      const q = new T.Quaternion().setFromUnitVectors(new T.Vector3(...f.n), new T.Vector3(0, -1, 0));
      q.premultiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), Math.random() * 6.28));
      const minY = Math.min(...d.G.V.map((v) => new T.Vector3(...v).applyQuaternion(q).y));
      d.mesh.quaternion.copy(q);
      d.mesh.position.set((i - (n - 1) / 2) * gap, -minY, s.H / 2 - 0.75);
      s.sc.add(d.mesh); s.dice.push(d);
      return d;
    });
    const starts = dice.map((d) => ({ p: d.mesh.position.toArray(), q: d.mesh.quaternion.toArray() }));
    let frames, tops, tries = 0;
    do {
      frames = simulate(dice, starts);
      tops = dice.map((d, i) => topOf(d, frames[i][frames[i].length - 1].slice(3)));
      tries++;
    } while (tops.some((t) => t.flat < 0.97) && tries < 12);
    dice.forEach((d, i) => {
      const want = specs[i].v, landed = tops[i].index, j = d.values.indexOf(want);
      if (j >= 0 && j !== landed) { [d.values[landed], d.values[j]] = [d.values[j], d.values[landed]]; d.paint(); }
    });
    const len = Math.max(...frames.map((f) => f.length));
    D3.last = { frames: len, tries, start: frames.map((f) => f[0].slice(0, 3)), end: frames.map((f) => f[f.length - 1].slice(0, 3)) };
    const speed = Math.max(0.6, 1 / Math.max(ZG.speed || 1, 0.45));
    let last = performance.now(), t = 0;
    if (onStart) onStart(); // бросок просчитан — кубики начинают движение
    return new Promise((resolve) => {
      const tick = () => {
        const now = performance.now();
        t += ((now - last) / 1000) * 60 * speed * hurry; last = now;
        const k = Math.min(len - 1, Math.floor(t));
        dice.forEach((d, i) => { const f = frames[i][Math.min(k, frames[i].length - 1)]; d.mesh.position.set(f[0], f[1], f[2]); d.mesh.quaternion.set(f[3], f[4], f[5], f[6]); });
        s.r.render(s.sc, s.cam);
        if (k < len - 1 && container.isConnected) requestAnimationFrame(tick);
        else highlight(s, dice, tops, container).then(resolve);
      };
      tick();
    });
  };

  /** После остановки: выпавшая грань подсвечивается, остальные притеняются — сразу видно, что выпало */
  function highlight(s, dice, tops, container) {
    const t0 = performance.now(), dur = 260;
    return new Promise((res) => {
      const step = () => {
        const k = Math.min(1, (performance.now() - t0) / dur);
        dice.forEach((d, i) => d.type !== 'd4' && d.mats.forEach((m, fi) => {
          if (fi === tops[i].index) {
            m.emissive = m.emissive || new T.Color(0);
            m.emissive.set(0xffd9a0); m.emissiveIntensity = 0.16 * k;
          } else m.color.setScalar(1 - 0.42 * k);
        }));
        s.r.render(s.sc, s.cam);
        if (k < 1 && container.isConnected) requestAnimationFrame(step); else res();
      };
      step();
    });
  }

  /* ---------- Темы ---------- */
  const ELEM = {
    'Огонь': { color: '#c2561e', edge: '#4a1505', ink: '#fff1d6', wear: 'glow', glowColor: 'rgba(255,190,80,.55)', emissive: '#5a1800' },
    'Кислота': { color: '#5f9a2a', edge: '#1c3308', ink: '#efffd8', wear: 'glow', glowColor: 'rgba(190,255,90,.5)', emissive: '#1d3a00' },
    'Электричество': { color: '#2f6fc0', edge: '#0b1f40', ink: '#e8f4ff', wear: 'glow', glowColor: 'rgba(140,220,255,.6)', emissive: '#082a55' },
    'Холод': { color: '#bcd8ea', edge: '#5d7f95', ink: '#163246', wear: 'glow', glowColor: 'rgba(255,255,255,.7)' },
  };
  const WEAR = { combat: 'blood', acquire: 'dust', event: 'concrete', close: 'wood', evade: 'dust' };
  /** Вид кубика по источнику броска и виду проверки */
  D3.theme = function (src, kind, ctx, heroColor) {
    const wear = WEAR[kind] || 'plain';
    const card = ctx && (ctx.played || []).map((p) => ZG.card(p.id)).find((d) => d.name === src);
    if (card) {
      const tr = card.traits || [];
      const el = Object.keys(ELEM).find((t) => tr.includes(t));
      if (el) return Object.assign({ rough: 0.45 }, ELEM[el]);
      if (card.type === 'weapon') return { color: '#5a5d63', edge: '#24262a', ink: '#f2ece0', wear, metal: 0.35, rough: 0.45 };
      if (card.type === 'resolve') return { color: '#c79a35', edge: '#5a3f0c', ink: '#2a1b04', wear, metal: 0.3, rough: 0.4 };
      if (card.type === 'ally') return { color: '#3d7d78', edge: '#123533', ink: '#eafcf8', wear };
      if (card.type === 'technique') return { color: '#7b4f9e', edge: '#2e1840', ink: '#f6eefc', wear };
      if (card.type === 'item') return { color: '#8a6f4a', edge: '#3a2c18', ink: '#fbf2e2', wear };
      return { color: '#9c3a2b', edge: '#3a0e08', ink: '#fbeee2', wear };
    }
    // кубик навыка и способностей героя — в цвет героя
    return { color: heroColor || '#d8cfbd', edge: '#2a2620', ink: '#fffaf0', wear };
  };
})();
