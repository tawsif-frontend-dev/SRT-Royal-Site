// public/js/env/environment.js
//
// Cinematic hero background for the SRT Royal homepage: a layered
// sky + procedural cloud + parallax mountain scene rendered with Three.js,
// confined to the hero's text column so the rest of the site (and the
// hero photo) are completely untouched.
//
// Design decisions (documented on purpose, not hidden):
//  - Scoped to the HERO only, not the whole site. Persisting a translucent
//    3D backdrop behind every section would require making every section's
//    background translucent too, which is a much bigger visual-hierarchy
//    change that needs its own review rather than a blind global edit.
//  - Driven by native window scroll + GSAP ScrollTrigger, NOT a smooth-scroll
//    library like Lenis. The site already has working scroll-based code
//    (navbar state, back-to-top, reveal-on-scroll, anchor smooth-scroll) —
//    hijacking native scroll risked breaking all of that. ScrollTrigger
//    works fine on top of native scrolling.
//  - Falls back silently to the existing static CSS hero background
//    (hero-bg-pattern / gradients already in the markup) if WebGL isn't
//    available, so there's no broken/blank state on old devices.

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
    return; // No WebGL — keep the existing CSS hero background as-is.
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
  camera.position.set(0, 0.6, 8);

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.3 : 2));

  function resize() {
    const parent = canvas.parentElement;
    const w = parent ? parent.clientWidth : window.innerWidth;
    const h = parent ? parent.clientHeight : window.innerHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);

  // ── SKY: navy → royal-gold gradient dome ──────────────────────────
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(50, 32, 16),
    new THREE.ShaderMaterial({
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
    })
  );
  scene.add(sky);

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

  // ── SCROLL-DRIVEN CAMERA DOLLY (native scroll + GSAP ScrollTrigger) ──
  let scrollProgress = 0;
  if (!prefersReducedMotion && window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    const heroSection = document.getElementById('home');
    if (heroSection) {
      ScrollTrigger.create({
        trigger: heroSection,
        start: 'top top',
        end: 'bottom top',
        scrub: 0.6,
        onUpdate: (self) => { scrollProgress = self.progress; }
      });
    }
  }

  // ── RENDER LOOP ────────────────────────────────────────────────────
  const clock = new THREE.Clock();
  let rafId = null;

  function frame() {
    rafId = requestAnimationFrame(frame);
    const t = clock.getElapsedTime();
    cloudLayers.forEach((c) => { c.mat.uniforms.uTime.value = t * c.speed; });

    mouseCurrent.x += (mouseTarget.x - mouseCurrent.x) * 0.03;
    mouseCurrent.y += (mouseTarget.y - mouseCurrent.y) * 0.03;
    camera.position.x = mouseCurrent.x * 0.35;
    camera.position.y = 0.6 - mouseCurrent.y * 0.2;
    camera.position.z = 8 - scrollProgress * 5.5;
    camera.lookAt(0, 0.3, -6);

    ridgeNear.position.y = -0.4 * scrollProgress;
    canvas.style.opacity = String(Math.max(0, 1 - scrollProgress * 1.15));

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
