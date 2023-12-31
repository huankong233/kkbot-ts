import { retryGet } from '@/libs/axios.ts'
import { eventReg } from '@/libs/eventReg.ts'
import { makeLogger } from '@/libs/logger.ts'
import { replyMsg } from '@/libs/sendMsg.ts'
import type { CQEvent } from 'go-cqwebsocket'

const logger = makeLogger({ pluginName: 'dog' })

export default () => {
  event()
}

function event() {
  eventReg('message', async ({ context }, command) => {
    if (!command) return
    if (command.name === '舔狗日记') await dog(context)
  })
}

async function dog(context: CQEvent<'message'>['context']) {
  try {
    const { data } = await retryGet('https://api.oick.cn/dog/api.php')
    await replyMsg(context, data.slice(1, -1), { reply: true })
  } catch (error) {
    logger.WARNING(`请求接口失败`)
    logger.ERROR(error)
    await replyMsg(context, '接口请求失败~', { reply: true })
  }
}
