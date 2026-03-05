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
    await supabase.functions.invoke("send-push-notification", {
      body: { userId, title, message, link },
    });
  } catch (e) {
    console.warn("[push] failed:", e);
  }
}
