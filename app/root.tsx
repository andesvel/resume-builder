import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteLoaderData,
} from "react-router";

import { SiteFooter } from "~/components/layout/site-footer";
import { SiteHeader } from "~/components/layout/site-header";
import { Toaster } from "~/components/ui/sonner";
import { TooltipProvider } from "~/components/ui/tooltip";
import { resolveLocale } from "~/i18n/config";
import { I18nProvider } from "~/i18n";
import { themeScript } from "~/lib/theme";

import type { Route } from "./+types/root";
import "./app.css";

export function loader({ request }: Route.LoaderArgs) {
  return { locale: resolveLocale(request) };
}

export function Layout({ children }: { children: React.ReactNode }) {
  const data = useRouteLoaderData<typeof loader>("root");
  return (
    <html lang={data?.locale ?? "en"} suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <Meta />
        <Links />
      </head>
      <body className="min-h-dvh bg-background text-foreground antialiased">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App({ loaderData }: Route.ComponentProps) {
  return (
    <I18nProvider locale={loaderData.locale}>
      <TooltipProvider delayDuration={300}>
        <div className="flex min-h-dvh flex-col">
          <SiteHeader />
          <div className="flex-1">
            <Outlet />
          </div>
          <SiteFooter />
        </div>
        <Toaster position="bottom-right" />
      </TooltipProvider>
    </I18nProvider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details = error.status === 404 ? "The requested page could not be found." : error.statusText || details;
  } else if (import.meta.env.DEV && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="container mx-auto p-4 pt-16">
      <h1 className="text-2xl font-semibold">{message}</h1>
      <p className="text-muted-foreground">{details}</p>
      {stack && (
        <pre className="w-full overflow-x-auto p-4 text-xs">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
