import type { commandFormat } from '@/libs/eventReg.ts'
import type { manifest } from '@/libs/loadPlugin.ts'
import type { CQEvent, CQWebSocket } from 'go-cqwebsocket'
import type { Knex } from 'knex'

export type fakeContext = PrivateMessage | GroupMessage

interface PrivateMessage {
  message_type: 'private'
  user_id: number
  self_id?: number
  message_id?: number
}

interface GroupMessage {
  message_type: 'group'
  user_id: number
  self_id?: number
  group_id: number
  message_id?: number
}

export type messageCallback = (
  event: CQEvent<'message'>,
  command: commandFormat | false
) => Promise<undefined | any | 'quit'>

export type noticeCallback = (event: CQEvent<'notice'>) => Promise<undefined | any | 'quit'>

export type requestCallback = (event: CQEvent<'request'>) => Promise<undefined | any | 'quit'>
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
  var bot: CQWebSocket
  var database: Knex
}

export {}
