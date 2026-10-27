import { LoaderIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { loadPdfJs } from "~/lib/pdfjs";
import { cn } from "~/lib/utils";

/**
 * Draws every page of a PDF onto canvases. New renders are composed offscreen
 * and swapped in at once, so typing doesn't make the preview flicker.
 */
export function PdfPreview({ blob, className }: { blob: Blob | null; className?: string }) {
  const container = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(true);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = container.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => entry && setWidth(Math.round(entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const el = container.current;
    if (!blob || !el || width === 0) return;
    let cancelled = false;
    setBusy(true);

    (async () => {
      const pdfjs = await loadPdfJs();
      const task = pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) });
      const doc = await task.promise;
      const ratio = window.devicePixelRatio || 1;
      const pages: HTMLCanvasElement[] = [];
      for (let n = 1; n <= doc.numPages; n++) {
        const page = await doc.getPage(n);
        const base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: (width / base.width) * ratio });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.className = "w-full rounded-sm bg-white shadow-sm ring-1 ring-border";
        await page.render({ canvas, viewport }).promise;
        pages.push(canvas);
      }
      await task.destroy();
      if (!cancelled) el.replaceChildren(...pages);
    })()
      .catch((error: unknown) => console.error("PDF preview failed", error))
      .finally(() => !cancelled && setBusy(false));

    return () => {
      cancelled = true;
    };
  }, [blob, width]);

  return (
    <div className={cn("relative", className)}>
      <div ref={container} className="grid gap-4" />
      {busy && (
        <LoaderIcon className="absolute top-3 right-3 size-4 animate-spin text-muted-foreground" aria-hidden />
      )}
    </div>
  );
}
