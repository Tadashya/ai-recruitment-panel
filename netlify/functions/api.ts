import express from "express"
import serverless from "serverless-http"
import { createApi } from "../../server/api"

const app = express()
app.use("/api", createApi())

export const handler = serverless(app)
