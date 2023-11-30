import type { fakeContext } from '@/global.d.ts'
import { makeSystemLogger } from '@/libs/logger.ts'
import type { CQEvent, Tags } from 'go-cqwebsocket'
import { CQ } from 'go-cqwebsocket'
import * as emoji from 'node-emoji'

const logger = makeSystemLogger({ pluginName: 'sendMsg' })

/**
 * 回复消息
 * @param context 消息上下文
 * @param message 回复内容
 * @param params 是否at/reply发送者 是否转换为emoji
 */
export async function replyMsg(
  context: CQEvent<'message'>['context'] | fakeContext,
  message: string,
  { at = false, reply = false, toEmoji = true } = {}
) {
  const { message_type, user_id, message_id } = context

  if (toEmoji) message = parseToEmoji(message)

  if (message_type !== 'private') {
    //不是私聊，可以at发送者
    if (at && user_id) message = `${CQ.at(user_id)} ${message}`

    if (reply && message_id) message = `${CQ.reply(message_id)}${message}`
  }

  let response

  switch (message_type) {
    case 'private':
      //回复私聊
      response = await bot.send_private_msg(user_id, message)
      break
    case 'group':
      //回复群
      const { group_id } = context
      response = await bot.send_group_msg(group_id, message)
      break
  }

  if (debug) {
    logger.DEBUG(`发送回复消息:${message}`)
    logger.DEBUG(`响应:\n`, response)
    const stack = new Error().stack!.split('\n')
    logger.DEBUG(`stack信息:\n`, stack.slice(1).join('\n'))
  }

  return response
}

/**
 * 发送私信
 * @param user_id
 * @param message
 * @param toEmoji 是否转换为emoji
 */
export async function sendMsg(user_id: number, message: string, toEmoji = true) {
  if (toEmoji) message = parseToEmoji(message)

  const response = await bot.send_private_msg(user_id, message)

  if (debug) {
    logger.DEBUG(`发送私聊消息:${message}`)
    logger.DEBUG(`响应:\n`, response)
    const stack = new Error().stack!.split('\n')
    logger.DEBUG(`stack信息:\n`, stack.slice(1, stack.length).join('\n'))
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
  context: CQEvent<'message'>['context'] | fakeContext,
  messages: Tags.CQNode[]
) {
  const { message_type } = context

  let response

  switch (message_type) {
    case 'group':
      response = await bot.send_group_forward_msg(context.group_id, messages)
      break
    case 'private':
      response = await bot.send_private_forward_msg(context.user_id, messages)
      break
  }

  if (debug) {
    logger.DEBUG(`发送合并消息:\n`, messages)
    logger.DEBUG(`响应:\n`, response)
    const stack = new Error().stack!.split('\n')
    logger.DEBUG(`stack信息:\n`, stack.slice(1, stack.length).join('\n'))
  }

  return response
}

/**
 * 消息反转义为emoji
 * @param message 消息
 */
export const parseToEmoji = (message: any) => emoji.emojify(message.toString())
