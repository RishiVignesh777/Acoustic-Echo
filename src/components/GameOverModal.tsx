/**
 * Game Over Modal when the player is intercepted by an Echo-Stalker.
 */
import React from 'react';
import { RotateCcw, Skull, AlertCircle } from 'lucide-react';

interface GameOverModalProps {
  onRestart: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({ onRestart }) => {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-red-950/70 font-mono text-slate-100">
      <div className="w-full max-w-md p-6 sm:p-8 rounded-2xl border border-rose-500/60 bg-slate-950/95 shadow-[0_0_60px_rgba(225,29,72,0.4)] flex flex-col gap-6 text-center">
        <div className="flex flex-col items-center">
          <div className="p-4 rounded-full bg-rose-950/60 border border-rose-500/40 text-rose-500 mb-3">
            <Skull className="w-10 h-10" />
          </div>
          <span className="text-xs uppercase tracking-widest text-rose-400 font-semibold">
            BIOMETRIC TELEMETRY TERMINATED
          </span>
          <h2 className="text-2xl font-bold tracking-wider text-rose-200 mt-1">
            ECHOLOCATION COMPROMISED
          </h2>
        </div>

        <div className="p-3.5 rounded-lg border border-rose-900/60 bg-rose-950/40 text-xs text-rose-200/90 text-left flex items-start gap-2.5 font-sans">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <span>
            An Echo-Stalker pinpointed your acoustic signature. Remember: <strong>Heavy Pulses</strong> and <strong>Sprinting</strong> create loud sound waves that draw predators across massive distances. Crouch and deploy Decoy Beacons to misdirect threats.
          </span>
        </div>

        <button
          onClick={onRestart}
          data-testid="restart-after-death-button"
          className="flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-lg font-bold text-slate-950 bg-rose-400 hover:bg-rose-300 active:scale-98 transition-all shadow-[0_0_20px_rgba(244,63,94,0.4)] cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>REBOOT ACOUSTIC RIG [TRY AGAIN]</span>
        </button>

        <div className="text-[11px] text-slate-500 border-t border-slate-800/80 pt-3">
          HADES-9 · DEEP-SEA SURVIVAL THRILLER
        </div>
      </div>
    </div>
  );
};
