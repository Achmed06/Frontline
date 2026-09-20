export class Sound {
  enabled = false;
  private context?: AudioContext;
  unlock() {
    if (!this.enabled) return;
    this.context ??= new AudioContext();
    void this.context.resume();
  }
  play(
    kind:
      "select" | "deploy" | "capture" | "error" | "win" | "lose" | "ability",
  ) {
    if (!this.enabled || !this.context) return;
    const ctx = this.context;
    const notes = {
      select: [440],
      deploy: [180, 290],
      capture: [440, 660, 880],
      error: [110],
      win: [330, 440, 660, 880],
      lose: [220, 165, 110],
      ability: [260, 520, 780],
    }[kind];
    notes.forEach((frequency, i) => {
      const oscillator = ctx.createOscillator(),
        gain = ctx.createGain(),
        t = ctx.currentTime + i * 0.065;
      oscillator.type = kind === "deploy" ? "triangle" : "sine";
      oscillator.frequency.setValueAtTime(frequency, t);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.055, t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(t);
      oscillator.stop(t + 0.16);
    });
  }
}
