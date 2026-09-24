export type SoundCue =
  | "select"
  | "deploy"
  | "capture"
  | "kill"
  | "heavyKill"
  | "coreImpact"
  | "coreCriticalImpact"
  | "coreBreak"
  | "coreLost"
  | "warning"
  | "opportunity"
  | "overtime"
  | "lastPush"
  | "error"
  | "win"
  | "lose"
  | "draw"
  | "ability"
  | "commander"
  | "enemyCommander"
  | "start"
  | "unlock";

export type ToneLayer = {
  wave: "sine" | "triangle" | "square" | "sawtooth";
  from: number;
  to: number;
  delay: number;
  duration: number;
  gain: number;
};

export type NoiseLayer = {
  delay: number;
  duration: number;
  gain: number;
  lowpass: number;
};

export type SoundCueSpec = {
  tones: readonly ToneLayer[];
  noise?: NoiseLayer;
};

const tone = (
  wave: ToneLayer["wave"],
  from: number,
  to: number,
  delay: number,
  duration: number,
  gain: number,
): ToneLayer => ({ wave, from, to, delay, duration, gain });

const SPECS: Record<SoundCue, SoundCueSpec> = {
  select: {
    tones: [tone("sine", 620, 780, 0, 0.055, 0.022)],
  },
  deploy: {
    tones: [
      tone("triangle", 150, 78, 0, 0.17, 0.052),
      tone("sine", 310, 220, 0.018, 0.12, 0.024),
    ],
    noise: { delay: 0, duration: 0.07, gain: 0.018, lowpass: 720 },
  },
  ability: {
    tones: [
      tone("sine", 220, 620, 0, 0.2, 0.038),
      tone("triangle", 420, 910, 0.035, 0.18, 0.026),
    ],
  },
  commander: {
    tones: [
      tone("triangle", 145, 290, 0, 0.27, 0.048),
      tone("sine", 290, 580, 0.035, 0.24, 0.032),
      tone("sine", 580, 870, 0.08, 0.21, 0.023),
    ],
    noise: { delay: 0, duration: 0.11, gain: 0.014, lowpass: 900 },
  },
  enemyCommander: {
    tones: [
      tone("sawtooth", 440, 185, 0, 0.24, 0.026),
      tone("triangle", 285, 142, 0.055, 0.23, 0.035),
    ],
    noise: { delay: 0.02, duration: 0.1, gain: 0.014, lowpass: 620 },
  },
  capture: {
    tones: [
      tone("sine", 330, 330, 0, 0.13, 0.028),
      tone("sine", 495, 495, 0.055, 0.14, 0.031),
      tone("triangle", 660, 690, 0.11, 0.16, 0.033),
    ],
  },
  kill: {
    tones: [
      tone("triangle", 190, 92, 0, 0.12, 0.046),
      tone("sine", 520, 760, 0.018, 0.1, 0.024),
    ],
    noise: { delay: 0, duration: 0.055, gain: 0.014, lowpass: 820 },
  },
  heavyKill: {
    tones: [
      tone("triangle", 138, 56, 0, 0.18, 0.058),
      tone("sine", 410, 690, 0.018, 0.14, 0.029),
      tone("triangle", 760, 980, 0.06, 0.12, 0.02),
    ],
    noise: { delay: 0, duration: 0.09, gain: 0.021, lowpass: 680 },
  },
  coreImpact: {
    tones: [
      tone("triangle", 170, 82, 0, 0.14, 0.043),
      tone("sine", 360, 520, 0.02, 0.1, 0.018),
    ],
    noise: { delay: 0, duration: 0.06, gain: 0.013, lowpass: 720 },
  },
  coreCriticalImpact: {
    tones: [
      tone("triangle", 145, 58, 0, 0.18, 0.054),
      tone("sine", 340, 660, 0.018, 0.14, 0.025),
      tone("square", 760, 620, 0.07, 0.065, 0.009),
    ],
    noise: { delay: 0, duration: 0.085, gain: 0.019, lowpass: 620 },
  },
  coreBreak: {
    tones: [
      tone("triangle", 115, 42, 0, 0.3, 0.068),
      tone("sine", 300, 760, 0.025, 0.22, 0.03),
      tone("triangle", 760, 1120, 0.13, 0.18, 0.022),
    ],
    noise: { delay: 0, duration: 0.16, gain: 0.03, lowpass: 540 },
  },
  coreLost: {
    tones: [
      tone("sawtooth", 230, 72, 0, 0.28, 0.04),
      tone("triangle", 150, 48, 0.06, 0.24, 0.052),
    ],
    noise: { delay: 0, duration: 0.14, gain: 0.026, lowpass: 500 },
  },
  warning: {
    tones: [
      tone("triangle", 300, 175, 0, 0.16, 0.041),
      tone("triangle", 270, 150, 0.14, 0.17, 0.037),
    ],
  },
  opportunity: {
    tones: [
      tone("sine", 280, 520, 0, 0.16, 0.03),
      tone("triangle", 520, 780, 0.08, 0.18, 0.031),
    ],
  },
  overtime: {
    tones: [
      tone("triangle", 190, 390, 0, 0.18, 0.039),
      tone("triangle", 190, 440, 0.19, 0.19, 0.043),
    ],
  },
  lastPush: {
    tones: [
      tone("square", 520, 440, 0, 0.07, 0.018),
      tone("square", 520, 440, 0.095, 0.07, 0.018),
      tone("square", 620, 520, 0.19, 0.08, 0.02),
    ],
  },
  error: {
    tones: [tone("square", 135, 82, 0, 0.14, 0.024)],
  },
  start: {
    tones: [
      tone("triangle", 165, 330, 0, 0.18, 0.035),
      tone("sine", 330, 660, 0.085, 0.2, 0.029),
    ],
    noise: { delay: 0, duration: 0.055, gain: 0.011, lowpass: 1000 },
  },
  unlock: {
    tones: [
      tone("sine", 392, 392, 0, 0.12, 0.025),
      tone("sine", 523, 523, 0.06, 0.14, 0.029),
      tone("triangle", 659, 784, 0.13, 0.2, 0.036),
    ],
    noise: { delay: 0.04, duration: 0.08, gain: 0.008, lowpass: 1400 },
  },
  win: {
    tones: [
      tone("sine", 330, 330, 0, 0.17, 0.027),
      tone("sine", 440, 440, 0.08, 0.18, 0.03),
      tone("sine", 550, 550, 0.16, 0.19, 0.032),
      tone("triangle", 660, 700, 0.24, 0.25, 0.038),
    ],
  },
  lose: {
    tones: [
      tone("triangle", 262, 230, 0, 0.18, 0.031),
      tone("triangle", 196, 175, 0.11, 0.2, 0.032),
      tone("sine", 147, 110, 0.23, 0.25, 0.034),
    ],
  },
  draw: {
    tones: [
      tone("sine", 294, 330, 0, 0.18, 0.026),
      tone("sine", 330, 294, 0.12, 0.2, 0.026),
    ],
  },
};

export function soundCueSpec(cue: SoundCue): SoundCueSpec {
  return SPECS[cue];
}

export class Sound {
  enabled = false;
  private context?: AudioContext;
  private warned = false;

  unlock(): void {
    if (!this.enabled) return;
    if (typeof AudioContext === "undefined") return;
    try {
      this.context ??= new AudioContext();
      if (this.context.state === "suspended")
        void this.context.resume().catch((error) => this.warn(error));
    } catch (error) {
      this.warn(error);
    }
  }

  play(cue: SoundCue): void {
    if (!this.enabled) return;
    this.unlock();
    const ctx = this.context;
    if (!ctx) return;

    const spec = soundCueSpec(cue);
    const base = ctx.currentTime + 0.005;
    for (const layer of spec.tones) this.playTone(ctx, base, layer);
    if (spec.noise) this.playNoise(ctx, base, spec.noise);
  }

  private playTone(ctx: AudioContext, base: number, layer: ToneLayer): void {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = base + layer.delay;
    const end = start + layer.duration;
    const attack = Math.min(0.018, layer.duration * 0.2);
    const release = Math.min(0.065, layer.duration * 0.45);

    oscillator.type = layer.wave;
    oscillator.frequency.setValueAtTime(Math.max(20, layer.from), start);
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(20, layer.to),
      end,
    );

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(
      Math.max(0.0002, layer.gain),
      start + attack,
    );
    gain.gain.setValueAtTime(
      Math.max(0.0002, layer.gain * 0.82),
      Math.max(start + attack, end - release),
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, end);

    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(start);
    oscillator.stop(end + 0.01);
  }

  private playNoise(ctx: AudioContext, base: number, layer: NoiseLayer): void {
    const frames = Math.max(1, Math.ceil(ctx.sampleRate * layer.duration));
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let seed = frames ^ Math.round(layer.lowpass);
    for (let i = 0; i < data.length; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      data[i] = (seed / 0xffffffff) * 2 - 1;
    }

    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    const start = base + layer.delay;
    const end = start + layer.duration;

    source.buffer = buffer;
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(layer.lowpass, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(
      Math.max(0.0002, layer.gain),
      start + Math.min(0.01, layer.duration * 0.2),
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, end);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start(start);
    source.stop(end + 0.01);
  }

  private warn(error: unknown): void {
    if (this.warned) return;
    this.warned = true;
    console.warn("Frontline audio unavailable", error);
  }
}
