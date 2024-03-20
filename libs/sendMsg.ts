import { makeSystemLogger } from '@/libs/logger.ts'
import {
  Send,
  SendMessageArray,
  SendMessageObject,
  SocketHandle,
  WSSendParam,
  convertCQCodeToJSON
} from 'node-open-shamrock'

const logger = makeSystemLogger({ pluginName: 'sendMsg' })

export async function quickOperation(params: {
  context: SocketHandle['message']
  operation: WSSendParam['.handle_quick_operation_async']['operation']
}) {
  let response

  try {
    response = await bot.handle_quick_operation_async(params)
  } catch (error) {
    if (debug) {
      logger.DEBUG(`执行操作:`, params.operation)
      const stack = new Error().stack!.split('\n')
      logger.DEBUG(`stack信息:\n`, stack.slice(1).join('\n'))
    }
    throw error
  }

  if (debug) {
    logger.DEBUG(`执行操作:`, params.operation)
    logger.DEBUG(`响应:\n`, response)
    const stack = new Error().stack!.split('\n')
    logger.DEBUG(`stack信息:\n`, stack.slice(1).join('\n'))
  }
  return response
}

export async function sendMsg(
  context:
    | { message_type: 'private'; user_id: number }
    | { message_type: 'group'; group_id: number },
  message: string | SendMessageArray | SendMessageObject
) {
  const { message_type } = context

  if (typeof message === 'string')
    message = convertCQCodeToJSON(message) as SendMessageArray | SendMessageObject

  let response

  try {
    switch (message_type) {
      case 'private':
        //回复私聊
        const { user_id } = context
        response = await bot.send_private_message({
          user_id,
          message
        })
        break
      case 'group':
        //回复群
        const { group_id } = context
        response = await bot.send_group_message({
          group_id,
          message
        })
        break
    }
  } catch (error) {
    if (debug) {
      logger.DEBUG(`发送消息:${message}`)
      const stack = new Error().stack!.split('\n')
      logger.DEBUG(`stack信息:\n`, stack.slice(1).join('\n'))
    }
    throw error
  }

  if (debug) {
    logger.DEBUG(`发送消息:${message}`)
    logger.DEBUG(`响应:\n`, response)
    const stack = new Error().stack!.split('\n')
    logger.DEBUG(`stack信息:\n`, stack.slice(1).join('\n'))
  }
  return response
}

/**
 * 合并信息发送
 * docs:https://docs.go-cqhttp.org/cqcode/#合并转发
 * @param context 消息对象
 * @param messages
 */
export async function sendForwardMsg(
  context:
    | { message_type: 'group'; group_id: number }
    | { message_type: 'private'; user_id: number },
  messages: Send['node'][]
) {
  const { message_type } = context

  let response

  try {
    switch (message_type) {
      case 'group':
        response = await bot.send_group_forward_message({
          group_id: context.group_id,
          messages
        })
        break
      case 'private':
        response = await bot.send_private_forward_message({
          user_id: context.user_id,
          messages
        })
        break
    }
  } catch (error) {
    if (debug) {
      logger.DEBUG(`发送合并消息:\n`, messages)
      const stack = new Error().stack!.split('\n')
      logger.DEBUG(`stack信息:\n`, stack.slice(1, stack.length).join('\n'))
    }
    throw error
  }

  if (debug) {
    logger.DEBUG(`发送合并消息:\n`, messages)
    logger.DEBUG(`响应:\n`, response)
    const stack = new Error().stack!.split('\n')
    logger.DEBUG(`stack信息:\n`, stack.slice(1, stack.length).join('\n'))
  }

  return response
}
