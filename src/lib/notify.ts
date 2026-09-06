import { toast as sonnerToast } from "sonner";

type NotifyOptions = {
  description?: string;
  /** Also raise a browser (OS) notification when the tab is in the background. */
  push?: boolean;
  duration?: number;
};

/** Every banner stays visible for 5 seconds. */
export const TOAST_DURATION = 5000;

type Rule = { match: RegExp; message: string };

/**
 * Raw errors from the database, network or payment provider are technical.
 * These rules turn them into short, plain sentences a member can act on.
 */
const RULES: Rule[] = [
  // Network / connectivity
  { match: /failed to fetch|network ?error|networkerror|load failed/i, message: "You appear to be offline. Check your internet connection and try again." },
  { match: /timeout|timed out|aborted/i, message: "That took too long to respond. Please try again in a moment." },

  // Auth
  { match: /invalid login credentials/i, message: "That email or password is not correct. Please try again." },
  { match: /email not confirmed/i, message: "Please confirm your email address first — check your inbox for the link." },
  { match: /user already registered|already been registered|duplicate.*email/i, message: "An account with this email already exists. Try logging in instead." },
  { match: /password should be at least|password.*too short|weak password/i, message: "Your password is too short. Use at least 6 characters." },
  { match: /invalid email|unable to validate email/i, message: "That email address doesn't look right. Please check it." },
  { match: /email rate limit|over_email_send_rate|too many requests|rate limit/i, message: "Too many attempts. Please wait a minute and try again." },
  { match: /same as the old password|new password should be different/i, message: "Your new password must be different from the current one." },
  { match: /auth session missing|jwt expired|invalid (jwt|token)|refresh token/i, message: "Your session has expired. Please log in again." },
  { match: /unauthorized|401/, message: "Please log in to continue." },

  // Permissions / database
  { match: /row-level security|violates row-level|permission denied|not authorized|forbidden|403/i, message: "You don't have permission to do that." },
  { match: /duplicate key|already exists|unique constraint/i, message: "That already exists — no need to add it twice." },
  { match: /foreign key|violates foreign key/i, message: "This item is linked to other content and can't be changed right now." },
  { match: /not-null|null value in column|violates check constraint/i, message: "Some required details are missing. Please fill in every required field." },
  { match: /no rows|pgrst116|not found|404/i, message: "We couldn't find that — it may have been removed." },
  { match: /payload too large|413|exceeded the maximum|file size/i, message: "That file is too large. Please choose a smaller one." },
  { match: /storage|bucket/i, message: "The file couldn't be uploaded. Please try again with a different file." },

  // Payments
  { match: /stripe|card declined|payment/i, message: "The payment couldn't be completed. Please check your card details and try again." },

  // Server
  { match: /internal server error|500|502|503|unexpected/i, message: "Something went wrong on our side. Please try again shortly." },
];

/** Convert anything thrown (Error, string, Supabase error object) into a clear sentence. */
export function friendlyMessage(input: unknown, fallback = "Something didn't work. Please try again."): string {
  let raw = "";
  if (typeof input === "string") raw = input;
  else if (input && typeof input === "object") {
    const o = input as { message?: string; error_description?: string; details?: string; hint?: string };
    raw = o.message || o.error_description || o.details || o.hint || "";
  }
  raw = raw.trim();
  if (!raw) return fallback;

  for (const rule of RULES) if (rule.match.test(raw)) return rule.message;

  // Already a friendly, human-written sentence? Keep it.
  const looksTechnical =
    /[{}[\]<>]|https?:\/\/|\bnull\b|\berror code\b|\bexception\b|_[a-z]+_|\bat \w+\.\w+/i.test(raw) ||
    raw.length > 160;
  if (looksTechnical) return fallback;

  const cleaned = raw.charAt(0).toUpperCase() + raw.slice(1);
  return /[.!?]$/.test(cleaned) ? cleaned : `${cleaned}.`;
}

/**
 * WhatsApp-Web style banners: small, top-centred, auto-dismissing toasts.
 * All success/info/error feedback in the app should go through these helpers
 * so styling and timing stay consistent.
 */
export function notifySuccess(message: string, opts: NotifyOptions = {}) {
  sonnerToast.success(message, {
    description: opts.description,
    duration: opts.duration ?? TOAST_DURATION,
  });
  if (opts.push) pushNotification(message, opts.description);
}

export function notifyError(message: unknown, opts: NotifyOptions = {}) {
  sonnerToast.error(friendlyMessage(message), {
    description: opts.description,
    duration: opts.duration ?? TOAST_DURATION,
  });
}

export function notifyInfo(message: string, opts: NotifyOptions = {}) {
  sonnerToast(message, { description: opts.description, duration: opts.duration ?? TOAST_DURATION });
  if (opts.push) pushNotification(message, opts.description);
}

export function notifyLoading(message: string) {
  return sonnerToast.loading(message);
}

export function dismissNotification(id: string | number) {
  sonnerToast.dismiss(id);
}

/**
 * Drop-in replacement for sonner's `toast` that always shows friendly wording
 * and keeps every banner on screen for 5 seconds.
 */
type ToastFn = ((message: string, opts?: NotifyOptions) => void) & {
  success: (message: string, opts?: NotifyOptions) => void;
  error: (message: unknown, opts?: NotifyOptions) => void;
  info: (message: string, opts?: NotifyOptions) => void;
  message: (message: string, opts?: NotifyOptions) => void;
  loading: (message: string) => string | number;
  dismiss: (id?: string | number) => void;
};

const base = ((message: string, opts?: NotifyOptions) => notifyInfo(message, opts)) as ToastFn;
base.success = notifySuccess;
base.error = notifyError;
base.info = notifyInfo;
base.message = notifyInfo;
base.loading = notifyLoading;
base.dismiss = (id?: string | number) => (id === undefined ? sonnerToast.dismiss() : sonnerToast.dismiss(id));

export const toast = base;

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
