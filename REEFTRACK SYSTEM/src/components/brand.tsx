import { Link } from "react-router-dom"

import { cn } from "@/lib/utils"

export function Brand({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <Link to="/" className={cn("inline-flex items-center gap-3 text-foreground no-underline", className)} aria-label="ReefTrack home">
      <img src="/assets/images/LOGO.png" alt="" className="size-11 object-contain" />
      <span className="grid">
        <strong className="text-xl leading-tight tracking-tight">ReefTrack</strong>
        {!compact && <small className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Artificial reef records</small>}
      </span>
    </Link>
  )
}
