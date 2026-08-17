import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { ACCESS_CODE, grantAccess, hasAccess } from "@/lib/access-code";
import { shouldOfferInstall } from "@/lib/pwa-install";
import { toast } from "sonner";
import {} from "lucide-react";
import { BrandHeart } from "@/components/brand-heart";

export const Route = createFileRoute("/access-code")({
  component: AccessCodePage,
});

function AccessCodePage() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (hasAccess()) {
      navigate({ to: "/login" });
      return;
    }
    // A shared link lands here without passing the entry hop, so offer the
    // install page once first. /install marks itself seen, so this can't loop.
    if (shouldOfferInstall()) navigate({ to: "/install", replace: true });
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
          <BrandHeart className="size-8" />
        </div>
        <p className="text-[11px] uppercase tracking-[0.22em] text-primary font-semibold mb-2">
          Members only
        </p>
        <h1 className="text-3xl font-bold">So Love Krugersdorp</h1>
        <p className="text-muted-foreground mt-2 mb-10 text-sm">
          Enter your access code to step inside.
        </p>

        <form onSubmit={handleSubmit} className="w-full flex flex-col items-center gap-6">
          {/* input-otp defaults to inputMode="numeric", which gives mobile a digits-only
              keypad - the letters in the code can't be typed. Force a text keyboard. */}
          <InputOTP
            maxLength={ACCESS_CODE.length}
            value={code}
            onChange={(v) => setCode(v.toUpperCase())}
            pattern="^[A-Za-z0-9]*$"
            inputMode="text"
            autoComplete="off"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="go"
            containerClassName="justify-center"
          >
            <InputOTPGroup>
              {Array.from({ length: ACCESS_CODE.length }).map((_, i) => (
                <InputOTPSlot
                  key={i}
                  index={i}
                  className="size-9 text-lg font-serial font-semibold uppercase"
                />
              ))}
            </InputOTPGroup>
          </InputOTP>

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={code.length < ACCESS_CODE.length || submitting}
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
