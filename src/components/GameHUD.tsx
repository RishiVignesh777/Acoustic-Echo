/**
 * Low-occlusion perimeter HUD for Acoustic Echo.
 * Covers <15% of the playfield with pointer-events: none on overlay wrapper.
 * Displays diegetic status, tabular-nums readouts, sonar triggers, and tactical tools.
 */
import React, { useState } from 'react';
import {
  Activity,
  Radio,
  Zap,
  Volume2,
  VolumeX,
  Crosshair,
  Package,
  Layers,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Hand,
} from 'lucide-react';
import type { PlayerStats } from '../game/three/playerController';
import type { SonarPulseType } from '../game/acousticRules';

interface GameHUDProps {
  stats: PlayerStats | null;
  currentObjective: string;
  objectiveProgress: number;
  alertMessage: string | null;
  alertType: 'info' | 'warning' | 'danger' | null;
  isMuted: boolean;
  onToggleMute: () => void;
  onTriggerSonar: (type: SonarPulseType) => void;
  onFireDisruptor: () => void;
  onThrowDecoy: () => void;
  onThrowDebris: () => void;
  onInteract: () => void;
  onPause: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  stats,
  currentObjective,
  objectiveProgress,
  alertMessage,
  alertType,
  isMuted,
  onToggleMute,
  onTriggerSonar,
  onFireDisruptor,
  onThrowDecoy,
  onThrowDebris,
  onInteract,
  onPause,
}) => {
  const [isDockCollapsed, setIsDockCollapsed] = useState(false);

  const bpm = stats?.heartbeatBpm ?? 70;
  const noiseDb = stats?.noiseDb ?? 0;
  const stance = stats?.stance ?? 'walk';
  const battery = stats?.batteryCharges ?? 0;
  const decoys = stats?.decoysCount ?? 0;
  const debris = stats?.debrisCount ?? 0;
  const nearby = stats?.nearbyInteractable;

  // Determine zone name by player Z
  const playerZ = stats?.z ?? 0;
  let zoneName = 'ZONE 1: HYDRO-BIOLOGY LAB';
  if (playerZ >= 95) {
    zoneName = 'ZONE 3: CENTRAL REACTOR SPHERE';
  } else if (playerZ >= 35) {
    zoneName = 'ZONE 2: FLOODED ENGINEERING TRENCH';
  }

  const bpmColor =
    bpm > 135 ? 'text-rose-400 border-rose-500/50 bg-rose-950/80' :
    bpm > 100 ? 'text-amber-400 border-amber-500/50 bg-amber-950/80' :
    'text-emerald-400 border-emerald-500/50 bg-slate-950/80';

  return (
    <div className="absolute inset-0 z-10 pointer-events-none select-none font-mono flex flex-col justify-between p-4 sm:p-6 text-slate-200">
      {/* TOP PERIMETER CLUSTER */}
      <div className="flex items-start justify-between gap-4">
        {/* Left: Zone & Objective */}
        <div className="flex flex-col gap-1.5 max-w-md pointer-events-auto">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span className="text-[11px] uppercase tracking-wider text-cyan-400 font-semibold">
              {zoneName}
            </span>
          </div>

          <div className="px-3 py-2 rounded border border-cyan-500/30 bg-slate-950/85 shadow-lg">
            <div className="flex items-center justify-between text-[11px] text-cyan-300/80 mb-0.5">
              <span>ACTIVE DIRECTIVE</span>
              <span className="tabular-nums font-bold text-cyan-400">[{objectiveProgress + 1}/5]</span>
            </div>
            <div className="text-xs text-slate-100 font-semibold leading-tight font-sans">
              {currentObjective}
            </div>
          </div>
        </div>

        {/* Right: Quick actions (Mute, Pause) */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={onToggleMute}
            aria-label={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            className="p-2 rounded border border-slate-700 bg-slate-950/85 hover:bg-slate-900 text-slate-300 transition-colors"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>
          <button
            onClick={onPause}
            aria-label="Pause Game"
            className="px-3 py-1.5 rounded border border-slate-700 bg-slate-950/85 hover:bg-slate-900 text-xs text-slate-300 transition-colors"
          >
            PAUSE [ESC]
          </button>
        </div>
      </div>

      {/* CENTER NOTIFICATION BANNER / INTERACTION PROMPT */}
      <div className="flex flex-col items-center gap-3 my-auto">
        {/* Active alert message */}
        {alertMessage && (
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded text-xs font-semibold tracking-wide border shadow-xl ${
              alertType === 'danger'
                ? 'bg-rose-950/90 border-rose-500 text-rose-200'
                : alertType === 'warning'
                ? 'bg-amber-950/90 border-amber-500 text-amber-200'
                : 'bg-cyan-950/90 border-cyan-500 text-cyan-200'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>{alertMessage}</span>
          </div>
        )}

        {/* Proximity Interaction Prompt */}
        {nearby && (
          <div className="pointer-events-auto">
            <button
              onClick={onInteract}
              data-testid="interact-action-button"
              className="flex items-center gap-2.5 px-5 py-2.5 rounded-lg border border-amber-400 bg-amber-950/90 hover:bg-amber-900 text-amber-100 text-sm font-bold shadow-[0_0_20px_rgba(245,158,11,0.5)] cursor-pointer active:scale-95 transition-all"
            >
              <Hand className="w-4 h-4 text-amber-300" />
              <span>{nearby.actionText}</span>
              <kbd className="px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 text-xs">
                SPACE
              </kbd>
            </button>
          </div>
        )}
      </div>

      {/* BOTTOM UNIFIED CONTROL DOCK (<15% Screen Occlusion) */}
      <div className="flex flex-col items-center pointer-events-auto">
        {/* Collapse / Expand Toggle Button */}
        <button
          onClick={() => setIsDockCollapsed(!isDockCollapsed)}
          className="mb-1.5 px-3 py-1 rounded-t border border-b-0 border-cyan-800/60 bg-slate-950/90 hover:bg-slate-900 text-[11px] text-cyan-300 flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          {isDockCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              <span>EXPAND HUD</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              <span>COLLAPSE HUD [H]</span>
            </>
          )}
        </button>

        {!isDockCollapsed && (
          <div className="w-full max-w-4xl p-3 sm:p-4 rounded-xl border border-cyan-500/40 bg-slate-950/92 shadow-[0_-5px_25px_rgba(0,0,0,0.8)] flex flex-wrap items-center justify-between gap-4">
            {/* 1. Vital Signs Cluster (Heartbeat & Noise) */}
            <div className="flex items-center gap-4">
              {/* Heartbeat ECG */}
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded border ${bpmColor}`}>
                <Activity className="w-4 h-4" />
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400">HEART RATE</span>
                  <span className="text-sm font-bold tabular-nums">{Math.round(bpm)} BPM</span>
                </div>
              </div>

              {/* Sound Noise Meter */}
              <div className="flex flex-col gap-1 w-28 sm:w-36">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>ACOUSTIC DB</span>
                  <span className="text-cyan-400 font-bold tabular-nums">{Math.round(noiseDb)} dB</span>
                </div>
                <div className="w-full h-2 rounded bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-100 ${
                      noiseDb > 65 ? 'bg-rose-500' : noiseDb > 35 ? 'bg-amber-400' : 'bg-cyan-400'
                    }`}
                    style={{ width: `${Math.min(100, (noiseDb / 85) * 100)}%` }}
                  />
                </div>
                <span className="text-[9px] text-slate-400 uppercase">
                  STANCE: <strong className="text-slate-200">{stance}</strong>
                </span>
              </div>
            </div>

            {/* 2. Sonar Multi-Frequency Pulse Triggers */}
            <div className="flex items-center gap-2">
              {/* Low Pulse */}
              <button
                onClick={() => onTriggerSonar('low')}
                disabled={(stats?.sonarCooldowns.low ?? 0) > 0}
                className="flex flex-col items-center px-3 py-1.5 rounded border border-cyan-500/40 bg-slate-900/90 hover:bg-cyan-950/80 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-left"
              >
                <div className="flex items-center gap-1.5 text-xs text-cyan-300 font-bold">
                  <Radio className="w-3.5 h-3.5 text-cyan-400" />
                  <span>LOW PULSE</span>
                  <kbd className="px-1 py-0.2 rounded bg-cyan-950 text-cyan-300 text-[10px]">1</kbd>
                </div>
                <span className="text-[9px] text-slate-400">Silent · 14m</span>
              </button>

              {/* Focused Pulse */}
              <button
                onClick={() => onTriggerSonar('focused')}
                disabled={(stats?.sonarCooldowns.focused ?? 0) > 0}
                className="flex flex-col items-center px-3 py-1.5 rounded border border-cyan-500/40 bg-slate-900/90 hover:bg-cyan-950/80 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-left"
              >
                <div className="flex items-center gap-1.5 text-xs text-cyan-300 font-bold">
                  <Radio className="w-3.5 h-3.5 text-cyan-400" />
                  <span>FOCUSED</span>
                  <kbd className="px-1 py-0.2 rounded bg-cyan-950 text-cyan-300 text-[10px]">2 / E</kbd>
                </div>
                <span className="text-[9px] text-slate-400">Corridor · 32m</span>
              </button>

              {/* Heavy Pulse */}
              <button
                onClick={() => onTriggerSonar('heavy')}
                disabled={(stats?.sonarCooldowns.heavy ?? 0) > 0}
                className="flex flex-col items-center px-3 py-1.5 rounded border border-rose-500/50 bg-slate-900/90 hover:bg-rose-950/80 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-left"
              >
                <div className="flex items-center gap-1.5 text-xs text-rose-300 font-bold">
                  <Radio className="w-3.5 h-3.5 text-rose-400" />
                  <span>HEAVY</span>
                  <kbd className="px-1 py-0.2 rounded bg-rose-950 text-rose-300 text-[10px]">3 / Q</kbd>
                </div>
                <span className="text-[9px] text-rose-400 font-medium">Loud · 70m</span>
              </button>
            </div>

            {/* 3. Tactical Survival Tools */}
            <div className="flex items-center gap-2">
              {/* Disruptor */}
              <button
                onClick={onFireDisruptor}
                disabled={battery <= 0}
                className="flex items-center gap-2 px-3 py-2 rounded border border-purple-500/50 bg-slate-900/90 hover:bg-purple-950/80 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <Zap className="w-4 h-4 text-purple-400" />
                <div className="flex flex-col text-left">
                  <span className="text-[10px] text-purple-300 font-bold">DISRUPTOR [F]</span>
                  <span className="text-[11px] text-purple-200 tabular-nums">x{battery} CELL</span>
                </div>
              </button>

              {/* Decoy */}
              <button
                onClick={onThrowDecoy}
                disabled={decoys <= 0}
                className="flex items-center gap-2 px-3 py-2 rounded border border-amber-500/50 bg-slate-900/90 hover:bg-amber-950/80 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <Crosshair className="w-4 h-4 text-amber-400" />
                <div className="flex flex-col text-left">
                  <span className="text-[10px] text-amber-300 font-bold">DECOY [G]</span>
                  <span className="text-[11px] text-amber-200 tabular-nums">x{decoys}</span>
                </div>
              </button>

              {/* Debris */}
              <button
                onClick={onThrowDebris}
                disabled={debris <= 0}
                className="flex items-center gap-2 px-3 py-2 rounded border border-slate-600 bg-slate-900/90 hover:bg-slate-800 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <Package className="w-4 h-4 text-slate-400" />
                <div className="flex flex-col text-left">
                  <span className="text-[10px] text-slate-300 font-bold">DEBRIS [T]</span>
                  <span className="text-[11px] text-slate-300 tabular-nums">x{debris}</span>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
