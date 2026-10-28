import { ArrowLeftIcon, CheckIcon, CircleAlertIcon, DownloadIcon, LoaderIcon, Redo2Icon, Trash2Icon, Undo2Icon } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";

import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Input } from "~/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";
import type { Resume } from "~/features/resume/schema";
import { getResumeRepository } from "~/features/resume/repository";
import { cancelPendingSave, useEditor } from "~/features/resume/store";
import { exportResumeJson } from "~/features/resume/transfer";
import { useI18n } from "~/i18n";
import { isLocale } from "~/i18n/config";

export function SaveStatus() {
  const { t } = useI18n();
  const saving = useEditor((s) => s.saving);
  if (saving === "idle") return null;
  const map = {
    pending: { icon: <LoaderIcon className="size-3.5 animate-spin" />, label: t("editor.saving"), className: "text-muted-foreground" },
    saved: { icon: <CheckIcon className="size-3.5" />, label: t("editor.saved"), className: "text-emerald-600 dark:text-emerald-400" },
    error: { icon: <CircleAlertIcon className="size-3.5" />, label: t("editor.saveError"), className: "text-red-600 dark:text-red-400" },
  } as const;
  const { icon, label, className } = map[saving];
  return (
    <span role="status" className={`hidden items-center gap-1 text-xs sm:flex ${className}`}>
      {icon} {label}
    </span>
  );
}

function IconAction({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={label} onClick={onClick} disabled={disabled}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

/** Title, history and export controls. `exportItems` lets later features add formats. */
export function EditorToolbar({ resume, exportItems }: { resume: Resume; exportItems?: React.ReactNode }) {
  const { t } = useI18n();
  const update = useEditor((s) => s.update);
  const undo = useEditor((s) => s.undo);
  const redo = useEditor((s) => s.redo);
  const canUndo = useEditor((s) => s.past.length > 0);
  const canRedo = useEditor((s) => s.future.length > 0);
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const remove = async () => {
    cancelPendingSave();
    await getResumeRepository().delete(resume.id);
    navigate("/resumes", { viewTransition: true });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="ghost" size="icon" asChild aria-label={t("common.back")}>
        <Link to="/resumes" viewTransition>
          <ArrowLeftIcon />
        </Link>
      </Button>
      <Input
        aria-label={t("editor.title")}
        className="h-8 max-w-64 border-transparent bg-transparent font-medium shadow-none hover:border-input focus-visible:border-ring"
        value={resume.title}
        onChange={(e) => update((d) => void (d.title = e.target.value))}
      />
      <SaveStatus />
      <div className="ml-auto flex items-center gap-1">
        <IconAction label={t("common.undo")} onClick={undo} disabled={!canUndo}>
          <Undo2Icon />
        </IconAction>
        <IconAction label={t("editor.redo")} onClick={redo} disabled={!canRedo}>
          <Redo2Icon />
        </IconAction>
        <Select value={resume.locale} onValueChange={(v) => isLocale(v) && update((d) => void (d.locale = v), { checkpoint: true })}>
          <SelectTrigger size="sm" aria-label={t("editor.resumeLanguage")} className="w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en">EN</SelectItem>
            <SelectItem value="es">ES</SelectItem>
          </SelectContent>
        </Select>
        <IconAction label={t("common.delete")} onClick={() => setConfirmDelete(true)}>
          <Trash2Icon />
        </IconAction>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm">
              <DownloadIcon /> {t("editor.export")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {exportItems}
            <DropdownMenuItem onSelect={() => exportResumeJson(resume)}>{t("editor.exportJson")}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("home.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("home.deleteBody", { title: resume.title })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={remove}>
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
