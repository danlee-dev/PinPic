"use client";

import { useEffect, useRef } from "react";

export type Tab = "feed" | "stats" | "voted" | "admin";

interface BottomDockProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  votedCount: number;
  isAdmin?: boolean;
  revealed?: boolean;
}

const tabs: { value: Tab; label: string; icon: (active: boolean) => React.ReactNode }[] = [
  {
    value: "feed",
    label: "피드",
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="9" rx="1.5" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" />
        <rect x="3" y="16" width="7" height="5" rx="1.5" />
        <rect x="14" y="12" width="7" height="9" rx="1.5" />
      </svg>
    ),
  },
  {
    value: "stats",
    label: "투표율",
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 20V10" />
        <path d="M12 20V4" />
        <path d="M6 20v-6" />
      </svg>
    ),
  },
  {
    value: "voted",
    label: "내 투표",
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
      </svg>
    ),
  },
];

const adminTab = {
  value: "admin" as Tab,
  label: "관리",
  icon: (active: boolean) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
};

export function BottomDock({ activeTab, onTabChange, votedCount, isAdmin, revealed = false }: BottomDockProps) {
  const seenCountRef = useRef<number | null>(null);

  // Set baseline on initial load, then update when visiting voted tab
  useEffect(() => {
    if (seenCountRef.current === null && votedCount > 0) {
      seenCountRef.current = votedCount;
    }
  }, [votedCount]);

  useEffect(() => {
    if (activeTab === "voted") {
      seenCountRef.current = votedCount;
    }
  }, [activeTab, votedCount]);

  const unseenCount = seenCountRef.current === null ? 0 : votedCount - seenCountRef.current;

  return (
    <div className="fixed bottom-5 inset-x-0 z-40 flex justify-center animate-dock-rise pointer-events-none">
      <nav className="pointer-events-auto">
        <div className="flex items-center gap-0.5 bg-surface/95 backdrop-blur-xl rounded-full px-1.5 py-1.5 shadow-2xl shadow-black/50 border border-border/50">
          {[...tabs, ...(isAdmin ? [adminTab] : [])].map((tab) => {
            const label = revealed && tab.value === "stats" ? "명예의 전당" : tab.label;
            const isActive = activeTab === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => onTabChange(tab.value)}
                className={`relative flex flex-col items-center justify-center px-5 py-1.5 rounded-full cursor-pointer
                  transition-all duration-300
                  ${isActive
                    ? "text-foreground"
                    : "text-muted hover:text-foreground/70"
                  }`}
              >
                {/* Active pill background */}
                {isActive && (
                  <div className="absolute -inset-0.5 rounded-full animate-dock-pill-in"
                    style={{
                      background: "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.03) 100%)",
                      boxShadow: "inset 0 1px 2px rgba(255,255,255,0.08), 0 2px 10px rgba(0,0,0,0.25)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  />
                )}
                <span className={`relative transition-transform duration-300 ${isActive ? "scale-110" : "scale-100"}`}>
                  {tab.icon(isActive)}
                </span>
                <span className={`text-[10px] font-medium mt-0.5 transition-all duration-300 whitespace-nowrap ${isActive ? "opacity-100" : "opacity-50"}`}>
                  {label}
                </span>

                {tab.value === "voted" && unseenCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-korea text-white text-[9px] font-bold flex items-center justify-center animate-count-pop">
                    {unseenCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
