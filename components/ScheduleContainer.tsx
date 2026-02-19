"use client";

import { useEffect, useRef, useState } from "react";

const VISIBLE_HOURS = 16;

type Props = {
  children: (rowHeight: number) => React.ReactNode;
};

export default function ScheduleContainer({ children }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rowHeight, setRowHeight] = useState(0);
  const didScroll = useRef(false);

  useEffect(() => {
    function updateRowHeight() {
      if (containerRef.current) {
        const h = containerRef.current.clientHeight / VISIBLE_HOURS;
        if (h > 0) setRowHeight(h);
      }
    }
    updateRowHeight();
    window.addEventListener("resize", updateRowHeight);
    return () => window.removeEventListener("resize", updateRowHeight);
  }, []);

  useEffect(() => {
    if (rowHeight > 0 && containerRef.current && !didScroll.current) {
      containerRef.current.scrollTop = rowHeight * 6;
      didScroll.current = true;
    }
  }, [rowHeight]);

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto">
      {rowHeight > 0 && (
        <div className="flex" style={{ height: rowHeight * 24 }}>
          {children(rowHeight)}
        </div>
      )}
    </div>
  );
}
