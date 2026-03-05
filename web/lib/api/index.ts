/**
 * API 模块入口
 * 
 * 使用方式：
 * import { api } from "@/lib/api"
 * 
 * // 调用 API
 * const { data } = await api.listPlayers()
 * const { data } = await api.createPlayer({ player_name: "Steve" })
 */

export * from "./types"
export * as api from "./services"
