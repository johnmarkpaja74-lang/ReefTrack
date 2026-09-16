import { copyFile } from "node:fs/promises"
import { resolve } from "node:path"

const root = resolve(import.meta.dirname, "..")
const files = ["qr-scanner.legacy.min.js", "qr-scanner.legacy.min.js.map"]

await Promise.all(
  files.map((file) =>
    copyFile(
      resolve(root, "node_modules/qr-scanner", file),
      resolve(root, "scripts", file),
    ),
  ),
)
