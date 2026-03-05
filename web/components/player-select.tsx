"use client"

import { User } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useI18n } from "@/lib/i18n/context"

export interface Player {
  pid: number
  player_name: string
  uuid?: string
}

interface PlayerSelectProps {
  players: Player[]
  value?: string
  onValueChange: (value: string) => void
  isLoading?: boolean
  placeholder?: string
  disabled?: boolean
}

export function PlayerSelect({
  players,
  value,
  onValueChange,
  isLoading = false,
  placeholder,
  disabled = false,
}: PlayerSelectProps) {
  const { t } = useI18n()
  const resolvedPlaceholder = placeholder ?? t("playerSelect.placeholder")
  if (isLoading) {
    return <Skeleton className="h-10 w-full" />
  }

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className="bg-secondary border-border">
        <SelectValue placeholder={resolvedPlaceholder}>
          {value && (
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              {players.find((p) => String(p.pid) === value)?.player_name}
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {players.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            {t("playerSelect.empty")}
          </div>
        ) : (
          players.map((player) => (
            <SelectItem key={player.pid} value={String(player.pid)}>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span>{player.player_name}</span>
                {player.uuid && (
                  <span className="text-xs text-muted-foreground">
                    ({player.uuid.slice(0, 8)}...)
                  </span>
                )}
              </div>
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  )
}
