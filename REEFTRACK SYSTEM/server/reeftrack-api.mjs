import { createHash, randomBytes, randomInt, scryptSync, timingSafeEqual } from "node:crypto"
import { mkdirSync } from "node:fs"
import path from "node:path"
import { DatabaseSync } from "node:sqlite"

import nodemailer from "nodemailer"

const CODE_TTL_MS = 10 * 60 * 1000
const RESET_TOKEN_TTL_MS = 10 * 60 * 1000
const RESEND_DELAY_MS = 60 * 1000
const MAX_CODE_ATTEMPTS = 5
const MAX_BODY_BYTES = 24 * 1024
const ROLES = new Set(["faculty", "technician", "official"])

const challenges = new Map()
let database
let databasePath
let transporter
let transporterKey

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase()
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function json(res, status, payload) {
  res.statusCode = status
  res.setHeader("Content-Type", "application/json; charset=utf-8")
  res.setHeader("Cache-Control", "no-store")
  res.end(JSON.stringify(payload))
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = ""
    req.setEncoding("utf8")
    req.on("data", (chunk) => {
      body += chunk
      if (Buffer.byteLength(body) > MAX_BODY_BYTES) {
        reject(new Error("Request body is too large."))
        req.destroy()
      }
    })
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {})
      } catch {
        reject(new Error("Invalid JSON request."))
      }
    })
    req.on("error", reject)
  })
}

function passwordRecord(password) {
  const salt = randomBytes(16).toString("hex")
  const hash = scryptSync(password, salt, 64).toString("hex")
  return { salt, hash }
}

function passwordMatches(password, salt, expectedHex) {
  try {
    const actual = scryptSync(password, salt, 64)
    const expected = Buffer.from(expectedHex, "hex")
    return actual.length === expected.length && timingSafeEqual(actual, expected)
  } catch {
    return false
  }
}

function secretHash(value) {
  return createHash("sha256").update(value).digest("hex")
}

function getDatabase(env) {
  const requestedPath = path.resolve(env.REEFTRACK_DB_PATH || "server/data/reeftrack.sqlite")
  if (database && databasePath === requestedPath) return database
  mkdirSync(path.dirname(requestedPath), { recursive: true })
  database = new DatabaseSync(requestedPath)
  databasePath = requestedPath
  database.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      organization TEXT NOT NULL DEFAULT '',
      contact TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active',
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `)
  return database
}

function publicUser(row) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    organization: row.organization || "",
    contact: row.contact || "",
    status: row.status || "active",
  }
}

function findUser(db, email) {
  return db.prepare("SELECT * FROM users WHERE email = ?").get(email)
}

function createTransport(env) {
  const host = String(env.SMTP_HOST || "").trim()
  const user = String(env.SMTP_USER || "").trim()
  const pass = String(env.SMTP_PASS || "").trim()
  const port = Number(env.SMTP_PORT || 587)
  const secure = String(env.SMTP_SECURE || "false").toLowerCase() === "true"
  if (!host || !user || !pass) return null
  const key = `${host}:${port}:${secure}:${user}:${pass}`
  if (!transporter || transporterKey !== key) {
    transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } })
    transporterKey = key
  }
  return transporter
}

function cleanupChallenges(now = Date.now()) {
  for (const [email, challenge] of challenges) {
    const expiresAt = Math.max(challenge.codeExpiresAt || 0, challenge.tokenExpiresAt || 0)
    if (expiresAt < now) challenges.delete(email)
  }
}

async function handleRegister(req, res, env, syncOnly = false) {
  const body = await parseBody(req)
  const email = normalizeEmail(body.email)
  const password = String(body.password || "")
  const role = String(body.role || "")
  const name = String(body.name || "").trim()
  if (!isEmail(email) || !name || !ROLES.has(role) || password.length < 8) {
    return json(res, 400, { ok: false, message: "Enter a valid name, email, role, and password with at least 8 characters." })
  }
  const db = getDatabase(env)
  const existing = findUser(db, email)
  if (existing) {
    return syncOnly
      ? json(res, 200, { ok: true, user: publicUser(existing), alreadyRegistered: true })
      : json(res, 409, { ok: false, message: "An account already uses this email address." })
  }
  const credentials = passwordRecord(password)
  const now = new Date().toISOString()
  const id = String(body.id || "").trim() || randomBytes(16).toString("hex")
  db.prepare(`
    INSERT INTO users (id, email, name, role, organization, contact, status, password_hash, password_salt, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    email,
    name,
    role,
    String(body.organization || "").trim(),
    String(body.contact || "").trim(),
    body.status === "inactive" ? "inactive" : "active",
    credentials.hash,
    credentials.salt,
    now,
    now,
  )
  return json(res, 201, { ok: true, user: publicUser(findUser(db, email)) })
}

async function handleLogin(req, res, env) {
  const body = await parseBody(req)
  const email = normalizeEmail(body.email)
  const password = String(body.password || "")
  const role = String(body.role || "")
  if (!isEmail(email) || !password || !ROLES.has(role)) return json(res, 400, { ok: false, message: "Enter your registered email, password, and role." })
  const user = findUser(getDatabase(env), email)
  if (!user) return json(res, 404, { ok: false, code: "ACCOUNT_NOT_FOUND", message: "The email or password is incorrect." })
  if (!passwordMatches(password, user.password_salt, user.password_hash)) return json(res, 401, { ok: false, message: "The email or password is incorrect." })
  if (user.role !== role) return json(res, 409, { ok: false, code: "ROLE_MISMATCH", registeredRole: user.role, message: "Select the role registered to this account." })
  if (user.status === "inactive") return json(res, 403, { ok: false, message: "This account is inactive. Contact the Faculty administrator." })
  return json(res, 200, { ok: true, user: publicUser(user) })
}

async function handleResetRequest(req, res, env) {
  cleanupChallenges()
  const body = await parseBody(req)
  const email = normalizeEmail(body.email)
  if (!isEmail(email)) return json(res, 400, { ok: false, message: "Enter a valid registered email address." })
  const user = findUser(getDatabase(env), email)
  if (!user) return json(res, 404, { ok: false, message: "No ReefTrack account uses this email address." })
  const previous = challenges.get(email)
  if (previous?.sentAt && Date.now() - previous.sentAt < RESEND_DELAY_MS) {
    const retryAfter = Math.ceil((RESEND_DELAY_MS - (Date.now() - previous.sentAt)) / 1000)
    res.setHeader("Retry-After", String(retryAfter))
    return json(res, 429, { ok: false, message: `Wait ${retryAfter} seconds before requesting another code.` })
  }
  const mailer = createTransport(env)
  if (!mailer) return json(res, 503, { ok: false, message: "Password recovery email is not configured on this server. Ask the administrator to set the SMTP settings." })

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0")
  const now = Date.now()
  const from = String(env.SMTP_FROM || `ReefTrack <${env.SMTP_USER}>`).trim()
  await mailer.sendMail({
    from,
    to: user.email,
    subject: "Your ReefTrack password reset code",
    text: `Hello ${user.name},\n\nYour ReefTrack password reset code is ${code}. It expires in 10 minutes.\n\nIf you did not request this code, you can ignore this email.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#173d34"><h2>Reset your ReefTrack password</h2><p>Hello ${escapeHtml(user.name)},</p><p>Enter this verification code in ReefTrack:</p><p style="font-size:32px;font-weight:700;letter-spacing:8px;margin:24px 0">${code}</p><p>This code expires in 10 minutes. If you did not request it, you can ignore this email.</p></div>`,
  })
  challenges.set(email, {
    codeHash: secretHash(`${email}:${code}`),
    codeExpiresAt: now + CODE_TTL_MS,
    sentAt: now,
    attempts: 0,
  })
  return json(res, 200, { ok: true, message: "A six-digit verification code was sent to your registered email." })
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character])
}

async function handleResetVerify(req, res) {
  cleanupChallenges()
  const body = await parseBody(req)
  const email = normalizeEmail(body.email)
  const code = String(body.code || "").replace(/\D/g, "")
  const challenge = challenges.get(email)
  if (!challenge || challenge.codeExpiresAt < Date.now()) return json(res, 410, { ok: false, message: "This verification code has expired. Request a new code." })
  if (challenge.attempts >= MAX_CODE_ATTEMPTS) {
    challenges.delete(email)
    return json(res, 429, { ok: false, message: "Too many incorrect attempts. Request a new code." })
  }
  const expected = Buffer.from(challenge.codeHash, "hex")
  const actual = Buffer.from(secretHash(`${email}:${code}`), "hex")
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    challenge.attempts += 1
    return json(res, 400, { ok: false, message: "The verification code is incorrect." })
  }
  const token = randomBytes(32).toString("hex")
  challenge.codeHash = ""
  challenge.codeExpiresAt = 0
  challenge.tokenHash = secretHash(`${email}:${token}`)
  challenge.tokenExpiresAt = Date.now() + RESET_TOKEN_TTL_MS
  return json(res, 200, { ok: true, token, message: "Email verified. Create your new password." })
}

async function handleResetComplete(req, res, env) {
  cleanupChallenges()
  const body = await parseBody(req)
  const email = normalizeEmail(body.email)
  const token = String(body.token || "")
  const password = String(body.password || "")
  if (password.length < 8) return json(res, 400, { ok: false, message: "Use at least 8 characters for your new password." })
  const challenge = challenges.get(email)
  if (!challenge?.tokenHash || challenge.tokenExpiresAt < Date.now()) return json(res, 410, { ok: false, message: "Your reset session has expired. Request another code." })
  const expected = Buffer.from(challenge.tokenHash, "hex")
  const actual = Buffer.from(secretHash(`${email}:${token}`), "hex")
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return json(res, 403, { ok: false, message: "This password reset session is invalid." })
  const credentials = passwordRecord(password)
  const result = getDatabase(env).prepare("UPDATE users SET password_hash = ?, password_salt = ?, updated_at = ? WHERE email = ?").run(credentials.hash, credentials.salt, new Date().toISOString(), email)
  if (!result.changes) return json(res, 404, { ok: false, message: "The ReefTrack account no longer exists." })
  challenges.delete(email)
  return json(res, 200, { ok: true, message: "Password updated. You can now log in with your new password." })
}

export function createReefTrackApi(env = process.env) {
  return async function reefTrackApi(req, res, next) {
    const pathname = new URL(req.url || "/", "http://reeftrack.local").pathname
    if (!pathname.startsWith("/api/")) return next()
    if (req.method === "OPTIONS") {
      res.statusCode = 204
      res.setHeader("Allow", "POST, OPTIONS")
      return res.end()
    }
    if (req.method !== "POST") return json(res, 405, { ok: false, message: "Method not allowed." })
    try {
      if (pathname === "/api/auth/register") return await handleRegister(req, res, env, false)
      if (pathname === "/api/auth/sync") return await handleRegister(req, res, env, true)
      if (pathname === "/api/auth/login") return await handleLogin(req, res, env)
      if (pathname === "/api/password-recovery/request") return await handleResetRequest(req, res, env)
      if (pathname === "/api/password-recovery/verify") return await handleResetVerify(req, res)
      if (pathname === "/api/password-recovery/complete") return await handleResetComplete(req, res, env)
      return json(res, 404, { ok: false, message: "API endpoint not found." })
    } catch (error) {
      console.error("ReefTrack API error:", error)
      const message = error instanceof Error && /SMTP|mail|connect|auth/i.test(error.message)
        ? "The recovery email could not be sent. Check the server email settings and try again."
        : "The ReefTrack server could not complete this request."
      return json(res, 500, { ok: false, message })
    }
  }
}

export function reefTrackApiPlugin(env) {
  return {
    name: "reeftrack-api",
    configureServer(server) {
      server.middlewares.use(createReefTrackApi(env))
    },
    configurePreviewServer(server) {
      server.middlewares.use(createReefTrackApi(env))
    },
  }
}
