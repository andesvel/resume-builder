import { beforeEach, describe, expect, it } from "vitest";

import { createResume } from "./factory";
import { useEditor } from "./store";

describe("editor store", () => {
  beforeEach(() => useEditor.getState().load(createResume({ basics: { name: "A" } })));

  it("coalesces rapid edits into one undo step", () => {
    const { update } = useEditor.getState();
    update((d) => void (d.basics.name = "AB"));
    update((d) => void (d.basics.name = "ABC"));
    expect(useEditor.getState().past).toHaveLength(1);
    useEditor.getState().undo();
    expect(useEditor.getState().resume?.basics.name).toBe("A");
  });

  it("keeps checkpoints as separate steps and supports redo", () => {
    const { update } = useEditor.getState();
    update((d) => void (d.basics.name = "B"), { checkpoint: true });
    update((d) => void (d.basics.name = "C"), { checkpoint: true });
    useEditor.getState().undo();
    expect(useEditor.getState().resume?.basics.name).toBe("B");
    useEditor.getState().redo();
    expect(useEditor.getState().resume?.basics.name).toBe("C");
  });
});
