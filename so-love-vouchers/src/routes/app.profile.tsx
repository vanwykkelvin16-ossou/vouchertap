import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUploader } from "@/components/image-uploader";
import { NotificationSettings } from "@/components/notification-settings";
import {
  LogOut,
  LayoutDashboard,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { revokeAccess } from "@/lib/access-code";
import { toast } from "sonner";

export const Route = createFileRoute("/app/profile")({
  component: ProfilePage,
});

type Profile = {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

function ProfilePage() {
  const { user, signOut } = useAuth();
  const { data: isAdmin } = useIsAdmin();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, display_name, avatar_url")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
    enabled: !!user?.id,
  });

  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? "");
      setAvatarUrl(profile.avatar_url ?? null);
    }
  }, [profile]);

  const save = useMutation({
    mutationFn: async (payload: {
      display_name: string | null;
      avatar_url: string | null;
    }) => {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: payload.display_name,
          avatar_url: payload.avatar_url,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile updated");
      qc.invalidateQueries({ queryKey: ["profile", user?.id] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to save"),
  });

  function handleAvatar(url: string | null) {
    setAvatarUrl(url);
    save.mutate({ display_name: displayName || null, avatar_url: url });
  }

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/login" });
  }

  const dirty = (profile?.display_name ?? "") !== displayName;

  return (
    <div className="mx-auto w-full max-w-2xl">
      <header className="pb-8">
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
          Profile
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Manage your SLK membership.
        </p>
      </header>

      {isLoading ? (
        <div className="py-16 grid place-items-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-10">
          {/* Identity */}
          <section className="flex items-center gap-5">
            <ImageUploader
              value={avatarUrl}
              onChange={handleAvatar}
              folder={`avatars/${user?.id}`}
              shape="circle"
              label="Change"
            />
            <div className="min-w-0">
              <p className="text-base font-medium truncate">
                {displayName || "Welcome"}
              </p>
              <p className="text-sm text-muted-foreground truncate">
                {user?.email}
              </p>
              <span className="inline-flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                Active member
              </span>
            </div>
          </section>

          <div className="h-px bg-border" />

          {/* Details */}
          <section className="space-y-5">
            <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Personal details
            </h2>
            <div className="space-y-2">
              <Label htmlFor="display-name" className="text-sm">
                Display name
              </Label>
              <Input
                id="display-name"
                value={displayName}
                placeholder="How should we call you?"
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Email</Label>
              <Input value={user?.email ?? ""} disabled readOnly />
            </div>
            {dirty && (
              <Button
                onClick={() =>
                  save.mutate({
                    display_name: displayName || null,
                    avatar_url: avatarUrl,
                  })
                }
                disabled={save.isPending}
              >
                {save.isPending && (
                  <Loader2 className="size-4 animate-spin mr-2" />
                )}
                Save changes
              </Button>
            )}
          </section>

          <div className="h-px bg-border" />

          {/* Notifications */}
          <section className="space-y-5">
            <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Notifications
            </h2>
            <NotificationSettings />
          </section>

          {isAdmin && (
            <>
              <div className="h-px bg-border" />
              <section className="space-y-3">
                <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Admin
                </h2>
                <Link
                  to="/admin"
                  className="flex items-center justify-between -mx-3 px-3 py-3 rounded-lg hover:bg-muted/60 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-lg bg-primary/10 text-primary grid place-items-center">
                      <LayoutDashboard className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Admin portal</p>
                      <p className="text-xs text-muted-foreground">
                        Manage events & vouchers
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Link>
              </section>
            </>
          )}

          <div className="h-px bg-border" />

          {/* About */}
          <section className="space-y-3">
            <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              About
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              So Love Krugersdorp is a members-only experience. Your vouchers
              are tied to your account - they can't be shared, screenshotted,
              or used by anyone else.
            </p>
          </section>

          <div className="h-px bg-border" />

          {/* Account actions */}
          <section className="space-y-3">
            <div className="flex justify-center">
              <Button
                variant="destructive"
                className="gap-2"
                onClick={handleSignOut}
              >
                <LogOut className="size-4" />
                Sign out
              </Button>
            </div>
            <button
              onClick={() => {
                revokeAccess();
                navigate({ to: "/access-code" });
              }}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground py-1"
            >
              Reset access code on this device
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
