export interface botConfig {
  configName: string
  botName: string
  admin: number
  prefix: string
  online: {
    enable: boolean
    msg: string
  }
  connect: {
    protocol: 'ws' | 'wss'
    host: string
    port: number
    accessToken: string
    reconnection: boolean
    reconnectionAttempts: number
    reconnectionDelay: number
    receive: 'CQCode' | 'JSON'
  }
}

export interface botData {
  wsType: '/api' | '/event'
}
