import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** Creates a reset token server-side and emails the link; never reveals whether the email exists. */
export const requestPasswordReset = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ email: z.string().trim().email().max(255), origin: z.string().url().max(200) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const allowed = ["https://www.milanohelp.it", "https://milanohelp.lovable.app"];
    const origin = allowed.includes(data.origin) || data.origin.includes("lovable") || data.origin.startsWith("http://localhost") ? data.origin : allowed[0];
    const token = crypto.randomUUID();
    const expires_at = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const { error } = await supabaseAdmin.from("password_resets").insert({ email: data.email, token, expires_at });
    if (error) throw new Error("Impossibile avviare il recupero password");
    const { error: fnError } = await supabaseAdmin.functions.invoke("send-auth-email", {
      body: { to: data.email, type: "reset", data: { resetLink: `${origin}/reset-password?token=${token}` } },
    });
    if (fnError) throw new Error("Errore nell'invio dell'email");
    return { ok: true };
  });

/** Returns the email tied to a valid, unexpired token, or null. */
export const verifyResetToken = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("password_resets").select("email, expires_at").eq("token", data.token).maybeSingle();
    if (!row) return { status: "invalid" as const, email: null };
    if (new Date(row.expires_at) < new Date()) return { status: "expired" as const, email: null };
    return { status: "ok" as const, email: row.email };
  });
