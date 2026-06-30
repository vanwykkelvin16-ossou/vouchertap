import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const deleteMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ userId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    // Verify caller is admin
    const { data: adminRow, error: adminErr } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (adminErr) throw new Error(adminErr.message);
    if (!adminRow) throw new Error("Not authorized");

    if (data.userId === context.userId) {
      throw new Error("You cannot delete your own account");
    }

    // Wipe all user-related rows across the app
    await supabaseAdmin
      .from("voucher_claims")
      .delete()
      .eq("user_id", data.userId);
    await supabaseAdmin
      .from("push_subscriptions")
      .delete()
      .eq("user_id", data.userId);
    await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId);
    await supabaseAdmin.from("profiles").delete().eq("id", data.userId);

    // Delete auth user last
    const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(
      data.userId,
    );
    if (authErr) throw new Error(authErr.message);

    return { ok: true };
  });
