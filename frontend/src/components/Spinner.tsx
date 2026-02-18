interface SpinnerProps {
  /** Height/width class (default: h-12 w-12) */
  size?: string;
}

export function Spinner({ size = 'h-12 w-12' }: SpinnerProps) {
  return (
    <div className="flex items-center justify-center h-64">
      <div className={`animate-spin rounded-full ${size} border-b-2 border-primary-600`} />
    </div>
  );
}
