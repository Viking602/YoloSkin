"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { useI18n } from "@/lib/i18n/context"

const categories = [
  { id: "all", labelKey: "category.all", count: 12840 },
  { id: "popular", labelKey: "category.popular", count: 3420 },
  { id: "anime", labelKey: "category.anime", count: 2156 },
  { id: "game", labelKey: "category.game", count: 1893 },
  { id: "movie", labelKey: "category.movie", count: 1245 },
  { id: "original", labelKey: "category.original", count: 2890 },
  { id: "cute", labelKey: "category.cute", count: 1236 },
]

interface CategoryFilterProps {
  onCategoryChange?: (category: string) => void
}

export function CategoryFilter({ onCategoryChange }: CategoryFilterProps) {
  const [activeCategory, setActiveCategory] = useState("all")
  const { t } = useI18n()

  const handleCategoryClick = (categoryId: string) => {
    setActiveCategory(categoryId)
    onCategoryChange?.(categoryId)
  }

  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => handleCategoryClick(category.id)}
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200",
            activeCategory === category.id
              ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          )}
        >
          {t(category.labelKey)}
          <span className={cn(
            "text-xs",
            activeCategory === category.id
              ? "text-primary-foreground/70"
              : "text-muted-foreground"
          )}>
            {category.count.toLocaleString()}
          </span>
        </button>
      ))}
    </div>
  )
}
