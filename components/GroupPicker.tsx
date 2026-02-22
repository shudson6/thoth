"use client";

import { useState, useRef, useEffect } from "react";
import { Group } from "@/types/task";

const COLOR_PRESETS = [
  { name: "Blue", hex: "#3b82f6" },
  { name: "Green", hex: "#22c55e" },
  { name: "Amber", hex: "#f59e0b" },
  { name: "Red", hex: "#ef4444" },
  { name: "Purple", hex: "#a855f7" },
  { name: "Pink", hex: "#ec4899" },
];

type Props = Readonly<{
  groups: Group[];
  selectedGroupId?: string | null;
  onChange: (groupId: string | null) => void;
  onCreateGroup: (name: string, color: string) => void;
}>;

export default function GroupPicker({ groups, selectedGroupId, onChange, onCreateGroup }: Props) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(COLOR_PRESETS[0].hex);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setCreating(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const selected = groups.find((g) => g.id === selectedGroupId);

  function handleCreateSubmit() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    onCreateGroup(trimmed, newColor);
    setNewName("");
    setNewColor(COLOR_PRESETS[0].hex);
    setCreating(false);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-md border border-zinc-300 dark:border-zinc-600 bg-transparent px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-full text-left"
      >
        {selected ? (
          <>
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: selected.color }} />
            <span className="text-zinc-800 dark:text-zinc-200 truncate">{selected.name}</span>
          </>
        ) : (
          <span className="text-zinc-400">No group</span>
        )}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 ml-auto text-zinc-400 shrink-0">
          <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg py-1 max-h-48 overflow-y-auto">
          <button
            type="button"
            onClick={() => { onChange(null); setOpen(false); }}
            className="w-full px-3 py-1.5 text-left text-sm text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
          >
            No group
          </button>

          {groups.map((g) => (
            <button
              type="button"
              key={g.id}
              onClick={() => { onChange(g.id); setOpen(false); }}
              className={`w-full px-3 py-1.5 text-left text-sm flex items-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 ${
                g.id === selectedGroupId ? "bg-zinc-50 dark:bg-zinc-800" : ""
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: g.color }} />
              <span className="text-zinc-800 dark:text-zinc-200 truncate">{g.name}</span>
            </button>
          ))}

          {creating ? (
            <div className="px-3 py-2 border-t border-zinc-100 dark:border-zinc-800 mt-1 space-y-2">
              <input
                autoFocus
                type="text"
                placeholder="Group name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleCreateSubmit(); }}
                className="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-transparent px-2 py-1 text-sm outline-none focus:border-blue-500"
              />
              <div className="flex items-center gap-1.5">
                {COLOR_PRESETS.map((c) => (
                  <button
                    type="button"
                    key={c.hex}
                    onClick={() => setNewColor(c.hex)}
                    className={`w-5 h-5 rounded-full border-2 transition-colors ${
                      newColor === c.hex ? "border-zinc-800 dark:border-zinc-200" : "border-transparent"
                    }`}
                    style={{ backgroundColor: c.hex }}
                    title={c.name}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCreateSubmit}
                  className="text-xs font-medium text-white bg-blue-500 rounded px-2 py-1 hover:bg-blue-600 transition-colors"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => { setCreating(false); setNewName(""); }}
                  className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="w-full px-3 py-1.5 text-left text-sm text-blue-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-medium border-t border-zinc-100 dark:border-zinc-800 mt-1"
            >
              + New group
            </button>
          )}
        </div>
      )}
    </div>
  );
}
