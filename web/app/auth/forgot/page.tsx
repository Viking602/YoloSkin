"use client"

import React from "react"

import { useState } from "react"
import Link from "next/link"
import { Mail, CheckCircle, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AuthCard } from "@/components/auth-card"
import { api } from "@/lib/api"
import { useI18n } from "@/lib/i18n/context"

export default function ForgotPasswordPage() {
  const { t } = useI18n()
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const response = await api.forgotPassword(email.trim())
      if (response.code !== 0) {
        setError(response.message || t("auth.forgotErrors.failed"))
        return
      }
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : t("auth.forgotErrors.failed"))
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <AuthCard title={t("auth.forgotSuccess.title")} description={t("auth.forgotSuccess.description")}>
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-primary" />
          </div>
          <p className="text-muted-foreground mb-2">
            {t("auth.forgotSuccess.sentPrefix")} <span className="text-foreground font-medium">{email}</span> {t("auth.forgotSuccess.sentSuffix")}
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            {t("auth.forgotSuccess.checkSpam")}
          </p>
          <Button asChild variant="outline">
            <Link href="/auth/login">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t("auth.backToLogin")}
            </Link>
          </Button>
        </div>
      </AuthCard>
    )
  }

  return (
    <AuthCard title={t("auth.forgotPage.title")} description={t("auth.forgotPage.description")}>
      {/* 错误提示 */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

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

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? t("auth.sending") : t("auth.sendResetLink")}
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
