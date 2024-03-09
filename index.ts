import type { botConfig } from '@/plugins/builtInPlugins/bot/config.d.ts'
import { makeSystemLogger } from '@/libs/logger.ts'
import init from './init.ts'
import plugins from './plugins.ts'

const logger = makeSystemLogger({ pluginName: 'bootStrap' })

await init()
await plugins()

if (!dev)
  await bot.send_private_message({
    user_id: (global.config.botConfig as botConfig).admin,
    message: '插件全部加载完成'
  })
logger.SUCCESS('插件全部加载完成')
