/**
 * Victory Modal when player boards the Deep-Submersible Nautilus-IV and escapes Hades-9.
 */
import React from 'react';
import { RotateCcw, Trophy, CheckCircle, Navigation } from 'lucide-react';

interface VictoryModalProps {
  onPlayAgain: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({ onPlayAgain }) => {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-cyan-950/70 font-mono text-slate-100">
      <div className="w-full max-w-md p-6 sm:p-8 rounded-2xl border border-cyan-400 bg-slate-950/95 shadow-[0_0_60px_rgba(0,240,255,0.4)] flex flex-col gap-6 text-center">
        <div className="flex flex-col items-center">
          <div className="p-4 rounded-full bg-cyan-950/60 border border-cyan-400/50 text-cyan-400 mb-3 shadow-[0_0_30px_rgba(0,240,255,0.3)]">
            <Trophy className="w-10 h-10" />
          </div>
          <span className="text-xs uppercase tracking-widest text-cyan-400 font-semibold">
            EVACUATION VECTOR ACHIEVED
          </span>
          <h2 className="text-2xl font-bold tracking-wider text-slate-100 mt-1">
            SURVIVED HADES-9
          </h2>
        </div>

        <div className="flex flex-col gap-2 p-3.5 rounded-lg border border-cyan-800/60 bg-cyan-950/40 text-xs text-cyan-100/90 text-left font-sans">
          <div className="flex items-center gap-2 text-cyan-300 font-semibold font-mono">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>DEEP-SUBMERSIBLE NAUTILUS-IV ASCENDING</span>
          </div>
          <p className="leading-relaxed">
            You successfully bypassed the Echo-Stalkers, evaded the Sound Screamers, crossed the flooded engineering trenches, purged the reactor core, and escaped into the surface twilight.
          </p>
        </div>

        <button
          onClick={onPlayAgain}
          data-testid="play-again-button"
          className="flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-lg font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-sky-400 hover:brightness-110 active:scale-98 transition-all shadow-[0_0_25px_rgba(0,240,255,0.4)] cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>REPLAY CAMPAIGN</span>
        </button>

        <div className="text-[11px] text-slate-500 border-t border-slate-800/80 pt-3">
          MISSION LOG: ARCHIVE CONFIRMED · ZERO CASUALTIES
        </div>
      </div>
    </div>
  );
};
