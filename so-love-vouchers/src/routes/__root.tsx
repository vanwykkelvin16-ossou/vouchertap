import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth-context";

import appCss from "../styles.css?url";

// Critical, inline preloader styles — injected into <head> so the overlay is
// fully styled on the very first paint, before the external stylesheet loads.
// App content stays hidden until the fade completes (html.app-ready) so fixed
// mobile nav/footer cannot flash through the semi-transparent overlay.
// Fixed px logo — vw/aspect-ratio/transform centering all resize after paint and cause jump.
const PRELOADER_LOGO_W = 280;
const PRELOADER_LOGO_H = 161;

const PRELOADER_INNER_HTML = `<div class="slk-backdrop" style="position:absolute;inset:0;background:#ffffff;z-index:0;margin:0;padding:0"></div><img class="slk-logo" src="/preloader-logo.png" alt="So Love Krugersdorp" width="${PRELOADER_LOGO_W}" height="${PRELOADER_LOGO_H}" decoding="sync" fetchpriority="high" style="position:relative;z-index:1;width:${PRELOADER_LOGO_W}px;height:${PRELOADER_LOGO_H}px;margin:0;padding:0;border:0;display:block;object-fit:contain;flex-shrink:0" />`;

const PRELOADER_SHELL_STYLE = {
  position: "fixed",
  inset: 0,
  zIndex: 2147483647,
  display: "grid",
  placeItems: "center",
  overflow: "hidden",
  margin: 0,
  padding: 0,
  background: "#ffffff",
} as const;

const PRELOADER_CSS = `
html,body{background:#ffffff!important}
html:not(.app-ready){overflow:hidden!important}
html:not(.app-ready) body>*:not(#app-preloader):not(script){visibility:hidden!important;opacity:0!important;pointer-events:none!important}
#app-preloader{position:fixed!important;inset:0!important;z-index:2147483647!important;display:grid!important;place-items:center!important;opacity:1;visibility:visible;transition:opacity .4s ease,visibility 0s linear .4s;pointer-events:auto;overflow:hidden!important;margin:0!important;padding:0!important;background:#ffffff!important}
#app-preloader.is-hidden{opacity:0!important;pointer-events:none!important;visibility:hidden!important}
#app-preloader .slk-backdrop{position:absolute!important;inset:0!important;background:#ffffff!important;z-index:0!important;margin:0!important;padding:0!important}
#app-preloader .slk-logo{position:relative!important;top:auto!important;left:auto!important;right:auto!important;bottom:auto!important;transform:none!important;width:${PRELOADER_LOGO_W}px!important;height:${PRELOADER_LOGO_H}px!important;min-width:${PRELOADER_LOGO_W}px!important;min-height:${PRELOADER_LOGO_H}px!important;max-width:${PRELOADER_LOGO_W}px!important;max-height:${PRELOADER_LOGO_H}px!important;object-fit:contain!important;z-index:1!important;pointer-events:none!important;margin:0!important;padding:0!important;border:0!important;transition:none!important;flex-shrink:0!important}
`;

// Fade on DOMContentLoaded (not window.load) so fonts/images cannot block handoff.
// Never set opacity inline — that would override .is-hidden and stick the overlay.
const PRELOADER_JS = `
(function(){
  var el=document.getElementById('app-preloader');
  if(!el)return;
  var MIN=450,start=Date.now(),done=false,revealed=false;
  function reveal(){
    if(revealed)return;
    revealed=true;
    document.documentElement.classList.add('app-ready');
  }
  function hide(){
    if(done)return;
    done=true;
    var onEnd=function(e){
      if(e.target===el&&e.propertyName==='opacity'){
        el.removeEventListener('transitionend',onEnd);
        reveal();
      }
    };
    el.addEventListener('transitionend',onEnd);
    el.classList.add('is-hidden');
    setTimeout(reveal,500);
  }
  function schedule(){var w=MIN-(Date.now()-start);setTimeout(hide,w>0?w:0);}
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',schedule,{once:true});
  }else{
    schedule();
  }
  setTimeout(hide,3000);
})();
`;

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "So Love Krugersdorp" },
      {
        name: "description",
        content: "Members-only vouchers and upcoming events for So Love Krugersdorp.",
      },
      { name: "theme-color", content: "#e11d2a" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "So Love" },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "So Love Krugersdorp" },
      { property: "og:description", content: "So Love Vouchers is a PWA for clients to view and claim exclusive digital vouchers and event information." },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "So Love Krugersdorp" },
      { name: "description", content: "So Love Vouchers is a PWA for clients to view and claim exclusive digital vouchers and event information." },
      { name: "twitter:description", content: "So Love Vouchers is a PWA for clients to view and claim exclusive digital vouchers and event information." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/35963f43-f843-40cb-90c2-52a42c828c6b/id-preview-8725291a--e813bc15-1aea-4b15-bb90-5a96c13b072f.lovable.app-1779875469542.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/35963f43-f843-40cb-90c2-52a42c828c6b/id-preview-8725291a--e813bc15-1aea-4b15-bb90-5a96c13b072f.lovable.app-1779875469542.png" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "preload", as: "image", href: "/preloader-logo.png", fetchPriority: "high" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", type: "image/png", href: "/icon-512.png" },
      { rel: "apple-touch-icon", href: "/icon-512.png" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700&family=Inter:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <style dangerouslySetInnerHTML={{ __html: PRELOADER_CSS }} />
        <HeadContent />
      </head>
      <body suppressHydrationWarning>
        <div
          id="app-preloader"
          aria-hidden="true"
          suppressHydrationWarning
          style={PRELOADER_SHELL_STYLE}
          dangerouslySetInnerHTML={{ __html: PRELOADER_INNER_HTML }}
        />
        <script dangerouslySetInnerHTML={{ __html: PRELOADER_JS }} />
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
        <Toaster richColors position="top-center" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
