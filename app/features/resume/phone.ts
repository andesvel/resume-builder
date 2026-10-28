/**
 * Calling codes offered when a phone number is written without its country
 * code. Latin America first (the main audience), then common destinations.
 * Several regions share +1, so the stored value is the region, not the code.
 */
export const phoneRegions = {
  AR: "54", BO: "591", BR: "55", CL: "56", CO: "57", CR: "506", CU: "53", DO: "1", EC: "593", SV: "503",
  GT: "502", HN: "504", MX: "52", NI: "505", PA: "507", PY: "595", PE: "51", PR: "1", UY: "598", VE: "58",
  ES: "34", US: "1", CA: "1", PT: "351", FR: "33", DE: "49", IT: "39", GB: "44",
} as const;

export type PhoneRegion = keyof typeof phoneRegions;
export const phoneRegionIds = Object.keys(phoneRegions) as [PhoneRegion, ...PhoneRegion[]];

/**
 * International form of a phone number as digits only ("525512345678"), or
 * null when it has no country code and no region was chosen.
 * "+52 55 …" and "0052 55 …" carry their own code; otherwise the region's code
 * is prefixed and national leading zeros dropped ("0412 …" in Venezuela).
 */
export function internationalDigits(phone: string, region: string): string | null {
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;
  if (trimmed.startsWith("+")) return digits;
  if (digits.startsWith("00")) return digits.slice(2);
  const code = phoneRegions[region as PhoneRegion];
  return code ? `${code}${digits.replace(/^0+/, "")}` : null;
}

/** Whether a number needs a region to become international. */
export function needsRegion(phone: string): boolean {
  const trimmed = phone.trim();
  return /\d/.test(trimmed) && !trimmed.startsWith("+") && !trimmed.replace(/\D/g, "").startsWith("00");
}

/** For tel: links: "+525512345678" when the country is known, the local digits otherwise. */
export function dialable(phone: string, region: string): string {
  const intl = internationalDigits(phone, region);
  return intl ? `+${intl}` : phone.replace(/\D/g, "");
}

/** WhatsApp username as wa.me expects it: no "@", no spaces. */
export function whatsappUsername(value: string): string {
  return value.trim().replace(/^@+/, "").replace(/\s+/g, "");
}
