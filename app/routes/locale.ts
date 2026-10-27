import { data, redirect } from "react-router";

import { isLocale, localeCookie } from "~/i18n/config";

import type { Route } from "./+types/locale";

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const locale = form.get("locale");
  if (!isLocale(locale)) throw data("Unsupported locale", { status: 400 });

  const back = String(form.get("redirectTo") ?? "/");
  const target = back.startsWith("/") && !back.startsWith("//") ? back : "/";
  return redirect(target, { headers: { "Set-Cookie": localeCookie(locale) } });
}
