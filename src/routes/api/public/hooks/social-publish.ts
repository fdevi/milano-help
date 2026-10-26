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
        if (!allowed) {
          const { data: u } = await supabaseAdmin.auth.getUser(bearer);
          if (u?.user) {
            const { data: isAdmin } = await supabaseAdmin.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
            allowed = !!isAdmin;
          }
        }
        if (!allowed) return new Response("Forbidden", { status: 403 });

        const { runSocialPublish } = await import("@/lib/socialPublish.server");
        const result = await runSocialPublish();
        return Response.json(result);
      },
    },
  },
});
