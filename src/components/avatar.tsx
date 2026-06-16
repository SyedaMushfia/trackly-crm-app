import { cn } from "@/lib/utils";

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<AvatarProps["size"]>, string> = {
  sm: "h-7 w-7 text-xs",
  md: "h-9 w-9 text-sm",
  lg: "h-20 w-20 text-2xl",
};

function getInitials(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({ src, name, size = "md", className }: AvatarProps) {
  const sizeClass = SIZE_CLASSES[size];

  if (src) {
    return (
      <img
        src={src}
        alt={name ?? "User avatar"}
        className={cn("rounded-full object-cover flex-shrink-0", sizeClass, className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "rounded-full bg-[#18cb96]/15 text-[#18cb96] font-semibold flex items-center justify-center flex-shrink-0",
        sizeClass, className
      )}
    >
      {getInitials(name)}
    </div>
  );
}