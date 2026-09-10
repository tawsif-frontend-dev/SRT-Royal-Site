// public/js/royalEnv.js
// SRT ROYAL — Three.js environment entry point
// This script sets up the Three.js scene, renderer, camera, and procedural visual subsystems.
// It is loaded via a module script tag in index.html and attaches the canvas with id 'royalEnvCanvas'.

import { PALETTE, SECTION_MOODS, getDeviceProfile } from './env/config.js';
import { createSkyAtmosphere } from './env/skyAtmosphere.js';
import { createLightSystem } from './env/lightSystem.js';
import { createDepthLayers } from './env/depthLayers.js';
import { createParticleSystem } from './env/particles.js';
import { createAtmosphericMist } from './env/clouds.js';
import { createCameraController } from './env/cameraController.js';
import { createInteractionController } from './env/interaction.js';

(async function initRoyalEnvironment() {
  const canvas = document.getElementById('royalEnvCanvas');
  if (!canvas) return;

  const profile = getDeviceProfile();

  // WebGL support check
  function isWebGLSupported() {
    try {
      const testCanvas = document.createElement('canvas');
      return !!(
        window.WebGLRenderingContext &&
        (testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl'))
      );
    } catch (e) {
      return false;
    }
  }

  function activateCSSFallback() {
    document.body.classList.add('webgl-fallback-active');
    if (canvas) canvas.style.display = 'none';
    console.info('SRT Royal: WebGL unavailable or disabled. Activating procedural CSS fallback.');
  }

  if (!isWebGLSupported()) {
    activateCSSFallback();
    return;
  }

  // Load Three.js (local vendor fallback, then CDN)
  let THREE;
  try {
    THREE = await import('../vendor/three.module.js');
  } catch (e1) {
    try {
      THREE = await import('https://unpkg.com/three@0.186.0/build/three.module.js');
    } catch (e2) {
      activateCSSFallback();
      return;
    }
  }

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: profile.antialias,
      powerPreference: 'high-performance',
      stencil: false,
    });
  } catch (err) {
    activateCSSFallback();
    return;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, profile.maxDPR));
  renderer.setSize(window.innerWidth, window.innerHeight, false);

  const scene = new THREE.Scene();

  // Initialize fog with home mood
  const initialMood = SECTION_MOODS.home;
  scene.fog = new THREE.Fog(initialMood.fog, initialMood.fogNear, initialMood.fogFar);

  // Subsystems
  const cameraController = createCameraController(THREE, window.innerWidth, window.innerHeight);
  const skyAtmosphere = createSkyAtmosphere(THREE, scene);
  const lightSystem = createLightSystem(THREE, scene, profile);
  const depthLayers = createDepthLayers(THREE, scene, profile);
  const particleSystem = createParticleSystem(THREE, scene, profile);
  const atmosphericMist = createAtmosphericMist(THREE, scene, profile);

  // Mood state
  const currentMood = {
    fog: new THREE.Color(initialMood.fog),
    skyTop: new THREE.Color(initialMood.skyTop),
    skyBottom: new THREE.Color(initialMood.skyBottom),
    skyHorizon: new THREE.Color(initialMood.skyHorizon),
    sunColor: new THREE.Color(initialMood.sunColor),
    sunIntensity: initialMood.sunIntensity,
    sunPosition: [...initialMood.sunPosition],
    godrayIntensity: initialMood.godrayIntensity,
    godrayColor: new THREE.Color(initialMood.godrayColor),
    ambientColor: new THREE.Color(initialMood.ambientColor),
    hazeOpacity: initialMood.hazeOpacity,
    cameraY: initialMood.cameraY,
  };

  const targetMood = {
    ...currentMood,
    fog: currentMood.fog.clone(),
    skyTop: currentMood.skyTop.clone(),
    skyBottom: currentMood.skyBottom.clone(),
    skyHorizon: currentMood.skyHorizon.clone(),
    sunColor: currentMood.sunColor.clone(),
    godrayColor: currentMood.godrayColor.clone(),
    ambientColor: currentMood.ambientColor.clone(),
    sunPosition: [...currentMood.sunPosition],
  };

  function setMood(m) {
    targetMood.fog.set(m.fog);
    targetMood.skyTop.set(m.skyTop);
    targetMood.skyBottom.set(m.skyBottom);
    targetMood.skyHorizon.set(m.skyHorizon);
    targetMood.sunColor.set(m.sunColor);
    targetMood.sunIntensity = m.sunIntensity;
    targetMood.sunPosition = [...m.sunPosition];
    targetMood.godrayIntensity = m.godrayIntensity;
    targetMood.godrayColor.set(m.godrayColor);
    targetMood.ambientColor.set(m.ambientColor);
    targetMood.hazeOpacity = m.hazeOpacity;
    targetMood.cameraY = m.cameraY;
  }

  const interactionController = createInteractionController(
    profile,
    SECTION_MOODS,
    (mood) => setMood(mood)
  );

  function handleResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    cameraController.resize(w, h);
  }
  window.addEventListener('resize', handleResize, { passive: true });

  const clock = new THREE.Clock();
  let animationFrameId = null;
  let isRunning = true;

  function renderFrame() {
    if (!isRunning) return;
    animationFrameId = requestAnimationFrame(renderFrame);
    const time = clock.getElapsedTime();
    const lerpFactor = 0.025;

    // Interpolate colors
    currentMood.fog.lerp(targetMood.fog, lerpFactor);
    scene.fog.color.copy(currentMood.fog);

    interactionController.update();
    const scrollProgress = interactionController.getScrollProgress();
    const mouseCurrent = interactionController.mouseCurrent;

    cameraController.update(time, scrollProgress, mouseCurrent, targetMood, profile.prefersReducedMotion);

    skyAtmosphere.update(time, currentMood, targetMood, lerpFactor);
    lightSystem.update(time, currentMood, targetMood, lerpFactor);
    depthLayers.update(time, scrollProgress, mouseCurrent, targetMood, lerpFactor);
    particleSystem.update(time, mouseCurrent);
    atmosphericMist.update(time, targetMood, lerpFactor);

    renderer.render(scene, cameraController.camera);
  }

  if (profile.prefersReducedMotion) {
    renderer.render(scene, cameraController.camera);
  } else {
    renderFrame();
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      isRunning = false;
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    } else {
      if (!profile.prefersReducedMotion) {
        isRunning = true;
        clock.getDelta();
        renderFrame();
      }
    }
  });

  window.srtEnvironment = {
    setMood,
    getMood: () => currentMood,
    profile,
    dispose: () => {
      isRunning = false;
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      skyAtmosphere.dispose();
      lightSystem.dispose();
      depthLayers.dispose();
      particleSystem.dispose();
      atmosphericMist.dispose();
      interactionController.dispose();
      renderer.dispose();
    },
  };
})();
