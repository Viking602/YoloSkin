"use client"

import { useState } from "react"
import { KeyRound, Loader2, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api } from "@/lib/api"

export default function SettingsPage() {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [saving, setSaving] = useState(false)

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    if (newPassword.length < 8) return toast.error("新密码至少需要 8 个字符")
    if (newPassword !== confirmation) return toast.error("两次输入的新密码不一致")
    setSaving(true)
    try {
      const response = await api.changePassword(currentPassword, newPassword)
      if (response.code !== 0) return toast.error(response.message)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmation("")
      toast.success("密码已更新，其他登录会话已退出")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "更新密码失败")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-primary/20 bg-primary/10"><KeyRound className="h-6 w-6 text-primary" /></div>
        <div><h1 className="text-2xl font-bold">账户安全</h1><p className="text-sm text-muted-foreground">密码由 Web Crypto 加密，会话保存在 Cloudflare D1。</p></div>
      </div>
      <form onSubmit={save} className="mc-card space-y-5 p-6">
        <div className="flex items-center gap-2 border-b border-border pb-4"><ShieldCheck className="h-5 w-5 text-primary" /><h2 className="font-semibold">修改登录密码</h2></div>
        <div className="space-y-2"><Label htmlFor="currentPassword">当前密码</Label><Input id="currentPassword" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} minLength={8} required /></div>
        <div className="space-y-2"><Label htmlFor="newPassword">新密码</Label><Input id="newPassword" type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={8} required /></div>
        <div className="space-y-2"><Label htmlFor="confirmation">确认新密码</Label><Input id="confirmation" type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} minLength={8} required /></div>
        <Button type="submit" disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}保存新密码</Button>
      </form>
    </div>
  )
}
