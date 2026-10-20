import mammoth from "mammoth"
import { PDFParse } from "pdf-parse"
export { matchResume } from "../shared/analyzer"

export const MAX_FILE_SIZE = 5 * 1024 * 1024
export const ALLOWED_TYPES = {
  "application/pdf": ".pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    ".docx",
  "text/plain": ".txt",
} as const

export async function extractText(
  buffer: Buffer,
  mimeType: string,
): Promise<string> {
  if (mimeType === "text/plain") return buffer.toString("utf8")

  if (mimeType.includes("wordprocessingml")) {
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  }

  if (mimeType === "application/pdf") {
    const parser = new PDFParse({ data: new Uint8Array(buffer) })
    try {
      const result = await parser.getText()
      return result.text
    } finally {
      await parser.destroy()
    }
  }

  throw new Error("Unsupported file type")
}
