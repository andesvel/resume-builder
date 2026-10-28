import { TriangleAlertIcon } from "lucide-react";
import { useId } from "react";

import { TextField } from "../fields";
import { Label } from "~/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";
import { useI18n } from "~/i18n";
import { QR_MAX_COMFORTABLE_VERSION, qrMatrix, qrPayload, splitName } from "~/features/resume/qr";
import { type QrKind, qrKinds, type QrSettings, type Resume } from "~/features/resume/schema";
import { useEditor } from "~/features/resume/store";

/** QR code printed on the resume so whoever holds a paper copy can save, open or call. */
export function QrSection({ resume }: { resume: Resume }) {
  const { t } = useI18n();
  const update = useEditor((s) => s.update);
  const id = useId();
  const { qr, basics } = resume;
  const set = (patch: Partial<QrSettings>, checkpoint = true) => update((d) => void Object.assign(d.qr, patch), { checkpoint });

  const payload = qrPayload(resume);
  const dense = payload ? qrMatrix(payload).version > QR_MAX_COMFORTABLE_VERSION : false;
  const links = basics.links.filter((l) => l.url.trim());

  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-2">
        <Switch id={`${id}-on`} checked={qr.enabled} onCheckedChange={(enabled) => set({ enabled })} />
        <Label htmlFor={`${id}-on`}>{t("qr.enable")}</Label>
      </div>
      <p className="text-sm text-muted-foreground">{t("qr.hint")}</p>
      {qr.enabled ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor={`${id}-kind`}>{t("qr.kind")}</Label>
              <Select value={qr.kind} onValueChange={(kind) => set({ kind: kind as QrKind })}>
                <SelectTrigger id={`${id}-kind`} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {qrKinds.map((kind) => (
                    <SelectItem key={kind} value={kind}>
                      {t(`qr.kinds.${kind}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {qr.kind === "url" && links.length > 1 ? (
              <div className="grid gap-1.5">
                <Label htmlFor={`${id}-link`}>{t("qr.link")}</Label>
                <Select value={links.some((l) => l.id === qr.linkId) ? qr.linkId : links[0]?.id} onValueChange={(linkId) => set({ linkId })}>
                  <SelectTrigger id={`${id}-link`} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {links.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.label || l.url}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            {qr.kind === "vcard" ? (
              <TextField
                label={t("qr.familyName")}
                placeholder={splitName(basics.name, "", resume.locale).family || t("qr.familyNamePlaceholder")}
                value={qr.familyName}
                onChange={(familyName) => set({ familyName }, false)}
              />
            ) : null}
            {qr.kind === "email" ? (
              <TextField label={t("qr.subject")} placeholder={t("qr.subjectPlaceholder")} value={qr.subject} onChange={(subject) => set({ subject }, false)} />
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">{t(`qr.scans.${qr.kind}`)}</p>
          {!payload || dense ? (
            <p className="flex items-start gap-2 text-sm">
              <TriangleAlertIcon className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
              {payload ? t("qr.dense") : t(`qr.missing.${qr.kind}`)}
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
