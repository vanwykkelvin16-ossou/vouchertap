import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Loader2,
  ShieldCheck,
  ShieldOff,
  Ban,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { deleteMember } from "@/lib/members.functions";

export const Route = createFileRoute("/admin/members")({
  component: AdminMembersPage,
});

type Row = {
  id: string;
  email: string | null;
  display_name: string | null;
  created_at: string;
  disabled_at: string | null;
  isAdmin: boolean;
};

function AdminMembersPage() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-members"],
    queryFn: async () => {
      const [{ data: profiles, error }, { data: roles }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, email, display_name, created_at, disabled_at")
          .order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role").eq("role", "admin"),
      ]);
      if (error) throw error;
      const adminIds = new Set((roles ?? []).map((r) => r.user_id));
      const rows = (profiles ?? []).map((p) => ({ ...p, isAdmin: adminIds.has(p.id) })) as Row[];
      rows.sort((a, b) => (a.isAdmin === b.isAdmin ? 0 : a.isAdmin ? -1 : 1));
      return rows;
    },
  });

  const setRole = useMutation({
    mutationFn: async ({ userId, grant }: { userId: string; grant: boolean }) => {
      const { error } = await supabase.rpc("set_user_role", {
        _user_id: userId,
        _role: "admin",
        _grant: grant,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Updated");
      qc.invalidateQueries({ queryKey: ["admin-members"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const setDisabled = useMutation({
    mutationFn: async ({ userId, disabled }: { userId: string; disabled: boolean }) => {
      const { error } = await supabase.rpc("set_member_disabled", {
        _user_id: userId,
        _disabled: disabled,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Updated");
      qc.invalidateQueries({ queryKey: ["admin-members"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const deleteFn = useServerFn(deleteMember);
  const [toDelete, setToDelete] = useState<Row | null>(null);

  const removeMember = useMutation({
    mutationFn: async (userId: string) => {
      await deleteFn({ data: { userId } });
    },
    onSuccess: () => {
      toast.success("Member permanently deleted");
      setToDelete(null);
      qc.invalidateQueries({ queryKey: ["admin-members"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to delete"),
  });

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-widest text-primary font-semibold">
          Admin
        </p>
        <h1 className="text-3xl font-bold mt-1">Members</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Promote admins, disable accounts, or permanently delete members.
        </p>
      </header>

      {isLoading ? (
        <div className="py-10 grid place-items-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : !data || data.length === 0 ? (
        <Card className="p-8 text-center border-dashed">
          <p className="font-semibold">No members yet</p>
        </Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
              <tr>
                <th className="text-left p-3">Member</th>
                <th className="text-left p-3">Joined</th>
                <th className="text-left p-3">Status</th>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((m) => {
                const isMe = m.id === user?.id;
                return (
                  <tr key={m.id} className="border-b border-border last:border-0">
                    <td className="p-3 align-top">
                      <div className="font-medium">{m.display_name ?? "-"}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {m.email}
                      </div>
                    </td>
                    <td className="p-3 align-top text-xs text-muted-foreground">
                      {new Date(m.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-3 align-top">
                      <div className="flex gap-1 flex-wrap">
                        {m.isAdmin && (
                          <Badge className="bg-primary text-primary-foreground">
                            <ShieldCheck className="size-3 mr-1" /> Admin
                          </Badge>
                        )}
                        {m.disabled_at && (
                          <Badge variant="outline" className="text-destructive border-destructive">
                            Disabled
                          </Badge>
                        )}
                        {!m.isAdmin && !m.disabled_at && (
                          <Badge variant="secondary">Member</Badge>
                        )}
                      </div>
                    </td>
                    <td className="p-3 align-top text-right">
                      <div className="flex justify-end gap-1">
                        {!isMe && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              setRole.mutate({ userId: m.id, grant: !m.isAdmin })
                            }
                            disabled={setRole.isPending}
                          >
                            {m.isAdmin ? (
                              <>
                                <ShieldOff className="size-3.5 mr-1" /> Demote
                              </>
                            ) : (
                              <>
                                <ShieldCheck className="size-3.5 mr-1" /> Promote
                              </>
                            )}
                          </Button>
                        )}
                        {!isMe && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className={m.disabled_at ? "" : "text-destructive"}
                            onClick={() =>
                              setDisabled.mutate({
                                userId: m.id,
                                disabled: !m.disabled_at,
                              })
                            }
                            disabled={setDisabled.isPending}
                          >
                            {m.disabled_at ? (
                              <>
                                <RotateCcw className="size-3.5 mr-1" /> Enable
                              </>
                            ) : (
                              <>
                                <Ban className="size-3.5 mr-1" /> Disable
                              </>
                            )}
                          </Button>
                        )}
                        {!isMe && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => setToDelete(m)}
                            disabled={removeMember.isPending}
                          >
                            <Trash2 className="size-3.5 mr-1" /> Delete
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      <AlertDialog
        open={!!toDelete}
        onOpenChange={(open) => !open && setToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently delete this member?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove{" "}
              <span className="font-semibold text-foreground">
                {toDelete?.display_name ?? toDelete?.email ?? "this member"}
              </span>{" "}
              from every part of the app - their login, profile, roles,
              voucher claims and push subscriptions. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeMember.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                if (toDelete) removeMember.mutate(toDelete.id);
              }}
              disabled={removeMember.isPending}
            >
              {removeMember.isPending ? (
                <Loader2 className="size-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="size-4 mr-2" />
              )}
              Delete forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
