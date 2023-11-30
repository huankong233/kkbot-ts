import { retryPost } from '@/libs/axios.ts'
import type { commandFormat } from '@/libs/eventReg.ts'
import { eventReg, missingParams } from '@/libs/eventReg.ts'
import { makeLogger } from '@/libs/logger.ts'
import { replyMsg } from '@/libs/sendMsg.ts'
import type { CQEvent } from 'go-cqwebsocket'

const logger = makeLogger({ pluginName: 'nbnhhsh' })

export default () => {
  event()
}

function event() {
  eventReg('message', async ({ context }, command) => {
    if (!command) return
    if (command.name === '能不能好好说话') await nbnhhsh(context, command)
  })
}

async function nbnhhsh(context: CQEvent<'message'>['context'], command: commandFormat) {
  const { params } = command

  if (await missingParams(context, command, 1)) return

  try {
    await retryPost('https://lab.magiconch.com/api/nbnhhsh/guess', {
      data: { text: params[0] }
    })
      .then(res => res.data)
      .then(async res => {
        if (!res || res.length <= 0)
          return await replyMsg(context, '空空也不知道这是什么意思呢~', { reply: true })
        return res[0]
      })
      .then(async res => {
        if (!res?.trans) {
          return await replyMsg(context, '空空也不知道这是什么意思呢~', { reply: true })
        }
        await replyMsg(context, [`"${data.name}" 可能是:`, `${data.trans.join(', ')}`].join('\n'), {
          reply: true
        })
      })
  } catch (error) {
    logger.WARNING(`请求接口失败`)
    logger.ERROR(error)
    return await replyMsg(context, `接口请求失败`, { reply: true })
  }
}
