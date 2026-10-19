/**
 * Builds the 3D physical architecture of Hades-9 facility.
 * Modular sci-fi bulkheads, containment cylinders, industrial pipes,
 * water planes, reactor core, and escape submersible.
 */
import * as THREE from 'three';
import { HADES_9_LEVEL, type InteractiveEntity } from '../levelData';
import { createFloorPanelTexture, createHazardStripeTexture, createWaterRippleTexture } from './proceduralTextures';

export interface SceneObjects {
  rootGroup: THREE.Group;
  interactiveMeshes: Map<string, THREE.Group>;
  waterMesh: THREE.Mesh | null;
  reactorCoreGroup: THREE.Group | null;
  escapeSubGroup: THREE.Group | null;
  airlockDoorGroup: THREE.Group | null;
  update: (delta: number) => void;
}

export function buildHades9Scene(scene: THREE.Scene): SceneObjects {
  const rootGroup = new THREE.Group();
  scene.add(rootGroup);

  const interactiveMeshes = new Map<string, THREE.Group>();

  // Textures
  const floorTex = createFloorPanelTexture();
  floorTex.repeat.set(8, 24);

  const hazardTex = createHazardStripeTexture();
  hazardTex.repeat.set(4, 1);

  const waterTex = createWaterRippleTexture();
  waterTex.repeat.set(4, 12);

  // Materials (dark stealth facility; illuminated by sonar and localized emergency lights)
  const floorMat = new THREE.MeshStandardMaterial({
    map: floorTex,
    color: 0x223344,
    roughness: 0.6,
    metalness: 0.8,
  });

  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x182430,
    roughness: 0.5,
    metalness: 0.85,
  });

  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x0f1822,
    roughness: 0.4,
    metalness: 0.95,
  });

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x00f0ff,
    transparent: true,
    opacity: 0.35,
    roughness: 0.1,
    transmission: 0.8,
    ior: 1.5,
  });

  const hazardMat = new THREE.MeshStandardMaterial({
    map: hazardTex,
    roughness: 0.7,
  });

  // 1. Build Floors for Zone 1, 2, 3
  // Zone 1 floor (y = 0)
  const z1FloorGeo = new THREE.PlaneGeometry(42, 45);
  z1FloorGeo.rotateX(-Math.PI / 2);
  const z1Floor = new THREE.Mesh(z1FloorGeo, floorMat);
  z1Floor.position.set(0, 0, 12.5);
  rootGroup.add(z1Floor);

  // Zone 2 Trench floor (lowered to y = -0.5 for water depth)
  const z2FloorGeo = new THREE.PlaneGeometry(30, 55);
  z2FloorGeo.rotateX(-Math.PI / 2);
  const z2Floor = new THREE.Mesh(z2FloorGeo, floorMat);
  z2Floor.position.set(0, -0.5, 62.5);
  rootGroup.add(z2Floor);

  // Zone 3 Reactor floor & abyss
  const z3FloorGeo = new THREE.CylinderGeometry(34, 34, 1, 32);
  const z3Floor = new THREE.Mesh(z3FloorGeo, floorMat);
  z3Floor.position.set(0, -0.5, 135);
  rootGroup.add(z3Floor);

  // 2. Build Walls
  const wallGroup = new THREE.Group();
  rootGroup.add(wallGroup);

  for (const seg of HADES_9_LEVEL.walls) {
    const dx = seg.x2 - seg.x1;
    const dz = seg.z2 - seg.z1;
    const len = Math.hypot(dx, dz);
    const angle = Math.atan2(dx, dz);
    const midX = (seg.x1 + seg.x2) / 2;
    const midZ = (seg.z1 + seg.z2) / 2;

    const wallThickness = 0.5;
    const wallGeo = new THREE.BoxGeometry(wallThickness, seg.height, len);

    let mat = wallMat;
    if (seg.type === 'containment_glass') {
      mat = glassMat;
    } else if (seg.type === 'reactor_wall') {
      mat = frameMat;
    }

    const wallMesh = new THREE.Mesh(wallGeo, mat);
    wallMesh.position.set(midX, seg.height / 2, midZ);
    wallMesh.rotation.y = angle;
    wallGroup.add(wallMesh);

    // Wall top rim trim (composite detail)
    const trimGeo = new THREE.BoxGeometry(wallThickness + 0.15, 0.25, len);
    const trimMesh = new THREE.Mesh(trimGeo, frameMat);
    trimMesh.position.set(midX, seg.height + 0.1, midZ);
    trimMesh.rotation.y = angle;
    wallGroup.add(trimMesh);
  }

  // 3. Flooded Water Surface in Zone 2
  const waterGeo = new THREE.PlaneGeometry(28, 45, 16, 16);
  waterGeo.rotateX(-Math.PI / 2);
  const waterMat = new THREE.MeshStandardMaterial({
    map: waterTex,
    color: 0x004466,
    transparent: true,
    opacity: 0.65,
    roughness: 0.1,
    metalness: 0.9,
  });
  const waterMesh = new THREE.Mesh(waterGeo, waterMat);
  waterMesh.position.set(0, 0.35, 62.5); // waist-high water level
  rootGroup.add(waterMesh);

  // 4. Bio-Lab Containment Cylinders (Zone 1)
  const specimenGroup = new THREE.Group();
  rootGroup.add(specimenGroup);
  const cylinderGeo = new THREE.CylinderGeometry(1.2, 1.2, 3.2, 16);
  const coreRodGeo = new THREE.CylinderGeometry(0.2, 0.2, 2.8, 8);
  const glowMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc });

  const specimenPositions = [
    { x: -5, z: 16 },
    { x: 5, z: 16 },
    { x: -5, z: 22 },
    { x: 5, z: 22 },
  ];

  for (const pos of specimenPositions) {
    const jar = new THREE.Group();
    jar.position.set(pos.x, 1.6, pos.z);

    const outerGlass = new THREE.Mesh(cylinderGeo, glassMat);
    const innerRod = new THREE.Mesh(coreRodGeo, glowMat);
    const baseCyl = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 0.4, 16), frameMat);
    baseCyl.position.y = -1.6;
    const topCap = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 0.3, 16), frameMat);
    topCap.position.y = 1.6;

    jar.add(outerGlass, innerRod, baseCyl, topCap);
    specimenGroup.add(jar);
  }

  // 5. Central Reactor Core in Zone 3
  const reactorCoreGroup = new THREE.Group();
  reactorCoreGroup.position.set(0, 4.5, 135);
  rootGroup.add(reactorCoreGroup);

  // Reactor Core Pillar & Magnetic Containment Rings
  const corePillarGeo = new THREE.CylinderGeometry(3.5, 3.5, 12, 24);
  const corePillarMat = new THREE.MeshStandardMaterial({
    color: 0x111c26,
    roughness: 0.3,
    metalness: 0.9,
  });
  const corePillar = new THREE.Mesh(corePillarGeo, corePillarMat);
  reactorCoreGroup.add(corePillar);

  // Glowing Plasma Core
  const plasmaGeo = new THREE.CylinderGeometry(1.8, 1.8, 10, 16);
  const plasmaMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
  const plasmaCore = new THREE.Mesh(plasmaGeo, plasmaMat);
  reactorCoreGroup.add(plasmaCore);

  // Orbiting Magnetic Accelerator Rings
  const ringGeo = new THREE.TorusGeometry(5.2, 0.35, 12, 32);
  const ringMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9, roughness: 0.2 });
  const ring1 = new THREE.Mesh(ringGeo, ringMat);
  ring1.rotation.x = Math.PI / 2;
  const ring2 = new THREE.Mesh(ringGeo, ringMat);
  ring2.rotation.x = Math.PI / 3;
  const ring3 = new THREE.Mesh(ringGeo, ringMat);
  ring3.rotation.x = -Math.PI / 3;
  reactorCoreGroup.add(ring1, ring2, ring3);

  // Reactor Core Catwalk Bridges
  const catwalkMat = new THREE.MeshStandardMaterial({
    map: floorTex,
    color: 0x1e293b,
    roughness: 0.6,
    metalness: 0.8,
  });
  const bridge1 = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.3, 30), catwalkMat);
  bridge1.position.set(0, 1.2, 135);
  rootGroup.add(bridge1);

  const bridge2 = new THREE.Mesh(new THREE.BoxGeometry(30, 0.3, 2.8), catwalkMat);
  bridge2.position.set(0, 1.2, 135);
  rootGroup.add(bridge2);

  // 6. Bulkhead Alpha Airlock Door (between Zone 1 and Zone 2 at z = 35)
  const airlockDoorGroup = new THREE.Group();
  airlockDoorGroup.position.set(0, 2.25, 35);
  rootGroup.add(airlockDoorGroup);

  const doorLeafL = new THREE.Mesh(new THREE.BoxGeometry(1.8, 4.2, 0.3), frameMat);
  doorLeafL.position.x = -0.9;
  const doorLeafR = new THREE.Mesh(new THREE.BoxGeometry(1.8, 4.2, 0.3), frameMat);
  doorLeafR.position.x = 0.9;
  const doorStripe = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.5, 0.35), hazardMat);
  doorStripe.position.y = 0;
  airlockDoorGroup.add(doorLeafL, doorLeafR, doorStripe);

  // 7. Escape Submersible (Nautilus-IV) at z = 182
  const escapeSubGroup = new THREE.Group();
  escapeSubGroup.position.set(0, 1.8, 182);
  rootGroup.add(escapeSubGroup);

  // Hull
  const subHullGeo = new THREE.CapsuleGeometry(2.2, 5.0, 12, 24);
  subHullGeo.rotateX(Math.PI / 2);
  const subHullMat = new THREE.MeshStandardMaterial({
    color: 0xd97706, // Deep sea safety yellow/amber
    roughness: 0.4,
    metalness: 0.7,
  });
  const subHull = new THREE.Mesh(subHullGeo, subHullMat);

  // Observation Cockpit Dome
  const domeGeo = new THREE.SphereGeometry(1.4, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
  domeGeo.rotateX(-Math.PI / 2);
  const domeMat = new THREE.MeshPhysicalMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.6,
    roughness: 0.1,
    transmission: 0.9,
  });
  const subDome = new THREE.Mesh(domeGeo, domeMat);
  subDome.position.set(0, 0.4, -2.6);

  // Thruster prop
  const thrusterGeo = new THREE.CylinderGeometry(0.8, 0.9, 1.2, 16);
  thrusterGeo.rotateX(Math.PI / 2);
  const subThruster = new THREE.Mesh(thrusterGeo, frameMat);
  subThruster.position.set(0, 0, 3.2);

  escapeSubGroup.add(subHull, subDome, subThruster);

  // 8. Build Interactive Props
  for (const item of HADES_9_LEVEL.interactives) {
    const itemGroup = new THREE.Group();
    itemGroup.position.set(item.x, item.y, item.z);
    rootGroup.add(itemGroup);
    interactiveMeshes.set(item.id, itemGroup);

    if (item.type === 'keycard_alpha') {
      // Golden glowing keycard
      const cardGeo = new THREE.BoxGeometry(0.3, 0.05, 0.45);
      const cardMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: 0xd97706,
        emissiveIntensity: 0.8,
        metalness: 0.9,
        roughness: 0.2,
      });
      const card = new THREE.Mesh(cardGeo, cardMat);
      itemGroup.add(card);
    } else if (item.type === 'terminal_airlock' || item.type === 'pump_console' || item.type === 'reactor_terminal') {
      // Sci-fi console pedestal
      const pedestal = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.2, 0.6), frameMat);
      pedestal.position.y = -0.5;

      const screenGeo = new THREE.PlaneGeometry(0.6, 0.4);
      const screenMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
      const screen = new THREE.Mesh(screenGeo, screenMat);
      screen.position.set(0, 0.2, 0.31);

      itemGroup.add(pedestal, screen);
    } else if (item.type === 'decoy_pickup') {
      // Hexagonal decoy beacon device
      const beaconGeo = new THREE.CylinderGeometry(0.2, 0.25, 0.4, 6);
      const beaconMat = new THREE.MeshStandardMaterial({
        color: 0x06b6d4,
        emissive: 0x0891b2,
        emissiveIntensity: 0.6,
      });
      itemGroup.add(new THREE.Mesh(beaconGeo, beaconMat));
    } else if (item.type === 'battery_pickup') {
      // Cylindrical battery power cell
      const cellGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.35, 8);
      const cellMat = new THREE.MeshStandardMaterial({
        color: 0xa855f7,
        emissive: 0x9333ea,
        emissiveIntensity: 0.8,
      });
      itemGroup.add(new THREE.Mesh(cellGeo, cellMat));
    } else if (item.type === 'debris_pickup') {
      // Glass bottle or metal scrap
      const bottleGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.35, 8);
      const bottleMat = new THREE.MeshPhysicalMaterial({
        color: 0x94a3b8,
        transparent: true,
        opacity: 0.7,
      });
      itemGroup.add(new THREE.Mesh(bottleGeo, bottleMat));
    } else if (item.type === 'locker_hiding') {
      // Tall metallic locker
      const locker = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.4, 0.8), frameMat);
      itemGroup.add(locker);
    }
  }

  // Animation / update function
  let animTime = 0;
  const update = (delta: number) => {
    animTime += delta;

    // Rotate reactor containment rings
    if (reactorCoreGroup) {
      ring1.rotation.z += delta * 0.8;
      ring2.rotation.y += delta * 0.6;
      ring3.rotation.x += delta * 0.7;
    }

    // Submersible gentle buoyant idle
    if (escapeSubGroup) {
      escapeSubGroup.position.y = 1.8 + Math.sin(animTime * 1.5) * 0.08;
    }

    // Water surface texture animation
    if (waterMesh) {
      waterTex.offset.y = (animTime * 0.05) % 1;
    }
  };

  return {
    rootGroup,
    interactiveMeshes,
    waterMesh,
    reactorCoreGroup,
    escapeSubGroup,
    airlockDoorGroup,
    update,
  };
}
