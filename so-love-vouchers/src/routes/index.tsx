import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { shouldOfferInstall } from "@/lib/pwa-install";

export const Route = createFileRoute("/")({
  component: Entry,
});

/**
 * The entry hop. This used to be a `beforeLoad` redirect, but the install offer
 * depends on `display-mode` and localStorage — neither of which exists during
 * SSR — so the decision has to happen on the client. The static preloader is
 * still covering the screen while this runs, so nothing flashes.
 */
function Entry() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate({ to: shouldOfferInstall() ? "/install" : "/app/events", replace: true });
  }, [navigate]);

  return null;
}
