import { RRule } from "rrule";
import { Task } from "@/types/task";

// RRule weekday constants indexed by JS getUTCDay() (0=Sun … 6=Sat)
const RRULE_WEEKDAYS = [
  RRule.SU, RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR, RRule.SA,
];

const WEEKDAY_NAMES = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

/** Parse "YYYY-MM-DD" into a UTC midnight Date. */
function utcDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/**
 * Build an RRULE string from a simple repeat option.
 * `anchorDate` ("YYYY-MM-DD") is used to derive the weekday / day-of-month.
 */
export function buildRRule(
  frequency: "daily" | "weekdays" | "weekly" | "monthly",
  anchorDate: string
): string {
  const d = utcDate(anchorDate);
  switch (frequency) {
    case "daily":
      return "FREQ=DAILY";
    case "weekdays":
      return "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR";
    case "weekly": {
      const day = RRULE_WEEKDAYS[d.getUTCDay()].toString(); // "MO", "TU", etc.
      return `FREQ=WEEKLY;BYDAY=${day}`;
    }
    case "monthly":
      return `FREQ=MONTHLY;BYMONTHDAY=${d.getUTCDate()}`;
  }
}

/**
 * Returns true if the master task's RRULE generates an occurrence on `date`.
 * Both `master.scheduledDate` and `date` are "YYYY-MM-DD".
 */
export function occursOnDate(master: Task, date: string): boolean {
  if (!master.recurrenceRule || !master.scheduledDate) return false;

  const dtstart = utcDate(master.scheduledDate);
  const rule = new RRule({
    ...RRule.parseString(master.recurrenceRule),
    dtstart,
  });

  const dayStart = utcDate(date);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const occurrences = rule.between(dayStart, dayEnd, true);
  return occurrences.length > 0;
}

/**
 * Given the full flat task list and a target date, return the task list that
 * SchedulePane should receive: regular tasks pass through unchanged; master
 * recurring tasks are replaced by virtual instances or their exception rows.
 *
 * - Regular tasks (no recurrenceRule, no recurringParentId): passed through.
 * - Master tasks (have recurrenceRule):
 *     - No occurrence on date → omitted.
 *     - Cancelled exception exists → omitted.
 *     - Non-cancelled exception exists → the exception row is emitted.
 *     - No exception → a virtual instance is emitted (master spread +
 *       scheduledDate=date, isVirtualRecurrence=true).
 * - Exception rows and cancelled rows are never emitted directly.
 */
export function expandForDate(tasks: Task[], date: string): Task[] {
  const masters = tasks.filter((t) => t.recurrenceRule);
  const exceptions = tasks.filter((t) => t.recurringParentId);
  const regular = tasks.filter((t) => !t.recurrenceRule && !t.recurringParentId);

  const result: Task[] = [...regular];

  for (const master of masters) {
    if (!occursOnDate(master, date)) continue;

    const exception = exceptions.find(
      (e) => e.recurringParentId === master.id && e.originalDate === date
    );

    if (exception) {
      if (!exception.cancelled) result.push(exception);
    } else {
      result.push({
        ...master,
        scheduledDate: date,
        isVirtualRecurrence: true,
        completed: false,
      });
    }
  }

  return result;
}

/**
 * Human-readable label for a stored RRULE string.
 */
export function describeRRule(rule: string): string {
  const upper = rule.toUpperCase();
  if (upper === "FREQ=DAILY") return "Daily";
  if (upper === "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR") return "Weekdays";
  if (upper.startsWith("FREQ=WEEKLY;BYDAY=")) {
    const dayCode = upper.replace("FREQ=WEEKLY;BYDAY=", "").trim();
    const dayIndex = ["SU","MO","TU","WE","TH","FR","SA"].indexOf(dayCode);
    const name = dayIndex >= 0 ? WEEKDAY_NAMES[dayIndex] : dayCode;
    return `Weekly on ${name}`;
  }
  if (upper.startsWith("FREQ=MONTHLY;BYMONTHDAY=")) {
    const n = parseInt(upper.replace("FREQ=MONTHLY;BYMONTHDAY=", ""), 10);
    return `Monthly on the ${ordinal(n)}`;
  }
  return "Custom";
}
