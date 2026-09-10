// public/js/env/cameraController.js
// Cinematic camera controller: multi-axis dollying, altitude drift,
// restrained responsive mouse pitch/yaw, and continuous natural breathing

export function createCameraController(THREE, initialWidth, initialHeight) {
  const camera = new THREE.PerspectiveCamera(54, initialWidth / initialHeight, 0.1, 100);

  const basePos = { x: 0, y: 0.7, z: 7.6 };
  const currentPos = { ...basePos };
  const targetPos = { ...basePos };

  const currentLookAt = new THREE.Vector3(0, 0.25, -6.5);
  const targetLookAt = new THREE.Vector3(0, 0.25, -6.5);

  camera.position.set(currentPos.x, currentPos.y, currentPos.z);
  camera.lookAt(currentLookAt);

  function resize(width, height) {
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function update(time, scrollProgress, mouseCurrent, targetMood, prefersReducedMotion) {
    if (prefersReducedMotion) {
      camera.position.set(0, 0.7, 7.6);
      camera.lookAt(0, 0.25, -6.5);
      return;
    }

    // Organic scroll dollying: gently glides forward and breathes through the environment
    const scrollDolly = Math.sin(scrollProgress * Math.PI * 2.5) * 0.75;
    const naturalBreathing = Math.sin(time * 0.4) * 0.05;

    // Target altitude from section mood
    const sectionTargetY = targetMood.cameraY ?? 0.7;

    // Mouse parallax influence (restrained)
    targetPos.x = mouseCurrent.x * 0.36;
    targetPos.y = sectionTargetY - mouseCurrent.y * 0.22 + naturalBreathing;
    targetPos.z = basePos.z - scrollDolly;

    // Look target
    targetLookAt.x = mouseCurrent.x * 0.18;
    targetLookAt.y = 0.22 - mouseCurrent.y * 0.12 + naturalBreathing * 0.5;
    targetLookAt.z = -6.5;

    // Smooth lerp
    currentPos.x += (targetPos.x - currentPos.x) * 0.04;
    currentPos.y += (targetPos.y - currentPos.y) * 0.04;
    currentPos.z += (targetPos.z - currentPos.z) * 0.04;

    currentLookAt.lerp(targetLookAt, 0.04);

    camera.position.set(currentPos.x, currentPos.y, currentPos.z);
    camera.lookAt(currentLookAt);
  }

  return { camera, resize, update };
}
