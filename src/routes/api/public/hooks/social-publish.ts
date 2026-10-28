import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/social-publish")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const bearer = request.headers.get("authorization")?.replace("Bearer ", "") ?? "";
        if (!bearer) return new Response("Unauthorized", { status: 401 });
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Allowed callers: the scheduled job (private DB token) or a signed-in admin.
        const { data: row } = await supabaseAdmin.from("social_cron_token").select("token").eq("id", 1).maybeSingle();
        let allowed = !!row?.token && row.token === bearer;
        let isAdminCaller = false;
        if (!allowed) {
          const { data: u } = await supabaseAdmin.auth.getUser(bearer);
          if (u?.user) {
            const { data: isAdmin } = await supabaseAdmin.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
            allowed = !!isAdmin;
            isAdminCaller = allowed;
          }
        }
        if (!allowed) return new Response("Forbidden", { status: 403 });

        const { runSocialPublish } = await import("@/lib/socialPublish.server");
        // Admins may target a single event (used for tests).
        const body = (await request.json().catch(() => ({}))) as { eventoId?: unknown; soloInstagram?: unknown };
        const onlyId = isAdminCaller && typeof body.eventoId === "string" && /^[0-9a-f-]{36}$/.test(body.eventoId) ? body.eventoId : undefined;
        // soloInstagram: recovery run that only retries pending Instagram posts.
        const result = await runSocialPublish(onlyId, body.soloInstagram === true);
        return Response.json(result);
      },
    },
  },
});
