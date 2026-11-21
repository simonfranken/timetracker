import { useMemo, useState } from "react";
import { addDays, format, isSameDay } from "date-fns";

export interface WeekCalendarBlock {
  id: string;
  startHour: number;
  endHour: number;
  dayIndex: number;
  /** Light background tint */
  background: string;
  /** Readable text color on the tint */
  foreground: string;
  /** Solid accent used for the left edge */
  accent: string;
  title: string;
  subtitle?: string;
  label: string;
  tooltip?: string;
  isActive?: boolean;
}

export interface WeekCalendarCorrection {
  id: string;
  dayIndex: number;
  label: string;
  hoursLabel: string;
}

interface WeekCalendarProps {
  weekStart: Date;
  blocks: WeekCalendarBlock[];
  corrections: WeekCalendarCorrection[];
  onBlockClick: (id: string) => void;
  onCorrectionClick: (id: string) => void;
  onAddCorrection: (dayIndex: number) => void;
  /** Called after a click (1 hour) or drag on an empty slot */
  onSelectRange: (dayIndex: number, startHour: number, endHour: number) => void;
  defaultStartHour?: number;
  defaultEndHour?: number;
  minBlockHeight?: number;
  maxOverlapColumns?: number;
  dayTotals?: string[];
  dayCorrectionTotals?: string[];
}

const HOUR_HEIGHT = 56;
const SLOT_MINUTES = 15;
const SLOTS_PER_HOUR = 60 / SLOT_MINUTES;
const SLOT_HEIGHT = HOUR_HEIGHT / SLOTS_PER_HOUR;
const COLUMNS = "56px repeat(7, minmax(0, 1fr))";

interface PositionedBlock extends WeekCalendarBlock {
  column: number;
  widthPercent: number;
  leftPercent: number;
}

interface HiddenIndicator {
  startHour: number;
  hiddenCount: number;
}

function clampHour(value: number): number {
  return Math.max(0, Math.min(23.999, value));
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


function formatHour(hour: number): string {
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

interface DragState {
  dayIndex: number;
  anchor: number;
  from: number;
  to: number;
  rect: DOMRect;
  moved: boolean;
}

export function WeekCalendar({
  weekStart,
  blocks,
  corrections,
  onBlockClick,
  onCorrectionClick,
  onAddCorrection,
  onSelectRange,
  defaultStartHour = 8,
  defaultEndHour = 18,
  minBlockHeight = 28,
  maxOverlapColumns = 2,
  dayTotals,
  dayCorrectionTotals,
}: WeekCalendarProps) {
  const today = new Date();
  const [hover, setHover] = useState<{ dayIndex: number; slot: number } | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);

  const normalizedBlocks = useMemo(
    () =>
      blocks
        .map((block) => {
          const start = clampHour(Math.min(block.startHour, block.endHour));
          const end = clampHour(Math.max(block.startHour, block.endHour));
          return { ...block, startHour: start, endHour: Math.max(start + 1 / 120, end) };
        })
        .filter((block) => block.dayIndex >= 0 && block.dayIndex <= 6),
    [blocks],
  );

  const visibleStartHour = useMemo(() => {
    const min = normalizedBlocks.reduce((m, b) => Math.min(m, b.startHour), defaultStartHour);
    return Math.max(0, Math.floor(min));
  }, [defaultStartHour, normalizedBlocks]);

  const visibleEndHour = useMemo(() => {
    const max = normalizedBlocks.reduce((m, b) => Math.max(m, b.endHour), defaultEndHour);
    return Math.min(24, Math.ceil(max));
  }, [defaultEndHour, normalizedBlocks]);

  const totalRangeHours = Math.max(1, visibleEndHour - visibleStartHour);
  const gridHeight = totalRangeHours * HOUR_HEIGHT;
  const slotCount = totalRangeHours * SLOTS_PER_HOUR;
  const hours = Array.from({ length: totalRangeHours }, (_, i) => visibleStartHour + i);

  const positionedByDay = useMemo(
    () =>
      Array.from({ length: 7 }, (_, dayIndex) =>
        layoutDayBlocks(
          normalizedBlocks.filter((block) => block.dayIndex === dayIndex),
          maxOverlapColumns,
        ),
      ),
    [normalizedBlocks, maxOverlapColumns],
  );

  const hiddenIndicatorsByDay = useMemo(
    () =>
      Array.from({ length: 7 }, (_, dayIndex) =>
        calculateHiddenIndicators(
          normalizedBlocks.filter((block) => block.dayIndex === dayIndex),
          maxOverlapColumns,
        ),
      ),
    [normalizedBlocks, maxOverlapColumns],
  );

  const slotAt = (clientY: number, rect: DOMRect) =>
    Math.max(0, Math.min(slotCount - 1, Math.floor((clientY - rect.top) / SLOT_HEIGHT)));
  const slotHour = (slot: number) => visibleStartHour + slot / SLOTS_PER_HOUR;

  const finishDrag = () => {
    if (!drag) return;
    let { from, to } = drag;
    if (!drag.moved) to = Math.min(slotCount, from + SLOTS_PER_HOUR);
    setDrag(null);
    onSelectRange(drag.dayIndex, slotHour(from), slotHour(to));
  };

  return (
    <div className="overflow-x-auto rounded-2xl border border-paper-line bg-white">
      <div
        className="min-w-[760px] select-none"
        onMouseMove={(e) => {
          if (!drag) return;
          const slot = slotAt(e.clientY, drag.rect);
          const from = Math.min(drag.anchor, slot);
          const to = Math.max(drag.anchor + 1, slot + 1);
          if (from !== drag.from || to !== drag.to) setDrag({ ...drag, from, to, moved: true });
        }}
        onMouseUp={finishDrag}
        onMouseLeave={() => {
          setDrag(null);
          setHover(null);
        }}
      >
        {/* Day headers */}
        <div className="grid border-b border-paper-line" style={{ gridTemplateColumns: COLUMNS }}>
          <div />
          {Array.from({ length: 7 }, (_, dayIndex) => {
            const date = addDays(weekStart, dayIndex);
            const isToday = isSameDay(date, today);
            return (
              <div key={dayIndex} className="px-2 py-3">
                <div className={`text-[13px] font-semibold ${isToday ? "text-primary-800" : "text-ink-muted"}`}>
                  {format(date, "EEE")}
                </div>
                <b
                  className={`-ml-1 mt-0.5 block h-[30px] w-[30px] rounded-full text-center text-lg leading-[30px] ${
                    isToday ? "bg-primary-600 text-white" : "text-ink"
                  }`}
                >
                  {format(date, "d")}
                </b>
                <span className="tabular mt-0.5 block min-h-4 text-xs font-semibold">
                  {dayTotals?.[dayIndex]}{" "}
                  <span className="text-correction">{dayCorrectionTotals?.[dayIndex]}</span>
                </span>
              </div>
            );
          })}
        </div>

        {/* Balance corrections */}
        <div
          className="grid border-b border-paper-line bg-paper-sunken"
          style={{ gridTemplateColumns: COLUMNS }}
        >
          <div className="px-1.5 py-2.5 text-center text-[13px] font-bold text-ink-muted" title="Balance corrections">
            ±
          </div>
          {Array.from({ length: 7 }, (_, dayIndex) => {
            const date = addDays(weekStart, dayIndex);
            return (
              <div key={dayIndex} className="group flex min-w-0 flex-col gap-1 border-l border-paper-soft p-1.5">
                {corrections
                  .filter((c) => c.dayIndex === dayIndex)
                  .map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => onCorrectionClick(c.id)}
                      className="flex min-h-8 w-full items-center gap-1.5 rounded-lg border border-dashed border-correction-edge bg-correction-soft px-2 py-1 text-xs font-semibold text-correction"
                    >
                      <span className="flex-1 truncate text-left">{c.label}</span>
                      <span className="tabular">{c.hoursLabel}</span>
                    </button>
                  ))}
                <button
                  type="button"
                  onClick={() => onAddCorrection(dayIndex)}
                  aria-label={`Add correction on ${format(date, "EEEE d MMMM")}`}
                  className="min-h-8 rounded-lg border border-dashed border-paper-edge px-2 text-xs font-semibold text-ink-muted opacity-0 transition hover:bg-white focus:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
                >
                  + correction
                </button>
              </div>
            );
          })}
        </div>

        {/* Time grid */}
        <div className="grid" style={{ gridTemplateColumns: COLUMNS }}>
          <div className="relative" style={{ height: gridHeight }}>
            {hours.map((hour) => (
              <div
                key={hour}
                className="tabular absolute right-2 text-xs font-medium text-ink-muted"
                style={{ top: (hour - visibleStartHour) * HOUR_HEIGHT + 4 }}
              >
                {String(hour).padStart(2, "0")}
              </div>
            ))}
          </div>

          {Array.from({ length: 7 }, (_, dayIndex) => {
            const date = addDays(weekStart, dayIndex);
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            const dayDrag = drag?.dayIndex === dayIndex ? drag : null;
            const dayHover = !drag && hover?.dayIndex === dayIndex ? hover : null;

            return (
              <div
                key={dayIndex}
                className={`relative cursor-crosshair border-l border-paper-soft ${isWeekend ? "bg-paper-sunken" : ""}`}
                style={{ height: gridHeight }}
                onMouseDown={(e) => {
                  if (e.button !== 0) return;
                  e.preventDefault();
                  const rect = e.currentTarget.getBoundingClientRect();
                  const slot = slotAt(e.clientY, rect);
                  setHover(null);
                  setDrag({ dayIndex, anchor: slot, from: slot, to: slot + 1, rect, moved: false });
                }}
                onMouseMove={(e) => {
                  if (drag) return;
                  const slot = slotAt(e.clientY, e.currentTarget.getBoundingClientRect());
                  if (!hover || hover.dayIndex !== dayIndex || hover.slot !== slot) {
                    setHover({ dayIndex, slot });
                  }
                }}
                onMouseLeave={() => setHover(null)}
              >
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className="absolute inset-x-0 border-t border-paper-soft"
                    style={{ top: (hour - visibleStartHour) * HOUR_HEIGHT }}
                  />
                ))}

                {(hiddenIndicatorsByDay[dayIndex] ?? []).map((indicator) => (
                  <div
                    key={`hidden-${indicator.startHour}`}
                    className="absolute right-1 z-30 rounded bg-paper-hover px-2 py-0.5 text-[10px] font-semibold text-ink-soft"
                    style={{ top: (indicator.startHour - visibleStartHour) * HOUR_HEIGHT + 2 }}
                  >
                    +{indicator.hiddenCount} more
                  </div>
                ))}

                {(positionedByDay[dayIndex] ?? []).map((block) => {
                  const rawTop = (block.startHour - visibleStartHour) * HOUR_HEIGHT;
                  const height = Math.max(minBlockHeight, (block.endHour - block.startHour) * HOUR_HEIGHT);
                  const top = Math.min(rawTop, Math.max(0, gridHeight - height));
                  return (
                    <button
                      key={block.id}
                      type="button"
                      className="absolute z-20 flex cursor-pointer flex-col items-start overflow-hidden rounded-lg px-2 py-1 text-left text-xs leading-tight"
                      style={{
                        top,
                        height,
                        left: `calc(${block.leftPercent}% + 2px)`,
                        width: `calc(${block.widthPercent}% - 4px)`,
                        backgroundColor: block.background,
                        color: block.foreground,
                        boxShadow: `inset 3px 0 0 ${block.accent}`,
                      }}
                      title={block.tooltip ?? `${block.title} (${block.label})`}
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={() => onBlockClick(block.id)}
                    >
                      <b className="w-full truncate">{block.title}</b>
                      {height >= 44 && (
                        <span className="tabular w-full truncate">
                          {block.subtitle ? `${block.subtitle} · ` : ""}
                          {block.label}
                        </span>
                      )}
                      {block.isActive && (
                        <span className="absolute right-1.5 top-1.5 h-2 w-2 animate-pulse rounded-full bg-danger" />
                      )}
                    </button>
                  );
                })}

                {dayHover && (
                  <div
                    className="pointer-events-none absolute inset-x-1 z-10 rounded-lg border border-dashed border-primary-400 bg-primary-50/80 px-2 py-1 text-xs font-semibold text-primary-800"
                    style={{
                      top: Math.min(dayHover.slot, Math.max(0, slotCount - SLOTS_PER_HOUR)) * SLOT_HEIGHT,
                      height: HOUR_HEIGHT,
                    }}
                  >
                    + {formatHour(slotHour(dayHover.slot))}
                  </div>
                )}

                {dayDrag && (
                  <div
                    className="pointer-events-none absolute inset-x-1 z-30 rounded-lg bg-primary-600 px-2 py-1 text-xs font-semibold text-white"
                    style={{
                      top: dayDrag.from * SLOT_HEIGHT,
                      height: (dayDrag.to - dayDrag.from) * SLOT_HEIGHT,
                    }}
                  >
                    <span className="tabular">
                      {formatHour(slotHour(dayDrag.from))} – {formatHour(slotHour(dayDrag.to))}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
