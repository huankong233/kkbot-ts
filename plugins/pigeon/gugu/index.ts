import { eventReg } from '@/libs/eventReg.ts'
import { randomInt } from '@/libs/random.ts'
import { replyMsg } from '@/libs/sendMsg.ts'
import { isToday } from '@/libs/time.ts'
import { add, getUserData } from '@/plugins/pigeon/pigeon/index.ts'
import type { CQEvent } from 'go-cqwebsocket'

export default () => {
  event()
}

function event() {
  eventReg('message', async ({ context }, command) => {
    if (!command) return
    if (command.name.search('咕咕') !== -1) await gugu(context)
  })
}

async function gugu(context: CQEvent<'message'>['context']) {
  const { guguConfig } = global.config as { guguConfig: guguConfig }
  const { user_id } = context
  const userData = await getUserData(user_id)

  if (!userData) {
    //插入新用户
    await replyMsg(context, `新用户!赠送${guguConfig.newUserAdd}只鸽子~`, { reply: true })
    await database.insert({ user_id }).into('pigeon')
    await add(user_id, guguConfig.newUserAdd, '新用户赠送')
    await gugu(context)
  } else {
    //判断今天还能不能签到
    if (isToday(userData.update_time))
      return await replyMsg(context, `咕咕失败~今天已经咕咕过了哦~`, { reply: true })

    //获得的鸽子数
    let addon = randomInt(1, guguConfig.oldUserAdd)
    await add(user_id, addon, '每日咕咕', { update_time: Date.now() })
    await replyMsg(context, `咕咕成功~获得${addon}只鸽子~`, { reply: true })
  }
}
