import { useState } from "react"
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Binoculars,
  ChartLineUp,
  CheckCircle,
  Cube,
  Flask,
  List,
  MapPin,
  ShieldCheck,
  X,
} from "@phosphor-icons/react"
import { Link } from "react-router-dom"

import { Brand } from "@/components/brand"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getSession, roleDestinations } from "@/lib/auth"

const workflow = [
  { title: "Evaluate", copy: "Check material proportions and curing targets against documented rules.", icon: Flask },
  { title: "Produce", copy: "Register production dates, quantities, assigned technicians, and observations.", icon: Cube },
  { title: "Validate", copy: "Record curing progress and Faculty quality-control decisions before deployment.", icon: ShieldCheck },
  { title: "Deploy", copy: "Store exact coordinates, site conditions, team details, and monitoring schedules.", icon: MapPin },
  { title: "Monitor", copy: "Connect post-deployment observations and reef conditions to each batch.", icon: Binoculars },
  { title: "Report", copy: "Review verified production, deployment, and monitoring summaries.", icon: ChartLineUp },
]

const roles = [
  { code: "FR", title: "Faculty / Researcher", type: "faculty", note: "Management and validation", copy: "Manage batches, evaluate mixtures, validate quality-control records, oversee users, and generate research reports." },
  { code: "ST", title: "Student Technician", type: "technician", note: "Production and field work", copy: "Encode batches, update curing, scan QR labels, record deployments, and submit monitoring observations." },
  { code: "BL", title: "BFAR / LGU Official", type: "official", note: "Regulatory review", copy: "Inspect validated records, deployment sites, monitoring history, compliance trails, and authorized reports." },
] as const

export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const session = getSession()
  const workspace = session ? roleDestinations[session.role] : "/login"

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/95 backdrop-blur">
        <div className="page-container flex h-16 items-center justify-between sm:h-[72px]">
          <Brand />
          <nav className="hidden items-center gap-8 text-sm font-semibold text-foreground/75 md:flex" aria-label="Main navigation">
            <a href="#workflow" className="hover:text-primary">Workflow</a>
            <a href="#workspaces" className="hover:text-primary">Workspaces</a>
            <a href="#about" className="hover:text-primary">About</a>
            {session ? (
              <Button asChild size="sm"><a href={workspace}>Open workspace <ArrowUpRight /></a></Button>
            ) : (
              <><Link to="/login" className="hover:text-primary">Log in</Link><Button asChild size="sm"><Link to="/signup">Create account</Link></Button></>
            )}
          </nav>
          <Button variant="outline" size="icon" className="md:hidden" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-label="Toggle navigation">
            {menuOpen ? <X /> : <List />}
          </Button>
        </div>
        {menuOpen && (
          <nav className="page-container grid gap-1 border-t py-3 text-sm font-semibold md:hidden" aria-label="Mobile navigation">
            <a href="#workflow" className="rounded-md px-3 py-3 hover:bg-accent" onClick={() => setMenuOpen(false)}>Workflow</a>
            <a href="#workspaces" className="rounded-md px-3 py-3 hover:bg-accent" onClick={() => setMenuOpen(false)}>Workspaces</a>
            <a href="#about" className="rounded-md px-3 py-3 hover:bg-accent" onClick={() => setMenuOpen(false)}>About</a>
            <Button asChild className="mt-2"><Link to={session ? workspace : "/login"}>{session ? "Open workspace" : "Log in"}</Link></Button>
          </nav>
        )}
      </header>

      <main>
        <section className="grid min-h-[calc(100svh-4rem)] items-center overflow-hidden py-10 sm:min-h-[calc(100svh-4.5rem)] sm:py-14 lg:py-16">
          <div className="page-container grid items-center gap-10 lg:grid-cols-2 lg:gap-12">
            <div>
              <p className="eyebrow"><span className="inline-block size-2 rounded-full bg-sea" /> DOrSU Artificial Reef Production Facility</p>
              <h1 className="mt-5 max-w-xl font-display text-[clamp(2.8rem,5vw,4.5rem)] leading-[.97] tracking-[-.04em] text-foreground">Every reef carries a record.</h1>
              <p className="mt-5 max-w-lg text-[15px] leading-7 text-muted-foreground">ReefTrack connects clay mixture evaluation, production batches, quality control, deployment coordinates, and field monitoring in one accountable system.</p>
              <div className="mt-7 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <Button asChild className="w-full sm:w-auto"><Link to={session ? workspace : "/login"}>{session ? "Continue to your workspace" : "Open your workspace"}<ArrowUpRight weight="bold" /></Link></Button>
                <Button asChild variant="ghost" className="w-full sm:w-auto"><a href="#workflow">See how it works <ArrowDown /></a></Button>
              </div>
              <dl className="mt-9 grid max-w-xl grid-cols-1 divide-y border-y py-2 text-sm sm:mt-10 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:py-4">
                {["Batch records", "QR identification", "Field monitoring"].map((fact, index) => (
                  <div key={fact} className="px-0 py-3 sm:px-4 sm:py-0 sm:first:pl-0"><dt className="mb-1 text-xs font-bold text-sea">0{index + 1}</dt><dd className="font-semibold text-foreground">{fact}</dd></div>
                ))}
              </dl>
            </div>
            <figure className="relative mx-auto w-full max-w-[500px]">
              <div className="absolute -inset-8 -z-10 rounded-full bg-[#dce9d5] blur-3xl" />
              <div className="overflow-hidden rounded-2xl border border-[#c9d7c5] bg-[#e3ecde] p-4 shadow-[0_22px_55px_rgba(29,67,53,.12)] sm:p-6">
                <img src="/assets/images/reef-field.svg" alt="Clay-composite artificial reef module and habitat openings" className="aspect-[4/3] w-full rounded-xl object-contain" />
                <figcaption className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-[.12em] text-[#537062]"><span>Field note 001</span><span>Workshop to water</span></figcaption>
              </div>
            </figure>
          </div>
        </section>

        <section className="border-y bg-[#f4f6f1] py-14 sm:py-20" id="workflow">
          <div className="page-container">
            <div className="grid gap-9 lg:grid-cols-[.78fr_1.22fr] lg:gap-14">
              <header className="lg:sticky lg:top-28 lg:self-start">
                <p className="eyebrow">The production record</p>
                <h2 className="mt-3 font-display text-3xl leading-tight tracking-tight sm:text-4xl">One trail from material testing to marine monitoring.</h2>
                <p className="mt-5 max-w-lg leading-7 text-muted-foreground">Each stage adds information to the same batch record, giving researchers, technicians, and reviewers a shared source of truth.</p>
              </header>
              <ol className="grid gap-4 sm:grid-cols-2">
                {workflow.map(({ title, copy, icon: Icon }, index) => (
                  <Card key={title} className="group bg-background transition-transform hover:-translate-y-1">
                    <CardHeader className="flex-row items-start justify-between space-y-0">
                      <span className="text-xs font-bold text-muted-foreground">0{index + 1}</span>
                      <span className="grid size-11 place-items-center rounded-full bg-accent text-primary"><Icon className="size-5" /></span>
                    </CardHeader>
                    <CardContent><CardTitle>{title}</CardTitle><CardDescription className="mt-3">{copy}</CardDescription></CardContent>
                  </Card>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section className="bg-[#e7eee2] py-14 sm:py-20" id="workspaces">
          <div className="page-container">
            <header className="grid items-end gap-5 lg:grid-cols-[1.2fr_.8fr] lg:gap-14">
              <div><p className="eyebrow">Role-based workspaces</p><h2 className="mt-3 max-w-3xl font-display text-3xl leading-tight tracking-tight sm:text-4xl">The right tools for each responsibility.</h2></div>
              <p className="leading-7 text-muted-foreground">Access is organized around each role. All roles contribute to or review the same connected lifecycle.</p>
            </header>
            <div className="mt-9 grid gap-5 lg:grid-cols-3">
              {roles.map((role) => (
                <Card key={role.type} className="flex flex-col bg-background sm:min-h-[285px]">
                  <CardHeader>
                    <div className="mb-6 flex items-center justify-between gap-4"><span className="grid size-11 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{role.code}</span><Badge variant="outline">{role.note}</Badge></div>
                    <CardTitle>{role.title}</CardTitle>
                    <CardDescription className="mt-3">{role.copy}</CardDescription>
                  </CardHeader>
                  <CardContent className="mt-auto"><Button asChild variant="ghost" className="w-full justify-between border-t px-0 pt-6 hover:bg-transparent hover:text-primary"><Link to={`/login?role=${role.type}`}>Enter workspace <ArrowRight weight="bold" /></Link></Button></CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-14 sm:py-20" id="about">
          <div className="page-container grid items-center gap-9 lg:grid-cols-[.4fr_1fr] lg:gap-14">
            <div className="rounded-2xl bg-primary p-8 text-primary-foreground sm:p-10"><span className="font-display text-5xl sm:text-6xl">RT</span><p className="mt-7 text-xs font-bold uppercase tracking-[.15em] text-white/65">Connected lifecycle record</p></div>
            <div><p className="eyebrow">Built for accountable fieldwork</p><h2 className="mt-3 max-w-4xl font-display text-3xl leading-tight tracking-tight sm:text-4xl">Clear records help teams make better decisions above and below the water.</h2><p className="mt-5 max-w-3xl leading-7 text-muted-foreground">ReefTrack supports the Artificial Reef Production Facility of Davao Oriental State University. It keeps operational details traceable and the evaluation criteria clear.</p><div className="mt-7 flex flex-wrap gap-3"><Button asChild><Link to="/signup">Create a ReefTrack account <ArrowRight /></Link></Button><span className="inline-flex items-center gap-2 text-sm font-semibold text-primary"><CheckCircle weight="fill" /> Validated workflow records</span></div></div>
          </div>
        </section>
      </main>

      <footer className="border-t bg-[#f4f6f1] py-10">
        <div className="page-container flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between"><Brand /><p className="text-sm leading-6 text-muted-foreground">Davao Oriental State University<br />Artificial Reef Production Facility</p><nav className="flex flex-wrap gap-5 text-sm font-semibold"><a href="#workflow">Workflow</a><a href="#workspaces">Workspaces</a><Link to="/login">Log in</Link></nav></div>
        <div className="page-container mt-8 flex flex-col justify-between gap-2 border-t pt-5 text-xs text-muted-foreground sm:flex-row"><span>© 2026 ReefTrack</span><span>Production · Validation · Deployment · Monitoring</span></div>
      </footer>
    </div>
  )
}
