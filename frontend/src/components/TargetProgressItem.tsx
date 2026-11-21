import { formatDurationHoursMinutes, formatSignedDuration } from "@/utils/dateUtils";
import type { ClientTargetWithBalance } from "@/types";

interface TargetProgressItemProps {
  target: ClientTargetWithBalance;
  /** Bar color, usually the client's project color */
  color: string;
}

export function BalanceFigure({
  seconds,
  className = "",
}: {
  seconds: number;
  className?: string;
}) {
  const tone =
    seconds === 0 ? "text-ink-muted" : seconds > 0 ? "text-primary-800" : "text-danger";
  return <b className={`tabular ${tone} ${className}`}>{formatSignedDuration(seconds)}</b>;
}

export function TargetProgressItem({ target, color }: TargetProgressItemProps) {
  const periodLabel = target.periodType === "weekly" ? "this week" : "this month";
  const percent =
    target.currentPeriodTargetSeconds > 0
      ? Math.min(
          100,
          Math.round(
            (target.currentPeriodTrackedSeconds / target.currentPeriodTargetSeconds) * 100,
          ),
        )
      : 0;

  return (
    <div className="card px-[22px] py-5">
      <div className="flex items-baseline justify-between gap-3">
        <b className="truncate">{target.clientName}</b>
        <span className="shrink-0 text-[13px] text-ink-muted">{periodLabel}</span>
      </div>
      <div className="tabular my-2 text-[26px] font-bold">
        {formatDurationHoursMinutes(target.currentPeriodTrackedSeconds) || "0m"}{" "}
        <span className="text-[15px] font-medium text-ink-muted">
          of {formatDurationHoursMinutes(target.currentPeriodTargetSeconds) || "0h"}
        </span>
      </div>
      <div
        className="h-2.5 overflow-hidden rounded-[5px] bg-paper-hover"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${target.clientName} progress ${periodLabel}`}
      >
        <div className="h-full" style={{ width: `${percent}%`, backgroundColor: color }} />
      </div>
      <div className="mt-2.5 flex items-center justify-between text-[13px] text-ink-muted">
        <span className="inline-flex items-center gap-1.5">
          {target.hasOngoingTimer && (
            <span
              className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary-600"
              title="Timer running — balance updates every 30 s"
            />
          )}
          Running balance
        </span>
        <BalanceFigure seconds={target.totalBalanceSeconds} />
      </div>
    </div>
  );
}
