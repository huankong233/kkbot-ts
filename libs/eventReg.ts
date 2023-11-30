import type { messageCallback, noticeCallback, requestCallback } from '@/global.d.ts'
import { sortObjectArray } from '@/libs/array.ts'
import { replyMsg } from '@/libs/sendMsg.ts'
import type { botConfig } from '@/plugins/builtInPlugins/bot/config.d.ts'
import type { CQEvent } from 'go-cqwebsocket'
import { CQ } from 'go-cqwebsocket'

/**
 * 事件快捷注册
 * @param type 事件类型
 * @param callback 回调函数
 * @param priority 优先级
 */
export function eventReg(type: 'message', callback: messageCallback, priority?: number): void
export function eventReg(type: 'notice', callback: noticeCallback, priority?: number): void
export function eventReg(type: 'request', callback: requestCallback, priority?: number): void
export function eventReg(
  type: 'message' | 'notice' | 'request',
  callback: messageCallback | noticeCallback | requestCallback,
  priority: number = 1
): void {
  const { events } = global

  switch (type) {
    case 'message':
      events.message = sortObjectArray(
        [
          ...events.message,
          {
            callback: callback as messageCallback,
            priority,
            pluginName: global.nowLoadPluginName
          }
        ],
        'priority'
      )
      break
    case 'notice':
      events.notice = sortObjectArray(
        [
          ...events.notice,
          {
            callback: callback as noticeCallback,
            priority,
            pluginName: global.nowLoadPluginName
          }
        ],
        'priority'
      )
      break
    case 'request':
      events.request = sortObjectArray(
        [
          ...events.request,
          {
            callback: callback as requestCallback,
            priority,
            pluginName: global.nowLoadPluginName
          }
        ],
        'priority'
      )
      break
  }
}

/**
 * 检查是否@了机器人
 * @param context 传入的上下文
 * @param commandName 命令名
 */
export function haveAt(
  context: CQEvent<'message'>['context'],
  commandName: string = '@'
): commandFormat | false {
  const { message, self_id } = context
  const { botConfig } = global.config as { botConfig: botConfig }

  const messageArr = CQ.parse(message)
  const first = messageArr[0].valueOf()
  if (!first) return false

  if (first.type === 'at' && first.data.qq === self_id.toString()) {
    const parsedMessage = messageArr.slice(1).toString()
    return format(`${botConfig.prefix}${commandName} ${parsedMessage}`)
  } else {
    return false
  }
}

export interface commandFormat {
  name: string
  params: string[]
}

/**
 * 格式化消息
 * @param message
 */
export function format(message: string): commandFormat | false {
  const { botConfig } = global.config as { botConfig: botConfig }

  // 判断是否是一个命令
  if (botConfig.prefix !== '' && message[0] !== botConfig.prefix) return false

  // 参数分割
  let command = message
    .split(' ')
    .filter(value => value !== '')
    .map(value => value.trim())

  return {
    name: botConfig.prefix !== '' ? command[0].replace(botConfig.prefix, '') : command[0],
    params: command.slice(1, command.length)
  }
}

/**
 * 缺少参数统一输出
 * @param context 上下文
 * @param command 参数
 * @param paramsLength 需要的参数长度
 */
export async function missingParams(
  context: CQEvent<'message'>['context'],
  command: commandFormat,
  paramsLength: number
) {
  const { botConfig } = global.config as { botConfig: botConfig }

  if (command.params.length < paramsLength) {
    return replyMsg(context, `参数不足，请发送"${botConfig.prefix}帮助 ${command.name}"查看帮助`, {
      reply: true
    })
  } else {
    return undefined
  }
}
