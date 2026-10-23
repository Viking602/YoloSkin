"use client"

import Link from "next/link"
import {
  ArrowRight,
  ArrowUpRight,
  Box,
  Check,
  Crown,
  Shirt,
  Upload,
  Users
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { SkinStage } from "@/components/skin-stage"
import { useAuth } from "@/lib/auth/context"
import { useI18n } from "@/lib/i18n/context"

const actions = [
  { icon: Users, key: "players", href: "/user/players" },
  { icon: Upload, key: "upload", href: "/user/upload" },
  { icon: Shirt, key: "closet", href: "/user/closet" },
  { icon: Crown, key: "premium", href: "/user/premium" }
] as const

export default function Home() {
  const { isLoggedIn } = useAuth()
  const { t } = useI18n()
  return (
    <>
      <Navbar />
      <main id="main-content">
        <section className="site-container home-hero">
          <div className="hero-copy">
            <div className="hero-eyebrow">
              <span className="pixel-dot" />
              {t("home.badge")}
            </div>
            <h1 className="hero-title">
              {t("studio.heroLineOne")}
              <br />
              <span>{t("studio.heroLineTwo")}</span>
            </h1>
            <p className="hero-description">{t("studio.heroDescription")}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button size="lg" asChild>
                <Link href={isLoggedIn ? "/user/upload" : "/auth/register"}>
                  {t(
                    isLoggedIn ? "studio.uploadSkin" : "studio.createYourLook"
                  )}
                  <ArrowUpRight size={17} />
                </Link>
              </Button>
              <Button size="lg" variant="ghost" asChild>
                <Link href={isLoggedIn ? "/user/closet" : "/#how-it-works"}>
                  {t(isLoggedIn ? "home.browseCloset" : "studio.howItWorks")}
                  <ArrowRight size={16} />
                </Link>
              </Button>
            </div>
            <div className="hero-assurances">
              <span>
                <Check size={13} />
                {t("studio.skinAndCape")}
              </span>
              <span>
                <Check size={13} />
                {t("studio.multiplePlayers")}
              </span>
            </div>
            <div className="hero-footnote">
              <Box size={16} />
              <p>
                {t("studio.madeForMinecraft")}
                <span>Minecraft Java Edition</span>
              </p>
            </div>
          </div>
          <div className="hero-art">
            <SkinStage />
            <div className="hero-art-note">
              <span className="pixel-dot" />
              {t("studio.yourNextLook")}
            </div>
          </div>
        </section>
        <section id="workspace" className="workspace-section">
          <div className="site-container workspace-grid">
            <div className="section-intro">
              <span className="studio-label">{t("studio.workspaceEyebrow")}</span>
              <h2>{t("studio.workspaceTitle")}</h2>
              <p>{t("studio.workspaceDescription")}</p>
              <Link
                href={isLoggedIn ? "/user/players" : "/auth/login"}
                className="text-link"
              >
                {t(isLoggedIn ? "home.enterUserCenter" : "home.loginAccount")}
                <ArrowUpRight size={16} />
              </Link>
            </div>
            <div className="action-grid">
              {actions.map((action, index) => (
                <Link
                  key={action.key}
                  href={action.href}
                  className="workspace-action"
                >
                  <div className="action-top">
                    <span className="action-icon">
                      <action.icon size={20} strokeWidth={1.6} />
                    </span>
                    <ArrowUpRight className="action-arrow" size={17} />
                  </div>
                  <span className="action-number">0{index + 1}</span>
                  <h3>{t(`home.quick.${action.key}Title`)}</h3>
                  <p>{t(`home.quick.${action.key}Desc`)}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
        <section id="how-it-works" className="site-container how-section">
          <div className="how-heading">
            <span className="studio-label">{t("studio.stepsEyebrow")}</span>
            <h2>{t("studio.stepsTitle")}</h2>
          </div>
          <ol className="how-steps">
            {["create", "upload", "wear"].map((step, index) => (
              <li key={step}>
                <span className="step-index">0{index + 1}</span>
                <h3>{t(`studio.steps.${step}Title`)}</h3>
                <p>{t(`studio.steps.${step}Description`)}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>
      <Footer />
    </>
  )
}
