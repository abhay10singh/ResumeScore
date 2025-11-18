// utils/parsePdf.ts
import pdfParse from "pdf-parse";

export async function extractTextFromBuffer(buffer: Buffer): Promise<string> {
  const parsed = await pdfParse(buffer);

  return parsed.text.replace(/\s+/g, " ").trim();
}
