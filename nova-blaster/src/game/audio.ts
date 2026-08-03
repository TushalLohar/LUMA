// Tiny Web Audio synthesizer for game sounds + music — no external files needed
import { AUDIO, STORAGE_KEYS } from './constants';

let audioCtx: AudioContext | null = null;
let muted: boolean | null = null;

function loadMuted(): boolean {
  if (muted !== null) return muted;
  try {
    muted = localStorage.getItem(STORAGE_KEYS.muted) === '1';
  } catch {
    muted = false;
  }
  return muted;
}

function saveMuted(value: boolean) {
  muted = value;
  try {
    localStorage.setItem(STORAGE_KEYS.muted, value ? '1' : '0');
  } catch { /* ignore */ }
}

export function isMuted(): boolean {
  return loadMuted();
}

export function toggleMute(): boolean {
  const next = !loadMuted();
  saveMuted(next);
  if (next) {
    stopMusic();
  } else {
    startMusic();
  }
  return next;
}

function getCtx(): AudioContext | null {
  if (!audioCtx) {
    try {
      audioCtx = new AudioContext();
    } catch {
      return null;
    }
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function closeAudio(): void {
  stopMusic();
  if (audioCtx) {
    audioCtx.close().catch(() => { /* ignore */ });
    audioCtx = null;
  }
}

function playTone(freq: number, duration: number, type: OscillatorType = 'square', volume = 0.08, slide = 0) {
  if (loadMuted()) return;
  const ctx = getCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  if (slide) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), ctx.currentTime + duration);
  }
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

function playNoise(duration: number, volume = 0.06) {
  if (loadMuted()) return;
  const ctx = getCtx();
  if (!ctx) return;
  const bufferSize = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  source.connect(gain);
  gain.connect(ctx.destination);
  source.start(ctx.currentTime);
}

export function sfxShoot() {
  playTone(880, 0.07, 'square', 0.03, 200);
}

export function sfxHit() {
  playTone(300, 0.1, 'sawtooth', 0.05, -200);
}

export function sfxExplosion() {
  playNoise(0.22, 0.09);
  playTone(100, 0.28, 'sawtooth', 0.07, -80);
}

export function sfxPowerUp() {
  playTone(523, 0.09, 'sine', 0.07);
  setTimeout(() => playTone(784, 0.09, 'sine', 0.07), 70);
  setTimeout(() => playTone(1047, 0.14, 'sine', 0.07), 140);
}

export function sfxPlayerHit() {
  playNoise(0.28, 0.13);
  playTone(150, 0.38, 'sawtooth', 0.09, -100);
}

export function sfxGameOver() {
  playTone(440, 0.3, 'sawtooth', 0.09, -300);
  setTimeout(() => playTone(220, 0.5, 'sawtooth', 0.09, -150), 280);
}

export function sfxBoss() {
  playTone(80, 0.6, 'sawtooth', 0.12, 40);
  setTimeout(() => playTone(60, 0.8, 'sawtooth', 0.12, 30), 350);
}

export function initAudio() {
  getCtx();
}

// ---------- background music (minimal synthwave loop) ----------
let musicInterval: number | null = null;
let musicStep = 0;

// A-minor-ish groove: bass each step, sparkle arp every other step
const bassLine = [110, 0, 110, 0, 130.81, 0, 98, 0, 110, 0, 110, 0, 146.83, 0, 130.81, 0];
const arpLine = [220, 261.63, 329.63, 440, 523.25, 440, 329.63, 261.63, 220, 261.63, 329.63, 440, 587.33, 523.25, 440, 329.63];

export function startMusic() {
  if (loadMuted() || musicInterval !== null) return;
  const ctx = getCtx();
  if (!ctx) return;
  musicStep = 0;
  musicInterval = window.setInterval(() => {
    if (loadMuted()) return;
    const bass = bassLine[musicStep % bassLine.length];
    if (bass) playTone(bass, 0.16, 'triangle', 0.045);
    if (musicStep % 2 === 0) {
      const arp = arpLine[musicStep % arpLine.length];
      if (arp) playTone(arp, 0.11, 'sine', 0.02);
    }
    musicStep++;
  }, AUDIO.musicIntervalMs);
}

export function stopMusic() {
  if (musicInterval !== null) {
    clearInterval(musicInterval);
    musicInterval = null;
  }
}
