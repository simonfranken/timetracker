# Client Targets v2 — Feature Requirements

## Overview

This document defines the requirements for the second iteration of the Client Targets feature. The main additions are:

- Targets can be set on a **weekly or monthly** period.
- Each target defines a **fixed weekly working-day pattern** (e.g. Mon + Wed).
- The balance for the **current period** is calculated proportionally based on elapsed working days, so the user can see at any point in time whether they are ahead or behind.
- The **start date** can be any calendar day (no longer restricted to Mondays).
- Manual **balance corrections** are preserved and continue to work as before.

---

## 1. Target Configuration

| Field | Type | Constraints |
|---|---|---|
| `periodType` | `WEEKLY \| MONTHLY` | Required |
| `weeklyOrMonthlyHours` | positive float, ≤ 168 | Required; represents hours per week or per month |
| `workingDays` | array of day names | At least one of `MON TUE WED THU FRI SAT SUN`; fixed repeating pattern |
| `startDate` | `YYYY-MM-DD` | Any calendar day; no longer restricted to Mondays |
| `clientId` | UUID | Must belong to the authenticated user |

**One active target per client** — the unique `(userId, clientId)` constraint is preserved. To change period type, hours, or working days the user creates a new target with a new `startDate`; the old target is soft-deleted. History from the old target is retained as-is and is no longer recalculated.

---

## 2. Period Definitions

| `periodType` | Period start | Period end |
|---|---|---|
| `WEEKLY` | Monday 00:00 of the calendar week | Sunday 23:59 of that same calendar week |
| `MONTHLY` | 1st of the calendar month 00:00 | Last day of the calendar month 23:59 |

---

## 3. Balance Calculation — Overview

The total balance is the **sum of individual period balances** from the period containing `startDate` up to and including the **current period** (the period that contains today).

Each period is classified as either **completed** or **ongoing**.

```
total_balance_seconds = SUM( balance_seconds ) over all periods
```

Positive = overtime. Negative = undertime.

---

## 4. Completed Period Balance

A period is **completed** when its end date is strictly before today.

```
balance = tracked_hours + correction_hours - period_target_hours
```

- `period_target_hours` — see §5 (pro-ration) for the first period; full `weeklyOrMonthlyHours` for all subsequent periods.
- `tracked_hours` — sum of all time entries for this client whose date falls within `[period_start, period_end]`.
- `correction_hours` — sum of manual corrections whose `date` falls within `[period_start, period_end]`.

No working-day logic is applied to completed periods. The target is simply the (optionally pro-rated) hours for that period.

---

## 5. First Period Pro-ration

If `startDate` does not fall on the natural first day of a period (Monday for weekly, 1st for monthly), the target hours for that first period are pro-rated by calendar days.

### Monthly

```
full_period_days      = total calendar days in that month
remaining_days        = (last day of month) − startDate + 1   // inclusive
period_target_hours   = (remaining_days / full_period_days) × weeklyOrMonthlyHours
```

**Example:** startDate = Jan 25, target = 40 h/month, January has 31 days.
`remaining_days = 7`, `period_target_hours = (7 / 31) × 40 = 9.032 h`

### Weekly

```
full_period_days      = 7
remaining_days        = Sunday of that calendar week − startDate + 1   // inclusive
period_target_hours   = (remaining_days / 7) × weeklyOrMonthlyHours
```

**Example:** startDate = Wednesday, target = 40 h/week.
`remaining_days = 5 (Wed–Sun)`, `period_target_hours = (5 / 7) × 40 = 28.571 h`

All periods after the first use the full `weeklyOrMonthlyHours`.

---

## 6. Ongoing Period Balance (Current Period)

The current period is **ongoing** when today falls within it. The balance reflects how the user is doing *so far* — future working days within the current period are not considered.

### Step 1 — Period target hours

Apply §5 if this is the first period; otherwise use full `weeklyOrMonthlyHours`.

### Step 2 — Daily rate

```
working_days_in_period = COUNT of days in [period_start, period_end]
                         that match the working day pattern
daily_rate_hours       = period_target_hours / working_days_in_period
```

The rate is fixed at the start of the period and does not change as time passes.

### Step 3 — Elapsed working days

```
elapsed_working_days = COUNT of days in [period_start, TODAY] (both inclusive)
                       that match the working day pattern
```

- If today matches the working day pattern, it is counted as a **full** elapsed working day.
- If today does not match the working day pattern, it is not counted.

### Step 4 — Expected hours so far

```
expected_hours = elapsed_working_days × daily_rate_hours
```

### Step 5 — Balance

```
tracked_hours    = SUM of time entries for this client in [period_start, today]
correction_hours = SUM of manual corrections whose date ∈ [period_start, today]
balance          = tracked_hours + correction_hours − expected_hours
```

### Worked example

> Target: 40 h/month. Working days: Mon + Wed.
> Current month has 4 Mondays and 4 Wednesdays → `working_days_in_period = 8`.
> `daily_rate_hours = 40 / 8 = 5 h`.
> 3 working days have elapsed → `expected_hours = 15 h`.
> Tracked so far: 13 h, no corrections.
> `balance = 13 − 15 = −2 h` (2 hours behind).

---

## 7. Manual Balance Corrections

| Field | Type | Constraints |
|---|---|---|
| `date` | `YYYY-MM-DD` | Must be ≥ `startDate`; not more than one period in the future |
| `hours` | signed float | Positive = extra credit (reduces deficit). Negative = reduces tracked credit |
| `description` | string | Optional, max 255 chars |

- The system automatically assigns a correction to the period that contains its `date`.
- Corrections in **completed periods** are included in the completed period formula (§4).
- Corrections in the **ongoing period** are included in the ongoing balance formula (§6).
- Corrections in a **future period** (not yet started) are stored and will be applied when that period becomes active.
- A correction whose `date` is before `startDate` is rejected with a validation error.

---

## 8. Edge Cases

| Scenario | Behaviour |
|---|---|
| `startDate` = 1st of month / Monday | No pro-ration; `period_target_hours = weeklyOrMonthlyHours` |
| `startDate` = last day of period | `remaining_days = 1`; target is heavily reduced (e.g. 1/31 × hours) |
| Working pattern has no matches in the partial first period | `elapsed_working_days = 0`; `expected_hours = 0`; balance = `tracked + corrections` |
| Current period has zero elapsed working days | `expected_hours = 0`; balance = `tracked + corrections` (cannot divide by zero — guard required) |
| `working_days_in_period = 0` | Impossible by validation (at least one day required), but system must guard: treat as `daily_rate_hours = 0` |
| Today is not a working day | `elapsed_working_days` does not include today |
| Correction date before `startDate` | Rejected with a validation error |
| Correction date in future period | Accepted and stored; applied when that period is ongoing or completed |
| User changes working days or period type | Must create a new target with a new `startDate`; old target history is frozen |
| Two periods with the same client exist (old soft-deleted, new active) | Only the active target's periods contribute to the displayed balance |
| A month with only partial working day coverage (e.g. all Mondays are public holidays) | No automatic holiday handling; user adds manual corrections to compensate |

---

## 9. Data Model Changes

### `ClientTarget` table — additions / changes

| Column | Change | Notes |
|---|---|---|
| `period_type` | **Add** | Enum: `WEEKLY`, `MONTHLY` |
| `working_days` | **Add** | Array/bitmask of day names: `MON TUE WED THU FRI SAT SUN` |
| `start_date` | **Modify** | Remove "must be Monday" validation constraint |
| `weekly_hours` | **Rename** | → `target_hours` (represents hours per week or per month depending on `period_type`) |

### `BalanceCorrection` table — no structural changes

Date-to-period assignment is computed at query time, not stored.

---

## 10. API Changes

### `ClientTargetWithBalance` response shape

```typescript
interface ClientTargetWithBalance {
  id: string
  clientId: string
  clientName: string
  userId: string
  periodType: "weekly" | "monthly"
  targetHours: number                     // renamed from weeklyHours
  workingDays: string[]                   // e.g. ["MON", "WED"]
  startDate: string                       // YYYY-MM-DD
  createdAt: string
  updatedAt: string
  corrections: BalanceCorrection[]
  totalBalanceSeconds: number             // running total across all periods
  currentPeriodTrackedSeconds: number     // replaces currentWeekTrackedSeconds
  currentPeriodTargetSeconds: number      // replaces currentWeekTargetSeconds
  periods: PeriodBalance[]                // replaces weeks[]
}

interface PeriodBalance {
  periodStart: string                     // YYYY-MM-DD (Monday or 1st of month)
  periodEnd: string                       // YYYY-MM-DD (Sunday or last of month)
  targetHours: number                     // pro-rated for first period
  trackedSeconds: number
  correctionHours: number
  balanceSeconds: number
  isOngoing: boolean
  // only present when isOngoing = true
  dailyRateHours?: number
  workingDaysInPeriod?: number
  elapsedWorkingDays?: number
  expectedHours?: number
}
```

### Endpoint changes

| Method | Path | Change |
|---|---|---|
| `POST /client-targets` | Create | Accepts `periodType`, `workingDays`, `targetHours`; `startDate` unconstrained |
| `PUT /client-targets/:id` | Update | Accepts same new fields |
| `GET /client-targets` | List | Returns updated `ClientTargetWithBalance` shape |
| `POST /client-targets/:id/corrections` | Add correction | No change to signature |
| `DELETE /client-targets/:id/corrections/:corrId` | Delete correction | No change |

### Zod schema changes

- `CreateClientTargetSchema` / `UpdateClientTargetSchema`:
  - Add `periodType: z.enum(["weekly", "monthly"])`
  - Add `workingDays: z.array(z.enum(["MON","TUE","WED","THU","FRI","SAT","SUN"])).min(1)`
  - Rename `weeklyHours` → `targetHours`
  - Remove Monday-only regex constraint from `startDate`

---

## 11. Frontend Changes

### Types (`frontend/src/types/index.ts`)
- `ClientTargetWithBalance` — add `periodType`, `workingDays`, `targetHours`; replace `weeks` → `periods: PeriodBalance[]`; replace `currentWeek*` → `currentPeriod*`
- Add `PeriodBalance` interface
- `CreateClientTargetInput` / `UpdateClientTargetInput` — same field additions

### Hook (`frontend/src/hooks/useClientTargets.ts`)
- No structural changes; mutations pass through new fields

### API client (`frontend/src/api/clientTargets.ts`)
- No structural changes; payload shapes updated

### `ClientsPage` — `ClientTargetPanel`
- Working day selector (checkboxes: Mon–Sun, at least one required)
- Period type selector (Weekly / Monthly)
- Label for hours input updates dynamically: "Hours/week" or "Hours/month"
- Start date picker: free date input (no week-picker)
- Balance display: label changes from "this week" to "this week" or "this month" based on `periodType`
- Expanded period list replaces the expanded week list

### `DashboardPage`
- "Weekly Targets" widget renamed to "Targets"
- "This week" label becomes "This week" / "This month" dynamically
- `currentWeek*` fields replaced with `currentPeriod*`
