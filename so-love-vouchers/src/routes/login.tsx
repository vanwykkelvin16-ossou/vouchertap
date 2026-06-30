import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { hasAccess } from "@/lib/access-code";
import { isMemberDisabled } from "@/lib/member-status";
import { toast } from "sonner";
import { Heart, Loader2 } from "lucide-react";

const schema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(6, "At least 6 characters"),
});

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Admin can reach /login directly without the member access code
  const searchParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const isAdminLogin = searchParams.get("admin") === "1";

  useEffect(() => {
    if (!isAdminLogin && !hasAccess()) navigate({ to: "/access-code" });
  }, [navigate, isAdminLogin]);

  useEffect(() => {
    if (!loading && session) navigate({ to: "/app/events" });
  }, [session, loading, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSubmitting(true);
    const { data: authData, error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error) {
      setSubmitting(false);
      toast.error(error.message);
      return;
    }
    if (authData.user) {
      try {
        if (await isMemberDisabled(authData.user.id)) {
          await supabase.auth.signOut();
          setSubmitting(false);
          toast.error("Your account has been disabled. Contact an admin.");
          return;
        }
      } catch {
        await supabase.auth.signOut();
        setSubmitting(false);
        toast.error("Could not verify account status. Try again.");
        return;
      }
    }
    setSubmitting(false);
    toast.success("Welcome back!");
    navigate({ to: "/app/events" });
  }

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center bg-background px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="size-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center mb-4">
            <Heart className="size-7 fill-current" />
          </div>
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sign in to view your vouchers.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting ? <Loader2 className="size-4 animate-spin" /> : "Sign in"}
          </Button>
        </form>

        <p className="text-sm text-muted-foreground text-center mt-6">
          New member?{" "}
          <Link to="/signup" className="text-primary font-semibold hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}
