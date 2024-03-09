import { retryGet } from '@/libs/axios.ts'
import { eventReg } from '@/libs/eventReg.ts'
import { makeLogger } from '@/libs/logger.ts'
import { SocketHandle } from 'node-open-shamrock'

const logger = makeLogger({ pluginName: 'dog' })

export default () => {
  event()
}

function event() {
  eventReg('message', async (context, command) => {
    if (!command) return
    if (command.name === '舔狗日记') await dog(context)
  })
}

async function dog(context: SocketHandle['message']) {
  try {
    const { data } = await retryGet('https://api.oick.cn/dog/api.php')
    await bot.handle_quick_operation_async({
      context,
      operation: {
        reply: data.slice(1, -1)
      }
    })
  } catch (error) {
    logger.WARNING(`请求接口失败`)
    logger.ERROR(error)
    await bot.handle_quick_operation_async({
      context,
      operation: {
        reply: '接口请求失败~'
      }
    })
  }
}
