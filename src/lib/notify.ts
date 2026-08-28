import { toast } from "sonner";

type NotifyOptions = {
  description?: string;
  /** Also raise a browser (OS) notification when the tab is in the background. */
  push?: boolean;
  duration?: number;
};

/**
 * WhatsApp-Web style banners: small, top-centred, auto-dismissing toasts.
 * All success/info/error feedback in the app should go through these helpers
 * so styling and timing stay consistent.
 */
export function notifySuccess(message: string, opts: NotifyOptions = {}) {
  toast.success(message, { description: opts.description, duration: opts.duration ?? 2600 });
  if (opts.push) pushNotification(message, opts.description);
}

export function notifyError(message: string, opts: NotifyOptions = {}) {
  toast.error(message, { description: opts.description, duration: opts.duration ?? 4000 });
}

export function notifyInfo(message: string, opts: NotifyOptions = {}) {
  toast(message, { description: opts.description, duration: opts.duration ?? 3000 });
  if (opts.push) pushNotification(message, opts.description);
}

export function notifyLoading(message: string) {
  return toast.loading(message);
}

export function dismissNotification(id: string | number) {
  toast.dismiss(id);
}

/** Ask once for browser notification permission (safe to call repeatedly). */
export async function ensurePushPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  try {
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;
    const res = await Notification.requestPermission();
    return res === "granted";
  } catch {
    return false;
  }
}

/**
 * OS-level notification, only when the tab is hidden so we never double-notify
 * a user who is already looking at the screen.
 */
export function pushNotification(title: string, body?: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  if (typeof document !== "undefined" && document.visibilityState === "visible") return;
  try {
    const n = new Notification(title, { body, icon: "/favicon.png", badge: "/favicon.png" });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch {
    /* ignore */
  }
}
