import { cp, mkdir } from "node:fs/promises"
import { resolve } from "node:path"

const root = resolve(import.meta.dirname, "..")
const output = resolve(root, "dist")
const staticDirectories = ["assets", "USERS", "LANDINGPAGES", "LOGIN", "scripts"]

await mkdir(output, { recursive: true })
await Promise.all(
  staticDirectories.map((directory) =>
    cp(resolve(root, directory), resolve(output, directory), {
      recursive: true,
      force: true,
    }),
  ),
)
