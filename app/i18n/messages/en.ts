export const en = {
  app: {
    name: "Resume Builder",
    tagline: "Tell it who you are. Get a clean, ATS-friendly resume. Everything stays in your browser.",
  },
  common: {
    language: "Language",
    theme: "Theme",
    light: "Light",
    dark: "Dark",
    system: "System",
    cancel: "Cancel",
    save: "Save",
    delete: "Delete",
    add: "Add",
    remove: "Remove",
    close: "Close",
    undo: "Undo",
    back: "Back",
    loading: "Loading…",
  },
};

type Widen<T> = { [K in keyof T]: T[K] extends string ? string : Widen<T[K]> };
export type Messages = Widen<typeof en>;
