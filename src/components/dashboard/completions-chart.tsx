"use client";

import { useState } from "react";
import type { MonthlyCompletions } from "@/lib/data/types";
import { chartAxis } from "@/lib/orders/stats";

const FULL_MONTH: Record<string, string> = {
  Jan: "January", Feb: "February", Mar: "March", Apr: "April",
  May: "May", Jun: "June", Jul: "July", Aug: "August",
  Sep: "September", Oct: "October", Nov: "November", Dec: "December",
};

export function CompletionsChart({ months }: { months: MonthlyCompletions[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const { top, ticks } = chartAxis(Math.max(...months.map((m) => m.count), 0));
  // Bars are measured against the axis top, not the tallest bar, or a bar would
  // not line up with the gridline its own value is printed beside.
  const barHeight = (count: number) => (count === 0 ? 3 : Math.max(3, (count / top) * 154));

  const currentMonth = months[months.length - 1];

  return (
    <div>
      <div className="flex gap-2.5">
        <div className="flex w-3.5 flex-col justify-between pb-5.5 text-right font-mono text-[10.5px] text-fg-faint">
          {ticks.map((t, i) => (
            <div key={i}>{t}</div>
          ))}
        </div>
        <div className="relative flex-1">
          <div className="absolute inset-x-0 top-0 bottom-5.5 flex flex-col justify-between">
            {ticks.map((_, i) => (
              <div key={i} className="h-px bg-chart-grid" />
            ))}
          </div>
          <div className="relative flex h-[154px] items-end gap-2">
            {months.map((m, i) => (
              <div
                key={m.month}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                className="relative flex h-full flex-1 flex-col items-center justify-end"
              >
                {hovered === i && (
                  <div className="absolute bottom-full z-10 mb-2 rounded-md bg-chart-tooltip-bg px-2.5 py-1.5 text-center whitespace-nowrap text-chart-tooltip-fg shadow-md">
                    <div className="font-mono text-[11.5px] tracking-wide opacity-70">
                      {FULL_MONTH[m.label] ?? m.label}
                    </div>
                    <div className="text-[13px] font-semibold">
                      {m.count} {m.count === 1 ? "article" : "articles"}
                    </div>
                  </div>
                )}
                <div
                  className="w-full max-w-[46px] rounded-t-[5px] bg-chart-bar transition-[background]"
                  style={{ height: `${barHeight(m.count)}px` }}
                />
              </div>
            ))}
          </div>
          <div className="flex h-5.5 items-center gap-2">
            {months.map((m) => (
              <div
                key={m.month}
                className="flex-1 text-center font-mono text-[11px] text-fg-faint"
              >
                {m.label}
              </div>
            ))}
          </div>
        </div>
      </div>
      {currentMonth && currentMonth.count === 0 && (
        <div className="mt-3.5 border-t border-border-subtle pt-3 text-xs text-fg-subtle">
          {FULL_MONTH[currentMonth.label] ?? currentMonth.label} is still in progress — nothing
          delivered yet this month.
        </div>
      )}
    </div>
  );
}
