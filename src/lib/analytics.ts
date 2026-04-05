// Google Analytics 4 event tracking
// Set GA_MEASUREMENT_ID in .env.local as NEXT_PUBLIC_GA_ID

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackEvent(eventName: string, params?: Record<string, string>) {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", eventName, params);
  }
}
