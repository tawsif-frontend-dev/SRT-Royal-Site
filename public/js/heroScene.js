// SRT ROYAL — hero scene: floating stone island, gold lightning rings, drifting rocks.
// Procedural only (no assets). Pointer parallax, scroll lift, pauses when off-screen.
(async function initHeroScene() {
  const canvas = document.getElementById('heroScene');
  if (!canvas) return;

  let THREE;
  try { THREE = await import('../vendor/three.module.js'); }
  catch (e) {
    try { THREE = await import('https://unpkg.com/three@0.186.0/build/three.module.js'); }
    catch (e2) { return; }
  }

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { return; }

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const small = () => innerWidth < 820;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, small() ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
  camera.position.set(0, 0.4, 15);

  /* ── lights: warm glow from behind/above, cool fill, lantern ── */
  scene.add(new THREE.AmbientLight(0x3a342d, 0.9));
  const key = new THREE.DirectionalLight(0xffdca8, 1.5); key.position.set(-4, 7, 6); scene.add(key);
  const back = new THREE.PointLight(0xffb347, 60, 30, 1.6); back.position.set(0.5, 3.5, -3.5); scene.add(back);
  const fill = new THREE.DirectionalLight(0x8a93a8, 0.35); fill.position.set(6, -2, 4); scene.add(fill);

  /* ── noise + rock helpers ── */
  const hash = (x, y, z) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); };
  function vnoise(x, y, z) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const xf = x - xi, yf = y - yi, zf = z - zi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
    const l = (a, b, t) => a + (b - a) * t;
    return l(
      l(l(hash(xi, yi, zi), hash(xi + 1, yi, zi), u), l(hash(xi, yi + 1, zi), hash(xi + 1, yi + 1, zi), u), v),
      l(l(hash(xi, yi, zi + 1), hash(xi + 1, yi, zi + 1), u), l(hash(xi, yi + 1, zi + 1), hash(xi + 1, yi + 1, zi + 1), u), v), w);
  }
  function rockGeometry(radius, detail, rough, seed, island) {
    const g = new THREE.IcosahedronGeometry(radius, detail);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const n = vnoise(x * 0.9 + seed, y * 0.9 + seed, z * 0.9 + seed) * 0.65 + vnoise(x * 2.4 + seed, y * 2.4, z * 2.4) * 0.35;
      const d = 1 + (n - 0.5) * rough;
      x *= d; y *= d; z *= d;
      if (island) {                       // flat plateau on top, tapering underside
        if (y > radius * 0.22) y = radius * 0.22 + (y - radius * 0.22) * 0.12;
        if (y < 0) { const t = Math.min(1, -y / radius); const k = 1 - t * 0.62; x *= k; z *= k; y *= 1.25; }
      }
      p.setXYZ(i, x, y, z);
    }
    g.computeVertexNormals();
    return g;
  }
  const stone = new THREE.MeshStandardMaterial({ color: 0x77716a, roughness: 0.96, metalness: 0.02, flatShading: true });
  const stoneDark = new THREE.MeshStandardMaterial({ color: 0x4b4640, roughness: 1, flatShading: true });
  const stoneLight = new THREE.MeshStandardMaterial({ color: 0xd6cfc2, roughness: 0.85, flatShading: true });

  const world = new THREE.Group();
  scene.add(world);

  const island = new THREE.Mesh(rockGeometry(2.5, 3, 0.7, 3.1, true), stone);
  island.position.set(0.3, 0.2, 0); island.scale.set(1.15, 1, 1);
  world.add(island);

  const boulder = new THREE.Mesh(rockGeometry(1.35, 3, 0.55, 8.4, false), stoneDark);
  boulder.position.set(-1.9, -2.2, 1.9);
  world.add(boulder);

  /* ── stone lantern tower on the plateau ── */
  const tower = new THREE.Group();
  const lanternMat = new THREE.MeshStandardMaterial({ color: 0xffe2b0, emissive: 0xffa94d, emissiveIntensity: 1.6, roughness: 0.5 });
  const part = (geo, mat, y) => { const m = new THREE.Mesh(geo, mat); m.position.y = y; tower.add(m); return m; };
  part(new THREE.CylinderGeometry(0.46, 0.55, 0.22, 8), stoneLight, 0.11);
  part(new THREE.CylinderGeometry(0.13, 0.17, 0.8, 8), stoneLight, 0.62);
  part(new THREE.CylinderGeometry(0.36, 0.24, 0.12, 8), stoneLight, 1.08);
  part(new THREE.BoxGeometry(0.34, 0.3, 0.34), lanternMat, 1.29);
  part(new THREE.ConeGeometry(0.46, 0.3, 8), stoneLight, 1.56);
  part(new THREE.SphereGeometry(0.07, 12, 12), stoneLight, 1.76);
  tower.position.set(0.8, 0.5, -0.2);
  const lantern = new THREE.PointLight(0xffa94d, 6, 6, 2); lantern.position.set(0.8, 1.9, -0.2);
  world.add(tower, lantern);

  /* ── gold lightning rings (jittered line strands + additive glow tubes) ── */
  const rings = [];
  function makeRing({ rx, rz, y0, y1, turns, tilt, phase, speed }) {
    const N = 260, base = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N, a = t * turns * Math.PI * 2 + phase;
      const shrink = 1 - 0.45 * Math.abs(t - 0.35);
      base.push(new THREE.Vector3(Math.cos(a) * rx * shrink, y0 + (y1 - y0) * t, Math.sin(a) * rz * shrink));
    }
    const group = new THREE.Group();
    const curve = new THREE.CatmullRomCurve3(base);
    [[0.022, 0.95], [0.07, 0.22], [0.2, 0.07]].forEach(([r, o]) => {
      group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 320, r, 6, false),
        new THREE.MeshBasicMaterial({ color: 0xffbf5e, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false })));
    });
    const strands = [];
    for (let s = 0; s < 3; s++) {
      const geo = new THREE.BufferGeometry().setFromPoints(base);
      const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: s ? 0xffe3a6 : 0xfff3d2, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
      group.add(line); strands.push(line);
    }
    group.rotation.z = tilt; group.rotation.x = 0.18;
    world.add(group);
    rings.push({ group, strands, base, speed });
  }
  makeRing({ rx: 7.2, rz: 2.6, y0: 3.4, y1: -2.6, turns: 2.6, tilt: -0.1, phase: 0, speed: 0.12 });
  makeRing({ rx: 6.2, rz: 2.2, y0: 2.6, y1: -2.0, turns: 2.2, tilt: 0.06, phase: 2.1, speed: -0.09 });
  if (!small()) makeRing({ rx: 8.2, rz: 3.0, y0: 3.8, y1: -1.2, turns: 1.8, tilt: -0.04, phase: 4.2, speed: 0.07 });

  /* ── drifting rocks ── */
  const COUNT = small() ? 36 : 90;
  const debris = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), stone, COUNT);
  const seeds = [];
  for (let i = 0; i < COUNT; i++) {
    const ang = Math.random() * Math.PI * 2, rad = 3.6 + Math.random() * 8;
    seeds.push({
      x: Math.cos(ang) * rad * 1.15, y: (Math.random() - 0.5) * 11, z: -5 + Math.random() * 9,
      s: 0.035 + Math.pow(Math.random(), 3) * 0.3, rx: Math.random() * 6, ry: Math.random() * 6,
      sp: 0.1 + Math.random() * 0.4, ph: Math.random() * 6.28,
    });
  }
  scene.add(debris);
  const dummy = new THREE.Object3D();

  /* ── sizing / layout ── */
  const stage = canvas.parentElement;
  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = small() ? 48 : 36;
    camera.updateProjectionMatrix();
    world.position.x = small() ? 0 : 2.5;
    world.scale.setScalar(small() ? 0.62 : 1);
    world.userData.baseY = small() ? 1.2 : 0;
  }
  new ResizeObserver(resize).observe(stage); resize();

  /* ── interaction ── */
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  addEventListener('pointermove', (e) => {
    pointer.tx = (e.clientX / innerWidth - 0.5) * 2;
    pointer.ty = (e.clientY / innerHeight - 0.5) * 2;
  }, { passive: true });
  let scrollP = 0;
  addEventListener('scroll', () => { scrollP = Math.min(1, scrollY / innerHeight); }, { passive: true });

  let visible = true;
  new IntersectionObserver((en) => { visible = en[0].isIntersecting; }).observe(stage);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) last = performance.now(); });

  const clock = new THREE.Clock();
  let last = performance.now();
  function frame() {
    requestAnimationFrame(frame);
    if (!visible || document.hidden) return;
    const t = clock.getElapsedTime();
    pointer.x += (pointer.tx - pointer.x) * 0.05; pointer.y += (pointer.ty - pointer.y) * 0.05;

    world.rotation.y = Math.sin(t * 0.18) * 0.14 + pointer.x * 0.32;
    world.rotation.x = pointer.y * 0.1;
    world.position.y = (world.userData.baseY || 0) + Math.sin(t * 0.6) * 0.12 + scrollP * 2.4;
    island.rotation.y = t * 0.03;
    boulder.rotation.set(t * 0.07, t * 0.1, 0);
    boulder.position.y = -2.2 + Math.sin(t * 0.8 + 1) * 0.12;
    lantern.intensity = 5.5 + Math.sin(t * 3.1) * 0.8 + Math.sin(t * 7.3) * 0.4;
    back.intensity = 55 + Math.sin(t * 1.7) * 8;
    camera.position.x = pointer.x * 0.5; camera.position.y = 0.4 - pointer.y * 0.3; camera.lookAt(world.position.x * 0.4, 0, 0);

    rings.forEach((r, ri) => {
      r.group.rotation.y = t * r.speed;
      r.strands.forEach((line, si) => {
        const pos = line.geometry.attributes.position;
        const amp = 0.035 + si * 0.03;
        for (let i = 0; i < pos.count; i++) {
          const b = r.base[i], k = i * 0.35 + t * (6 + si * 2.5) + ri;
          pos.setXYZ(i, b.x + Math.sin(k) * amp, b.y + Math.cos(k * 1.3) * amp, b.z + Math.sin(k * 0.7 + si) * amp);
        }
        pos.needsUpdate = true;
        line.material.opacity = 0.55 + Math.sin(t * 9 + si * 2 + ri) * 0.25;
      });
    });

    for (let i = 0; i < COUNT; i++) {
      const s = seeds[i];
      dummy.position.set(s.x + Math.sin(t * s.sp + s.ph) * 0.25, s.y + Math.cos(t * s.sp * 1.2 + s.ph) * 0.3 + scrollP * 1.5 * s.s * 6, s.z);
      dummy.rotation.set(s.rx + t * s.sp, s.ry + t * s.sp * 0.7, 0);
      dummy.scale.setScalar(s.s);
      dummy.updateMatrix(); debris.setMatrixAt(i, dummy.matrix);
    }
    debris.instanceMatrix.needsUpdate = true;
    renderer.render(scene, camera);
  }
  if (reduce) { renderer.render(scene, camera); } else { frame(); }
  canvas.classList.add('is-ready');
})();
