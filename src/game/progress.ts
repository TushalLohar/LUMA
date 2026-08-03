// Lifetime progression: local, offline-friendly stats plus cosmetic ship unlocks.

const PROGRESS_KEY = 'novaBlasterProgress';
const SKIN_KEY = 'novaBlasterSkin';
const TAG_KEY = 'novaBlasterTag';
const SEEN_HELP_KEY = 'novaBlasterSeenHelp';

export interface Progress {
  runs: number;
  kills: number;
  bestScore: number;
  bestWave: number;
  totalTime: number;
}

export interface Ship {
  id: number;
  name: string;
  color: string;
  glow: string;
  /** Lifetime kills required to unlock. */
  unlockAt: number;
}

export const SHIPS: Ship[] = [
  { id: 0, name: 'EMBER', color: '#ff7a1a', glow: '#ff3d00', unlockAt: 0 },
  { id: 1, name: 'BONE', color: '#f2e8dc', glow: '#ffb703', unlockAt: 250 },
  { id: 2, name: 'HAZARD', color: '#ffd166', glow: '#ff9e00', unlockAt: 1000 },
  { id: 3, name: 'CINDER', color: '#e5484d', glow: '#ff2d20', unlockAt: 3000 },
];

const EMPTY: Progress = { runs: 0, kills: 0, bestScore: 0, bestWave: 0, totalTime: 0 };

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...(JSON.parse(raw) as T) } : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
}

export function loadProgress(): Progress {
  return read(PROGRESS_KEY, EMPTY);
}

export function recordRun(run: { score: number; wave: number; kills: number; time: number }): Progress {
  const p = loadProgress();
  const next: Progress = {
    runs: p.runs + 1,
    kills: p.kills + run.kills,
    bestScore: Math.max(p.bestScore, Math.round(run.score)),
    bestWave: Math.max(p.bestWave, run.wave),
    totalTime: p.totalTime + run.time,
  };
  write(PROGRESS_KEY, next);
  return next;
}

export function unlockedShips(progress = loadProgress()): Ship[] {
  return SHIPS.filter((s) => progress.kills >= s.unlockAt);
}

export function loadSkin(): number {
  try {
    const id = Number(localStorage.getItem(SKIN_KEY) ?? 0);
    const ship = SHIPS.find((s) => s.id === id);
    return ship && loadProgress().kills >= ship.unlockAt ? ship.id : 0;
  } catch {
    return 0;
  }
}

export function saveSkin(id: number) {
  try {
    localStorage.setItem(SKIN_KEY, String(id));
  } catch {
    /* storage unavailable */
  }
}

export function shipById(id: number): Ship {
  return SHIPS.find((s) => s.id === id) ?? SHIPS[0]!;
}

export function loadTag(): string {
  try {
    return (localStorage.getItem(TAG_KEY) ?? '').toUpperCase().slice(0, 3);
  } catch {
    return '';
  }
}

export function saveTag(tag: string) {
  try {
    localStorage.setItem(TAG_KEY, tag.toUpperCase().slice(0, 3));
  } catch {
    /* storage unavailable */
  }
}

export function hasSeenHelp(): boolean {
  try {
    return localStorage.getItem(SEEN_HELP_KEY) === '1';
  } catch {
    return true;
  }
}

export function markHelpSeen() {
  try {
    localStorage.setItem(SEEN_HELP_KEY, '1');
  } catch {
    /* storage unavailable */
  }
}
