import { useState } from "react";
import { ChevronDownIcon, ChevronUpIcon, PlusIcon, Trash2Icon } from "lucide-react";

import { Button } from "~/components/ui/button";
import { useI18n } from "~/i18n";

interface EntryListProps<T extends { id: string }> {
  items: T[];
  onChange: (items: T[]) => void;
  create: () => T;
  /** Short label for the collapsed header of an entry. */
  summarize: (item: T) => string;
  children: (item: T, update: (patch: Partial<T>) => void) => React.ReactNode;
  addLabel?: string;
}

/** Reorderable list of entries, each rendered as a collapsible card. */
export function EntryList<T extends { id: string }>({ items, onChange, create, summarize, children, addLabel }: EntryListProps<T>) {
  const { t } = useI18n();

  const move = (index: number, delta: number) => {
    const next = [...items];
    const [item] = next.splice(index, 1);
    if (item) next.splice(index + delta, 0, item);
    onChange(next);
  };

  return (
    <div className="grid gap-3">
      {items.map((item, index) => (
        <EntryCard
          key={item.id}
          title={summarize(item)}
          first={index === 0}
          last={index === items.length - 1}
          onMove={(delta) => move(index, delta)}
          onRemove={() => onChange(items.filter((i) => i.id !== item.id))}
        >
          {children(item, (patch) => onChange(items.map((i) => (i.id === item.id ? { ...i, ...patch } : i))))}
        </EntryCard>
      ))}
      <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={() => onChange([...items, create()])}>
        <PlusIcon /> {addLabel ?? t("editor.addEntry")}
      </Button>
    </div>
  );
}

interface EntryCardProps {
  title: string;
  first: boolean;
  last: boolean;
  onMove: (delta: number) => void;
  onRemove: () => void;
  children: React.ReactNode;
}

function EntryCard({ title, first, last, onMove, onRemove, children }: EntryCardProps) {
  const { t } = useI18n();
  // New (empty) entries start expanded; the state is owned here so typing never collapses it.
  const [open, setOpen] = useState(() => !title);
  const stop = (fn: () => void) => (e: React.MouseEvent) => {
    e.preventDefault();
    fn();
  };

  return (
    <details className="group rounded-lg border bg-card" open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm">
        <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
        <span className="flex-1 truncate font-medium">{title || "—"}</span>
        <Button type="button" variant="ghost" size="icon-sm" aria-label={t("editor.moveUp")} disabled={first} onClick={stop(() => onMove(-1))}>
          <ChevronUpIcon />
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" aria-label={t("editor.moveDown")} disabled={last} onClick={stop(() => onMove(1))}>
          <ChevronDownIcon />
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" aria-label={t("common.remove")} onClick={stop(onRemove)}>
          <Trash2Icon />
        </Button>
      </summary>
      <div className="grid gap-3 border-t p-3">{children}</div>
    </details>
  );
}
