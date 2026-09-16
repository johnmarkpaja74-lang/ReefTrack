import { ArrowLeft } from "@phosphor-icons/react"
import { Link } from "react-router-dom"

import { Brand } from "@/components/brand"

type AuthLayoutProps = {
  mode: "login" | "signup"
  children: React.ReactNode
}

export function AuthLayout({ mode, children }: AuthLayoutProps) {
  const signup = mode === "signup"
  return (
    <main className="min-h-dvh overflow-x-hidden bg-[#f3f6ef] sm:px-5 sm:py-5 lg:grid lg:place-items-center">
      <div className="mx-auto grid min-h-dvh w-full min-w-0 max-w-[1180px] overflow-hidden bg-card sm:min-h-[calc(100dvh-2.5rem)] sm:rounded-2xl sm:border sm:border-border sm:shadow-[0_20px_60px_rgba(29,67,53,.10)] lg:min-h-[680px] lg:grid-cols-[.88fr_1.12fr]">
        <aside className="relative hidden overflow-hidden bg-[#e4ecde] p-9 lg:flex lg:flex-col xl:p-11">
          <Brand />
          <div className="my-auto max-w-[470px] py-10">
            <p className="eyebrow">{signup ? "Join the shared record" : "Connected field records"}</p>
            <h1 className="mt-3 font-display text-[clamp(2.65rem,4vw,3.55rem)] leading-[1.02] tracking-[-.035em] text-foreground">
              {signup ? "Create an account for your role in reef production." : "Welcome back to the reef production workspace."}
            </h1>
            <p className="mt-5 max-w-md text-sm leading-6 text-muted-foreground">
              {signup ? "Your workspace is matched to the responsibilities you select during registration." : "Continue managing batches, validating field records, and tracking deployments from workshop to water."}
            </p>
            {signup ? (
              <ol className="mt-10 divide-y divide-[#cad7c4] border-y border-[#cad7c4] text-sm text-[#365a4b]">
                {["Register your details", "Select your workspace", "Begin recording fieldwork"].map((item, index) => (
                  <li className="flex gap-4 py-3.5" key={item}><span className="text-xs text-[#708679]">0{index + 1}</span><b>{item}</b></li>
                ))}
              </ol>
            ) : (
              <div className="relative mt-8 overflow-hidden rounded-xl border border-[#c6d4bf] bg-[#dce7d7] p-3">
                <img src="/assets/images/reef-field.svg" alt="Artificial reef production workflow" className="aspect-[4/3] max-h-[245px] w-full object-contain opacity-95" />
                <div className="absolute inset-x-3 bottom-3 flex justify-between rounded-md bg-white/90 px-3 py-2.5 text-[9px] font-bold uppercase tracking-[.12em] text-[#315c4b] shadow-sm backdrop-blur">
                  <span>Workshop</span><span>Validate</span><span>Deploy</span>
                </div>
              </div>
            )}
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#718577]">DOrSU Artificial Reef Production Facility</p>
        </aside>
        <section className="relative flex min-w-0 flex-col overflow-hidden px-5 py-5 sm:px-9 sm:py-6 lg:px-12 lg:py-9 xl:px-16">
          <div className="flex min-w-0 flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between lg:min-h-6 lg:justify-end">
            <Brand className="lg:hidden" compact />
            <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline lg:absolute lg:right-12 lg:top-9 xl:right-16">
              <ArrowLeft className="size-4" /> Back to homepage
            </Link>
          </div>
          <div className="mb-auto mt-10 w-full max-w-xl py-0 sm:mt-12 sm:py-2 lg:my-auto lg:py-8">{children}</div>
        </section>
      </div>
    </main>
  )
}
