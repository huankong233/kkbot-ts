import { getUserName } from '@/libs/api.ts'
import { eventReg } from '@/libs/eventReg.ts'
import { makeLogger, type Logger } from '@/libs/logger.ts'
import { sendMsg } from '@/libs/sendMsg.ts'
import { config as botConfig } from '@/plugins/builtIn/bot/config.ts'
import { MessageHandler, NoticeHandler, RequestHandler, Structs } from 'node-napcat-ts'
import { config } from './config.ts'
import { Command } from '@/global.js'

export default class Admin {
  #logger: Logger

  constructor() {
    this.#logger = makeLogger({ pluginName: 'admin' })
  }

  async init() {
    eventReg({
      type: 'command',
      pluginName: 'admin',
      description: 'admin (accept/reject) (invite/add/friend) (flag)',
      commandName: 'admin',
      params: [
        { type: 'enum', enum: ['invite', 'add', 'friend'] },
        { type: 'enum', enum: ['accept', 'reject'] },
        { type: 'string' }
      ],
      callback: (context, command) => this.handler(context, command),
      priority: 102
    })

    eventReg({
      pluginName: 'admin',
      type: 'notice',
      callback: (context) => this.notice(context),
      priority: 102
    })

    eventReg({
      pluginName: 'admin',
      type: 'request',
      callback: (context) => this.request(context),
      priority: 102
    })
  }

  async handler(context: MessageHandler['message'], command: Command) {
    return await this.message(command, context)
  }

  async message(command: Command, context?: MessageHandler['message']) {
    const name = command.args[0]
    const approve = command.args[1] === 'accept'
    const flag = command.args[2]

    try {
      if (name === 'friend') {
        await bot.set_friend_add_request({ approve, flag })
      } else if (name === 'add') {
        await bot.set_group_add_request({ approve, flag })
      } else if (name === 'invite') {
        await bot.set_group_add_request({ approve, flag })
      }

      if (context) await sendMsg(context, [Structs.text({ text: '操作成功~' })])
    } catch (error) {
      this.#logger.ERROR('操作失败', error)
      await sendMsg(context ?? { message_type: 'private', user_id: botConfig.admin_id }, [
        Structs.text({ text: '操作失败' })
      ])
    }
  }

  async notice(context: NoticeHandler['notice']) {
    const { notice_type } = context

    if (notice_type === 'group_increase' || notice_type === 'group_decrease') {
      const { user_id, group_id, self_id } = context
      if (user_id === self_id) return

      await sendMsg({ message_type: 'group', group_id }, [
        Structs.text({
          text:
            notice_type === 'group_increase'
              ? `${await getUserName(user_id)} 欢迎加群呀~ ヾ(≧▽≦*)o`
              : `${await getUserName(user_id)} 退群了 (*>.<*)`
        })
      ])
    }
  }

  async request(context: RequestHandler['request']) {
    const { request_type } = context

    if (request_type === 'group') {
      const { sub_type } = context
      if (sub_type === 'add') {
        //申请加群
        if (config.add.message) await this.sendNotice(context, config.add.auto)
        if (config.add.auto !== '') {
          await this.message({ name: 'admin', args: ['add', config.add.auto, context.flag] })
        }
      } else if (sub_type === 'invite') {
        //邀请机器人入群
        if (config.invite.message) await this.sendNotice(context, config.invite.auto)
        if (config.invite.auto !== '') {
          await this.message({ name: 'admin', args: ['invite', config.invite.auto, context.flag] })
        }
      }
    } else if (request_type === 'friend') {
      //添加好友
      if (config.friend.message) await this.sendNotice(context, config.friend.auto)
      if (config.friend.auto !== '') {
        await this.message({ name: 'admin', args: ['friend', config.friend.auto, context.flag] })
      }
    }
  }

  async sendNotice(context: RequestHandler['request'], auto: 'accept' | 'reject' | '') {
    const { request_type, flag, user_id, comment, time } = context

    const text = []
    text.push(`用户: ${await getUserName(user_id)}(${user_id})`)

    if (request_type === 'group') {
      text.push(`${context.sub_type === 'invite' ? '邀请加群' : '申请加群'}: ${context.group_id}`)
    } else {
      text.push(`申请添加好友`)
    }

    text.push(`申请时间: ${new Date(time * 1000).toLocaleString()}`, `验证信息 : ${comment}`)

    if (auto === 'accept') {
      text.push('已自动同意了哦~')
    } else if (auto === 'reject') {
      text.push('已自动拒绝了哦~')
    } else {
      const sub_type = request_type === 'group' ? context.sub_type : request_type
      text.push(
        `接受回复 : ${botConfig.command_prefix}admin ${sub_type} accept ${flag}`,
        `拒绝回复 : ${botConfig.command_prefix}admin ${sub_type} reject ${flag}`
      )
    }

    await sendMsg({ message_type: 'private', user_id: botConfig.admin_id }, [
      Structs.text({ text: text.join('\n') })
    ])
  }
}