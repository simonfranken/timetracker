const FALLBACK_COLOR = "#6b7280";

function parseHex(color: string): [number, number, number] {
  const hex = /^#[0-9a-fA-F]{6}$/.test(color) ? color : FALLBACK_COLOR;
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function mix(color: [number, number, number], target: number, amount: number): string {
  const channel = (value: number) =>
    Math.round(value + (target - value) * amount)
      .toString(16)
      .padStart(2, "0");
  return `#${channel(color[0])}${channel(color[1])}${channel(color[2])}`;
}

export interface ProjectTint {
  /** Solid project color, for markers and bars */
  mark: string;
  /** Light tint for calendar blocks */
  bg: string;
  /** Dark, readable text color on the tint */
  fg: string;
}

/** Derives a light background and readable foreground from any project color. */
export function projectTint(color: string | null | undefined): ProjectTint {
  const rgb = parseHex(color ?? FALLBACK_COLOR);
  return {
    mark: mix(rgb, 0, 0),
    bg: mix(rgb, 255, 0.82),
    fg: mix(rgb, 0, 0.6),
  };
}

export const DEFAULT_PROJECT_COLOR = "#0B6E5F";

/** Color used to represent a client: the color of its first project. */
export function clientColor(
  projects: { clientId: string; color: string | null }[] | undefined,
  clientId: string,
): string {
  return projects?.find((p) => p.clientId === clientId && p.color)?.color ?? DEFAULT_PROJECT_COLOR;
}
