// public/js/env/config.js
// SRT ROYAL — Cinematic Natural 3D Atmosphere Configuration
// Color palette inspired by deep natural environments (zero photo assets used)

export const PALETTE = {
  deepForest:   '#1b1a19',
  deepGreen:    '#2a2928',
  moss:         '#4f4e4d',
  naturalGreen: '#6b6a69',
  mutedSky:     '#a2a1a0',
  softLight:    '#b9b8b7',
  warmSun:      '#9f9e9d',
  earthShadow:  '#0f0e0d',
  deepShadow:   '#151413',
};

export const SECTION_MOODS = {
  home: {
    fog: '#151413',
    fogNear: 5.5,
    fogFar: 28,
    skyTop: '#121110',
    skyBottom: '#2a2928',
    skyHorizon: '#a2a1a0',
    sunColor: '#9f9e9d',
    sunIntensity: 0.85,
    sunPosition: [5.5, 8.5, -13],
    godrayIntensity: 0.38,
    godrayColor: '#b9b8b7',
    ambientColor: '#2c2b2a',
    hazeOpacity: 0.45,
    cameraY: 0.7,
  },
  about: {
    fog: '#191817',
    fogNear: 6.5,
    fogFar: 30,
    skyTop: '#1b1a19',
    skyBottom: '#323130',
    skyHorizon: '#6b6a69',
    sunColor: '#b9b8b7',
    sunIntensity: 0.78,
    sunPosition: [4, 7.5, -12],
    godrayIntensity: 0.32,
    godrayColor: '#b9b8b7',
    ambientColor: '#333231',
    hazeOpacity: 0.40,
    cameraY: 0.9,
  },
  skills: {
    fog: '#1f1e1d',
    fogNear: 6.0,
    fogFar: 28,
    skyTop: '#1b1a19',
    skyBottom: '#3c3b3a',
    skyHorizon: '#4f4e4d',
    sunColor: '#9f9e9d',
    sunIntensity: 0.82,
    sunPosition: [-3.5, 8, -12.5],
    godrayIntensity: 0.34,
    godrayColor: '#9f9e9d',
    ambientColor: '#3a3938',
    hazeOpacity: 0.42,
    cameraY: 0.6,
  },
  portfolio: {
    fog: '#121110',
    fogNear: 5.0,
    fogFar: 26,
    skyTop: '#11100f',
    skyBottom: '#242322',
    skyHorizon: '#a2a1a0',
    sunColor: '#9f9e9d',
    sunIntensity: 0.95,
    sunPosition: [5, 7.5, -14],
    godrayIntensity: 0.48,
    godrayColor: '#b9b8b7',
    ambientColor: '#2f2e2d',
    hazeOpacity: 0.50,
    cameraY: 0.8,
  },
  services: {
    fog: '#1b1a19',
    fogNear: 6.5,
    fogFar: 30,
    skyTop: '#1b1a19',
    skyBottom: '#353433',
    skyHorizon: '#6b6a69',
    sunColor: '#b9b8b7',
    sunIntensity: 0.80,
    sunPosition: [3.5, 8, -12],
    godrayIntensity: 0.35,
    godrayColor: '#b9b8b7',
    ambientColor: '#373635',
    hazeOpacity: 0.40,
    cameraY: 0.7,
  },
  'why-us': {
    fog: '#201f1e',
    fogNear: 6.5,
    fogFar: 29,
    skyTop: '#1d1c1b',
    skyBottom: '#3e3d3c',
    skyHorizon: '#4f4e4d',
    sunColor: '#9f9e9d',
    sunIntensity: 0.84,
    sunPosition: [-3, 7.8, -12],
    godrayIntensity: 0.36,
    godrayColor: '#9f9e9d',
    ambientColor: '#3c3b3a',
    hazeOpacity: 0.42,
    cameraY: 0.65,
  },
  testimonials: {
    fog: '#222120',
    fogNear: 5.8,
    fogFar: 26,
    skyTop: '#1c1b1a',
    skyBottom: '#3b3a39',
    skyHorizon: '#b9b8b7',
    sunColor: '#9f9e9d',
    sunIntensity: 1.15,
    sunPosition: [2, 8.5, -11],
    godrayIntensity: 0.62,
    godrayColor: '#b9b8b7',
    ambientColor: '#3f3e3d',
    hazeOpacity: 0.46,
    cameraY: 0.85,
  },
  contact: {
    fog: '#21201f',
    fogNear: 5.5,
    fogFar: 24,
    skyTop: '#1a1918',
    skyBottom: '#3b3a39',
    skyHorizon: '#9f9e9d',
    sunColor: '#9f9e9d',
    sunIntensity: 1.25,
    sunPosition: [0, 8, -10],
    godrayIntensity: 0.72,
    godrayColor: '#9f9e9d',
    ambientColor: '#3d3c3b',
    hazeOpacity: 0.48,
    cameraY: 0.7,
  },
  footer: {
    fog: '#151413',
    fogNear: 6.0,
    fogFar: 28,
    skyTop: '#11100f',
    skyBottom: '#2a2928',
    skyHorizon: '#4f4e4d',
    sunColor: '#9f9e9d',
    sunIntensity: 0.72,
    sunPosition: [4, 7, -14],
    godrayIntensity: 0.28,
    godrayColor: '#b9b8b7',
    ambientColor: '#2c2b2a',
    hazeOpacity: 0.40,
    cameraY: 0.6,
  },
};

export function getDeviceProfile() {
  const isMobile = window.innerWidth < 820;
  const isTablet = window.innerWidth >= 820 && window.innerWidth < 1080;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cores = navigator.hardwareConcurrency || 4;

  let tier = 'high';
  if (isMobile || cores <= 2) {
    tier = 'low';
  } else if (isTablet || cores <= 4) {
    tier = 'mid';
  }

  const particleCount = {
    high: 220,
    mid: 110,
    low: 45,
  }[tier];

  const cloudLayers = {
    high: 4,
    mid: 3,
    low: 2,
  }[tier];

  const maxDPR = isMobile ? 1.25 : (tier === 'high' ? 1.8 : 1.4);

  return {
    isMobile,
    isTablet,
    prefersReducedMotion,
    tier,
    particleCount: prefersReducedMotion ? 0 : particleCount,
    cloudLayers,
    maxDPR,
    antialias: tier !== 'low' && !isMobile,
  };
}
