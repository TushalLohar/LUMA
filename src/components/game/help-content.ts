export interface HelpRow {
  label: string;
  value: string;
}

export const KEYS_HELP: HelpRow[] = [
  { label: "MOVE", value: "WASD or arrow keys — drag anywhere on touch" },
  { label: "FIRE", value: "Space (auto-fire while dragging on touch)" },
  { label: "PAUSE", value: "Esc, or tap the top-right icon" },
  { label: "SOUND", value: "M, or tap the speaker icon" },
  { label: "RESTART", value: "Enter on the game-over screen" },
];
