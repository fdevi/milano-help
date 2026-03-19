import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      console.error("[send-birthday-emails] RESEND_API_KEY not configured");
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not set" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get today's day and month (UTC)
    const today = new Date();
    const day = today.getUTCDate();
    const month = today.getUTCMonth() + 1; // 1-based
    const year = today.getUTCFullYear();
    const todayStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    console.log(`[send-birthday-emails] Checking birthdays for day=${day}, month=${month}`);

    // Query profiles where day and month of data_nascita match today
    const { data: birthdayUsers, error: queryError } = await supabase
      .from("profiles")
      .select("user_id, nome, cognome, username, email, data_nascita")
      .not("data_nascita", "is", null)
      .not("email", "is", null);

    if (queryError) {
      console.error("[send-birthday-emails] Query error:", queryError.message);
      throw queryError;
    }

    // Filter by matching day/month (data_nascita is stored as date string e.g. "1990-03-19")
    const matches = (birthdayUsers || []).filter((u) => {
      if (!u.data_nascita) return false;
      const parts = u.data_nascita.split("-");
      if (parts.length < 3) return false;
      const bMonth = parseInt(parts[1], 10);
      const bDay = parseInt(parts[2], 10);
      return bMonth === month && bDay === day;
    });

    console.log(`[send-birthday-emails] Found ${matches.length} birthday users today`);

    // Check which users already received birthday email today (dedup via notifiche)
    let usersToEmail = matches;
    if (usersToEmail.length > 0) {
      const userIds = usersToEmail.map((u) => u.user_id);
      const { data: alreadySent } = await supabase
        .from("notifiche")
        .select("user_id")
        .eq("tipo", "buon_compleanno")
        .in("user_id", userIds)
        .gte("created_at", todayStr + "T00:00:00Z")
        .lt("created_at", todayStr + "T23:59:59Z");

      const sentIds = new Set((alreadySent || []).map((n) => n.user_id));
      usersToEmail = usersToEmail.filter((u) => !sentIds.has(u.user_id));
      console.log(`[send-birthday-emails] After dedup: ${usersToEmail.length} to send (${sentIds.size} already sent)`);
    }

    let sentCount = 0;
    let errorCount = 0;

    for (const user of usersToEmail) {
      const displayName = user.nome || user.username || null;
      const greeting = displayName ? `Ciao ${displayName}!` : "Ciao!";

      const htmlBody = `
        <div style="font-family: 'Plus Jakarta Sans', sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 32px;">
          <img src="https://milanohelp.lovable.app/logo/logo-email-header.png?v=2" alt="Milano Help" style="width: 100%; max-width: 300px; margin-bottom: 20px;">
          <h1 style="color: #5e17eb;">${greeting}</h1>
          <p style="font-size: 16px;">Lo staff di <strong>Milano Help</strong> ti augura un felice compleanno 🎉</p>
          <p style="font-size: 16px;">Continua a essere parte attiva della nostra community!</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
          <p style="color: #666; font-size: 12px;">Milano Help – Community di quartiere</p>
        </div>
      `;

      try {
        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Milano Help <noreply@milanohelp.it>",
            to: [user.email],
            subject: "🎂 Buon compleanno da Milano Help!",
            html: htmlBody,
          }),
        });

        const emailData = await emailRes.json();
        if (!emailRes.ok) {
          console.error(`[send-birthday-emails] Resend error for ${user.email}:`, JSON.stringify(emailData));
          errorCount++;
        } else {
          console.log(`[send-birthday-emails] Email sent to ${user.email}, id: ${emailData.id}`);
          sentCount++;

          // Log in notifiche for dedup and user visibility
          await supabase.from("notifiche").insert({
            user_id: user.user_id,
            tipo: "buon_compleanno",
            titolo: "🎂 Buon compleanno!",
            messaggio: "Lo staff di Milano Help ti augura un felice compleanno!",
            link: null,
          });
        }
      } catch (emailErr) {
        console.error(`[send-birthday-emails] Exception for ${user.email}:`, emailErr);
        errorCount++;
      }
    }

    console.log(`[send-birthday-emails] Done: sent=${sentCount}, errors=${errorCount}`);

    return new Response(
      JSON.stringify({ sent: sentCount, errors: errorCount, total_matches: matches.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[send-birthday-emails] Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
