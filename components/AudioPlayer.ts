export class AudioPlayer {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  private init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private playTone(freq: number, type: OscillatorType = 'sine', duration: number = 0.08, gainVal: number = 0.15) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch {
      // Audio autoplay policy fallback
    }
  }

  public playMove() {
    this.playTone(320, 'triangle', 0.04, 0.08);
  }

  public playRotate() {
    this.playTone(480, 'sine', 0.06, 0.12);
  }

  public playDrop() {
    this.playTone(180, 'square', 0.12, 0.2);
  }

  public playHold() {
    this.playTone(400, 'sine', 0.08, 0.15);
  }

  public playClear() {
    [440, 554, 659].forEach((f, idx) => {
      setTimeout(() => this.playTone(f, 'sine', 0.1, 0.15), idx * 60);
    });
  }

  public playTetris() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, idx) => {
      setTimeout(() => this.playTone(f, 'square', 0.18, 0.2), idx * 70);
    });
  }

  public playTSpin() {
    [392, 523.25, 659.25, 880].forEach((f, idx) => {
      setTimeout(() => this.playTone(f, 'triangle', 0.14, 0.22), idx * 60);
    });
  }

  public playAttack() {
    [600, 450, 750].forEach((f, idx) => {
      setTimeout(() => this.playTone(f, 'sawtooth', 0.08, 0.18), idx * 50);
    });
  }

  public playKO() {
    [150, 100, 60].forEach((f, idx) => {
      setTimeout(() => this.playTone(f, 'sawtooth', 0.25, 0.3), idx * 80);
    });
  }

  public playGameOver() {
    [400, 350, 300, 240].forEach((f, idx) => {
      setTimeout(() => this.playTone(f, 'sawtooth', 0.2, 0.2), idx * 90);
    });
  }

  /**
   * Som de Alerta / Perigo (Danger Alert) - quando a barra de lixo acumula 4+ linhas
   */
  public playDangerAlert() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.18);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.18);
    } catch {
      // Audio autoplay policy fallback
    }
  }

  /**
   * Som de impacto seco quando as linhas cinzas sobem no tabuleiro (Impact / Rise)
   */
  public playGarbageRise() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      // Golpe grave de impacto percussivo
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.22);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.22);
    } catch {
      // Audio autoplay policy fallback
    }
  }
}

export const audio = new AudioPlayer();
