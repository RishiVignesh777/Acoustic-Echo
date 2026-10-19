/**
 * Pure acoustic and stealth simulation rules for Hades-9.
 * Decoupled from Three.js and DOM for deterministic unit testing.
 */

export type MovementStance = 'crouch' | 'walk' | 'sprint';

export interface SoundEmission {
  id: string;
  x: number;
  z: number;
  decibels: number; // dB
  frequencyHz: number;
  isHostileAlert: boolean; // if high pulse or loud scream
  createdAt: number;
  duration: number; // in seconds
  radiusMax: number;
}

export type SonarPulseType = 'low' | 'focused' | 'heavy';

export interface SonarSpec {
  type: SonarPulseType;
  radius: number; // meters
  visibilityDuration: number; // seconds
  noiseDecibels: number;
  cooldownSeconds: number;
  alertRadius: number;
}

export const SONAR_SPECS: Record<SonarPulseType, SonarSpec> = {
  low: {
    type: 'low',
    radius: 14,
    visibilityDuration: 2.0,
    noiseDecibels: 12,
    cooldownSeconds: 1.2,
    alertRadius: 5,
  },
  focused: {
    type: 'focused',
    radius: 32,
    visibilityDuration: 3.8,
    noiseDecibels: 38,
    cooldownSeconds: 3.5,
    alertRadius: 18,
  },
  heavy: {
    type: 'heavy',
    radius: 70,
    visibilityDuration: 6.0,
    noiseDecibels: 85,
    cooldownSeconds: 8.0,
    alertRadius: 65,
  },
};

export const BASE_MOVEMENT_NOISE: Record<MovementStance, number> = {
  crouch: 8,   // very silent
  walk: 28,    // detectable at medium range
  sprint: 68,  // loud, detectable at long range
};

export interface StalkerState {
  id: string;
  x: number;
  z: number;
  hearingSensitivity: number; // min dB detectable at 1m (e.g. 15dB)
  alertness: number; // 0 (calm) to 100 (hunting/aggro)
  state: 'patrol' | 'investigate' | 'chase' | 'stunned';
  targetX: number;
  targetZ: number;
  stunTimer: number;
}

/**
 * Calculates sound attenuation with inverse distance law.
 * Sound level at distance r: L(r) = L0 - 20 * log10(max(1, r))
 */
export function calculateAttenuatedNoise(sourceDecibels: number, distanceMeters: number): number {
  if (distanceMeters <= 1) return sourceDecibels;
  const attenuation = 20 * Math.log10(distanceMeters);
  return Math.max(0, sourceDecibels - attenuation);
}

/**
 * Checks if an enemy detects a sound emission based on distance and background noise.
 */
export function doesEnemyDetectSound(
  enemy: { x: number; z: number; hearingSensitivity: number },
  sound: { x: number; z: number; decibels: number },
  backgroundNoiseDb = 0
): { detected: boolean; perceivedDb: number } {
  const dx = enemy.x - sound.x;
  const dz = enemy.z - sound.z;
  const distance = Math.hypot(dx, dz);
  const perceivedDb = calculateAttenuatedNoise(sound.decibels, distance);
  const netPerceived = perceivedDb - backgroundNoiseDb;
  const detected = netPerceived >= enemy.hearingSensitivity;
  return { detected, perceivedDb: Math.max(0, netPerceived) };
}

/**
 * Updates player panic / heartbeat based on predator proximity, sprint duration, and stamina.
 */
export function calculateHeartbeatBpm(
  currentBpm: number,
  closestEnemyDistance: number,
  isSprinting: boolean,
  deltaSeconds: number
): number {
  let targetBpm = 70; // baseline resting heart rate

  if (closestEnemyDistance < 6) {
    targetBpm = 160; // extreme panic
  } else if (closestEnemyDistance < 14) {
    targetBpm = 130; // high anxiety
  } else if (closestEnemyDistance < 24) {
    targetBpm = 100; // tense
  }

  if (isSprinting) {
    targetBpm = Math.max(targetBpm, 145);
  }

  // Smooth interpolation toward target BPM
  const rate = deltaSeconds * 1.8;
  const newBpm = currentBpm + (targetBpm - currentBpm) * Math.min(1, rate);
  return Math.round(newBpm * 10) / 10;
}

/**
 * Heartbeat audibility: If BPM exceeds 135 and enemy is within close proximity,
 * heartbeat produces detectable acoustic micro-pulses.
 */
export function isHeartbeatAudible(bpm: number, enemyDistance: number): boolean {
  if (bpm < 135) return false;
  const maxDetectionDistance = ((bpm - 135) / 25) * 4.5; // up to 4.5m at 160 BPM
  return enemyDistance <= maxDetectionDistance;
}

/**
 * Evaluates enemy reaction to a detected sound.
 */
export function updateEnemyStealthAI(
  stalker: StalkerState,
  sounds: SoundEmission[],
  deltaSeconds: number
): StalkerState {
  if (stalker.state === 'stunned') {
    const remainingStun = Math.max(0, stalker.stunTimer - deltaSeconds);
    return {
      ...stalker,
      stunTimer: remainingStun,
      state: remainingStun === 0 ? 'patrol' : 'stunned',
    };
  }

  let highestAlertSound: SoundEmission | null = null;
  let maxPerceivedDb = 0;

  for (const sound of sounds) {
    const { detected, perceivedDb } = doesEnemyDetectSound(stalker, sound);
    if (detected && perceivedDb > maxPerceivedDb) {
      maxPerceivedDb = perceivedDb;
      highestAlertSound = sound;
    }
  }

  let nextAlertness = stalker.alertness;
  let nextState = stalker.state;
  let nextTargetX = stalker.targetX;
  let nextTargetZ = stalker.targetZ;

  if (highestAlertSound) {
    // Sound detected! Alertness increases based on perceived dB
    nextAlertness = Math.min(100, nextAlertness + maxPerceivedDb * 0.8 * deltaSeconds * 2.5);
    nextTargetX = highestAlertSound.x;
    nextTargetZ = highestAlertSound.z;

    if (highestAlertSound.isHostileAlert || nextAlertness > 65) {
      nextState = 'chase';
    } else {
      nextState = 'investigate';
    }
  } else {
    // No sound detected - alertness decays
    nextAlertness = Math.max(0, nextAlertness - 12 * deltaSeconds);
    if (nextAlertness < 20 && stalker.state !== 'patrol') {
      nextState = 'patrol';
    }
  }

  return {
    ...stalker,
    alertness: Math.round(nextAlertness * 10) / 10,
    state: nextState,
    targetX: nextTargetX,
    targetZ: nextTargetZ,
  };
}
