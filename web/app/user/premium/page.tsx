"use client"

import { useEffect, useState } from "react"
import { Crown, Loader2, Unlink } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api, type PremiumBinding } from "@/lib/api"

export default function PremiumPage() {
  const [binding, setBinding] = useState<PremiumBinding | null>(null)
  const [token, setToken] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void api.getPremiumBinding().then((response) => {
      if (response.code === 0) setBinding(response.data)
    }).finally(() => setLoading(false))
  }, [])

  const bind = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    try {
      const response = await api.bindPremium({ microsoft_token: token.trim() })
      if (response.code !== 0) return toast.error(response.message)
      setBinding(response.data)
      setToken("")
      toast.success("正版 Minecraft 档案已绑定")
    } finally {
      setSaving(false)
    }
  }

  const unbind = async () => {
    setSaving(true)
    try {
      const response = await api.unbindPremium()
      if (response.code !== 0) return toast.error(response.message)
      setBinding(null)
      toast.success("绑定已解除")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-amber-400/30 bg-amber-400/10"><Crown className="h-6 w-6 text-amber-500" /></div><div><h1 className="text-2xl font-bold">正版档案绑定</h1><p className="text-sm text-muted-foreground">通过 Minecraft Services 直接校验访问令牌。</p></div></div>
      {binding ? (
        <div className="mc-card space-y-4 p-6"><div><p className="text-sm text-muted-foreground">已绑定角色</p><p className="text-xl font-semibold">{binding.username}</p><p className="font-mono text-xs text-muted-foreground">{binding.uuid}</p></div><Button variant="outline" onClick={() => void unbind()} disabled={saving}><Unlink className="mr-2 h-4 w-4" />解除绑定</Button></div>
      ) : (
        <form onSubmit={bind} className="mc-card space-y-5 p-6"><div className="space-y-2"><Label htmlFor="minecraftToken">Minecraft Services Access Token</Label><Input id="minecraftToken" type="password" value={token} onChange={(event) => setToken(event.target.value)} minLength={20} required /><p className="text-xs text-muted-foreground">令牌仅用于验证档案并保存在 D1；建议绑定完成后在 Microsoft 账户中撤销旧令牌。</p></div><Button type="submit" disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}验证并绑定</Button></form>
      )}
    </div>
  )
}
