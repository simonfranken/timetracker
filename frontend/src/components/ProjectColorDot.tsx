interface ProjectColorDotProps {
  color: string | null | undefined;
  /** Tailwind size classes (default: w-3 h-3) */
  size?: string;
}

/** A small filled circle used to represent a project's colour. */
export function ProjectColorDot({ color, size = 'w-3 h-3' }: ProjectColorDotProps) {
  return (
    <div
      className={`${size} rounded-full flex-shrink-0`}
      style={{ backgroundColor: color || '#6b7280' }}
    />
  );
}
