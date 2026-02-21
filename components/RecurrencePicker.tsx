"use client";

import { buildRRule } from "@/lib/recurrence";

type Props = Readonly<{
  value: string | null;
  anchorDate: string;
  onChange: (rule: string | null) => void;
}>;

const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

export default function RecurrencePicker({ value, anchorDate, onChange }: Props) {
  const d = new Date(anchorDate + "T00:00:00");
  const weekdayName = WEEKDAY_NAMES[d.getDay()];
  const dayOfMonth = d.getDate();

  const options: { label: string; rule: string | null }[] = [
    { label: "None", rule: null },
    { label: "Daily", rule: buildRRule("daily", anchorDate) },
    { label: "Weekdays", rule: buildRRule("weekdays", anchorDate) },
    { label: `Weekly on ${weekdayName}`, rule: buildRRule("weekly", anchorDate) },
    { label: `Monthly on the ${ordinal(dayOfMonth)}`, rule: buildRRule("monthly", anchorDate) },
  ];

  const currentValue = value ?? "";

  return (
    <select
      value={currentValue}
      onChange={(e) => onChange(e.target.value || null)}
      className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      {options.map((opt) => (
        <option key={opt.label} value={opt.rule ?? ""}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
