const FILE_MARK = "⟦file⟧";

export interface ChatFile {
  url: string;
  name: string;
  mime: string;
}

export function encodeChatFile(file: ChatFile, caption: string): string {
  return `${FILE_MARK}${JSON.stringify(file)}${caption ? `\n${caption}` : ""}`;
}

export function parseChatBody(text: string): { caption: string; file?: ChatFile } {
  if (!text.startsWith(FILE_MARK)) return { caption: text };
  const rest = text.slice(FILE_MARK.length);
  const nl = rest.indexOf("\n");
  const json = nl === -1 ? rest : rest.slice(0, nl);
  const caption = nl === -1 ? "" : rest.slice(nl + 1);
  try {
    const file = JSON.parse(json) as Partial<ChatFile>;
    if (file.url && file.name) {
      return { caption, file: { url: file.url, name: file.name, mime: file.mime || "" } };
    }
  } catch {
    /* plain text */
  }
  return { caption: text };
}

export function chatPreviewText(text: string): string {
  const parsed = parseChatBody(text);
  if (!parsed.file) return text;
  return parsed.caption ? `${parsed.file.name} · ${parsed.caption}` : parsed.file.name;
}
