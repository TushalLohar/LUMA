import { cn } from "@/lib/utils";
import { shipById } from "@/game/progress";

/** Little vector silhouette of a fighter, used for ship pickers and cards. */
export function ShipMark({
  skin,
  className,
  color,
}: {
  skin: number;
  className?: string;
  color?: string;
}) {
  const fill = color ?? shipById(skin).color;
  const shapes = [
    "M16 2 L28 27 L20 23 L16 26 L12 23 L4 27 Z",
    "M16 2 L24 12 L30 26 L16 21 L2 26 L8 12 Z",
    "M16 3 L21 14 L30 18 L22 20 L16 29 L10 20 L2 18 L11 14 Z",
    "M16 2 L27 10 L24 28 L16 22 L8 28 L5 10 Z",
  ];
  return (
    <svg viewBox="0 0 32 32" className={cn("h-6 w-6", className)} aria-hidden="true">
      <path d={shapes[skin % shapes.length]} fill={fill} />
    </svg>
  );
}
