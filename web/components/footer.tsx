"use client"

import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { Brand } from "@/components/brand"
import { useI18n } from "@/lib/i18n/context"
import { useSiteSettings } from "@/lib/site-settings/context"

const links = [
  ["/user/players", "nav.players"],
  ["/user/upload", "nav.upload"],
  ["/user/closet", "nav.closet"]
] as const

export function Footer() {
  const { t } = useI18n()
  const { settings } = useSiteSettings()
  const description =
    settings.siteDescription === "Cloudflare-native Minecraft skin service"
      ? t("studio.footerDescription")
      : settings.siteDescription || t("studio.footerDescription")
  const footerText =
    settings.footerText &&
    !settings.footerText.startsWith("Powered by Cloudflare")
      ? settings.footerText
      : t("footer.copyright")
  return (
    <footer className="site-footer">
      <div className="site-container">
        <div className="footer-main">
          <div>
            <Link href="/">
              <Brand name={settings.siteName} />
            </Link>
            <p>{description}</p>
          </div>
          <nav aria-label={t("footer.userFeatures")}>
            {links.map(([href, key]) => (
              <Link key={href} href={href}>
                {t(key)}
                <ArrowUpRight size={14} />
              </Link>
            ))}
          </nav>
        </div>
        <div className="footer-bottom">
          <p>{footerText}</p>
          <span className="font-mono text-[10px] tracking-wider uppercase">
            {t("studio.footerTagline")}
          </span>
        </div>
      </div>
    </footer>
  )
}
