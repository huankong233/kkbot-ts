import { eventReg } from '@/libs/eventReg.ts'
import { randomFloat, randomInt } from '@/libs/random.ts'
import { SocketHandle } from 'node-open-shamrock'

export default () => {
  init()
  event()
}

function init() {
  const { pokeData } = global.data as { pokeData: pokeData }
  pokeData.count = {}
}

function event() {
  eventReg('notice', async context => {
    if (
      'group_id' in context &&
      context.notice_type === 'notify' &&
      context.sub_type === 'poke' &&
      context.post_type === 'notice' &&
      context.target_id === context.self_id
    ) {
      await poke(context)
    }
  })
}

//戳一戳
async function poke(context: SocketHandle['notice.notify.poke.group']) {
  const { group_id, user_id } = context
  const { pokeConfig } = global.config as { pokeConfig: pokeConfig }
  const { pokeData } = global.data as { pokeData: pokeData }

  //增加计数
  if (!pokeData.count[user_id]) pokeData.count[user_id] = 0

  if (randomFloat(0, 100) <= pokeConfig.banProb) {
    pokeData.count[user_id]++
  }

  let replyed = false

  if (pokeData.count[user_id] >= pokeConfig.banCount) {
    pokeData.count[user_id] = 0

    //判断对方信息
    const user = await bot.get_group_member_info({ group_id, user_id })

    //判断自己信息
    const self = await bot.get_group_member_info({
      group_id,
      user_id: bot.eventBus.status.self.user_id
    })

    if (self.data.role !== 'admin' && self.data.role !== 'owner') return false
    if (self.data.role === 'admin' && user.data.role !== 'member') return false

    const muteTime = randomInt(pokeConfig.banTime[0], pokeConfig.banTime[1])

    await bot.set_group_ban({
      group_id,
      user_id,
      duration: muteTime
    })

    replyed = true

    //禁言成功
    return await bot.send_group_message({
      group_id,
      message: pokeConfig.banReply[randomInt(0, pokeConfig.banReply.length - 1)]
    })
  }

  //回复
  if (!replyed)
    await bot.send_group_message({
      group_id,
      message: pokeConfig.reply[randomInt(0, pokeConfig.reply.length - 1)]
    })
}
