// public/js/env/particles.js
// Procedural atmospheric dust motes and pollen floating in forest sunbeams
// Subtle organic Brownian motion with distance attenuation and soft alpha falloff

export function createParticleSystem(THREE, scene, deviceProfile) {
  const count = deviceProfile.particleCount;
  if (count <= 0) {
    return { update: () => {}, dispose: () => {} };
  }

  const positions = new Float32Array(count * 3);
  const scales = new Float32Array(count);
  const phases = new Float32Array(count);
  const colorMixes = new Float32Array(count);
  const velocities = new Float32Array(count * 3);

  // Distribute particles naturally across the camera viewing volume
  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    positions[i3 + 0] = (Math.random() - 0.5) * 22;   // X
    positions[i3 + 1] = (Math.random() - 0.5) * 12 + 1; // Y
    positions[i3 + 2] = -Math.random() * 16 - 1.0;    // Z

    scales[i] = 0.6 + Math.random() * 0.9;
    phases[i] = Math.random() * Math.PI * 2;
    colorMixes[i] = Math.random(); // 0 = sun gold, 1 = muted sky

    velocities[i3 + 0] = (Math.random() - 0.5) * 0.004;
    velocities[i3 + 1] = 0.002 + Math.random() * 0.005; // gentle upward drift in sunbeams
    velocities[i3 + 2] = (Math.random() - 0.5) * 0.003;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
  geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  geometry.setAttribute('aColorMix', new THREE.BufferAttribute(colorMixes, 1));

  const uniforms = {
    uTime:      { value: 0 },
    uBaseSize:  { value: deviceProfile.isMobile ? 18.0 : 26.0 },
    uGoldColor: { value: new THREE.Color('#D7C98C') },
    uSkyColor:  { value: new THREE.Color('#91B5BD') },
    uOpacity:   { value: 0.55 },
  };

  const vertexShader = `
    attribute float aScale;
    attribute float aPhase;
    attribute float aColorMix;

    uniform float uTime;
    uniform float uBaseSize;

    varying float vAlpha;
    varying float vColorMix;

    void main() {
      vColorMix = aColorMix;

      // Natural gentle wandering drift
      vec3 pos = position;
      float t = uTime * 0.4 + aPhase;
      pos.x += sin(t * 0.7) * 0.25;
      pos.y += cos(t * 0.5) * 0.2;
      pos.z += sin(t * 0.3) * 0.15;

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * mvPosition;

      // Distance attenuation: particles closer to camera appear larger and softer
      gl_PointSize = (uBaseSize * aScale) * (14.0 / -mvPosition.z);
      gl_PointSize = clamp(gl_PointSize, 1.0, 60.0);

      // Organic twinkling in sunlight
      float twinkle = sin(uTime * 1.5 + aPhase * 3.0) * 0.25 + 0.75;
      vAlpha = twinkle;
    }
  `;

  const fragmentShader = `
    uniform vec3 uGoldColor;
    uniform vec3 uSkyColor;
    uniform float uOpacity;

    varying float vAlpha;
    varying float vColorMix;

    void main() {
      // Soft circular point with Gaussian-like falloff
      vec2 coord = gl_PointCoord - vec2(0.5);
      float dist = length(coord);
      if (dist > 0.5) discard;

      float softEdge = smoothstep(0.5, 0.05, dist);
      softEdge = pow(softEdge, 1.6);

      vec3 color = mix(uGoldColor, uSkyColor, vColorMix * 0.4);
      float finalAlpha = softEdge * vAlpha * uOpacity;

      gl_FragColor = vec4(color, finalAlpha);
    }
  `;

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geometry, material);
  scene.add(points);

  function update(time, mouseCurrent) {
    uniforms.uTime.value = time;

    const posAttr = geometry.attributes.position;
    const pos = posAttr.array;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      pos[i3 + 0] += velocities[i3 + 0] + mouseCurrent.x * 0.001;
      pos[i3 + 1] += velocities[i3 + 1] - mouseCurrent.y * 0.001;
      pos[i3 + 2] += velocities[i3 + 2];

      // Volume bounds check with seamless wrapping
      if (pos[i3 + 1] > 7.0) pos[i3 + 1] = -5.0;
      if (pos[i3 + 0] > 11.0) pos[i3 + 0] = -11.0;
      if (pos[i3 + 0] < -11.0) pos[i3 + 0] = 11.0;
      if (pos[i3 + 2] > -1.0) pos[i3 + 2] = -16.0;
      if (pos[i3 + 2] < -16.0) pos[i3 + 2] = -1.0;
    }

    posAttr.needsUpdate = true;
  }

  function dispose() {
    geometry.dispose();
    material.dispose();
    scene.remove(points);
  }

  return { points, update, dispose };
}
