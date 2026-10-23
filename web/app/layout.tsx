import type { ReactNode } from "react"
import type { Metadata } from "next"
import { Toaster } from "sonner"
import { I18nProvider } from "@/lib/i18n/context"
import { SiteSettingsProvider } from "@/lib/site-settings/context"
import { AuthProvider } from "@/lib/auth/context"
import { ThemeProvider } from "@/components/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import "@fontsource-variable/manrope"
import "./globals.css"

export const metadata: Metadata = {
  title: "YoloSkin",
  description: "Minecraft skins, capes, and players on Cloudflare",
  icons: {
    icon: "/icon.svg",
    apple: "/apple-icon.png"
  }
}

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <a href="#main-content" className="skip-link">
          跳转到主要内容 / Skip to content
        </a>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <I18nProvider>
            <AuthProvider>
              <SiteSettingsProvider>
                <TooltipProvider>{children}</TooltipProvider>
              </SiteSettingsProvider>
            </AuthProvider>
          </I18nProvider>
        </ThemeProvider>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  )
}
