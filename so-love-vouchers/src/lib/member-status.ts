import { supabase } from "@/integrations/supabase/client";

export async function isMemberDisabled(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("profiles")
    .select("disabled_at")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return !!data?.disabled_at;
}
