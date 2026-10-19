/**
 * Web Audio API procedural sound engine for Acoustic Echo.
 * Generates all sound effects, sonar echoes, stalker vocalizations, binaural ambiance,
 * and spatial audio entirely procedurally without any external audio files.
 */

class AudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private heartbeatOsc: OscillatorNode | null = null;
  private heartbeatGain: GainNode | null = null;
  private heartbeatTimer: number | null = null;
  private currentBpm: number = 70;
  private isUnderwater: boolean = false;

  constructor() {
    // AudioContext will be initialized on first user gesture
  }

  private initContext() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioContextClass();
      
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.85, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.startAmbientHum();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.85, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Continuous deep-sea hydrophone ambient drone
   */
  private startAmbientHum() {
    if (!this.ctx || !this.masterGain) return;

    const humOsc = this.ctx.createOscillator();
    humOsc.type = 'sine';
    humOsc.frequency.setValueAtTime(42, this.ctx.currentTime);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(120, this.ctx.currentTime);

    // Deep water rumble noise
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(85, this.ctx.currentTime);
    noiseFilter.Q.setValueAtTime(3.0, this.ctx.currentTime);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.04, this.ctx.currentTime);

    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

    humOsc.connect(filter);
    filter.connect(this.ambientGain);

    whiteNoise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.ambientGain);

    this.ambientGain.connect(this.masterGain);

    humOsc.start();
    whiteNoise.start();
  }

  /**
   * Multi-frequency sonar ping synthesizer with resonant deep reverberation
   */
  public playSonarPing(type: 'low' | 'focused' | 'heavy') {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    let startFreq = 380;
    let endFreq = 220;
    let duration = 1.6;
    let volume = 0.3;

    if (type === 'low') {
      startFreq = 260;
      endFreq = 160;
      duration = 1.0;
      volume = 0.22;
      osc.type = 'sine';
    } else if (type === 'focused') {
      startFreq = 740;
      endFreq = 480;
      duration = 2.0;
      volume = 0.45;
      osc.type = 'triangle';
    } else if (type === 'heavy') {
      startFreq = 1200;
      endFreq = 280;
      duration = 3.5;
      volume = 0.8;
      osc.type = 'sawtooth';
    }

    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(endFreq, t + duration * 0.7);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(startFreq * 0.9, t);
    filter.frequency.exponentialRampToValueAtTime(endFreq * 0.8, t + duration);
    filter.Q.setValueAtTime(type === 'heavy' ? 8.0 : 4.0, t);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(volume, t + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    // Cavernous echo delay
    const delay = this.ctx.createDelay();
    delay.delayTime.setValueAtTime(type === 'heavy' ? 0.35 : 0.2, t);
    const feedback = this.ctx.createGain();
    feedback.gain.setValueAtTime(type === 'heavy' ? 0.55 : 0.25, t);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    gain.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + duration);
  }

  /**
   * Footstep sound effect: dry metal, water splash in flooded zones, or quiet crouch
   */
  public playFootstep(isCrouch: boolean, isSprint: boolean, isPuddle: boolean) {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    let volume = isCrouch ? 0.06 : isSprint ? 0.28 : 0.15;
    let baseFreq = isPuddle ? 420 : 120;
    let duration = isPuddle ? 0.18 : 0.1;

    osc.type = isPuddle ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + duration);

    filter.type = isPuddle ? 'bandpass' : 'lowpass';
    filter.frequency.setValueAtTime(isPuddle ? 800 : 300, t);

    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + duration);
  }

  /**
   * Updates player heartbeat pulse according to BPM
   */
  public updateHeartbeat(bpm: number) {
    this.currentBpm = bpm;
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    // Trigger heartbeat rhythm if panic is noticeable (> 90 BPM)
    if (bpm > 85 && !this.heartbeatTimer) {
      this.loopHeartbeat();
    } else if (bpm <= 85 && this.heartbeatTimer) {
      clearTimeout(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private loopHeartbeat() {
    if (this.currentBpm <= 85 || this.isMuted) {
      this.heartbeatTimer = null;
      return;
    }

    this.playHeartbeatThud();

    const intervalMs = (60 / this.currentBpm) * 1000;
    this.heartbeatTimer = window.setTimeout(() => {
      this.loopHeartbeat();
    }, intervalMs);
  }

  private playHeartbeatThud() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const intensity = Math.min(1.0, (this.currentBpm - 80) / 75);

    // First beat ("lub")
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(65, t);
    osc1.frequency.exponentialRampToValueAtTime(35, t + 0.12);
    gain1.gain.setValueAtTime(0.18 * intensity, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc1.connect(gain1);
    gain1.connect(this.masterGain);
    osc1.start(t);
    osc1.stop(t + 0.12);

    // Second beat ("dub") 110ms later
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(75, t + 0.11);
    osc2.frequency.exponentialRampToValueAtTime(30, t + 0.22);
    gain2.gain.setValueAtTime(0.14 * intensity, t + 0.11);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    osc2.connect(gain2);
    gain2.connect(this.masterGain);
    osc2.start(t + 0.11);
    osc2.stop(t + 0.22);
  }

  /**
   * Echo-Stalker echolocation clicking and roars
   */
  public playStalkerClick(distance: number) {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const volume = Math.max(0.05, Math.min(0.5, 1.0 - distance / 35));

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1400 + Math.random() * 400, t);
    osc.frequency.exponentialRampToValueAtTime(300, t + 0.04);

    gain.gain.setValueAtTime(volume * 0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.04);
  }

  public playStalkerRoar(distance: number) {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const volume = Math.max(0.1, Math.min(0.8, 1.2 - distance / 30));

    const osc = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.linearRampToValueAtTime(360, t + 0.25);
    osc.frequency.exponentialRampToValueAtTime(80, t + 1.2);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(185, t);
    osc2.frequency.linearRampToValueAtTime(370, t + 0.25);
    osc2.frequency.exponentialRampToValueAtTime(85, t + 1.2);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900, t);

    gain.gain.setValueAtTime(0.1, t);
    gain.gain.linearRampToValueAtTime(volume, t + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);

    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc2.start(t);
    osc.stop(t + 1.2);
    osc2.stop(t + 1.2);
  }

  /**
   * Sound Screamer piercing acoustic shriek
   */
  public playScreamerShriek() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'square';

    osc1.frequency.setValueAtTime(900, t);
    osc1.frequency.exponentialRampToValueAtTime(2600, t + 0.4);
    osc1.frequency.exponentialRampToValueAtTime(400, t + 1.8);

    osc2.frequency.setValueAtTime(920, t);
    osc2.frequency.exponentialRampToValueAtTime(2650, t + 0.4);
    osc2.frequency.exponentialRampToValueAtTime(420, t + 1.8);

    gain.gain.setValueAtTime(0.1, t);
    gain.gain.linearRampToValueAtTime(0.7, t + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.8);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 1.8);
    osc2.stop(t + 1.8);
  }

  /**
   * Frequency Disruptor blast: acoustic shockwave that stuns blind creatures
   */
  public playDisruptorBlast() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;

    // Sonic sweep
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(3200, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.8);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2000, t);
    filter.Q.setValueAtTime(6.0, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.8, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.8);
  }

  /**
   * Acoustic Decoy Beep
   */
  public playDecoyChirp() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, t);
    osc.frequency.setValueAtTime(1800, t + 0.08);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.18);
  }

  /**
   * Debris impact (glass shattering / metal pipe clash)
   */
  public playDebrisImpact() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(90, t + 0.35);

    gain.gain.setValueAtTime(0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.35);
  }

  /**
   * Terminal interact chime / Keycard accept
   */
  public playTerminalChime(success = true) {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    if (success) {
      osc.frequency.setValueAtTime(587.33, t); // D5
      osc.frequency.setValueAtTime(880.00, t + 0.12); // A5
    } else {
      osc.frequency.setValueAtTime(300, t);
      osc.frequency.setValueAtTime(200, t + 0.12);
    }

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.4);
  }

  /**
   * The Resonance Leviathan sub-bass seismic hum
   */
  public playLeviathanRumble() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(32, t);
    osc.frequency.linearRampToValueAtTime(38, t + 1.5);
    osc.frequency.linearRampToValueAtTime(28, t + 3.0);

    gain.gain.setValueAtTime(0.05, t);
    gain.gain.linearRampToValueAtTime(0.4, t + 1.0);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 3.0);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 3.0);
  }
}

export const audioEngine = new AudioEngine();
