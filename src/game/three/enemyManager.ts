/**
 * Enemy AI, 3D procedural meshes, and acoustic sensory processing.
 * Echo-Stalker (blind predator), Sound Screamer (ceiling sentry), and The Resonance Leviathan (apex threat).
 */
import * as THREE from 'three';
import { HADES_9_LEVEL, type EnemySpawn } from '../levelData';
import { type StalkerState, type SoundEmission, updateEnemyStealthAI } from '../acousticRules';
import { audioEngine } from '../audioEngine';

export interface EnemyEntity {
  id: string;
  type: 'stalker' | 'screamer' | 'leviathan';
  group: THREE.Group;
  state: StalkerState;
  patrolPoints: Array<{ x: number; z: number }>;
  currentPatrolIdx: number;
  clickTimer: number;
  walkCycle: number;
  legMeshes: THREE.Mesh[];
  sensorMesh: THREE.Mesh;
}

export class EnemyManager {
  private scene: THREE.Scene;
  private enemies: Map<string, EnemyEntity> = new Map();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.spawnEnemies();
  }

  private spawnEnemies() {
    for (const def of HADES_9_LEVEL.enemies) {
      if (def.type === 'stalker') {
        this.createEchoStalker(def);
      } else if (def.type === 'screamer') {
        this.createSoundScreamer(def);
      } else if (def.type === 'leviathan') {
        this.createResonanceLeviathan(def);
      }
    }
  }

  /**
   * Procedural Echo-Stalker (Quadrupedal blind predator with acoustic frills)
   */
  private createEchoStalker(def: EnemySpawn) {
    const group = new THREE.Group();
    group.position.set(def.x, def.y, def.z);
    this.scene.add(group);

    // Chitin / carapace material
    const stalkerMat = new THREE.MeshStandardMaterial({
      color: 0x1c1917,
      roughness: 0.35,
      metalness: 0.8,
    });

    const glowRedMat = new THREE.MeshBasicMaterial({ color: 0xff0044 });

    // 1. Segmented Torso
    const torsoGeo = new THREE.BoxGeometry(0.8, 0.6, 1.4);
    const torso = new THREE.Mesh(torsoGeo, stalkerMat);
    torso.position.y = 0.8;
    group.add(torso);

    // 2. Head with Echolocation Sensor Horns (no eyes - blind)
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.9, -0.9);
    group.add(headGroup);

    const headGeo = new THREE.ConeGeometry(0.35, 0.8, 8);
    headGeo.rotateX(-Math.PI / 2);
    const head = new THREE.Mesh(headGeo, stalkerMat);
    headGroup.add(head);

    // Acoustic Frill Ears
    const earGeo = new THREE.BoxGeometry(0.1, 0.5, 0.3);
    const leftEar = new THREE.Mesh(earGeo, stalkerMat);
    leftEar.position.set(-0.35, 0.3, 0);
    leftEar.rotation.z = -0.4;

    const rightEar = new THREE.Mesh(earGeo, stalkerMat);
    rightEar.position.set(0.35, 0.3, 0);
    rightEar.rotation.z = 0.4;
    headGroup.add(leftEar, rightEar);

    // Pulsing Red Sensor Node
    const sensorGeo = new THREE.SphereGeometry(0.12, 8, 8);
    const sensorMesh = new THREE.Mesh(sensorGeo, glowRedMat);
    sensorMesh.position.set(0, 0.1, -0.4);
    headGroup.add(sensorMesh);

    // 3. Four Articulated Legs
    const legMeshes: THREE.Mesh[] = [];
    const legGeo = new THREE.CylinderGeometry(0.08, 0.05, 0.9, 6);

    const legOffsets = [
      [-0.45, 0.4, 0.5],
      [0.45, 0.4, 0.5],
      [-0.45, 0.4, -0.5],
      [0.45, 0.4, -0.5],
    ];

    for (let i = 0; i < 4; i++) {
      const leg = new THREE.Mesh(legGeo, stalkerMat);
      leg.position.set(legOffsets[i][0], legOffsets[i][1], legOffsets[i][2]);
      leg.rotation.z = legOffsets[i][0] > 0 ? 0.3 : -0.3;
      group.add(leg);
      legMeshes.push(leg);
    }

    const state: StalkerState = {
      id: def.id,
      x: def.x,
      z: def.z,
      hearingSensitivity: 22,
      alertness: 0,
      state: 'patrol',
      targetX: def.patrolPoints[0]?.x ?? def.x,
      targetZ: def.patrolPoints[0]?.z ?? def.z,
      stunTimer: 0,
    };

    this.enemies.set(def.id, {
      id: def.id,
      type: 'stalker',
      group,
      state,
      patrolPoints: def.patrolPoints,
      currentPatrolIdx: 0,
      clickTimer: 0,
      walkCycle: 0,
      legMeshes,
      sensorMesh,
    });
  }

  /**
   * Sound Screamer (Stationary ceiling-clinging biological sentry)
   */
  private createSoundScreamer(def: EnemySpawn) {
    const group = new THREE.Group();
    group.position.set(def.x, def.y, def.z);
    this.scene.add(group);

    const biomassMat = new THREE.MeshStandardMaterial({
      color: 0x450a0a,
      roughness: 0.6,
      metalness: 0.3,
    });
    const redGlowMat = new THREE.MeshBasicMaterial({ color: 0xff0044 });

    // Bulbous bio-sac
    const sacGeo = new THREE.SphereGeometry(0.8, 12, 12);
    sacGeo.scale(1, 1.4, 1);
    const sac = new THREE.Mesh(sacGeo, biomassMat);
    group.add(sac);

    // Screaming Maw
    const mawGeo = new THREE.ConeGeometry(0.6, 0.8, 12, 1, true);
    mawGeo.rotateX(Math.PI);
    const maw = new THREE.Mesh(mawGeo, biomassMat);
    maw.position.y = -0.7;
    group.add(maw);

    // Glowing acoustic core
    const coreGeo = new THREE.SphereGeometry(0.25, 8, 8);
    const sensorMesh = new THREE.Mesh(coreGeo, redGlowMat);
    sensorMesh.position.y = -0.5;
    group.add(sensorMesh);

    const state: StalkerState = {
      id: def.id,
      x: def.x,
      z: def.z,
      hearingSensitivity: 35, // triggers on heavy pulse or sprint nearby
      alertness: 0,
      state: 'patrol',
      targetX: def.x,
      targetZ: def.z,
      stunTimer: 0,
    };

    this.enemies.set(def.id, {
      id: def.id,
      type: 'screamer',
      group,
      state,
      patrolPoints: def.patrolPoints,
      currentPatrolIdx: 0,
      clickTimer: 0,
      walkCycle: 0,
      legMeshes: [],
      sensorMesh,
    });
  }

  /**
   * The Resonance Leviathan (Apex Boss patrolling reactor abyss)
   */
  private createResonanceLeviathan(def: EnemySpawn) {
    const group = new THREE.Group();
    group.position.set(def.x, def.y, def.z);
    this.scene.add(group);

    const armorMat = new THREE.MeshStandardMaterial({
      color: 0x09090b,
      roughness: 0.2,
      metalness: 0.95,
    });
    const redSlitsMat = new THREE.MeshBasicMaterial({ color: 0xff0044 });

    // Serpentine segmented body
    for (let i = 0; i < 7; i++) {
      const segGeo = new THREE.CylinderGeometry(2.2 - i * 0.25, 2.5 - i * 0.25, 3.0, 16);
      segGeo.rotateX(Math.PI / 2);
      const segMesh = new THREE.Mesh(segGeo, armorMat);
      segMesh.position.set(0, 0, i * 2.8);
      group.add(segMesh);

      // Acoustic slit frills
      const slitGeo = new THREE.BoxGeometry(3.6 - i * 0.3, 0.1, 0.4);
      const slit = new THREE.Mesh(slitGeo, redSlitsMat);
      slit.position.set(0, 0.8, i * 2.8);
      group.add(slit);
    }

    const sensorGeo = new THREE.SphereGeometry(0.8, 8, 8);
    const sensorMesh = new THREE.Mesh(sensorGeo, redSlitsMat);
    sensorMesh.position.set(0, 0.5, -1.2);
    group.add(sensorMesh);

    const state: StalkerState = {
      id: def.id,
      x: def.x,
      z: def.z,
      hearingSensitivity: 40,
      alertness: 0,
      state: 'patrol',
      targetX: def.patrolPoints[0]?.x ?? def.x,
      targetZ: def.patrolPoints[0]?.z ?? def.z,
      stunTimer: 0,
    };

    this.enemies.set(def.id, {
      id: def.id,
      type: 'leviathan',
      group,
      state,
      patrolPoints: def.patrolPoints,
      currentPatrolIdx: 0,
      clickTimer: 0,
      walkCycle: 0,
      legMeshes: [],
      sensorMesh,
    });
  }

  /**
   * Stuns enemies within a radius (from Frequency Disruptor)
   */
  public stunEnemiesInRadius(x: number, z: number, radius: number, durationSeconds: number): number {
    let count = 0;
    for (const enemy of this.enemies.values()) {
      const dist = Math.hypot(enemy.state.x - x, enemy.state.z - z);
      if (dist <= radius) {
        enemy.state.state = 'stunned';
        enemy.state.stunTimer = durationSeconds;
        enemy.state.alertness = 0;
        count++;
      }
    }
    return count;
  }

  /**
   * Main per-frame update for AI sensory updates and kinematics
   */
  public update(
    deltaSeconds: number,
    playerPos: { x: number; y: number; z: number },
    sounds: SoundEmission[],
    onScreamerTrigger?: (screamerPos: { x: number; y: number; z: number }) => void
  ) {
    const dt = Math.min(deltaSeconds, 0.05);

    for (const enemy of this.enemies.values()) {
      // 1. Pure AI state update
      enemy.state = updateEnemyStealthAI(enemy.state, sounds, dt);

      // 2. Kinematic behaviors based on enemy type
      if (enemy.type === 'stalker') {
        this.updateEchoStalkerKinematics(enemy, playerPos, dt);
      } else if (enemy.type === 'screamer') {
        this.updateSoundScreamerBehavior(enemy, dt, onScreamerTrigger);
      } else if (enemy.type === 'leviathan') {
        this.updateLeviathanKinematics(enemy, playerPos, dt);
      }
    }
  }

  private updateEchoStalkerKinematics(
    enemy: EnemyEntity,
    playerPos: { x: number; y: number; z: number },
    dt: number
  ) {
    const group = enemy.group;
    const state = enemy.state;

    // Pulse sensor organ color based on alertness
    const isStunned = state.state === 'stunned';
    const isChasing = state.state === 'chase';
    const isInvestigating = state.state === 'investigate';

    const redMat = enemy.sensorMesh.material as THREE.MeshBasicMaterial;
    if (isStunned) {
      redMat.color.setHex(0x9333ea); // Purple stunned
    } else if (isChasing) {
      redMat.color.setHex(0xff0044); // Blazing red
    } else if (isInvestigating) {
      redMat.color.setHex(0xf59e0b); // Amber curious
    } else {
      redMat.color.setHex(0x57534e); // Dull dormant
    }

    if (isStunned) {
      // Shiver & freeze
      group.position.x = state.x + (Math.random() - 0.5) * 0.05;
      group.position.z = state.z + (Math.random() - 0.5) * 0.05;
      return;
    }

    // Determine target location
    let targetX = state.targetX;
    let targetZ = state.targetZ;

    if (state.state === 'chase') {
      // Close distance to player if perceived
      targetX = playerPos.x;
      targetZ = playerPos.z;
    } else if (state.state === 'patrol') {
      const currentPatrol = enemy.patrolPoints[enemy.currentPatrolIdx];
      if (currentPatrol) {
        targetX = currentPatrol.x;
        targetZ = currentPatrol.z;

        const distToPatrol = Math.hypot(state.x - targetX, state.z - targetZ);
        if (distToPatrol < 1.0) {
          enemy.currentPatrolIdx = (enemy.currentPatrolIdx + 1) % enemy.patrolPoints.length;
        }
      }
    }

    // Move toward target
    const dx = targetX - state.x;
    const dz = targetZ - state.z;
    const dist = Math.hypot(dx, dz);

    const speed = isChasing ? 5.2 : isInvestigating ? 2.8 : 1.6;

    if (dist > 0.4) {
      const dirX = dx / dist;
      const dirZ = dz / dist;

      state.x += dirX * speed * dt;
      state.z += dirZ * speed * dt;

      // Rotate toward movement direction
      const targetAngle = Math.atan2(dirX, dirZ);
      group.rotation.y = THREE.MathUtils.damp(group.rotation.y, targetAngle, 8, dt);

      // Animate walking legs
      enemy.walkCycle += dt * speed * 4;
      for (let i = 0; i < enemy.legMeshes.length; i++) {
        const offset = (i % 2 === 0 ? 1 : -1) * Math.sin(enemy.walkCycle + i * Math.PI);
        enemy.legMeshes[i].rotation.x = offset * 0.4;
      }
    }

    group.position.set(state.x, 0, state.z);

    // Audio clicks
    enemy.clickTimer += dt;
    const clickInterval = isChasing ? 0.35 : isInvestigating ? 0.7 : 1.8;
    if (enemy.clickTimer >= clickInterval) {
      enemy.clickTimer = 0;
      const distToPlayer = Math.hypot(state.x - playerPos.x, state.z - playerPos.z);
      if (distToPlayer < 35) {
        if (isChasing && Math.random() < 0.25) {
          audioEngine.playStalkerRoar(distToPlayer);
        } else {
          audioEngine.playStalkerClick(distToPlayer);
        }
      }
    }
  }

  private updateSoundScreamerBehavior(
    enemy: EnemyEntity,
    dt: number,
    onScreamerTrigger?: (screamerPos: { x: number; y: number; z: number }) => void
  ) {
    if (enemy.state.state === 'stunned') return;

    if (enemy.state.alertness > 50 && enemy.clickTimer <= 0) {
      // Trigger shriek!
      audioEngine.playScreamerShriek();
      enemy.clickTimer = 8.0; // Cooldown before next shriek
      if (onScreamerTrigger) {
        onScreamerTrigger({ x: enemy.state.x, y: 4.2, z: enemy.state.z });
      }
    }

    if (enemy.clickTimer > 0) {
      enemy.clickTimer -= dt;
    }
  }

  private updateLeviathanKinematics(
    enemy: EnemyEntity,
    playerPos: { x: number; y: number; z: number },
    dt: number
  ) {
    const state = enemy.state;
    const currentPatrol = enemy.patrolPoints[enemy.currentPatrolIdx];
    if (currentPatrol) {
      const dx = currentPatrol.x - state.x;
      const dz = currentPatrol.z - state.z;
      const dist = Math.hypot(dx, dz);

      if (dist < 3.0) {
        enemy.currentPatrolIdx = (enemy.currentPatrolIdx + 1) % enemy.patrolPoints.length;
      } else {
        const dirX = dx / dist;
        const dirZ = dz / dist;
        state.x += dirX * 3.2 * dt;
        state.z += dirZ * 3.2 * dt;

        const targetAngle = Math.atan2(dirX, dirZ);
        enemy.group.rotation.y = THREE.MathUtils.damp(enemy.group.rotation.y, targetAngle, 2, dt);
      }
    }

    // Undulate body
    enemy.walkCycle += dt * 2;
    enemy.group.position.set(state.x, -2.5 + Math.sin(enemy.walkCycle) * 0.8, state.z);

    // Sub-bass rumble
    enemy.clickTimer += dt;
    if (enemy.clickTimer >= 4.5) {
      enemy.clickTimer = 0;
      const distToPlayer = Math.hypot(state.x - playerPos.x, state.z - playerPos.z);
      if (distToPlayer < 60) {
        audioEngine.playLeviathanRumble();
      }
    }
  }

  public getClosestEnemyDistance(playerX: number, playerZ: number): { distance: number; enemyType: string } {
    let minDist = 999;
    let type = 'none';

    for (const enemy of this.enemies.values()) {
      const d = Math.hypot(enemy.state.x - playerX, enemy.state.z - playerZ);
      if (d < minDist) {
        minDist = d;
        type = enemy.type;
      }
    }

    return { distance: minDist, enemyType: type };
  }

  public getEnemyStates(): StalkerState[] {
    return Array.from(this.enemies.values()).map(e => e.state);
  }

  public dispose() {
    for (const enemy of this.enemies.values()) {
      this.scene.remove(enemy.group);
    }
    this.enemies.clear();
  }
}
