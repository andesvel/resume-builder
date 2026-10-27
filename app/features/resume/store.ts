import { type Draft, produce } from "immer";
import { create } from "zustand";

import { getResumeRepository } from "./repository";
import type { Resume } from "./schema";

const HISTORY_LIMIT = 100;
/** Edits closer together than this collapse into one undo step (e.g. typing). */
const COALESCE_MS = 800;
const AUTOSAVE_MS = 500;

type Recipe = (draft: Draft<Resume>) => void;

interface EditorState {
  resume: Resume | null;
  past: Resume[];
  future: Resume[];
  lastEditAt: number;
  saving: "idle" | "pending" | "saved" | "error";
  load: (resume: Resume) => void;
  /** Apply an edit. `checkpoint` forces a separate undo step (e.g. an AI merge). */
  update: (recipe: Recipe, options?: { checkpoint?: boolean }) => void;
  replace: (resume: Resume) => void;
  undo: () => void;
  redo: () => void;
}

export const useEditor = create<EditorState>()((set, get) => ({
  resume: null,
  past: [],
  future: [],
  lastEditAt: 0,
  saving: "idle",

  load: (resume) => set({ resume, past: [], future: [], lastEditAt: 0, saving: "idle" }),

  update: (recipe, options) => {
    const { resume, past, lastEditAt } = get();
    if (!resume) return;
    const next = produce(resume, (draft) => {
      recipe(draft);
      draft.updatedAt = new Date().toISOString();
    });
    const now = Date.now();
    const coalesce = !options?.checkpoint && now - lastEditAt < COALESCE_MS && past.length > 0;
    set({
      resume: next,
      past: coalesce ? past : [...past, resume].slice(-HISTORY_LIMIT),
      future: [],
      lastEditAt: options?.checkpoint ? 0 : now,
    });
  },

  replace: (resume) => get().update((draft) => Object.assign(draft, resume), { checkpoint: true }),

  undo: () => {
    const { resume, past, future } = get();
    const previous = past.at(-1);
    if (!resume || !previous) return;
    set({ resume: previous, past: past.slice(0, -1), future: [resume, ...future], lastEditAt: 0 });
  },

  redo: () => {
    const { resume, past, future } = get();
    const [next, ...rest] = future;
    if (!resume || !next) return;
    set({ resume: next, past: [...past, resume], future: rest, lastEditAt: 0 });
  },
}));

let timer: ReturnType<typeof setTimeout> | undefined;

/** Drop a scheduled save (e.g. right before deleting the resume, so it isn't written back). */
export function cancelPendingSave() {
  clearTimeout(timer);
  timer = undefined;
}

/** Persist the open resume shortly after every change. Returns an unsubscribe. */
export function startAutosave(): () => void {
  const unsubscribe = useEditor.subscribe((state, prev) => {
    if (!state.resume || state.resume === prev.resume || !prev.resume) return;
    if (state.resume.id !== prev.resume.id) return;
    clearTimeout(timer);
    useEditor.setState({ saving: "pending" });
    const snapshot = state.resume;
    timer = setTimeout(() => {
      getResumeRepository()
        .save(snapshot)
        .then(() => useEditor.setState({ saving: "saved" }))
        .catch(() => useEditor.setState({ saving: "error" }));
    }, AUTOSAVE_MS);
  });
  return () => {
    clearTimeout(timer);
    unsubscribe();
  };
}
