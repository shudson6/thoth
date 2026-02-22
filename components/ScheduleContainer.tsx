"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

type Props = Readonly<{
  visibleHours: number;
  children: (rowHeight: number) => React.ReactNode;
}>;

export default function ScheduleContainer({ visibleHours, children }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rowHeight, setRowHeight] = useState(0);
  const didScroll = useRef(false);
  const pendingScrollRatio = useRef<number | null>(null);

  useEffect(() => {
    function updateRowHeight() {
      if (containerRef.current) {
        const h = containerRef.current.clientHeight / visibleHours;
        if (h > 0) {
          if (rowHeight > 0) {
            pendingScrollRatio.current = containerRef.current.scrollTop / (rowHeight * 24);
          }
          setRowHeight(h);
        }
      }
    }
    updateRowHeight();
    globalThis.addEventListener("resize", updateRowHeight);
    return () => globalThis.removeEventListener("resize", updateRowHeight);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleHours]);

  useLayoutEffect(() => {
    if (pendingScrollRatio.current !== null && containerRef.current && rowHeight > 0) {
      containerRef.current.scrollTop = pendingScrollRatio.current * rowHeight * 24;
      pendingScrollRatio.current = null;
    }
  }, [rowHeight]);

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
