// Sons synthétisés (Web Audio) : aucun fichier, aucune ressource externe.
// Le contexte n'est créé qu'après le premier geste du joueur (règle des navigateurs).

type Ctx = AudioContext;

const NOTES: Record<string, number[]> = {
  bamboo: [262, 330, 392, 330],
  ice: [330, 392, 494, 392],
  fire: [220, 262, 330, 262],
  swamp: [196, 247, 294, 247],
  storm: [220, 277, 330, 277],
};

export class Audio {
  private ctx: Ctx | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  sound = true;
  music = true;
  private biome = 'bamboo';
  private timer = 0;
  private beat = 0;
  private nextAt = 0;
  private playingMusic = false;

  /** À appeler dans un geste du joueur. */
  unlock(): void {
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.12;
      this.musicGain.connect(this.master);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number, when = 0, dest?: AudioNode): void {
    const c = this.ctx;
    if (!c || !this.master) return;
    const t = c.currentTime + when;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(dest ?? this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private noise(dur: number, vol: number, freq: number): void {
    const c = this.ctx;
    if (!c || !this.master) return;
    const n = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, n, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq;
    const g = c.createGain();
    g.gain.value = vol;
    src.connect(f);
    f.connect(g);
    g.connect(this.master);
    src.start();
  }

  /** Le pet, selon le son équipé. */
  fart(id: string): void {
    if (!this.sound || !this.ctx) return;
    const j = 1 + (Math.random() - 0.5) * 0.12;
    switch (id) {
      case 'sound.trumpet':
        this.tone(392 * j, 0.22, 'square', 0.13, 440 * j);
        this.tone(588 * j, 0.22, 'square', 0.05, 660 * j);
        break;
      case 'sound.duck':
        this.tone(520 * j, 0.14, 'sawtooth', 0.14, 300 * j);
        this.tone(480 * j, 0.1, 'sawtooth', 0.12, 260 * j, 0.1);
        break;
      case 'sound.horn':
        this.tone(330 * j, 0.2, 'square', 0.12);
        this.tone(415 * j, 0.2, 'square', 0.12);
        break;
      case 'sound.tuba':
        this.tone(110 * j, 0.3, 'sawtooth', 0.2, 85 * j);
        this.tone(220 * j, 0.3, 'triangle', 0.08, 170 * j);
        break;
      default:
        this.tone(190 * j, 0.16, 'sawtooth', 0.16, 90 * j);
        this.noise(0.1, 0.12, 400);
    }
  }

  coin(): void {
    if (!this.sound) return;
    this.tone(880, 0.09, 'square', 0.07);
    this.tone(1320, 0.14, 'square', 0.07, undefined, 0.08);
  }
  point(): void {
    if (!this.sound) return;
    this.tone(660, 0.06, 'triangle', 0.08);
  }
  ice(): void {
    if (!this.sound) return;
    this.noise(0.35, 0.3, 2200);
  }
  chili(): void {
    if (!this.sound) return;
    this.noise(0.5, 0.3, 900);
    this.tone(300, 0.4, 'sawtooth', 0.08, 900);
  }
  die(): void {
    if (!this.sound) return;
    this.tone(220, 0.35, 'sine', 0.25, 60);
    this.noise(0.1, 0.15, 300);
  }
  biomeChange(): void {
    if (!this.sound) return;
    [523, 659, 784].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.09, undefined, i * 0.08));
  }
  buy(): void {
    if (!this.sound) return;
    this.coin();
  }
  tap(): void {
    if (!this.sound) return;
    this.tone(500, 0.05, 'square', 0.05);
  }

  // --- musique : petite boucle d'arpège, la hauteur suit le biome ---
  setBiome(id: string): void {
    this.biome = NOTES[id] ? id : 'bamboo';
  }

  startMusic(): void {
    if (!this.ctx || this.playingMusic) return;
    this.playingMusic = true;
    this.beat = 0;
    this.nextAt = this.ctx.currentTime + 0.05;
    this.timer = window.setInterval(() => this.schedule(), 120);
  }

  stopMusic(): void {
    this.playingMusic = false;
    window.clearInterval(this.timer);
  }

  private schedule(): void {
    const c = this.ctx;
    if (!c || !this.music || !this.musicGain) return;
    const step = 0.24;
    while (this.nextAt < c.currentTime + 0.4) {
      const notes = NOTES[this.biome]!;
      const f = notes[this.beat % notes.length]! * (this.beat % 16 >= 8 ? 1.5 : 1);
      const when = Math.max(0, this.nextAt - c.currentTime);
      this.tone(f, 0.2, 'triangle', 0.5, undefined, when, this.musicGain);
      if (this.beat % 4 === 0) this.tone(f / 2, 0.3, 'sine', 0.6, undefined, when, this.musicGain);
      this.beat++;
      this.nextAt += step;
    }
  }

  /** Coupe/rétablit la musique selon les réglages. */
  apply(): void {
    if (this.musicGain) this.musicGain.gain.value = this.music ? 0.12 : 0;
  }
}
