import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <main className="atelier-error min-h-dvh px-5 py-8 sm:px-8">
      <div className="mx-auto grid min-h-[calc(100dvh-4rem)] w-full max-w-6xl overflow-hidden border border-border-strong lg:grid-cols-[1.15fr_0.85fr]">
        <section className="relative flex min-h-[54dvh] items-center justify-center overflow-hidden bg-ink text-paper">
          <span className="absolute left-5 top-5 text-[10px] uppercase tracking-[0.28em] text-paper/60">
            Arquivo ausente · 404
          </span>
          <div className="hanger-scene" aria-hidden="true">
            <svg viewBox="0 0 420 300" className="h-full w-full" fill="none">
              <path
                d="M210 54c0-24 37-28 41-5 3 19-18 23-26 36"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <path
                d="M225 85 73 201c-14 11-6 34 12 34h250c18 0 26-23 12-34L225 85Z"
                stroke="currentColor"
                strokeWidth="3"
              />
              <path
                d="M132 190c45 17 111 17 157 0"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray="7 10"
                opacity=".45"
              />
            </svg>
            <span className="hanger-ticket">peça fora do acervo</span>
          </div>
          <span className="absolute bottom-4 right-5 font-display text-[clamp(7rem,23vw,15rem)] leading-none text-paper/[0.07]">
            04
          </span>
        </section>
        <section className="flex flex-col justify-between bg-paper p-7 text-ink sm:p-12">
          <div className="flex items-center justify-between border-b border-ink/20 pb-4 text-[10px] uppercase tracking-[0.26em]">
            <span>AuraFit</span>
            <span>Acervo digital</span>
          </div>
          <div className="my-14 max-w-md">
            <p className="editorial-kicker">A etiqueta existe. O caminho, não.</p>
            <h1 className="mt-5 font-display text-[clamp(3.2rem,8vw,6.4rem)] leading-[0.82] tracking-[-0.055em]">
              Esta peça saiu de cena.
            </h1>
            <p className="mt-7 max-w-sm text-sm leading-7 text-ink/65">
              Volte ao provador e continue montando seu próximo look.
            </p>
          </div>
          <Link to="/" className="atelier-button w-fit">
            Voltar ao provador <span aria-hidden="true">↗</span>
          </Link>
        </section>
      </div>
    </main>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="atelier-error flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-xl border border-border-strong bg-paper p-8 text-ink sm:p-12">
        <p className="editorial-kicker">Interrupção no ateliê</p>
        <h1 className="mt-5 font-display text-5xl leading-none tracking-[-0.04em]">
          O look parou no meio.
        </h1>
        <p className="mt-5 max-w-md text-sm leading-7 text-ink/65">
          Nada foi perdido. Retome a experiência em alguns instantes.
        </p>
        <div className="mt-8 flex gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="atelier-button"
          >
            Tentar novamente
          </button>
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
      { name: "theme-color", content: "#f1ede3" },
      { title: "AuraFit — Provador Virtual White Label para lojas de moda" },
      {
        name: "description",
        content:
          "Experimente qualquer peça em segundos. Provador virtual com IA para lojas físicas, e-commerce, WhatsApp e QR Code.",
      },
      {
        property: "og:title",
        content: "AuraFit — Provador Virtual White Label para lojas de moda",
      },
      {
        property: "og:description",
        content:
          "Experimente qualquer peça em segundos. Provador virtual com IA para lojas físicas, e-commerce, WhatsApp e QR Code.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "twitter:title",
        content: "AuraFit — Provador Virtual White Label para lojas de moda",
      },
      {
        name: "twitter:description",
        content:
          "Experimente qualquer peça em segundos. Provador virtual com IA para lojas físicas, e-commerce, WhatsApp e QR Code.",
      },
      {
        property: "og:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/e6e3f549-88a3-47d0-9a84-2913c7dd43b5/id-preview-6018b807--1799764f-dd57-46fd-9a35-3d361f490bf1.lovable.app-1783202699455.png",
      },
      {
        name: "twitter:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/e6e3f549-88a3-47d0-9a84-2913c7dd43b5/id-preview-6018b807--1799764f-dd57-46fd-9a35-3d361f490bf1.lovable.app-1783202699455.png",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=IBM+Plex+Sans:wght@400;500;600&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
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
      <Outlet />
    </QueryClientProvider>
  );
}
