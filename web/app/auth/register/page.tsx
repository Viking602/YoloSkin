"use client"

import React from "react"

import { useState } from "react"
import Link from "next/link"
import { Eye, EyeOff, Mail, Lock, User, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { AuthCard } from "@/components/auth-card"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth/context"
import { useI18n } from "@/lib/i18n/context"

export default function RegisterPage() {
  const { setAuth } = useAuth()
  const { t } = useI18n()
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [nickname, setNickname] = useState("")
  const [password, setPassword] = useState("")
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!agreeTerms) {
      setError(t("auth.registerErrors.mustAgreeTerms"))
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await api.register(email.trim(), password, nickname.trim())
      if (response.code !== 0) {
        if (response.message === "Email already exists") {
          setError(t("auth.registerErrors.emailExists"))
          return
        }
        setError(response.message || t("auth.registerErrors.failed"))
        return
      }

      setAuth(response.data.token, response.data.user, true)
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : t("auth.registerErrors.failed"))
    } finally {
      setIsLoading(false)
    }
  }

  // 密码强度检查
  const passwordStrength = {
    hasLength: password.length >= 8,
    hasNumber: /\d/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  }
  const strengthScore = Object.values(passwordStrength).filter(Boolean).length

  if (success) {
    return (
      <AuthCard title={t("auth.registerSuccess.title")} description={t("auth.registerSuccess.description")}>
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-primary" />
          </div>
          <p className="text-muted-foreground mb-6">
            {t("auth.registerSuccess.sentPrefix")} <span className="text-foreground font-medium">{email}</span> {t("auth.registerSuccess.sentSuffix")}
          </p>
          <Button asChild>
            <Link href="/user/players">{t("auth.registerSuccess.enterUserCenter")}</Link>
          </Button>
        </div>
      </AuthCard>
    )
  }

  return (
    <AuthCard title={t("auth.registerPage.title")} description={t("auth.registerPage.description")}>
      {/* 错误提示 */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* 注册表单 */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">{t("auth.email")}</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 bg-secondary border-border"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="nickname">{t("auth.nickname")}</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="nickname"
              type="text"
               placeholder={t("auth.nicknamePlaceholder")}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="pl-10 bg-secondary border-border"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">{t("auth.password")}</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
               placeholder={t("auth.registerPage.passwordPlaceholder")}
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
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
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

        <div className="flex items-center gap-2.5 py-1">
          <Checkbox
            id="terms"
            checked={agreeTerms}
            onCheckedChange={(checked) => setAgreeTerms(checked as boolean)}
            className="border-2 border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
          />
          <label
            htmlFor="terms"
            className="text-sm font-medium text-foreground/80 cursor-pointer select-none"
          >
            {t("auth.termsAgreement")}{" "}
            <Link href="/terms" className="text-primary font-medium hover:text-primary/80 hover:underline">
              {t("auth.terms")}
            </Link>{" "}
            {t("auth.and")}{" "}
            <Link href="/privacy" className="text-primary font-medium hover:text-primary/80 hover:underline">
              {t("auth.privacy")}
            </Link>
          </label>
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? t("auth.registering") : t("auth.createAccount")}
        </Button>
      </form>

      {/* 切换到登录 */}
      <p className="text-center mt-6 text-sm text-muted-foreground">
        {t("auth.hasAccount")} 
        <Link href="/auth/login" className="text-primary font-medium hover:underline">
          {t("auth.goLogin")}
        </Link>
      </p>
    </AuthCard>
  )
}
