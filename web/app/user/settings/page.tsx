"use client"

import React from "react"
import { useState } from "react"
import { 
  Settings, Eye, EyeOff, AlertTriangle, Shield, ShieldCheck, ShieldAlert, 
  Check, Mail, Link2, Link2Off, Loader2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { api } from "@/lib/api"
import { useI18n } from "@/lib/i18n/context"
// OAuth 提供商配置
const OAUTH_PROVIDERS = [
  { 
    id: "google", 
    name: "Google", 
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
    ),
    color: "bg-secondary/50 border-border"
  },
  { 
    id: "microsoft", 
    name: "Microsoft", 
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 23 23">
        <path fill="#f35325" d="M1 1h10v10H1z" />
        <path fill="#81bc06" d="M12 1h10v10H12z" />
        <path fill="#05a6f0" d="M1 12h10v10H1z" />
        <path fill="#ffba08" d="M12 12h10v10H12z" />
      </svg>
    ),
    color: "bg-secondary/50 border-border"
  },
]

// 弱密码黑名单
const WEAK_PASSWORDS = [
  "123456", "password", "123456789", "12345678", "12345", "1234567", 
  "1234567890", "qwerty", "abc123", "111111", "123123", "admin", 
  "letmein", "welcome", "monkey", "dragon", "master", "666666",
  "888888", "000000", "password1", "qwerty123", "iloveyou"
]

// 常见序列模式
const SEQUENTIAL_PATTERNS = [
  /^(.)\1+$/, // 重复字符 如 aaaaaa
  /^(012|123|234|345|456|567|678|789|890)+$/, // 数字序列
  /^(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)+$/i, // 字母序列
]

interface PasswordStrength {
  score: number // 0-4
  level: "weak" | "fair" | "good" | "strong"
  label: string
  color: string
  feedback: string[]
}

function checkPasswordStrength(password: string): PasswordStrength {
  const feedback: string[] = []
  let score = 0

  if (password.length < 8) {
    feedback.push("PASSWORD_RULE_LENGTH")
  } else if (password.length >= 12) {
    score += 2
  } else {
    score += 1
  }

  if (WEAK_PASSWORDS.includes(password.toLowerCase())) {
    feedback.push("PASSWORD_COMMON")
    return { score: 0, level: "weak", label: "weak", color: "text-destructive", feedback }
  }

  for (const pattern of SEQUENTIAL_PATTERNS) {
    if (pattern.test(password)) {
    feedback.push("PASSWORD_SEQUENCE")
      return { score: 0, level: "weak", label: "weak", color: "text-destructive", feedback }
    }
  }

  const hasLower = /[a-z]/.test(password)
  const hasUpper = /[A-Z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)

  if (!hasLower && !hasUpper) feedback.push("PASSWORD_HINT_LETTER")
  if (!hasNumber) feedback.push("PASSWORD_HINT_NUMBER")
  if (!hasSpecial) feedback.push("PASSWORD_HINT_SPECIAL")

  if (hasLower) score += 0.5
  if (hasUpper) score += 0.5
  if (hasNumber) score += 0.5
  if (hasSpecial) score += 1

  if (score < 2) return { score: 1, level: "weak", label: "weak", color: "text-destructive", feedback }
  if (score < 3) return { score: 2, level: "fair", label: "fair", color: "text-warning", feedback }
  if (score < 4) return { score: 3, level: "good", label: "good", color: "text-accent", feedback }
  return { score: 4, level: "strong", label: "strong", color: "text-primary", feedback: [] }
}

export default function AccountSettingsPage() {
  const { t } = useI18n()
  const [user, setUser] = useState({
    email: "",
    hasPassword: true,
    connectedOAuth: [] as string[],
  })
  
  // 密码重置状态
  const [resetStep, setResetStep] = useState<"input" | "sent" | "verify" | "newPassword">("input")
  const [resetEmail, setResetEmail] = useState(user.email)
  const [verifyCode, setVerifyCode] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [countdown, setCountdown] = useState(0)
  
  // OAuth 绑定状态
  const [bindingProvider, setBindingProvider] = useState<string | null>(null)
  const [unbindingProvider, setUnbindingProvider] = useState<string | null>(null)
  const [oauthEnabled, setOauthEnabled] = useState({ google: false, microsoft: false })

  React.useEffect(() => {
    const loadSettings = async () => {
      try {
        const [currentUserResponse, premiumResponse] = await Promise.all([
          api.getCurrentUser(),
          api.getPremiumBinding(),
        ])

        const oauthResponse = await api.getOAuthProviders()
        if (oauthResponse.code === 0) {
          setOauthEnabled(oauthResponse.data)
        }

        if (currentUserResponse.code === 0) {
          setResetEmail(currentUserResponse.data.email)
          setUser((prev) => ({ ...prev, email: currentUserResponse.data.email }))
        }

        if (premiumResponse.code === 0 && premiumResponse.data) {
          setUser((prev) => ({
            ...prev,
            connectedOAuth: prev.connectedOAuth.includes("microsoft")
              ? prev.connectedOAuth
              : [...prev.connectedOAuth, "microsoft"],
          }))
        }
      } catch {
        // ignore load errors on settings page
      }
    }

    loadSettings()
  }, [])

  const passwordStrength = checkPasswordStrength(newPassword)
  const isPasswordValid = newPassword.length >= 8 && passwordStrength.score >= 2
  const isPasswordMatch = newPassword === confirmPassword && confirmPassword.length > 0

  // 发送验证码
  const handleSendCode = async () => {
    if (!resetEmail || countdown > 0) return
    setIsSubmitting(true)

    try {
      const response = await api.forgotPassword(resetEmail.trim())
      if (response.code !== 0) {
        alert(response.message || t("settings.errors.sendCodeFailed"))
        return
      }

      setResetStep("sent")
      setCountdown(60)

      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch {
      alert(t("settings.errors.sendCodeFailed"))
    } finally {
      setIsSubmitting(false)
    }
  }

  // 验证邮箱验证码
  const handleVerifyCode = async () => {
    if (verifyCode.length !== 6) return
    setIsSubmitting(true)

    try {
      const response = await api.verifyEmail(verifyCode)
      if (response.code !== 0) {
        alert(response.message || t("settings.errors.verifyCodeFailed"))
        return
      }
      setResetStep("newPassword")
    } catch {
      alert(t("settings.errors.verifyCodeFailed"))
    } finally {
      setIsSubmitting(false)
    }
  }

  // 设置新密码
  const handleSetPassword = async () => {
    if (!isPasswordValid || !isPasswordMatch) return
    setIsSubmitting(true)

    try {
      const response = await api.resetPassword(verifyCode, newPassword)
      if (response.code !== 0) {
        alert(response.message || t("settings.errors.setPasswordFailed"))
        return
      }

      setUser(prev => ({ ...prev, hasPassword: true }))
      setResetStep("input")
      setNewPassword("")
      setConfirmPassword("")
      setVerifyCode("")
    } catch {
      alert(t("settings.errors.setPasswordFailed"))
    } finally {
      setIsSubmitting(false)
    }
  }

  // 绑定 OAuth
  const handleBindOAuth = async (providerId: string) => {
    const enabled = providerId === "google" ? oauthEnabled.google : oauthEnabled.microsoft
    if (!enabled) return

    setBindingProvider(providerId)

    try {
      const provider = providerId === "google" ? "google" : "microsoft"
      const intent = provider === "microsoft" ? "bind_premium" : "login"
      const response = await api.getOAuthStartUrl(provider, intent)
      if (response.code !== 0 || !response.data.url) {
        alert(response.message || t("settings.errors.bindFailed"))
        return
      }
      window.location.href = response.data.url
    } catch {
      alert(t("settings.errors.bindFailed"))
    } finally {
      setBindingProvider(null)
    }
  }

  // 解绑 OAuth
  const handleUnbindOAuth = async (providerId: string) => {
    // 检查是否是唯一的登录方式
    if (user.connectedOAuth.length === 1 && !user.hasPassword) {
      alert(t("settings.errors.singleLoginMethod"))
      return
    }
    
    setUnbindingProvider(providerId)
    
    try {
      if (providerId === "microsoft") {
        const response = await api.unbindPremium()
        if (response.code !== 0) {
          alert(response.message || t("settings.errors.unbindFailed"))
          return
        }
      }

      setUser(prev => ({
        ...prev,
        connectedOAuth: prev.connectedOAuth.filter(id => id !== providerId)
      }))
    } catch {
      alert(t("settings.errors.unbindFailed"))
    } finally {
      setUnbindingProvider(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-lg bg-primary/10 border-2 border-primary/20 flex items-center justify-center">
          <Settings className="w-7 h-7 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("settings.title")}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t("settings.description")}
          </p>
        </div>
      </div>

      <Tabs defaultValue="oauth" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="oauth">{t("settings.oauthTab")}</TabsTrigger>
          <TabsTrigger value="password">{t("settings.passwordTab")}</TabsTrigger>
        </TabsList>

        {/* OAuth 绑定 */}
        <TabsContent value="oauth" className="space-y-4">
          <div className="mc-card p-6">
            <h3 className="text-lg font-semibold text-foreground mb-2">{t("settings.oauthTitle")}</h3>
            <p className="text-sm text-muted-foreground mb-6">
              {t("settings.oauthDescription")}
            </p>

            <div className="space-y-3">
              {OAUTH_PROVIDERS.map((provider) => {
                const isConnected = user.connectedOAuth.includes(provider.id)
                const isBinding = bindingProvider === provider.id
                const isUnbinding = unbindingProvider === provider.id
                const isLoading = isBinding || isUnbinding
                const enabled = provider.id === "google" ? oauthEnabled.google : oauthEnabled.microsoft
                
                return (
                  <div 
                    key={provider.id}
                    className={`flex items-center justify-between p-4 rounded-lg border-2 transition-colors ${
                      isConnected 
                        ? "bg-primary/5 border-primary/20" 
                        : "bg-secondary/50 border-border hover:border-muted-foreground/30"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center ${provider.color}`}>
                        {provider.icon}
                      </div>
                      <div>
                        <div className="font-medium text-foreground">
                          {provider.id === "google" ? t("auth.providers.google") : t("auth.providers.microsoft")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {isConnected ? t("settings.connected") : t("settings.notConnected")}
                        </div>
                      </div>
                    </div>
                    
                    {isConnected ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUnbindOAuth(provider.id)}
                        disabled={isLoading}
                        className="border-destructive/30 text-destructive hover:bg-destructive/10"
                      >
                        {isUnbinding ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Link2Off className="w-4 h-4 mr-1.5" />
                            {t("settings.unbind")}
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBindOAuth(provider.id)}
                        disabled={isLoading || !enabled}
                        className="disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isBinding ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Link2 className="w-4 h-4 mr-1.5" />
                            {t("settings.bind")}
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>

            {(!oauthEnabled.google || !oauthEnabled.microsoft) && (
              <p className="mt-3 text-xs text-muted-foreground">
                {t("settings.oauthDisabledHint")}
              </p>
            )}

            {/* 提示信息 */}
            {user.connectedOAuth.length === 1 && !user.hasPassword && (
              <div className="mt-4 p-3 rounded-lg bg-warning/10 border border-warning/20">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-warning">
                    {t("settings.singleMethodHint")}
                  </p>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* 密码设置 */}
        <TabsContent value="password" className="space-y-4">
          <div className="mc-card p-6">
              <h3 className="text-lg font-semibold text-foreground mb-2">{user.hasPassword ? t("settings.resetPassword") : t("settings.setPassword")}</h3>
              <p className="text-sm text-muted-foreground mb-6">
                {user.hasPassword 
                  ? t("settings.resetPasswordDesc")
                  : t("settings.setPasswordDesc")}
              </p>

            {/* 步骤 1: 输入邮箱 */}
            {(resetStep === "input" || resetStep === "sent") && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{t("auth.email")}</Label>
                  <div className="flex gap-2">
                    <Input
                      id="email"
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder={t("settings.emailPlaceholder")}
                      className="bg-input border-2 border-border rounded-lg flex-1"
                      disabled={resetStep === "sent"}
                    />
                    <Button
                      type="button"
                      onClick={handleSendCode}
                      disabled={!resetEmail || countdown > 0 || isSubmitting}
                      className="whitespace-nowrap"
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : countdown > 0 ? (
                        `${countdown}s`
                      ) : (
                        <>
                          <Mail className="w-4 h-4 mr-1.5" />
                          {t("settings.sendCode")}
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {resetStep === "sent" && (
                  <div className="space-y-4">
                    <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-primary" />
                          <span className="text-sm text-primary">{t("settings.codeSentTo")} {resetEmail}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="verifyCode">{t("settings.verifyCode")}</Label>
                      <Input
                        id="verifyCode"
                        type="text"
                        value={verifyCode}
                        onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder={t("settings.verifyCodePlaceholder")}
                        className="bg-input border-2 border-border rounded-lg text-center text-lg tracking-widest"
                        maxLength={6}
                      />
                    </div>

                    <Button
                      onClick={handleVerifyCode}
                      disabled={verifyCode.length !== 6 || isSubmitting}
                      className="w-full"
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : null}
                      {t("settings.verify")}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* 步骤 2: 设置新密码 */}
            {resetStep === "newPassword" && (
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 mb-4">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary" />
                    <span className="text-sm text-primary">{t("settings.verifySuccessSetPassword")}</span>
                  </div>
                </div>

                {/* 新密码 */}
                <div className="space-y-2">
                  <Label htmlFor="newPassword">{t("settings.newPassword")}</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                       placeholder={t("settings.newPasswordPlaceholder")}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="bg-input border-2 border-border rounded-lg pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  
                  {/* 密码强度指示器 */}
                  {newPassword && (
                    <div className="space-y-2 mt-3">
                      <div className="flex items-center gap-2">
                        {passwordStrength.level === "weak" && <ShieldAlert className={`w-4 h-4 ${passwordStrength.color}`} />}
                        {passwordStrength.level === "fair" && <Shield className={`w-4 h-4 ${passwordStrength.color}`} />}
                        {passwordStrength.level === "good" && <ShieldCheck className={`w-4 h-4 ${passwordStrength.color}`} />}
                        {passwordStrength.level === "strong" && <ShieldCheck className={`w-4 h-4 ${passwordStrength.color}`} />}
                        <span className={`text-sm font-medium ${passwordStrength.color}`}>
                          {t("settings.passwordStrength")}：{t(`settings.passwordLevels.${passwordStrength.label}`)}
                        </span>
                      </div>
                      
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map((level) => (
                          <div
                            key={level}
                            className={`h-1.5 flex-1 rounded-full transition-colors ${
                              level <= passwordStrength.score
                                ? passwordStrength.level === "weak" ? "bg-destructive"
                                  : passwordStrength.level === "fair" ? "bg-warning"
                                  : passwordStrength.level === "good" ? "bg-accent"
                                  : "bg-primary"
                                : "bg-muted"
                            }`}
                          />
                        ))}
                      </div>

                      {passwordStrength.feedback.length > 0 && (
                        <ul className="text-xs text-muted-foreground space-y-1 mt-2">
                          {passwordStrength.feedback.map((item, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <AlertTriangle className="w-3 h-3 text-warning mt-0.5 flex-shrink-0" />
                               {item.startsWith("PASSWORD_") ? t(`settings.passwordFeedback.${item}`) : item}
                             </li>
                           ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>

                {/* 确认密码 */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{t("auth.confirmPassword")}</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                       placeholder={t("settings.confirmPasswordPlaceholder")}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="bg-input border-2 border-border rounded-lg pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirmPassword && !isPasswordMatch && (
                    <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                      <AlertTriangle className="w-3 h-3" />
                      {t("settings.passwordMismatch")}
                    </p>
                  )}
                  {isPasswordMatch && (
                    <p className="text-xs text-primary flex items-center gap-1 mt-1">
                      <Check className="w-3 h-3" />
                      {t("settings.passwordMatch")}
                    </p>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setResetStep("input")
                      setNewPassword("")
                      setConfirmPassword("")
                      setVerifyCode("")
                    }}
                  >
                    {t("common.back")}
                  </Button>
                  <Button
                    onClick={handleSetPassword}
                    disabled={!isPasswordValid || !isPasswordMatch || isSubmitting}
                    className="flex-1"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : null}
                    {user.hasPassword ? t("settings.resetPassword") : t("settings.setPassword")}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* 密码要求说明 */}
          <div className="rounded-lg bg-secondary/50 p-5 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">{t("settings.passwordRequirements")}</h3>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                {t("auth.passwordRule.length")}
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                {t("settings.passwordReqCommon")}
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                {t("settings.passwordReqSequence")}
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                {t("settings.passwordReqComplex")}
              </li>
            </ul>
          </div>

          {/* 当前状态 */}
          <div className="mc-card p-4">
            <div className="flex items-center gap-3">
              {user.hasPassword ? (
                <>
                  <div className="w-10 h-10 rounded-lg bg-primary/10 border-2 border-primary/20 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-medium text-foreground">{t("settings.passwordSet")}</div>
                    <div className="text-xs text-muted-foreground">{t("settings.passwordSetDesc")}</div>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-lg bg-warning/10 border-2 border-warning/20 flex items-center justify-center">
                    <ShieldAlert className="w-5 h-5 text-warning" />
                  </div>
                  <div>
                    <div className="font-medium text-foreground">{t("settings.passwordNotSet")}</div>
                    <div className="text-xs text-muted-foreground">{t("settings.passwordNotSetDesc")}</div>
                  </div>
                </>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
