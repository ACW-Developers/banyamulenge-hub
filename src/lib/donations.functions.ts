import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const checkoutSchema = z.object({
  amountCents: z.number().int().min(100).max(1000000),
  name: z.string().trim().max(100).optional(),
  email: z.string().trim().email().max(255).optional(),
  message: z.string().trim().max(500).optional(),
  origin: z.string().trim().url().max(300),
  returnPath: z.string().trim().max(300).default("/"),
  userId: z.string().uuid().nullable().default(null),
});

export const createDonationCheckout = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => checkoutSchema.parse(data))
  .handler(async ({ data }) => {
    const { createDonationSession } = await import("./donations.server");
    return createDonationSession(data);
  });

export const verifyDonation = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ sessionId: z.string().min(5).max(300) }).parse(data))
  .handler(async ({ data }) => {
    const { verifyDonationSession } = await import("./donations.server");
    return verifyDonationSession(data.sessionId);
  });

export const listDonations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin, fetchAllDonations } = await import("./donations.server");
    await assertAdmin(context.supabase as never, context.userId);
    return fetchAllDonations(context.supabase as never);
  });
