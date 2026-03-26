# Feature: Timer Breaks (Pause During Work)

## Overview
Allow users to take breaks while a timer is running. When on break, elapsed time is frozen and break time is tracked. When resumed, break time accumulates and is subtracted from the displayed work time.

## User Experience

### Timer States
1. **Running** — normal state, elapsed time ticking
2. **On Break** — elapsed time frozen, break time ticking, Stop/Cancel buttons disabled
3. **Stopped** — no timer active

### UI Changes (TimerWidget)
- Add a **"Break"** button (amber, `Pause` icon) next to Stop when timer is running
- When on break:
  - Change pulsing dot color from red to amber
  - Elapsed time frozen at net work time
  - Show break time below: `Break: Xm XXs` (live-ticking)
  - Replace "Break" button with **"Resume"** button (green, `Play` icon)
  - **Disable** Stop and Cancel buttons (tooltip: "Resume before stopping")

### Duration Calculations
- **Work time (displayed):** `now - startTime - totalBreakSeconds`
  - Where `totalBreakSeconds = (breakMinutes * 60) + (now - breakStart if on break)`
  - When on break: frozen at `(breakStart - startTime - breakMinutes * 60)`
- **Break time (displayed):** `breakMinutes * 60 + (now - breakStart if on break)`

## Implementation

### 1. Database Schema (`backend/prisma/schema.prisma`)
Add two fields to `OngoingTimer`:
```prisma
model OngoingTimer {
  // ... existing fields ...
  breakMinutes Int       @default(0) @map("break_minutes")
  breakStart   DateTime? @map("break_start") @db.Timestamptz()
}
```
Run: `npx prisma migrate dev --name add_timer_break_fields`

### 2. Backend Service (`backend/src/services/timer.service.ts`)

**New method `startBreak(userId)`:**
- Get ongoing timer, throw `NotFoundError` if none
- Check `timer.breakStart` is null (not already on break), throw `BadRequestError` if on break
- Update: `breakStart = new Date()`
- Return updated timer

**New method `endBreak(userId)`:**
- Get ongoing timer, throw `NotFoundError` if none
- Check `timer.breakStart` is not null, throw `BadRequestError` if not on break
- Calculate additional break minutes: `Math.floor((now - breakStart) / 60000)`
- Update: `breakMinutes += additionalMinutes`, `breakStart = null`
- Return updated timer

**Modify `stop(userId)`:**
- Before creating time entry, check `timer.breakStart` is null — throw `BadRequestError("Cannot stop timer while on break")` if break is active
- When creating `TimeEntry`, set `breakMinutes: timer.breakMinutes`

**Modify `cancel(userId)`:**
- Check `timer.breakStart` is null — throw `BadRequestError("Cannot cancel timer while on break")` if break is active

### 3. Backend Routes (`backend/src/routes/timer.routes.ts`)
Add two new routes (both require auth, no body validation):
```
POST /api/timer/break    → timerService.startBreak(userId)
POST /api/timer/resume   → timerService.endBreak(userId)
```

### 4. MCP Tools (`backend/src/routes/mcp.routes.ts`)
Add two MCP tools: `pause_timer` and `resume_timer`.

### 5. Frontend Types (`frontend/src/types/index.ts`)
Update `OngoingTimer` interface:
```typescript
export interface OngoingTimer {
  // ... existing fields ...
  breakMinutes: number;
  breakStart: string | null;
}
```

### 6. Frontend API (`frontend/src/api/timer.ts`)
Add two methods:
```typescript
startBreak: async (): Promise<OngoingTimer> => { ... }
endBreak: async (): Promise<OngoingTimer> => { ... }
```

### 7. Frontend TimerContext (`frontend/src/contexts/TimerContext.tsx`)
- Add `breakSeconds` state (live-updating, similar to `elapsedSeconds`)
- Expose `isOnBreak` derived boolean (`ongoingTimer?.breakStart !== null`)
- Update elapsed time calculation:
  - Running: `(now - startTime) - (breakMinutes * 60) - (now - breakStart if on break)`
  - On break: `(breakStart - startTime) - (breakMinutes * 60)` (frozen)
- Break seconds: `(breakMinutes * 60) + (now - breakStart if on break)`
- Add `startBreak()` and `endBreak()` callbacks
- Expose `breakSeconds` and `isOnBreak` in context value

### 8. Frontend TimerWidget (`frontend/src/components/TimerWidget.tsx`)
- Import `Pause` icon from lucide-react
- Add Break/Resume button between project selector and Stop button
- Show break time display when `breakSeconds > 0` or `isOnBreak`
- Change dot color to amber when on break
- Disable Stop/Cancel when on break with tooltip

## Files to Modify (in order)

| # | File | Change |
|---|------|--------|
| 1 | `backend/prisma/schema.prisma` | Add `breakMinutes`, `breakStart` to `OngoingTimer` |
| 2 | `backend/src/services/timer.service.ts` | Add `startBreak()`, `endBreak()`, modify `stop()` and `cancel()` |
| 3 | `backend/src/routes/timer.routes.ts` | Add `/break` and `/resume` routes |
| 4 | `backend/src/routes/mcp.routes.ts` | Add `pause_timer` and `resume_timer` MCP tools |
| 5 | `frontend/src/types/index.ts` | Add `breakMinutes`, `breakStart` to `OngoingTimer` |
| 6 | `frontend/src/api/timer.ts` | Add `startBreak()`, `endBreak()` API methods |
| 7 | `frontend/src/contexts/TimerContext.tsx` | Add break state, `breakSeconds`, `isOnBreak`, break methods |
| 8 | `frontend/src/components/TimerWidget.tsx` | Add break UI (button, display, disabled states) |

## Edge Cases
- Break start must be after timer start (always true since break is clicked after start)
- Break duration naturally cannot exceed work duration (breakStart > startTime)
- On stop: reject if break is active (user must resume first)
- On cancel: reject if break is active (user must resume first)
- Break minutes accumulate across multiple break/resume cycles
- Timer refetch (every 60s) will sync break state from server

## Verification
- Run `npm run lint` in both `frontend/` and `backend/`
- Run `npm run build` in both `frontend/` and `backend/`
- Manual testing: start timer → break → verify elapsed frozen, break ticking → resume → verify break added to total → stop → verify time entry has correct breakMinutes
