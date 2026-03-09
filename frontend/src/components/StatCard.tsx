interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  color: 'blue' | 'green' | 'purple' | 'orange';
  /** When true, renders a pulsing green dot to signal a live/active state. */
  indicator?: boolean;
}

const colorClasses: Record<NonNullable<StatCardProps['color']>, string> = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-green-50 text-green-600',
  purple: 'bg-purple-50 text-purple-600',
  orange: 'bg-orange-50 text-orange-600',
};

export function StatCard({ icon: Icon, label, value, color, indicator }: StatCardProps) {
  return (
    <div className="card p-4">
      <div className="flex items-center">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="ml-4 flex-1">
          <p className="text-sm font-medium text-gray-600">{label}</p>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {indicator && (
              <span
                className="inline-block h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse"
                title="Timer running"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
