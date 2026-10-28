import { TriangleAlertIcon } from "lucide-react";
import { useId } from "react";

import { TextField } from "../fields";
import { Label } from "~/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";
import { useI18n } from "~/i18n";
import { needsRegion, type PhoneRegion, phoneRegionIds, phoneRegions } from "~/features/resume/phone";
import { QR_MAX_COMFORTABLE_VERSION, qrMatrix, qrPayload, splitName, whatsappUrl } from "~/features/resume/qr";
import { type QrKind, qrKinds, type QrSettings, type Resume, type WhatsappSource, whatsappSources } from "~/features/resume/schema";
import { useEditor } from "~/features/resume/store";

/** QR code printed on the resume so whoever holds a paper copy can save, open or call. */
export function QrSection({ resume }: { resume: Resume }) {
  const { t, locale } = useI18n();
  const update = useEditor((s) => s.update);
  const id = useId();
  const { qr, basics } = resume;
  const set = (patch: Partial<QrSettings>, checkpoint = true) => update((d) => void Object.assign(d.qr, patch), { checkpoint });

  const payload = qrPayload(resume);
  const dense = payload ? qrMatrix(payload).version > QR_MAX_COMFORTABLE_VERSION : false;
  const links = basics.links.filter((l) => l.url.trim());

  // WhatsApp rides along in the vCard and is the whole point of the "whatsapp" kind.
  const withWhatsapp = qr.kind === "vcard" || qr.kind === "whatsapp";
  const source: WhatsappSource = qr.kind === "whatsapp" && qr.whatsapp === "off" ? "phone" : qr.whatsapp;
  const sources = qr.kind === "whatsapp" ? whatsappSources.filter((s) => s !== "off") : whatsappSources;
  // Numbers that end up in the code and were written without a country code.
  const numbers = [
    (qr.kind === "phone" || qr.kind === "vcard" || (withWhatsapp && source === "phone")) && basics.phone,
    withWhatsapp && source === "number" && qr.whatsappNumber,
  ].filter((n): n is string => Boolean(n));
  const askRegion = numbers.some(needsRegion);
  // The vCard still works without WhatsApp, so say why the link went missing.
  const whatsappDropped = qr.kind === "vcard" && source !== "off" && Boolean(payload) && !whatsappUrl(resume);
  const regionName = new Intl.DisplayNames([locale], { type: "region" });

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
            {qr.kind === "whatsapp" ? (
              <TextField label={t("qr.message")} placeholder={t("qr.messagePlaceholder")} value={qr.whatsappMessage} onChange={(whatsappMessage) => set({ whatsappMessage }, false)} />
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">{t(`qr.scans.${qr.kind}`)}</p>
          {withWhatsapp ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor={`${id}-wa`}>{t("qr.whatsapp")}</Label>
                <Select value={source} onValueChange={(whatsapp) => set({ whatsapp: whatsapp as WhatsappSource })}>
                  <SelectTrigger id={`${id}-wa`} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sources.map((s) => (
                      <SelectItem key={s} value={s}>
                        {t(`qr.whatsappSources.${s}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {source === "number" ? (
                <TextField label={t("qr.whatsappNumber")} type="tel" placeholder="+52 55 1234 5678" value={qr.whatsappNumber} onChange={(whatsappNumber) => set({ whatsappNumber }, false)} />
              ) : null}
              {source === "username" ? (
                <TextField label={t("qr.whatsappUsername")} placeholder="@usuario" value={qr.whatsappUsername} onChange={(whatsappUsername) => set({ whatsappUsername }, false)} />
              ) : null}
            </div>
          ) : null}
          {withWhatsapp && source === "username" ? <p className="text-sm text-muted-foreground">{t("qr.usernameHint")}</p> : null}
          {askRegion ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor={`${id}-region`}>{t("qr.region")}</Label>
                <Select value={qr.phoneRegion ?? ""} onValueChange={(phoneRegion) => set({ phoneRegion: phoneRegion as PhoneRegion })}>
                  <SelectTrigger id={`${id}-region`} className="w-full">
                    <SelectValue placeholder={t("qr.regionPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {phoneRegionIds.map((r) => (
                      <SelectItem key={r} value={r}>
                        {regionName.of(r)} (+{phoneRegions[r]})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}
          {[
            !payload && t(`qr.missing.${qr.kind}`),
            whatsappDropped && t(askRegion && !qr.phoneRegion ? "qr.whatsappNeedsRegion" : "qr.whatsappMissing"),
            dense && t("qr.dense"),
          ]
            .filter(Boolean)
            .map((warning) => (
              <p key={warning as string} className="flex items-start gap-2 text-sm">
                <TriangleAlertIcon className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
                {warning}
              </p>
            ))}
        </>
      ) : null}
    </div>
  );
}
