import { useState } from "react"
import { ArrowRight, Eye, EyeSlash, WarningCircle } from "@phosphor-icons/react"
import { Link, useNavigate } from "react-router-dom"

import { AuthLayout } from "@/components/auth-layout"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createAccount, roleLabels, type Role } from "@/lib/auth"

export function SignupPage() {
  const navigate = useNavigate()
  const [role, setRole] = useState<Role | "">("")
  const [confirmed, setConfirmed] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [notice, setNotice] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!role) return setNotice("Select the role for your ReefTrack workspace.")
    if (!confirmed) return setNotice("Confirm that the information provided is accurate.")
    const form = new FormData(event.currentTarget)
    setSubmitting(true)
    try {
      const result = await createAccount({
        name: String(form.get("name") || ""),
        email: String(form.get("email") || ""),
        organization: String(form.get("organization") || ""),
        contact: String(form.get("contact") || ""),
        password: String(form.get("password") || ""),
        confirmPassword: String(form.get("confirmPassword") || ""),
        role,
      })
      if (!result.ok) {
        setNotice(result.message)
        setSubmitting(false)
        return
      }
      navigate(`/login?created=${result.requiresEmailConfirmation ? "confirmation" : "ready"}`, { replace: true })
    } catch {
      setNotice("Unable to create the account. Check your connection and try again.")
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout mode="signup">
      <p className="eyebrow">New account</p>
      <h1 className="mt-2.5 font-display text-3xl tracking-tight sm:text-4xl">Create your account</h1>
      <p className="mt-2 text-sm text-muted-foreground">Use accurate contact and organization information.</p>

      {notice && <div className="mt-5 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert"><WarningCircle className="mt-0.5 size-4 shrink-0" weight="fill" /><span>{notice}</span></div>}

      <form className="mt-6 grid gap-x-4 gap-y-4 sm:grid-cols-2" onSubmit={submit}>
        <div className="grid gap-2"><Label htmlFor="signup-name">Full name</Label><Input id="signup-name" name="name" autoComplete="name" required /></div>
        <div className="grid gap-2">
          <Label htmlFor="signup-role">User role</Label>
          <Select value={role} onValueChange={(value) => setRole(value as Role)}>
            <SelectTrigger id="signup-role" aria-label="User role"><SelectValue placeholder="Select your role" /></SelectTrigger>
            <SelectContent>{Object.entries(roleLabels).map(([value, label]) => <SelectItem value={value} key={value}>{label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid gap-2"><Label htmlFor="signup-email">Email address</Label><Input id="signup-email" name="email" type="email" autoComplete="email" required /></div>
        <div className="grid gap-2"><Label htmlFor="signup-organization">Institution / Office</Label><Input id="signup-organization" name="organization" placeholder="e.g. DOrSU or BFAR XI" required /></div>
        <div className="grid gap-2 sm:col-span-2"><Label htmlFor="signup-contact">Contact number</Label><Input id="signup-contact" name="contact" type="tel" autoComplete="tel" /></div>
        <PasswordInput id="signup-password" name="password" label="Password" visible={showPassword} setVisible={setShowPassword} autoComplete="new-password" />
        <PasswordInput id="signup-confirm" name="confirmPassword" label="Confirm password" visible={showConfirmation} setVisible={setShowConfirmation} autoComplete="new-password" />
        <Label className="flex cursor-pointer items-start gap-2.5 font-medium sm:col-span-2"><Checkbox checked={confirmed} onCheckedChange={(checked) => setConfirmed(checked === true)} className="mt-0.5" /> I confirm that the information provided is accurate.</Label>
        <Button type="submit" size="lg" className="w-full sm:col-span-2" disabled={submitting}>{submitting ? "Creating account…" : "Create ReefTrack account"} {!submitting && <ArrowRight weight="bold" />}</Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">Already registered? <Link to="/login" className="font-semibold text-primary underline underline-offset-4">Log in</Link></p>
    </AuthLayout>
  )
}

function PasswordInput({ id, name, label, visible, setVisible, autoComplete }: { id: string; name: string; label: string; visible: boolean; setVisible: (value: boolean) => void; autoComplete: string }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input id={id} name={name} type={visible ? "text" : "password"} autoComplete={autoComplete} minLength={8} className="pr-12" required />
        <button type="button" className="absolute inset-y-0 right-0 grid w-12 place-items-center text-muted-foreground hover:text-foreground" onClick={() => setVisible(!visible)} aria-label={visible ? "Hide password" : "Show password"}>{visible ? <EyeSlash className="size-5" /> : <Eye className="size-5" />}</button>
      </div>
    </div>
  )
}
