import mammoth from "mammoth"
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
    throw new Error("PDF resumes are analyzed in the browser.")
  }

  throw new Error("Unsupported file type")
}
