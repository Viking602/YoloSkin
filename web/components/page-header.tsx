import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function PageHeader({
  title,
  description,
  actions,
  className
}: {
  title: string
  description?: string
  actions?: ReactNode
  className?: string
}) {
  return (
    <header className={cn("page-header", className)}>
      <div className="page-header-copy">
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="page-header-actions">{actions}</div> : null}
    </header>
  )
}

export function PagePanel({
  children,
  className,
  padded = true
}: {
  children: ReactNode
  className?: string
  padded?: boolean
}) {
  return (
    <section className={cn("page-panel", padded && "page-panel-padded", className)}>
      {children}
    </section>
  )
}

export function PageStack({
  children,
  className
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn("page-stack", className)}>{children}</div>
}

export function Count({
  value,
  unit
}: {
  value: number
  unit: string
}) {
  return (
    <span className="count-with-unit">
      <span className="tabular-nums">{value}</span>
      <span>{unit}</span>
    </span>
  )
}

export function FormBanner({
  children,
  tone = "danger"
}: {
  children: ReactNode
  tone?: "danger" | "success" | "muted"
}) {
  return <div className={cn("form-banner", `form-banner-${tone}`)}>{children}</div>
}
