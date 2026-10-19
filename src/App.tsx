/**
 * Acoustic Echo - 3D First-Person Stealth Survival-Thriller
 * Main App component implementing the Game Shell architecture.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine, type GameEngineState, type GameState } from './game/gameEngine';
import { TitleScreen } from './components/TitleScreen';
import { GameHUD } from './components/GameHUD';
import { PauseModal } from './components/PauseModal';
import { GameOverModal } from './components/GameOverModal';
import { VictoryModal } from './components/VictoryModal';
import { audioEngine } from './game/audioEngine';
import type { SonarPulseType } from './game/acousticRules';

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [engineState, setEngineState] = useState<GameEngineState>({
    gameState: 'title',
    stats: null,
    currentObjective: 'Retrieve Security Keycard Alpha from Specimen Storage',
    objectiveProgress: 0,
    alertMessage: null,
    alertType: null,
  });

  const [isMuted, setIsMuted] = useState(false);

  // Initialize WebGL Game Engine once on mount
  useEffect(() => {
    if (!canvasMountRef.current) return;

    const engine = new GameEngine(canvasMountRef.current);
    engineRef.current = engine;

    engine.onStateUpdate = (state) => {
      setEngineState({ ...state });
    };

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // Keyboard shortcut for Pause (ESC)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        if (engineState.gameState === 'playing' || engineState.gameState === 'paused') {
          engineRef.current?.togglePause();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [engineState.gameState]);

  // Audio mute toggle
  const handleToggleMute = useCallback(() => {
    const muted = audioEngine.toggleMute();
    setIsMuted(muted);
  }, []);

  const handleStartGame = useCallback(() => {
    engineRef.current?.startGame();
  }, []);

  const handleRestartGame = useCallback(() => {
    engineRef.current?.restartGame();
  }, []);

  const handleResumeGame = useCallback(() => {
    engineRef.current?.togglePause();
  }, []);

  const handleTriggerSonar = useCallback((type: SonarPulseType) => {
    engineRef.current?.triggerPlayerSonar(type);
  }, []);

  const handleFireDisruptor = useCallback(() => {
    engineRef.current?.triggerPlayerDisruptor();
  }, []);

  const handleThrowDecoy = useCallback(() => {
    engineRef.current?.triggerPlayerDecoy();
  }, []);

  const handleThrowDebris = useCallback(() => {
    engineRef.current?.triggerPlayerDebris();
  }, []);

  const handleInteract = useCallback(() => {
    engineRef.current?.triggerPlayerInteract();
  }, []);

  return (
    <div
      className="relative w-screen h-screen overflow-hidden bg-slate-950 select-none"
      data-testid="game-viewport"
      data-state={engineState.gameState}
    >
      {/* Isolated WebGL Canvas Mount Container */}
      <div
        ref={canvasMountRef}
        className="absolute inset-0 z-0 w-full h-full cursor-crosshair"
      />

      {/* Screen: Title Screen */}
      {engineState.gameState === 'title' && (
        <TitleScreen
          onStart={handleStartGame}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}

      {/* Screen: Active Playing HUD */}
      {(engineState.gameState === 'playing' || engineState.gameState === 'paused') && (
        <GameHUD
          stats={engineState.stats}
          currentObjective={engineState.currentObjective}
          objectiveProgress={engineState.objectiveProgress}
          alertMessage={engineState.alertMessage}
          alertType={engineState.alertType}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onTriggerSonar={handleTriggerSonar}
          onFireDisruptor={handleFireDisruptor}
          onThrowDecoy={handleThrowDecoy}
          onThrowDebris={handleThrowDebris}
          onInteract={handleInteract}
          onPause={() => engineRef.current?.togglePause()}
        />
      )}

      {/* Modal: Pause */}
      {engineState.gameState === 'paused' && (
        <PauseModal
          onResume={handleResumeGame}
          onRestart={handleRestartGame}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}

      {/* Modal: Game Over */}
      {engineState.gameState === 'game_over' && (
        <GameOverModal onRestart={handleRestartGame} />
      )}

      {/* Modal: Victory */}
      {engineState.gameState === 'victory' && (
        <VictoryModal onPlayAgain={handleRestartGame} />
      )}
    </div>
  );
}
