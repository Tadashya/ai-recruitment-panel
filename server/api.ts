import express from "express"
import multer from "multer"
import {
  ALLOWED_TYPES,
  extractText,
  matchResume,
  MAX_FILE_SIZE,
} from "./matcher"
import { roles } from "./roles"

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  fileFilter: (_request, file, callback) => {
    const extension = file.originalname.toLowerCase().match(/\.[^.]+$/)?.[0]
    if (
      extension &&
      Object.values(ALLOWED_TYPES).includes(
        extension as ".pdf" | ".docx" | ".txt",
      )
    ) {
      return callback(null, true)
    }
    callback(
      new Error("Unsupported file type. Upload a PDF, DOCX, or TXT file."),
    )
  },
})

export function createApi() {
  // A full Express app initializes request/response helpers when mounted in
  // Vite's Connect server; a bare Router assumes Express already did so.
  const api = express()

  api.get("/roles", (_request, response) => {
    response.json({
      source: "illustrative_sample_data",
      notice:
        "Illustrative sample roles only; these are not current vacancies.",
      roles,
      liveSource: {
        supported: false,
        extensionPoint:
          "Replace the roles provider in server/roles.ts with an authorized jobs API adapter while preserving the Role shape.",
      },
    })
  })

  api.post("/match", upload.single("resume"), async (request, response) => {
    try {
      if (!request.file) {
        return response
          .status(400)
          .json({ error: "Choose a PDF, DOCX, or TXT resume to continue." })
      }
      const extension = request.file.originalname
        .toLowerCase()
        .match(/\.[^.]+$/)?.[0]
      const mimeType = Object.entries(ALLOWED_TYPES).find(
        ([, value]) => value === extension,
      )?.[0]
      if (!mimeType) {
        return response
          .status(400)
          .json({
            error: "Unsupported file type. Upload a PDF, DOCX, or TXT file.",
          })
      }
      const text = await extractText(request.file.buffer, mimeType)
      return response.json(matchResume(text, request.file.originalname))
    } catch (error) {
      console.error("Resume processing failed", error)
      const message =
        error instanceof Error
          ? error.message
          : "The resume could not be processed."
      const isReadableError = message.includes("enough readable text")
      return response.status(isReadableError ? 422 : 400).json({
        error: isReadableError
          ? message
          : "We could not read this file. Check that it is a valid, unlocked PDF, DOCX, or TXT file.",
      })
    }
  })

  api.use(
    (
      error: unknown,
      _request: express.Request,
      response: express.Response,
      _next: express.NextFunction,
    ) => {
      if (
        error instanceof multer.MulterError &&
        error.code === "LIMIT_FILE_SIZE"
      ) {
        return response
          .status(413)
          .json({ error: "This file is over the 5 MB limit." })
      }
      const message = error instanceof Error ? error.message : "Upload failed."
      return response.status(400).json({ error: message })
    },
  )

  return api
}
