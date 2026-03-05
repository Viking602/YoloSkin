"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { CheckCircle, XCircle, Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AuthCard } from "@/components/auth-card"
import { api } from "@/lib/api"
import { useI18n } from "@/lib/i18n/context"

type VerifyStatus = "verifying" | "success" | "error"

export default function VerifyPage() {
  const { t } = useI18n()
  const [token, setToken] = useState<string | null>(null)
  const [status, setStatus] = useState<VerifyStatus>("verifying")
  const [errorMessage, setErrorMessage] = useState<string>("")

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setToken(params.get("token"))
  }, [])

  useEffect(() => {
    if (!token) {
      setStatus("error")
      setErrorMessage(t("auth.verifyErrors.missingToken"))
      return
    }

    const verifyEmail = async () => {
      try {
        const response = await api.verifyEmail(token)
        if (response.code !== 0) {
          setStatus("error")
          setErrorMessage(response.message || t("auth.verifyErrors.failed"))
          return
        }
        setStatus("success")
      } catch (err) {
        setStatus("error")
        setErrorMessage(err instanceof Error && err.message ? err.message : t("auth.verifyErrors.failed"))
      }
    }

    verifyEmail()
  }, [token, t])

  const handleResend = () => {
    setErrorMessage(t("auth.verifyErrors.resendFromLogin"))
  }

  if (token === null) return null

  return (
    <AuthCard 
      title={t("auth.verifyPage.title")} 
      description={
        status === "verifying" 
          ? t("auth.verifyPage.verifying") 
          : status === "success"
            ? t("auth.verifyPage.success")
            : t("auth.verifyPage.error")
      }
    >
      <div className="text-center py-8">
        {status === "verifying" && (
          <>
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
            <p className="text-muted-foreground">
              {t("auth.verifyPage.verifyingContent")}
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {t("auth.verifyPage.successTitle")}
            </h3>
            <p className="text-muted-foreground mb-6">
              {t("auth.verifyPage.successContent")}
            </p>
            <Button asChild>
              <Link href="/auth/login">{t("auth.goLogin")}</Link>
            </Button>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-destructive" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {t("auth.verifyPage.error")}
            </h3>
            <p className="text-muted-foreground mb-6">
              {errorMessage}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="outline" onClick={handleResend} className="gap-2 bg-transparent">
                <RefreshCw className="w-4 h-4" />
                {t("auth.verifyPage.resend")}
              </Button>
              <Button asChild>
                <Link href="/auth/login">{t("auth.backToLogin")}</Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </AuthCard>
  )
}
