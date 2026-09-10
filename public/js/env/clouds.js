// public/js/env/clouds.js
// Multi-tier procedural atmospheric mist and organic haze planes
// Renders soft natural diffusion using FBM shaders with zero hard edges or blob shapes

export function createAtmosphericMist(THREE, scene, deviceProfile) {
  const group = new THREE.Group();
  scene.add(group);

  const cloudVert = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const cloudFrag = `
    varying vec2 vUv;
    uniform float uTime;
    uniform float uOpacity;
    uniform float uScale;
    uniform vec3 uColorBase;
    uniform vec3 uColorHighlight;

    // Fast 2D procedural noise & FBM
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
        u.y
      );
    }

    float fbm(vec2 p) {
      float v = 0.0;
      float amp = 0.52;
      for (int i = 0; i < 4; i++) {
        v += amp * noise(p);
        p *= 2.03;
        amp *= 0.52;
      }
      return v;
    }

    void main() {
      // Slow organic drift across two axes
      vec2 p = vUv * uScale + vec2(uTime * 0.025, uTime * 0.009);
      float n = fbm(p);

      // Natural soft cloud threshold
      float shape = smoothstep(0.38, 0.74, n);

      // Soft quad feathering: four-sided smooth falloff
      float fadeX = smoothstep(0.0, 0.22, vUv.x) * smoothstep(1.0, 0.78, vUv.x);
      float fadeY = smoothstep(0.0, 0.26, vUv.y) * smoothstep(1.0, 0.65, vUv.y);
      float alpha = shape * fadeX * fadeY * uOpacity;

      // Color gradation between natural sky haze and sunlight highlight
      vec3 col = mix(uColorBase, uColorHighlight, shape * 0.45);

      gl_FragColor = vec4(col, alpha);
    }
  `;

  const layers = [];
  const layerCount = deviceProfile.cloudLayers;

  for (let i = 0; i < layerCount; i++) {
    const depth = -4.5 - i * 3.4;
    const size = 16 + i * 7;

    const uniforms = {
      uTime:           { value: Math.random() * 20 },
      uOpacity:        { value: (0.42 - i * 0.07) * (deviceProfile.isMobile ? 0.7 : 1.0) },
      uScale:          { value: 1.8 + i * 0.5 },
      uColorBase:      { value: new THREE.Color('#91B5BD') },
      uColorHighlight: { value: new THREE.Color('#D7C98C') },
    };

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      vertexShader: cloudVert,
      fragmentShader: cloudFrag,
      uniforms,
    });

    const geo = new THREE.PlaneGeometry(size, size * 0.48);
    const mesh = new THREE.Mesh(geo, mat);

    // Stagger natural altitude and horizontal position
    mesh.position.set(
      (Math.random() - 0.5) * 5,
      1.1 + i * 0.65,
      depth
    );

    group.add(mesh);
    layers.push({
      mesh,
      geo,
      mat,
      uniforms,
      speed: 0.35 + i * 0.18,
    });
  }

  function update(time, targetMood, lerpFactor = 0.03) {
    layers.forEach((layer) => {
      layer.uniforms.uTime.value = time * layer.speed;
      layer.uniforms.uColorBase.value.lerp(targetMood.skyHorizon, lerpFactor);
      layer.uniforms.uColorHighlight.value.lerp(targetMood.godrayColor, lerpFactor);
    });
  }

  function dispose() {
    layers.forEach((layer) => {
      layer.geo.dispose();
      layer.mat.dispose();
      group.remove(layer.mesh);
    });
    scene.remove(group);
  }

  return { group, update, dispose };
}
