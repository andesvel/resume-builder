import { useId } from "react";

import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { useI18n } from "~/i18n";
import { cn } from "~/lib/utils";

interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "email" | "tel" | "url";
  className?: string;
}

export function TextField({ label, value, onChange, placeholder, type = "text", className }: FieldProps) {
  const id = useId();
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export function TextAreaField({ label, value, onChange, placeholder, className, rows = 4 }: FieldProps & { rows?: number }) {
  const id = useId();
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      <Textarea id={id} rows={rows} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

const DATE_RE = /^(\d{4}(-(0[1-9]|1[0-2]))?)?$/;

/** Partial date (YYYY or YYYY-MM). Invalid input is kept locally and not committed. */
export function DateField({ label, value, onChange, disabled }: Omit<FieldProps, "type" | "placeholder"> & { disabled?: boolean }) {
  const { t } = useI18n();
  const id = useId();
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        inputMode="numeric"
        placeholder={t("editor.datePlaceholder")}
        title={t("editor.dateHint")}
        defaultValue={value}
        key={value}
        disabled={disabled}
        onBlur={(e) => {
          const next = e.target.value.trim();
          if (DATE_RE.test(next)) onChange(next);
          else e.target.setAttribute("aria-invalid", "true");
        }}
        onChange={(e) => {
          e.target.removeAttribute("aria-invalid");
          const next = e.target.value.trim();
          if (next === "" || /^\d{4}(-(0[1-9]|1[0-2]))?$/.test(next)) onChange(next);
        }}
      />
    </div>
  );
}

/** Edits a string[] as one item per line. Empty lines are dropped. */
export function LinesField({ label, value, onChange, rows = 4 }: { label: string; value: string[]; onChange: (v: string[]) => void; rows?: number }) {
  const { t } = useI18n();
  return (
    <TextAreaField
      label={label}
      rows={rows}
      placeholder={t("editor.onePerLine")}
      value={value.join("\n")}
      onChange={(text) => onChange(text.split("\n").map((l) => l.replace(/^\s*[-•*]\s*/, "")).filter((l, i, all) => l.trim() || i === all.length - 1))}
    />
  );
}

/** Edits a string[] as a comma-separated list. */
export function TagsField({ label, value, onChange }: { label: string; value: string[]; onChange: (v: string[]) => void }) {
  const { t } = useI18n();
  return (
    <TextField
      label={label}
      placeholder={t("editor.commaSeparated")}
      value={value.join(", ")}
      onChange={(text) => onChange(text.split(",").map((s, i, all) => (i === all.length - 1 ? s.trimStart() : s.trim())).filter((s, i, all) => s || i === all.length - 1))}
    />
  );
}
