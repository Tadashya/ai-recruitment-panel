# Pathfind

Pathfind is a privacy-conscious resume-to-role matching app. It extracts relevant resume text in memory, identifies skills, education keywords, and stated experience, then ranks clearly labeled illustrative roles with an explainable score.

## Run locally

Requirements: Node.js 22+ and pnpm.

```bash
pnpm install
pnpm dev
```

The Figma Make workspace starts the Vite server automatically. Outside Make, open the URL Vite prints. The development API is mounted into Vite at `/api`.

## Production

```bash
pnpm build
PORT=3000 pnpm start
```

`server.ts` serves both the built frontend and the API. Deploy this as a Node service (for example, Render, Railway, Fly.io, or a container host), not as a static-only site. Use Node 22+, run `pnpm install --frozen-lockfile && pnpm build`, and start with `pnpm start`. Put TLS and request-rate limiting at the hosting edge.

## API

- `POST /api/match` — multipart form upload using the `resume` field. Accepts PDF, DOCX, and TXT up to 5 MB.
- `GET /api/roles` — returns the illustrative role catalog and the extension point for a future live source.

Each illustrative match includes an official company careers-directory URL. These links help users check current opportunities directly, but do not imply that the sample role itself is open.

The match response also includes a transparent estimated ATS score, diagnostic checks, improvement suggestions, and an editable plain-text draft created only from information detected in the uploaded resume. The frontend lets users review that draft and download it as an ATS-readable TXT file.

Files are parsed from memory and are not saved. Resume contents are not logged. Matching uses only relevant skills (70%), stated experience (15%), and education requirements (15%). It does not use names or protected characteristics.

## Connecting an authorized jobs source

Implement a provider that maps authorized source records to the `Role` shape in `server/roles.ts`, then replace the exported sample array. Add source attribution, freshness timestamps, paging, caching, and the provider’s required legal notices. Do not remove the `illustrative` label until the endpoint is genuinely serving authorized, current vacancies.

## Current limitations

- Image-only PDFs require OCR before upload.
- Skill extraction uses a transparent catalog rather than a third-party AI service.
- Roles are illustrative examples and are not current vacancies.
