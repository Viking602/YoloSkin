import React from "react"
import type { Metadata } from "next"
import { Toaster } from "sonner"
import { I18nProvider } from "@/lib/i18n/context"
import { SiteSettingsProvider } from "@/lib/site-settings/context"
import { AuthProvider } from "@/lib/auth/context"
import "./globals.css"

export const metadata: Metadata = {
  title: "YoloSkin - Cloudflare Minecraft Skin Service",
  description: "Discover, download, and share amazing Minecraft skins",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN">
      <body className="font-sans antialiased">
        <I18nProvider>
          <AuthProvider>
            <SiteSettingsProvider>{children}</SiteSettingsProvider>
          </AuthProvider>
        </I18nProvider>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  )
}
