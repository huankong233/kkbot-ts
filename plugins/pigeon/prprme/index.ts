import { isFriend } from '@/libs/Api.ts'
import { retryGet } from '@/libs/axios.ts'
import { eventReg } from '@/libs/eventReg.ts'
import { makeLogger } from '@/libs/logger.ts'
import { replyMsg, sendMsg } from '@/libs/sendMsg.ts'
import type { botConfig } from '@/plugins/builtInPlugins/bot/config.d.ts'
import type { CQEvent } from 'go-cqwebsocket'
import { CQ } from 'go-cqwebsocket'

const logger = makeLogger({ pluginName: 'prprme' })

export default () => {
  init()
  event()
}

function init() {
  const { prprmeData } = global.data as { prprmeData: prprmeData }
  prprmeData.userList = []
}

function event() {
  eventReg('message', async ({ context }, command) => {
    if (!command) return
    if (command.name === '舔我') {
      await prprme(context)
    } else if (command.name === '别舔了') {
      await stoprprme(context)
    }
  })
}

async function prprme(context: CQEvent<'message'>['context']) {
  const { user_id } = context
  const { botConfig } = global.config as { botConfig: botConfig }
  const { prprmeData } = global.data as { prprmeData: prprmeData }
  const { userList } = prprmeData

  if (!(await isFriend(user_id))) {
    return await replyMsg(context, '先加一下好友叭~咱也是会害羞的', { reply: true })
  }

  await sendMsg(
    user_id,
    [`我真的好喜欢你啊!!`, `(回复"${botConfig.prefix}别舔了"来停止哦~)`].join('\n')
  )

  userList[user_id] = setInterval(async () => {
    try {
      const { data } = await retryGet('https://api.uomg.com/api/rand.qinghua?format=json')
      await sendMsg(user_id, data.content)
    } catch (error) {
      clearInterval(userList[user_id])
      logger.WARNING(`请求接口失败`)
      logger.ERROR(error)
      clearInterval(userList[user_id])
      return await replyMsg(context, `接口请求失败`)
    }
  }, 3000)
}

async function stoprprme(context: CQEvent<'message'>['context']) {
  const { user_id } = context
  const { prprmeData } = global.data as { prprmeData: prprmeData }
  const { userList } = prprmeData

  const id = userList[user_id]
  if (id) {
    clearInterval(id)
    await sendMsg(user_id, CQ.image('https://s1.ax1x.com/2023/09/04/pPrn9B9.jpg').toString())
  }
}
