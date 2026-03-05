"use client"

import React from "react"

import { useState, useMemo } from "react"
import { Search, ChevronUp, ChevronDown, RefreshCw, AlertCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { useI18n } from "@/lib/i18n/context"

export interface Column<T> {
  key: keyof T | string
  header: string
  sortable?: boolean
  render?: (value: T[keyof T], row: T) => React.ReactNode
  width?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  isLoading?: boolean
  error?: string | null
  onRetry?: () => void
  emptyMessage?: string
  emptyAction?: {
    label: string
    onClick: () => void
  }
  searchable?: boolean
  searchPlaceholder?: string
  searchKeys?: (keyof T)[]
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  isLoading = false,
  error = null,
  onRetry,
  emptyMessage,
  emptyAction,
  searchable = true,
  searchPlaceholder,
  searchKeys,
}: DataTableProps<T>) {
  const { t } = useI18n()
  const resolvedEmptyMessage = emptyMessage ?? t("common.noData")
  const resolvedSearchPlaceholder = searchPlaceholder ?? `${t("common.search")}...`
  const [searchQuery, setSearchQuery] = useState("")
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  const filteredData = useMemo(() => {
    let result = [...data]

    // Search
    if (searchQuery && searchKeys && searchKeys.length > 0) {
      const query = searchQuery.toLowerCase()
      result = result.filter((row) =>
        searchKeys.some((key) => {
          const value = row[key]
          return value !== null && value !== undefined && String(value).toLowerCase().includes(query)
        })
      )
    }

    // Sort
    if (sortKey) {
      result.sort((a, b) => {
        const aValue = a[sortKey as keyof T]
        const bValue = b[sortKey as keyof T]
        if (aValue === bValue) return 0
        if (aValue === null || aValue === undefined) return 1
        if (bValue === null || bValue === undefined) return -1
        const comparison = aValue < bValue ? -1 : 1
        return sortDirection === "asc" ? comparison : -comparison
      })
    }

    return result
  }, [data, searchQuery, searchKeys, sortKey, sortDirection])

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortKey(key)
      setSortDirection("asc")
    }
  }

  // Loading State
  if (isLoading) {
    return (
      <div className="space-y-4">
        {searchable && <Skeleton className="h-10 w-full max-w-sm" />}
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/50">
                {columns.map((col) => (
                  <TableHead key={String(col.key)} style={{ width: col.width }}>
                    <Skeleton className="h-4 w-20" />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  {columns.map((col) => (
                    <TableCell key={String(col.key)}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    )
  }

  // Error State
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-destructive" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">{t("common.loadFailed")}</h3>
        <p className="text-muted-foreground text-center mb-4 max-w-sm">{error}</p>
        {onRetry && (
          <Button onClick={onRetry} variant="outline" className="gap-2 bg-transparent">
            <RefreshCw className="w-4 h-4" />
            {t("common.retry")}
          </Button>
        )}
      </div>
    )
  }

  // Empty State
  if (filteredData.length === 0 && !searchQuery) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center mb-4">
          <svg viewBox="0 0 64 64" className="w-12 h-12 opacity-50">
            <rect x="8" y="8" width="48" height="48" rx="4" fill="currentColor" className="text-muted-foreground" />
            <rect x="16" y="20" width="32" height="4" rx="1" fill="currentColor" className="text-background" />
            <rect x="16" y="30" width="24" height="4" rx="1" fill="currentColor" className="text-background" />
            <rect x="16" y="40" width="28" height="4" rx="1" fill="currentColor" className="text-background" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">{resolvedEmptyMessage}</h3>
        {emptyAction && (
          <Button onClick={emptyAction.onClick} className="mt-4">
            {emptyAction.label}
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {searchable && (
        <div className="relative w-full max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder={resolvedSearchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 h-11 bg-secondary border-border rounded-lg text-base"
          />
        </div>
      )}

      <div className="rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/50 hover:bg-secondary/50">
              {columns.map((col) => (
                <TableHead
                  key={String(col.key)}
                  style={{ width: col.width }}
                  className={`py-4 px-5 text-sm font-semibold ${col.sortable ? "cursor-pointer select-none" : ""}`}
                  onClick={() => col.sortable && handleSort(String(col.key))}
                >
                  <div className="flex items-center gap-1.5">
                    {col.header}
                    {col.sortable && sortKey === String(col.key) && (
                      sortDirection === "asc" ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                  {t("common.noMatch")}
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((row, i) => (
                <TableRow key={i} className="hover:bg-secondary/30">
                  {columns.map((col) => (
                    <TableCell key={String(col.key)} className="py-5 px-5">
                      {col.render
                        ? col.render(row[col.key as keyof T], row)
                        : (row[col.key as keyof T] as React.ReactNode) ?? "-"}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
