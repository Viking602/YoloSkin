"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/lib/i18n/context"
import { 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Lock, 
  ShieldX, 
  Clock, 
  RefreshCw,
  Home,
  LogIn,
  Plus
} from "lucide-react"

interface StateViewProps {
  title?: string
  description?: string
  action?: {
    label: string
    onClick?: () => void
    href?: string
  }
  secondaryAction?: {
    label: string
    onClick?: () => void
    href?: string
  }
}

// 像素风方块图标
function PixelBlock({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none">
      {/* 草方块 */}
      <rect x="0" y="0" width="64" height="20" fill="#5D8C3E"/>
      <rect x="0" y="4" width="8" height="8" fill="#4A7A2E"/>
      <rect x="16" y="8" width="8" height="8" fill="#6B9C4A"/>
      <rect x="32" y="4" width="8" height="8" fill="#4A7A2E"/>
      <rect x="48" y="8" width="8" height="8" fill="#6B9C4A"/>
      {/* 泥土 */}
      <rect x="0" y="20" width="64" height="44" fill="#8B6914"/>
      <rect x="8" y="28" width="8" height="8" fill="#7A5A12"/>
      <rect x="24" y="36" width="8" height="8" fill="#9C7A1C"/>
      <rect x="40" y="28" width="8" height="8" fill="#7A5A12"/>
      <rect x="16" y="48" width="8" height="8" fill="#9C7A1C"/>
      <rect x="48" y="44" width="8" height="8" fill="#7A5A12"/>
    </svg>
  )
}

// 加载状态
export function LoadingState({ title, description }: StateViewProps) {
  const { t } = useI18n()
  const resolvedTitle = title ?? t("state.loading")
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="relative">
        <PixelBlock className="w-16 h-16 opacity-20" />
        <Loader2 className="w-8 h-8 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin text-primary" />
      </div>
      <h3 className="mt-4 text-lg font-medium text-foreground">{resolvedTitle}</h3>
      {description && (
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  )
}

// 空状态
export function EmptyState({ 
  title,
  description,
  action 
}: StateViewProps) {
  const { t } = useI18n()
  const resolvedTitle = title ?? t("state.emptyTitle")
  const resolvedDescription = description ?? t("state.emptyDescription")
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="relative mb-4">
        <PixelBlock className="w-20 h-20 opacity-50" />
      </div>
      <h3 className="text-lg font-medium text-foreground">{resolvedTitle}</h3>
      <p className="mt-2 text-sm text-muted-foreground text-center max-w-sm">{resolvedDescription}</p>
      {action && (
        <div className="mt-6">
          {action.href ? (
            <Button asChild>
              <Link href={action.href}>
                <Plus className="w-4 h-4 mr-2" />
                {action.label}
              </Link>
            </Button>
          ) : (
            <Button onClick={action.onClick}>
              <Plus className="w-4 h-4 mr-2" />
              {action.label}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

// 错误状态
export function ErrorState({ 
  title,
  description,
  action 
}: StateViewProps) {
  const { t } = useI18n()
  const resolvedTitle = title ?? t("state.errorTitle")
  const resolvedDescription = description ?? t("state.errorDescription")
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8 text-destructive" />
      </div>
      <h3 className="text-lg font-medium text-foreground">{resolvedTitle}</h3>
      <p className="mt-2 text-sm text-muted-foreground text-center max-w-sm">{resolvedDescription}</p>
      {action && (
        <div className="mt-6">
          <Button variant="outline" onClick={action.onClick}>
            <RefreshCw className="w-4 h-4 mr-2" />
            {action.label}
          </Button>
        </div>
      )}
    </div>
  )
}

// 成功状态
export function SuccessState({ 
  title,
  description,
  action 
}: StateViewProps) {
  const { t } = useI18n()
  const resolvedTitle = title ?? t("state.successTitle")
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <CheckCircle2 className="w-8 h-8 text-primary" />
      </div>
      <h3 className="text-lg font-medium text-foreground">{resolvedTitle}</h3>
      {description && (
        <p className="mt-2 text-sm text-muted-foreground text-center max-w-sm">{description}</p>
      )}
      {action && (
        <div className="mt-6">
          {action.href ? (
            <Button asChild>
              <Link href={action.href}>{action.label}</Link>
            </Button>
          ) : (
            <Button onClick={action.onClick}>{action.label}</Button>
          )}
        </div>
      )}
    </div>
  )
}

// 401 未登录状态
export function UnauthenticatedState({ 
  title,
  description
}: StateViewProps) {
  const { t } = useI18n()
  const resolvedTitle = title ?? t("state.unauthTitle")
  const resolvedDescription = description ?? t("state.unauthDescription")
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mb-4">
        <Lock className="w-8 h-8 text-warning" />
      </div>
      <h3 className="text-lg font-medium text-foreground">{resolvedTitle}</h3>
      <p className="mt-2 text-sm text-muted-foreground text-center max-w-sm">{resolvedDescription}</p>
      <div className="mt-6">
        <Button asChild>
          <Link href="/auth/login">
            <LogIn className="w-4 h-4 mr-2" />
            {t("state.goLogin")}
          </Link>
        </Button>
      </div>
    </div>
  )
}

// 403 无权限状态
export function ForbiddenState({ 
  title,
  description,
  action,
  secondaryAction
}: StateViewProps) {
  const { t } = useI18n()
  const resolvedTitle = title ?? t("state.forbiddenTitle")
  const resolvedDescription = description ?? t("state.forbiddenDescription")
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
        <ShieldX className="w-8 h-8 text-destructive" />
      </div>
      <h3 className="text-lg font-medium text-foreground">{resolvedTitle}</h3>
      <p className="mt-2 text-sm text-muted-foreground text-center max-w-sm">{resolvedDescription}</p>
      <div className="mt-6 flex gap-3">
        {secondaryAction && (
          <Button variant="outline" onClick={secondaryAction.onClick}>
            {secondaryAction.label}
          </Button>
        )}
        <Button asChild>
          <Link href="/">
            <Home className="w-4 h-4 mr-2" />
            {t("common.backHome")}
          </Link>
        </Button>
      </div>
    </div>
  )
}

// 429 限流状态
export function RateLimitState({ 
  title,
  description
}: StateViewProps) {
  const { t } = useI18n()
  const resolvedTitle = title ?? t("state.rateLimitTitle")
  const resolvedDescription = description ?? t("state.rateLimitDescription")
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mb-4">
        <Clock className="w-8 h-8 text-warning" />
      </div>
      <h3 className="text-lg font-medium text-foreground">{resolvedTitle}</h3>
      <p className="mt-2 text-sm text-muted-foreground text-center max-w-sm">{resolvedDescription}</p>
      <div className="mt-4 px-4 py-2 bg-warning/10 border border-warning/20 rounded-lg">
        <p className="text-sm text-warning">{t("state.rateLimitWait")}</p>
      </div>
    </div>
  )
}

// CSRF 失败状态
export function CSRFErrorState({ 
  title,
  description
}: StateViewProps) {
  const { t } = useI18n()
  const resolvedTitle = title ?? t("state.csrfTitle")
  const resolvedDescription = description ?? t("state.csrfDescription")
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
        <ShieldX className="w-8 h-8 text-destructive" />
      </div>
      <h3 className="text-lg font-medium text-foreground">{resolvedTitle}</h3>
      <p className="mt-2 text-sm text-muted-foreground text-center max-w-sm">{resolvedDescription}</p>
      <div className="mt-6">
        <Button onClick={() => window.location.reload()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          {t("state.refreshPage")}
        </Button>
      </div>
    </div>
  )
}

// 骨架屏加载
export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="w-full">
      {/* 表头骨架 */}
      <div className="flex gap-4 p-4 border-b border-border bg-muted/50">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="h-4 bg-muted rounded animate-pulse flex-1" />
        ))}
      </div>
      {/* 行骨架 */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 p-4 border-b border-border">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div 
              key={colIndex} 
              className="h-4 bg-muted rounded animate-pulse flex-1"
              style={{ animationDelay: `${(rowIndex * columns + colIndex) * 50}ms` }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

// 卡片骨架屏
export function CardSkeleton() {
  return (
    <div className="mc-card p-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-muted rounded animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-muted rounded animate-pulse w-1/3" />
          <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
        </div>
      </div>
    </div>
  )
}
