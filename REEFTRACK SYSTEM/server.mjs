import path from "node:path"
import { fileURLToPath } from "node:url"

import dotenv from "dotenv"
import express from "express"

import { createReefTrackApi } from "./server/reeftrack-api.mjs"

const root = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(root, ".env.local") })
dotenv.config({ path: path.join(root, ".env") })
const port = Number(process.env.PORT || 4173)
const app = express()

app.disable("x-powered-by")
app.use(createReefTrackApi(process.env))
app.use(express.static(path.join(root, "dist"), { index: false, maxAge: "1h" }))
app.use((req, res, next) => {
  if (req.method !== "GET" || req.path.startsWith("/api/")) return next()
  res.sendFile(path.join(root, "dist", "index.html"))
})
app.use((_req, res) => res.status(404).json({ ok: false, message: "Not found." }))

app.listen(port, "0.0.0.0", () => {
  console.log(`ReefTrack server is running on http://localhost:${port}`)
})
