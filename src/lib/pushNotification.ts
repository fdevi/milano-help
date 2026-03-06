import { supabase } from "@/integrations/supabase/client";

/**
 * Sends a push notification via OneSignal edge function.
 * Fire-and-forget: errors are logged but never thrown.
 */
export async function sendPushNotification(
  userId: string,
  title: string,
  message: string,
  link?: string,
) {
  try {
    console.log("[push] Calling send-push-notification for userId:", userId, "title:", title);
    const { data, error } = await supabase.functions.invoke("send-push-notification", {
      body: { userId, title, message, link },
    });
    if (error) {
      console.warn("[push] Edge function error:", error);
    } else {
      console.log("[push] Edge function response:", data);
    }
  } catch (e) {
    console.warn("[push] failed:", e);
  }
}
