import type { LibraryData } from '../stores/LibraryStore';

/** Original, quiet pentatonic plucked accompaniment; no external recordings. */
export class AudioPreferences {
  private context?: AudioContext;
  private timer?: number;
  private music = false;
  private sound = true;
  private enabled = false;
  private step = 0;
  private readonly notes = [220, 261.63, 293.66, 329.63, 392, 329.63, 293.66, 261.63];
  private gesture = (event: Event): void => {
    if (!this.enabled) return;
    if ((this.music || this.sound) && !this.context) this.context = new AudioContext();
    if (this.context?.state === 'suspended') void this.context.resume();
    if (event instanceof MouseEvent && (event.target as Element)?.closest('button,a') && this.sound) this.pluck(660, .015, .12);
    this.refresh();
  };
  private visibility = (): void => { if (!document.hidden && this.enabled && this.music) void this.context?.resume(); this.refresh(); };
  constructor() { document.addEventListener('click', this.gesture); document.addEventListener('keydown', this.gesture); document.addEventListener('visibilitychange', this.visibility); }
  update(preferences: LibraryData['preferences'], enabled: boolean): void {
    this.music = preferences.music; this.sound = preferences.sound; this.enabled = enabled;
    if (enabled && (this.music || this.sound) && !this.context && navigator.userActivation.hasBeenActive) this.context = new AudioContext();
    if (this.context && enabled && this.context.state === 'suspended') void this.context.resume();
    this.refresh();
  }
  private pluck(frequency: number, volume: number, duration: number): void {
    const context = this.context;
    if (!context || context.state !== 'running') return;
    const oscillator = context.createOscillator(), gain = context.createGain();
    oscillator.type = 'triangle'; oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(.0001, context.currentTime + duration);
    oscillator.connect(gain); gain.connect(context.destination);
    oscillator.start(); oscillator.stop(context.currentTime + duration);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }
  private refresh(): void {
    if (!(this.enabled && this.music && !document.hidden && this.context)) { clearInterval(this.timer); this.timer = undefined; if (document.hidden || !this.enabled || (!this.music && !this.sound)) void this.context?.suspend(); return; }
    if (this.timer) return;
    this.pluck(this.notes[this.step++ % this.notes.length], .025, 2.4);
    this.timer = window.setInterval(() => { this.pluck(this.notes[this.step++ % this.notes.length], .025, 2.4); }, 2600);
  }
  dispose(): void { clearInterval(this.timer); document.removeEventListener('click', this.gesture); document.removeEventListener('keydown', this.gesture); document.removeEventListener('visibilitychange', this.visibility); void this.context?.close(); }
}
