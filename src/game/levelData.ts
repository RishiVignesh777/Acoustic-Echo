/**
 * Hades-9 deep-sea research facility level geometry and entity layout.
 * Grid coordinates in meters (X, Z). Y is vertical height (0 = floor).
 */

export interface BoundingBox {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface WallSegment {
  x1: number;
  z1: number;
  x2: number;
  z2: number;
  height: number;
  type: 'bulkhead' | 'containment_glass' | 'grating' | 'reactor_wall';
}

export interface PuddleZone {
  x: number;
  z: number;
  width: number;
  depth: number;
  amplificationFactor: number; // e.g. 1.8x footstep noise
}

export interface SteamVent {
  x: number;
  z: number;
  radius: number;
  maskingNoiseDb: number; // 48 dB masks player footsteps
  damagePerSec: number;
}

export interface InteractiveEntity {
  id: string;
  type: 'keycard_alpha' | 'terminal_airlock' | 'pump_console' | 'reactor_terminal' | 'escape_sub' | 'decoy_pickup' | 'battery_pickup' | 'debris_pickup' | 'locker_hiding';
  x: number;
  y: number;
  z: number;
  label: string;
  actionText: string;
  activated: boolean;
  requiredKey?: string;
}

export interface EnemySpawn {
  id: string;
  type: 'stalker' | 'screamer' | 'leviathan';
  x: number;
  y: number;
  z: number;
  patrolPoints: Array<{ x: number; z: number }>;
}

export interface LevelDefinition {
  playerSpawn: { x: number; y: number; z: number; rotationY: number };
  walls: WallSegment[];
  puddleZones: PuddleZone[];
  floodedArea: BoundingBox; // Zone 2 flooded area
  steamVents: SteamVent[];
  interactives: InteractiveEntity[];
  enemies: EnemySpawn[];
  zones: Array<{ id: string; name: string; bounds: BoundingBox }>;
}

export const HADES_9_LEVEL: LevelDefinition = {
  playerSpawn: { x: 0, y: 1.6, z: 0, rotationY: 0 },
  zones: [
    {
      id: 'zone_1',
      name: 'Hydro-Biology Laboratories',
      bounds: { minX: -25, maxX: 25, minZ: -10, maxZ: 35 },
    },
    {
      id: 'zone_2',
      name: 'Submerged Engineering Trench',
      bounds: { minX: -25, maxX: 25, minZ: 35, maxZ: 95 },
    },
    {
      id: 'zone_3',
      name: 'Central Reactor Core & Escape Dock',
      bounds: { minX: -35, maxX: 35, minZ: 95, maxZ: 175 },
    },
  ],
  walls: [
    // ZONE 1: Spawn Cryo Chamber & Bio-Lab Hallways
    { x1: -8, z1: -6, x2: 8, z2: -6, height: 4.5, type: 'bulkhead' }, // back wall
    { x1: -8, z1: -6, x2: -8, z2: 12, height: 4.5, type: 'bulkhead' }, // left wall
    { x1: 8, z1: -6, x2: 8, z2: 12, height: 4.5, type: 'bulkhead' }, // right wall
    
    // Cryo Containment Divider
    { x1: -8, z1: 6, x2: -2.5, z2: 6, height: 4.5, type: 'containment_glass' },
    { x1: 2.5, z1: 6, x2: 8, z2: 6, height: 4.5, type: 'containment_glass' },

    // Corridor to Lab Lockers & Specimen Room
    { x1: -8, z1: 12, x2: -20, z2: 12, height: 4.5, type: 'bulkhead' },
    { x1: -20, z1: 12, x2: -20, z2: 30, height: 4.5, type: 'bulkhead' },
    { x1: -20, z1: 30, x2: -5, z2: 30, height: 4.5, type: 'bulkhead' },
    { x1: -5, z1: 30, x2: -5, z2: 35, height: 4.5, type: 'bulkhead' }, // corridor into airlock

    // Right wing: Specimen Lab (Keycard Alpha)
    { x1: 8, z1: 12, x2: 20, z2: 12, height: 4.5, type: 'bulkhead' },
    { x1: 20, z1: 12, x2: 20, z2: 30, height: 4.5, type: 'bulkhead' },
    { x1: 20, z1: 30, x2: 5, z2: 30, height: 4.5, type: 'bulkhead' },
    { x1: 5, z1: 30, x2: 5, z2: 35, height: 4.5, type: 'bulkhead' },

    // Central Bio-Lab Corridor
    { x1: -3, z1: 12, x2: -3, z2: 24, height: 4.5, type: 'bulkhead' },
    { x1: 3, z1: 12, x2: 3, z2: 24, height: 4.5, type: 'bulkhead' },

    // Bulkhead Alpha Gate (Between Zone 1 and Zone 2)
    { x1: -5, z1: 35, x2: -1.8, z2: 35, height: 4.5, type: 'bulkhead' },
    { x1: 1.8, z1: 35, x2: 5, z2: 35, height: 4.5, type: 'bulkhead' },

    // ZONE 2: Submerged Engineering & Trench
    { x1: -5, z1: 35, x2: -12, z2: 40, height: 5.0, type: 'bulkhead' },
    { x1: 5, z1: 35, x2: 12, z2: 40, height: 5.0, type: 'bulkhead' },

    // Wide flooded trench walls
    { x1: -12, z1: 40, x2: -14, z2: 85, height: 5.0, type: 'bulkhead' },
    { x1: 12, z1: 40, x2: 14, z2: 85, height: 5.0, type: 'bulkhead' },

    // Engineering Machinery Pillars / Islands
    { x1: -5, z1: 50, x2: -2, z2: 50, height: 5.0, type: 'bulkhead' },
    { x1: -2, z1: 50, x2: -2, z2: 56, height: 5.0, type: 'bulkhead' },
    { x1: -2, z1: 56, x2: -5, z2: 56, height: 5.0, type: 'bulkhead' },
    { x1: -5, z1: 56, x2: -5, z2: 50, height: 5.0, type: 'bulkhead' },

    { x1: 2, z1: 65, x2: 5, z2: 65, height: 5.0, type: 'bulkhead' },
    { x1: 5, z1: 65, x2: 5, z2: 71, height: 5.0, type: 'bulkhead' },
    { x1: 5, z1: 71, x2: 2, z2: 71, height: 5.0, type: 'bulkhead' },
    { x1: 2, z1: 71, x2: 2, z2: 65, height: 5.0, type: 'bulkhead' },

    // Drainage Pump alcove (Right side)
    { x1: 14, z1: 75, x2: 22, z2: 75, height: 5.0, type: 'bulkhead' },
    { x1: 22, z1: 75, x2: 22, z2: 85, height: 5.0, type: 'bulkhead' },
    { x1: 22, z1: 85, x2: 14, z2: 85, height: 5.0, type: 'bulkhead' },

    // Reactor Threshold Gate (Between Zone 2 and Zone 3 at z=95)
    { x1: -14, z1: 85, x2: -3, z2: 95, height: 6.0, type: 'bulkhead' },
    { x1: 14, z1: 85, x2: 3, z2: 95, height: 6.0, type: 'bulkhead' },
    { x1: -3, z1: 95, x2: -1.8, z2: 95, height: 6.0, type: 'reactor_wall' },
    { x1: 1.8, z1: 95, x2: 3, z2: 95, height: 6.0, type: 'reactor_wall' },

    // ZONE 3: Central Reactor Core & Observation Sphere
    // Huge octagonal chamber
    { x1: -3, z1: 95, x2: -24, z2: 105, height: 12.0, type: 'reactor_wall' },
    { x1: 3, z1: 95, x2: 24, z2: 105, height: 12.0, type: 'reactor_wall' },

    { x1: -24, z1: 105, x2: -32, z2: 135, height: 12.0, type: 'reactor_wall' },
    { x1: 24, z1: 105, x2: 32, z2: 135, height: 12.0, type: 'reactor_wall' },

    { x1: -32, z1: 135, x2: -24, z2: 165, height: 12.0, type: 'reactor_wall' },
    { x1: 32, z1: 135, x2: 24, z2: 165, height: 12.0, type: 'reactor_wall' },

    { x1: -24, z1: 165, x2: -5, z2: 175, height: 12.0, type: 'reactor_wall' },
    { x1: 24, z1: 165, x2: 5, z2: 175, height: 12.0, type: 'reactor_wall' },

    // Escape Submersible Dock Hatch (z=175)
    { x1: -5, z1: 175, x2: -2, z2: 175, height: 6.0, type: 'bulkhead' },
    { x1: 2, z1: 175, x2: 5, z2: 175, height: 6.0, type: 'bulkhead' },
    { x1: -5, z1: 175, x2: -5, z2: 185, height: 6.0, type: 'bulkhead' },
    { x1: 5, z1: 175, x2: 5, z2: 185, height: 6.0, type: 'bulkhead' },
    { x1: -5, z1: 185, x2: 5, z2: 185, height: 6.0, type: 'bulkhead' },
  ],
  puddleZones: [
    { x: 0, z: 18, width: 4.5, depth: 8, amplificationFactor: 1.8 },
    { x: -14, z: 22, width: 6, depth: 6, amplificationFactor: 1.9 },
    { x: 12, z: 20, width: 5, depth: 7, amplificationFactor: 1.85 },
  ],
  floodedArea: {
    minX: -14,
    maxX: 14,
    minZ: 40,
    maxZ: 85,
  },
  steamVents: [
    { x: -8, z: 46, radius: 2.8, maskingNoiseDb: 52, damagePerSec: 15 },
    { x: 8, z: 62, radius: 2.8, maskingNoiseDb: 54, damagePerSec: 15 },
    { x: -7, z: 78, radius: 3.2, maskingNoiseDb: 55, damagePerSec: 15 },
  ],
  interactives: [
    // Zone 1
    {
      id: 'keycard_alpha',
      type: 'keycard_alpha',
      x: 15,
      y: 0.9,
      z: 22,
      label: 'Security Keycard Alpha',
      actionText: 'Take Keycard Alpha',
      activated: false,
    },
    {
      id: 'terminal_airlock',
      type: 'terminal_airlock',
      x: 0,
      y: 1.2,
      z: 34.6,
      label: 'Bulkhead Alpha Security Console',
      actionText: 'Swipe Keycard Alpha to Open',
      activated: false,
      requiredKey: 'keycard_alpha',
    },
    {
      id: 'locker_lab_1',
      type: 'locker_hiding',
      x: -16,
      y: 1.0,
      z: 18,
      label: 'Decontamination Locker',
      actionText: 'Hide Inside (Suppresses Noise)',
      activated: false,
    },
    {
      id: 'decoy_pickup_1',
      type: 'decoy_pickup',
      x: -14,
      y: 0.8,
      z: 26,
      label: 'Acoustic Decoy Beacon',
      actionText: 'Pick up Decoy Beacon',
      activated: false,
    },
    {
      id: 'debris_pickup_1',
      type: 'debris_pickup',
      x: 2,
      y: 0.3,
      z: 8,
      label: 'Glass Research Beaker',
      actionText: 'Pick up Throwable Glass',
      activated: false,
    },
    {
      id: 'debris_pickup_2',
      type: 'debris_pickup',
      x: -12,
      y: 0.3,
      z: 15,
      label: 'Heavy Titanium Wrench',
      actionText: 'Pick up Throwable Metal',
      activated: false,
    },

    // Zone 2
    {
      id: 'pump_console',
      type: 'pump_console',
      x: 18,
      y: 1.2,
      z: 80,
      label: 'Emergency Trench Drainage Pump',
      actionText: 'Engage Auxiliary Pump',
      activated: false,
    },
    {
      id: 'battery_pickup_1',
      type: 'battery_pickup',
      x: -8,
      y: 0.8,
      z: 60,
      label: 'Disruptor Battery Cell (+1 Charge)',
      actionText: 'Take Disruptor Battery',
      activated: false,
    },
    {
      id: 'decoy_pickup_2',
      type: 'decoy_pickup',
      x: 6,
      y: 0.8,
      z: 78,
      label: 'Acoustic Decoy Beacon',
      actionText: 'Pick up Decoy Beacon',
      activated: false,
    },

    // Zone 3
    {
      id: 'reactor_terminal',
      type: 'reactor_terminal',
      x: 0,
      y: 1.4,
      z: 135,
      label: 'Reactor Core Control Pedestal',
      actionText: 'Initiate Core Coolant Purge',
      activated: false,
    },
    {
      id: 'battery_pickup_2',
      type: 'battery_pickup',
      x: -15,
      y: 1.2,
      z: 145,
      label: 'Disruptor Battery Cell (+1 Charge)',
      actionText: 'Take Disruptor Battery',
      activated: false,
    },
    {
      id: 'escape_sub',
      type: 'escape_sub',
      x: 0,
      y: 1.5,
      z: 182,
      label: 'Deep-Submersible Nautilus-IV',
      actionText: 'Launch Escape Submersible',
      activated: false,
    },
  ],
  enemies: [
    // Zone 1: First Echo-Stalker patrolling Bio-Lab corridors
    {
      id: 'stalker_alpha',
      type: 'stalker',
      x: -10,
      y: 0,
      z: 22,
      patrolPoints: [
        { x: -10, z: 22 },
        { x: 0, z: 22 },
        { x: 10, z: 22 },
        { x: 0, z: 14 },
      ],
    },
    // Zone 2: Sound Screamer suspended above engineering trench
    {
      id: 'screamer_beta',
      type: 'screamer',
      x: 0,
      y: 4.2,
      z: 58,
      patrolPoints: [{ x: 0, z: 58 }],
    },
    // Zone 2: Second Echo-Stalker stalking the flooded pipes
    {
      id: 'stalker_gamma',
      type: 'stalker',
      x: 4,
      y: 0,
      z: 72,
      patrolPoints: [
        { x: 4, z: 72 },
        { x: -6, z: 66 },
        { x: -4, z: 82 },
        { x: 8, z: 80 },
      ],
    },
    // Zone 3: The Resonance Leviathan roaming the reactor abyss
    {
      id: 'leviathan_prime',
      type: 'leviathan',
      x: 0,
      y: -2.5,
      z: 135,
      patrolPoints: [
        { x: 0, z: 120 },
        { x: 18, z: 135 },
        { x: 0, z: 152 },
        { x: -18, z: 135 },
      ],
    },
  ],
};
