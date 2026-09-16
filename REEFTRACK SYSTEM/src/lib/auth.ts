export const STORAGE_KEYS = {
  users: "reeftrack_users",
  session: "reeftrack_session",
  credentials: "reeftrack_latest_credentials",
  history: "reeftrack_login_history",
  remembered: "reeftrack_remembered_login",
  pending: "reeftrack_pending_login",
} as const

export type Role = "faculty" | "technician" | "official"

export type ReefTrackUser = {
  id: string
  name: string
  email: string
  password?: string
  role: Role
  organization?: string
  contact?: string
  status?: "active" | "inactive"
  lastLogin?: string
  settings?: Record<string, string>
}

export type LoginDraft = { email: string; role: Role }

type RegistrationInput = {
  name: string
  email: string
  password: string
  confirmPassword: string
  role: Role
  organization?: string
  contact?: string
}

type StoredCredentials = Omit<ReefTrackUser, "id"> & { id?: string; accountId?: string }

type ApiResult<T = Record<string, never>> = T & {
  ok: boolean
  message?: string
  code?: string
  registeredRole?: Role
}

export const roleLabels: Record<Role, string> = {
  faculty: "Faculty / Researcher",
  technician: "Student Technician",
  official: "BFAR / LGU Official",
}

export const roleDestinations: Record<Role, string> = {
  faculty: "/USERS/FACULTY/faculty-dashboard.html",
  technician: "/USERS/TECHNICIAN/technician-dashboard.html",
  official: "/USERS/BFAR-LGU/official-dashboard.html",
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

function read<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "null") ?? fallback
  } catch {
    return fallback
  }
}

function isRole(value: unknown): value is Role {
  return value === "faculty" || value === "technician" || value === "official"
}

async function apiPost<T>(path: string, body: Record<string, unknown>) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  // A static host or unavailable API can return HTML, an empty body, or a
  // proxy error. Treat those as service failures, not rejected credentials.
  const data: unknown = await response.json()
  if (!data || typeof data !== "object" || !("ok" in data) || typeof data.ok !== "boolean") {
    throw new Error("The authentication service is unavailable.")
  }
  return { response, data: data as ApiResult<T> }
}

function deviceName() {
  const ua = navigator.userAgent || ""
  const browser = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Browser"
  const platform = /Android/i.test(ua) ? "Android" : /iPhone|iPad|iPod/i.test(ua) ? "iOS" : /Windows/i.test(ua) ? "Windows" : /Mac/i.test(ua) ? "macOS" : /Linux/i.test(ua) ? "Linux" : "Unknown device"
  return `${browser} · ${platform}`
}

function recordAttempt(user: ReefTrackUser | undefined, email: string, role: Role, successful: boolean) {
  const history = read<Array<Record<string, unknown>>>(STORAGE_KEYS.history, [])
  history.unshift({
    id: globalThis.crypto?.randomUUID?.() || `login-${Date.now()}`,
    user: user?.name || "Unknown user",
    email,
    role,
    timestamp: new Date().toISOString(),
    device: deviceName(),
    ipAddress: "Not available",
    status: successful ? "Successful" : "Failed",
  })
  localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(history.slice(0, 100)))
}

function cacheUser(user: ReefTrackUser) {
  const users = read<ReefTrackUser[]>(STORAGE_KEYS.users, [])
  const existing = users.find((item) => item.id === user.id || normalizeEmail(item.email) === normalizeEmail(user.email))
  if (existing) Object.assign(existing, user)
  else users.push(user)
  localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users))
}

function openWorkspaceSession(user: ReefTrackUser, remember: boolean) {
  sessionStorage.setItem(STORAGE_KEYS.session, JSON.stringify({
    accountId: user.id,
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    settings: user.settings || {},
  }))
  if (remember) localStorage.setItem(STORAGE_KEYS.remembered, JSON.stringify({ email: user.email, role: user.role }))
  else localStorage.removeItem(STORAGE_KEYS.remembered)
}

function saveAuthenticatedUser(user: ReefTrackUser, password: string, remember: boolean) {
  const authenticated: ReefTrackUser = { ...user, password, lastLogin: new Date().toISOString(), status: user.status || "active" }
  cacheUser(authenticated)
  localStorage.setItem(STORAGE_KEYS.credentials, JSON.stringify({ accountId: authenticated.id, ...authenticated }))
  openWorkspaceSession(authenticated, remember)
  recordAttempt(authenticated, authenticated.email, authenticated.role, true)
  return authenticated
}

export function getSession() {
  try {
    const session = JSON.parse(sessionStorage.getItem(STORAGE_KEYS.session) ?? "null")
    return session && isRole(session.role) ? session as Pick<ReefTrackUser, "id" | "name" | "email" | "role" | "settings"> & { accountId?: string } : null
  } catch {
    return null
  }
}

export function getLoginDraft(): LoginDraft | null {
  const pending = (() => {
    try { return JSON.parse(sessionStorage.getItem(STORAGE_KEYS.pending) ?? "null") as LoginDraft | null } catch { return null }
  })()
  const remembered = read<LoginDraft | null>(STORAGE_KEYS.remembered, null)
  sessionStorage.removeItem(STORAGE_KEYS.pending)
  return pending || remembered
}

export function hasRememberedLogin() {
  return Boolean(read<LoginDraft | null>(STORAGE_KEYS.remembered, null))
}

export async function createAccount(input: RegistrationInput) {
  const email = normalizeEmail(input.email)
  if (input.password.length < 8) return { ok: false as const, message: "Use at least 8 characters for your password." }
  if (input.password !== input.confirmPassword) return { ok: false as const, message: "The passwords do not match." }

  const users = read<ReefTrackUser[]>(STORAGE_KEYS.users, [])
  if (users.some((user) => normalizeEmail(user.email) === email)) return { ok: false as const, message: "An account already uses this email address." }

  const id = globalThis.crypto?.randomUUID?.() || `user-${Date.now()}`
  const registration = await apiPost<{ user?: ReefTrackUser }>("/api/auth/register", {
    id,
    name: input.name.trim(),
    email,
    password: input.password,
    role: input.role,
    organization: input.organization?.trim() || "",
    contact: input.contact?.trim() || "",
  })
  if (!registration.response.ok || !registration.data.ok) {
    return { ok: false as const, message: registration.data.message || "Unable to register this account." }
  }

  const user: ReefTrackUser = {
    id: registration.data.user?.id || id,
    name: input.name.trim(),
    email,
    password: input.password,
    role: input.role,
    organization: input.organization?.trim(),
    contact: input.contact?.trim(),
    status: "active",
    settings: {},
  }
  users.push(user)
  localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users))
  sessionStorage.setItem(STORAGE_KEYS.pending, JSON.stringify({ email, role: user.role }))
  return { ok: true as const, requiresEmailConfirmation: false }
}

export async function authenticate(input: { email: string; password: string; role: Role; remember: boolean }) {
  const email = normalizeEmail(input.email)
  const users = read<ReefTrackUser[]>(STORAGE_KEYS.users, [])
  const latest = read<StoredCredentials | null>(STORAGE_KEYS.credentials, null)
  let serviceUnavailable = false

  try {
    const login = await apiPost<{ user?: ReefTrackUser }>("/api/auth/login", { email, password: input.password, role: input.role })
    if (login.response.ok && login.data.ok && login.data.user && isRole(login.data.user.role)) {
      const user = saveAuthenticatedUser({ ...login.data.user, settings: {} }, input.password, input.remember)
      return { ok: true as const, user }
    }
    if (login.data.code === "ROLE_MISMATCH" && login.data.registeredRole && isRole(login.data.registeredRole)) {
      return { ok: false as const, message: `This account is registered as ${roleLabels[login.data.registeredRole]}. Select the correct role and try again.`, registeredRole: login.data.registeredRole }
    }
    if (login.data.code !== "ACCOUNT_NOT_FOUND") {
      recordAttempt(users.find((item) => normalizeEmail(item.email) === email), email, input.role, false)
      return { ok: false as const, message: login.data.message || "The email or password is incorrect." }
    }
  } catch {
    // Existing browser accounts remain available during a temporary server outage.
    serviceUnavailable = true
  }

  let user = users.find((item) => normalizeEmail(item.email) === email && item.password === input.password)
  if (!user && latest && normalizeEmail(latest.email) === email && latest.password === input.password) {
    const latestId = latest.id || latest.accountId || `user-${Date.now()}`
    user = users.find((item) => item.id === latestId) || { ...latest, id: latestId }
    if (!users.some((item) => item.id === user?.id)) users.push(user)
  }
  if (!user) {
    recordAttempt(users.find((item) => normalizeEmail(item.email) === email), email, input.role, false)
    return { ok: false as const, message: serviceUnavailable
      ? "Unable to reach the login service, and no matching saved account was found in this browser. Open ReefTrack from its running app server and try again."
      : "The email or password is incorrect." }
  }
  if (user.role !== input.role) return { ok: false as const, message: `This account is registered as ${roleLabels[user.role]}. Select the correct role and try again.`, registeredRole: user.role }
  if (user.status === "inactive") {
    recordAttempt(user, email, input.role, false)
    return { ok: false as const, message: "This account is inactive. Contact the Faculty administrator." }
  }

  const authenticated = saveAuthenticatedUser(user, input.password, input.remember)
  void apiPost("/api/auth/sync", {
    id: user.id,
    name: user.name,
    email: user.email,
    password: input.password,
    role: user.role,
    organization: user.organization || "",
    contact: user.contact || "",
    status: user.status || "active",
  }).catch(() => undefined)
  return { ok: true as const, user: authenticated }
}

async function syncLocalAccount(email: string) {
  const normalized = normalizeEmail(email)
  const users = read<ReefTrackUser[]>(STORAGE_KEYS.users, [])
  const latest = read<StoredCredentials | null>(STORAGE_KEYS.credentials, null)
  const local = users.find((user) => normalizeEmail(user.email) === normalized)
    || (latest && normalizeEmail(latest.email) === normalized ? { ...latest, id: latest.id || latest.accountId || `user-${Date.now()}` } as ReefTrackUser : undefined)
  if (!local?.password) return
  await apiPost("/api/auth/sync", {
    id: local.id,
    name: local.name,
    email: local.email,
    password: local.password,
    role: local.role,
    organization: local.organization || "",
    contact: local.contact || "",
    status: local.status || "active",
  })
}

export async function requestPasswordResetCode(email: string) {
  const normalized = normalizeEmail(email)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return { ok: false as const, message: "Enter a valid registered email address." }
  try {
    await syncLocalAccount(normalized)
    const { response, data } = await apiPost("/api/password-recovery/request", { email: normalized })
    return response.ok && data.ok
      ? { ok: true as const, message: data.message || "Verification code sent." }
      : { ok: false as const, message: data.message || "Unable to send the verification code." }
  } catch {
    return { ok: false as const, message: "Unable to contact the password recovery service." }
  }
}

export async function verifyPasswordResetCode(email: string, code: string) {
  try {
    const { response, data } = await apiPost<{ token?: string }>("/api/password-recovery/verify", { email: normalizeEmail(email), code })
    return response.ok && data.ok && data.token
      ? { ok: true as const, token: data.token, message: data.message || "Email verified." }
      : { ok: false as const, message: data.message || "Unable to verify this code." }
  } catch {
    return { ok: false as const, message: "Unable to contact the password recovery service." }
  }
}

export async function completePasswordReset(email: string, token: string, password: string, confirmation: string) {
  if (password.length < 8) return { ok: false as const, message: "Use at least 8 characters for your new password." }
  if (password !== confirmation) return { ok: false as const, message: "The new passwords do not match." }
  const normalized = normalizeEmail(email)
  try {
    const { response, data } = await apiPost("/api/password-recovery/complete", { email: normalized, token, password })
    if (!response.ok || !data.ok) return { ok: false as const, message: data.message || "Unable to update the password." }

    const users = read<ReefTrackUser[]>(STORAGE_KEYS.users, [])
    users.forEach((user) => {
      if (normalizeEmail(user.email) === normalized) user.password = password
    })
    localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users))
    const latest = read<StoredCredentials | null>(STORAGE_KEYS.credentials, null)
    if (latest && normalizeEmail(latest.email) === normalized) {
      localStorage.setItem(STORAGE_KEYS.credentials, JSON.stringify({ ...latest, password }))
    }
    return { ok: true as const, message: data.message || "Password updated." }
  } catch {
    return { ok: false as const, message: "Unable to contact the password recovery service." }
  }
}
