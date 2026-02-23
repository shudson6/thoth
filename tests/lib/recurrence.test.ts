import { describe, it, expect } from "vitest";
import { buildRRule, occursOnDate, expandForDate, describeRRule } from "@/lib/recurrence";
import type { Task } from "@/types/task";

// Anchor dates with known weekdays (verified UTC):
// 2024-01-01 = Monday
// 2024-01-02 = Tuesday
// 2024-01-03 = Wednesday
// 2024-01-04 = Thursday
// 2024-01-05 = Friday
// 2024-01-06 = Saturday
// 2024-01-07 = Sunday

function task(overrides: Partial<Task> & Pick<Task, "id" | "title">): Task {
  return { completed: false, ...overrides };
}

// ---------------------------------------------------------------------------
// buildRRule
// ---------------------------------------------------------------------------

describe("buildRRule", () => {
  describe("daily", () => {
    it("returns FREQ=DAILY regardless of anchor", () => {
      expect(buildRRule("daily", "2024-01-01")).toBe("FREQ=DAILY");
      expect(buildRRule("daily", "2024-06-15")).toBe("FREQ=DAILY");
    });
  });

  describe("weekdays", () => {
    it("returns the weekdays rule regardless of anchor", () => {
      expect(buildRRule("weekdays", "2024-01-01")).toBe("FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR");
    });
  });

  describe("weekly", () => {
    it("uses Monday for a Monday anchor", () => expect(buildRRule("weekly", "2024-01-01")).toBe("FREQ=WEEKLY;BYDAY=MO"));
    it("uses Tuesday for a Tuesday anchor", () => expect(buildRRule("weekly", "2024-01-02")).toBe("FREQ=WEEKLY;BYDAY=TU"));
    it("uses Wednesday for a Wednesday anchor", () => expect(buildRRule("weekly", "2024-01-03")).toBe("FREQ=WEEKLY;BYDAY=WE"));
    it("uses Thursday for a Thursday anchor", () => expect(buildRRule("weekly", "2024-01-04")).toBe("FREQ=WEEKLY;BYDAY=TH"));
    it("uses Friday for a Friday anchor", () => expect(buildRRule("weekly", "2024-01-05")).toBe("FREQ=WEEKLY;BYDAY=FR"));
    it("uses Saturday for a Saturday anchor", () => expect(buildRRule("weekly", "2024-01-06")).toBe("FREQ=WEEKLY;BYDAY=SA"));
    it("uses Sunday for a Sunday anchor", () => expect(buildRRule("weekly", "2024-01-07")).toBe("FREQ=WEEKLY;BYDAY=SU"));
  });

  describe("monthly", () => {
    it("uses the day-of-month from the anchor", () => {
      expect(buildRRule("monthly", "2024-01-01")).toBe("FREQ=MONTHLY;BYMONTHDAY=1");
      expect(buildRRule("monthly", "2024-01-15")).toBe("FREQ=MONTHLY;BYMONTHDAY=15");
      expect(buildRRule("monthly", "2024-01-31")).toBe("FREQ=MONTHLY;BYMONTHDAY=31");
    });
  });
});

// ---------------------------------------------------------------------------
// occursOnDate
// ---------------------------------------------------------------------------

describe("occursOnDate", () => {
  it("returns false when the task has no recurrenceRule", () => {
    const t = task({ id: "1", title: "t", scheduledDate: "2024-01-01" });
    expect(occursOnDate(t, "2024-01-01")).toBe(false);
  });

  it("returns false when the task has no scheduledDate", () => {
    const t = task({ id: "1", title: "t", recurrenceRule: "FREQ=DAILY" });
    expect(occursOnDate(t, "2024-01-01")).toBe(false);
  });

  describe("daily rule", () => {
    const master = task({
      id: "1", title: "t",
      scheduledDate: "2024-01-01",
      recurrenceRule: "FREQ=DAILY",
    });

    it("occurs on the start date", () => expect(occursOnDate(master, "2024-01-01")).toBe(true));
    it("occurs the next day", () => expect(occursOnDate(master, "2024-01-02")).toBe(true));
    it("occurs a week later", () => expect(occursOnDate(master, "2024-01-08")).toBe(true));
    it("does not occur before the start date", () => expect(occursOnDate(master, "2023-12-31")).toBe(false));
  });

  describe("weekly rule (Mondays)", () => {
    const master = task({
      id: "1", title: "t",
      scheduledDate: "2024-01-01", // Monday
      recurrenceRule: "FREQ=WEEKLY;BYDAY=MO",
    });

    it("occurs on the start Monday", () => expect(occursOnDate(master, "2024-01-01")).toBe(true));
    it("occurs on the next Monday", () => expect(occursOnDate(master, "2024-01-08")).toBe(true));
    it("does not occur on Tuesday", () => expect(occursOnDate(master, "2024-01-02")).toBe(false));
    it("does not occur on Sunday", () => expect(occursOnDate(master, "2024-01-07")).toBe(false));
    it("does not occur before dtstart", () => expect(occursOnDate(master, "2023-12-25")).toBe(false));
  });

  describe("weekdays rule", () => {
    const master = task({
      id: "1", title: "t",
      scheduledDate: "2024-01-01", // Monday
      recurrenceRule: "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR",
    });

    it("occurs on Monday", () => expect(occursOnDate(master, "2024-01-01")).toBe(true));
    it("occurs on Friday", () => expect(occursOnDate(master, "2024-01-05")).toBe(true));
    it("does not occur on Saturday", () => expect(occursOnDate(master, "2024-01-06")).toBe(false));
    it("does not occur on Sunday", () => expect(occursOnDate(master, "2024-01-07")).toBe(false));
  });

  describe("monthly rule", () => {
    const master = task({
      id: "1", title: "t",
      scheduledDate: "2024-01-15",
      recurrenceRule: "FREQ=MONTHLY;BYMONTHDAY=15",
    });

    it("occurs on the 15th of the same month", () => expect(occursOnDate(master, "2024-01-15")).toBe(true));
    it("occurs on the 15th of a later month", () => expect(occursOnDate(master, "2024-03-15")).toBe(true));
    it("does not occur on a different day", () => expect(occursOnDate(master, "2024-01-16")).toBe(false));
    it("does not occur on the 14th", () => expect(occursOnDate(master, "2024-01-14")).toBe(false));
  });
});

// ---------------------------------------------------------------------------
// expandForDate
// ---------------------------------------------------------------------------

describe("expandForDate", () => {
  const date = "2024-01-01"; // Monday

  describe("regular tasks", () => {
    it("passes through a regular task unchanged", () => {
      const t = task({ id: "1", title: "regular" });
      expect(expandForDate([t], date)).toEqual([t]);
    });

    it("passes through a scheduled task unchanged", () => {
      const t = task({ id: "1", title: "regular", scheduledDate: date });
      expect(expandForDate([t], date)).toEqual([t]);
    });

    it("passes through multiple regular tasks", () => {
      const tasks = [
        task({ id: "1", title: "a" }),
        task({ id: "2", title: "b" }),
      ];
      expect(expandForDate(tasks, date)).toEqual(tasks);
    });
  });

  describe("master with occurrence on date", () => {
    const master = task({
      id: "m1", title: "daily",
      scheduledDate: date,
      recurrenceRule: "FREQ=DAILY",
    });

    it("emits a virtual instance instead of the master", () => {
      const result = expandForDate([master], date);
      expect(result).toHaveLength(1);
      expect(result[0].isVirtualRecurrence).toBe(true);
    });

    it("sets scheduledDate to the target date on the virtual instance", () => {
      const result = expandForDate([master], "2024-01-05");
      expect(result[0].scheduledDate).toBe("2024-01-05");
    });

    it("resets completed to false on the virtual instance", () => {
      const completedMaster = { ...master, completed: true };
      const result = expandForDate([completedMaster], date);
      expect(result[0].completed).toBe(false);
    });

    it("inherits other master properties on the virtual instance", () => {
      const rich = { ...master, title: "rich task", points: 5, groupId: "g1" };
      const result = expandForDate([rich], date);
      expect(result[0].title).toBe("rich task");
      expect(result[0].points).toBe(5);
      expect(result[0].groupId).toBe("g1");
    });
  });

  describe("master with no occurrence on date", () => {
    const master = task({
      id: "m1", title: "weekly monday",
      scheduledDate: "2024-01-01", // Monday
      recurrenceRule: "FREQ=WEEKLY;BYDAY=MO",
    });

    it("omits the master when there is no occurrence", () => {
      expect(expandForDate([master], "2024-01-02")).toHaveLength(0); // Tuesday
    });

    it("emits a virtual instance on a matching day", () => {
      expect(expandForDate([master], "2024-01-08")).toHaveLength(1); // next Monday
    });
  });

  describe("master with a non-cancelled exception", () => {
    const master = task({
      id: "m1", title: "master",
      scheduledDate: date,
      recurrenceRule: "FREQ=DAILY",
    });
    const exception = task({
      id: "e1", title: "exception",
      recurringParentId: "m1",
      originalDate: date,
      scheduledDate: date,
    });

    it("emits the exception row instead of a virtual instance", () => {
      const result = expandForDate([master, exception], date);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("e1");
      expect(result[0].isVirtualRecurrence).toBeUndefined();
    });
  });

  describe("master with a cancelled exception", () => {
    const master = task({
      id: "m1", title: "master",
      scheduledDate: date,
      recurrenceRule: "FREQ=DAILY",
    });
    const cancelled = task({
      id: "c1", title: "",
      recurringParentId: "m1",
      originalDate: date,
      cancelled: true,
    });

    it("omits the occurrence entirely", () => {
      expect(expandForDate([master, cancelled], date)).toHaveLength(0);
    });
  });

  describe("exception rows are never emitted directly", () => {
    it("does not include bare exception rows in output", () => {
      const exception = task({
        id: "e1", title: "orphan exception",
        recurringParentId: "m1",
        originalDate: date,
        scheduledDate: date,
      });
      // No master in the list — exception should not appear
      expect(expandForDate([exception], date)).toHaveLength(0);
    });
  });

  describe("mixed task list", () => {
    it("handles regular, master, and exception together", () => {
      const regular = task({ id: "r1", title: "regular" });
      const master = task({
        id: "m1", title: "master",
        scheduledDate: date,
        recurrenceRule: "FREQ=DAILY",
      });
      const exception = task({
        id: "e1", title: "exception",
        recurringParentId: "m1",
        originalDate: date,
        scheduledDate: date,
      });

      const result = expandForDate([regular, master, exception], date);
      expect(result).toHaveLength(2);
      expect(result.map((t) => t.id)).toContain("r1");
      expect(result.map((t) => t.id)).toContain("e1");
    });
  });
});

// ---------------------------------------------------------------------------
// describeRRule
// ---------------------------------------------------------------------------

describe("describeRRule", () => {
  it("describes daily", () => expect(describeRRule("FREQ=DAILY")).toBe("Daily"));
  it("is case-insensitive", () => expect(describeRRule("freq=daily")).toBe("Daily"));
  it("describes weekdays", () => expect(describeRRule("FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR")).toBe("Weekdays"));

  describe("weekly on a named day", () => {
    it("Sunday", () => expect(describeRRule("FREQ=WEEKLY;BYDAY=SU")).toBe("Weekly on Sunday"));
    it("Monday", () => expect(describeRRule("FREQ=WEEKLY;BYDAY=MO")).toBe("Weekly on Monday"));
    it("Tuesday", () => expect(describeRRule("FREQ=WEEKLY;BYDAY=TU")).toBe("Weekly on Tuesday"));
    it("Wednesday", () => expect(describeRRule("FREQ=WEEKLY;BYDAY=WE")).toBe("Weekly on Wednesday"));
    it("Thursday", () => expect(describeRRule("FREQ=WEEKLY;BYDAY=TH")).toBe("Weekly on Thursday"));
    it("Friday", () => expect(describeRRule("FREQ=WEEKLY;BYDAY=FR")).toBe("Weekly on Friday"));
    it("Saturday", () => expect(describeRRule("FREQ=WEEKLY;BYDAY=SA")).toBe("Weekly on Saturday"));
  });

  describe("monthly ordinals", () => {
    // -th suffix (4–20, and 24–30)
    it("4th", () => expect(describeRRule("FREQ=MONTHLY;BYMONTHDAY=4")).toBe("Monthly on the 4th"));
    it("11th — teens always use th", () => expect(describeRRule("FREQ=MONTHLY;BYMONTHDAY=11")).toBe("Monthly on the 11th"));
    it("12th", () => expect(describeRRule("FREQ=MONTHLY;BYMONTHDAY=12")).toBe("Monthly on the 12th"));
    it("13th", () => expect(describeRRule("FREQ=MONTHLY;BYMONTHDAY=13")).toBe("Monthly on the 13th"));
    it("20th", () => expect(describeRRule("FREQ=MONTHLY;BYMONTHDAY=20")).toBe("Monthly on the 20th"));
    // -st suffix
    it("1st", () => expect(describeRRule("FREQ=MONTHLY;BYMONTHDAY=1")).toBe("Monthly on the 1st"));
    it("21st", () => expect(describeRRule("FREQ=MONTHLY;BYMONTHDAY=21")).toBe("Monthly on the 21st"));
    it("31st", () => expect(describeRRule("FREQ=MONTHLY;BYMONTHDAY=31")).toBe("Monthly on the 31st"));
    // -nd suffix
    it("2nd", () => expect(describeRRule("FREQ=MONTHLY;BYMONTHDAY=2")).toBe("Monthly on the 2nd"));
    it("22nd", () => expect(describeRRule("FREQ=MONTHLY;BYMONTHDAY=22")).toBe("Monthly on the 22nd"));
    // -rd suffix
    it("3rd", () => expect(describeRRule("FREQ=MONTHLY;BYMONTHDAY=3")).toBe("Monthly on the 3rd"));
    it("23rd", () => expect(describeRRule("FREQ=MONTHLY;BYMONTHDAY=23")).toBe("Monthly on the 23rd"));
  });

  it("returns Custom for an unrecognised rule", () => {
    expect(describeRRule("FREQ=YEARLY")).toBe("Custom");
  });
});
