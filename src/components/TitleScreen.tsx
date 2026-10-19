/**
 * Title Screen for Acoustic Echo.
 * Features an atmospheric live-world camera flyover, bespoke inline SVG title lockup,
 * primary Start CTA (Enter/Space), and flat control-hint line.
 */
import React, { useEffect } from 'react';
import { Volume2, VolumeX, ShieldAlert, Radio, Activity } from 'lucide-react';
import { audioEngine } from '../game/audioEngine';

interface TitleScreenProps {
  onStart: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStart,
  isMuted,
  onToggleMute,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        onStart();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStart]);

  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-between p-8 sm:p-12 pointer-events-none select-none text-slate-100 font-mono">
      {/* Top Header Cluster */}
      <div className="flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#00f0ff]" />
          <span className="text-xs uppercase tracking-widest text-cyan-400 font-semibold">
            HADES-9 DEEP-SEA RESEARCH FACILITY // SECTOR 03
          </span>
        </div>

        <button
          onClick={onToggleMute}
          aria-label={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          className="flex items-center gap-2 px-3 py-1.5 rounded border border-cyan-500/40 bg-slate-950/80 hover:bg-cyan-950/60 text-xs text-cyan-300 transition-colors"
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          <span>{isMuted ? 'MUTED' : 'AUDIO ACTIVE'}</span>
        </button>
      </div>

      {/* Hero Centerpiece / Title Lockup with 35% negative space */}
      <div className="max-w-xl my-auto pointer-events-auto">
        {/* Bespoke Inline SVG Title Lockup */}
        <div className="mb-4">
          <svg
            viewBox="0 0 540 110"
            className="w-full max-w-lg h-auto overflow-visible"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Acoustic Sonar Wave Rings */}
            <circle cx="55" cy="55" r="48" stroke="#00f0ff" strokeWidth="1.5" strokeDasharray="6 4" opacity="0.3" />
            <circle cx="55" cy="55" r="34" stroke="#00f0ff" strokeWidth="2" strokeDasharray="8 6" opacity="0.6" />
            <circle cx="55" cy="55" r="20" stroke="#00f0ff" strokeWidth="2.5" opacity="0.9" />
            <circle cx="55" cy="55" r="6" fill="#00f0ff" />

            {/* Radar Sweep Line */}
            <line x1="55" y1="55" x2="98" y2="22" stroke="#00f0ff" strokeWidth="2.5" strokeLinecap="round" />

            {/* Typography */}
            <text
              x="130"
              y="58"
              fill="#ffffff"
              fontFamily="'Rajdhani', 'Chakra Petch', monospace"
              fontWeight="700"
              fontSize="48"
              letterSpacing="6"
            >
              ACOUSTIC
            </text>
            <text
              x="130"
              y="95"
              fill="#00f0ff"
              fontFamily="'Rajdhani', 'Chakra Petch', monospace"
              fontWeight="600"
              fontSize="34"
              letterSpacing="8"
            >
              ECHO
            </text>
          </svg>
        </div>

        {/* High Concept Logline */}
        <p className="text-sm text-slate-300 leading-relaxed mb-6 font-sans">
          Stranded 3,000 meters beneath the abyss in pitch-black research facility <span className="text-cyan-300 font-mono">Hades-9</span>.
          Blind apex predators hunt you by sound. Pulse your multi-frequency sonar to see the world—knowing every wave you emit brings them closer.
        </p>

        {/* Feature badges */}
        <div className="flex flex-wrap gap-2 mb-8 text-xs text-cyan-200/80">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-cyan-950/60 border border-cyan-800/50">
            <Radio className="w-3.5 h-3.5 text-cyan-400" /> Multi-Frequency Echolocation
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-rose-950/60 border border-rose-800/50 text-rose-300">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" /> Blind Acoustic Predators
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-950/60 border border-amber-800/50 text-amber-300">
            <Activity className="w-3.5 h-3.5 text-amber-400" /> Heartbeat Panic Tracking
          </span>
        </div>

        {/* Primary Start CTA */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <button
            onClick={onStart}
            data-testid="start-game-button"
            className="flex items-center justify-center gap-3 px-8 py-4 rounded font-bold text-base tracking-widest text-slate-950 bg-gradient-to-r from-cyan-400 via-cyan-300 to-sky-400 hover:brightness-110 active:scale-98 transition-all shadow-[0_0_25px_rgba(0,240,255,0.4)] cursor-pointer"
          >
            <span>ENTER HADES-9</span>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-950/20 text-slate-950 border border-slate-950/30">
              SPACE / ENTER
            </span>
          </button>
        </div>
      </div>

      {/* Flat Control-Hint Line */}
      <div className="pt-4 border-t border-slate-800/80 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-3 pointer-events-auto">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span><kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200">WASD</kbd> Move</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200">Shift</kbd> Sprint</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200">C</kbd> Crouch</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200">1/2/3</kbd> Sonar Pulses</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200">F</kbd> Sonic Disruptor</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200">G</kbd> Decoy</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200">T</kbd> Debris</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200">Space</kbd> Interact</span>
        </div>
        <div className="text-slate-500 text-[11px]">
          v1.0.0 · 3D Acoustic Simulation
        </div>
      </div>
    </div>
  );
};
