"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface WinLossDonutProps {
  won: number;
  lost: number;
}

const WON_COLOR  = "#10c98b";
const LOST_COLOR = "#cc3f18";

export function WinLossDonut({ won, lost }: WinLossDonutProps) {
  const total   = won + lost;
  const hasData = total > 0;
  const winRate = hasData ? Math.round((won / total) * 100) : 0;

  const SIZE   = 160;
  const CX     = SIZE / 2;
  const CY     = SIZE / 2;
  const R      = 60;
  const STROKE = 14;
  const CIRCUM = 2 * Math.PI * R;
  const GAP    = STROKE * 1.25;

  const wonFill  = hasData ? (winRate / 100) * CIRCUM - GAP : 0;
  const lostFill = hasData ? ((100 - winRate) / 100) * CIRCUM - GAP : 0;
  const lostOffset = -(wonFill + GAP);

  return (
    <div className="flex items-center justify-center gap-10">
      {/* Legend — 1×2 grid below the chart */}
      {hasData ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-4 rounded-xl py-2 px-3"
               style={{ backgroundColor: `${WON_COLOR}15` }}>
            <div className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: WON_COLOR }} />
              <span className="text-[11px] font-medium text-muted-foreground">Won</span>
            </div>
            <span className="text-base font-bold text-foreground leading-none">{won}</span>
          </div>
          <div className="flex items-center gap-4 rounded-xl py-2 px-3"
               style={{ backgroundColor: `${LOST_COLOR}15` }}>
            <div className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: LOST_COLOR }} />
              <span className="text-[11px] font-medium text-muted-foreground">Lost</span>
            </div>
            <span className="text-base font-bold text-foreground leading-none">{lost}</span>
          </div>
        </div>
      ) : (
        <div className="text-center space-y-0.5">
          <p className="text-xs font-medium text-muted-foreground">No closed deals</p>
          <p className="text-xs text-muted-foreground/60">yet this month</p>
        </div>
      )}

      {/* SVG Donut — no track ring */}
      <div className="relative w-full max-w-[170px] aspect-square">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="w-full h-full -rotate-90"
        >
          {hasData ? (
            <>
              {wonFill > 0 && (
                <circle
                  cx={CX} cy={CY} r={R}
                  fill="none"
                  stroke={WON_COLOR}
                  strokeWidth={STROKE}
                  strokeLinecap="round"
                  strokeDasharray={`${wonFill} ${CIRCUM - wonFill}`}
                  strokeDashoffset={0}
                />
              )}
              {lostFill > 0 && (
                <circle
                  cx={CX} cy={CY} r={R}
                  fill="none"
                  stroke={LOST_COLOR}
                  strokeWidth={STROKE}
                  strokeLinecap="round"
                  strokeDasharray={`${lostFill} ${CIRCUM - lostFill}`}
                  strokeDashoffset={lostOffset}
                />
              )}
            </>
          ) : (
            <circle
              cx={CX} cy={CY} r={R}
              fill="none"
              stroke="currentColor"
              strokeWidth={STROKE}
              className="text-muted/20 dark:text-muted/30"
            />
          )}
        </svg>

        {/* Centre label — percentage + "Win Rate" */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-0.5">
          <span className="text-xl font-bold text-foreground leading-none">
            {winRate}%
          </span>
          <span className="text-[10px] font-medium text-muted-foreground leading-none">
            Win Rate
          </span>
        </div>
      </div>

      

    </div>
  );
}