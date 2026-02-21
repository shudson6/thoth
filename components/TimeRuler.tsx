"use client";

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function formatHour(h: number): string {
  const suffix = h >= 12 ? "PM" : "AM";
  const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${display} ${suffix}`;
}

export default function TimeRuler({ rowHeight }: Readonly<{ rowHeight: number }>) {
  return (
    <div className="w-16 shrink-0 relative select-none" style={{ height: rowHeight * 24 }}>
      {HOURS.map((h) => (
        <div
          key={h}
          className="absolute left-0 right-0 flex items-start"
          style={{ top: h * rowHeight, height: rowHeight }}
        >
          <span className="text-xs text-zinc-400 dark:text-zinc-500 pt-1 pl-3">
            {formatHour(h)}
          </span>
        </div>
      ))}
    </div>
  );
}
