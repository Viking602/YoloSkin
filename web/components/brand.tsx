import { cn } from "@/lib/utils"

export function Brand({
  name = "YoloSkin",
  className
}: {
  name?: string
  className?: string
}) {
  return (
    <span className={cn("brand", className)}>
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 3h6v6h6V3h6v6h-6v6h-3v6H6v-9H3V3Z" />
        </svg>
      </span>
      <span className="brand-name">{name}</span>
    </span>
  )
}
