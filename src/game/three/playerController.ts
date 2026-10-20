/**
 * First-person player controller with pointer lock, WASD movement,
 * collision resolution against Hades-9 walls, diegetic wristwatch 3D HUD,
 * and survival tool actions (Sonar, Disruptor, Decoy, Debris).
 */
import * as THREE from 'three';
import { HADES_9_LEVEL, type InteractiveEntity } from '../levelData';
import {
  type MovementStance,
  type SonarPulseType,
  SONAR_SPECS,
  BASE_MOVEMENT_NOISE,
  calculateHeartbeatBpm,
  isHeartbeatAudible,
} from '../acousticRules';
import { audioEngine } from '../audioEngine';

export interface PlayerStats {
  x: number;
  y: number;
  z: number;
  rotationY: number;
  pitch: number;
  stance: MovementStance;
  heartbeatBpm: number;
  noiseDb: number;
  stamina: number; // 0 to 100
  oxygen: number; // 0 to 100
  batteryCharges: number; // Frequency disruptor charges
  decoysCount: number;
  debrisCount: number;
  hasKeycardAlpha: boolean;
  isSecondaryPowerRestored: boolean;
  isReactorPurged: boolean;
  isHidingInLocker: boolean;
  sonarCooldowns: Record<SonarPulseType, number>;
  nearbyInteractable: InteractiveEntity | null;
}

export class PlayerController {
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;

  // Position & Velocity
  public position: THREE.Vector3;
  private velocity: THREE.Vector3 = new THREE.Vector3();
  private pitch = 0; // vertical camera rotation (radians)
  private yaw = 0;   // horizontal camera rotation (radians)

  // Input states
  private keysHeld: Record<string, boolean> = {};
  private isPointerLocked = false;
  private isMobileTouch = false;
  private touchStartX = 0;
  private touchStartY = 0;

  // Player state
  private stance: MovementStance = 'walk';
  private stamina = 100;
  private oxygen = 100;
  private batteryCharges = 2; // start with 2 disruptor shots
  private decoysCount = 1;
  private debrisCount = 1;
  private hasKeycardAlpha = false;
  private isSecondaryPowerRestored = false;
  private isReactorPurged = false;
  private isHidingInLocker = false;
  private heartbeatBpm = 70;
  private currentNoiseDb = 0;
  private stepDistanceAccumulator = 0;
  private headBobTimer = 0;

  // Sonar cooldowns
  private sonarCooldowns: Record<SonarPulseType, number> = {
    low: 0,
    focused: 0,
    heavy: 0,
  };

  // Diegetic Wristwatch 3D Model
  private watchGroup: THREE.Group;
  private watchScreenCanvas: HTMLCanvasElement;
  private watchScreenTexture: THREE.CanvasTexture;

  // Callbacks
  public onTriggerPulse?: (type: SonarPulseType, origin: { x: number; y: number; z: number }) => void;
  public onSoundEmitted?: (emission: {
    x: number;
    z: number;
    decibels: number;
    frequencyHz: number;
    isHostileAlert: boolean;
    duration: number;
    radiusMax: number;
  }) => void;
  public onThrowDecoy?: (origin: { x: number; y: number; z: number }, target: { x: number; y: number; z: number }) => void;
  public onFireDisruptor?: (origin: { x: number; y: number; z: number }, direction: THREE.Vector3) => void;
  public onThrowDebris?: (origin: { x: number; y: number; z: number }, target: { x: number; y: number; z: number }) => void;
  public onObjectiveCompleted?: (objectiveId: string) => void;
  public onItemPickedUp?: (itemId: string, itemType: string) => void;

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera;
    this.domElement = domElement;

    this.position = new THREE.Vector3(
      HADES_9_LEVEL.playerSpawn.x,
      HADES_9_LEVEL.playerSpawn.y,
      HADES_9_LEVEL.playerSpawn.z
    );
    this.yaw = HADES_9_LEVEL.playerSpawn.rotationY;

    // Attach diegetic wristwatch model to camera
    const { group, canvas, texture } = this.createDiegeticWristwatch();
    this.watchGroup = group;
    this.watchScreenCanvas = canvas;
    this.watchScreenTexture = texture;
    this.camera.add(this.watchGroup);

    this.setupEventListeners();
  }

  private createDiegeticWristwatch() {
    const group = new THREE.Group();
    // Positioned at lower left forearm in camera view
    group.position.set(-0.38, -0.28, -0.65);
    group.rotation.set(0.2, 0.45, -0.1);

    const watchMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.9,
      roughness: 0.3,
    });

    // Strap & Case
    const caseMesh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.04), watchMat);
    const strapMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.22, 16), watchMat);
    strapMesh.rotation.z = Math.PI / 2;
    strapMesh.position.z = -0.02;

    // Live dynamic screen canvas
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;

    const screenMat = new THREE.MeshBasicMaterial({ map: texture });
    const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.13), screenMat);
    screenMesh.position.z = 0.021;

    group.add(caseMesh, strapMesh, screenMesh);
    return { group, canvas, texture };
  }

  private setupEventListeners() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
    this.domElement.addEventListener('mousemove', this.handleMouseMove);
    this.domElement.addEventListener('click', this.handleClick);
    this.domElement.addEventListener('contextmenu', this.handleContextMenu);

    // Mobile touch look & move support
    this.domElement.addEventListener('touchstart', this.handleTouchStart, { passive: true });
    this.domElement.addEventListener('touchmove', this.handleTouchMove, { passive: true });
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    this.keysHeld[e.code] = true;

    // Quick Sonar hotkeys
    if (e.code === 'Digit1') {
      this.triggerSonar('low');
    } else if (e.code === 'Digit2' || e.code === 'KeyE') {
      this.triggerSonar('focused');
    } else if (e.code === 'Digit3' || e.code === 'KeyQ') {
      this.triggerSonar('heavy');
    }

    // Action tools
    if (e.code === 'KeyF') {
      this.fireDisruptor();
    } else if (e.code === 'KeyG') {
      this.throwDecoy();
    } else if (e.code === 'KeyT') {
      this.throwDebris();
    } else if (e.code === 'Space') {
      this.interactOrBreathe();
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keysHeld[e.code] = false;
  };

  private handleBlur = () => {
    this.keysHeld = {};
  };

  private handleMouseMove = (e: MouseEvent) => {
    // Free look when pointer locked or dragging
    if (document.pointerLockElement === this.domElement || e.buttons === 1) {
      const sensitivity = 0.0022;
      this.yaw -= e.movementX * sensitivity;
      this.pitch -= e.movementY * sensitivity;
      // Clamp pitch to avoid neck snap (-85 to +85 deg)
      this.pitch = Math.max(-1.48, Math.min(1.48, this.pitch));
    }
  };

  private handleClick = (e: MouseEvent) => {
    // Request pointer lock on canvas click if not locked
    if (document.pointerLockElement !== this.domElement) {
      this.domElement.requestPointerLock?.();
    } else {
      // Left click fires frequency disruptor or interacts
      if (this.nearbyInteractable) {
        this.interactOrBreathe();
      } else {
        this.fireDisruptor();
      }
    }
  };

  private handleContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    // Right click triggers Low pulse (silent echolocation)
    this.triggerSonar('low');
  };

  private handleTouchStart = (e: TouchEvent) => {
    if (e.touches.length > 0) {
      this.isMobileTouch = true;
      this.touchStartX = e.touches[0].clientX;
      this.touchStartY = e.touches[0].clientY;
    }
  };

  private handleTouchMove = (e: TouchEvent) => {
    if (e.touches.length > 0) {
      const dx = e.touches[0].clientX - this.touchStartX;
      const dy = e.touches[0].clientY - this.touchStartY;
      this.touchStartX = e.touches[0].clientX;
      this.touchStartY = e.touches[0].clientY;

      const sensitivity = 0.0035;
      this.yaw -= dx * sensitivity;
      this.pitch -= dy * sensitivity;
      this.pitch = Math.max(-1.48, Math.min(1.48, this.pitch));
    }
  };

  /**
   * Triggers sonar ping if off cooldown
   */
  public triggerSonar(type: SonarPulseType): boolean {
    if (this.sonarCooldowns[type] > 0) return false;

    const spec = SONAR_SPECS[type];
    this.sonarCooldowns[type] = spec.cooldownSeconds;

    audioEngine.playSonarPing(type);

    if (this.onTriggerPulse) {
      this.onTriggerPulse(type, {
        x: this.position.x,
        y: this.position.y,
        z: this.position.z,
      });
    }

    if (this.onSoundEmitted) {
      this.onSoundEmitted({
        x: this.position.x,
        z: this.position.z,
        decibels: spec.noiseDecibels,
        frequencyHz: type === 'heavy' ? 1200 : type === 'focused' ? 680 : 260,
        isHostileAlert: type === 'heavy',
        duration: spec.visibilityDuration,
        radiusMax: spec.alertRadius,
      });
    }

    return true;
  }

  /**
   * Fires the Frequency Disruptor sonic shockwave
   */
  public fireDisruptor(): boolean {
    if (this.batteryCharges <= 0) return false;

    this.batteryCharges--;
    audioEngine.playDisruptorBlast();

    const forward = new THREE.Vector3(0, 0, -1).applyEuler(
      new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ')
    );

    if (this.onFireDisruptor) {
      this.onFireDisruptor(
        { x: this.position.x, y: this.position.y, z: this.position.z },
        forward
      );
    }

    // High acoustic emission that stuns nearby predators
    if (this.onSoundEmitted) {
      this.onSoundEmitted({
        x: this.position.x,
        z: this.position.z,
        decibels: 92,
        frequencyHz: 3200,
        isHostileAlert: true,
        duration: 3.5,
        radiusMax: 30,
      });
    }

    return true;
  }

  /**
   * Throws an acoustic decoy beacon forward
   */
  public throwDecoy(): boolean {
    if (this.decoysCount <= 0) return false;

    this.decoysCount--;
    const forward = new THREE.Vector3(0, 0, -1).applyEuler(
      new THREE.Euler(0, this.yaw, 0, 'YXZ')
    );
    const targetX = this.position.x + forward.x * 12;
    const targetZ = this.position.z + forward.z * 12;

    if (this.onThrowDecoy) {
      this.onThrowDecoy(
        { x: this.position.x, y: this.position.y, z: this.position.z },
        { x: targetX, y: 0.1, z: targetZ }
      );
    }

    return true;
  }

  /**
   * Throws a glass beaker or metal debris to lure predators
   */
  public throwDebris(): boolean {
    if (this.debrisCount <= 0) return false;

    this.debrisCount--;
    const forward = new THREE.Vector3(0, 0, -1).applyEuler(
      new THREE.Euler(0, this.yaw, 0, 'YXZ')
    );
    const targetX = this.position.x + forward.x * 15;
    const targetZ = this.position.z + forward.z * 15;

    if (this.onThrowDebris) {
      this.onThrowDebris(
        { x: this.position.x, y: this.position.y, z: this.position.z },
        { x: targetX, y: 0.1, z: targetZ }
      );
    }

    return true;
  }

  /**
   * Interacts with nearby consoles/doors or calms breath
   */
  public interactOrBreathe() {
    const item = this.nearbyInteractable;
    if (item && !item.activated) {
      if (item.type === 'keycard_alpha') {
        item.activated = true;
        this.hasKeycardAlpha = true;
        audioEngine.playTerminalChime(true);
        this.onItemPickedUp?.(item.id, item.type);
        this.onObjectiveCompleted?.('keycard_alpha');
      } else if (item.type === 'terminal_airlock') {
        if (this.hasKeycardAlpha) {
          item.activated = true;
          audioEngine.playTerminalChime(true);
          this.onObjectiveCompleted?.('bulkhead_unlocked');
        } else {
          audioEngine.playTerminalChime(false);
        }
      } else if (item.type === 'pump_console') {
        item.activated = true;
        this.isSecondaryPowerRestored = true;
        audioEngine.playTerminalChime(true);
        this.onObjectiveCompleted?.('pump_activated');
      } else if (item.type === 'reactor_terminal') {
        item.activated = true;
        this.isReactorPurged = true;
        audioEngine.playTerminalChime(true);
        this.onObjectiveCompleted?.('reactor_purged');
      } else if (item.type === 'escape_sub') {
        if (this.isReactorPurged) {
          item.activated = true;
          audioEngine.playTerminalChime(true);
          this.onObjectiveCompleted?.('escaped');
        } else {
          audioEngine.playTerminalChime(false);
        }
      } else if (item.type === 'decoy_pickup') {
        item.activated = true;
        this.decoysCount++;
        audioEngine.playTerminalChime(true);
        this.onItemPickedUp?.(item.id, item.type);
      } else if (item.type === 'battery_pickup') {
        item.activated = true;
        this.batteryCharges = Math.min(4, this.batteryCharges + 1);
        audioEngine.playTerminalChime(true);
        this.onItemPickedUp?.(item.id, item.type);
      } else if (item.type === 'debris_pickup') {
        item.activated = true;
        this.debrisCount++;
        audioEngine.playTerminalChime(true);
        this.onItemPickedUp?.(item.id, item.type);
      } else if (item.type === 'locker_hiding') {
        this.isHidingInLocker = !this.isHidingInLocker;
      }
    } else if (item && item.type === 'locker_hiding') {
      this.isHidingInLocker = !this.isHidingInLocker;
    } else {
      // Hold breath: suppress heartbeat
      this.heartbeatBpm = Math.max(65, this.heartbeatBpm - 8);
    }
  }

  public get nearbyInteractable(): InteractiveEntity | null {
    for (const item of HADES_9_LEVEL.interactives) {
      if (item.activated && item.type !== 'locker_hiding') continue;
      const dist = Math.hypot(item.x - this.position.x, item.z - this.position.z);
      if (dist < 2.2) {
        return item;
      }
    }
    return null;
  }

  /**
   * Main per-frame update for player movement, collision, camera, and HUD watch
   */
  public update(deltaSeconds: number, closestEnemyDistance: number) {
    const dt = Math.min(deltaSeconds, 0.05);

    // 1. Update cooldowns
    for (const key of Object.keys(this.sonarCooldowns) as SonarPulseType[]) {
      if (this.sonarCooldowns[key] > 0) {
        this.sonarCooldowns[key] = Math.max(0, this.sonarCooldowns[key] - dt);
      }
    }

    // 2. Determine Stance & Speeds
    const isShift = this.keysHeld['ShiftLeft'] || this.keysHeld['ShiftRight'];
    const isCtrl = this.keysHeld['KeyC'] || this.keysHeld['ControlLeft'] || this.keysHeld['ControlRight'];

    // Check overhead clearance: prevent uncrouching inside cramped enclosures/lockers
    const hasCeilingClearance = !this.isHidingInLocker;
    if (isCtrl || !hasCeilingClearance) {
      this.stance = 'crouch';
    } else if (isShift && this.stamina > 10) {
      this.stance = 'sprint';
    } else {
      this.stance = 'walk';
    }

    // Stamina drain / recharge
    if (this.stance === 'sprint') {
      this.stamina = Math.max(0, this.stamina - 24 * dt);
    } else {
      this.stamina = Math.min(100, this.stamina + 18 * dt);
    }

    // Target eye height (1.6m standing, 0.9m crouching)
    const targetY = this.stance === 'crouch' ? 0.9 : 1.6;
    this.position.y = THREE.MathUtils.damp(this.position.y, targetY, 10, dt);

    // 3. WASD Movement Vector
    const moveX = (this.keysHeld['KeyD'] ? 1 : 0) - (this.keysHeld['KeyA'] ? 1 : 0);
    const moveZ = (this.keysHeld['KeyS'] ? 1 : 0) - (this.keysHeld['KeyW'] ? 1 : 0);
    const isMoving = (moveX !== 0 || moveZ !== 0) && !this.isHidingInLocker;

    let baseSpeed = this.stance === 'crouch' ? 1.8 : this.stance === 'sprint' ? 5.8 : 3.4;

    // Check if in waist-high flooded zone (Zone 2)
    const isInFloodedZone =
      this.position.z >= HADES_9_LEVEL.floodedArea.minZ &&
      this.position.z <= HADES_9_LEVEL.floodedArea.maxZ;
    if (isInFloodedZone) {
      baseSpeed *= 0.65; // water drag slows movement
    }

    if (isMoving) {
      const inputDir = new THREE.Vector3(moveX, 0, moveZ).normalize();
      // Rotate input direction by camera yaw
      inputDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);

      const nextX = this.position.x + inputDir.x * baseSpeed * dt;
      const nextZ = this.position.z + inputDir.z * baseSpeed * dt;

      // Wall collision resolution with 0.52m capsule radius
      const resolved = this.resolveWallCollisions(nextX, nextZ, 0.52);
      this.position.x = resolved.x;
      this.position.z = resolved.z;

      // Footstep distance accumulator & audio
      this.stepDistanceAccumulator += baseSpeed * dt;
      const stepInterval = this.stance === 'sprint' ? 1.3 : this.stance === 'crouch' ? 0.8 : 1.1;

      if (this.stepDistanceAccumulator >= stepInterval) {
        this.stepDistanceAccumulator = 0;
        this.emitFootstep(isInFloodedZone);
      }

      // Head-bobbing
      this.headBobTimer += dt * baseSpeed * 2.5;
    } else {
      this.currentNoiseDb = Math.max(0, this.currentNoiseDb - 40 * dt);
    }

    // 4. Update Heartbeat & Panic Meter
    this.heartbeatBpm = calculateHeartbeatBpm(
      this.heartbeatBpm,
      closestEnemyDistance,
      this.stance === 'sprint',
      dt
    );
    audioEngine.updateHeartbeat(this.heartbeatBpm);

    // If heartbeat > 135 and enemy close, emit audible pulse
    if (isHeartbeatAudible(this.heartbeatBpm, closestEnemyDistance)) {
      if (Math.random() < 0.05) {
        this.onSoundEmitted?.({
          x: this.position.x,
          z: this.position.z,
          decibels: 18,
          frequencyHz: 75,
          isHostileAlert: false,
          duration: 0.6,
          radiusMax: 4.5,
        });
      }
    }

    // 5. Update Camera Rig with camera occlusion buffer against wall clipping
    const bobOffset = isMoving ? Math.sin(this.headBobTimer) * 0.04 : 0;
    const camSafePos = this.resolveWallCollisions(this.position.x, this.position.z, 0.55);
    this.camera.position.set(camSafePos.x, this.position.y + bobOffset, camSafePos.z);
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');

    // 6. Redraw Diegetic Wristwatch HUD screen
    this.updateWristwatchScreen();
  }

  private emitFootstep(isPuddle: boolean) {
    let noise = BASE_MOVEMENT_NOISE[this.stance];
    if (isPuddle) {
      noise += 14; // puddle splash amplification
    }
    this.currentNoiseDb = noise;

    audioEngine.playFootstep(this.stance === 'crouch', this.stance === 'sprint', isPuddle);

    if (this.onSoundEmitted) {
      this.onSoundEmitted({
        x: this.position.x,
        z: this.position.z,
        decibels: noise,
        frequencyHz: isPuddle ? 450 : 150,
        isHostileAlert: this.stance === 'sprint',
        duration: 0.8,
        radiusMax: noise * 0.45,
      });
    }
  }

  /**
   * Circle-to-line-segment collision resolution against Hades-9 bulkheads
   */
  private resolveWallCollisions(targetX: number, targetZ: number, radius = 0.52): { x: number; z: number } {
    let px = targetX;
    let pz = targetZ;

    for (const wall of HADES_9_LEVEL.walls) {
      // Check if bulkhead is closed
      if (wall.x1 === -1.8 && wall.z1 === 35 && this.hasKeycardAlpha) {
        // Bulkhead Alpha opened
        continue;
      }

      const dx = wall.x2 - wall.x1;
      const dz = wall.z2 - wall.z1;
      const wallLenSq = dx * dx + dz * dz;

      // Project point onto line segment
      let t = ((px - wall.x1) * dx + (pz - wall.z1) * dz) / wallLenSq;
      t = Math.max(0, Math.min(1, t));

      const closestX = wall.x1 + t * dx;
      const closestZ = wall.z1 + t * dz;

      const distX = px - closestX;
      const distZ = pz - closestZ;
      const dist = Math.hypot(distX, distZ);

      if (dist < radius && dist > 0.0001) {
        // Push out of wall
        const overlap = radius - dist;
        px += (distX / dist) * overlap;
        pz += (distZ / dist) * overlap;
      }
    }

    return { x: px, z: pz };
  }

  /**
   * Renders the diegetic digital wristwatch LCD screen
   */
  private updateWristwatchScreen() {
    const ctx = this.watchScreenCanvas.getContext('2d')!;
    ctx.fillStyle = '#050c14';
    ctx.fillRect(0, 0, 256, 256);

    // Neon grid border
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 4;
    ctx.strokeRect(6, 6, 244, 244);

    // Facility ID & Status
    ctx.fillStyle = '#00f0ff';
    ctx.font = 'bold 18px monospace';
    ctx.fillText('HADES-9 ACOUSTIC', 20, 34);

    // BPM & Heartbeat warning
    const bpmColor = this.heartbeatBpm > 130 ? '#ff0044' : this.heartbeatBpm > 95 ? '#f59e0b' : '#10b981';
    ctx.fillStyle = bpmColor;
    ctx.font = 'bold 24px monospace';
    ctx.fillText(`${Math.round(this.heartbeatBpm)} BPM`, 20, 72);

    // Sound Decibel Meter
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px monospace';
    ctx.fillText(`NOISE: ${Math.round(this.currentNoiseDb)} dB`, 20, 110);

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(20, 120, 216, 16);
    const dbRatio = Math.min(1.0, this.currentNoiseDb / 85);
    ctx.fillStyle = dbRatio > 0.7 ? '#ff0044' : dbRatio > 0.4 ? '#f59e0b' : '#00f0ff';
    ctx.fillRect(20, 120, 216 * dbRatio, 16);

    // Battery & Decoys
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '14px monospace';
    ctx.fillText(`DISRUPTOR: [${this.batteryCharges}]`, 20, 165);
    ctx.fillText(`DECOYS:    [${this.decoysCount}]`, 20, 190);
    ctx.fillText(`DEBRIS:    [${this.debrisCount}]`, 20, 215);

    // Ready pulse lights
    const p1Ready = this.sonarCooldowns.low === 0;
    const p2Ready = this.sonarCooldowns.focused === 0;
    const p3Ready = this.sonarCooldowns.heavy === 0;
    ctx.fillStyle = p1Ready ? '#00f0ff' : '#334155';
    ctx.fillRect(20, 235, 20, 10);
    ctx.fillStyle = p2Ready ? '#00f0ff' : '#334155';
    ctx.fillRect(50, 235, 20, 10);
    ctx.fillStyle = p3Ready ? '#00f0ff' : '#334155';
    ctx.fillRect(80, 235, 20, 10);

    this.watchScreenTexture.needsUpdate = true;
  }

  public getStats(): PlayerStats {
    return {
      x: this.position.x,
      y: this.position.y,
      z: this.position.z,
      rotationY: this.yaw,
      pitch: this.pitch,
      stance: this.stance,
      heartbeatBpm: this.heartbeatBpm,
      noiseDb: this.currentNoiseDb,
      stamina: this.stamina,
      oxygen: this.oxygen,
      batteryCharges: this.batteryCharges,
      decoysCount: this.decoysCount,
      debrisCount: this.debrisCount,
      hasKeycardAlpha: this.hasKeycardAlpha,
      isSecondaryPowerRestored: this.isSecondaryPowerRestored,
      isReactorPurged: this.isReactorPurged,
      isHidingInLocker: this.isHidingInLocker,
      sonarCooldowns: { ...this.sonarCooldowns },
      nearbyInteractable: this.nearbyInteractable,
    };
  }

  public dispose() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    this.domElement.removeEventListener('mousemove', this.handleMouseMove);
    this.domElement.removeEventListener('click', this.handleClick);
    this.domElement.removeEventListener('contextmenu', this.handleContextMenu);
    this.domElement.removeEventListener('touchstart', this.handleTouchStart);
    this.domElement.removeEventListener('touchmove', this.handleTouchMove);
  }
}
