import { useMemo, useRef, useState } from "react";
import { addDays, format, isSameDay } from "date-fns";

export interface WeekCalendarBlock {
  id: string;
  startHour: number;
  endHour: number;
  dayIndex: number;
  color: string;
  title: string;
  subtitle?: string;
  label: string;
  tooltip?: string;
  isActive?: boolean;
}

interface WeekCalendarProps {
  weekStart: Date;
  blocks: WeekCalendarBlock[];
  onBlockClick: (id: string) => void;
  defaultStartHour?: number;
  defaultEndHour?: number;
  minBlockHeight?: number;
  maxOverlapColumns?: number;
  dayTotals?: string[];
}

interface PositionedBlock extends WeekCalendarBlock {
  column: number;
  widthPercent: number;
  leftPercent: number;
}

interface HiddenIndicator {
  startHour: number;
  hiddenCount: number;
}

const HOUR_HEIGHT = 72;

function clampHour(value: number): number {
  return Math.max(0, Math.min(23.999, value));
}

function roundsDownToHalfHour(value: number): number {
  return Math.floor(value * 2) / 2;
}

function roundsUpToHalfHour(value: number): number {
  return Math.ceil(value * 2) / 2;
}

function intervalsOverlap(a: WeekCalendarBlock, b: WeekCalendarBlock): boolean {
  return a.startHour < b.endHour && b.startHour < a.endHour;
}

function layoutDayBlocks(
  dayBlocks: WeekCalendarBlock[],
  maxOverlapColumns: number,
): PositionedBlock[] {
  const sorted = [...dayBlocks].sort((a, b) => {
    if (a.startHour !== b.startHour) {
      return a.startHour - b.startHour;
    }
    return b.endHour - a.endHour;
  });

  const active: { endHour: number; column: number }[] = [];
  const visible: PositionedBlock[] = [];

  for (const block of sorted) {
    for (let i = active.length - 1; i >= 0; i -= 1) {
      if (active[i].endHour <= block.startHour) {
        active.splice(i, 1);
      }
    }

    const used = new Set(active.map((item) => item.column));
    let nextColumn = -1;
    for (let i = 0; i < maxOverlapColumns; i += 1) {
      if (!used.has(i)) {
        nextColumn = i;
        break;
      }
    }

    if (nextColumn === -1) {
      continue;
    }

    visible.push({
      ...block,
      column: nextColumn,
      widthPercent: 100,
      leftPercent: 0,
    });
    active.push({ endHour: block.endHour, column: nextColumn });
  }

  for (let i = 0; i < visible.length; i += 1) {
    const current = visible[i];
    const overlaps = visible.some(
      (candidate, idx) => idx !== i && intervalsOverlap(candidate, current),
    );

    if (overlaps) {
      visible[i] = {
        ...current,
        widthPercent: 100 / maxOverlapColumns,
        leftPercent: (100 / maxOverlapColumns) * current.column,
      };
    }
  }

  return visible;
}

function calculateHiddenIndicators(
  dayBlocks: WeekCalendarBlock[],
  maxOverlapColumns: number,
): HiddenIndicator[] {
  const events: { hour: number; delta: number }[] = [];

  for (const block of dayBlocks) {
    events.push({ hour: block.startHour, delta: 1 });
    events.push({ hour: block.endHour, delta: -1 });
  }

  events.sort((a, b) => {
    if (a.hour !== b.hour) {
      return a.hour - b.hour;
    }
    return a.delta - b.delta;
  });

  const indicators: HiddenIndicator[] = [];
  let activeCount = 0;
  let previousHour: number | null = null;

  for (const event of events) {
    if (
      previousHour !== null &&
      event.hour > previousHour &&
      activeCount > maxOverlapColumns
    ) {
      const hiddenCount = activeCount - maxOverlapColumns;
      const last = indicators[indicators.length - 1];
      if (!last || Math.abs(last.startHour - previousHour) > 0.001) {
        indicators.push({ startHour: previousHour, hiddenCount });
      } else if (hiddenCount > last.hiddenCount) {
        last.hiddenCount = hiddenCount;
      }
    }

    activeCount += event.delta;
    previousHour = event.hour;
  }

  return indicators;
}

export function WeekCalendar({
  weekStart,
  blocks,
  onBlockClick,
  defaultStartHour = 6,
  defaultEndHour = 22,
  minBlockHeight = 30,
  maxOverlapColumns = 2,
  dayTotals,
}: WeekCalendarProps) {
  const today = new Date();
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);

  const normalizedBlocks = useMemo(
    () =>
      blocks
        .map((block) => {
          const start = clampHour(Math.min(block.startHour, block.endHour));
          const end = clampHour(Math.max(block.startHour, block.endHour));
          return {
            ...block,
            startHour: start,
            endHour: Math.max(start + 1 / 120, end),
          };
        })
        .filter((block) => block.dayIndex >= 0 && block.dayIndex <= 6),
    [blocks],
  );

  const visibleStartHour = useMemo(() => {
    const minBlockHour = normalizedBlocks.reduce(
      (min, block) => Math.min(min, block.startHour),
      defaultStartHour,
    );
    return Math.max(0, roundsDownToHalfHour(minBlockHour));
  }, [defaultStartHour, normalizedBlocks]);

  const visibleEndHour = useMemo(() => {
    const maxBlockHour = normalizedBlocks.reduce(
      (max, block) => Math.max(max, block.endHour),
      defaultEndHour,
    );
    return Math.min(24, roundsUpToHalfHour(maxBlockHour));
  }, [defaultEndHour, normalizedBlocks]);

  const totalRangeHours = Math.max(0.5, visibleEndHour - visibleStartHour);
  const gridHeight = Math.max(640, totalRangeHours * HOUR_HEIGHT);

  const blocksByDay = useMemo(() => {
    return Array.from({ length: 7 }, (_, dayIndex) =>
      normalizedBlocks.filter((block) => block.dayIndex === dayIndex),
    );
  }, [normalizedBlocks]);

  const positionedByDay = useMemo(
    () =>
      blocksByDay.map((dayBlocks) =>
        layoutDayBlocks(dayBlocks, maxOverlapColumns),
      ),
    [blocksByDay, maxOverlapColumns],
  );

  const hiddenIndicatorsByDay = useMemo(
    () =>
      blocksByDay.map((dayBlocks) =>
        calculateHiddenIndicators(dayBlocks, maxOverlapColumns),
      ),
    [blocksByDay, maxOverlapColumns],
  );

  const sortedBlocks = useMemo(() => {
    return [...normalizedBlocks].sort((a, b) => {
      if (a.dayIndex !== b.dayIndex) {
        return a.dayIndex - b.dayIndex;
      }
      if (a.startHour !== b.startHour) {
        return a.startHour - b.startHour;
      }
      return a.endHour - b.endHour;
    });
  }, [normalizedBlocks]);

  const blockById = useMemo(() => {
    return new Map(sortedBlocks.map((block) => [block.id, block]));
  }, [sortedBlocks]);

  const navigateFromBlock = (currentId: string, key: string): string | null => {
    const current = blockById.get(currentId);
    if (!current) {
      return null;
    }

    if (key === "ArrowUp" || key === "ArrowDown") {
      const sameDay = sortedBlocks.filter((block) => block.dayIndex === current.dayIndex);
      const currentIndex = sameDay.findIndex((block) => block.id === currentId);
      if (currentIndex === -1) {
        return null;
      }

      if (key === "ArrowUp" && currentIndex > 0) {
        return sameDay[currentIndex - 1].id;
      }
      if (key === "ArrowDown" && currentIndex < sameDay.length - 1) {
        return sameDay[currentIndex + 1].id;
      }
      return null;
    }

    if (key === "ArrowLeft" || key === "ArrowRight") {
      const targetDay = current.dayIndex + (key === "ArrowLeft" ? -1 : 1);
      if (targetDay < 0 || targetDay > 6) {
        return null;
      }

      const candidates = sortedBlocks.filter((block) => block.dayIndex === targetDay);
      if (candidates.length === 0) {
        return null;
      }

      candidates.sort((a, b) => {
        const diffA = Math.abs(a.startHour - current.startHour);
        const diffB = Math.abs(b.startHour - current.startHour);
        if (diffA !== diffB) {
          return diffA - diffB;
        }
        return a.startHour - b.startHour;
      });

      return candidates[0].id;
    }

    return null;
  };

  const focusBlock = (id: string) => {
    setFocusedBlockId(id);
    buttonRefs.current[id]?.focus();
  };

  const slots = useMemo(() => {
    const slotCount = Math.ceil(totalRangeHours * 2);
    return Array.from({ length: slotCount + 1 }, (_, idx) => visibleStartHour + idx * 0.5);
  }, [totalRangeHours, visibleStartHour]);

  const columnTemplate = "68px repeat(7, minmax(0, 1fr))";

  return (
    <div className="h-full min-h-0 overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="h-full min-h-0 overflow-x-auto">
        <div className="min-w-[960px] h-full min-h-0 flex flex-col">
          <div className="grid shrink-0" style={{ gridTemplateColumns: columnTemplate }}>
            <div className="border-b border-r border-gray-200 bg-gray-50" />
            {Array.from({ length: 7 }, (_, dayIndex) => {
              const dayDate = addDays(weekStart, dayIndex);
              const isToday = isSameDay(dayDate, today);
              const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;

              return (
                <div
                  key={`header-${dayIndex}`}
                  className={`border-b border-r border-gray-200 px-3 py-2 ${
                    isToday
                      ? "bg-primary-50"
                      : isWeekend
                        ? "bg-gray-50"
                        : "bg-white"
                  }`}
                >
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {format(dayDate, "EEE")}
                  </div>
                  <div className="text-base font-semibold text-gray-900">{format(dayDate, "d")}</div>
                  <div className="text-xs text-gray-500">{dayTotals?.[dayIndex] ?? "0h"}</div>
                </div>
              );
            })}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="grid" style={{ gridTemplateColumns: columnTemplate }}>
              <div className="relative border-r border-gray-200 bg-gray-50" style={{ height: `${gridHeight}px` }}>
                {slots.map((hour) => {
                  const top = ((hour - visibleStartHour) / totalRangeHours) * gridHeight;
                  const isHourMark = Number.isInteger(hour);

                  return (
                    <div
                      key={`axis-${hour}`}
                      className="absolute left-0 right-0"
                      style={{ top: `${top}px` }}
                    >
                      {isHourMark && hour < 24 && (
                        <span className="absolute -top-2 right-2 text-[11px] font-medium text-gray-500">
                          {format(new Date(2000, 0, 1, hour, 0), "HH:mm")}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {Array.from({ length: 7 }, (_, dayIndex) => {
                const dayDate = addDays(weekStart, dayIndex);
                const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;
                const dayBlocks = positionedByDay[dayIndex] ?? [];
                const dayIndicators = hiddenIndicatorsByDay[dayIndex] ?? [];

                return (
                  <div
                    key={`column-${dayIndex}`}
                    className={`relative border-r border-gray-200 ${isWeekend ? "bg-gray-50/60" : "bg-white"}`}
                    style={{ height: `${gridHeight}px` }}
                    tabIndex={dayIndex === 0 ? 0 : -1}
                    onFocus={(event) => {
                      if (event.currentTarget === event.target && sortedBlocks.length > 0) {
                        focusBlock(sortedBlocks[0].id);
                      }
                    }}
                  >
                    {slots.map((hour) => {
                      const top = ((hour - visibleStartHour) / totalRangeHours) * gridHeight;
                      const isHourMark = Number.isInteger(hour);
                      return (
                        <div
                          key={`line-${dayIndex}-${hour}`}
                          className={`absolute left-0 right-0 border-t ${
                            isHourMark ? "border-gray-200" : "border-gray-100"
                          }`}
                          style={{ top: `${top}px` }}
                        />
                      );
                    })}

                    {dayIndicators.map((indicator) => {
                      const top = ((indicator.startHour - visibleStartHour) / totalRangeHours) * gridHeight;
                      return (
                        <div
                          key={`hidden-${dayIndex}-${indicator.startHour}`}
                          className="absolute right-1 z-30 rounded bg-gray-200 px-2 py-0.5 text-[10px] font-semibold text-gray-600"
                          style={{ top: `${top + 2}px` }}
                        >
                          +{indicator.hiddenCount} more
                        </div>
                      );
                    })}

                    {dayBlocks.map((block) => {
                      const rawTop = ((block.startHour - visibleStartHour) / totalRangeHours) * gridHeight;
                      const rawHeight =
                        ((block.endHour - block.startHour) / totalRangeHours) * gridHeight;
                      const height = Math.max(minBlockHeight, rawHeight);
                      const top = Math.min(rawTop, Math.max(0, gridHeight - height));

                      let contentLevel: "full" | "medium" | "minimal" = "minimal";
                      if (height >= 60) {
                        contentLevel = "full";
                      } else if (height > 30) {
                        contentLevel = "medium";
                      }

                      return (
                        <button
                          key={block.id}
                          ref={(element) => {
                            buttonRefs.current[block.id] = element;
                          }}
                          type="button"
                          className={`absolute z-20 rounded-md border border-black/10 px-2 py-1 text-left shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                            focusedBlockId === block.id ? "ring-2 ring-primary-500" : ""
                          }`}
                          style={{
                            top: `${top}px`,
                            left: `calc(${block.leftPercent}% + 2px)`,
                            width: `calc(${block.widthPercent}% - 4px)`,
                            height: `${height}px`,
                            backgroundColor: block.color,
                          }}
                          title={block.tooltip ?? `${block.title} (${block.label})`}
                          onClick={() => onBlockClick(block.id)}
                          onFocus={() => setFocusedBlockId(block.id)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              onBlockClick(block.id);
                              return;
                            }

                            if (
                              event.key === "ArrowUp" ||
                              event.key === "ArrowDown" ||
                              event.key === "ArrowLeft" ||
                              event.key === "ArrowRight"
                            ) {
                              event.preventDefault();
                              const nextId = navigateFromBlock(block.id, event.key);
                              if (nextId) {
                                focusBlock(nextId);
                              }
                            }
                          }}
                        >
                          <div className="truncate text-xs font-semibold text-white drop-shadow-sm">
                            {block.title}
                          </div>
                          {contentLevel === "full" && block.subtitle && (
                            <div className="truncate text-[11px] text-white/90">{block.subtitle}</div>
                          )}
                          {(contentLevel === "full" || contentLevel === "medium") && (
                            <div className="truncate text-[10px] text-white/85">{block.label}</div>
                          )}
                          {block.isActive && (
                            <div className="absolute right-1 top-1 h-2 w-2 rounded-full bg-white/90 animate-pulse" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
