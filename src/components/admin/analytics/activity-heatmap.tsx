import { cn } from "@/lib/utils";
import type { HeatmapCell } from "@/lib/admin/analytics";

/**
 * Kinetra CRM — activity heatmap (Phase 6).
 *
 * Server component: a pure CSS 7×24 grid of CRM activity by day-of-week and
 * hour (UTC), rendered from pre-aggregated counts — no client JS. Cell
 * intensity scales with the busiest cell; each cell carries a title tooltip
 * and screen-reader label for accessibility.
 */

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const HOUR_TICKS = [0, 6, 12, 18] as const;

interface ActivityHeatmapProps {
  cells: HeatmapCell[];
}

function intensityClass(count: number, max: number): string {
  if (count === 0 || max === 0) return "bg-muted/40";
  const ratio = count / max;
  if (ratio <= 0.2) return "bg-primary/15";
  if (ratio <= 0.4) return "bg-primary/30";
  if (ratio <= 0.6) return "bg-primary/50";
  if (ratio <= 0.8) return "bg-primary/70";
  return "bg-primary";
}

export function ActivityHeatmap({ cells }: ActivityHeatmapProps) {
  const countByKey = new Map(
    cells.map((c) => [`${c.dow}-${c.hour}`, c.count]),
  );
  const max = cells.reduce((m, c) => Math.max(m, c.count), 0);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[560px]">
        {/* Hour ticks */}
        <div className="mb-1 ml-10 grid grid-cols-24 gap-[3px]">
          {Array.from({ length: 24 }).map((_, hour) => (
            <span
              key={hour}
              className="text-center font-mono text-[9px] text-muted-foreground"
            >
              {(HOUR_TICKS as readonly number[]).includes(hour) ? hour : ""}
            </span>
          ))}
        </div>

        {/* Grid */}
        <div className="flex flex-col gap-[3px]">
          {DAY_LABELS.map((label, dow) => (
            <div key={label} className="flex items-center gap-2">
              <span className="w-8 shrink-0 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {label}
              </span>
              <div className="grid flex-1 grid-cols-24 gap-[3px]">
                {Array.from({ length: 24 }).map((_, hour) => {
                  const count = countByKey.get(`${dow}-${hour}`) ?? 0;
                  return (
                    <div
                      key={hour}
                      className={cn(
                        "aspect-square rounded-[2px]",
                        intensityClass(count, max),
                      )}
                      title={`${label} ${String(hour).padStart(2, "0")}:00 UTC — ${count} activit${count === 1 ? "y" : "ies"}`}
                    >
                      <span className="sr-only">
                        {label} {hour}:00 UTC: {count} activities
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="ml-10 mt-3 flex items-center gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Less
          </span>
          {["bg-muted/40", "bg-primary/15", "bg-primary/30", "bg-primary/50", "bg-primary/70", "bg-primary"].map(
            (cls) => (
              <span
                key={cls}
                className={cn("h-3 w-3 rounded-[2px]", cls)}
                aria-hidden="true"
              />
            ),
          )}
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            More
          </span>
        </div>
      </div>
    </div>
  );
}