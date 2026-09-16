import { resolve } from "node:path"
import { defineConfig } from "vite"

export default defineConfig({
  build: {
    emptyOutDir: false,
    lib: {
      entry: resolve(import.meta.dirname, "scripts/qrcode-runtime.js"),
      name: "ReefTrackQRCodeRuntime",
      formats: ["iife"],
      fileName: () => "qrcode.bundle.js",
    },
    outDir: resolve(import.meta.dirname, "dist/scripts"),
  },
})
