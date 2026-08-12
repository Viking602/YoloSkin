"use client"

import Script from "next/script"
import { useEffect, useRef, useState } from "react"

interface TurnstileApi {
  render: (container: HTMLElement, options: Record<string, unknown>) => string
  remove: (widgetId: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

interface TurnstileWidgetProps {
  siteKey: string
  action: "password_reset_request" | "password_reset_submit"
  resetKey: number
  onToken: (token: string) => void
}

export function TurnstileWidget({ siteKey, action, resetKey, onToken }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const callbackRef = useRef(onToken)
  const [ready, setReady] = useState(false)
  callbackRef.current = onToken

  useEffect(() => {
    if (!ready || !siteKey || !containerRef.current || !window.turnstile) return
    const widgetId = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      action,
      appearance: "interaction-only",
      callback: (token: string) => callbackRef.current(token),
      "expired-callback": () => callbackRef.current(""),
      "error-callback": () => callbackRef.current(""),
    })
    return () => window.turnstile?.remove(widgetId)
  }, [action, ready, resetKey, siteKey])

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={() => setReady(true)}
        onReady={() => setReady(true)}
      />
      <div ref={containerRef} className="min-h-16" aria-label="Cloudflare 人机验证" />
    </>
  )
}
