import path from "node:path"
import { defineConfig, loadEnv } from "vite"
import react from "@vitejs/plugin-react"
import basicSsl from "@vitejs/plugin-basic-ssl"
import tailwindcss from "@tailwindcss/vite"

// @ts-ignore This server-only module is shared with the production Node server.
import { reefTrackApiPlugin } from "./server/reeftrack-api.mjs"

export default defineConfig(({ mode }) => {
  const env = { ...process.env, ...loadEnv(mode, process.cwd(), "") }
  return {
    plugins: [
      basicSsl({ name: "ReefTrack Local Development", ttlDays: 365 }),
      reefTrackApiPlugin(env),
      react(),
      tailwindcss(),
    ],
    server: {
      host: "0.0.0.0",
      watch: {
        ignored: ["**/.ui-review/**", "**/.edge-*/**", "**/dist/**"],
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "./src"),
      },
    },
  }
})