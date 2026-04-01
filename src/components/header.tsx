"use client";

import { School } from "@/lib/types";

type Filter = "all" | School;

interface HeaderProps {
  filter: Filter;
  onFilterChange: (filter: Filter) => void;
}

export function Header({ filter, onFilterChange }: HeaderProps) {
  const filters: { value: Filter; label: string }[] = [
    { value: "all", label: "전체" },
    { value: "yonsei", label: "연세대" },
    { value: "korea", label: "고려대" },
  ];

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="max-w-3xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <h1 className="animate-title-reveal flex items-center gap-1.5 text-lg font-bold tracking-tight">
            <img src="/yonsei-logo.png" alt="연세대" className="w-6 h-6 rounded-full object-cover" />
            <span className="text-muted text-sm">vs</span>
            <img src="/korea-logo.png" alt="고려대" className="w-6 h-6 rounded-full object-cover" />
          </h1>
          <nav className="flex gap-1 bg-surface rounded-full p-1">
            {filters.map((f) => (
              <button
                key={f.value}
                onClick={() => onFilterChange(f.value)}
                className={`px-3.5 py-1 rounded-full text-xs font-medium transition-all duration-300 cursor-pointer
                  ${filter === f.value
                    ? "bg-white/10 text-foreground shadow-sm animate-filter-switch"
                    : "text-muted hover:text-foreground"
                  }`}
              >
                {f.label}
              </button>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
