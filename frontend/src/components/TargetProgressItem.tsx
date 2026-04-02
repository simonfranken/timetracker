import { formatDurationHoursMinutes } from "@/utils/dateUtils";
import type { ClientTargetWithBalance } from "@/types";

interface TargetProgressItemProps {
  target: ClientTargetWithBalance;
  showClientName?: boolean;
  heading?: string;
  containerClassName?: string;
}

export function TargetProgressItem({
  target,
  showClientName = true,
  heading,
  containerClassName,
}: TargetProgressItemProps) {
  const balance = target.totalBalanceSeconds;
  const absBalance = Math.abs(balance);
  const isOver = balance > 0;
  const isEven = balance === 0;
  const currentPeriodTracked = formatDurationHoursMinutes(target.currentPeriodTrackedSeconds);
  const currentPeriodTarget = formatDurationHoursMinutes(target.currentPeriodTargetSeconds);
  const periodLabel = target.periodType === "weekly" ? "This week" : "This month";
  const progressPercent = target.currentPeriodTargetSeconds > 0
    ? Math.min(100, Math.round((target.currentPeriodTrackedSeconds / target.currentPeriodTargetSeconds) * 100))
    : 0;

  return (
    <div className={containerClassName ?? "rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/80 p-4"}>
      {heading && <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{heading}</p>}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          {showClientName && <p className="truncate text-sm font-semibold text-slate-900">{target.clientName}</p>}
          <p className="mt-0.5 text-xs text-slate-600">
            {periodLabel}: {currentPeriodTracked} / {currentPeriodTarget}
          </p>
        </div>
        <div className="text-right">
          <div className="flex items-center justify-end gap-1.5">
            {target.hasOngoingTimer && (
              <span
                className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse"
                title="Timer running — balance updates every 30 s"
              />
            )}
            <p
              className={`text-sm font-bold ${
                isEven
                  ? "text-slate-500"
                  : isOver
                    ? "text-emerald-700"
                    : "text-rose-700"
              }`}
            >
              {isEven ? "±0" : (isOver ? "+" : "−") + formatDurationHoursMinutes(absBalance)}
            </p>
          </div>
          <p className="text-[11px] text-slate-500">running balance</p>
        </div>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          <span>Progress</span>
          <span>{progressPercent}%</span>
        </div>
        <div className="h-2 rounded-full bg-slate-200">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500 transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
