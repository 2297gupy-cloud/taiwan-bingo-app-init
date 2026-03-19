import { cn, padNumber } from "@/lib/utils";

interface NumberBallProps {
  number: number;
  isSuper?: boolean;
  isHighlighted?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function NumberBall({
  number,
  isSuper = false,
  isHighlighted = false,
  size = "md",
  className,
}: NumberBallProps) {
  const sizeClass =
    size === "lg"
      ? "number-ball-lg"
      : size === "sm"
      ? "number-ball-sm"
      : "number-ball";

  return (
    <span
      className={cn(
        sizeClass,
        isSuper && "super",
        isHighlighted && "highlighted",
        className
      )}
    >
      {padNumber(number)}
    </span>
  );
}
