import { makeSystemLogger } from '@/libs/logger.ts'
import { Send, SocketHandle } from 'node-open-shamrock'

const logger = makeSystemLogger({ pluginName: 'sendMsg' })

/**
 * 合并信息发送
 * docs:https://docs.go-cqhttp.org/cqcode/#合并转发
 * @param context 消息对象
 * @param messages
 */
export async function sendForwardMsg(context: SocketHandle['message'], messages: Send['node'][]) {
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
