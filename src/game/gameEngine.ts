/**
 * Main game engine orchestrating 60fps WebGL simulation,
 * Three.js scene, acoustic propagation, enemies, and game state transitions.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildHades9Scene, type SceneObjects } from './three/sceneBuilder';
import { AcousticSonarRenderer } from './three/acousticSonarRenderer';
import { EnemyManager } from './three/enemyManager';
import { PlayerController, type PlayerStats } from './three/playerController';
import { type SoundEmission, type SonarPulseType, SONAR_SPECS } from './acousticRules';
import { audioEngine } from './audioEngine';

export type GameState = 'title' | 'playing' | 'paused' | 'game_over' | 'victory';

export interface GameEngineState {
  gameState: GameState;
  stats: PlayerStats | null;
  currentObjective: string;
  objectiveProgress: number; // 0 to 4
  alertMessage: string | null;
  alertType: 'info' | 'warning' | 'danger' | null;
}

export class GameEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;

  private sceneObjects: SceneObjects;
  private sonarRenderer: AcousticSonarRenderer;
  private enemyManager: EnemyManager;
  private player: PlayerController;

  private gameState: GameState = 'title';
  private sounds: SoundEmission[] = [];
  private activeDecoys: Array<{ x: number; z: number; timer: number; chirpTimer: number }> = [];

  private animFrameId: number | null = null;
  private lastTime = 0;
  private hudUpdateTimer = 0;

  // Objective progression
  private currentObjectiveIdx = 0;
  private objectives = [
    'Retrieve Security Keycard Alpha from Specimen Storage',
    'Swipe Keycard Alpha to unlock Bulkhead Alpha',
    'Engage Trench Drainage Pump at Engineering Console',
    'Initiate Core Coolant Purge at Central Reactor Pedestal',
    'Board the Deep-Submersible Nautilus-IV & Escape Hades-9',
  ];

  private alertMessage: string | null = null;
  private alertType: 'info' | 'warning' | 'danger' | null = null;
  private alertTimeout = 0;

  public onStateUpdate?: (state: GameEngineState) => void;

  constructor(container: HTMLElement) {
    this.container = container;

    // Detect headless / CPU WebGL
    const isHeadless =
      navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent);

    // Three.js Renderer setup
    this.renderer = new THREE.WebGLRenderer({
      antialias: !isHeadless,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(isHeadless ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    container.appendChild(this.renderer.domElement);

    // Scene & Environment
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x020509); // Deep abyss black
    this.scene.fog = new THREE.FogExp2(0x020509, 0.035);

    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // Subtle ambient light (mostly pitch black, only sonar & point lights illuminate)
    const ambientLight = new THREE.AmbientLight(0x040810, 0.25);
    this.scene.add(ambientLight);

    // Camera setup
    this.camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      250
    );
    this.scene.add(this.camera);

    // Initialize subsystems
    this.sceneObjects = buildHades9Scene(this.scene);
    this.sonarRenderer = new AcousticSonarRenderer(this.scene);
    this.enemyManager = new EnemyManager(this.scene);
    this.player = new PlayerController(this.camera, this.renderer.domElement);

    this.wirePlayerCallbacks();

    window.addEventListener('resize', this.handleResize);

    // Check autostart query param
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      this.startGame();
    } else {
      // Trigger a periodic cinematic demo pulse on title screen
      this.triggerTitleCinematicPulse();
    }

    this.lastTime = performance.now();
    this.startLoop();
  }

  private wirePlayerCallbacks() {
    this.player.onTriggerPulse = (type, origin) => {
      this.sonarRenderer.triggerPulse(type, origin);
      this.showAlert(`SONAR EMISSION: ${type.toUpperCase()} PULSE FIRED`, type === 'heavy' ? 'warning' : 'info', 2.0);
    };

    this.player.onSoundEmitted = (emission) => {
      this.sounds.push({
        id: `snd_${Date.now()}_${Math.random()}`,
        createdAt: Date.now(),
        ...emission,
      });
    };

    this.player.onThrowDecoy = (origin, target) => {
      this.activeDecoys.push({ x: target.x, z: target.z, timer: 9.0, chirpTimer: 0.5 });
      this.sonarRenderer.triggerPulse('decoy', { x: target.x, y: 0.1, z: target.z });
      this.showAlert('ACOUSTIC DECOY DEPLOYED (REDIRECTING THREATS)', 'info', 2.5);
    };

    this.player.onFireDisruptor = (origin, direction) => {
      this.sonarRenderer.triggerPulse('disruptor', origin);
      const stunnedCount = this.enemyManager.stunEnemiesInRadius(origin.x, origin.z, 16, 4.5);
      if (stunnedCount > 0) {
        this.showAlert(`SONIC DISRUPTOR: ${stunnedCount} THREAT(S) AUDITORY OVERLOAD!`, 'warning', 3.0);
      } else {
        this.showAlert('SONIC DISRUPTOR FIRED', 'info', 2.0);
      }
    };

    this.player.onThrowDebris = (origin, target) => {
      audioEngine.playDebrisImpact();
      this.sonarRenderer.triggerPulse('footstep', { x: target.x, y: 0.1, z: target.z });
      this.sounds.push({
        id: `debris_${Date.now()}`,
        x: target.x,
        z: target.z,
        decibels: 85,
        frequencyHz: 750,
        isHostileAlert: true,
        createdAt: Date.now(),
        duration: 3.0,
        radiusMax: 35,
      });
      this.showAlert('DEBRIS IMPACT: HIGH ACOUSTIC SIGNATURE CREATED', 'warning', 2.5);
    };

    this.player.onObjectiveCompleted = (objectiveId) => {
      if (objectiveId === 'keycard_alpha') {
        this.currentObjectiveIdx = 1;
        this.showAlert('KEYCARD ALPHA ACQUIRED: BULKHEAD CLEARANCE GRANTED', 'info', 4.0);
      } else if (objectiveId === 'bulkhead_unlocked') {
        this.currentObjectiveIdx = 2;
        this.showAlert('BULKHEAD ALPHA OPENED: ENTERING SUBMERGED ENGINEERING', 'warning', 4.0);
        // Open physical airlock door in 3D scene
        if (this.sceneObjects.airlockDoorGroup) {
          this.sceneObjects.airlockDoorGroup.position.y = 8;
        }
      } else if (objectiveId === 'pump_activated') {
        this.currentObjectiveIdx = 3;
        this.showAlert('AUXILIARY DRAINAGE ENGAGED: REACTOR CHAMBER ACCESSIBLE', 'info', 4.0);
      } else if (objectiveId === 'reactor_purged') {
        this.currentObjectiveIdx = 4;
        this.showAlert('CORE COOLANT PURGED: ESCAPE HATCH UNLOCKED! RUN TO NAUTILUS-IV!', 'warning', 5.0);
      } else if (objectiveId === 'escaped') {
        this.setGameState('victory');
      }
    };
  }

  private triggerTitleCinematicPulse() {
    if (this.gameState === 'title') {
      this.sonarRenderer.triggerPulse('focused', { x: 0, y: 1.5, z: 12 });
      setTimeout(() => this.triggerTitleCinematicPulse(), 4000);
    }
  }

  public startGame() {
    this.gameState = 'playing';
    this.sonarRenderer.triggerPulse('focused', {
      x: this.player.position.x,
      y: this.player.position.y,
      z: this.player.position.z,
    });
    this.showAlert('HADES-9 PRIMARY POWER CRITICAL. USE SONAR TO NAVIGATE.', 'info', 4.0);
    this.broadcastState();
  }

  public restartGame() {
    this.player.dispose();
    this.enemyManager.dispose();
    this.sonarRenderer.dispose();

    this.sonarRenderer = new AcousticSonarRenderer(this.scene);
    this.enemyManager = new EnemyManager(this.scene);
    this.player = new PlayerController(this.camera, this.renderer.domElement);
    this.wirePlayerCallbacks();

    this.currentObjectiveIdx = 0;
    this.sounds = [];
    this.activeDecoys = [];
    this.gameState = 'playing';

    if (this.sceneObjects.airlockDoorGroup) {
      this.sceneObjects.airlockDoorGroup.position.y = 2.25;
    }

    this.sonarRenderer.triggerPulse('focused', {
      x: this.player.position.x,
      y: this.player.position.y,
      z: this.player.position.z,
    });
    this.showAlert('RESTARTED AT HADES-9 CONTAINMENT', 'info', 3.0);
    this.broadcastState();
  }

  public togglePause() {
    if (this.gameState === 'playing') {
      this.gameState = 'paused';
    } else if (this.gameState === 'paused') {
      this.gameState = 'playing';
    }
    this.broadcastState();
  }

  public setGameState(state: GameState) {
    this.gameState = state;
    this.broadcastState();
  }

  private showAlert(msg: string, type: 'info' | 'warning' | 'danger', durationSeconds = 3) {
    this.alertMessage = msg;
    this.alertType = type;
    this.alertTimeout = durationSeconds;
  }

  private isHeadless = false;
  private lastRenderTime = 0;

  private startLoop() {
    this.isHeadless =
      Boolean(navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent));

    const loop = (time: number) => {
      if (this.isHeadless && time - this.lastRenderTime < 50) {
        this.animFrameId = requestAnimationFrame(loop);
        return;
      }
      this.lastRenderTime = time;

      const rawDt = (time - this.lastTime) / 1000;
      this.lastTime = time;
      const dt = Math.min(rawDt, 0.05);

      this.update(dt);
      this.renderer.render(this.scene, this.camera);

      this.animFrameId = requestAnimationFrame(loop);
    };

    this.animFrameId = requestAnimationFrame(loop);
  }

  private update(dt: number) {
    // 1. Update 3D scene props (rotating reactor rings, water ripples)
    this.sceneObjects.update(dt);

    if (this.gameState === 'title') {
      // Atmospheric title flyover
      const t = performance.now() * 0.0004;
      this.camera.position.set(Math.sin(t) * 8, 2.5 + Math.cos(t * 1.5) * 0.5, 12 + Math.cos(t) * 8);
      this.camera.lookAt(0, 1.2, 16);
      this.sonarRenderer.update(dt);
      return;
    }

    if (this.gameState !== 'playing') {
      return;
    }

    // 2. Alert message timer
    if (this.alertTimeout > 0) {
      this.alertTimeout -= dt;
      if (this.alertTimeout <= 0) {
        this.alertMessage = null;
        this.alertType = null;
      }
    }

    // 3. Clean up expired sound emissions
    const now = Date.now();
    this.sounds = this.sounds.filter(s => now - s.createdAt < s.duration * 1000);

    // 4. Update active decoy beacons
    for (let i = this.activeDecoys.length - 1; i >= 0; i--) {
      const decoy = this.activeDecoys[i];
      decoy.timer -= dt;
      decoy.chirpTimer -= dt;

      if (decoy.chirpTimer <= 0) {
        decoy.chirpTimer = 1.4;
        audioEngine.playDecoyChirp();
        this.sonarRenderer.triggerPulse('decoy', { x: decoy.x, y: 0.1, z: decoy.z });
        // Emit high-priority sound to attract enemies
        this.sounds.push({
          id: `decoy_pulse_${Date.now()}`,
          x: decoy.x,
          z: decoy.z,
          decibels: 62,
          frequencyHz: 1600,
          isHostileAlert: false,
          createdAt: Date.now(),
          duration: 1.2,
          radiusMax: 28,
        });
      }

      if (decoy.timer <= 0) {
        this.activeDecoys.splice(i, 1);
      }
    }

    // 5. Query closest enemy distance for player anxiety calculation
    const { distance: closestEnemyDist, enemyType } = this.enemyManager.getClosestEnemyDistance(
      this.player.position.x,
      this.player.position.z
    );

    // 6. Update player controller
    this.player.update(dt, closestEnemyDist);

    // Check game over (predator catches player)
    if (closestEnemyDist < 1.4 && !this.player.getStats().isHidingInLocker) {
      audioEngine.playStalkerRoar(0);
      this.setGameState('game_over');
      return;
    }

    // 7. Update enemies with AI & kinematics
    this.enemyManager.update(
      dt,
      { x: this.player.position.x, y: this.player.position.y, z: this.player.position.z },
      this.sounds,
      (screamerPos) => {
        // Sound Screamer shriek emits massive red acoustic wave
        this.sonarRenderer.triggerPulse('screamer', screamerPos);
        this.sounds.push({
          id: `screamer_shriek_${Date.now()}`,
          x: screamerPos.x,
          z: screamerPos.z,
          decibels: 95,
          frequencyHz: 2400,
          isHostileAlert: true,
          createdAt: Date.now(),
          duration: 4.5,
          radiusMax: 50,
        });
        this.showAlert('SOUND SCREAMER TRIGGERED! ALL NEARBY STALKERS ALERTED!', 'danger', 4.0);
      }
    );

    // 8. Update sonar waves and point-cloud memory fade
    this.sonarRenderer.update(dt);

    // 9. Throttle React HUD state broadcast (~12 fps)
    this.hudUpdateTimer += dt;
    if (this.hudUpdateTimer >= 0.08) {
      this.hudUpdateTimer = 0;
      this.broadcastState();
    }
  }

  private broadcastState() {
    if (this.onStateUpdate) {
      this.onStateUpdate({
        gameState: this.gameState,
        stats: this.player.getStats(),
        currentObjective: this.objectives[this.currentObjectiveIdx] || 'Escape Hades-9',
        objectiveProgress: this.currentObjectiveIdx,
        alertMessage: this.alertMessage,
        alertType: this.alertType,
      });
    }
  }

  private handleResize = () => {
    if (!this.container) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  // Player action triggers for HUD button clicks
  public triggerPlayerSonar(type: SonarPulseType) {
    this.player.triggerSonar(type);
  }

  public triggerPlayerDisruptor() {
    this.player.fireDisruptor();
  }

  public triggerPlayerDecoy() {
    this.player.throwDecoy();
  }

  public triggerPlayerDebris() {
    this.player.throwDebris();
  }

  public triggerPlayerInteract() {
    this.player.interactOrBreathe();
  }

  public dispose() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    window.removeEventListener('resize', this.handleResize);
    this.player.dispose();
    this.enemyManager.dispose();
    this.sonarRenderer.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
