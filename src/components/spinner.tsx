"use client";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
}

const SIZE_MAP = {
  sm: "w-5 h-5 border-2",
  md: "w-7 h-7 border-2",
  lg: "w-10 h-10 border-[3px]",
} as const;

export function Spinner({ size = "md", label, className }: SpinnerProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className ?? ""}`}>
      <div
        className={`${SIZE_MAP[size]} border-white/15 border-t-white rounded-full animate-spin`}
        role="status"
        aria-label={label ?? "로딩 중"}
      />
      {label && <p className="text-[11px] text-muted">{label}</p>}
    </div>
  );
}
