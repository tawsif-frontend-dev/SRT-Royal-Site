// public/js/env/environment.js
//
// Cinematic full-page background for the SRT Royal homepage: a layered
// sky + procedural cloud + parallax mountain scene rendered with Three.js,
// fixed behind every section. Each major section is now translucent
// (see .about-section / .skills-section / etc. in style.css) so the scene
// shows through consistently as the page scrolls, and the scene's "mood"
// (fog color, cloud tint, camera height) shifts per section.
//
// Design decisions (documented on purpose, not hidden):
//  - Driven by native window scroll + GSAP ScrollTrigger, NOT a smooth-scroll
//    library like Lenis. The site already has working scroll-based code
//    (navbar state, back-to-top, reveal-on-scroll, anchor smooth-scroll) —
//    hijacking native scroll risked breaking all of that. ScrollTrigger
//    works fine on top of native scrolling.
//  - Section backgrounds were made translucent (~92% opacity) rather than
//    fully transparent, so text contrast barely changes versus before —
//    the environment reads as an ambient presence, not a distraction.
//  - Falls back silently to the existing static CSS backgrounds if WebGL
//    isn't available, so there's no broken/blank state on old devices.

import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';

(function initRoyalEnvironment() {
  const canvas = document.getElementById('royalEnvCanvas');
  if (!canvas || !window.WebGLRenderingContext) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = window.innerWidth < 820;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !isMobile, powerPreference: 'low-power' });
  } catch (e) {
    return; // No WebGL — keep the existing CSS backgrounds as-is.
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
  camera.position.set(0, 0.6, 8);

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.3 : 2));

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);

  // ── SKY: navy → royal-gold gradient dome ──────────────────────────
  const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {
        uTop: { value: new THREE.Color('#0a0f1e') },
        uBottom: { value: new THREE.Color('#1a2750') },
        uGold: { value: new THREE.Color('#ffd700') }
      },
      vertexShader: `
        varying vec3 vPos;
        void main() {
          vPos = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        varying vec3 vPos;
        uniform vec3 uTop, uBottom, uGold;
        void main() {
          float h = normalize(vPos).y * 0.5 + 0.5;
          vec3 col = mix(uBottom, uTop, pow(h, 0.7));
          float glow = smoothstep(0.0, 0.35, 0.18 - abs(h - 0.18));
          col = mix(col, uGold, glow * 0.16);
          gl_FragColor = vec4(col, 1.0);
        }`
    });
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), skyMat));

  // ── CLOUDS: layered procedural (fbm noise) planes ─────────────────
  const cloudVert = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`;
  const cloudFrag = `
    varying vec2 vUv;
    uniform float uTime;
    uniform float uOpacity;
    uniform float uScale;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(41.3,289.1))) * 43758.5453); }
    float noise(vec2 p){
      vec2 i = floor(p), f = fract(p);
      float a = hash(i), b = hash(i + vec2(1.0,0.0));
      float c = hash(i + vec2(0.0,1.0)), d = hash(i + vec2(1.0,1.0));
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(a,b,u.x) + (c-a)*u.y*(1.0-u.x) + (d-b)*u.x*u.y;
    }
    float fbm(vec2 p){
      float v = 0.0, amp = 0.55;
      for (int i = 0; i < 5; i++) { v += amp * noise(p); p *= 2.02; amp *= 0.55; }
      return v;
    }
    void main() {
      vec2 p = vUv * uScale + vec2(uTime, uTime * 0.35);
      float n = fbm(p);
      float shape = smoothstep(0.42, 0.75, n);
      float fade = smoothstep(0.0, 0.18, vUv.x) * smoothstep(1.0, 0.82, vUv.x)
                 * smoothstep(0.0, 0.25, vUv.y) * smoothstep(1.0, 0.55, vUv.y);
      float alpha = shape * fade * uOpacity;
      vec3 color = mix(vec3(0.55,0.58,0.72), vec3(1.0,0.98,0.9), shape * 0.4);
      gl_FragColor = vec4(color, alpha);
    }`;

  const cloudLayers = [];
  const layerCount = isMobile ? 2 : 4;
  for (let i = 0; i < layerCount; i++) {
    const depth = -4 - i * 3.2;
    const size = 14 + i * 6;
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      vertexShader: cloudVert,
      fragmentShader: cloudFrag,
      uniforms: {
        uTime: { value: Math.random() * 10 },
        uOpacity: { value: 0.5 - i * 0.08 },
        uScale: { value: 2.2 + i * 0.6 }
      }
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size * 0.55), mat);
    mesh.position.set((Math.random() - 0.5) * 4, 1.2 + i * 0.6, depth);
    scene.add(mesh);
    cloudLayers.push({ mat, speed: 0.015 + i * 0.008 });
  }

  // ── DISTANT RIDGES: two parallax silhouette layers ────────────────
  function makeRidge(z, color, amp, opacity) {
    const pts = [];
    const segs = 20;
    for (let i = 0; i <= segs; i++) {
      const x = (i / segs - 0.5) * 26;
      const y = -2.4 + Math.sin(i * 0.7) * amp * 0.5 + Math.cos(i * 1.3) * amp * 0.3;
      pts.push(new THREE.Vector2(x, y));
    }
    pts.push(new THREE.Vector2(13, -8), new THREE.Vector2(-13, -8));
    const geo = new THREE.ShapeGeometry(new THREE.Shape(pts));
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity }));
    mesh.position.z = z;
    scene.add(mesh);
    return mesh;
  }
  makeRidge(-9, 0x101a38, 1.1, 0.85);
  const ridgeNear = makeRidge(-6, 0x0a0f1e, 1.6, 0.95);

  scene.fog = new THREE.Fog(0x0a0f1e, 6, 22);
  resize();

  // ── MOUSE PARALLAX (desktop + motion allowed only) ────────────────
  const mouseTarget = { x: 0, y: 0 };
  const mouseCurrent = { x: 0, y: 0 };
  if (!isMobile && !prefersReducedMotion) {
    window.addEventListener('mousemove', (e) => {
      mouseTarget.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseTarget.y = (e.clientY / window.innerHeight - 0.5) * 2;
    });
  }

  // ── SCROLL: full-page progress + per-section "mood" targets ───────
  // Each mood nudges fog color, sky tone and gold-glow strength so every
  // section feels like a distinct but continuous part of the same world.
  const moods = {
    home:         { fog: '#0a0f1e', top: '#0a0f1e', bottom: '#1a2750', gold: 0.16 },
    about:        { fog: '#0c1224', top: '#0c1224', bottom: '#161f3c', gold: 0.14 },
    skills:       { fog: '#0a0f1e', top: '#0a0f1e', bottom: '#141c35', gold: 0.12 },
    portfolio:    { fog: '#05070f', top: '#05070f', bottom: '#0f1628', gold: 0.20 },
    services:     { fog: '#0a0f1e', top: '#0a0f1e', bottom: '#1a2750', gold: 0.16 },
    'why-us':     { fog: '#0c1224', top: '#0c1224', bottom: '#161f3c', gold: 0.14 },
    testimonials: { fog: '#150f08', top: '#150f08', bottom: '#2a2110', gold: 0.30 },
    contact:      { fog: '#1a1206', top: '#1a1206', bottom: '#3a2a08', gold: 0.40 }
  };
  const current = {
    fog: new THREE.Color(moods.home.fog),
    top: new THREE.Color(moods.home.top),
    bottom: new THREE.Color(moods.home.bottom),
    gold: moods.home.gold
  };
  const target = { ...current, fog: current.fog.clone(), top: current.top.clone(), bottom: current.bottom.clone() };

  let scrollProgress = 0;
  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    Object.keys(moods).forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      ScrollTrigger.create({
        trigger: el,
        start: 'top 55%',
        end: 'bottom 45%',
        onEnter: () => setTarget(moods[id]),
        onEnterBack: () => setTarget(moods[id])
      });
    });
    ScrollTrigger.create({
      trigger: document.body,
      start: 'top top',
      end: 'max',
      scrub: 0.6,
      onUpdate: (self) => { scrollProgress = self.progress; }
    });
  }
  function setTarget(m) {
    target.fog.set(m.fog);
    target.top.set(m.top);
    target.bottom.set(m.bottom);
    target.gold = m.gold;
  }

  // ── RENDER LOOP ────────────────────────────────────────────────────
  const clock = new THREE.Clock();
  let rafId = null;
  canvas.style.opacity = isMobile ? '0.45' : '0.6';

  function frame() {
    rafId = requestAnimationFrame(frame);
    const t = clock.getElapsedTime();
    cloudLayers.forEach((c) => { c.mat.uniforms.uTime.value = t * c.speed; });

    // Smoothly ease scene colors toward whichever section's mood is active.
    current.fog.lerp(target.fog, 0.02);
    current.top.lerp(target.top, 0.02);
    current.bottom.lerp(target.bottom, 0.02);
    current.gold += (target.gold - current.gold) * 0.02;
    scene.fog.color.copy(current.fog);
    skyMat.uniforms.uTop.value.copy(current.top);
    skyMat.uniforms.uBottom.value.copy(current.bottom);

    mouseCurrent.x += (mouseTarget.x - mouseCurrent.x) * 0.03;
    mouseCurrent.y += (mouseTarget.y - mouseCurrent.y) * 0.03;
    camera.position.x = mouseCurrent.x * 0.35;
    // Gentle continuous forward drift the full length of the page, easing
    // back and forth slightly rather than dollying indefinitely into the ridges.
    const breathe = Math.sin(scrollProgress * Math.PI * 3) * 0.6;
    camera.position.y = 0.6 - mouseCurrent.y * 0.2 + breathe * 0.15;
    camera.position.z = 8 - breathe;
    camera.lookAt(0, 0.3, -6);
    ridgeNear.position.y = breathe * 0.1;

    renderer.render(scene, camera);
  }

  if (prefersReducedMotion) {
    // Accessibility: no camera motion, no cloud drift, no mouse tracking —
    // just one calm, still frame of the same scene.
    renderer.render(scene, camera);
  } else {
    frame();
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { cancelAnimationFrame(rafId); }
      else { frame(); }
    });
  }
})();
