/**
 * Pause Modal for Acoustic Echo
 */
import React from 'react';
import { Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestart,
  isMuted,
  onToggleMute,
}) => {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-slate-950/80 font-mono text-slate-100">
      <div className="w-full max-w-md p-6 sm:p-8 rounded-2xl border border-cyan-500/40 bg-slate-950/95 shadow-[0_0_50px_rgba(0,0,0,0.9)] flex flex-col gap-6 text-center">
        <div>
          <span className="text-xs uppercase tracking-widest text-cyan-400 font-semibold">
            SYSTEM SUSPENDED
          </span>
          <h2 className="text-2xl font-bold tracking-wider text-slate-100 mt-1">
            MISSION PAUSED
          </h2>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={onResume}
            className="flex items-center justify-center gap-2.5 px-6 py-3 rounded-lg font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 active:scale-98 transition-all cursor-pointer"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            <span>RESUME MISSION [ESC]</span>
          </button>

          <button
            onClick={onRestart}
            className="flex items-center justify-center gap-2.5 px-6 py-3 rounded-lg font-semibold text-slate-200 border border-slate-700 bg-slate-900 hover:bg-slate-800 active:scale-98 transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>RESTART FROM CRYO-CONTAINMENT</span>
          </button>

          <button
            onClick={onToggleMute}
            className="flex items-center justify-center gap-2.5 px-6 py-3 rounded-lg font-semibold text-cyan-300 border border-cyan-800/60 bg-cyan-950/40 hover:bg-cyan-950/70 transition-all cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
            <span>{isMuted ? 'UNMUTE AUDIO' : 'MUTE AUDIO'}</span>
          </button>
        </div>

        <div className="text-xs text-slate-500 border-t border-slate-800/80 pt-4">
          HADES-9 · Deep-Sea Echolocation Thriller
        </div>
      </div>
    </div>
  );
};
