import * as THREE from "three";

const canvas = document.querySelector("#signal-canvas");
const stage = canvas?.closest(".signal-stage");
const hero = canvas?.closest(".hero");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (
  canvas instanceof HTMLCanvasElement &&
  stage instanceof HTMLElement &&
  hero instanceof HTMLElement
) {
  let renderer;

  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: window.innerWidth > 640,
      powerPreference: "high-performance",
    });
  } catch {
    renderer = null;
  }

  if (renderer) {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 30);
    const beacon = new THREE.Group();
    const targetRotation = new THREE.Vector2(-0.12, 0.2);
    const startedAt = performance.now();
    let frame = 0;
    let isVisible = true;

    camera.position.set(0, 0.05, 6.8);
    scene.add(beacon);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const darkLine = new THREE.LineBasicMaterial({
      color: 0x11130f,
      transparent: true,
      opacity: 0.42,
    });
    const signalLine = new THREE.LineBasicMaterial({
      color: 0x98d63d,
      transparent: true,
      opacity: 0.92,
    });
    const fineLine = new THREE.LineBasicMaterial({
      color: 0x11130f,
      transparent: true,
      opacity: 0.18,
    });

    const coreGeometry = new THREE.IcosahedronGeometry(1.03, 2);
    const core = new THREE.LineSegments(new THREE.EdgesGeometry(coreGeometry), darkLine);
    core.rotation.set(0.2, 0.3, 0.08);
    beacon.add(core);

    const coreFrame = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1.42, 1.42, 1.42)),
      signalLine,
    );
    coreFrame.rotation.set(0.18, 0.38, 0.1);
    beacon.add(coreFrame);

    const makeOrbit = (radius, tube, rotation, material) => {
      const orbit = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 8, 160), material);
      orbit.rotation.set(...rotation);
      return orbit;
    };

    const orbitA = makeOrbit(1.75, 0.012, [1.16, 0.12, -0.15], fineLine);
    const orbitB = makeOrbit(1.52, 0.014, [0.45, 1.18, 0.42], signalLine);
    const orbitC = makeOrbit(1.88, 0.008, [0.78, -0.62, 0.12], fineLine);
    beacon.add(orbitA, orbitB, orbitC);

    const axisPoints = [new THREE.Vector3(0, -2.12, 0), new THREE.Vector3(0, 2.12, 0)];
    const axis = new THREE.Line(new THREE.BufferGeometry().setFromPoints(axisPoints), fineLine);
    axis.rotation.z = Math.PI / 2;
    beacon.add(axis);

    const nodeGeometry = new THREE.SphereGeometry(0.035, 8, 8);
    const nodeMaterial = new THREE.MeshBasicMaterial({ color: 0x11130f });
    const nodes = new THREE.InstancedMesh(nodeGeometry, nodeMaterial, 30);
    const nodeTransform = new THREE.Object3D();

    for (let index = 0; index < 30; index += 1) {
      const angle = (index / 30) * Math.PI * 2;
      const radius = index % 2 === 0 ? 1.75 : 1.52;
      nodeTransform.position.set(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius * (index % 2 === 0 ? 0.42 : 0.7),
        Math.sin(angle * 2) * 0.28,
      );
      nodeTransform.scale.setScalar(index % 7 === 0 ? 1.8 : 0.75);
      nodeTransform.updateMatrix();
      nodes.setMatrixAt(index, nodeTransform.matrix);
    }

    beacon.add(nodes);
    beacon.rotation.set(-0.12, 0.2, 0.03);

    const resize = () => {
      const width = stage.clientWidth;
      const height = stage.clientHeight;
      if (!width || !height) return;

      renderer.setPixelRatio(Math.min(window.devicePixelRatio, width < 560 ? 1.15 : 1.5));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      beacon.scale.setScalar(width < 560 ? 0.84 : 1);
      renderer.render(scene, camera);
    };

    const renderFrame = () => {
      if (!isVisible || document.hidden) return;

      const elapsed = (performance.now() - startedAt) / 1000;
      beacon.rotation.x += (targetRotation.x - beacon.rotation.x) * 0.025;
      beacon.rotation.y += (targetRotation.y - beacon.rotation.y) * 0.025;
      beacon.rotation.z = 0.03 + Math.sin(elapsed * 0.28) * 0.02;
      core.rotation.y = elapsed * 0.08;
      core.rotation.z = elapsed * 0.045;
      coreFrame.rotation.y = -elapsed * 0.06;
      orbitA.rotation.z = elapsed * 0.05;
      orbitB.rotation.z = -elapsed * 0.075;
      orbitC.rotation.z = elapsed * 0.032;
      nodes.rotation.y = elapsed * 0.035;
      renderer.render(scene, camera);
      frame = requestAnimationFrame(renderFrame);
    };

    const start = () => {
      cancelAnimationFrame(frame);
      if (reducedMotion) {
        renderer.render(scene, camera);
        return;
      }
      frame = requestAnimationFrame(renderFrame);
    };

    const onPointerMove = (event) => {
      const bounds = hero.getBoundingClientRect();
      const pointerX = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      const pointerY = ((event.clientY - bounds.top) / bounds.height) * 2 - 1;
      targetRotation.set(-0.12 - pointerY * 0.06, 0.2 + pointerX * 0.12);
    };

    const onPointerLeave = () => targetRotation.set(-0.12, 0.2);
    const resizeObserver = new ResizeObserver(resize);
    const visibilityObserver = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
        if (isVisible) start();
        else cancelAnimationFrame(frame);
      },
      { threshold: 0.01 },
    );

    resizeObserver.observe(stage);
    visibilityObserver.observe(stage);

    if (!reducedMotion) {
      hero.addEventListener("pointermove", onPointerMove, { passive: true });
      hero.addEventListener("pointerleave", onPointerLeave);
    }

    const dispose = () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      hero.removeEventListener("pointermove", onPointerMove);
      hero.removeEventListener("pointerleave", onPointerLeave);

      const geometries = new Set();
      const materials = new Set();
      scene.traverse((object) => {
        if (object.geometry) geometries.add(object.geometry);
        const objectMaterials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        objectMaterials.filter(Boolean).forEach((material) => materials.add(material));
      });
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      renderer.dispose();
    };

    window.addEventListener("pagehide", dispose, { once: true });
    resize();
    canvas.dataset.ready = "true";
    start();
  }
}
