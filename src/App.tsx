import { useRef, useState } from "react"
import {
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Clock3,
  Download,
  ExternalLink,
  FileCheck2,
  FileText,
  GraduationCap,
  LoaderCircle,
  LockKeyhole,
  MapPin,
  PencilLine,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  X,
  Zap,
} from "lucide-react"

type Match = {
  id: string
  company: string
  title: string
  location: string
  employerType: "MNC" | "Startup" | "Corporate"
  summary: string
  careersUrl: string
  matchScore: number
  matchedSkills: string[]
  requiredSkills: string[]
  minimumExperience: number
  explanation: string
  illustrative: true
}

type Result = {
  source: "illustrative_sample_data"
  sourceNotice: string
  processedFile: string
  profile: { skills: string[]; education: string[]; experienceYears: number }
  atsReview: {
    estimatedScore: number
    label: string
    disclaimer: string
    wordCount: number
    checks: Array<{ label: string; passed: boolean; detail: string }>
    suggestions: string[]
  }
  improvedResumeText: string
  matches: Match[]
  methodology: {
    skills: number
    experience: number
    education: number
    excluded: string
  }
}

const MAX_SIZE = 5 * 1024 * 1024
const allowedExtensions = [".pdf", ".docx", ".txt"]

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid size-9 place-items-center rounded-xl bg-ink text-white shadow-sm">
        <Sparkles className="size-4.5" aria-hidden="true" />
      </div>
      <span className="font-display text-xl font-semibold tracking-[-0.04em] text-ink">
        Pathfind
      </span>
    </div>
  )
}

function Pill({
  children,
  tone = "default",
}: {
  children: React.ReactNode
  tone?: "default" | "green"
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${
        tone === "green"
          ? "border-mint-200 bg-mint-50 text-mint-800"
          : "border-slate-200 bg-white text-slate-600"
      }`}
    >
      {children}
    </span>
  )
}

function ScoreRing({ score }: { score: number }) {
  return (
    <div
      className="score-ring grid size-20 shrink-0 place-items-center rounded-full"
      style={{ "--score": `${score * 3.6}deg` } as React.CSSProperties}
      aria-label={`${score}% match`}
    >
      <div className="grid size-15 place-items-center rounded-full bg-white">
        <div className="text-center">
          <div className="font-display text-xl font-bold leading-none text-ink">
            {score}%
          </div>
          <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            match
          </div>
        </div>
      </div>
    </div>
  )
}

function validateFile(file: File) {
  const extension = `.${file.name.split(".").pop()?.toLowerCase()}`
  if (!allowedExtensions.includes(extension))
    return "Upload a PDF, DOCX, or TXT file."
  if (file.size > MAX_SIZE) return "This file is over the 5 MB limit."
  if (file.size === 0) return "This file is empty. Choose another resume."
  return ""
}

export default function App() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState("")
  const [progress, setProgress] = useState(0)
  const [loading, setLoading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  function chooseFile(nextFile?: File) {
    if (inputRef.current) inputRef.current.value = ""
    if (!nextFile) return
    const validationError = validateFile(nextFile)
    setError(validationError)
    if (!validationError) {
      setFile(nextFile)
      setResult(null)
      submit(nextFile)
    }
  }

  function useSample() {
    const content = `Frontend Engineer with 4 years of experience building accessible web applications.
Skills: React, TypeScript, JavaScript, CSS, Node.js, REST APIs, SQL, AWS, Git, Agile.
Education: Bachelor's degree in Computer Science.`
    chooseFile(new File([content], "sample-resume.txt", { type: "text/plain" }))
  }

  function submit(selectedFile?: File) {
    const resume = selectedFile ?? file
    if (!resume) {
      setError("Choose a resume before finding matches.")
      return
    }
    setLoading(true)
    setError("")
    setProgress(1)
    const form = new FormData()
    form.append("resume", resume)
    const request = new XMLHttpRequest()
    request.open(
      "POST",
      new URL(`${import.meta.env.BASE_URL}api/match`, window.location.origin),
    )
    request.responseType = "json"
    request.upload.onprogress = (event) => {
      if (event.lengthComputable)
        setProgress(Math.max(1, Math.round((event.loaded / event.total) * 75)))
    }
    request.onload = () => {
      if (
        request.status >= 200 &&
        request.status < 300 &&
        request.response?.matches
      ) {
        setLoading(false)
        setProgress(100)
        setResult(request.response as Result)
        window.setTimeout(
          () =>
            document
              .getElementById("results")
              ?.scrollIntoView({ behavior: "smooth" }),
          50,
        )
      } else if (
        request.status === 400 ||
        request.status === 404 ||
        request.status === 405 ||
        (request.status >= 200 &&
          request.status < 300 &&
          !request.response?.matches)
      ) {
        analyzeInBrowser(resume)
      } else if (request.status === 0 || request.status >= 500) {
        analyzeInBrowser(resume)
      } else {
        setLoading(false)
        setProgress(0)
        setError(
          request.response?.error || "Something went wrong. Please try again.",
        )
      }
    }
    request.onerror = () => {
      analyzeInBrowser(resume)
    }
    request.send(form)
  }

  async function analyzeInBrowser(resume: File) {
    try {
      setProgress(85)
      const { analyzeFileLocally } = await import("./clientAnalysis")
      const localResult = await analyzeFileLocally(resume)
      setResult(localResult as Result)
      setProgress(100)
      setLoading(false)
      window.setTimeout(
        () =>
          document
            .getElementById("results")
            ?.scrollIntoView({ behavior: "smooth" }),
        50,
      )
    } catch (localError) {
      setLoading(false)
      setProgress(0)
      setError(
        localError instanceof Error
          ? localError.message
          : "We could not read this resume. Try a text-based PDF, DOCX, or TXT file.",
      )
    }
  }

  return (
    <div className="min-h-screen bg-canvas text-slate-700">
      <header className="border-b border-slate-200/80 bg-canvas/90 backdrop-blur">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Logo />
          <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
            <span className="hidden items-center gap-2 sm:flex">
              <LockKeyhole className="size-4" aria-hidden="true" />
              Private by design
            </span>
            <span className="hidden h-4 w-px bg-slate-200 sm:block" />
            <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">
              Sample roles
            </span>
          </div>
        </div>
      </header>

      <main>
        {!result ? (
          <>
            <section className="relative overflow-hidden">
              <div className="hero-glow" aria-hidden="true" />
              <div className="relative mx-auto grid max-w-7xl gap-12 px-5 pb-16 pt-16 sm:px-8 sm:pt-24 lg:grid-cols-[1fr_0.9fr] lg:items-center lg:gap-20 lg:pb-24">
                <div>
                  <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-mint-200 bg-mint-50 px-3.5 py-2 text-xs font-bold uppercase tracking-[0.12em] text-mint-800">
                    <Zap className="size-3.5 fill-current" aria-hidden="true" />
                    Resume intelligence, explained
                  </div>
                  <h1 className="max-w-2xl font-display text-5xl font-semibold leading-[1.04] tracking-[-0.055em] text-ink sm:text-6xl lg:text-7xl">
                    Find where your experience{" "}
                    <span className="text-mint-600">fits best.</span>
                  </h1>
                  <p className="mt-6 max-w-xl text-lg leading-8 text-slate-500">
                    Upload your resume and get clear, skill-based role matches
                    in seconds. No black box, no irrelevant personal data.
                  </p>
                  <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium text-slate-600">
                    {[
                      "Explainable scores",
                      "No resume storage",
                      "Free to try",
                    ].map((item) => (
                      <span className="flex items-center gap-2" key={item}>
                        <span className="grid size-5 place-items-center rounded-full bg-mint-100 text-mint-700">
                          <Check
                            className="size-3"
                            strokeWidth={3}
                            aria-hidden="true"
                          />
                        </span>
                        {item}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card sm:p-7">
                  <div className="mb-5">
                    <h2 className="font-display text-2xl font-semibold tracking-[-0.03em] text-ink">
                      Upload your resume
                    </h2>
                    <p className="mt-1.5 text-sm text-slate-500">
                      Get tailored matches in under a minute.
                    </p>
                  </div>

                  <div
                    className={`relative rounded-2xl border-2 border-dashed p-7 text-center transition ${
                      dragging
                        ? "border-mint-500 bg-mint-50"
                        : file
                          ? "border-mint-300 bg-mint-50/60"
                          : "border-slate-200 bg-slate-50/70 hover:border-slate-300"
                    }`}
                    onDragEnter={(event) => {
                      event.preventDefault()
                      setDragging(true)
                    }}
                    onDragOver={(event) => event.preventDefault()}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(event) => {
                      event.preventDefault()
                      setDragging(false)
                      chooseFile(event.dataTransfer.files[0])
                    }}
                  >
                    <input
                      ref={inputRef}
                      type="file"
                      className="sr-only"
                      accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                      onChange={(event) => chooseFile(event.target.files?.[0])}
                      aria-label="Choose resume file"
                    />
                    {file ? (
                      <div className="flex flex-col items-center">
                        <div className="grid size-12 place-items-center rounded-2xl bg-white text-mint-700 shadow-sm">
                          <FileText className="size-6" aria-hidden="true" />
                        </div>
                        <p className="mt-4 max-w-full truncate font-semibold text-ink">
                          {file.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {(file.size / 1024).toFixed(1)} KB · Ready
                        </p>
                        <button
                          type="button"
                          className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-ink"
                          onClick={() => {
                            setFile(null)
                            if (inputRef.current) inputRef.current.value = ""
                          }}
                        >
                          <X className="size-3.5" aria-hidden="true" /> Remove
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-mint-100 text-mint-700">
                          <UploadCloud className="size-6" aria-hidden="true" />
                        </div>
                        <p className="mt-4 font-semibold text-ink">
                          Drop your resume here
                        </p>
                        <p className="mt-1 text-sm text-slate-500">or</p>
                        <button
                          type="button"
                          onClick={() => inputRef.current?.click()}
                          className="mt-3 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-ink shadow-sm transition hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-mint-500 focus:ring-offset-2"
                        >
                          Browse files
                        </button>
                        <p className="mt-4 text-xs text-slate-400">
                          PDF, DOCX, or TXT · Maximum 5 MB
                        </p>
                      </>
                    )}
                  </div>

                  {loading && (
                    <div className="mt-4" role="status" aria-live="polite">
                      <div className="mb-2 flex justify-between text-xs font-semibold text-slate-600">
                        <span>Uploading and analyzing…</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-mint-500 transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {error && (
                    <div
                      className="mt-4 flex gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
                      role="alert"
                    >
                      <CircleAlert
                        className="mt-0.5 size-4 shrink-0"
                        aria-hidden="true"
                      />
                      {error}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => submit()}
                    disabled={loading}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-mint-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? (
                      <LoaderCircle
                        className="size-4 animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <Sparkles className="size-4" aria-hidden="true" />
                    )}
                    {loading ? "Analyzing resume…" : "Find my best matches"}
                    {!loading && (
                      <ArrowRight className="size-4" aria-hidden="true" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={useSample}
                    disabled={loading}
                    className="mt-3 w-full text-center text-sm font-semibold text-mint-700 hover:text-mint-800 disabled:opacity-50"
                  >
                    Or try a sample resume
                  </button>

                  <div className="mt-5 flex items-start gap-2 border-t border-slate-100 pt-4 text-xs leading-5 text-slate-400">
                    <ShieldCheck
                      className="mt-0.5 size-4 shrink-0 text-mint-600"
                      aria-hidden="true"
                    />
                    Processed in memory and never saved. Resume contents are not
                    logged.
                  </div>
                </div>
              </div>
            </section>

            <section className="border-y border-slate-200 bg-white">
              <div className="mx-auto grid max-w-7xl gap-8 px-5 py-9 sm:grid-cols-3 sm:px-8">
                {[
                  [
                    BarChart3,
                    "Relevant scoring",
                    "Skills, stated experience, and education only",
                  ],
                  [
                    ShieldCheck,
                    "Fair by design",
                    "Protected characteristics are never considered",
                  ],
                  [
                    BriefcaseBusiness,
                    "Broad role types",
                    "MNC, startup, and corporate examples",
                  ],
                ].map(([Icon, title, text]) => {
                  const FeatureIcon = Icon as typeof BarChart3
                  return (
                    <div
                      className="flex items-start gap-3.5"
                      key={String(title)}
                    >
                      <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700">
                        <FeatureIcon className="size-5" aria-hidden="true" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-ink">
                          {String(title)}
                        </h3>
                        <p className="mt-1 text-sm leading-5 text-slate-500">
                          {String(text)}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          </>
        ) : (
          <Results
            result={result}
            expanded={expanded}
            setExpanded={setExpanded}
            reset={() => {
              setResult(null)
              setFile(null)
              setProgress(0)
              window.scrollTo({ top: 0, behavior: "smooth" })
            }}
          />
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <Logo />
          <p>
            Illustrative matching tool · Not employment advice or a live vacancy
            service
          </p>
        </div>
      </footer>
    </div>
  )
}

function Results({
  result,
  expanded,
  setExpanded,
  reset,
}: {
  result: Result
  expanded: string | null
  setExpanded: (id: string | null) => void
  reset: () => void
}) {
  const [showEditor, setShowEditor] = useState(false)
  const [editedResume, setEditedResume] = useState(result.improvedResumeText)

  function downloadResume() {
    const blob = new Blob([editedResume], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    const baseName = result.processedFile.replace(/\.[^.]+$/, "") || "resume"
    link.href = url
    link.download = `${baseName}-ats-ready.txt`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div id="results" className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-mint-700">
            <CheckCircle2 className="size-4" aria-hidden="true" />
            Analysis complete
          </div>
          <h1 className="font-display text-4xl font-semibold tracking-[-0.045em] text-ink sm:text-5xl">
            Your best role matches
          </h1>
          <p className="mt-3 text-slate-500">
            Ranked for{" "}
            <span className="font-semibold text-slate-700">
              {result.processedFile}
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-ink shadow-sm hover:bg-slate-50 sm:self-auto"
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          Analyze another resume
        </button>
      </div>

      <div className="mt-8 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
        <CircleAlert className="mt-1 size-4 shrink-0" aria-hidden="true" />
        <p>
          <strong>Sample data:</strong> {result.sourceNotice}
        </p>
      </div>

      <section
        className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
        aria-labelledby="ats-heading"
      >
        <div className="grid gap-7 lg:grid-cols-[15rem_1fr] lg:items-start">
          <div className="rounded-2xl bg-ink p-5 text-white">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-mint-300">
              <FileCheck2 className="size-4" aria-hidden="true" />
              ATS estimate
            </div>
            <div className="mt-4 flex items-end gap-2">
              <span className="font-display text-5xl font-semibold tracking-tight">
                {result.atsReview.estimatedScore}%
              </span>
              <span className="mb-1.5 text-sm text-slate-300">friendly</span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-mint-300"
                style={{ width: `${result.atsReview.estimatedScore}%` }}
              />
            </div>
            <p className="mt-3 text-sm font-semibold text-mint-200">
              {result.atsReview.label}
            </p>
            <p className="mt-3 text-xs leading-5 text-slate-400">
              {result.atsReview.disclaimer}
            </p>
          </div>

          <div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2
                  id="ats-heading"
                  className="font-display text-2xl font-semibold tracking-[-0.03em] text-ink"
                >
                  Make your resume easier to scan
                </h2>
                <p className="mt-1.5 text-sm text-slate-500">
                  Based on standard sections, relevant skills, length, and
                  measurable achievements.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowEditor(true)}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-mint-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-mint-700 focus:outline-none focus:ring-2 focus:ring-mint-500 focus:ring-offset-2"
              >
                <PencilLine className="size-4" aria-hidden="true" />
                Make changes
              </button>
            </div>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div className="space-y-2.5">
                {result.atsReview.checks.map((check) => (
                  <div
                    className="flex items-start gap-2.5 text-sm"
                    key={check.label}
                  >
                    {check.passed ? (
                      <CheckCircle2
                        className="mt-0.5 size-4 shrink-0 text-mint-600"
                        aria-hidden="true"
                      />
                    ) : (
                      <CircleAlert
                        className="mt-0.5 size-4 shrink-0 text-amber-600"
                        aria-hidden="true"
                      />
                    )}
                    <div>
                      <p className="font-semibold text-slate-700">
                        {check.label}
                      </p>
                      <p className="text-xs leading-5 text-slate-400">
                        {check.detail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <h3 className="text-sm font-semibold text-ink">
                  Recommended changes
                </h3>
                {result.atsReview.suggestions.length ? (
                  <ul className="mt-3 space-y-2 text-sm leading-5 text-slate-600">
                    {result.atsReview.suggestions.map((suggestion) => (
                      <li className="flex gap-2" key={suggestion}>
                        <span className="mt-2 size-1.5 shrink-0 rounded-full bg-mint-500" />
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    The main ATS checks passed. Tailor keywords to each job
                    description before applying.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {showEditor && (
        <section className="mt-6 rounded-3xl border border-mint-200 bg-mint-50/50 p-5 sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="font-display text-2xl font-semibold tracking-[-0.03em] text-ink">
                Your improved ATS draft
              </h2>
              <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">
                Pathfind added a clear summary and skills section using only
                information detected in your resume. Review every line and add
                truthful metrics before applying.
              </p>
            </div>
            <button
              type="button"
              onClick={downloadResume}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-mint-500 focus:ring-offset-2"
            >
              <Download className="size-4" aria-hidden="true" />
              Download revised resume
            </button>
          </div>
          <label
            htmlFor="resume-editor"
            className="mt-5 block text-sm font-semibold text-slate-700"
          >
            Edit before downloading
          </label>
          <textarea
            id="resume-editor"
            value={editedResume}
            onChange={(event) => setEditedResume(event.target.value)}
            className="mt-2 min-h-96 w-full resize-y rounded-2xl border border-slate-200 bg-white p-5 font-mono text-sm leading-6 text-slate-700 shadow-inner outline-none focus:border-mint-500 focus:ring-2 focus:ring-mint-100"
            spellCheck="true"
          />
          <p className="mt-2 text-xs text-slate-400">
            Downloads as a plain-text resume, which is broadly readable by ATS
            software.
          </p>
        </section>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[18rem_1fr]">
        <aside className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-display text-lg font-semibold text-ink">
              Profile extracted
            </h2>
            <div className="mt-5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                <Sparkles className="size-3.5" aria-hidden="true" /> Skills
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {result.profile.skills.length ? (
                  result.profile.skills.map((skill) => (
                    <Pill key={skill}>{skill}</Pill>
                  ))
                ) : (
                  <span className="text-sm text-slate-500">
                    No catalogued skills found
                  </span>
                )}
              </div>
            </div>
            <div className="mt-6 border-t border-slate-100 pt-5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                <GraduationCap className="size-3.5" aria-hidden="true" />{" "}
                Education
              </div>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-700">
                {result.profile.education.join(" · ") ||
                  "No education keywords identified"}
              </p>
            </div>
            <div className="mt-6 border-t border-slate-100 pt-5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                <Clock3 className="size-3.5" aria-hidden="true" /> Stated
                experience
              </div>
              <p className="mt-2 font-display text-2xl font-semibold text-ink">
                {result.profile.experienceYears}{" "}
                <span className="text-sm font-medium text-slate-500">
                  {result.profile.experienceYears === 1 ? "year" : "years"}
                </span>
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-500">
            <h2 className="font-semibold text-ink">How scoring works</h2>
            <div className="mt-3 space-y-2">
              <div className="flex justify-between">
                <span>Relevant skills</span>
                <strong className="text-ink">70%</strong>
              </div>
              <div className="flex justify-between">
                <span>Stated experience</span>
                <strong className="text-ink">15%</strong>
              </div>
              <div className="flex justify-between">
                <span>Education guideline</span>
                <strong className="text-ink">15%</strong>
              </div>
            </div>
            <p className="mt-4 border-t border-slate-200 pt-4 text-xs leading-5">
              {result.methodology.excluded}
            </p>
          </div>
        </aside>

        <section aria-labelledby="matches-heading">
          <div className="mb-4 flex items-center justify-between">
            <h2
              id="matches-heading"
              className="font-display text-xl font-semibold text-ink"
            >
              {result.matches.length} ranked matches
            </h2>
            <span className="text-xs font-semibold text-slate-400">
              Highest score first
            </span>
          </div>
          <div className="space-y-4">
            {result.matches.map((match, index) => (
              <article
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
                key={match.id}
              >
                <div className="flex gap-4 sm:gap-6">
                  <ScoreRing score={match.matchScore} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-mint-700">
                            #{index + 1} match
                          </span>
                          <Pill>{match.employerType}</Pill>
                        </div>
                        <h3 className="mt-2 font-display text-xl font-semibold tracking-[-0.02em] text-ink sm:text-2xl">
                          {match.title}
                        </h3>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                          <span className="font-semibold text-slate-700">
                            {match.company}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <MapPin className="size-3.5" aria-hidden="true" />{" "}
                            {match.location}
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="mt-4 text-sm leading-6 text-slate-500">
                      {match.summary}
                    </p>
                    <div className="mt-4">
                      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                        Matched skills
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {match.matchedSkills.length ? (
                          match.matchedSkills.map((skill) => (
                            <Pill tone="green" key={skill}>
                              {skill}
                            </Pill>
                          ))
                        ) : (
                          <span className="text-sm text-slate-500">
                            No direct skill matches
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={() =>
                      setExpanded(expanded === match.id ? null : match.id)
                    }
                    aria-expanded={expanded === match.id}
                    className="flex items-center gap-2 text-left text-sm font-semibold text-slate-600 hover:text-ink"
                  >
                    Why this score?
                    <ChevronDown
                      className={`size-4 transition ${
                        expanded === match.id ? "rotate-180" : ""
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                  <a
                    href={match.careersUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`View ${match.company} official careers site in a new tab`}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-mint-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-mint-700 focus:outline-none focus:ring-2 focus:ring-mint-500 focus:ring-offset-2"
                  >
                    Check current openings
                    <ExternalLink className="size-4" aria-hidden="true" />
                  </a>
                </div>
                {expanded === match.id && (
                  <div className="mt-3 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                    {match.explanation}
                  </div>
                )}
                <p className="mt-3 text-xs leading-5 text-slate-400">
                  Opens the company’s official careers directory. This
                  illustrative role may not be an active opening.
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
