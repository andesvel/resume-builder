import { loadPdfJs } from "~/lib/pdfjs.client";

async function pdfText(file: File): Promise<string> {
  const pdfjs = await loadPdfJs();
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  const doc = await task.promise;
  const pages: string[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const content = await (await doc.getPage(n)).getTextContent();
    let text = "";
    for (const item of content.items) {
      if (!("str" in item)) continue;
      text += item.str + (item.hasEOL ? "\n" : item.str.endsWith(" ") ? "" : " ");
    }
    pages.push(text.replace(/[ \t]+\n/g, "\n").replace(/[ \t]{2,}/g, " ").trim());
  }
  await task.destroy();
  return pages.join("\n\n");
}

async function docxText(file: File): Promise<string> {
  const mod = await import("mammoth");
  // CommonJS package: the API may sit on `default` depending on the bundler.
  const { extractRawText } = mod.default ?? mod;
  const { value } = await extractRawText({ arrayBuffer: await file.arrayBuffer() });
  return value;
}

/** Plain text from a PDF, Word or text file, for the AI to read. Scanned (image-only) PDFs yield "". */
export async function textFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  let text: string;
  if (file.type === "application/pdf" || name.endsWith(".pdf")) text = await pdfText(file);
  else if (name.endsWith(".docx")) text = await docxText(file);
  else text = await file.text();
  return text.replace(/\n{3,}/g, "\n\n").trim();
}
