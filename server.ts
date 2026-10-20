import express from "express"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { createApi } from "./server/api"

const app = express()
const directory = path.dirname(fileURLToPath(import.meta.url))
const port = Number(process.env.PORT || 3000)

app.disable("x-powered-by")
app.use("/api", createApi())
app.use(express.static(path.join(directory, "dist")))
app.use((request, response, next) => {
  if (request.method !== "GET" || request.path.startsWith("/api/"))
    return next()
  response.sendFile(path.join(directory, "dist", "index.html"))
})

app.listen(port, () => {
  console.log(`Pathfind is listening on port ${port}`)
})
