/**
 * Acoustic Sonar Renderer for Hades-9.
 * Simulates real-time multi-frequency echolocation point-clouds,
 * expanding soundwave rings, and pitch-black spatial decay memory.
 */
import * as THREE from 'three';
import { type SonarPulseType, SONAR_SPECS } from '../acousticRules';
import { HADES_9_LEVEL } from '../levelData';

export interface ActivePulse {
  id: string;
  type: SonarPulseType | 'footstep' | 'screamer' | 'disruptor' | 'decoy';
  x: number;
  y: number;
  z: number;
  currentRadius: number;
  maxRadius: number;
  speed: number; // m/s
  intensity: number;
  color: THREE.Color;
  duration: number; // total fade duration
  elapsed: number;
  waveMesh: THREE.Mesh | null;
  light: THREE.PointLight | null;
}

export class AcousticSonarRenderer {
  private scene: THREE.Scene;
  private activePulses: ActivePulse[] = [];

  // Point cloud system
  private pointCloud: THREE.Points;
  private pointPositions: Float32Array;
  private pointColors: Float32Array;
  private pointAlphas: Float32Array; // decay timers
  private pointBaseColors: Float32Array; // default colors (cyan for geo, amber for items, red for enemies)
  private pointCount: number = 0;

  // Sound ripple pool
  private rippleGroup: THREE.Group;
  private pulseGeometry: THREE.BufferGeometry;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.rippleGroup = new THREE.Group();
    this.scene.add(this.rippleGroup);

    // Common wave geometry
    this.pulseGeometry = new THREE.RingGeometry(0.9, 1.0, 32);
    this.pulseGeometry.rotateX(-Math.PI / 2);

    // Initialize point cloud on facility surfaces
    const { points, baseColors, count } = this.generateFacilityPointCloud();
    this.pointCount = count;
    this.pointPositions = points;
    this.pointBaseColors = baseColors;
    this.pointColors = new Float32Array(count * 3);
    this.pointAlphas = new Float32Array(count); // all start at 0 (pitch black)

    const cloudGeo = new THREE.BufferGeometry();
    cloudGeo.setAttribute('position', new THREE.BufferAttribute(this.pointPositions, 3));
    cloudGeo.setAttribute('color', new THREE.BufferAttribute(this.pointColors, 3));

    // Custom point material with additive blending and soft glow
    const pointTexture = this.createSoftDotTexture();
    const cloudMat = new THREE.PointsMaterial({
      size: 0.16,
      map: pointTexture,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.pointCloud = new THREE.Points(cloudGeo, cloudMat);
    this.scene.add(this.pointCloud);
  }

  private createSoftDotTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.35, 'rgba(255, 255, 255, 0.8)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(16, 16, 16, 0, Math.PI * 2);
    ctx.fill();

    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }

  /**
   * Generates a dense 3D point cloud along Hades-9 walls, floors, ceilings, and interactive objects.
   */
  private generateFacilityPointCloud(): { points: Float32Array; baseColors: Float32Array; count: number } {
    const coords: number[] = [];
    const colors: number[] = [];

    const cyan = new THREE.Color(0x00f0ff);
    const darkCyan = new THREE.Color(0x006688);
    const amber = new THREE.Color(0xffaa00);

    // 1. Floor grid points across all zones (minZ = -6, maxZ = 185)
    for (let z = -6; z <= 185; z += 1.2) {
      for (let x = -28; x <= 28; x += 1.2) {
        // Only add if within zone boundaries
        let inBounds = false;
        if (z < 35 && Math.abs(x) <= 20) inBounds = true;
        else if (z >= 35 && z < 95 && Math.abs(x) <= 14) inBounds = true;
        else if (z >= 95 && Math.abs(x) <= 32) inBounds = true;

        if (inBounds) {
          coords.push(x + (Math.random() - 0.5) * 0.3, 0.05, z + (Math.random() - 0.5) * 0.3);
          colors.push(cyan.r, cyan.g, cyan.b);
        }
      }
    }

    // 2. Wall points along segments
    for (const wall of HADES_9_LEVEL.walls) {
      const len = Math.hypot(wall.x2 - wall.x1, wall.z2 - wall.z1);
      const steps = Math.ceil(len / 1.0);
      const heightSteps = Math.ceil(wall.height / 0.8);

      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const wx = wall.x1 + (wall.x2 - wall.x1) * t;
        const wz = wall.z1 + (wall.z2 - wall.z1) * t;

        for (let h = 0; h <= heightSteps; h++) {
          const wy = (h / heightSteps) * wall.height;
          coords.push(wx + (Math.random() - 0.5) * 0.15, wy, wz + (Math.random() - 0.5) * 0.15);
          colors.push(darkCyan.r, darkCyan.g, darkCyan.b);
        }
      }
    }

    // 3. Interactive object highlights (dense amber point clusters)
    for (const item of HADES_9_LEVEL.interactives) {
      for (let i = 0; i < 40; i++) {
        const rad = 0.6 * Math.random();
        const theta = Math.random() * Math.PI * 2;
        coords.push(
          item.x + Math.cos(theta) * rad,
          item.y + (Math.random() - 0.5) * 0.6,
          item.z + Math.sin(theta) * rad
        );
        colors.push(amber.r, amber.g, amber.b);
      }
    }

    // 4. Ceiling catwalks / pipes
    for (let z = 0; z <= 180; z += 3) {
      coords.push(-2, 4.2, z);
      colors.push(cyan.r * 0.8, cyan.g * 0.8, cyan.b * 0.8);
      coords.push(2, 4.2, z);
      colors.push(cyan.r * 0.8, cyan.g * 0.8, cyan.b * 0.8);
    }

    const count = coords.length / 3;
    return {
      points: new Float32Array(coords),
      baseColors: new Float32Array(colors),
      count,
    };
  }

  /**
   * Emits a new acoustic sonar pulse
   */
  public triggerPulse(
    type: SonarPulseType | 'footstep' | 'screamer' | 'disruptor' | 'decoy',
    origin: { x: number; y: number; z: number }
  ) {
    let maxRadius = 16;
    let speed = 20;
    let duration = 2.0;
    let colorHex = 0x00f0ff; // Cyan
    let lightIntensity = 2.5;

    if (type === 'low') {
      maxRadius = SONAR_SPECS.low.radius;
      speed = 22;
      duration = SONAR_SPECS.low.visibilityDuration;
      colorHex = 0x00f0ff;
      lightIntensity = 3.0;
    } else if (type === 'focused') {
      maxRadius = SONAR_SPECS.focused.radius;
      speed = 28;
      duration = SONAR_SPECS.focused.visibilityDuration;
      colorHex = 0x00e1ff;
      lightIntensity = 4.5;
    } else if (type === 'heavy') {
      maxRadius = SONAR_SPECS.heavy.radius;
      speed = 34;
      duration = SONAR_SPECS.heavy.visibilityDuration;
      colorHex = 0x38bdf8;
      lightIntensity = 7.0;
    } else if (type === 'footstep') {
      maxRadius = 7.0;
      speed = 12;
      duration = 0.9;
      colorHex = 0x0284c7;
      lightIntensity = 0.8;
    } else if (type === 'screamer') {
      maxRadius = 45.0;
      speed = 36;
      duration = 4.0;
      colorHex = 0xff0044; // Pulsing Red
      lightIntensity = 6.0;
    } else if (type === 'disruptor') {
      maxRadius = 24.0;
      speed = 38;
      duration = 3.5;
      colorHex = 0xa855f7; // Purple sonic shockwave
      lightIntensity = 8.0;
    } else if (type === 'decoy') {
      maxRadius = 20.0;
      speed = 20;
      duration = 2.2;
      colorHex = 0xf59e0b; // Amber decoy ring
      lightIntensity = 3.5;
    }

    // Dynamic wave ring mesh
    const waveMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const waveMesh = new THREE.Mesh(this.pulseGeometry, waveMat);
    waveMesh.position.set(origin.x, origin.y > 0.5 ? origin.y : 0.05, origin.z);
    this.scene.add(waveMesh);

    // Dynamic light flash that travels with the pulse
    const light = new THREE.PointLight(colorHex, lightIntensity, maxRadius * 0.8, 1.5);
    light.position.set(origin.x, origin.y + 0.5, origin.z);
    this.scene.add(light);

    this.activePulses.push({
      id: `pulse_${Date.now()}_${Math.random()}`,
      type,
      x: origin.x,
      y: origin.y,
      z: origin.z,
      currentRadius: 0.1,
      maxRadius,
      speed,
      intensity: lightIntensity,
      color: new THREE.Color(colorHex),
      duration,
      elapsed: 0,
      waveMesh,
      light,
    });
  }

  /**
   * Main per-frame update for acoustic waves and point cloud decay
   */
  public update(deltaSeconds: number) {
    const dt = Math.min(deltaSeconds, 0.05);

    // 1. Advance active pulses
    for (let i = this.activePulses.length - 1; i >= 0; i--) {
      const p = this.activePulses[i];
      p.elapsed += dt;
      p.currentRadius += p.speed * dt;

      const progress = p.elapsed / p.duration;

      // Expand & fade wave ring
      if (p.waveMesh) {
        const scale = Math.max(0.1, p.currentRadius);
        p.waveMesh.scale.set(scale, scale, scale);
        const mat = p.waveMesh.material as THREE.MeshBasicMaterial;
        mat.opacity = Math.max(0, (1 - progress) * 0.8);
      }

      // Fade dynamic point light
      if (p.light) {
        p.light.intensity = Math.max(0, p.intensity * (1 - progress * 1.5));
      }

      // Check point cloud resonance: points near wavefront get excited!
      this.resonatePoints(p);

      // Clean up finished pulses
      if (p.elapsed >= p.duration || p.currentRadius >= p.maxRadius) {
        if (p.waveMesh) {
          this.scene.remove(p.waveMesh);
          p.waveMesh.geometry.dispose();
          (p.waveMesh.material as THREE.Material).dispose();
        }
        if (p.light) {
          this.scene.remove(p.light);
          p.light.dispose();
        }
        this.activePulses.splice(i, 1);
      }
    }

    // 2. Decay point cloud alphas back to pitch black
    let colorsNeedUpdate = false;
    const decayRate = dt * 0.9;

    for (let i = 0; i < this.pointCount; i++) {
      if (this.pointAlphas[i] > 0) {
        this.pointAlphas[i] = Math.max(0, this.pointAlphas[i] - decayRate);
        const alpha = this.pointAlphas[i];

        const idx = i * 3;
        this.pointColors[idx] = this.pointBaseColors[idx] * alpha;
        this.pointColors[idx + 1] = this.pointBaseColors[idx + 1] * alpha;
        this.pointColors[idx + 2] = this.pointBaseColors[idx + 2] * alpha;
        colorsNeedUpdate = true;
      }
    }

    if (colorsNeedUpdate) {
      this.pointCloud.geometry.attributes.color.needsUpdate = true;
    }
  }

  /**
   * Resonates points that fall within the current wavefront shell
   */
  private resonatePoints(pulse: ActivePulse) {
    const waveRadius = pulse.currentRadius;
    const thickness = 2.4; // width of wavefront resonance band
    const minR = waveRadius - thickness;
    const maxR = waveRadius + thickness;

    const px = pulse.x;
    const py = pulse.y;
    const pz = pulse.z;

    for (let i = 0; i < this.pointCount; i++) {
      const idx = i * 3;
      const x = this.pointPositions[idx];
      const y = this.pointPositions[idx + 1];
      const z = this.pointPositions[idx + 2];

      const dx = x - px;
      const dy = y - py;
      const dz = z - pz;
      const dist = Math.hypot(dx, dy, dz);

      if (dist >= minR && dist <= maxR && dist <= pulse.maxRadius) {
        // Point is hit by the acoustic wave!
        const strength = 1.0 - (dist / pulse.maxRadius) * 0.4;
        this.pointAlphas[i] = Math.max(this.pointAlphas[i], strength);

        // Flash point color
        this.pointColors[idx] = this.pointBaseColors[idx] * strength;
        this.pointColors[idx + 1] = this.pointBaseColors[idx + 1] * strength;
        this.pointColors[idx + 2] = this.pointBaseColors[idx + 2] * strength;
      }
    }

    this.pointCloud.geometry.attributes.color.needsUpdate = true;
  }

  public dispose() {
    for (const p of this.activePulses) {
      if (p.waveMesh) {
        this.scene.remove(p.waveMesh);
        p.waveMesh.geometry.dispose();
        (p.waveMesh.material as THREE.Material).dispose();
      }
      if (p.light) {
        this.scene.remove(p.light);
        p.light.dispose();
      }
    }
    this.activePulses = [];
    this.scene.remove(this.pointCloud);
    this.pointCloud.geometry.dispose();
    (this.pointCloud.material as THREE.Material).dispose();
    this.scene.remove(this.rippleGroup);
  }
}
