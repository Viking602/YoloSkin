import React from "react"
import type { Metadata } from "next"
import { Noto_Sans_SC, IBM_Plex_Sans, VT323 } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "sonner"
import { I18nProvider } from "@/lib/i18n/context"
import { SiteSettingsProvider } from "@/lib/site-settings/context"
import { AuthProvider } from "@/lib/auth/context"
import "./globals.css"

const notoSansSC = Noto_Sans_SC({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto",
})
const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm",
})
const vt323 = VT323({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-pixel",
})

export const metadata: Metadata = {
  title: "CraftSkin - Minecraft Skin Site",
  description: "Discover, download, and share amazing Minecraft skins",
  generator: "v0.app",
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
      <body
        className={`${notoSansSC.variable} ${ibmPlexSans.variable} ${vt323.variable} font-sans antialiased`}
      >
        <I18nProvider>
          <AuthProvider>
            <SiteSettingsProvider>{children}</SiteSettingsProvider>
          </AuthProvider>
        </I18nProvider>
        <Toaster position="top-right" richColors />
        <Analytics />
      </body>
    </html>
  )
}
