import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { grantAccess, hasAccess } from "@/lib/access-code";
import { toast } from "sonner";
import { Heart } from "lucide-react";

export const Route = createFileRoute("/access-code")({
  component: AccessCodePage,
});

function AccessCodePage() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (hasAccess()) navigate({ to: "/login" });
  }, [navigate]);

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    setSubmitting(true);
    if (grantAccess(code)) {
      toast.success("Access granted");
      navigate({ to: "/login" });
    } else {
      toast.error("Invalid access code");
      setSubmitting(false);
      setCode("");
    }
  }

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center bg-background px-6 py-10">
      <div className="w-full max-w-sm flex flex-col items-center text-center">
        <div className="size-16 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/20 mb-6">
          <Heart className="size-8 fill-current" />
        </div>
        <h1 className="text-3xl font-bold">So Love Krugersdorp</h1>
        <p className="text-muted-foreground mt-2 mb-10 text-sm">
          Enter your members-only access code to continue.
        </p>

        <form onSubmit={handleSubmit} className="w-full flex flex-col items-center gap-6">
          <InputOTP
            maxLength={6}
            value={code}
            onChange={setCode}
            pattern="^[A-Za-z0-9]*$"
            containerClassName="justify-center"
          >
            <InputOTPGroup>
              {Array.from({ length: 6 }).map((_, i) => (
                <InputOTPSlot
                  key={i}
                  index={i}
                  className="size-11 text-lg font-semibold uppercase"
                />
              ))}
            </InputOTPGroup>
          </InputOTP>

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={code.length < 6 || submitting}
          >
            Continue
          </Button>
        </form>

        <p className="text-xs text-muted-foreground mt-8">
          Don't have a code? Ask a staff member at So Love Krugersdorp.
        </p>
      </div>
    </main>
  );
}
