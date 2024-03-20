import { eventReg } from '@/libs/eventReg.ts'
import { randomInt } from '@/libs/random.ts'
import { quickOperation } from '@/libs/sendMsg.ts'
import { SocketHandle } from 'node-open-shamrock'

export default async () => {
  event()
}

function event() {
  eventReg('message', async (context, command) => {
    if (!command) return

    if (command.name === '鸽了') await mute(context)
  })
}

export async function mute(context: SocketHandle['message']) {
  if (context.message_type === 'private')
    return await quickOperation({
      context,
      operation: {
        reply: '爬爬爬，私聊来找茬是吧'
      }
    })

  const { muteConfig } = global.config as { muteConfig: muteConfig }
  const { group_id, user_id } = context

  //判断对方信息
  const user = await bot.get_group_member_info({ group_id, user_id })

  //判断自己信息
  const self = await bot.get_group_member_info({
    group_id,
    user_id: bot.eventBus.status.self.user_id
  })

  if (self.role !== 'admin' && self.role !== 'owner') {
    return await quickOperation({
      context,
      operation: {
        reply: [`咱还不是管理员呢~`, `管理！快给我上管理！(大声)`].join('\n')
      }
    })
  }

  if (self.role === 'admin') {
    if (user.role !== 'member') {
      return await quickOperation({
        context,
        operation: {
          reply: `╭(╯^╰)╮ 快来人给他把${user.role === 'admin' ? '管理员' : '群主'}下了！！`
        }
      })
    }
  }

  const muteTime = randomInt(muteConfig.time[0], muteConfig.time[1])

  return await bot
    .set_group_ban({
      group_id,
      user_id,
      duration: muteTime
    })
    .catch(async res => {
      if (res.retcode !== 0)
        await quickOperation({
          context,
          operation: {
            reply: '(ﾟдﾟ；) 失败了?!不可能!!'
          }
        })
      return false
    })
    .finally(async () => {
      await quickOperation({
        context,
        operation: {
          reply: '还鸽不鸽了'
        }
      })
      return true
    })
}
