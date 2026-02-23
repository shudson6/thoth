import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RecurrencePicker from "@/components/RecurrencePicker";

// Anchor dates with known weekdays (same anchors as recurrence.test.ts):
// 2024-01-01 = Monday
// 2024-01-07 = Sunday
// 2024-01-06 = Saturday
// 2024-01-15 = day 15 of month

describe("RecurrencePicker", () => {
  describe("option labels", () => {
    it("always shows None, Daily, Weekdays as first three options", () => {
      render(<RecurrencePicker value={null} anchorDate="2024-01-01" onChange={vi.fn()} />);
      const options = screen.getAllByRole("option");
      expect(options[0]).toHaveTextContent("None");
      expect(options[1]).toHaveTextContent("Daily");
      expect(options[2]).toHaveTextContent("Weekdays");
    });

    it("shows correct weekday name — Monday anchor", () => {
      render(<RecurrencePicker value={null} anchorDate="2024-01-01" onChange={vi.fn()} />);
      expect(screen.getByRole("option", { name: "Weekly on Monday" })).toBeInTheDocument();
    });

    it("shows correct weekday name — Sunday anchor", () => {
      render(<RecurrencePicker value={null} anchorDate="2024-01-07" onChange={vi.fn()} />);
      expect(screen.getByRole("option", { name: "Weekly on Sunday" })).toBeInTheDocument();
    });

    it("shows correct weekday name — Saturday anchor", () => {
      render(<RecurrencePicker value={null} anchorDate="2024-01-06" onChange={vi.fn()} />);
      expect(screen.getByRole("option", { name: "Weekly on Saturday" })).toBeInTheDocument();
    });

    it("shows correct day-of-month ordinal — 1st", () => {
      render(<RecurrencePicker value={null} anchorDate="2024-01-01" onChange={vi.fn()} />);
      expect(screen.getByRole("option", { name: "Monthly on the 1st" })).toBeInTheDocument();
    });

    it("shows correct day-of-month ordinal — 15th", () => {
      render(<RecurrencePicker value={null} anchorDate="2024-01-15" onChange={vi.fn()} />);
      expect(screen.getByRole("option", { name: "Monthly on the 15th" })).toBeInTheDocument();
    });

    it("shows correct day-of-month ordinal — 21st", () => {
      render(<RecurrencePicker value={null} anchorDate="2024-01-21" onChange={vi.fn()} />);
      expect(screen.getByRole("option", { name: "Monthly on the 21st" })).toBeInTheDocument();
    });

    it("shows correct day-of-month ordinal — 22nd", () => {
      render(<RecurrencePicker value={null} anchorDate="2024-01-22" onChange={vi.fn()} />);
      expect(screen.getByRole("option", { name: "Monthly on the 22nd" })).toBeInTheDocument();
    });

    it("shows correct day-of-month ordinal — 23rd", () => {
      render(<RecurrencePicker value={null} anchorDate="2024-01-23" onChange={vi.fn()} />);
      expect(screen.getByRole("option", { name: "Monthly on the 23rd" })).toBeInTheDocument();
    });

    it("always renders exactly 5 options", () => {
      render(<RecurrencePicker value={null} anchorDate="2024-01-01" onChange={vi.fn()} />);
      expect(screen.getAllByRole("option")).toHaveLength(5);
    });
  });

  describe("selected value", () => {
    it("selects None when value is null", () => {
      render(<RecurrencePicker value={null} anchorDate="2024-01-01" onChange={vi.fn()} />);
      expect(screen.getByRole("combobox")).toHaveValue("");
    });

    it("selects Daily option when value matches FREQ=DAILY", () => {
      render(<RecurrencePicker value="FREQ=DAILY" anchorDate="2024-01-01" onChange={vi.fn()} />);
      expect(screen.getByRole("combobox")).toHaveValue("FREQ=DAILY");
    });

    it("selects Weekdays option when value matches weekday rule", () => {
      render(
        <RecurrencePicker
          value="FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR"
          anchorDate="2024-01-01"
          onChange={vi.fn()}
        />
      );
      expect(screen.getByRole("combobox")).toHaveValue("FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR");
    });

    it("selects weekly option when value matches weekly rule", () => {
      render(<RecurrencePicker value="FREQ=WEEKLY;BYDAY=MO" anchorDate="2024-01-01" onChange={vi.fn()} />);
      expect(screen.getByRole("combobox")).toHaveValue("FREQ=WEEKLY;BYDAY=MO");
    });

    it("selects monthly option when value matches monthly rule", () => {
      render(
        <RecurrencePicker value="FREQ=MONTHLY;BYMONTHDAY=15" anchorDate="2024-01-15" onChange={vi.fn()} />
      );
      expect(screen.getByRole("combobox")).toHaveValue("FREQ=MONTHLY;BYMONTHDAY=15");
    });
  });

  describe("onChange callbacks", () => {
    it("calls onChange with null when None is selected", async () => {
      const handleChange = vi.fn();
      render(
        <RecurrencePicker value="FREQ=DAILY" anchorDate="2024-01-01" onChange={handleChange} />
      );
      await userEvent.selectOptions(screen.getByRole("combobox"), "");
      expect(handleChange).toHaveBeenCalledWith(null);
    });

    it("calls onChange with FREQ=DAILY when Daily is selected", async () => {
      const handleChange = vi.fn();
      render(<RecurrencePicker value={null} anchorDate="2024-01-01" onChange={handleChange} />);
      await userEvent.selectOptions(screen.getByRole("combobox"), "FREQ=DAILY");
      expect(handleChange).toHaveBeenCalledWith("FREQ=DAILY");
    });

    it("calls onChange with weekdays rule when Weekdays is selected", async () => {
      const handleChange = vi.fn();
      render(<RecurrencePicker value={null} anchorDate="2024-01-01" onChange={handleChange} />);
      await userEvent.selectOptions(
        screen.getByRole("combobox"),
        "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR"
      );
      expect(handleChange).toHaveBeenCalledWith("FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR");
    });

    it("calls onChange with weekly rule when Weekly option is selected", async () => {
      const handleChange = vi.fn();
      render(<RecurrencePicker value={null} anchorDate="2024-01-01" onChange={handleChange} />);
      await userEvent.selectOptions(screen.getByRole("combobox"), "FREQ=WEEKLY;BYDAY=MO");
      expect(handleChange).toHaveBeenCalledWith("FREQ=WEEKLY;BYDAY=MO");
    });

    it("calls onChange with monthly rule when Monthly option is selected", async () => {
      const handleChange = vi.fn();
      render(<RecurrencePicker value={null} anchorDate="2024-01-15" onChange={handleChange} />);
      await userEvent.selectOptions(
        screen.getByRole("combobox"),
        "FREQ=MONTHLY;BYMONTHDAY=15"
      );
      expect(handleChange).toHaveBeenCalledWith("FREQ=MONTHLY;BYMONTHDAY=15");
    });
  });
});
