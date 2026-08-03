export interface HelpRow {
  label: string;
  value: string;
}

export const KEYS_HELP: HelpRow[] = [
  { label: "MOVE", value: "WASD or arrow keys — drag anywhere on touch" },
  { label: "FIRE", value: "Space (auto-fire while dragging on touch)" },
  { label: "PAUSE", value: "Esc, or the PAUSE button top-right" },
  { label: "SOUND", value: "M, or the SOUND button top-right" },
  { label: "RESTART", value: "Enter on the game-over screen" },
];
