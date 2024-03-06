import type { Interfaces } from 'go-cqwebsocket'

export interface botConfig {
  configName: string
  botName: string
  admin: number
  prefix: string
  online: {
    enable: boolean
    msg: string
  }
  driver: 'go-cqhttp' | 'openShamrock'
  connect: {
    host: string
    port: number
    accessToken: string
    reconnection: boolean
    reconnectionAttempts: number
    reconnectionDelay: number
  }
}

export interface botData {
  wsType: '/api' | '/event'
  ffmpeg: boolean
  info: Interfaces.LoginInfo
}
