import { useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import { roleDestinations, STORAGE_KEYS, type Role } from "@/lib/auth"

// This page is mounted only by the development server.
export function DemoLoginPage() {
  const [params] = useSearchParams()
  const requested = params.get("role")
  const role: Role = requested === "technician" || requested === "official" ? requested : "faculty"

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEYS.session, JSON.stringify({
      id: `local-demo-${role}`,
      accountId: `local-demo-${role}`,
      name: "Demo User",
      email: `${role}@demo.invalid`,
      role,
      settings: {},
    }))
    window.location.replace(roleDestinations[role])
  }, [role])

  return <p className="p-8" role="status">Opening your demo workspace…</p>
}
