class AudioAlertService {
  private audioCtx: AudioContext | null = null;
  private isMuted: boolean = false;
  private lastSpokenText: string = "";
  private lastSpokenTime: number = 0;

  constructor() {
    // Lazy init audio context on first interaction
  }

  private getAudioContext(): AudioContext | null {
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.audioCtx = new AudioCtx();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  /**
   * Synthesizes distinct alert audio frequencies via Web Audio API.
   */
  public playAlertBeep(type: 'critical' | 'warning' | 'info' | 'success') {
    if (this.isMuted) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      if (type === 'critical') {
        // High urgency 880Hz -> 1200Hz pulsing chime
        this.createTone(ctx, 880, now, 0.12, 'sawtooth');
        this.createTone(ctx, 1100, now + 0.14, 0.12, 'sawtooth');
        this.createTone(ctx, 1320, now + 0.28, 0.2, 'sawtooth');
      } else if (type === 'warning') {
        // Double alert tone 660Hz -> 880Hz
        this.createTone(ctx, 660, now, 0.15, 'sine');
        this.createTone(ctx, 880, now + 0.18, 0.2, 'sine');
      } else if (type === 'success') {
        // Gentle confirmation chime 523Hz (C5) -> 659Hz (E5)
        this.createTone(ctx, 523.25, now, 0.12, 'sine');
        this.createTone(ctx, 659.25, now + 0.12, 0.2, 'sine');
      } else {
        // Info blip
        this.createTone(ctx, 440, now, 0.1, 'sine');
      }
    } catch (e) {
      console.warn('Audio alert error:', e);
    }
  }

  private createTone(ctx: AudioContext, freq: number, startTime: number, duration: number, type: OscillatorType) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.exponentialRampToValueAtTime(0.25, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  /**
   * Natural voice announcements via Web Speech Synthesis.
   * Throttled to prevent repetitive speech spam.
   */
  public speak(text: string, force = false) {
    if (this.isMuted) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const now = Date.now();
    // Throttle identical speech within 6 seconds
    if (!force && text === this.lastSpokenText && (now - this.lastSpokenTime) < 6000) {
      return;
    }

    this.lastSpokenText = text;
    this.lastSpokenTime = now;

    try {
      window.speechSynthesis.cancel(); // Cancel current ongoing speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
    }
  }
}

export const audioAlerts = new AudioAlertService();

