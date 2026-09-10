// public/js/env/skyAtmosphere.js
// Procedural atmospheric sky dome with Rayleigh / Mie forward scatter approximation
// Smoothly blends deep forest shadows, soft muted sky, and warm diffuse sunlight

export function createSkyAtmosphere(THREE, scene) {
  const uniforms = {
    uTopColor:     { value: new THREE.Color('#07150f') },
    uBottomColor:  { value: new THREE.Color('#123526') },
    uHorizonColor: { value: new THREE.Color('#91B5BD') },
    uSunColor:     { value: new THREE.Color('#CFA85A') },
    uSunDir:       { value: new THREE.Vector3(0.3, 0.6, -0.7).normalize() },
    uSunGlow:      { value: 0.85 },
    uHorizonHaze:  { value: 0.45 },
    uTime:         { value: 0 },
  };

  const vertexShader = `
    varying vec3 vWorldPosition;
    varying vec3 vNormal;

    void main() {
      vNormal = normalize(normalMatrix * normal);
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos.xyz;
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `;

  const fragmentShader = `
    uniform vec3 uTopColor;
    uniform vec3 uBottomColor;
    uniform vec3 uHorizonColor;
    uniform vec3 uSunColor;
    uniform vec3 uSunDir;
    uniform float uSunGlow;
    uniform float uHorizonHaze;
    uniform float uTime;

    varying vec3 vWorldPosition;
    varying vec3 vNormal;

    void main() {
      vec3 dir = normalize(vWorldPosition);
      float elevation = dir.y; // -1 to 1

      // Natural vertical gradient: deep canopy base -> atmospheric mid -> deep forest zenith
      float t = clamp(elevation * 0.5 + 0.5, 0.0, 1.0);
      vec3 sky = mix(uBottomColor, uTopColor, pow(t, 0.8));

      // Soft atmospheric horizon haze (simulates humidity and foliage distance)
      float horizonBand = smoothstep(-0.15, 0.35, elevation) * smoothstep(0.7, 0.1, elevation);
      sky = mix(sky, uHorizonColor, horizonBand * uHorizonHaze);

      // Forward Mie scattering toward sun direction
      float sunDot = max(0.0, dot(dir, normalize(uSunDir)));
      float sunGlow = pow(sunDot, 12.0) * 0.45 + pow(sunDot, 64.0) * 0.7;
      sky += uSunColor * sunGlow * uSunGlow;

      // Subtle atmospheric breathing
      float subtleFlicker = sin(uTime * 0.5 + dir.x * 2.0) * 0.015;
      sky += subtleFlicker * uHorizonColor;

      gl_FragColor = vec4(sky, 1.0);
    }
  `;

  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms,
    vertexShader,
    fragmentShader,
    depthWrite: false,
  });

  const geometry = new THREE.SphereGeometry(52, 32, 20);
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  function update(time, currentMood, targetMood, lerpFactor = 0.03) {
    uniforms.uTime.value = time;

    // Smooth color interpolation
    uniforms.uTopColor.value.lerp(targetMood.skyTop, lerpFactor);
    uniforms.uBottomColor.value.lerp(targetMood.skyBottom, lerpFactor);
    uniforms.uHorizonColor.value.lerp(targetMood.skyHorizon, lerpFactor);
    uniforms.uSunColor.value.lerp(targetMood.sunColor, lerpFactor);

    // Sun direction vector interpolation
    const targetDir = new THREE.Vector3(
      targetMood.sunPosition[0],
      targetMood.sunPosition[1],
      targetMood.sunPosition[2]
    ).normalize();
    uniforms.uSunDir.value.lerp(targetDir, lerpFactor);

    uniforms.uSunGlow.value += (targetMood.sunIntensity - uniforms.uSunGlow.value) * lerpFactor;
    uniforms.uHorizonHaze.value += (targetMood.hazeOpacity - uniforms.uHorizonHaze.value) * lerpFactor;
  }

  function dispose() {
    geometry.dispose();
    material.dispose();
    scene.remove(mesh);
  }

  return { mesh, material, update, dispose };
}
