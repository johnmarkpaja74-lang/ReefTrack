import react from "react"
import { ArrowRight, CheckCircle, EnvelopeSimple, Eye, EyeSlash, Info, Key, ShieldCheck, WarningCircle, X } from "@phosphor-icons/react"
import { Link, useSearchParams } from "react-router-dom"

import { AuthLayout } from "@/components/auth-layout"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { authenticate, completePasswordReset, getLoginDraft, hasRememberedLogin, requestPasswordResetCode, roleDestinations, roleLabels, verifyPasswordResetCode, type Role } from "@/lib/auth"

type Notice = { type: "error" | "success"; text: string } | null

export function LoginPage() {
  const [searchParams] = useSearchParams()
  const draft = react.useMemo(() => getLoginDraft(), [])
  const requestedRole = searchParams.get("role") as Role | null
  const initialRole = requestedRole && requestedRole in roleLabels ? requestedRole : draft?.role || ""
  const [role, setRole] = react.useState<Role | "">(initialRole)
  const [email, setEmail] = react.useState(draft?.email || "")
  const [remember, setRemember] = react.useState(hasRememberedLogin())
  const [showPassword, setShowPassword] = react.useState(false)
  const [recoveryOpen, setRecoveryOpen] = react.useState(searchParams.get("forgot") === "1")
  const [notice, setNotice] = react.useState<Notice>(() => searchParams.get("created") === "confirmation"
    ? { type: "success", text: "Account created. Check your email and confirm the registration before logging in." }
    : searchParams.get("created") === "ready"
      ? { type: "success", text: "Account created. You can now log in." }
      : searchParams.get("reset") === "success"
        ? { type: "success", text: "Password updated. Log in with your new password." }
        : null)
  const [submitting, setSubmitting] = react.useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!role) return setNotice({ type: "error", text: "Select the workspace registered to your account." })
    const form = new FormData(event.currentTarget)
    setSubmitting(true)
    try {
      const result = await authenticate({ email, password: String(form.get("password") || ""), role, remember })
      if (!result.ok) {
        if (result.registeredRole) setRole(result.registeredRole)
        setNotice({ type: "error", text: result.message })
        setSubmitting(false)
        return
      }
      setNotice({ type: "success", text: `Welcome, ${result.user.name}. Opening your workspace…` })
      window.setTimeout(() => window.location.assign(roleDestinations[result.user.role]), 350)
    } catch {
      setNotice({ type: "error", text: "Unable to contact the authentication service. Check your connection and try again." })
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout mode="login">
      <p className="eyebrow">Account access</p>
      <h1 className="mt-2.5 font-display text-3xl tracking-tight sm:text-4xl">Log in</h1>
      <p className="mt-2 text-sm text-muted-foreground">Use the role and credentials registered to your account.</p>
      {import.meta.env.DEV && (
        <Button asChild variant="outline" className="mt-4 w-full">
          <Link to={`/demo?role=${role || "faculty"}`}>Open local demo — no login required<ArrowRight /></Link>
        </Button>
      )}

      {notice && (
        <div className={`mt-5 flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${notice.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`} role="alert">
          {notice.type === "success" ? <Info className="mt-0.5 size-4 shrink-0" weight="fill" /> : <WarningCircle className="mt-0.5 size-4 shrink-0" weight="fill" />}
          <span>{notice.text}</span>
        </div>
      )}

      <form className="mt-6 grid gap-5" onSubmit={submit}>
        <div className="grid gap-2">
          <Label htmlFor="login-role">User role</Label>
          <Select value={role} onValueChange={(value) => setRole(value as Role)}>
            <SelectTrigger id="login-role" aria-label="User role"><SelectValue placeholder="Select your role" /></SelectTrigger>
            <SelectContent>
              {Object.entries(roleLabels).map(([value, label]) => <SelectItem value={value} key={value}>{label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="login-email">Email address</Label>
          <Input id="login-email" name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="login-password">Password</Label>
          <div className="relative">
            <Input id="login-password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" className="pr-12" placeholder="Enter your password" required />
            <button type="button" className="absolute inset-y-0 right-0 grid w-12 place-items-center text-muted-foreground hover:text-foreground" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"}>
              {showPassword ? <EyeSlash className="size-5" /> : <Eye className="size-5" />}
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Label className="flex cursor-pointer items-center gap-2.5 font-medium"><Checkbox checked={remember} onCheckedChange={(checked) => setRemember(checked === true)} /> Remember my email</Label>
          <button type="button" className="font-semibold text-primary underline-offset-4 hover:underline" onClick={() => setRecoveryOpen(true)}>Forgot password?</button>
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={submitting}>{submitting ? "Checking account…" : "Log in to ReefTrack"} {!submitting && <ArrowRight weight="bold" />}</Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">New to ReefTrack? <Link to="/signup" className="font-semibold text-primary underline underline-offset-4">Create an account</Link></p>

      {recoveryOpen && (
        <PasswordRecoveryDialog
          initialEmail={email}
          onClose={() => setRecoveryOpen(false)}
          onComplete={(registeredEmail) => {
            setEmail(registeredEmail)
            setRecoveryOpen(false)
            setNotice({ type: "success", text: "Password updated. Log in with your new password." })
          }}
        />
      )}
    </AuthLayout>
  )
}

type RecoveryStep = "email" | "code" | "password" | "complete"

function PasswordRecoveryDialog({ initialEmail, onClose, onComplete }: { initialEmail: string; onClose: () => void; onComplete: (email: string) => void }) {
  const [step, setStep] = react.useState<RecoveryStep>("email")
  const [email, setEmail] = react.useState(initialEmail)
  const [code, setCode] = react.useState("")
  const [token, setToken] = react.useState("")
  const [newPassword, setNewPassword] = react.useState("")
  const [confirmation, setConfirmation] = react.useState("")
  const [showNewPassword, setShowNewPassword] = react.useState(false)
  const [notice, setNotice] = react.useState<Notice>(null)
  const [submitting, setSubmitting] = react.useState(false)

  react.useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", closeOnEscape)
    }
  }, [onClose])

  async function sendCode(event?: React.FormEvent) {
    event?.preventDefault()
    setSubmitting(true)
    setNotice(null)
    const result = await requestPasswordResetCode(email)
    setSubmitting(false)
    if (!result.ok) return setNotice({ type: "error", text: result.message })
    setStep("code")
    setNotice({ type: "success", text: result.message })
  }

  async function verifyCode(event: React.FormEvent) {
    event.preventDefault()
    if (code.length !== 6) return setNotice({ type: "error", text: "Enter the complete six-digit code from your email." })
    setSubmitting(true)
    setNotice(null)
    const result = await verifyPasswordResetCode(email, code)
    setSubmitting(false)
    if (!result.ok) return setNotice({ type: "error", text: result.message })
    setToken(result.token)
    setStep("password")
    setNotice({ type: "success", text: result.message })
  }

  async function updatePassword(event: React.FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setNotice(null)
    const result = await completePasswordReset(email, token, newPassword, confirmation)
    setSubmitting(false)
    if (!result.ok) return setNotice({ type: "error", text: result.message })
    setStep("complete")
    setNotice(null)
  }

  const stepNumber = step === "email" ? 1 : step === "code" ? 2 : 3

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-[#102d26]/70 p-4 backdrop-blur-[2px]" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-background shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="recovery-title">
        <div className="border-b border-border bg-secondary/45 px-6 py-5 sm:px-8">
          <button type="button" className="absolute right-4 top-4 grid size-10 place-items-center rounded-md border border-border bg-background text-muted-foreground hover:text-foreground" onClick={onClose} aria-label="Close password recovery"><X className="size-5" /></button>
          <div className="flex items-center gap-3 pr-12">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"><Key className="size-5" weight="duotone" /></span>
            <div><p className="eyebrow mb-1">Secure account recovery</p><h2 id="recovery-title" className="text-2xl font-semibold">Reset your password</h2></div>
          </div>
          {step !== "complete" && (
            <div className="mt-5 grid grid-cols-3 gap-2" aria-label={`Step ${stepNumber} of 3`}>
              {[1, 2, 3].map((number) => <span key={number} className={`h-1.5 rounded-full ${number <= stepNumber ? "bg-primary" : "bg-border"}`} />)}
            </div>
          )}
        </div>

        <div className="px-6 py-6 sm:px-8 sm:py-7">
          {notice && (
            <div className={`mb-5 flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${notice.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`} role="alert">
              {notice.type === "success" ? <Info className="mt-0.5 size-4 shrink-0" weight="fill" /> : <WarningCircle className="mt-0.5 size-4 shrink-0" weight="fill" />}
              <span>{notice.text}</span>
            </div>
          )}

          {step === "email" && (
            <form className="grid gap-5" onSubmit={sendCode}>
              <div><h3 className="text-lg font-semibold">Confirm your registered email</h3><p className="mt-1 text-sm text-muted-foreground">We will send a six-digit verification code to the email registered with your ReefTrack account.</p></div>
              <div className="grid gap-2.5"><Label htmlFor="recovery-email">Registered email address</Label><div className="relative"><EnvelopeSimple className="absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" /><Input id="recovery-email" type="email" autoComplete="email" className="pl-11" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@dorsu.edu.ph" autoFocus required /></div></div>
              <Button type="submit" size="lg" className="w-full" disabled={submitting}>{submitting ? "Sending code…" : "Send verification code"}<ArrowRight weight="bold" /></Button>
            </form>
          )}

          {step === "code" && (
            <form className="grid gap-5" onSubmit={verifyCode}>
              <div><h3 className="text-lg font-semibold">Enter the verification code</h3><p className="mt-1 text-sm text-muted-foreground">Check <strong className="font-semibold text-foreground">{email}</strong>. The code expires in 10 minutes.</p></div>
              <div className="grid gap-2.5"><Label htmlFor="recovery-code">Six-digit code</Label><Input id="recovery-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} className="h-14 text-center text-2xl font-semibold tracking-[0.45em]" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" autoFocus required /></div>
              <Button type="submit" size="lg" className="w-full" disabled={submitting}>{submitting ? "Verifying…" : "Verify code"}<ShieldCheck weight="bold" /></Button>
              <button type="button" className="text-sm font-semibold text-primary hover:underline disabled:opacity-50" onClick={() => void sendCode()} disabled={submitting}>Send a new code</button>
            </form>
          )}

          {step === "password" && (
            <form className="grid gap-5" onSubmit={updatePassword}>
              <div><h3 className="text-lg font-semibold">Create a new password</h3><p className="mt-1 text-sm text-muted-foreground">Use at least eight characters. Your reset session expires in 10 minutes.</p></div>
              <RecoveryPasswordField id="recovery-password" label="New password" value={newPassword} onChange={setNewPassword} visible={showNewPassword} onToggle={() => setShowNewPassword((value) => !value)} />
              <RecoveryPasswordField id="recovery-confirmation" label="Confirm new password" value={confirmation} onChange={setConfirmation} visible={showNewPassword} onToggle={() => setShowNewPassword((value) => !value)} />
              <Button type="submit" size="lg" className="w-full" disabled={submitting}>{submitting ? "Updating password…" : "Update password"}<ShieldCheck weight="bold" /></Button>
            </form>
          )}

          {step === "complete" && (
            <div className="grid justify-items-center gap-5 py-2 text-center">
              <span className="grid size-16 place-items-center rounded-full bg-emerald-100 text-emerald-700"><CheckCircle className="size-9" weight="fill" /></span>
              <div><h3 className="text-xl font-semibold">Password updated</h3><p className="mt-2 text-sm text-muted-foreground">Your new password is ready. Use it to log in to your ReefTrack workspace.</p></div>
              <Button type="button" size="lg" className="w-full" onClick={() => onComplete(email)}>Back to login<ArrowRight weight="bold" /></Button>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function RecoveryPasswordField({ id, label, value, onChange, visible, onToggle }: { id: string; label: string; value: string; onChange: (value: string) => void; visible: boolean; onToggle: () => void }) {
  return (
    <div className="grid gap-2.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input id={id} type={visible ? "text" : "password"} autoComplete="new-password" minLength={8} className="pr-12" value={value} onChange={(event) => onChange(event.target.value)} required />
        <button type="button" className="absolute inset-y-0 right-0 grid w-12 place-items-center text-muted-foreground hover:text-foreground" onClick={onToggle} aria-label={visible ? "Hide password" : "Show password"}>{visible ? <EyeSlash className="size-5" /> : <Eye className="size-5" />}</button>
      </div>
    </div>
  )
}
