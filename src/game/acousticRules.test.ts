import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateAttenuatedNoise,
  doesEnemyDetectSound,
  calculateHeartbeatBpm,
  isHeartbeatAudible,
  updateEnemyStealthAI,
  SONAR_SPECS,
  type StalkerState,
  type SoundEmission,
} from './acousticRules.ts';

test('calculateAttenuatedNoise decreases with distance', () => {
  const atSource = calculateAttenuatedNoise(80, 1);
  assert.equal(atSource, 80);

  const at10m = calculateAttenuatedNoise(80, 10);
  // 80 - 20 * log10(10) = 80 - 20 = 60
  assert.equal(Math.round(at10m), 60);

  const at100m = calculateAttenuatedNoise(80, 100);
  // 80 - 20 * 2 = 40
  assert.equal(Math.round(at100m), 40);
});

test('doesEnemyDetectSound checks hearing threshold', () => {
  const enemy = { x: 0, z: 0, hearingSensitivity: 25 };
  
  // Whisper 20dB at 1m -> perceived 20dB (< 25dB threshold) -> false
  const quietSound = { x: 0, z: 1, decibels: 20 };
  assert.equal(doesEnemyDetectSound(enemy, quietSound).detected, false);

  // Heavy pulse 85dB at 10m -> perceived 65dB (>= 25dB) -> true
  const loudSound = { x: 0, z: 10, decibels: 85 };
  assert.equal(doesEnemyDetectSound(enemy, loudSound).detected, true);
});

test('calculateHeartbeatBpm spikes when predator is near or sprinting', () => {
  // Near predator (< 6m)
  const panicBpm = calculateHeartbeatBpm(70, 4, false, 0.5);
  assert.ok(panicBpm > 70, `Panic BPM should increase, got ${panicBpm}`);

  // Sprinting increases heart rate
  const sprintBpm = calculateHeartbeatBpm(70, 30, true, 0.5);
  assert.ok(sprintBpm > 70, `Sprint BPM should increase, got ${sprintBpm}`);
});

test('isHeartbeatAudible only trips when BPM > 135 and within range', () => {
  assert.equal(isHeartbeatAudible(80, 2), false);
  assert.equal(isHeartbeatAudible(150, 8), false); // too far
  assert.equal(isHeartbeatAudible(155, 2.5), true); // close and high BPM
});

test('updateEnemyStealthAI switches state from patrol to investigate or chase', () => {
  const initialEnemy: StalkerState = {
    id: 'stalker-1',
    x: 0,
    z: 0,
    hearingSensitivity: 20,
    alertness: 0,
    state: 'patrol',
    targetX: 0,
    targetZ: 0,
    stunTimer: 0,
  };

  const heavyPulse: SoundEmission = {
    id: 'sound-1',
    x: 10,
    z: 10,
    decibels: 85,
    frequencyHz: 440,
    isHostileAlert: true,
    createdAt: Date.now(),
    duration: 5,
    radiusMax: 70,
  };

  const updated = updateEnemyStealthAI(initialEnemy, [heavyPulse], 0.1);
  assert.equal(updated.state, 'chase');
  assert.equal(updated.targetX, 10);
  assert.equal(updated.targetZ, 10);
  assert.ok(updated.alertness > 0);
});

test('SONAR_SPECS holds expected parameters', () => {
  assert.equal(SONAR_SPECS.low.noiseDecibels, 12);
  assert.equal(SONAR_SPECS.focused.noiseDecibels, 38);
  assert.equal(SONAR_SPECS.heavy.noiseDecibels, 85);
  assert.ok(SONAR_SPECS.heavy.radius > SONAR_SPECS.focused.radius);
});
