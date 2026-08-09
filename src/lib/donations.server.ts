/**
 * Server-only helpers for Stripe donations.
 * Uses the Stripe REST API directly via fetch so it runs on the edge runtime.
 */

const STRIPE_API = "https://api.stripe.com/v1";

function stripeKey(): string {
  const key = process.env["STRIPE_SECRET_KEY"];
  if (!key) throw new Error("Stripe is not configured (missing secret key).");
  return key;
}

function encodeForm(obj: Record<string, string | number | undefined | null>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    params.append(k, String(v));
  }
  return params.toString();
}

async function stripeRequest(
  path: string,
  init?: { method?: string; body?: Record<string, string | number | undefined | null> },
) {
  const res = await fetch(`${STRIPE_API}${path}`, {
    method: init?.method ?? "GET",
    headers: {
      Authorization: `Bearer ${stripeKey()}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Stripe-Version": "2025-08-27.basil",
    },
    body: init?.body ? encodeForm(init.body) : undefined,
  });
  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    const err = json?.["error"] as { message?: string } | undefined;
    throw new Error(err?.message ?? `Stripe request failed (${res.status})`);
  }
  return json;
}

export type CheckoutInput = {
  amountCents: number;
  name?: string;
  email?: string;
  message?: string;
  origin: string;
  returnPath: string;
  userId: string | null;
};

export async function createDonationSession(input: CheckoutInput) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const sep = input.returnPath.includes("?") ? "&" : "?";
  const successUrl = `${input.origin}${input.returnPath}${sep}donation={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${input.origin}${input.returnPath}${sep}donation=cancelled`;

  const session = (await stripeRequest("/checkout/sessions", {
    method: "POST",
    body: {
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: input.email,
      "line_items[0][quantity]": 1,
      "line_items[0][price_data][currency]": "usd",
      "line_items[0][price_data][unit_amount]": input.amountCents,
      "line_items[0][price_data][product_data][name]": "Donation to Banyamulenge Hub",
      "line_items[0][price_data][product_data][description]":
        "Supports platform development and heritage preservation",
      "metadata[donor_name]": input.name,
      "metadata[donor_message]": input.message,
      "metadata[user_id]": input.userId,
    },
  })) as { id: string; url: string };

  const { error } = await supabaseAdmin.from("donations").insert({
    user_id: input.userId,
    donor_name: input.name ?? null,
    donor_email: input.email ?? null,
    message: input.message ?? null,
    amount_cents: input.amountCents,
    currency: "usd",
    status: "pending",
    stripe_session_id: session.id,
  });
  if (error) throw new Error(error.message);

  return { url: session.url, sessionId: session.id };
}

export async function verifyDonationSession(sessionId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const session = (await stripeRequest(
    `/checkout/sessions/${encodeURIComponent(sessionId)}?expand[]=payment_intent`,
  )) as {
    payment_status?: string;
    amount_total?: number;
    customer_details?: { email?: string; name?: string };
    metadata?: Record<string, string>;
    payment_intent?: { id?: string; latest_charge?: string } | string;
  };

  const paid = session.payment_status === "paid";
  const pi =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent?.id ?? null);

  const { error } = await supabaseAdmin
    .from("donations")
    .update({
      status: paid ? "paid" : (session.payment_status ?? "pending"),
      amount_cents: session.amount_total ?? undefined,
      donor_email: session.customer_details?.email ?? undefined,
      donor_name: session.metadata?.["donor_name"] || session.customer_details?.name || undefined,
      stripe_payment_intent_id: pi,
    })
    .eq("stripe_session_id", sessionId);
  if (error) throw new Error(error.message);

  return { paid, amountCents: session.amount_total ?? 0 };
}

export async function assertAdmin(
  supabase: { from: (t: string) => any },
  userId: string,
): Promise<void> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Admin access required");
}

export async function fetchAllDonations() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("donations")
    .select(
      "id, donor_name, donor_email, message, amount_cents, currency, status, stripe_session_id, stripe_payment_intent_id, created_at, user_id",
    )
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return data ?? [];
}
