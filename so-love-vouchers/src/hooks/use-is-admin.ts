import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

async function checkAdmin(userId: string): Promise<boolean> {
  const { data: hasRole, error: hasRoleError } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (!hasRoleError) return !!hasRole;

  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return !!roleRow;
}

export function useIsAdmin() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["is-admin", user?.id],
    queryFn: async () => {
      if (!user) return false;
      return checkAdmin(user.id);
    },
    enabled: !!user,
    // Short stale window so a freshly promoted member can open /admin
    // after a refresh / focus without waiting several minutes.
    staleTime: 15_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}
