import { School } from "@/lib/types";

const SCHOOL_CONFIG = {
  yonsei: {
    label: "연세대",
    logo: "/yonsei-logo.png",
    bg: "bg-yonsei",
    text: "text-white",
  },
  korea: {
    label: "고려대",
    logo: "/korea-logo.png",
    bg: "bg-korea",
    text: "text-white",
  },
} as const;

export function SchoolBadge({ school, size = "sm" }: { school: School; size?: "sm" | "md" }) {
  const config = SCHOOL_CONFIG[school];
  const sizeClass = size === "sm"
    ? "pl-1 pr-2 py-0.5 text-[10px] gap-1"
    : "pl-1.5 pr-2.5 py-1 text-xs gap-1.5";
  const imgSize = size === "sm" ? "w-3.5 h-3.5" : "w-4.5 h-4.5";

  return (
    <span
      className={`${config.bg}/80 backdrop-blur-md ${config.text} ${sizeClass} shadow-[0_2px_8px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.15)] rounded-full font-semibold tracking-wide inline-flex items-center border border-white/10`}
    >
      <img src={config.logo} alt={config.label} className={`${imgSize} object-contain drop-shadow-sm`} />
      {config.label}
    </span>
  );
}
