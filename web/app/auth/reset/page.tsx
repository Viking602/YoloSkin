"use client"

import React from "react"

import { useState } from "react"
import Link from "next/link"
import { Eye, EyeOff, Lock, CheckCircle, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AuthCard } from "@/components/auth-card"
import { api } from "@/lib/api"
import { useI18n } from "@/lib/i18n/context"

export default function ResetPasswordPage() {
  const { t } = useI18n()
  const [token, setToken] = useState<string | null>(null)
  
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setToken(params.get("token"))
  }, [])

  // 密码强度检查
  const passwordStrength = {
    hasLength: password.length >= 8,
    hasNumber: /\d/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  }
  const strengthScore = Object.values(passwordStrength).filter(Boolean).length

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      setError(t("auth.resetErrors.passwordMismatch"))
      return
    }

    if (strengthScore < 2) {
      setError(t("auth.resetErrors.passwordWeak"))
      return
    }

    setIsLoading(true)
    setError(null)

    if (!token) {
      setError(t("auth.resetErrors.invalidLink"))
      setIsLoading(false)
      return
    }

    try {
      const response = await api.resetPassword(token, password)
      if (response.code !== 0) {
        setError(response.message || t("auth.resetErrors.expired"))
        return
      }
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : t("auth.resetErrors.expired"))
    } finally {
      setIsLoading(false)
    }
  }

  if (token === null) {
    return null
  }

  if (!token) {
    return (
      <AuthCard title={t("auth.resetInvalid.title")} description={t("auth.resetInvalid.description")}>
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <p className="text-muted-foreground mb-6">
            {t("auth.resetInvalid.content")}
          </p>
          <Button asChild>
            <Link href="/auth/forgot">{t("auth.resetInvalid.retry")}</Link>
          </Button>
        </div>
      </AuthCard>
    )
  }

  if (success) {
    return (
      <AuthCard title={t("auth.resetSuccess.title")} description={t("auth.resetSuccess.description")}>
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-primary" />
          </div>
          <p className="text-muted-foreground mb-6">
            {t("auth.resetSuccess.content")}
          </p>
          <Button asChild>
            <Link href="/auth/login">{t("auth.goLogin")}</Link>
          </Button>
        </div>
      </AuthCard>
    )
  }

  return (
    <AuthCard title={t("auth.resetPassword")} description={t("auth.resetPage.description")}>
      {/* 错误提示 */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">{t("auth.resetPage.newPassword")}</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
               placeholder={t("auth.resetPage.newPasswordPlaceholder")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 pr-10 bg-secondary border-border"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* 密码强度指示器 */}
          {password && (
            <div className="space-y-2">
              <div className="flex gap-1">
                {[1, 2, 3].map((level) => (
                  <div
                    key={level}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      strengthScore >= level
                        ? strengthScore === 1
                          ? "bg-destructive"
                          : strengthScore === 2
                            ? "bg-accent"
                            : "bg-primary"
                        : "bg-secondary"
                    }`}
                  />
                ))}
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <div className={passwordStrength.hasLength ? "text-primary" : ""}>
                  {passwordStrength.hasLength ? "✓" : "○"} {t("auth.passwordRule.length")}
                </div>
                <div className={passwordStrength.hasNumber ? "text-primary" : ""}>
                  {passwordStrength.hasNumber ? "✓" : "○"} {t("auth.passwordRule.number")}
                </div>
                <div className={passwordStrength.hasSpecial ? "text-primary" : ""}>
                  {passwordStrength.hasSpecial ? "✓" : "○"} {t("auth.passwordRule.special")}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">{t("auth.confirmPassword")}</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
               placeholder={t("auth.resetPage.confirmPasswordPlaceholder")}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-10 pr-10 bg-secondary border-border"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {password && confirmPassword && password !== confirmPassword && (
            <p className="text-xs text-destructive">{t("auth.resetErrors.passwordMismatch")}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? t("auth.resetting") : t("auth.resetPassword")}
        </Button>
      </form>

      <p className="text-center mt-6 text-sm text-muted-foreground">
        {t("auth.rememberedPassword")} 
        <Link href="/auth/login" className="text-primary font-medium hover:underline">
          {t("auth.backToLogin")}
        </Link>
      </p>
    </AuthCard>
  )
}
