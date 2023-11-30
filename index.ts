import { makeSystemLogger } from '@/libs/logger.js'
import { sendMsg } from '@/libs/sendMsg.ts'
import type { botConfig } from '@/plugins/builtInPlugins/bot/config.d.ts'
import init from './init.ts'
import plugins from './plugins.ts'

const logger = makeSystemLogger({ pluginName: 'bootStrap' })

await init()
await plugins()

if (!dev) await sendMsg((global.config.botConfig as botConfig).admin, '插件全部加载完成')
logger.SUCCESS('插件全部加载完成')
