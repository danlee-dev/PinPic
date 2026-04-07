// Admin-only client-side toggle: when enabled, the admin sees the result-revealed
// UI even before the actual reveal time. Stored in localStorage so it does not
// affect any other user.

const KEY = "pinpic_reveal_preview";

export function getRevealPreview(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(KEY) === "1";
}

export function setRevealPreview(enabled: boolean) {
  if (typeof window === "undefined") return;
  if (enabled) window.localStorage.setItem(KEY, "1");
  else window.localStorage.removeItem(KEY);
  window.dispatchEvent(new Event("reveal-preview-change"));
}

export function subscribeRevealPreview(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("reveal-preview-change", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("reveal-preview-change", cb);
    window.removeEventListener("storage", cb);
  };
}
