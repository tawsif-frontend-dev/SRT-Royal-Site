// public/js/env/config.js
// SRT ROYAL — Cinematic Natural 3D Atmosphere Configuration
// Color palette inspired by deep natural environments (zero photo assets used)

export const PALETTE = {
  deepForest:   '#0B2118',
  deepGreen:    '#123526',
  moss:         '#405C43',
  naturalGreen: '#647A55',
  mutedSky:     '#91B5BD',
  softLight:    '#D7C98C',
  warmSun:      '#CFA85A',
  earthShadow:  '#05120C',
  deepShadow:   '#081A13',
};

export const SECTION_MOODS = {
  home: {
    fog: '#081a13',
    fogNear: 5.5,
    fogFar: 28,
    skyTop: '#07150f',
    skyBottom: '#123526',
    skyHorizon: '#91B5BD',
    sunColor: '#CFA85A',
    sunIntensity: 0.85,
    sunPosition: [5.5, 8.5, -13],
    godrayIntensity: 0.38,
    godrayColor: '#D7C98C',
    ambientColor: '#173627',
    hazeOpacity: 0.45,
    cameraY: 0.7,
  },
  about: {
    fog: '#0a1f16',
    fogNear: 6.5,
    fogFar: 30,
    skyTop: '#0b2118',
    skyBottom: '#163f2e',
    skyHorizon: '#647A55',
    sunColor: '#D7C98C',
    sunIntensity: 0.78,
    sunPosition: [4, 7.5, -12],
    godrayIntensity: 0.32,
    godrayColor: '#D7C98C',
    ambientColor: '#1c3e2d',
    hazeOpacity: 0.40,
    cameraY: 0.9,
  },
  skills: {
    fog: '#0e261c',
    fogNear: 6.0,
    fogFar: 28,
    skyTop: '#0b2118',
    skyBottom: '#214936',
    skyHorizon: '#405C43',
    sunColor: '#CFA85A',
    sunIntensity: 0.82,
    sunPosition: [-3.5, 8, -12.5],
    godrayIntensity: 0.34,
    godrayColor: '#CFA85A',
    ambientColor: '#204732',
    hazeOpacity: 0.42,
    cameraY: 0.6,
  },
  portfolio: {
    fog: '#061510',
    fogNear: 5.0,
    fogFar: 26,
    skyTop: '#06140e',
    skyBottom: '#102d21',
    skyHorizon: '#91B5BD',
    sunColor: '#CFA85A',
    sunIntensity: 0.95,
    sunPosition: [5, 7.5, -14],
    godrayIntensity: 0.48,
    godrayColor: '#D7C98C',
    ambientColor: '#19392b',
    hazeOpacity: 0.50,
    cameraY: 0.8,
  },
  services: {
    fog: '#0a2218',
    fogNear: 6.5,
    fogFar: 30,
    skyTop: '#0b2118',
    skyBottom: '#194230',
    skyHorizon: '#647A55',
    sunColor: '#D7C98C',
    sunIntensity: 0.80,
    sunPosition: [3.5, 8, -12],
    godrayIntensity: 0.35,
    godrayColor: '#D7C98C',
    ambientColor: '#1e4431',
    hazeOpacity: 0.40,
    cameraY: 0.7,
  },
  'why-us': {
    fog: '#0e271c',
    fogNear: 6.5,
    fogFar: 29,
    skyTop: '#0d241a',
    skyBottom: '#214c38',
    skyHorizon: '#405C43',
    sunColor: '#CFA85A',
    sunIntensity: 0.84,
    sunPosition: [-3, 7.8, -12],
    godrayIntensity: 0.36,
    godrayColor: '#CFA85A',
    ambientColor: '#224a35',
    hazeOpacity: 0.42,
    cameraY: 0.65,
  },
  testimonials: {
    fog: '#152918',
    fogNear: 5.8,
    fogFar: 26,
    skyTop: '#102113',
    skyBottom: '#2b4724',
    skyHorizon: '#D7C98C',
    sunColor: '#CFA85A',
    sunIntensity: 1.15,
    sunPosition: [2, 8.5, -11],
    godrayIntensity: 0.62,
    godrayColor: '#D7C98C',
    ambientColor: '#2f4b27',
    hazeOpacity: 0.46,
    cameraY: 0.85,
  },
  contact: {
    fog: '#172712',
    fogNear: 5.5,
    fogFar: 24,
    skyTop: '#111f0e',
    skyBottom: '#34451b',
    skyHorizon: '#CFA85A',
    sunColor: '#CFA85A',
    sunIntensity: 1.25,
    sunPosition: [0, 8, -10],
    godrayIntensity: 0.72,
    godrayColor: '#CFA85A',
    ambientColor: '#36471e',
    hazeOpacity: 0.48,
    cameraY: 0.7,
  },
  footer: {
    fog: '#081a13',
    fogNear: 6.0,
    fogFar: 28,
    skyTop: '#06140e',
    skyBottom: '#123526',
    skyHorizon: '#405C43',
    sunColor: '#CFA85A',
    sunIntensity: 0.72,
    sunPosition: [4, 7, -14],
    godrayIntensity: 0.28,
    godrayColor: '#D7C98C',
    ambientColor: '#173627',
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
