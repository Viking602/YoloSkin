"use client"

import React from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { useI18n } from "@/lib/i18n/context"

interface AuthCardProps {
  children: React.ReactNode
  title: string
  description: string
}

export function AuthCard({ children, title, description }: AuthCardProps) {
  const { t } = useI18n()
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* 顶部导航栏 */}
      <div className="flex items-center justify-between p-6 lg:px-12">
        <Link
          href="/"
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t("common.backHome")}</span>
        </Link>
        
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span className="text-sm font-bold text-primary-foreground">CS</span>
          </div>
          <span className="font-bold text-foreground">CraftSkin</span>
        </div>
        
        <div className="w-20" />
      </div>

      {/* 表单内容区域 */}
      <div className="flex-1 flex items-center justify-center px-6 lg:px-12 py-8">
        <div className="w-full max-w-md">
          {/* 标题 */}
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-foreground mb-2">{title}</h1>
            <p className="text-muted-foreground">{description}</p>
          </div>
          
          {/* 表单卡片 */}
          <div className="bg-card border border-border rounded-xl p-6 lg:p-8 shadow-sm">
            {children}
          </div>
        </div>
      </div>

      {/* 底部信息 */}
      <div className="p-6 lg:px-12 text-sm text-muted-foreground border-t border-border">
        <div className="flex items-center justify-center gap-6">
          <span>{t("authCard.secureNotice")}</span>
          <span className="text-border">|</span>
          <Link href="/terms" className="hover:text-foreground transition-colors">{t("auth.terms")}</Link>
          <Link href="/privacy" className="hover:text-foreground transition-colors">{t("auth.privacy")}</Link>
        </div>
      </div>
    </div>
  )
}
