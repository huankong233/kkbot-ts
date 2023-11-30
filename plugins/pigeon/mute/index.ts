import type { fakeContext } from '@/global.d.ts'
import { eventReg } from '@/libs/eventReg.ts'
import { randomInt } from '@/libs/random.ts'
import { replyMsg } from '@/libs/sendMsg.ts'
import type { CQEvent } from 'go-cqwebsocket'

export default async () => {
  event()
}

function event() {
  eventReg('message', async ({ context }, command) => {
    if (!command) return

    if (command.name === '鸽了') await mute(context)
  })
}

/**
 * 口球
 * @param context
 * @param manual 是否为手动
 * @param time [max,min]
 */
export async function mute(
  context: CQEvent<'message'>['context'] | fakeContext,
  manual = true,
  time: [min: number, max: number] = [1, 60]
) {
  if (context.message_type === 'private')
    return manual ? await replyMsg(context, '爬爬爬，私聊来找茬是吧') : false

  const { muteConfig } = global.config as { muteConfig: muteConfig }
  const { group_id, user_id, self_id } = context

  //判断对方信息
  const user = await bot.get_group_member_info(group_id, user_id)

  if (!self_id) throw new Error('缺少参数')

  //判断自己信息
  const self = await bot.get_group_member_info(group_id, self_id)

  if (self.role !== 'admin' && self.role !== 'owner') {
    return manual
      ? await replyMsg(context, [`咱还不是管理员呢~`, `管理！快给我上管理！(大声)`].join('\n'))
      : false
  }

  if (self.role === 'admin') {
    if (user.role !== 'member') {
      return manual
        ? await replyMsg(
            context,
            `╭(╯^╰)╮ 快来人给他把${user.role === 'admin' ? '管理员' : '群主'}下了！！`
          )
        : false
    }
  }

  const muteTime = randomInt(time[0] ?? muteConfig.time[0], time[1] ?? muteConfig.time[1])

  return await bot
    .set_group_ban(context.group_id, context.user_id, muteTime)
    .catch(async res => {
      if (res.retcode !== 0 && manual) await replyMsg(context, '(ﾟдﾟ；) 失败了?!不可能!!')
      return false
    })
    .finally(async () => {
      if (manual) await replyMsg(context, '还鸽不鸽了')
      return true
    })
}
