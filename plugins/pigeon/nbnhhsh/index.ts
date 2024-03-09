import { retryPost } from '@/libs/axios.ts'
import { commandFormat } from '@/libs/eventReg.ts'
import { eventReg, missingParams } from '@/libs/eventReg.ts'
import { makeLogger } from '@/libs/logger.ts'
import { SocketHandle } from 'node-open-shamrock'

const logger = makeLogger({ pluginName: 'nbnhhsh' })

export default () => {
  event()
}

function event() {
  eventReg('message', async (context, command) => {
    if (!command) return
    if (command.name === '能不能好好说话') await nbnhhsh(context, command)
  })
}

async function nbnhhsh(context: SocketHandle['message'], command: commandFormat) {
  const { params } = command

  if (await missingParams(context, command, 1)) return

  try {
    await retryPost('https://lab.magiconch.com/api/nbnhhsh/guess', {
      data: { text: params[0] }
    })
      .then(res => res.data)
      .then(async res => {
        if (!res || res.length <= 0)
          return await bot.handle_quick_operation_async({
            context,
            operation: {
              reply: '空空也不知道这是什么意思呢~'
            }
          })
        return res[0]
      })
      .then(async res => {
        if (!res?.trans) {
          return await bot.handle_quick_operation_async({
            context,
            operation: {
              reply: '空空也不知道这是什么意思呢~'
            }
          })
        }
        await bot.handle_quick_operation_async({
          context,
          operation: {
            reply: [`"${data.name}" 可能是:`, `${data.trans.join(', ')}`].join('\n')
          }
        })
      })
  } catch (error) {
    logger.WARNING(`请求接口失败`)
    logger.ERROR(error)
    return await bot.handle_quick_operation_async({
      context,
      operation: {
        reply: `接口请求失败`
      }
    })
  }
}
