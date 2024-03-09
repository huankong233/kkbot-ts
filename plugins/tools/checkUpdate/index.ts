import { retryGet } from '@/libs/axios.ts'
import { eventReg } from '@/libs/eventReg.ts'
import { makeLogger } from '@/libs/logger.ts'
import type { botConfig } from '@/plugins/builtInPlugins/bot/config.d.ts'
import { compare } from 'compare-versions'
import { CronJob } from 'cron'
import { SocketHandle } from 'node-open-shamrock'

const logger = makeLogger({ pluginName: 'update' })

export default async () => {
  const { checkUpdateConfig } = global.config as { checkUpdateConfig: checkUpdateConfig }
  if (checkUpdateConfig.enable) {
    await init()
    event()
    if (!debug) setTimeout(checkUpdate, 5000)
  }
}

async function event() {
  eventReg('message', async (context, command) => {
    if (!command) return

    if (command.name === '检查更新') await checkUpdate(context)
  })
}

async function init() {
  const { checkUpdateConfig } = global.config
  new CronJob(
    checkUpdateConfig.crontab,
    async () => {
      await checkUpdate().catch(err => {
        logger.ERROR(err)
        logger.WARNING('检查更新失败')
      })
    },
    null,
    true
  )
}

async function checkUpdate(context?: SocketHandle['message']) {
  const { botConfig, checkUpdateConfig } = global.config as {
    botConfig: botConfig
    checkUpdateConfig: checkUpdateConfig
  }

  const { url } = checkUpdateConfig

  const local_version = packageData.version
  let remote_version: string = '0.0.0'

  try {
    remote_version = await retryGet(url).then(res => res.data.version)
  } catch (error) {
    logger.WARNING('检查更新失败')
    logger.ERROR(error)
  }

  let message = ['检查更新失败', `当前版本: ${local_version}`, `请检查您的网络状况！`].join('\n')

  if (remote_version && local_version) {
    if (compare(local_version, remote_version, '>=')) {
      if (context) {
        message = [
          'kkbot无需更新哟~',
          `最新版本: ${remote_version}`,
          `当前版本: ${local_version}`
        ].join('\n')
        context
          ? await bot.handle_quick_operation_async({ context, operation: { reply: message } })
          : await bot.send_private_message({ user_id: botConfig.admin, message })
      }
    } else {
      //需要更新，通知admin
      message = [
        'kkbot有更新哟~',
        `最新版本: ${remote_version}`,
        `当前版本: ${local_version}`
      ].join('\n')
      context
        ? await bot.handle_quick_operation_async({ context, operation: { reply: message } })
        : await bot.send_private_message({ user_id: botConfig.admin, message })
    }
  }
}
