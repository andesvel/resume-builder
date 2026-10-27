import { CpuIcon, Trash2Icon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { Progress } from "~/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Skeleton } from "~/components/ui/skeleton";
import { cachedBuildSizes, clearModelCaches, deleteCachedBuild } from "~/features/ai/engines.client";
import { recommendedModel, variantFor, webLlmModels } from "~/features/ai/models";
import { useAi } from "~/features/ai/store";
import { useI18n } from "~/i18n";

export function meta() {
  return [{ title: "Settings · Resume Builder" }];
}

const MEMORY_OPTIONS = [2, 4, 8, 16, 32, 64];

function formatBytes(bytes: number, locale: string) {
  const gb = bytes / 1024 ** 3;
  const value = gb >= 1 ? gb : bytes / 1024 ** 2;
  const unit = gb >= 1 ? "GB" : "MB";
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value)} ${unit}`;
}

/** Label for a cached build id: model name plus precision. */
function describeBuild(id: string, t: ReturnType<typeof useI18n>["t"]) {
  const model = webLlmModels.find((m) => m.f16[0] === id || m.f32[0] === id);
  if (!model) return id;
  return `${model.name} · ${t(model.f16[0] === id ? "settings.precision16" : "settings.precision32")}`;
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2 py-4 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-6">
      <div className="grid gap-0.5">
        <dt className="text-sm font-medium">{label}</dt>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      <dd className="text-sm sm:text-right">{children}</dd>
    </div>
  );
}

export default function Settings() {
  const { t, locale } = useI18n();
  const { availability, detected, device, gpu, overrides, status, cachedModels, detect, setOverrides, unload, refreshCache } = useAi();
  const [storage, setStorage] = useState<{ usage: number; quota: number } | null>(null);
  const [sizes, setSizes] = useState<Record<string, number>>({});

  const refreshStorage = useCallback(async () => {
    const [estimate, bytes] = await Promise.all([navigator.storage.estimate(), cachedBuildSizes().catch(() => ({}))]);
    setStorage({ usage: estimate.usage ?? 0, quota: estimate.quota ?? 0 });
    setSizes(bytes);
  }, []);

  useEffect(() => {
    if (!detected) void detect();
    void refreshStorage();
  }, [detected, detect, refreshStorage]);

  const afterDelete = async (message: string) => {
    await refreshCache();
    await refreshStorage();
    toast.success(message);
  };

  if (!detected || !device || !gpu || !availability) {
    return (
      <main className="mx-auto grid max-w-3xl gap-4 px-4 py-10">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-64" />
      </main>
    );
  }

  const memoryValue = overrides.memoryGB === null ? "auto" : String(overrides.memoryGB);
  const f16Value = overrides.f16 === null ? "auto" : overrides.f16 ? "yes" : "no";
  const detectedMemory = detected.memoryGB === null ? t("settings.unknown") : `${detected.memoryGB} GB`;
  const recommended = variantFor(recommendedModel(device, cachedModels), device);
  const chromeLabel = { ready: "settings.chromeReady", download: "settings.chromeDownload", unsupported: "settings.chromeNone" } as const;

  return (
    <main className="mx-auto grid max-w-3xl gap-12 px-4 py-10">
      <header className="grid gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t("settings.title")}</h1>
        <p className="text-muted-foreground">{t("settings.intro")}</p>
      </header>

      <section aria-labelledby="device-title" className="grid gap-2">
        <h2 id="device-title" className="text-xl font-semibold tracking-tight">{t("settings.deviceTitle")}</h2>
        <dl className="divide-y border-y">
          <Row label={t("settings.memory")} hint={`${t("settings.memoryHint")} ${t("settings.detectedValue", { value: detectedMemory })}`}>
            <Select value={memoryValue} onValueChange={(v) => setOverrides({ memoryGB: v === "auto" ? null : Number(v) })}>
              <SelectTrigger size="sm" className="w-48 sm:ml-auto" aria-label={t("settings.memory")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">{`${t("settings.useDetected")} (${detectedMemory})`}</SelectItem>
                {MEMORY_OPTIONS.map((gb) => (
                  <SelectItem key={gb} value={String(gb)}>{`${gb} GB`}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Row>
          <Row label={t("settings.gpu")}>
            {gpu.webgpu ? [gpu.vendor, gpu.architecture].filter(Boolean).join(" · ") || t("settings.yes") : t("settings.gpuNone")}
          </Row>
          <Row label={t("settings.f16")} hint={`${t("settings.f16Hint")} ${t("settings.detectedValue", { value: t(detected.f16 ? "settings.yes" : "settings.no") })}`}>
            <Select value={f16Value} onValueChange={(v) => setOverrides({ f16: v === "auto" ? null : v === "yes" })}>
              <SelectTrigger size="sm" className="w-48 sm:ml-auto" aria-label={t("settings.f16")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">{`${t("settings.useDetected")} (${t(detected.f16 ? "settings.yes" : "settings.no")})`}</SelectItem>
                <SelectItem value="yes">{t("settings.yes")}</SelectItem>
                <SelectItem value="no">{t("settings.no")}</SelectItem>
              </SelectContent>
            </Select>
          </Row>
          <Row label={t("settings.deviceType")}>{t(device.mobile ? "settings.mobile" : "settings.desktop")}</Row>
          <Row label={t("settings.chromeAi")}>{t(chromeLabel[availability.chrome])}</Row>
          <Row label={t("settings.recommended")}>{`${recommended.name} · ${formatBytes(recommended.sizeMB * 1024 ** 2, locale)}`}</Row>
        </dl>
      </section>

      <section aria-labelledby="model-title" className="grid gap-4">
        <h2 id="model-title" className="text-xl font-semibold tracking-tight">{t("settings.modelTitle")}</h2>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <CpuIcon className="size-4" aria-hidden />
            {status.kind === "ready" ? t("settings.modelLoaded", { model: status.engine.label }) : t("settings.modelNone")}
          </p>
          <Button
            variant="outline"
            size="sm"
            disabled={status.kind !== "ready"}
            onClick={() => {
              unload();
              toast.success(t("settings.unloaded"));
            }}
          >
            {t("settings.unload")}
          </Button>
        </div>
      </section>

      <section aria-labelledby="cache-title" className="grid gap-4">
        <h2 id="cache-title" className="text-xl font-semibold tracking-tight">{t("settings.cacheTitle")}</h2>
        {storage && storage.quota > 0 ? (
          <div className="grid gap-2">
            <Progress value={(storage.usage / storage.quota) * 100} aria-label={t("settings.cacheTitle")} />
            <p className="text-xs text-muted-foreground">
              {t("settings.storageUsed", { used: formatBytes(storage.usage, locale), quota: formatBytes(storage.quota, locale) })}
            </p>
          </div>
        ) : null}
        {cachedModels.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("settings.cacheEmpty")}</p>
        ) : (
          <ul className="divide-y border-y">
            {cachedModels.map((id) => (
              <li key={id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <span>
                  {describeBuild(id, t)}
                  {sizes[id] ? <span className="text-muted-foreground"> · {formatBytes(sizes[id], locale)}</span> : null}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    if (status.kind === "ready") unload();
                    await deleteCachedBuild(id);
                    await afterDelete(t("settings.deleted", { model: describeBuild(id, t) }));
                  }}
                >
                  <Trash2Icon /> {t("settings.deleteModel")}
                </Button>
              </li>
            ))}
          </ul>
        )}
        {cachedModels.length > 0 ? (
          <Button
            variant="outline"
            size="sm"
            className="justify-self-start"
            onClick={async () => {
              unload();
              await clearModelCaches();
              await afterDelete(t("settings.deletedAll"));
            }}
          >
            {t("settings.deleteAll")}
          </Button>
        ) : null}
      </section>
    </main>
  );
}
