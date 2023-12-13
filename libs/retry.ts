import { makeSystemLogger } from '@/libs/logger.ts'
import { sleep } from '@/libs/sleep.ts'

// 定义一个函数类型，它接受任何参数并返回任何值
export type anyAsyncFunction = (...args: any[]) => Promise<any>

/**
 * 自动重试
 * @param func 运行的函数
 * @param times 尝试的次数
 * @param ms 失败后延迟的时间
 */
export async function retryAsync<T extends anyAsyncFunction>(
  func: T,
  times = 3,
  ms = 0
): Promise<Awaited<ReturnType<T>>> {
  while (times--) {
    try {
      return await func()
    } catch (e) {
      if (debug) {
        const logger = makeSystemLogger({ pluginName: 'retry' })
        logger.WARNING('执行失败')
        logger.DEBUG(e)
      }
      if (times === 0) throw e
      if (ms !== 0) await sleep(ms)
    }
  }

  throw new Error('尝试次数不能为0')
}
