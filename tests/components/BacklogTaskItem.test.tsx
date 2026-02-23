import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BacklogTaskItem from "@/components/BacklogTaskItem";
import type { Task } from "@/types/task";
import { minutesToTime } from "@/lib/time";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTask(overrides: Partial<Task> = {}): Task {
  return { id: "t1", title: "Test task", completed: false, ...overrides };
}

type Callbacks = {
  onSchedule: ReturnType<typeof vi.fn>;
  onScheduleAllDay: ReturnType<typeof vi.fn>;
  onOpenDetail: ReturnType<typeof vi.fn>;
  onScheduleCopy: ReturnType<typeof vi.fn>;
  onScheduleAllDayCopy: ReturnType<typeof vi.fn>;
};

function setup(task: Task, cbOverrides?: Partial<Callbacks>) {
  const cbs: Callbacks = {
    onSchedule: vi.fn(),
    onScheduleAllDay: vi.fn(),
    onOpenDetail: vi.fn(),
    onScheduleCopy: vi.fn(),
    onScheduleAllDayCopy: vi.fn(),
    ...cbOverrides,
  };
  const user = userEvent.setup();
  render(<BacklogTaskItem task={task} {...cbs} />);
  return { user, ...cbs };
}

async function openPicker(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /schedule/i }));
}

// When the picker is open both the toggle trigger ("Schedule") and the submit
// button ("Schedule") are present. The submit button is always the last one.
function getSubmitButton() {
  const buttons = screen.getAllByRole("button", { name: /^schedule/i });
  return buttons[buttons.length - 1];
}

// ---------------------------------------------------------------------------
// Picker visibility
// ---------------------------------------------------------------------------

describe("picker visibility", () => {
  it("is hidden initially", () => {
    setup(makeTask());
    expect(screen.queryByRole("textbox")).toBeNull();
    // No date/time inputs visible
    expect(screen.queryByDisplayValue(/\d{4}-\d{2}-\d{2}/)).toBeNull();
  });

  it("shows the picker when Schedule is clicked", async () => {
    const { user } = setup(makeTask());
    await openPicker(user);
    expect(screen.getByDisplayValue("09:00")).toBeInTheDocument();
  });

  it("closes the picker after a successful submission", async () => {
    const { user } = setup(makeTask());
    await openPicker(user);
    await user.click(getSubmitButton());
    expect(screen.queryByDisplayValue("09:00")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Default field values
// ---------------------------------------------------------------------------

describe("default field values when picker opens", () => {
  it("start defaults to 09:00", async () => {
    const { user } = setup(makeTask());
    await openPicker(user);
    const timeInputs = screen.getAllByDisplayValue(/\d{2}:\d{2}/);
    expect(timeInputs[0]).toHaveValue("09:00");
  });

  it("end defaults to 10:00 (09:00 + 60 min) when no estimatedMinutes", async () => {
    const { user } = setup(makeTask());
    await openPicker(user);
    const timeInputs = screen.getAllByDisplayValue(/\d{2}:\d{2}/);
    expect(timeInputs[1]).toHaveValue("10:00");
  });

  it("end defaults to start + estimatedMinutes when estimatedMinutes is set", async () => {
    const { user } = setup(makeTask({ estimatedMinutes: 90 }));
    await openPicker(user);
    const expected = minutesToTime(9 * 60 + 90); // "10:30"
    const timeInputs = screen.getAllByDisplayValue(/\d{2}:\d{2}/);
    expect(timeInputs[1]).toHaveValue(expected);
  });

  it("date input defaults to today in YYYY-MM-DD format", async () => {
    const { user } = setup(makeTask());
    await openPicker(user);
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    expect(screen.getByDisplayValue(today)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Scheduling (non-copy) — argument order regression test
// ---------------------------------------------------------------------------

describe("scheduling (non-copy)", () => {
  it("calls onSchedule with (id, start, end, date) in that order", async () => {
    const { user, onSchedule } = setup(makeTask());
    await openPicker(user);

    // Set a specific date so the assertion is unambiguous
    const dateInput = screen.getByDisplayValue(/\d{4}-\d{2}-\d{2}/);
    await user.clear(dateInput);
    await user.type(dateInput, "2024-01-15");

    await user.click(getSubmitButton());

    expect(onSchedule).toHaveBeenCalledOnce();
    const [id, arg1, arg2, arg3] = onSchedule.mock.calls[0];
    expect(id).toBe("t1");
    // arg1 and arg2 are times (HH:MM), arg3 is the date
    expect(arg1).toMatch(/^\d{2}:\d{2}$/);
    expect(arg2).toMatch(/^\d{2}:\d{2}$/);
    expect(arg3).toBe("2024-01-15"); // date MUST be 4th, not 2nd
  });

  it("does not call onScheduleCopy when keepInBacklog is unchecked", async () => {
    const { user, onScheduleCopy } = setup(makeTask());
    await openPicker(user);
    await user.click(getSubmitButton());
    expect(onScheduleCopy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Copy scheduling — argument order regression test (the actual bug)
// ---------------------------------------------------------------------------

describe("copy scheduling", () => {
  it("calls onScheduleCopy with (id, start, end, date) in that order", async () => {
    const { user, onScheduleCopy } = setup(makeTask());
    await openPicker(user);

    // Set a specific date so the assertion is unambiguous
    const dateInput = screen.getByDisplayValue(/\d{4}-\d{2}-\d{2}/);
    await user.clear(dateInput);
    await user.type(dateInput, "2024-01-15");

    await user.click(screen.getByRole("checkbox", { name: /keep in backlog/i }));
    await user.click(screen.getByRole("button", { name: /schedule a copy/i }));

    expect(onScheduleCopy).toHaveBeenCalledOnce();
    const [id, arg1, arg2, arg3] = onScheduleCopy.mock.calls[0];
    expect(id).toBe("t1");
    // arg1 and arg2 must be times — if the bug is present, arg1 would be the date
    expect(arg1).toMatch(/^\d{2}:\d{2}$/);
    expect(arg2).toMatch(/^\d{2}:\d{2}$/);
    expect(arg3).toBe("2024-01-15"); // date MUST be 4th, not 2nd
  });

  it("does not call onSchedule when keepInBacklog is checked", async () => {
    const { user, onSchedule } = setup(makeTask());
    await openPicker(user);
    await user.click(screen.getByRole("checkbox", { name: /keep in backlog/i }));
    await user.click(screen.getByRole("button", { name: /schedule a copy/i }));
    expect(onSchedule).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// All-day scheduling
// ---------------------------------------------------------------------------

describe("all-day scheduling", () => {
  it("hides time inputs when All day is checked", async () => {
    const { user } = setup(makeTask());
    await openPicker(user);
    await user.click(screen.getByRole("checkbox", { name: /all day/i }));
    expect(screen.queryByDisplayValue("09:00")).toBeNull();
  });

  it("calls onScheduleAllDay with (id, date)", async () => {
    const { user, onScheduleAllDay } = setup(makeTask());
    await openPicker(user);

    const dateInput = screen.getByDisplayValue(/\d{4}-\d{2}-\d{2}/);
    await user.clear(dateInput);
    await user.type(dateInput, "2024-03-10");

    await user.click(screen.getByRole("checkbox", { name: /all day/i }));
    await user.click(getSubmitButton());

    expect(onScheduleAllDay).toHaveBeenCalledOnce();
    expect(onScheduleAllDay).toHaveBeenCalledWith("t1", "2024-03-10");
  });

  it("does not call onSchedule or onScheduleCopy for all-day", async () => {
    const { user, onSchedule, onScheduleCopy } = setup(makeTask());
    await openPicker(user);
    await user.click(screen.getByRole("checkbox", { name: /all day/i }));
    await user.click(getSubmitButton());
    expect(onSchedule).not.toHaveBeenCalled();
    expect(onScheduleCopy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// All-day copy
// ---------------------------------------------------------------------------

describe("all-day copy", () => {
  it("calls onScheduleAllDayCopy with (id, date) when both checkboxes are checked", async () => {
    const { user, onScheduleAllDayCopy } = setup(makeTask());
    await openPicker(user);

    const dateInput = screen.getByDisplayValue(/\d{4}-\d{2}-\d{2}/);
    await user.clear(dateInput);
    await user.type(dateInput, "2024-03-10");

    await user.click(screen.getByRole("checkbox", { name: /all day/i }));
    await user.click(screen.getByRole("checkbox", { name: /keep in backlog/i }));
    await user.click(screen.getByRole("button", { name: /schedule a copy/i }));

    expect(onScheduleAllDayCopy).toHaveBeenCalledOnce();
    expect(onScheduleAllDayCopy).toHaveBeenCalledWith("t1", "2024-03-10");
  });

  it("does not call onSchedule or onScheduleCopy for all-day copy", async () => {
    const { user, onSchedule, onScheduleCopy } = setup(makeTask());
    await openPicker(user);
    await user.click(screen.getByRole("checkbox", { name: /all day/i }));
    await user.click(screen.getByRole("checkbox", { name: /keep in backlog/i }));
    await user.click(screen.getByRole("button", { name: /schedule a copy/i }));
    expect(onSchedule).not.toHaveBeenCalled();
    expect(onScheduleCopy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Start-time change behaviour
// ---------------------------------------------------------------------------

describe("start-time change (no estimatedMinutes)", () => {
  it("shifts end by the same delta when start is advanced", async () => {
    const { user } = setup(makeTask());
    await openPicker(user);
    // Default: start=09:00, end=10:00. Advance start by 60 min to 10:00.
    // Use fireEvent.change to set the complete value atomically, avoiding
    // intermediate onChange calls with partial strings (e.g. "1", "10:") that
    // corrupt the end state via handleStartChange.
    const [startInput] = screen.getAllByDisplayValue(/\d{2}:\d{2}/);
    fireEvent.change(startInput, { target: { value: "10:00" } });
    expect(screen.getByDisplayValue("11:00")).toBeInTheDocument();
  });

  it("clamps end at 23:59 if the shift would overflow", async () => {
    const { user } = setup(makeTask());
    await openPicker(user);
    const [startInput] = screen.getAllByDisplayValue(/\d{2}:\d{2}/);
    fireEvent.change(startInput, { target: { value: "23:30" } });
    expect(screen.getByDisplayValue("23:59")).toBeInTheDocument();
  });
});

describe("start-time change (with estimatedMinutes)", () => {
  it("sets end to start + estimatedMinutes, ignoring the previous end", async () => {
    const { user } = setup(makeTask({ estimatedMinutes: 45 }));
    await openPicker(user);
    // Default: start=09:00, end=09:45. Change start to 11:00.
    const [startInput] = screen.getAllByDisplayValue(/\d{2}:\d{2}/);
    fireEvent.change(startInput, { target: { value: "11:00" } });
    const expected = minutesToTime(11 * 60 + 45); // "11:45"
    expect(screen.getByDisplayValue(expected)).toBeInTheDocument();
  });

  it("end time input is disabled when estimatedMinutes is set", async () => {
    const { user } = setup(makeTask({ estimatedMinutes: 30 }));
    await openPicker(user);
    const timeInputs = screen.getAllByDisplayValue(/\d{2}:\d{2}/);
    expect(timeInputs[1]).toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// Completed task guard
// ---------------------------------------------------------------------------

describe("completed task", () => {
  it("does not render the Schedule button for a completed task", () => {
    setup(makeTask({ completed: true }));
    expect(screen.queryByRole("button", { name: /schedule/i })).toBeNull();
  });
});
