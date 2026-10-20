import { matchResume } from "../shared/analyzer"

async function extractPdf(file: File) {
  const [{ getDocument, GlobalWorkerOptions }, workerModule] =
    await Promise.all([
      import("pdfjs-dist"),
      import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
    ])
  GlobalWorkerOptions.workerSrc = workerModule.default
  const loadingTask = getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
  })
  const document = await loadingTask.promise

  try {
    const pages: string[] = []
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber)
      const content = await page.getTextContent()
      pages.push(
        content.items
          .map((item) => ("str" in item ? item.str : ""))
          .filter(Boolean)
          .join(" "),
      )
    }
    return pages.join("\n")
  } finally {
    await loadingTask.destroy()
  }
}

async function extractDocx(file: File) {
  const mammothModule = await import("mammoth")
  const mammoth = mammothModule.default
  const result = await mammoth.extractRawText({
    arrayBuffer: await file.arrayBuffer(),
  })
  return result.value
}

export async function analyzeFileLocally(file: File) {
  const extension = file.name.toLowerCase().match(/\.[^.]+$/)?.[0]
  let text = ""

  if (extension === ".txt") text = await file.text()
  else if (extension === ".docx") text = await extractDocx(file)
  else if (extension === ".pdf") text = await extractPdf(file)
  else throw new Error("Upload a PDF, DOCX, or TXT file.")

  return matchResume(text, file.name)
}
