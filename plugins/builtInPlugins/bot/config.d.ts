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
  driver: 'go-cqhttp' | 'red'
  goCqhttpConnect: {
    host: string
    port: number
    enableAPI: boolean
    enableEvent: boolean
    accessToken: string
    reconnection: boolean
    reconnectionAttempts: number
    reconnectionDelay: number
  }
  redConnect: {}
}

export interface botData {
  wsType: '/api' | '/event'
  ffmpeg: boolean
  info: Interfaces.LoginInfo
}
