import { createContext, useContext, useMemo } from "react";

import type { Locale } from "./config";
import { en, type Messages } from "./messages/en";
import { es } from "./messages/es";

export const dictionaries: Record<Locale, Messages> = { en, es };

type Join<K, P> = K extends string ? (P extends string ? `${K}.${P}` : never) : never;
type Paths<T> = { [K in keyof T]: T[K] extends string ? K : Join<K, Paths<T[K]>> }[keyof T];
export type MessageKey = Paths<Messages>;
export type Params = Record<string, string | number>;

export function translate(messages: Messages, key: MessageKey, params?: Params): string {
  let node: unknown = messages;
  for (const part of key.split(".")) node = (node as Record<string, unknown>)[part];
  const text = typeof node === "string" ? node : key;
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? `{${name}}`));
}

export type TFunction = (key: MessageKey, params?: Params) => string;

export function getT(locale: Locale): TFunction {
  const messages = dictionaries[locale];
  return (key, params) => translate(messages, key, params);
}

const I18nContext = createContext<{ locale: Locale; t: TFunction } | null>(null);

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const value = useMemo(() => ({ locale, t: getT(locale) }), [locale]);
  return <I18nContext value={value}>{children}</I18nContext>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}
