interface AvatarProps {
  firstName: string;
  lastName: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeStyles = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
};

// Deterministic color from name
function getColor(name: string): string {
  const colors = [
    "bg-blue-500",
    "bg-emerald-500",
    "bg-amber-500",
    "bg-red-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-cyan-500",
    "bg-indigo-500",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function Avatar({
  firstName,
  lastName,
  size = "md",
  className = "",
}: AvatarProps) {
  const initials = `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
  const color = getColor(`${firstName}${lastName}`);

  return (
    <div
      className={`inline-flex items-center justify-center rounded-full font-medium text-white ${color} ${sizeStyles[size]} ${className}`}
      aria-label={`${firstName} ${lastName}`}
    >
      {initials}
    </div>
  );
}
