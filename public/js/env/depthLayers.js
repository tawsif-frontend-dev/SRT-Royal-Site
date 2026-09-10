// public/js/env/depthLayers.js
// Multi-layered procedural natural canopy silhouettes and atmospheric depth planes
// Creates majestic environmental depth using pure vector shapes and shaders — ZERO photographs

export function createDepthLayers(THREE, scene, deviceProfile) {
  const group = new THREE.Group();
  scene.add(group);

  const meshes = [];
  const geometries = [];
  const materials = [];

  // Helper to generate an organic multi-harmonic natural canopy silhouette curve
  function makeCanopyShape(width, height, segments, harmonics) {
    const shape = new THREE.Shape();
    const halfW = width * 0.5;

    // Start at bottom-left
    shape.moveTo(-halfW, -height);
    shape.lineTo(-halfW, 0);

    for (let i = 0; i <= segments; i++) {
      const u = i / segments;
      const x = -halfW + u * width;

      // Harmonic natural profile (simulates tree crowns and undulating forest ridge)
      let y = 0;
      harmonics.forEach(({ freq, amp, phase }) => {
        y += Math.sin(u * freq * Math.PI * 2 + phase) * amp;
        y += Math.cos(u * freq * 1.6 * Math.PI + phase * 0.5) * (amp * 0.45);
      });

      shape.lineTo(x, y);
    }

    shape.lineTo(halfW, -height);
    shape.closePath();
    return shape;
  }

  // 1. Far Mountain / Distant Ridge (Z: -16)
  const farShape = makeCanopyShape(60, 16, 40, [
    { freq: 1.2, amp: 1.6, phase: 0.2 },
    { freq: 2.8, amp: 0.9, phase: 1.5 },
    { freq: 5.5, amp: 0.4, phase: 2.8 },
  ]);
  const farGeo = new THREE.ShapeGeometry(farShape);
  geometries.push(farGeo);
  const farMat = new THREE.MeshBasicMaterial({
    color: 0x0e241b,
    transparent: true,
    opacity: 0.82,
  });
  materials.push(farMat);
  const farMesh = new THREE.Mesh(farGeo, farMat);
  farMesh.position.set(0, -2.2, -16);
  group.add(farMesh);
  meshes.push({
    mesh: farMesh,
    baseY: -2.2,
    baseZ: -16,
    parallaxY: 0.08,
    parallaxX: 0.04,
    colorKey: 'far',
  });

  // 2. Mid Canopy Ridge (Z: -11)
  const midShape = makeCanopyShape(46, 14, 48, [
    { freq: 2.2, amp: 1.4, phase: 0.8 },
    { freq: 4.6, amp: 0.8, phase: 2.1 },
    { freq: 8.4, amp: 0.35, phase: 0.4 },
  ]);
  const midGeo = new THREE.ShapeGeometry(midShape);
  geometries.push(midGeo);
  const midMat = new THREE.MeshBasicMaterial({
    color: 0x091e15,
    transparent: true,
    opacity: 0.92,
  });
  materials.push(midMat);
  const midMesh = new THREE.Mesh(midGeo, midMat);
  midMesh.position.set(0, -2.6, -11);
  group.add(midMesh);
  meshes.push({
    mesh: midMesh,
    baseY: -2.6,
    baseZ: -11,
    parallaxY: 0.16,
    parallaxX: 0.09,
    colorKey: 'mid',
  });

  // 3. Near Forest Crown Silhouette (Z: -6.5)
  const nearShape = makeCanopyShape(34, 12, 54, [
    { freq: 3.1, amp: 1.1, phase: 1.2 },
    { freq: 6.2, amp: 0.65, phase: 3.0 },
    { freq: 11.5, amp: 0.28, phase: 1.1 },
  ]);
  const nearGeo = new THREE.ShapeGeometry(nearShape);
  geometries.push(nearGeo);
  const nearMat = new THREE.MeshBasicMaterial({
    color: 0x06140e,
    transparent: true,
    opacity: 0.98,
  });
  materials.push(nearMat);
  const nearMesh = new THREE.Mesh(nearGeo, nearMat);
  nearMesh.position.set(0, -2.9, -6.5);
  group.add(nearMesh);
  meshes.push({
    mesh: nearMesh,
    baseY: -2.9,
    baseZ: -6.5,
    parallaxY: 0.28,
    parallaxX: 0.16,
    colorKey: 'near',
  });

  // 4. Soft Depth Diffuser Plane (Z: -8.8) — soft atmospheric foliage blur
  const diffuserGeo = new THREE.PlaneGeometry(36, 12);
  geometries.push(diffuserGeo);
  const diffuserMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uColor: { value: new THREE.Color('#123526') },
      uOpacity: { value: 0.35 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform vec3 uColor;
      uniform float uOpacity;
      void main() {
        float h = smoothstep(0.0, 0.45, vUv.y) * smoothstep(1.0, 0.55, vUv.y);
        float w = smoothstep(0.0, 0.15, vUv.x) * smoothstep(1.0, 0.85, vUv.x);
        gl_FragColor = vec4(uColor, h * w * uOpacity);
      }
    `,
  });
  materials.push(diffuserMat);
  const diffuserMesh = new THREE.Mesh(diffuserGeo, diffuserMat);
  diffuserMesh.position.set(0, -1.8, -8.8);
  group.add(diffuserMesh);

  function update(time, scrollProgress, mouseCurrent, targetMood, lerpFactor = 0.03) {
    // Parallax displacement based on mouse and scroll
    meshes.forEach((item) => {
      const scrollOffset = scrollProgress * 1.8 * item.parallaxY;
      const mouseOffsetY = mouseCurrent.y * 0.4 * item.parallaxY;
      const mouseOffsetX = mouseCurrent.x * 0.6 * item.parallaxX;

      // Gentle natural breathing drift
      const breathe = Math.sin(time * 0.3 + item.baseZ) * 0.04;

      item.mesh.position.y = item.baseY + scrollOffset - mouseOffsetY + breathe;
      item.mesh.position.x = mouseOffsetX;
    });

    // Update diffuser color tint towards current section
    diffuserMat.uniforms.uColor.value.lerp(targetMood.ambientColor, lerpFactor);
  }

  function dispose() {
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    scene.remove(group);
  }

  return { group, update, dispose };
}
