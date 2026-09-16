import assert from "node:assert/strict"
import { test } from "node:test"
import { authenticate, getSession, STORAGE_KEYS } from "../src/lib/auth.ts"

function storage() {
  const values = new Map()
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }
}

test("login response handling", async t => {
  const originalFetch = globalThis.fetch
  const user = { id: "test-user", name: "Test User", email: "test@example.invalid", password: "test-password", role: "faculty", status: "active" }
  const input = { email: user.email, password: user.password, role: user.role, remember: false }
  const cases = [
    { name: "HTML response uses matching saved account", body: "<!doctype html><html></html>", status: 404, saved: user, ok: true },
    { name: "empty response uses matching saved account", body: "", status: 502, saved: user, ok: true },
    { name: "unexpected JSON uses matching saved account", body: "null", status: 200, saved: user, ok: true },
    { name: "server rejection does not use saved credentials", body: JSON.stringify({ ok: false, message: "Incorrect password" }), status: 401, saved: user, ok: false },
    { name: "unavailable API does not admit unknown users", body: "<html></html>", status: 404, ok: false },
    { name: "unavailable API does not admit inactive users", body: "<html></html>", status: 404, saved: { ...user, status: "inactive" }, ok: false },
    { name: "unavailable API does not admit wrong role", body: "<html></html>", status: 404, saved: { ...user, role: "technician" }, ok: false },
    { name: "valid server login opens session", body: JSON.stringify({ ok: true, user }), status: 200, ok: true },
  ]
  try {
    for (const scenario of cases) await t.test(scenario.name, async () => {
      globalThis.localStorage = storage()
      globalThis.sessionStorage = storage()
      if (scenario.saved) localStorage.setItem(STORAGE_KEYS.users, JSON.stringify([scenario.saved]))
      globalThis.fetch = async () => new Response(scenario.body, { status: scenario.status })
      const result = await authenticate(input)
      assert.equal(result.ok, scenario.ok)
      assert.equal(getSession()?.id ?? null, scenario.ok ? user.id : null)
      if (!scenario.saved && !scenario.ok) assert.match(result.message, /running app server/)
    })
  } finally {
    globalThis.fetch = originalFetch
    delete globalThis.localStorage
    delete globalThis.sessionStorage
  }
})
