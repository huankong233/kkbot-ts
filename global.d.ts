import { commandFormat } from '@/libs/eventReg.ts'
import { manifest } from '@/libs/loadPlugin.ts'
import { SRWebsocket, SocketHandle } from 'node-open-shamrock'
import { Knex } from 'knex'

export type messageCallback = (
  event: SocketHandle['message'],
  command: commandFormat | false
) => Promise<undefined | any | 'quit'>

export type noticeCallback = (event: SocketHandle['notice']) => Promise<undefined | any | 'quit'>

export type requestCallback = (event: SocketHandle['request']) => Promise<undefined | any | 'quit'>
interface messageEvent {
  callback: messageCallback
  priority: number
  pluginName: string
}

interface noticeEvent {
  callback: noticeCallback
  priority: number
  pluginName: string
}

interface requestEvent {
  callback: requestCallback
  priority: number
  pluginName: string
}

declare global {
  var events: {
    message: messageEvent[]
    notice: noticeEvent[]
    request: requestEvent[]
  }
  var plugins: {
    [pluginName: string]: {
      pluginPath: string
      configPath: string | null
      manifest: manifest
      loaded: boolean
    }
  } = {}
  var config: { [pluginNameConfig: string]: any } = {}
  var data: { [pluginNameData: string]: any } = {}
  var debug: boolean
  var dev: boolean
  var baseDir: string
  var nowLoadPluginName: string
  var packageData: {
    version: string
    plguinVersion: string
    repository: string
  }
  var bot: SRWebsocket
  var database: Knex
}

export {}
