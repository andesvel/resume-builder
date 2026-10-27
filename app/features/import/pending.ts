/** Text waiting to be reviewed in a resume's assistant box (e.g. right after importing a PDF). */
const key = (resumeId: string) => `pending-import:${resumeId}`;

export function setPendingImport(resumeId: string, text: string) {
  try {
    sessionStorage.setItem(key(resumeId), text);
  } catch {
    // Without storage the user just starts with an empty box.
  }
}

export function takePendingImport(resumeId: string): string | null {
  try {
    const text = sessionStorage.getItem(key(resumeId));
    sessionStorage.removeItem(key(resumeId));
    return text;
  } catch {
    return null;
  }
}
