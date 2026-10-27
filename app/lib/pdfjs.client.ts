import type * as PdfJs from "pdfjs-dist";

let loading: Promise<typeof PdfJs> | undefined;

/** Lazily load pdf.js with its worker (client only). */
export function loadPdfJs(): Promise<typeof PdfJs> {
  loading ??= Promise.all([import("pdfjs-dist"), import("pdfjs-dist/build/pdf.worker.min.mjs?url")]).then(
    ([pdfjs, worker]) => {
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
      return pdfjs;
    },
  );
  return loading;
}
