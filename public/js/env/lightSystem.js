// public/js/env/lightSystem.js
// Procedural natural sunlight system: warm filtered directional light,
// ambient foliage bounce, and subtle procedural volumetric sun shafts (godrays)

export function createLightSystem(THREE, scene, deviceProfile) {
  // Ambient natural bounce light (soft deep moss/forest tone)
  const ambientLight = new THREE.AmbientLight('#173627', 1.2);
  scene.add(ambientLight);

  // Directional sun light
  const sunLight = new THREE.DirectionalLight('#CFA85A', 1.0);
  sunLight.position.set(5.5, 8.5, -13);
  scene.add(sunLight);

  // Subtle volumetric godray / sunbeam planes (filtered light through canopy)
  const godrayGroup = new THREE.Group();
  scene.add(godrayGroup);

  const godrayUniforms = {
    uTime:      { value: 0 },
    uColor:     { value: new THREE.Color('#D7C98C') },
    uIntensity: { value: 0.38 },
  };

  const godrayVert = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const godrayFrag = `
    varying vec2 vUv;
    uniform float uTime;
    uniform vec3 uColor;
    uniform float uIntensity;

    // Organic procedural noise for sunbeam striation
    float hash(float n) { return fract(sin(n) * 43758.5453123); }
    float noise1D(float x) {
      float i = floor(x);
      float f = fract(x);
      return mix(hash(i), hash(i + 1.0), f * f * (3.0 - 2.0 * f));
    }

    void main() {
      // Beam flows along vUv.y (1.0 = near sun origin, 0.0 = dissipated at ground)
      float lengthFalloff = pow(vUv.y, 1.4);
      
      // Soft horizontal beam boundaries
      float edgeFalloff = sin(vUv.x * 3.141592);
      edgeFalloff = pow(edgeFalloff, 2.0);

      // Organic striation / leafy dapple effect
      float beam1 = noise1D(vUv.x * 12.0 + uTime * 0.15);
      float beam2 = noise1D(vUv.x * 24.0 - uTime * 0.08);
      float rays = mix(beam1, beam2, 0.5) * 0.4 + 0.6;

      float alpha = lengthFalloff * edgeFalloff * rays * uIntensity;
      gl_FragColor = vec4(uColor, alpha);
    }
  `;

  const godrayMat = new THREE.ShaderMaterial({
    vertexShader: godrayVert,
    fragmentShader: godrayFrag,
    uniforms: godrayUniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });

  // Create 3 to 5 subtle angled sun shaft planes radiating from top-right to bottom-left
  const rayCount = deviceProfile.isMobile ? 2 : 4;
  const rayPlanes = [];

  for (let i = 0; i < rayCount; i++) {
    const w = 4.5 + i * 1.5;
    const h = 18 + i * 3.0;
    const geo = new THREE.PlaneGeometry(w, h, 1, 1);
    const mesh = new THREE.Mesh(geo, godrayMat);

    mesh.position.set(
      3.0 + (i - 1.5) * 1.8,
      4.0 - i * 0.5,
      -7.0 - i * 2.2
    );
    // Angle beams organically down into the viewing frustum
    mesh.rotation.z = -0.32 + (i * 0.04);
    mesh.rotation.y = 0.15 - (i * 0.05);

    godrayGroup.add(mesh);
    rayPlanes.push({ mesh, geo, baseZ: mesh.rotation.z });
  }

  function update(time, currentMood, targetMood, lerpFactor = 0.03) {
    godrayUniforms.uTime.value = time;

    // Smooth lighting transitions
    ambientLight.color.lerp(targetMood.ambientColor, lerpFactor);
    sunLight.color.lerp(targetMood.sunColor, lerpFactor);
    sunLight.intensity += (targetMood.sunIntensity - sunLight.intensity) * lerpFactor;

    // Shift sun position smoothly
    sunLight.position.lerp(
      new THREE.Vector3(...targetMood.sunPosition),
      lerpFactor
    );

    // Godray color and intensity
    godrayUniforms.uColor.value.lerp(targetMood.godrayColor, lerpFactor);
    godrayUniforms.uIntensity.value += (targetMood.godrayIntensity - godrayUniforms.uIntensity.value) * lerpFactor;

    // Organic micro-sway of light rays (like gentle wind moving treetops)
    rayPlanes.forEach((rp, idx) => {
      const sway = Math.sin(time * 0.4 + idx * 1.2) * 0.018;
      rp.mesh.rotation.z = rp.baseZ + sway;
    });
  }

  function dispose() {
    scene.remove(ambientLight);
    scene.remove(sunLight);
    rayPlanes.forEach((rp) => {
      rp.geo.dispose();
      godrayGroup.remove(rp.mesh);
    });
    godrayMat.dispose();
    scene.remove(godrayGroup);
  }

  return { ambientLight, sunLight, godrayGroup, update, dispose };
}
