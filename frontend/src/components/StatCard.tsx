interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  color: 'blue' | 'green' | 'purple' | 'orange';
  /** When true, renders a pulsing green dot to signal a live/active state. */
  indicator?: boolean;
}

const colorClasses: Record<NonNullable<StatCardProps['color']>, string> = {
  blue: 'bg-indigo-100 text-indigo-700',
  green: 'bg-emerald-100 text-emerald-700',
  purple: 'bg-cyan-100 text-cyan-700',
  orange: 'bg-amber-100 text-amber-700',
};

export function StatCard({ icon: Icon, label, value, color, indicator }: StatCardProps) {
  return (
    <div className="card p-5">
      <div className="flex items-center">
        <div className={`rounded-xl p-3 ${colorClasses[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="ml-4 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <div className="flex items-center gap-2">
            {indicator && (
              <span
                className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"
                title="Timer running"
              />
            )}
            <p className="text-2xl font-semibold text-slate-900">{value}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
